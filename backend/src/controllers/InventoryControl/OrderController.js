import { verifyJWT, getHeaderToken } from "../../libs/jwt.js";

import { InventoryMovement, InventoryProduct } from "../../models/Inventory.js";
import { Customer, Order, OrderItem } from "../../models/Orders.js";
import { Income } from "../../models/Finance.js";
import { format } from 'date-fns';
import { de, es } from 'date-fns/locale';

import { Op } from "sequelize";
import { sequelize } from "../../database/connection.js";




const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

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

    res.status(201).json({ order, items: createdItems });
  } catch (error) {
    res.status(500).json({ message: 'Error al crear pedido', error });
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

    return res.json({ message: 'Pedido actualizado', order });
  } catch (error) {
    console.error('Error al actualizar pedido:', error);
    return res.status(500).json({ message: 'Error al actualizar pedido', error: String(error?.message || error) });
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

// Obtener todos los pedidos con sus items y cliente



export const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.findAll({
      include: [
        {
          model: Customer,
          as: "ERP_customer"
        },
        {
          model: OrderItem,
          as: "ERP_order_items",
          include: [
            {
              model: InventoryProduct,
              as: "ERP_inventory_product"
            }
          ]
        }
      ],
      order: [["createdAt", "DESC"]]
    });

    const formattedOrders = orders.map(order => {
      const formattedItems = order.ERP_order_items.map(item => ({
        ...item.toJSON(),
        paidAt: item.paidAt ? format(new Date(item.paidAt), 'dd/MM/yyyy HH:mm:ss', { locale: es }) : null,
        deliveredAt: item.deliveredAt ? format(new Date(item.deliveredAt), 'dd/MM/yyyy HH:mm:ss', { locale: es }) : null,
      }));

      return {
        ...order.toJSON(),
        date: format(new Date(order.date), 'dd/MM/yyyy HH:mm:ss', { locale: es }),
        createdAt: format(new Date(order.createdAt), 'dd/MM/yyyy HH:mm:ss', { locale: es }),
        updatedAt: format(new Date(order.updatedAt), 'dd/MM/yyyy HH:mm:ss', { locale: es }),
        ERP_order_items: formattedItems,
      };
    });

    res.json(formattedOrders);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener pedidos', error });
  }
};


