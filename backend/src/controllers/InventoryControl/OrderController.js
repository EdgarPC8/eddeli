import { verifyJWT, getHeaderToken } from "../../libs/jwt.js";

import { InventoryMovement, InventoryProduct } from "../../models/Inventory.js";
import { Customer, Order, OrderItem } from "../../models/Orders.js";
import { Income } from "../../models/Finance.js";
import { format } from 'date-fns';
import { de, es } from 'date-fns/locale';

import { Op } from "sequelize";
import { sequelize } from "../../database/connection.js";

// ----------------------------------------------------------------------------------------------------------------------------

// =======================
// Helpers
// =======================
const toNum = (v, def = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};

const isoDateOnly = (d) => {
  if (!d) return null;
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return null;
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const sum = (arr, fn) => (arr || []).reduce((acc, x) => acc + toNum(fn(x)), 0);

export const getFinanceWorkbenchAll = async (req, res) => {
  try {
    const token = getHeaderToken(req);
    await verifyJWT(token);

    // 1) Clientes + pedidos + items + producto
    const customers = await Customer.findAll({
      attributes: ["id", "name", "phone", "email"],
      include: [
        {
          model: Order,
          as: "ERP_orders",
          attributes: ["id", "customerId", "date", "createdAt", "financeIncomeId"],
          include: [
            {
              model: OrderItem,
              as: "ERP_order_items",
              attributes: ["id", "orderId", "productId", "quantity", "price", "paidAt"],
              include: [
                {
                  model: InventoryProduct,
                  as: "ERP_inventory_product",
                  attributes: ["id", "name"],
                },
              ],
            },
          ],
        },
      ],
      order: [
        ["name", "ASC"],
        [{ model: Order, as: "ERP_orders" }, "createdAt", "DESC"],
      ],
    });

    // 2) Grupos (deudas)
    // OJO: tu Income NO tiene status, así que NO filtramos por status
    const groups = await Income.findAll({
      where: {
        category: "cuentas_por_cobrar",
        referenceType: "customer",
      },
      attributes: ["id", "date", "amount", "concept", "referenceId", "createdAt"],
      order: [["createdAt", "DESC"]],
    });

    // 3) Abonos
    // En tu payOrderGroup tú creas abonos con category: "abono" y referenceType: "income_debt"
    const payments = await Income.findAll({
      where: {
        referenceType: "income_debt",
        category: "abono",
      },
      attributes: ["id", "date", "amount", "concept", "referenceId", "createdAt"],
      order: [["createdAt", "DESC"]],
    });

    // =========================
    // Formato EXACTO frontend
    // =========================

    const outGroups = groups.map((g) => ({
      id: g.id,
      customerId: g.referenceId, // referenceType = customer
      concept: g.concept,
      createdAt: isoDateOnly(g.createdAt) || isoDateOnly(g.date),
      totalAmount: Number(toNum(g.amount).toFixed(2)),
    }));

    const outPayments = payments.map((p) => ({
      id: p.id,
      groupId: p.referenceId, // referenceId = groupIncomeId
      date: isoDateOnly(p.date) || isoDateOnly(p.createdAt),
      amount: Number(toNum(p.amount).toFixed(2)),
      note: p.concept ?? "Abono",
    }));

    // -------------------------
    // ✅ 1) Saldo por grupo
    // -------------------------
    const paidByGroupId = new Map();
    for (const p of outPayments) {
      paidByGroupId.set(p.groupId, Number(((paidByGroupId.get(p.groupId) || 0) + toNum(p.amount)).toFixed(2)));
    }

    const remainingByGroupId = new Map();
    for (const g of outGroups) {
      const total = toNum(g.totalAmount);
      const paid = toNum(paidByGroupId.get(g.id) || 0);
      const remaining = Number(Math.max(0, total - paid).toFixed(2));
      remainingByGroupId.set(g.id, remaining);
    }

    // -------------------------
    // ✅ 2) Deuda por cliente:
    // saldo de grupos + ítems sin pagar NO agrupados
    // -------------------------
    const debtByCustomerId = new Map();

    // (a) saldo de grupos por cliente
    for (const g of outGroups) {
      const remaining = toNum(remainingByGroupId.get(g.id) || 0);
      if (remaining <= 0) continue;

      const prev = toNum(debtByCustomerId.get(g.customerId) || 0);
      debtByCustomerId.set(g.customerId, Number((prev + remaining).toFixed(2)));
    }

    // (b) ítems sin pagar que aún no están en grupo (financeIncomeId = null)
    for (const c of customers) {
      const ordersArr = Array.isArray(c.ERP_orders) ? c.ERP_orders : [];
      let ungroupedPending = 0;

      for (const o of ordersArr) {
        const inGroup = o.financeIncomeId != null; // ya agrupado
        if (inGroup) continue;

        const itemsArr = Array.isArray(o.ERP_order_items) ? o.ERP_order_items : [];
        for (const it of itemsArr) {
          if (!it.paidAt) {
            ungroupedPending += toNum(it.quantity) * toNum(it.price);
          }
        }
      }

      if (ungroupedPending > 0) {
        const prev = toNum(debtByCustomerId.get(c.id) || 0);
        debtByCustomerId.set(c.id, Number((prev + ungroupedPending).toFixed(2)));
      }
    }

    // customers (ordenados por debtTotal desc)
    let outCustomers = customers.map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone ?? null,
      email: c.email ?? null,
      debtTotal: Number(toNum(debtByCustomerId.get(c.id) || 0).toFixed(2)),
    }));

    outCustomers.sort((a, b) => {
      const diff = toNum(b.debtTotal) - toNum(a.debtTotal);
      if (diff !== 0) return diff;
      return String(a.name || "").localeCompare(String(b.name || ""), "es");
    });

    // orders array (igual que tu seedOrders)
    const outOrders = [];
    for (const c of customers) {
      const ordersArr = Array.isArray(c.ERP_orders) ? c.ERP_orders : [];
      for (const o of ordersArr) {
        const itemsArr = Array.isArray(o.ERP_order_items) ? o.ERP_order_items : [];

        outOrders.push({
          id: o.id,
          customerId: o.customerId ?? c.id,
          date: isoDateOnly(o.date) || isoDateOnly(o.createdAt),
          groupId: o.financeIncomeId ?? null,
          paidAt: null, // (si quieres, luego lo calculamos a nivel pedido)
          items: itemsArr.map((it) => ({
            id: it.id,
            product: it.ERP_inventory_product?.name ?? "(sin nombre)",
            qty: toNum(it.quantity),
            price: toNum(it.price),
            paidAt: it.paidAt ? isoDateOnly(it.paidAt) : null,
          })),
        });
      }
    }

    return res.json({
      customers: outCustomers,
      orders: outOrders,
      groups: outGroups,
      payments: outPayments,
    });
  } catch (error) {
    console.error("getFinanceWorkbenchAll:", error);
    return res.status(500).json({
      message: "Error al cargar Workbench",
      error: String(error?.message || error),
    });
  }
};


export const payOrderGroup = async (req, res) => {
  const { groupIncomeId } = req.params;
  const { amount, date, note } = req.body;

  const payAmount = Number(amount);
  if (!Number.isFinite(payAmount) || payAmount <= 0) {
    return res.status(400).json({ message: "Monto inválido" });
  }

  try {
    const token = getHeaderToken(req);
    const user = await verifyJWT(token);

    const result = await sequelize.transaction(async (t) => {
      const debt = await Income.findByPk(groupIncomeId, { transaction: t });
      if (!debt) return { status: 404, body: { message: "Grupo/deuda no existe" } };

      if (debt.status === "paid") {
        return { status: 400, body: { message: "Este grupo ya está pagado" } };
      }

      // Total abonado
      const alreadyPaid = (await Income.sum("amount", {
        where: {
          referenceType: "income_debt",
          referenceId: debt.id,
          status: "paid",
        },
        transaction: t,
      })) || 0;

      const total = Number(debt.amount || 0);
      const remaining = Number((total - Number(alreadyPaid)).toFixed(2));

      if (payAmount > remaining + 0.0001) {
        return { status: 400, body: { message: `Abono excede saldo. Saldo: ${remaining}` } };
      }

      const paymentDate = date ? new Date(date) : new Date();

      // Crear el abono
      const payment = await Income.create(
        {
          date: paymentDate,
          amount: Number(payAmount.toFixed(2)),
          concept: note || `Abono grupo #${debt.id}`,
          category: "abono",
          status: "paid",
          counterpartyName: debt.counterpartyName || null,
          referenceType: "income_debt",
          referenceId: debt.id,
          createdBy: user.accountId,
        },
        { transaction: t }
      );

      const newPaid = Number(alreadyPaid) + payAmount;
      const newRemaining = Number((total - newPaid).toFixed(2));

      let closed = false;

      if (newRemaining <= 0.0001) {
        // Marcar deuda pagada
        debt.status = "paid";
        await debt.save({ transaction: t });

        // Traer pedidos del grupo
        const groupOrders = await Order.findAll({
          where: { financeIncomeId: debt.id },
          include: [{ model: OrderItem, as: "ERP_order_items" }],
          transaction: t,
        });

        // Marcar items como pagados (paidAt)
        for (const o of groupOrders) {
          const items = Array.isArray(o.ERP_order_items) ? o.ERP_order_items : [];
          for (const it of items) {
            if (!it.paidAt) {
              it.paidAt = paymentDate;
              await it.save({ transaction: t });
            }
          }
        }

        closed = true;
      }

      return {
        status: 200,
        body: {
          groupIncomeId: debt.id,
          paymentId: payment.id,
          total,
          alreadyPaid: Number(alreadyPaid),
          paidNow: Number(payAmount.toFixed(2)),
          totalPaid: Number(newPaid.toFixed(2)),
          remaining: Number(Math.max(0, newRemaining).toFixed(2)),
          closed,
        },
      };
    });

    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error("payOrderGroup:", error);
    return res.status(500).json({ message: "Error registrando abono", error: String(error.message || error) });
  }
};


export const createOrderGroup = async (req, res) => {
  const { customerId, orderIds, concept } = req.body;

  if (!customerId || !Array.isArray(orderIds) || orderIds.length === 0) {
    return res.status(400).json({ message: "customerId y orderIds son requeridos" });
  }

  try {
    const token = getHeaderToken(req);
    const user = await verifyJWT(token);

    const result = await sequelize.transaction(async (t) => {
      const customer = await Customer.findByPk(customerId, { transaction: t });
      if (!customer) return { status: 404, body: { message: "Cliente no existe" } };

      // Traer pedidos con items
      const orders = await Order.findAll({
        where: {
          id: { [Op.in]: orderIds },
          customerId,
        },
        include: [
          {
            model: OrderItem,
            as: "ERP_order_items",
          },
        ],
        transaction: t,
      });

      if (orders.length !== orderIds.length) {
        return { status: 400, body: { message: "Algunos pedidos no existen o no pertenecen al cliente" } };
      }

      // Validar que ninguno ya esté en grupo
      const alreadyGrouped = orders.find((o) => o.financeIncomeId != null);
      if (alreadyGrouped) {
        return {
          status: 400,
          body: { message: `El pedido #${alreadyGrouped.id} ya está en un grupo` },
        };
      }

      // Total = suma de items no pagados
      let total = 0;
      let itemsCount = 0;

      for (const o of orders) {
        const items = Array.isArray(o.ERP_order_items) ? o.ERP_order_items : [];
        for (const it of items) {
          if (!it.paidAt) {
            total += toNum(it.quantity) * toNum(it.price);
            itemsCount += 1;
          }
        }
      }

      total = Number(total.toFixed(2));

      if (total <= 0) {
        return { status: 400, body: { message: "No hay ítems pendientes en esos pedidos" } };
      }

      // Crear Income pendiente = “grupo/deuda”
      const debt = await Income.create(
        {
          date: new Date(),
          amount: total,
          concept: concept || `Grupo ${customer.name}`,
          category: "cuentas_por_cobrar",
          status: "pending",
          counterpartyName: customer.name,
          referenceType: "customer",
          referenceId: customerId,
          createdBy: user.accountId, // ajusta si tu JWT trae idCuenta
        },
        { transaction: t }
      );

      // Asignar grupo a pedidos
      await Order.update(
        { financeIncomeId: debt.id },
        { where: { id: { [Op.in]: orderIds } }, transaction: t }
      );

      return {
        status: 201,
        body: {
          groupIncomeId: debt.id,
          customerId,
          concept: debt.concept,
          total: debt.amount,
          ordersCount: orders.length,
          pendingItemsCount: itemsCount,
        },
      };
    });

    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error("createOrderGroup:", error);
    return res.status(500).json({ message: "Error al crear grupo", error: String(error.message || error) });
  }
};
// ----------------------------------------------------------------------------------------------------------------------------

// controllers/finance/financeAudit.controller.js
export const fixIncomeFromOrderItemsMismatch = async (req, res) => {
  const apply = String(req.query.apply || "0") === "0"; // por defecto NO aplica
  try {
    const result = await sequelize.transaction(async (t) => {
      const orders = await Order.findAll({
        attributes: ["id", "status"],
        include: [{ model: OrderItem, as: "ERP_order_items", attributes: ["price", "quantity"] }],
        order: [["id", "ASC"]],
        transaction: t,
      });

      const orderIds = orders.map(o => o.id);
      const incomes = await Income.findAll({
        where: { referenceType: "order", referenceId: { [Op.in]: orderIds } },
        order: [["referenceId", "ASC"], ["id", "ASC"]],
        transaction: t,
      });

      const incomeByOrderId = new Map();
      for (const inc of incomes) {
        const k = inc.referenceId;
        if (!incomeByOrderId.has(k)) incomeByOrderId.set(k, []);
        incomeByOrderId.get(k).push(inc);
      }

      const fixes = [];

      for (const order of orders) {
        const items = order.ERP_order_items || [];
        const itemsTotal = Number(
          items.reduce((sum, it) => sum + Number(it.price) * Number(it.quantity), 0).toFixed(2)
        );

        const incs = incomeByOrderId.get(order.id) || [];
        if (incs.length === 0) continue;

        const incomeTotal = Number(
          incs.reduce((sum, inc) => sum + Number(inc.amount), 0).toFixed(2)
        );

        const diff = Number((itemsTotal - incomeTotal).toFixed(2));
        if (Math.abs(diff) <= 0.01) continue;

        const primary = incs[0];
        const duplicates = incs.slice(1);

        fixes.push({
          orderId: order.id,
          itemsTotal,
          previousIncomeTotal: incomeTotal,
          newIncomeAmount: itemsTotal,
          previousIncomeIds: incs.map(i => i.id),
          willUpdateIncomeId: primary.id,
          willDeleteDuplicateIncomeIds: duplicates.map(d => d.id),
          apply,
        });

        if (apply) {
          // Actualiza el primero con el monto correcto
          await primary.update(
            {
              amount: itemsTotal,
              concept: primary.concept || `Order #${order.id} payment (reconciled)`,
              category: primary.category || "Venta",
            },
            { transaction: t }
          );

          // Elimina duplicados (si existen)
          if (duplicates.length > 0) {
            await Income.destroy({
              where: { id: { [Op.in]: duplicates.map(d => d.id) } },
              transaction: t,
            });
          }
        }
      }

      return {
        apply,
        fixesCount: fixes.length,
        fixes,
      };
    });

    return res.json(result);
  } catch (error) {
    console.error("fixIncomeFromOrderItemsMismatch:", error);
    return res.status(500).json({
      message: "Error arreglando inconsistencias",
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
      date:date, // usa la fecha enviada, o la actual si no viene
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


