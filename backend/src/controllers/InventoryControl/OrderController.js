import { verifyJWT, getHeaderToken } from "../../libs/jwt.js";

import { InventoryMovement, InventoryProduct } from "../../models/Inventory.js";
import { Customer, Order, OrderItem } from "../../models/Orders.js";
import { Income } from "../../models/Finance.js";
import { format } from 'date-fns';
import { de, es } from 'date-fns/locale';

import { Op } from "sequelize";
import { sequelize } from "../../database/connection.js";
// controllers/finance/financeAudit.controller.js

export const command = async (req, res) => {
  const customerId = 19;

  // Helpers
  const toNum = (x) => Number(Number(x || 0).toFixed(2));

  const extractOrderIdFromConcept = (txt = "") => {
    const s = String(txt || "");

    // Caso 1: (Ord #123)
    let m = s.match(/\( *Ord *# *(\d+) *\)/i);
    if (m) return Number(m[1]);

    // Caso 2: Order #123 payment
    m = s.match(/Order\s*#\s*(\d+)/i);
    if (m) return Number(m[1]);

    return null;
  };

  try {
    const result = await sequelize.transaction(async (t) => {
      // =========================
      // 1) Traer órdenes + items del cliente
      // =========================
      const orders = await Order.findAll({
        where: { customerId },
        attributes: ["id", "customerId", "date", "createdAt", "status"],
        include: [
          {
            model: OrderItem,
            as: "ERP_order_items",
            attributes: ["id", "orderId", "quantity", "price", "paidAt"],
          },
        ],
        order: [["createdAt", "ASC"]],
        transaction: t,
      });

      const orderIds = orders.map((o) => o.id);

      if (!orderIds.length) {
        return {
          titulo: "AUDITORÍA — Items pagados (actual) vs Income (por ref y por concept)",
          customerId,
          resumen: {
            totalPagadoActualPorItems: 0,
            totalIncomePorReference: 0,
            totalIncomePorConcept: 0,
            diferenciaRef: 0,
            diferenciaConcept: 0,
          },
          detallePorOrden: [],
          itemsConIncomeDescuadrado: [],
          nota: "El cliente no tiene órdenes.",
        };
      }

      // Aplanar items
      const allItems = [];
      for (const o of orders) {
        const arr = Array.isArray(o.ERP_order_items) ? o.ERP_order_items : [];
        for (const it of arr) allItems.push(it);
      }

      const itemIds = allItems.map((it) => it.id);

      // =========================
      // 2) Total ACTUAL de items pagados (paidAt != null)
      // =========================
      const paidItems = allItems.filter((it) => !!it.paidAt);

      const totalPagadoActualPorItems = toNum(
        paidItems.reduce((acc, it) => acc + toNum(it.quantity) * toNum(it.price), 0)
      );

      // =========================
      // 3) Incomes por REFERENCE (order + order_item)
      // =========================
      const incomesByReference = await Income.findAll({
        where: {
          [Op.or]: [
            { referenceType: "order", referenceId: { [Op.in]: orderIds } },
            { referenceType: "order_item", referenceId: { [Op.in]: itemIds.length ? itemIds : [0] } },
          ],
        },
        attributes: ["id", "date", "amount", "concept", "category", "referenceType", "referenceId", "createdAt"],
        order: [["id", "ASC"]],
        transaction: t,
      });

      const totalIncomePorReference = toNum(
        incomesByReference.reduce((acc, inc) => acc + toNum(inc.amount), 0)
      );

      // =========================
      // 4) Incomes por CONCEPT (extrae orderId del texto)
      //    Aquí NO confiamos en referenceType/referenceId,
      //    sino en el texto (Ord #xx / Order #xx)
      // =========================
      const incomesCandidates = await Income.findAll({
        where: {
          concept: {
            [Op.or]: [
              { [Op.like]: "%Ord #%" },   // tu formato nuevo
              { [Op.like]: "%Order #%" }, // tu formato viejo
            ],
          },
        },
        attributes: ["id", "date", "amount", "concept", "category", "referenceType", "referenceId", "createdAt"],
        order: [["id", "ASC"]],
        transaction: t,
      });

      // Filtrar candidatos que pertenezcan a este cliente por orderId extraído del concept
      const incomesByConcept = [];
      for (const inc of incomesCandidates) {
        const oid = extractOrderIdFromConcept(inc.concept);
        if (!oid) continue;
        if (!orderIds.includes(oid)) continue; // solo las órdenes del cliente
        incomesByConcept.push({ ...inc.get({ plain: true }), extractedOrderId: oid });
      }

      const totalIncomePorConcept = toNum(
        incomesByConcept.reduce((acc, inc) => acc + toNum(inc.amount), 0)
      );

      // =========================
      // 5) Detalle POR ORDEN:
      //   - total pagado actual por items (paidAt)
      //   - income por referenceType=order
      //   - income por concept (extraído)
      // =========================
      const incomesOrderRefMap = new Map(); // orderId -> sum(amount)
      for (const inc of incomesByReference.filter((x) => x.referenceType === "order")) {
        const oid = Number(inc.referenceId);
        incomesOrderRefMap.set(oid, toNum((incomesOrderRefMap.get(oid) || 0) + toNum(inc.amount)));
      }

      const incomesOrderConceptMap = new Map(); // orderId -> sum(amount)
      for (const inc of incomesByConcept) {
        const oid = Number(inc.extractedOrderId);
        incomesOrderConceptMap.set(oid, toNum((incomesOrderConceptMap.get(oid) || 0) + toNum(inc.amount)));
      }

      const paidByOrderFromItems = new Map(); // orderId -> sum(item line) solo paidAt
      for (const it of paidItems) {
        const oid = Number(it.orderId);
        const line = toNum(toNum(it.quantity) * toNum(it.price));
        paidByOrderFromItems.set(oid, toNum((paidByOrderFromItems.get(oid) || 0) + line));
      }

      const detallePorOrden = orderIds
        .map((oid) => {
          const pagadoActual = toNum(paidByOrderFromItems.get(oid) || 0);
          const incomePorOrderRef = toNum(incomesOrderRefMap.get(oid) || 0);
          const incomePorConcept = toNum(incomesOrderConceptMap.get(oid) || 0);

          return {
            pedidoId: oid,
            totalPagadoActualPorItems: pagadoActual,
            incomePorOrderReferencia: incomePorOrderRef,
            incomePorConceptoExtraido: incomePorConcept,
            diferenciaVsOrderRef: toNum(pagadoActual - incomePorOrderRef),
            diferenciaVsConcept: toNum(pagadoActual - incomePorConcept),
          };
        })
        .filter((x) => x.totalPagadoActualPorItems > 0 || x.incomePorOrderReferencia > 0 || x.incomePorConceptoExtraido > 0);

      // =========================
      // 6) Items pagados con income por item DESCUADRADO
      //    (si existe income referenceType=order_item)
      // =========================
      const incomeByItemId = new Map(); // itemId -> {sum, ids}
      for (const inc of incomesByReference.filter((x) => x.referenceType === "order_item")) {
        const itemId = Number(inc.referenceId);
        if (!incomeByItemId.has(itemId)) incomeByItemId.set(itemId, { sum: 0, ids: [] });
        const obj = incomeByItemId.get(itemId);
        obj.sum = toNum(obj.sum + toNum(inc.amount));
        obj.ids.push(inc.id);
      }

      const itemsConIncomeDescuadrado = [];
      for (const it of paidItems) {
        const expected = toNum(toNum(it.quantity) * toNum(it.price));
        const rec = incomeByItemId.get(it.id);
        if (!rec) continue; // si no hay income por item, no lo marcamos aquí
        const got = toNum(rec.sum);
        const diff = toNum(expected - got);
        if (Math.abs(diff) > 0.01) {
          itemsConIncomeDescuadrado.push({
            orderItemId: it.id,
            pedidoId: it.orderId,
            totalActualItem: expected,
            totalIncomeItem: got,
            diferencia: diff,
            incomeIds: rec.ids,
            nota: "Este item está pagado, pero el Income por order_item no coincide con el total actual (price/qty cambiaron).",
          });
        }
      }

      // =========================
      // 7) Resumen final
      // =========================
      return {
        titulo: "AUDITORÍA — Items pagados (actual) vs Income (por ref y por concept)",
        customerId,
        resumen: {
          totalPagadoActualPorItems,
          totalIncomePorReference,
          totalIncomePorConcept,
          diferenciaRef: toNum(totalPagadoActualPorItems - totalIncomePorReference),
          diferenciaConcept: toNum(totalPagadoActualPorItems - totalIncomePorConcept),
          cantidadPedidos: orderIds.length,
          cantidadItems: allItems.length,
          cantidadItemsPagados: paidItems.length,
          cantidadIncomesPorReference: incomesByReference.length,
          cantidadIncomesPorConcept: incomesByConcept.length,
        },
        detallePorOrden,
        itemsConIncomeDescuadrado: itemsConIncomeDescuadrado.slice(0, 200),
        nota:
          "Si el total actual por items no cuadra con Income, casi seguro cambiaste price/qty después de crear Incomes. Revisa itemsConIncomeDescuadrado y detallePorOrden para ubicar dónde se descuadra.",
      };
    });

    return res.json(result);
  } catch (error) {
    console.error("command audit by concept/ref:", error);
    return res.status(500).json({
      mensaje: "Error auditando por concept/reference",
      error: String(error?.message || error),
    });
  }
};


export const markItemAsPaid = async (req, res) => {
  const { itemId } = req.params;

  try {
    const token = getHeaderToken(req);
    const user = await verifyJWT(token);

    const result = await sequelize.transaction(async (t) => {
      // Traemos el item con producto + orden + cliente (para concept)
      const item = await OrderItem.findByPk(itemId, {
        include: [
          { model: InventoryProduct, attributes: ["id", "name"] },
          {
            model: Order,
            include: [{ model: Customer, attributes: ["id", "name"] }],
          },
        ],
        transaction: t,
      });

      if (!item) return { status: 404, body: { message: "Item not found" } };
      if (item.paidAt) return { status: 400, body: { message: "Este ítem ya está pagado" } };

      item.paidAt = new Date();
      await item.save({ transaction: t });

      const itemTotal = Number((Number(item.price) * Number(item.quantity)).toFixed(2));

      const productName = item.ERP_inventory_product?.name || "Producto";
      const customerName = item.ERP_order?.ERP_customer?.name || "Cliente";

      const concept = `Venta ${productName} x${item.quantity} a ${customerName} (Ord #${item.orderId}) $${Number(item.price).toFixed(2)}`;

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

      // Si ya existía, sincronizamos
      if (!created) {
        await income.update(
          {
            amount: itemTotal,
            date: new Date(),
            concept, // siempre lo actualizamos para que quede bonito
            category: "Venta",
          },
          { transaction: t }
        );
      }

      // Estado del pedido: pagado solo si todos los items están pagados
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

      return {
        status: 200,
        body: { message: "Ítem marcado como pagado", item, income },
      };
    });

    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error("markItemAsPaid:", error);
    return res.status(500).json({ message: "Error", error: String(error?.message || error) });
  }
};


export const updateOrderItem = async (req, res) => {
  const { itemId } = req.params;
  const { quantity, price, paidAt, deliveredAt } = req.body;

  try {
    const token = getHeaderToken(req);
    const user = await verifyJWT(token);

    const result = await sequelize.transaction(async (t) => {
      const item = await OrderItem.findByPk(itemId, { transaction: t });
      if (!item) return { status: 404, body: { message: "Ítem no encontrado" } };

      // 1) updates normales
      if (typeof quantity !== "undefined") item.quantity = Number(quantity);
      if (typeof price !== "undefined") item.price = Number(price);

      // 2) toggle pagado (si viene en el body)
      // - paidAt: null => desmarcar pagado
      // - paidAt: true/"now" => marcar con fecha actual
      // - paidAt: string fecha => usar esa fecha
      if (typeof paidAt !== "undefined") {
        if (paidAt === null) {
          item.paidAt = null;
        } else if (paidAt === true || paidAt === "now") {
          item.paidAt = new Date();
        } else {
          const d = new Date(paidAt);
          if (isNaN(d.getTime())) {
            return { status: 400, body: { message: "paidAt inválido" } };
          }
          item.paidAt = d;
        }
      }

      // (Opcional) toggle entregado con la misma lógica
      if (typeof deliveredAt !== "undefined") {
        if (deliveredAt === null) {
          item.deliveredAt = null;
        } else if (deliveredAt === true || deliveredAt === "now") {
          item.deliveredAt = new Date();
        } else {
          const d = new Date(deliveredAt);
          if (isNaN(d.getTime())) {
            return { status: 400, body: { message: "deliveredAt inválido" } };
          }
          item.deliveredAt = d;
        }
      }

      await item.save({ transaction: t });

      // 3) sincroniza Income SOLO si se tocó paidAt o se tocó price/quantity
      const touchedMoney =
        typeof paidAt !== "undefined" ||
        typeof quantity !== "undefined" ||
        typeof price !== "undefined";

      if (touchedMoney) {
        const existingIncome = await Income.findOne({
          where: { referenceType: "order_item", referenceId: item.id },
          transaction: t,
        });

        if (item.paidAt) {
          const itemTotal = Number((Number(item.price) * Number(item.quantity)).toFixed(2));

          if (existingIncome) {
            await existingIncome.update(
              {
                amount: itemTotal,
                date: new Date(),
                concept: `Pago ítem #${item.id} (Order #${item.orderId})`,
                category: "Venta",
              },
              { transaction: t }
            );
          } else {
            await Income.create(
              {
                date: new Date(),
                amount: itemTotal,
                concept: `Pago ítem #${item.id} (Order #${item.orderId})`,
                category: "Venta",
                referenceType: "order_item",
                referenceId: item.id,
                createdBy: user.accountId,
              },
              { transaction: t }
            );
          }
        } else {
          // si quedó no pagado => income no debe existir
          if (existingIncome) {
            await existingIncome.destroy({ transaction: t });
          }
        }
      }

      // 4) recalcula estado del pedido (pagado si TODOS pagados)
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

      return { status: 200, body: { message: "Ítem actualizado", item } };
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


export const unmarkItemAsPaid = async (req, res) => {
  const { itemId } = req.params;

  try {
    const token = getHeaderToken(req);
    await verifyJWT(token);

    const result = await sequelize.transaction(async (t) => {
      const item = await OrderItem.findByPk(itemId, { transaction: t });
      if (!item) return { status: 404, body: { message: "Item not found" } };

      if (!item.paidAt) {
        return { status: 400, body: { message: "Este ítem no está pagado" } };
      }

      item.paidAt = null;
      await item.save({ transaction: t });

      await Income.destroy({
        where: { referenceType: "order_item", referenceId: item.id },
        transaction: t,
      });

      // actualizar estado del pedido
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

    const item = await OrderItem.findByPk(itemId);
    if (!item) return res.status(404).json({ message: 'Item not found' });

    if (item.deliveredAt) {
      return res.status(400).json({ message: 'Este ítem ya fue marcado como entregado' });
    }

    const product = await InventoryProduct.findByPk(item.productId);
    if (!product) return res.status(404).json({ message: 'Producto no encontrado' });

    if (product.stock < item.quantity) {
      return res.status(400).json({ message: 'Stock insuficiente para entregar este ítem' });
    }


    // 1. Deduct stock
    product.stock -= item.quantity;
    await product.save();

    // 2. Record stock movement
    await InventoryMovement.create({
      productId: item.productId,
      quantity: item.quantity,
      type: "salida",
      referenceType: "order",
      referenceId: item.orderId,
      date: new Date(),
      createdBy: user.accountId
    });

    // 3. Mark as delivered (set delivery timestamp)
    item.deliveredAt = new Date();
    await item.save();

    // 4. Check if all items are delivered
    const allItems = await OrderItem.findAll({ where: { orderId: item.orderId } });
    const allDelivered = allItems.every(i => !!i.deliveredAt);

    if (allDelivered) {
      const order = await Order.findByPk(item.orderId);
      if (order.status !== 'paid') {
        order.status = 'entregado';
        await order.save();
      }
    }

    res.json({ message: 'Item delivered, stock updated, and movement recorded', item });

  } catch (error) {
    console.error("Error delivering item:", error);
    res.status(500).json({ message: 'Error delivering item', error });
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


