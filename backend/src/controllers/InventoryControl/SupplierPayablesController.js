/**
 * Cuentas por pagar a proveedores: abonos parciales ligados a pedidos.
 */
import { Op } from "sequelize";
import { sequelize } from "../../database/connection.js";
import { getHeaderToken, verifyJWT } from "../../libs/jwt.js";
import { toAppDateTime, nowApp } from "../../utils/appDateTime.js";
import {
  Supplier,
  SupplierOrder,
  SupplierOrderItem,
} from "../../models/Orders.js";
import { InventoryProduct } from "../../models/Inventory.js";
import { Expense, SupplierOrderPayment } from "../../models/Finance.js";

const toNum = (v, d = 0) => {
  const n = Number(v ?? d);
  return Number.isFinite(n) ? n : d;
};

const round2 = (n) => Math.round((toNum(n) + Number.EPSILON) * 100) / 100;

function orderTotal(items = []) {
  let sub = 0;
  let iva = 0;
  for (const it of items) {
    const line = toNum(it.quantity) * toNum(it.unitPrice);
    sub += line;
    iva += line * (toNum(it.taxRate) / 100);
  }
  return round2(round2(sub) + round2(iva));
}

function isoDateOnly(v) {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

let schemaReady = false;
async function ensureSupplierPayablesSchema() {
  if (schemaReady) return;
  await SupplierOrderPayment.sync();
  schemaReady = true;
}

const orderIncludes = [
  { model: Supplier, as: "ERP_supplier" },
  {
    model: SupplierOrderItem,
    as: "ERP_supplier_order_items",
    include: [{ model: InventoryProduct, as: "ERP_inventory_product", attributes: ["id", "name"] }],
  },
];

async function paidSumForOrder(orderId, transaction) {
  const rows = await SupplierOrderPayment.findAll({
    where: { supplierOrderId: orderId, status: "completed" },
    attributes: ["amount"],
    transaction,
  });
  return round2(rows.reduce((s, r) => s + toNum(r.amount), 0));
}

async function syncOrderPaidFlag(order, total, paidSum, paymentMethod, payDate, transaction) {
  const remaining = round2(Math.max(0, total - paidSum));
  if (remaining <= 0.009) {
    order.paidAt = payDate || order.paidAt || nowApp();
    if (paymentMethod) order.paymentMethod = paymentMethod;
  } else {
    order.paidAt = null;
  }
  await order.save({ transaction });
  return remaining;
}

export const getSupplierPayablesWorkbench = async (req, res) => {
  try {
    const token = getHeaderToken(req);
    await verifyJWT(token);
    await ensureSupplierPayablesSchema();

    const [suppliers, orders, payments] = await Promise.all([
      Supplier.findAll({
        attributes: ["id", "name", "phone", "email"],
        order: [["name", "ASC"]],
      }),
      SupplierOrder.findAll({
        where: { status: { [Op.ne]: "cancelado" } },
        include: orderIncludes,
        order: [["date", "DESC"]],
      }),
      SupplierOrderPayment.findAll({
        attributes: [
          "id",
          "supplierOrderId",
          "supplierId",
          "date",
          "amount",
          "method",
          "note",
          "status",
          "expenseId",
          "createdAt",
        ],
        order: [["date", "DESC"]],
      }),
    ]);

    const paidByOrderId = new Map();
    for (const p of payments) {
      if (p.status !== "completed") continue;
      const oid = Number(p.supplierOrderId);
      paidByOrderId.set(oid, round2((paidByOrderId.get(oid) || 0) + toNum(p.amount)));
    }

    const outOrders = orders.map((o) => {
      const items = o.ERP_supplier_order_items || [];
      const total = orderTotal(items);
      let paid = toNum(paidByOrderId.get(Number(o.id)) || 0);
      // Pedidos marcados pagados a la antigua (sin abonos): tratar como liquidados
      if (o.paidAt && paid <= 0 && total > 0) paid = total;
      const remaining = o.paidAt && paid >= total - 0.009
        ? 0
        : round2(Math.max(0, total - paid));

      return {
        id: o.id,
        supplierId: o.supplierId,
        date: isoDateOnly(o.date) || isoDateOnly(o.createdAt),
        notes: o.notes || "",
        status: o.status,
        receivedAt: o.receivedAt ? isoDateOnly(o.receivedAt) : null,
        paidAt: o.paidAt ? isoDateOnly(o.paidAt) : null,
        paymentMethod: o.paymentMethod || null,
        totalAmount: total,
        paidAmount: paid,
        remainingAmount: remaining,
        items: items.map((it) => ({
          id: it.id,
          productId: it.productId,
          product: it.ERP_inventory_product?.name || "(sin nombre)",
          quantity: toNum(it.quantity),
          unitPrice: toNum(it.unitPrice),
          taxRate: toNum(it.taxRate),
          lineTotal: round2(
            toNum(it.quantity) * toNum(it.unitPrice) * (1 + toNum(it.taxRate) / 100)
          ),
        })),
      };
    });

    const debtBySupplier = new Map();
    for (const o of outOrders) {
      if (o.remainingAmount <= 0) continue;
      debtBySupplier.set(
        o.supplierId,
        round2((debtBySupplier.get(o.supplierId) || 0) + o.remainingAmount)
      );
    }

    const outSuppliers = suppliers
      .map((s) => ({
        id: s.id,
        name: s.name,
        phone: s.phone ?? null,
        email: s.email ?? null,
        debtTotal: toNum(debtBySupplier.get(s.id) || 0),
      }))
      .sort((a, b) => {
        const diff = b.debtTotal - a.debtTotal;
        if (diff !== 0) return diff;
        return String(a.name || "").localeCompare(String(b.name || ""), "es");
      });

    const outPayments = payments.map((p) => ({
      id: p.id,
      supplierOrderId: p.supplierOrderId,
      supplierId: p.supplierId,
      date: isoDateOnly(p.date) || isoDateOnly(p.createdAt),
      amount: round2(p.amount),
      method: p.method || "efectivo",
      note: p.note || "",
      status: p.status,
      expenseId: p.expenseId,
    }));

    return res.json({
      suppliers: outSuppliers,
      orders: outOrders,
      payments: outPayments,
    });
  } catch (error) {
    console.error("getSupplierPayablesWorkbench:", error);
    return res.status(500).json({
      message: "Error cargando cuentas por pagar",
      error: String(error?.message || error),
    });
  }
};

export const paySupplierOrder = async (req, res) => {
  try {
    const token = getHeaderToken(req);
    const user = await verifyJWT(token);
    await ensureSupplierPayablesSchema();

    const orderId = Number(req.params.orderId);
    const amount = round2(req.body?.amount);
    const method = String(req.body?.method || "efectivo").trim() || "efectivo";
    const note = req.body?.note != null ? String(req.body.note).trim() : "Abono a proveedor";
    const payDate = req.body?.date ? toAppDateTime(req.body.date) : nowApp();

    if (!Number.isFinite(orderId) || orderId <= 0) {
      return res.status(400).json({ message: "Pedido inválido" });
    }
    if (!(amount > 0)) {
      return res.status(400).json({ message: "El monto del abono debe ser mayor a 0" });
    }

    const result = await sequelize.transaction(async (t) => {
      const order = await SupplierOrder.findByPk(orderId, {
        include: orderIncludes,
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!order) {
        return { status: 404, body: { message: "Pedido no encontrado" } };
      }
      if (order.status === "cancelado") {
        return { status: 400, body: { message: "El pedido está cancelado" } };
      }

      const total = orderTotal(order.ERP_supplier_order_items || []);
      let paid = await paidSumForOrder(orderId, t);
      if (order.paidAt && paid <= 0 && total > 0) {
        return { status: 400, body: { message: "El pedido ya está marcado como pagado" } };
      }

      const remaining = round2(Math.max(0, total - paid));
      if (remaining <= 0.009) {
        return { status: 400, body: { message: "Este pedido ya no tiene saldo pendiente" } };
      }
      if (amount > remaining + 0.009) {
        return {
          status: 400,
          body: {
            message: `El abono ($${amount.toFixed(2)}) supera el saldo ($${remaining.toFixed(2)})`,
          },
        };
      }

      const supplierName = order.ERP_supplier?.name || "Proveedor";
      const expense = await Expense.create(
        {
          date: payDate,
          amount,
          concept: `Abono pedido proveedor #${order.id} — ${supplierName}`,
          category: "Compras",
          referenceType: "supplier_order_abono",
          referenceId: order.id,
          counterpartyName: supplierName,
          createdBy: user.accountId,
          status: "paid",
        },
        { transaction: t }
      );

      const payment = await SupplierOrderPayment.create(
        {
          supplierOrderId: order.id,
          supplierId: order.supplierId,
          date: payDate,
          amount,
          method,
          note: note || `Abono pedido #${order.id}`,
          status: "completed",
          expenseId: expense.id,
          createdBy: user.accountId,
        },
        { transaction: t }
      );

      const newPaid = round2(paid + amount);
      const newRemaining = await syncOrderPaidFlag(
        order,
        total,
        newPaid,
        method,
        payDate,
        t
      );
      if (newRemaining <= 0.009) {
        order.financeExpenseId = expense.id;
        await order.save({ transaction: t });
      }

      return {
        status: 200,
        body: {
          paymentId: payment.id,
          orderId: order.id,
          amount,
          paidAmount: newPaid,
          remainingAmount: newRemaining,
          fullyPaid: newRemaining <= 0.009,
        },
      };
    });

    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error("paySupplierOrder:", error);
    return res.status(500).json({
      message: "Error registrando abono a proveedor",
      error: String(error?.message || error),
    });
  }
};

export const updateSupplierOrderPayment = async (req, res) => {
  try {
    const token = getHeaderToken(req);
    await verifyJWT(token);
    await ensureSupplierPayablesSchema();

    const paymentId = Number(req.params.paymentId);
    if (!Number.isFinite(paymentId)) {
      return res.status(400).json({ message: "Pago inválido" });
    }

    const result = await sequelize.transaction(async (t) => {
      const payment = await SupplierOrderPayment.findByPk(paymentId, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!payment) return { status: 404, body: { message: "Abono no encontrado" } };

      const order = await SupplierOrder.findByPk(payment.supplierOrderId, {
        include: orderIncludes,
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!order) return { status: 404, body: { message: "Pedido no encontrado" } };

      const total = orderTotal(order.ERP_supplier_order_items || []);
      const othersPaid = round2(
        (await paidSumForOrder(order.id, t)) -
          (payment.status === "completed" ? toNum(payment.amount) : 0)
      );

      if (req.body?.amount != null) {
        const amount = round2(req.body.amount);
        if (!(amount > 0)) {
          return { status: 400, body: { message: "Monto inválido" } };
        }
        const remainingCap = round2(Math.max(0, total - othersPaid));
        if (amount > remainingCap + 0.009) {
          return {
            status: 400,
            body: { message: `El monto supera el saldo permitido ($${remainingCap.toFixed(2)})` },
          };
        }
        payment.amount = amount;
      }
      if (req.body?.date) payment.date = toAppDateTime(req.body.date);
      if (req.body?.method != null) payment.method = String(req.body.method).trim() || payment.method;
      if (req.body?.note != null) payment.note = String(req.body.note);
      if (req.body?.status === "completed" || req.body?.status === "cancelled") {
        payment.status = req.body.status;
      }
      await payment.save({ transaction: t });

      if (payment.expenseId) {
        const expense = await Expense.findByPk(payment.expenseId, { transaction: t });
        if (expense) {
          expense.amount = payment.amount;
          expense.date = payment.date;
          if (payment.status === "cancelled") expense.status = "pending";
          else expense.status = "paid";
          await expense.save({ transaction: t });
        }
      }

      const paid = await paidSumForOrder(order.id, t);
      await syncOrderPaidFlag(order, total, paid, payment.method, payment.date, t);

      return { status: 200, body: { ok: true, paymentId: payment.id } };
    });

    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error("updateSupplierOrderPayment:", error);
    return res.status(500).json({ message: "Error actualizando abono" });
  }
};

export const deleteSupplierOrderPayment = async (req, res) => {
  try {
    const token = getHeaderToken(req);
    await verifyJWT(token);
    await ensureSupplierPayablesSchema();

    const paymentId = Number(req.params.paymentId);
    if (!Number.isFinite(paymentId)) {
      return res.status(400).json({ message: "Pago inválido" });
    }

    const result = await sequelize.transaction(async (t) => {
      const payment = await SupplierOrderPayment.findByPk(paymentId, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!payment) return { status: 404, body: { message: "Abono no encontrado" } };

      const order = await SupplierOrder.findByPk(payment.supplierOrderId, {
        include: orderIncludes,
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      const expenseId = payment.expenseId;
      await payment.destroy({ transaction: t });
      if (expenseId) {
        await Expense.destroy({ where: { id: expenseId }, transaction: t });
      }

      if (order) {
        const total = orderTotal(order.ERP_supplier_order_items || []);
        const paid = await paidSumForOrder(order.id, t);
        await syncOrderPaidFlag(order, total, paid, null, null, t);
        if (order.financeExpenseId === expenseId) {
          order.financeExpenseId = null;
          await order.save({ transaction: t });
        }
      }

      return { status: 200, body: { ok: true } };
    });

    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error("deleteSupplierOrderPayment:", error);
    return res.status(500).json({ message: "Error eliminando abono" });
  }
};
