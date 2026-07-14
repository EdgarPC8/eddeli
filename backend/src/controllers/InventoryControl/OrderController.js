import { verifyJWT, getHeaderToken } from "../../libs/jwt.js";

import { InventoryMovement, InventoryProduct } from "../../models/Inventory.js";
import { Customer, Order, OrderItem } from "../../models/Orders.js";
import { Income } from "../../models/Finance.js";
import { findOpenShiftForAccount } from "./ShiftController.js";
import { format } from 'date-fns';
import { de, es } from 'date-fns/locale';

import { Op } from "sequelize";
import { sequelize } from "../../database/connection.js";
import { logger } from "../../log/LogActivity.js";
import { parsePagination, sendPaginated } from "../../utils/pagination.js";




const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

const CAJA_POS_TAG = "[CAJA_POS]";

/** Pedidos manuales/calendario: notes NULL o sin marca de caja POS. */
const nonCajaPosNotesWhere = {
  [Op.or]: [
    { notes: null },
    { notes: { [Op.notLike]: `%${CAJA_POS_TAG}%` } },
  ],
};

/** POST /orders/pos/checkout — venta desde caja con turno abierto. */
export const posCheckout = async (req, res) => {
  try {
    const token = getHeaderToken(req);
    const user = await verifyJWT(token);
    const { accountId } = user;

    const { customerId, notes, items, paymentMethod, saleType, documentType } = req.body;
    if (!customerId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Faltan customerId o items." });
    }

    const notesText = String(notes || "");
    if (!notesText.includes(CAJA_POS_TAG)) {
      return res.status(400).json({ message: "Pedido POS inválido (falta marca de caja)." });
    }

    const isCredit = saleType === "credito";
    const docType = ["factura", "nota_venta", "documento", "consumidor_final"].includes(
      String(documentType || ""),
    )
      ? String(documentType)
      : "consumidor_final";
    const shift = await findOpenShiftForAccount(accountId);
    if (!shift) {
      return res.status(400).json({
        message: "Abre un turno de caja antes de registrar ventas en el punto de venta.",
      });
    }

    const result = await sequelize.transaction(async (t) => {
      const now = new Date();
      const order = await Order.create(
        {
          customerId: Number(customerId),
          notes: notesText,
          date: now,
          status: isCredit ? "pendiente" : "pagado",
          shiftId: shift.id,
          paymentMethod: isCredit ? "credito" : paymentMethod || "efectivo",
          paidAt: isCredit ? null : now,
          documentType: docType,
        },
        { transaction: t },
      );

      for (const row of items) {
        const productId = Number(row.productId);
        const qty = Number(row.quantity);
        const price = Number(row.price);
        if (!Number.isFinite(productId) || !Number.isFinite(qty) || qty <= 0) {
          throw new Error("Ítem inválido en el carrito.");
        }

        const product = await InventoryProduct.findByPk(productId, {
          transaction: t,
          lock: t.LOCK.UPDATE,
        });
        if (!product) throw new Error(`Producto #${productId} no encontrado.`);

        if (!isCredit) {
          if (num(product.stock) < qty) {
            throw new Error(`Stock insuficiente para ${product.name}. Disponible: ${product.stock}`);
          }
          product.stock = num(product.stock) - qty;
          await product.save({ transaction: t });

          await InventoryMovement.create(
            {
              productId: product.id,
              quantity: qty,
              type: "salida",
              reason: "SALIDA_VENTA",
              referenceType: "order",
              referenceId: order.id,
              date: now,
              createdBy: accountId,
              description: `Venta POS · pedido #${order.id}`,
            },
            { transaction: t },
          );
        }

        const orderItem = await OrderItem.create(
          {
            orderId: order.id,
            productId,
            quantity: qty,
            price,
            soldQty: isCredit ? 0 : qty,
            deliveredAt: isCredit ? null : now,
            paidAt: isCredit ? null : now,
          },
          { transaction: t },
        );

        if (!isCredit) {
          const amount = Number((price * qty).toFixed(2));
          const concept = `Venta POS ${product.name} x${qty} (Ord #${order.id})`;
          await Income.create(
            {
              date: now,
              amount,
              concept,
              category: "Venta",
              referenceType: "order_item",
              referenceId: orderItem.id,
              createdBy: accountId,
            },
            { transaction: t },
          );
        }
      }

      return order;
    });

    res.status(201).json({ ok: true, orderId: result.id, order: result });
  } catch (error) {
    console.error("posCheckout:", error);
    res.status(400).json({ message: error.message || "Error en checkout POS" });
  }
};

const CAJA_POS_TAG_EXPORT = "[CAJA_POS]";

/** GET /orders/pos/sales — ventas de caja para facturación e impresión. */
export const getPosSales = async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 200, 500);
    const orders = await Order.findAll({
      where: {
        [Op.or]: [
          { notes: { [Op.like]: `%${CAJA_POS_TAG_EXPORT}%` } },
          { documentType: { [Op.ne]: null } },
        ],
      },
      include: [
        { model: Customer, as: "ERP_customer" },
        {
          model: OrderItem,
          as: "ERP_order_items",
          include: [{ model: InventoryProduct, as: "ERP_inventory_product" }],
        },
      ],
      order: [["id", "DESC"]],
      limit,
    });

    const data = orders.map((order) => {
      const items = (order.ERP_order_items || []).map((item) => {
        const qty = Number(item.soldQty || 0) > 0 ? Number(item.soldQty) : Number(item.quantity || 0);
        const price = Number(item.price || 0);
        const product = item.ERP_inventory_product;
        const taxRate = Number(product?.taxRate || 0);
        const lineTotal = Number((qty * price).toFixed(2));
        let subtotal = lineTotal;
        let iva = 0;
        if (taxRate > 0) {
          subtotal = Number((lineTotal / (1 + taxRate / 100)).toFixed(2));
          iva = Number((lineTotal - subtotal).toFixed(2));
        }
        return {
          id: item.id,
          productId: item.productId,
          name: product?.name || `Producto #${item.productId}`,
          quantity: qty,
          price,
          taxRate,
          subtotal,
          iva,
          lineTotal,
        };
      });
      const total = items.reduce((acc, it) => acc + it.lineTotal, 0);
      const subtotal = items.reduce((acc, it) => acc + it.subtotal, 0);
      const iva = items.reduce((acc, it) => acc + it.iva, 0);
      const customer = order.ERP_customer;
      return {
        id: order.id,
        date: order.date,
        paidAt: order.paidAt,
        status: order.status,
        notes: order.notes,
        paymentMethod: order.paymentMethod,
        documentType: order.documentType || inferDocumentTypeFromNotes(order.notes),
        customer: customer
          ? {
              id: customer.id,
              name: customer.name,
              firstName: customer.firstName,
              secondName: customer.secondName,
              firstLastName: customer.firstLastName,
              secondLastName: customer.secondLastName,
              identType: customer.identType,
              cedula: customer.cedula,
              phone: customer.phone,
              email: customer.email,
              address: customer.address,
            }
          : null,
        items,
        subtotal: Number(subtotal.toFixed(2)),
        iva: Number(iva.toFixed(2)),
        total: Number(total.toFixed(2)),
      };
    });

    res.json(data);
  } catch (error) {
    console.error("getPosSales:", error);
    res.status(500).json({ message: "Error al obtener ventas de caja" });
  }
};

function inferDocumentTypeFromNotes(notes) {
  const n = String(notes || "").toLowerCase();
  if (n.includes("consumidor final") || n.includes("mostrador sin datos")) {
    return "consumidor_final";
  }
  return "documento";
}

// Cantidad COBRABLE (venta real)
// - Si existe soldQty => usar soldQty
// - Si no existe => usar quantity (compatibilidad)


// Para detectar si un pedido es de “panadería/consignación”
// Recomendado: un campo boolean en Order o Customer.
// Fallback temporal: notes contiene "#PANADERIA"
const isConsignmentOrder = (itemWithOrder) => {
  const o = itemWithOrder?.ERP_order || itemWithOrder?.ERP_order_items?.ERP_order;
  const c = o?.ERP_customer;
  if (o?.isConsignment === true) return true;
  // if (c?.isBakery === true) return true;
  if (typeof o?.notes === "string" && o.notes.includes("#PANADERIA")) return true;
  return false;
};


// helpers seguros
const toNumOrNull = (v) => {
  if (v === undefined) return undefined;      // no vino => no tocar
  if (v === null) return null;               // vino null => null explícito (si aplica)
  if (v === "") return undefined;            // string vacío => NO tocar (evita pisar con 0)
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined; // si es NaN => no tocar
};

const getBillableQty = (item) => {
  // cobrable = soldQty si existe (>=0), si no, quantity
  const sold = Number(item.soldQty || 0);
  if (sold > 0) return sold;
  return Number(item.quantity || 0);
};

export const updateOrderItem = async (req, res) => {
  const { itemId } = req.params;

  const {
    quantity,
    price,
    soldQty,
    damagedQty,
    giftQty,
    replacedQty,
    paidAt,
    deliveredAt,
  } = req.body;

  try {
    const token = getHeaderToken(req);
    const user = await verifyJWT(token);

    const isDashboardCorrection =
      req.body?.programmerDashboard === true || req.body?.programmerDashboard === "true";
    if (isDashboardCorrection) {
      if (user?.loginRol !== "Programador") {
        return res.status(403).json({
          message: "Solo el rol Programador puede ejecutar esta acción",
        });
      }
      return programmerDashboardOrderItemCorrection(req, res);
    }

    console.log("[updateOrderItem] itemId:", itemId);
    console.log("[updateOrderItem] body:", req.body);

    const result = await sequelize.transaction(async (t) => {
      const item = await OrderItem.findByPk(itemId, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!item) return { status: 404, body: { message: "Ítem no encontrado" } };

      // -------------------------
      // Helpers INLINE (solo aquí)
      // -------------------------
      const toNumber = (v) => {
        if (v === undefined) return undefined; // no tocar
        if (v === null) return null;           // permitir null para fechas (no para qty)
        if (v === "") return undefined;        // no pisar con vacío
        const n = Number(v);
        return Number.isFinite(n) ? n : undefined;
      };

      const toNonNeg = (v) => {
        const n = toNumber(v);
        if (n === undefined) return undefined;
        if (n === null) return 0;
        return Math.max(0, n);
      };

      const parseDateToggle = (v) => {
        if (v === undefined) return undefined; // no tocar
        if (v === null) return null;           // limpiar
        if (v === true || v === "now") return new Date();
        const d = new Date(v);
        return isNaN(d.getTime()) ? "__INVALID__" : d;
      };

      // -------------------------
      // Payload de UPDATE (solo campos válidos)
      // -------------------------
      const payload = {};

      const q = toNonNeg(quantity);
      if (q !== undefined) payload.quantity = q;

      const p = toNonNeg(price);
      if (p !== undefined) payload.price = p;

      const s = toNonNeg(soldQty);
      if (s !== undefined) payload.soldQty = s;

      const d = toNonNeg(damagedQty);
      if (d !== undefined) payload.damagedQty = d;

      const g = toNonNeg(giftQty);
      if (g !== undefined) payload.giftQty = g;

      const r = toNonNeg(replacedQty);
      if (r !== undefined) payload.replacedQty = r;

      const paidParsed = parseDateToggle(paidAt);
      if (paidParsed === "__INVALID__") {
        return { status: 400, body: { message: "paidAt inválido" } };
      }
      if (paidParsed !== undefined) payload.paidAt = paidParsed;

      const delParsed = parseDateToggle(deliveredAt);
      if (delParsed === "__INVALID__") {
        return { status: 400, body: { message: "deliveredAt inválido" } };
      }
      if (delParsed !== undefined) payload.deliveredAt = delParsed;

      console.log("[updateOrderItem] payload:", payload);

      if (Object.keys(payload).length === 0) {
        return { status: 200, body: { message: "Nada para actualizar (payload vacío)", item } };
      }

      // -------------------------
      // Validación de coherencia
      // -------------------------
      const nextQuantity = payload.quantity ?? item.quantity;
      const nextSold = payload.soldQty ?? item.soldQty;
      const nextDamaged = payload.damagedQty ?? item.damagedQty;
      const nextGift = payload.giftQty ?? item.giftQty;
      const nextReplaced = payload.replacedQty ?? item.replacedQty;

      const totalSalida =
        Number(nextSold || 0) +
        Number(nextDamaged || 0) +
        Number(nextGift || 0) +
        Number(nextReplaced || 0);

      if (totalSalida > Number(nextQuantity || 0) + 1e-9) {
        return {
          status: 400,
          body: { message: "La suma (vendido+dañado+yapa+cambiado) no puede ser mayor que quantity" },
        };
      }

      // -------------------------
      // UPDATE FORZADO (siempre genera UPDATE cuando hay payload)
      // -------------------------
      await OrderItem.update(payload, {
        where: { id: item.id },
        transaction: t,
      });

      const updated = await OrderItem.findByPk(item.id, { transaction: t });

      // -------------------------
      // Income sync (solo si toca dinero)
      // -------------------------
      const touchedMoney =
        ("paidAt" in payload) ||
        ("price" in payload) ||
        ("soldQty" in payload) ||
        ("quantity" in payload);

      if (touchedMoney) {
        const existingIncome = await Income.findOne({
          where: { referenceType: "order_item", referenceId: updated.id },
          transaction: t,
        });

        const billableQty = Number(updated.soldQty || 0) > 0
          ? Number(updated.soldQty || 0)
          : Number(updated.quantity || 0);

        if (updated.paidAt) {
          const amount = Number((Number(updated.price || 0) * billableQty).toFixed(2));
          const concept = `Pago ítem #${updated.id} (Order #${updated.orderId})`;

          if (existingIncome) {
            await existingIncome.update(
              { amount, date: new Date(), concept, category: "Venta" },
              { transaction: t }
            );
          } else {
            await Income.create(
              {
                date: new Date(),
                amount,
                concept,
                category: "Venta",
                referenceType: "order_item",
                referenceId: updated.id,
                createdBy: user.accountId,
              },
              { transaction: t }
            );
          }
        } else {
          if (existingIncome) await existingIncome.destroy({ transaction: t });
        }
      }

      // -------------------------
      // Estado del pedido (pagado si todos pagados)
      // -------------------------
      const allItems = await OrderItem.findAll({
        where: { orderId: updated.orderId },
        attributes: ["paidAt"],
        transaction: t,
      });

      const allPaid = allItems.length > 0 && allItems.every((i) => !!i.paidAt);

      const order = await Order.findByPk(updated.orderId, { transaction: t });
      if (order) {
        order.status = allPaid ? "pagado" : "pendiente";
        await order.save({ transaction: t });
      }

      return { status: 200, body: { message: "Ítem actualizado ✅", item: updated } };
    });

    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error("updateOrderItem:", error);
    return res.status(500).json({
      message: "Error al actualizar ítem",
      error: String(error?.message || error),
    });
  }
};


/**
 * @deprecated Mantenimiento one-off: copia order.date → item.deliveredAt para un cliente fijo.
 * Solo accesible en desarrollo vía GET /orders/cmd (Programador). No usar en producción.
 */
export const command = async (req, res) => {
  const customerId = 19;

  try {
    const result = await sequelize.transaction(async (t) => {
      // 1) Traer órdenes del cliente (solo id y date)
      const orders = await Order.findAll({
        where: { customerId },
        attributes: ["id", "date"],
        order: [["id", "ASC"]],
        transaction: t,
      });

      if (!orders.length) {
        return {
          ok: true,
          customerId,
          updatedItems: 0,
          note: "El cliente no tiene órdenes.",
        };
      }

      // 2) Para cada orden: setear ERP_orders_items.deliveredAt = ERP_orders.date
      //    (solo donde deliveredAt está NULL, para no pisar datos ya puestos)
      let updatedItems = 0;

      for (const o of orders) {
        const orderDate = o.date; // ✅ la fecha que quieres copiar
        if (!orderDate) continue;

        const [count] = await OrderItem.update(
          { deliveredAt: orderDate },
          {
            where: {
              orderId: o.id,
              deliveredAt: null, // ✅ solo items sin deliveredAt
            },
            transaction: t,
          }
        );

        updatedItems += Number(count || 0);
      }

      return {
        ok: true,
        customerId,
        updatedItems,
        note: "Se copió ERP_orders.date a ERP_orders_items.deliveredAt (solo donde estaba NULL).",
      };
    });

    return res.json(result);
  } catch (error) {
    console.error("command set items.deliveredAt from orders.date:", error);
    return res.status(500).json({
      mensaje: "Error actualizando deliveredAt en items",
      error: String(error?.message || error),
    });
  }
};

export const closeOrderItemLogistics = async (req, res) => {
  const { itemId } = req.params;
  const { soldQty, damagedQty, giftQty, replacedQty } = req.body;

  const token = getHeaderToken(req);
  let user = null;
  try { user = await verifyJWT(token); }
  catch { return res.status(401).json({ message: "No autorizado" }); }

  try {
    const result = await sequelize.transaction(async (t) => {
      const item = await OrderItem.findByPk(itemId, { transaction: t, lock: t.LOCK.UPDATE });
      if (!item) return { status: 404, body: { message: "Ítem no encontrado" } };

      const delivered = num(item.quantity);

      const oldSold = num(item.soldQty);
      const oldDam = num(item.damagedQty);
      const oldGift = num(item.giftQty);
      const oldRep  = num(item.replacedQty);

      const newSold = Math.max(0, num(soldQty));
      const newDam  = Math.max(0, num(damagedQty));
      const newGift = Math.max(0, num(giftQty));
      const newRep  = Math.max(0, num(replacedQty));

      if ((newSold + newDam + newGift + newRep) > delivered) {
        return { status: 400, body: { message: "La suma (vendido+dañado+yapa+reemplazo) no puede ser mayor que lo entregado" } };
      }

      // deltas (para no duplicar movements)
      const dSold = newSold - oldSold;
      const dDam  = newDam  - oldDam;
      const dGift = newGift - oldGift;
      const dRep  = newRep  - oldRep;

      // ⚠️ Recomendación: no permitir bajar (deltas negativos) sin permiso
      const anyNegative = [dSold, dDam, dGift, dRep].some(d => d < 0);
      if (anyNegative) {
        return { status: 400, body: { message: "No se permite reducir valores del cierre. Use un ajuste con autorización." } };
      }

      // ✅ aquí SÍ descontamos stock (salidas reales)
      const product = await InventoryProduct.findByPk(item.productId, { transaction: t, lock: t.LOCK.UPDATE });
      if (!product) return { status: 404, body: { message: "Producto no encontrado" } };

      const totalDeltaOut = dSold + dDam + dGift + dRep;
      if (num(product.stock) < totalDeltaOut) {
        return { status: 400, body: { message: "Stock insuficiente para registrar el cierre" } };
      }

      // bajar stock por total salidas
      product.stock = num(product.stock) - totalDeltaOut;
      await product.save({ transaction: t });

      const createMov = async (qty, reason, desc) => {
        if (qty <= 0) return;
        await InventoryMovement.create({
          productId: item.productId,
          quantity: qty,
          type: "salida",
          reason,
          referenceType: "order_item",
          referenceId: item.id,
          date: new Date(),
          createdBy: user.accountId,
          description: desc,
        }, { transaction: t });
      };

      await createMov(dSold, "SALIDA_VENTA", `Cierre vendido (orderItem #${item.id})`);
      await createMov(dDam,  "SALIDA_DANIADO", `Cierre dañado (orderItem #${item.id})`);
      await createMov(dGift, "SALIDA_YAPA", `Cierre yapa (orderItem #${item.id})`);
      await createMov(dRep,  "SALIDA_REEMPLAZO", `Cierre reemplazo (orderItem #${item.id})`);

      // guardar campos en el item
      await item.update(
        { soldQty: newSold, damagedQty: newDam, giftQty: newGift, replacedQty: newRep },
        { transaction: t }
      );

      return { status: 200, body: { message: "Cierre/logística guardado", item } };
    });

    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error("closeOrderItemLogistics:", error);
    return res.status(500).json({ message: "Error", error: String(error?.message || error) });
  }
};


export const markItemAsPaid = async (req, res) => {
  const { itemId } = req.params;

  try {
    const token = getHeaderToken(req);
    const user = await verifyJWT(token);

    const result = await sequelize.transaction(async (t) => {
      const item = await OrderItem.findByPk(itemId, {
        include: [
          { model: InventoryProduct, as: "ERP_inventory_product", attributes: ["id", "name"] },
          { model: Order, as: "ERP_order", include: [{ model: Customer, as: "ERP_customer", attributes: ["id", "name"] }] },
        ],
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!item) return { status: 404, body: { message: "Item not found" } };
      if (item.paidAt) return { status: 400, body: { message: "Este ítem ya está pagado" } };

      // ✅ Cobrar por vendido (soldQty). Si no existe soldQty, cobra por quantity (compat).
      const billableQty = getBillableQty(item);

      item.paidAt = new Date();
      await item.save({ transaction: t });

      const itemTotal = Number((num(item.price) * billableQty).toFixed(2));

      const productName = item.ERP_inventory_product?.name || "Producto";
      const customerName = item.ERP_order?.ERP_customer?.name || "Cliente";

      const concept = `Venta ${productName} x${billableQty} a ${customerName} (Ord #${item.orderId}) $${num(item.price).toFixed(2)}`;

      const [income, created] = await Income.findOrCreate({
        where: { referenceType: "order_item", referenceId: item.id },
        defaults: {
          date: new Date(),
          amount: itemTotal,
          concept,
          category: "Venta",
          createdBy: user.accountId,
          referenceType: "order_item",
          referenceId: item.id,
        },
        transaction: t,
      });

      if (!created) {
        await income.update(
          { amount: itemTotal, date: new Date(), concept, category: "Venta" },
          { transaction: t }
        );
      }

      // Recalcula estado del pedido
      const allItems = await OrderItem.findAll({
        where: { orderId: item.orderId },
        attributes: ["paidAt"],
        transaction: t,
      });

      const allPaid = allItems.length > 0 && allItems.every((i) => !!i.paidAt);

      const order = await Order.findByPk(item.orderId, { transaction: t });
      if (order) {
        order.status = allPaid ? "pagado" : "pendiente";
        await order.save({ transaction: t });
      }

      return { status: 200, body: { message: "Ítem marcado como pagado", item, income } };
    });

    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error("markItemAsPaid:", error);
    return res.status(500).json({ message: "Error", error: String(error?.message || error) });
  }
};








export const unmarkItemAsPaid = async (req, res) => {
  const { itemId } = req.params;

  try {
    const token = getHeaderToken(req);
    await verifyJWT(token);

    const result = await sequelize.transaction(async (t) => {
      const item = await OrderItem.findByPk(itemId, { transaction: t, lock: t.LOCK.UPDATE });
      if (!item) return { status: 404, body: { message: "Item not found" } };

      if (!item.paidAt) return { status: 400, body: { message: "Este ítem no está pagado" } };

      item.paidAt = null;
      await item.save({ transaction: t });

      await Income.destroy({
        where: { referenceType: "order_item", referenceId: item.id },
        transaction: t,
      });

      const allItems = await OrderItem.findAll({
        where: { orderId: item.orderId },
        attributes: ["paidAt"],
        transaction: t,
      });

      const allPaid = allItems.length > 0 && allItems.every((i) => !!i.paidAt);

      const order = await Order.findByPk(item.orderId, { transaction: t });
      if (order) {
        order.status = allPaid ? "pagado" : "pendiente";
        await order.save({ transaction: t });
      }

      return { status: 200, body: { message: "Pago revertido", item } };
    });

    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error("unmarkItemAsPaid:", error);
    return res.status(500).json({ message: "Error", error: String(error?.message || error) });
  }
};


export const markItemAsDelivered = async (req, res) => {
  try {
    const { itemId } = req.params;
    const token = getHeaderToken(req);
    const user = await verifyJWT(token);

    const item = await OrderItem.findByPk(itemId, {
      include: [
        { model: Order, as: "ERP_order", include: [{ model: Customer, as: "ERP_customer", attributes: ["id", "name"] }] }
      ]
    });

    if (!item) return res.status(404).json({ message: "Item not found" });
    if (item.deliveredAt) return res.status(400).json({ message: "Este ítem ya fue marcado como entregado" });

    // ✅ si es panadería/consignación: NO descontar stock aquí
    const consignment = isConsignmentOrder(item);
    if (consignment) {
      item.deliveredAt = new Date();
      await item.save();
      return res.json({
        message: "Ítem entregado (consignación). La salida real se registra con el cierre (vendido/dañado/yapa).",
        item
      });
    }

    // ✅ modo normal: descontar stock y registrar movement de venta
    const product = await InventoryProduct.findByPk(item.productId);
    if (!product) return res.status(404).json({ message: "Producto no encontrado" });

    if (num(product.stock) < num(item.quantity)) {
      return res.status(400).json({ message: "Stock insuficiente para entregar este ítem" });
    }

    // stock
    product.stock = num(product.stock) - num(item.quantity);
    await product.save();

    // movement
    await InventoryMovement.create({
      productId: item.productId,
      quantity: num(item.quantity),
      type: "salida",
      reason: "SALIDA_VENTA",
      referenceType: "order_item",
      referenceId: item.id,
      date: new Date(),
      createdBy: user.accountId,
      description: `Entrega venta normal (orderItem #${item.id})`
    });

    // deliveredAt
    item.deliveredAt = new Date();
    await item.save();

    // estado pedido entregado si todos delivered
    const allItems = await OrderItem.findAll({ where: { orderId: item.orderId } });
    const allDelivered = allItems.every(i => !!i.deliveredAt);

    if (allDelivered) {
      const order = await Order.findByPk(item.orderId);
      if (order && order.status !== "pagado") {
        order.status = "entregado";
        await order.save();
      }
    }

    res.json({ message: "Item delivered, stock updated, and movement recorded", item });
  } catch (error) {
    console.error("Error delivering item:", error);
    res.status(500).json({ message: "Error delivering item", error: String(error?.message || error) });
  }
};

// Crear un nuevo cliente
export const createCustomer = async (req, res) => {
  try {
    const customer = await Customer.create(req.body);
    res.status(201).json(customer);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear cliente', error });
  }
};

// Crear un nuevo pedido
export const createOrder = async (req, res) => {
  try {
    const { customerId, notes, date, items } = req.body;

    if (!customerId || !items || items.length === 0) {
      return res.status(400).json({ message: 'Faltan datos del pedido' });
    }

    const order = await Order.create({
      customerId,
      notes,
      date: date, // usa la fecha enviada, o la actual si no viene
    });

    const createdItems = await Promise.all(
      items.map((item) =>
        OrderItem.create({
          orderId: order.id,
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          statusEntrega: false,
          statusPago: false,
        })
      )
    );

    res.status(201).json({
      message: "Pedido registrado correctamente",
      order,
      items: createdItems,
    });
  } catch (error) {
    console.error("createOrder:", error);
    res.status(500).json({ message: "Error al crear pedido" });
  }
};


export const markOrderAsPaid = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findByPk(id);

    if (!order) return res.status(404).json({ message: 'Pedido no encontrado' });

    if (order.status === 'pagado') {
      return res.status(400).json({ message: 'El pedido ya está marcado como pagado' });
    }

    order.status = 'pagado';
    await order.save();

    res.json({ message: 'Pedido marcado como pagado', order });
  } catch (error) {
    res.status(500).json({ message: 'Error al marcar pedido como pagado', error });
  }
};

export const deleteOrderItem = async (req, res) => {
  try {
    const item = await OrderItem.findByPk(req.params.id);
    if (!item) return res.status(404).json({ message: "Ítem no encontrado" });
    await item.destroy();
    res.json({ message: "Ítem eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ message: "Error al eliminar ítem", error });
  }
};
export const deleteOrder = async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id);
    if (!order) return res.status(404).json({ message: "Orden no encontrado" });
    await order.destroy();
    res.json({ message: "Orden eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ message: "Error al eliminar Orden", error });
  }
};
// Editar un pedido y su cliente
export const updateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    // Permitimos updates parciales solo en estos campos
    const { customerId, notes, date } = req.body ?? {};

    const token = getHeaderToken(req);
    const user = await verifyJWT(token);

    const order = await Order.findByPk(id);
    if (!order) {
      return res.status(404).json({ message: 'Pedido no encontrado' });
    }

    // Bloqueo por estado si no es Admin/Programador
    const isPrivileged = ['Administrador', 'Programador'].includes(user?.loginRol);
    if (['entregado', 'pagado'].includes(order.status) && !isPrivileged) {
      return res.status(403).json({
        message: `No tiene permisos para editar pedidos ${order.status}`,
      });
    }

    // Construimos el payload de actualización SOLO con campos presentes
    const updates = {};

    if (typeof customerId !== 'undefined') {
      // Validación simple
      if (customerId === null || Number.isNaN(Number(customerId))) {
        return res.status(400).json({ message: 'customerId inválido' });
      }
      updates.customerId = customerId;
    }

    if (typeof notes !== 'undefined') {
      // Sanitizar/limitar si quieres (ej. longitud)
      updates.notes = String(notes);
    }

    if (typeof date !== 'undefined') {
      // Acepta Date ISO o string "YYYY-MM-DDTHH:mm:ss"
      const parsed = new Date(date);
      if (isNaN(parsed.getTime())) {
        return res.status(400).json({ message: 'Formato de fecha inválido' });
      }
      updates.date = parsed; // Sequelize DATE/DATETIME
    }

    // Si no hay nada que actualizar:
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No se enviaron campos válidos para actualizar' });
    }

    await order.update(updates);

    // Opcional: vuelve a cargar asociaciones mínimas si las necesitas en el front
    // await order.reload({ include: [Customer] });

    return res.json({ message: "Pedido actualizado correctamente", order });
  } catch (error) {
    console.error('Error al actualizar pedido:', error);
    return res.status(500).json({ message: 'Error al actualizar pedido', error: String(error?.message || error) });
  }
};

/** POST /orders/:orderId/items — agregar línea a pedido existente (solo Admin / Programador). */
export const addOrderItem = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { productId, quantity, price } = req.body ?? {};

    const token = getHeaderToken(req);
    const user = await verifyJWT(token);

    const isPrivileged = ['Administrador', 'Programador'].includes(user?.loginRol);
    if (!isPrivileged) {
      return res.status(403).json({
        message: 'Solo Administrador o Programador pueden agregar productos a un pedido existente',
      });
    }

    const order = await Order.findByPk(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Pedido no encontrado' });
    }

    const pid = Number(productId);
    const qty = Number(quantity);
    const pr = Number(price);
    if (!Number.isFinite(pid) || pid <= 0) {
      return res.status(400).json({ message: 'productId inválido' });
    }
    if (!Number.isFinite(qty) || qty <= 0) {
      return res.status(400).json({ message: 'Cantidad inválida' });
    }
    if (!Number.isFinite(pr) || pr < 0) {
      return res.status(400).json({ message: 'Precio inválido' });
    }

    const product = await InventoryProduct.findByPk(pid);
    if (!product) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    const item = await OrderItem.create({
      orderId: order.id,
      productId: pid,
      quantity: qty,
      price: pr,
    });

    return res.status(201).json({ message: 'Ítem agregado', item });
  } catch (error) {
    console.error('addOrderItem:', error);
    return res.status(500).json({
      message: 'Error al agregar ítem al pedido',
      error: String(error?.message || error),
    });
  }
};






// Cambiar el estado del pedido
export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const order = await Order.findByPk(id);
    if (!order) return res.status(404).json({ message: 'Pedido no encontrado' });

    order.status = status;
    await order.save();
    res.json({ message: 'Estado actualizado', order });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar estado del pedido', error });
  }
};

/**
 * PATCH /orders/order-items/:itemId/programmer-dashboard
 * Solo Programador: entrega/pago con fecha elegida y stock directo.
 * Sin movimientos de inventario ni ingresos automáticos; queda en Logs.
 */
export const programmerDashboardOrderItemCorrection = async (req, res) => {
  const { itemId } = req.params;
  const { deliveredAt, paidAt, stock, minStock, productId } = req.body ?? {};

  const parseDateField = (v) => {
    if (v === undefined) return undefined;
    if (v === null || v === "") return null;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? "__INVALID__" : d;
  };

  try {
    const item = await OrderItem.findByPk(itemId);
    if (!item) return res.status(404).json({ message: "Ítem no encontrado" });

    const itemPayload = {};
    const logParts = [];

    const delParsed = parseDateField(deliveredAt);
    if (delParsed === "__INVALID__") {
      return res.status(400).json({ message: "Fecha de entrega inválida" });
    }
    if (delParsed !== undefined) {
      itemPayload.deliveredAt = delParsed;
      const prev = item.deliveredAt ? new Date(item.deliveredAt).toISOString() : "—";
      const next = delParsed ? delParsed.toISOString() : "—";
      logParts.push(`entrega ${prev} → ${next}`);
    }

    const paidParsed = parseDateField(paidAt);
    if (paidParsed === "__INVALID__") {
      return res.status(400).json({ message: "Fecha de pago inválida" });
    }
    if (paidParsed !== undefined) {
      itemPayload.paidAt = paidParsed;
      const prev = item.paidAt ? new Date(item.paidAt).toISOString() : "—";
      const next = paidParsed ? paidParsed.toISOString() : "—";
      logParts.push(`pago ${prev} → ${next}`);
    }

    let productRow = null;
    const pid = productId != null ? Number(productId) : null;
    const stockTouched = stock !== undefined && stock !== null && stock !== "";
    const minTouched = minStock !== undefined && minStock !== null && minStock !== "";

    if ((stockTouched || minTouched) && pid) {
      productRow = await InventoryProduct.findByPk(pid);
      if (!productRow) return res.status(404).json({ message: "Producto no encontrado" });
    }

    const productUpdates = {};
    if (productRow && stockTouched) {
      const n = Number(stock);
      if (!Number.isFinite(n) || n < 0) {
        return res.status(400).json({ message: "Stock inválido" });
      }
      productUpdates.stock = n;
    }
    if (productRow && minTouched) {
      const n = Number(minStock);
      if (!Number.isFinite(n) || n < 0) {
        return res.status(400).json({ message: "Stock mínimo inválido" });
      }
      productUpdates.minStock = n;
    }

    if (
      !Object.keys(itemPayload).length &&
      !Object.keys(productUpdates).length
    ) {
      return res.status(400).json({ message: "No hay cambios para registrar" });
    }

    await sequelize.transaction(async (t) => {
      if (Object.keys(itemPayload).length) {
        await OrderItem.update(itemPayload, {
          where: { id: item.id },
          transaction: t,
        });

        const allItems = await OrderItem.findAll({
          where: { orderId: item.orderId },
          attributes: ["paidAt"],
          transaction: t,
        });
        const allPaid =
          allItems.length > 0 && allItems.every((i) => !!i.paidAt);
        const order = await Order.findByPk(item.orderId, { transaction: t });
        if (order) {
          order.status = allPaid ? "pagado" : "pendiente";
          await order.save({ transaction: t });
        }
      }

      if (productRow && Object.keys(productUpdates).length) {
        const prevStock = Number(productRow.stock ?? 0);
        const prevMin = Number(productRow.minStock ?? 0);
        await productRow.update(productUpdates, { transaction: t });
        await productRow.reload({ transaction: t });
        logParts.push(
          `stock "${productRow.name}" ${prevStock} → ${Number(productRow.stock ?? 0)}, min ${prevMin} → ${Number(productRow.minStock ?? 0)}`,
        );
      }
    });

    const updatedItem = await OrderItem.findByPk(item.id, {
      include: [
        {
          model: InventoryProduct,
          as: "ERP_inventory_product",
          attributes: ["id", "name", "stock", "minStock"],
        },
      ],
    });

    logger({
      httpMethod: "PATCH",
      endPoint: `/orders/order-items/${itemId}/programmer-dashboard`,
      action: "Corrección dashboard estados de pedido",
      description: `Pedido #${item.orderId}, ítem #${itemId}. ${logParts.join("; ")}. Sin movimientos de inventario ni ingresos automáticos.`,
      system: req.headers["user-agent"] || "dashboard",
    });

    const formatted = updatedItem
      ? {
          ...updatedItem.toJSON(),
          paidAt: updatedItem.paidAt
            ? format(new Date(updatedItem.paidAt), "dd/MM/yyyy HH:mm:ss", { locale: es })
            : null,
          deliveredAt: updatedItem.deliveredAt
            ? format(new Date(updatedItem.deliveredAt), "dd/MM/yyyy HH:mm:ss", {
                locale: es,
              })
            : null,
          productStock: Number(
            updatedItem.ERP_inventory_product?.stock ?? productRow?.stock ?? 0,
          ),
          productMinStock: Number(
            updatedItem.ERP_inventory_product?.minStock ?? productRow?.minStock ?? 0,
          ),
        }
      : null;

    return res.json({
      message: "Cambios registrados (solo Logs, sin movimientos ni ingresos)",
      item: formatted,
    });
  } catch (error) {
    console.error("programmerDashboardOrderItemCorrection:", error);
    return res.status(500).json({
      message: "Error al registrar corrección",
      error: error.message,
    });
  }
};

export const getOrderStatusWorkbench = async (req, res) => {
  try {
    const orders = await Order.findAll({
      where: nonCajaPosNotesWhere,
      include: [
        { model: Customer, as: "ERP_customer" },
        {
          model: OrderItem,
          as: "ERP_order_items",
          include: [
            {
              model: InventoryProduct,
              as: "ERP_inventory_product",
              attributes: ["id", "name", "stock", "minStock"],
            },
          ],
        },
      ],
      order: [["date", "DESC"]],
    });

    const formatted = formatOrdersList(orders).map((order) => ({
      ...order,
      ERP_order_items: order.ERP_order_items.map((item) => ({
        ...item,
        productName: item.ERP_inventory_product?.name ?? null,
        productStock: Number(item.ERP_inventory_product?.stock ?? 0),
        productMinStock: Number(item.ERP_inventory_product?.minStock ?? 0),
      })),
    }));

    let unpaid = 0;
    let paidUndelivered = 0;
    let unpaidUndelivered = 0;
    let deliveredUnpaid = 0;

    for (const order of formatted) {
      const items = order.ERP_order_items || [];
      if (!items.length) continue;
      const allPaid = items.every((i) => !!i.paidAt);
      const allDelivered = items.every((i) => !!i.deliveredAt);
      if (!allPaid) unpaid += 1;
      if (allPaid && !allDelivered) paidUndelivered += 1;
      if (!allPaid && !allDelivered) unpaidUndelivered += 1;
      if (allDelivered && !allPaid) deliveredUnpaid += 1;
    }

    const overview = [
      { id: "unpaidOrders", label: "No Pagados", value: unpaid },
      { id: "paidUndeliveredOrders", label: "Pagados no Entregados", value: paidUndelivered },
      { id: "unpaidUndeliveredOrders", label: "No Pagados ni Entregados", value: unpaidUndelivered },
      { id: "deliveredUnpaidOrders", label: "Entregados no Pagados", value: deliveredUnpaid },
    ];

    res.json({ orders: formatted, overview });
  } catch (error) {
    console.error("getOrderStatusWorkbench:", error);
    res.status(500).json({ message: "Error al cargar estados de pedido" });
  }
};

// Obtener pedidos con items y cliente. Query opcional: ?from=YYYY-MM-DD&to=YYYY-MM-DD
function formatOrdersList(orders) {
  return orders.map((order) => {
    const formattedItems = order.ERP_order_items.map((item) => ({
      ...item.toJSON(),
      paidAt: item.paidAt
        ? format(new Date(item.paidAt), "dd/MM/yyyy HH:mm:ss", { locale: es })
        : null,
      deliveredAt: item.deliveredAt
        ? format(new Date(item.deliveredAt), "dd/MM/yyyy HH:mm:ss", { locale: es })
        : null,
    }));

    return {
      ...order.toJSON(),
      orderKind: "customer",
      date: format(new Date(order.date), "dd/MM/yyyy HH:mm:ss", { locale: es }),
      createdAt: format(new Date(order.createdAt), "dd/MM/yyyy HH:mm:ss", { locale: es }),
      updatedAt: format(new Date(order.updatedAt), "dd/MM/yyyy HH:mm:ss", { locale: es }),
      ERP_order_items: formattedItems,
    };
  });
}

function parseRangeDate(value, endOfDay = false) {
  if (!value || typeof value !== "string") return null;
  const d = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  if (endOfDay) d.setHours(23, 59, 59, 999);
  return d;
}

export const getAllOrders = async (req, res) => {
  try {
    const fromDate = parseRangeDate(req.query.from, false);
    const toDate = parseRangeDate(req.query.to, true);
    const pagination = parsePagination(req, { defaultPageSize: 100 });

    const where = {
      ...nonCajaPosNotesWhere,
    };
    if (fromDate || toDate) {
      where.date = {};
      if (fromDate) where.date[Op.gte] = fromDate;
      if (toDate) where.date[Op.lte] = toDate;
    }

    const include = [
      {
        model: Customer,
        as: "ERP_customer",
      },
      {
        model: OrderItem,
        as: "ERP_order_items",
        include: [
          {
            model: InventoryProduct,
            as: "ERP_inventory_product",
          },
        ],
      },
    ];

    if (pagination.all) {
      const orders = await Order.findAll({
        where,
        include,
        order: [["date", "DESC"]],
      });
      return res.json(formatOrdersList(orders));
    }

    const { count, rows } = await Order.findAndCountAll({
      where,
      include,
      order: [["date", "DESC"]],
      offset: pagination.offset,
      limit: pagination.limit,
      distinct: true,
    });

    return sendPaginated(res, {
      rows: formatOrdersList(rows),
      total: count,
      page: pagination.page,
      pageSize: pagination.pageSize,
    });
  } catch (error) {
    console.error("getAllOrders:", error);
    res.status(500).json({ message: "Error al obtener pedidos" });
  }
};


