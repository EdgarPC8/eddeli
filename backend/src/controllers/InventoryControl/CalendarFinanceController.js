import { Customer, Order, OrderItem } from "../../models/Orders.js";
import { Expense, Payment, ItemGroup, ItemGroupItem } from "../../models/Finance.js";
import { InventoryProduct } from "../../models/Inventory.js";
import { Op } from "sequelize";
import {
  startOfMonth,
  endOfMonth,
  startOfDay,
  endOfDay,
  format,
  parseISO,
  isValid as isValidDate,
} from "date-fns";

const CAJA_POS_TAG = "[CAJA_POS]";
const round2 = (n) => Number(Number(n ?? 0).toFixed(2));
const dayKey = (d) => format(d, "yyyy-MM-dd");

function isPosOrder(order) {
  return String(order?.notes || "").includes(CAJA_POS_TAG);
}

function posLineTotal(item) {
  const sold = Number(item.soldQty || 0);
  const qty = sold > 0 ? sold : Number(item.quantity ?? 0);
  return round2(qty * Number(item.price ?? 0));
}

function emptyDayMetrics() {
  return {
    ordersAmount: 0,
    ordersCount: 0,
    deliveredUnits: 0,
    posSalesAmount: 0,
    posSalesCount: 0,
    collectedAmount: 0,
    expensesAmount: 0,
  };
}

function ensureDay(map, key) {
  if (!map[key]) map[key] = emptyDayMetrics();
  return map[key];
}

function parseMonthQuery(req) {
  const year = Number(req.query.year);
  const month = Number(req.query.month);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return null;
  }
  const start = startOfMonth(new Date(year, month - 1, 1));
  const end = endOfMonth(start);
  return {
    start,
    end,
    startStr: format(start, "yyyy-MM-dd"),
    endStr: format(end, "yyyy-MM-dd"),
  };
}

function parseDayQuery(req) {
  const raw = req.query.date;
  if (!raw || !isValidDate(parseISO(String(raw).slice(0, 10)))) return null;
  const d = parseISO(String(raw).slice(0, 10));
  return {
    date: d,
    key: dayKey(d),
    start: startOfDay(d),
    end: endOfDay(d),
    startStr: format(d, "yyyy-MM-dd"),
    endStr: format(d, "yyyy-MM-dd"),
  };
}

async function loadGroupedItemIds() {
  const links = await ItemGroupItem.findAll({ attributes: ["orderItemId"] });
  return new Set(links.map((x) => x.orderItemId));
}

async function loadCustomerAndGroupMaps() {
  const [customers, groups] = await Promise.all([
    Customer.findAll({ attributes: ["id", "name"] }),
    ItemGroup.findAll({ attributes: ["id", "concept"] }),
  ]);
  const customerName = new Map(customers.map((c) => [c.id, c.name]));
  const groupConcept = new Map(groups.map((g) => [g.id, g.concept]));
  return { customerName, groupConcept };
}

function addOrdersToDays(daysMap, orders) {
  for (const o of orders) {
    if (isPosOrder(o)) continue;
    const d = o.date ? new Date(o.date) : null;
    if (!d || Number.isNaN(d.getTime())) continue;
    const key = dayKey(d);
    const bucket = ensureDay(daysMap, key);
    bucket.ordersCount += 1;
    const items = o.ERP_order_items || [];
    for (const it of items) {
      const qty = Number(it.quantity ?? 0);
      const sub = qty * Number(it.price ?? 0);
      bucket.ordersAmount = round2(bucket.ordersAmount + sub);
      if (it.deliveredAt) bucket.deliveredUnits += qty;
    }
  }
}

function addPaymentsToDays(daysMap, payments) {
  for (const p of payments) {
    if (p.status && p.status !== "completed") continue;
    const d = p.date ? parseISO(String(p.date).slice(0, 10)) : null;
    if (!d || Number.isNaN(d.getTime())) continue;
    const key = dayKey(d);
    const bucket = ensureDay(daysMap, key);
    bucket.collectedAmount = round2(bucket.collectedAmount + Number(p.amount ?? 0));
  }
}

function addPosSalesToDays(daysMap, orders) {
  for (const o of orders) {
    if (!isPosOrder(o)) continue;
    const d = o.date ? new Date(o.date) : null;
    if (!d || Number.isNaN(d.getTime())) continue;
    const key = dayKey(d);
    const bucket = ensureDay(daysMap, key);
    bucket.posSalesCount += 1;
    const items = o.ERP_order_items || [];
    for (const it of items) {
      bucket.posSalesAmount = round2(bucket.posSalesAmount + posLineTotal(it));
    }
  }
}

function addDirectPaymentsToDays(daysMap, items, groupedItemIds) {
  for (const it of items) {
    if (!it.paidAt || groupedItemIds.has(it.id)) continue;
    if (isPosOrder(it.ERP_order)) continue;
    const d = new Date(it.paidAt);
    if (Number.isNaN(d.getTime())) continue;
    const key = dayKey(d);
    const bucket = ensureDay(daysMap, key);
    const sub = Number(it.quantity ?? 0) * Number(it.price ?? 0);
    bucket.collectedAmount = round2(bucket.collectedAmount + sub);
  }
}

function addExpensesToDays(daysMap, expenses) {
  for (const e of expenses) {
    const d = e.date ? parseISO(String(e.date).slice(0, 10)) : null;
    if (!d || Number.isNaN(d.getTime())) continue;
    const key = dayKey(d);
    const bucket = ensureDay(daysMap, key);
    bucket.expensesAmount = round2(bucket.expensesAmount + Number(e.amount ?? 0));
  }
}

function sumMonthTotals(daysMap, monthStart, monthEnd) {
  const totals = { orders: 0, posSales: 0, collected: 0, expenses: 0 };
  for (const [key, m] of Object.entries(daysMap)) {
    const d = parseISO(key);
    if (d < monthStart || d > monthEnd) continue;
    totals.orders = round2(totals.orders + m.ordersAmount);
    totals.posSales = round2(totals.posSales + m.posSalesAmount);
    totals.collected = round2(totals.collected + m.collectedAmount);
    totals.expenses = round2(totals.expenses + m.expensesAmount);
  }
  return totals;
}

async function fetchOrdersInRange(start, end) {
  return Order.findAll({
    where: { date: { [Op.between]: [start, end] } },
    include: [
      { model: Customer, as: "ERP_customer", attributes: ["id", "name"] },
      { model: OrderItem, as: "ERP_order_items" },
    ],
    order: [["date", "ASC"]],
  });
}

async function fetchPaymentsInRange(startStr, endStr) {
  return Payment.findAll({
    where: {
      date: { [Op.between]: [startStr, endStr] },
      status: "completed",
    },
    order: [["date", "ASC"]],
  });
}

async function fetchExpensesInRange(startStr, endStr) {
  return Expense.findAll({
    where: { date: { [Op.between]: [startStr, endStr] } },
    include: [
      { model: InventoryProduct, as: "ERP_inventory_product", attributes: ["name"], required: false },
    ],
    order: [["date", "ASC"]],
  });
}

async function fetchDirectPaidItemsInRange(start, end, groupedItemIds) {
  const where = { paidAt: { [Op.between]: [start, end] } };
  if (groupedItemIds.size > 0) {
    where.id = { [Op.notIn]: [...groupedItemIds] };
  }

  return OrderItem.findAll({
    where,
    include: [
      {
        model: Order,
        as: "ERP_order",
        attributes: ["id", "customerId", "date", "notes"],
        include: [{ model: Customer, as: "ERP_customer", attributes: ["id", "name"] }],
      },
    ],
  });
}

function shapeOrderDetail(o) {
  const items = (o.ERP_order_items || []).map((it) => {
    const sold = Number(it.soldQty || 0);
    const qty = sold > 0 ? sold : Number(it.quantity ?? 0);
    const price = Number(it.price ?? 0);
    return {
      id: it.id,
      qty,
      price,
      subtotal: round2(qty * price),
      paidAt: it.paidAt ? format(new Date(it.paidAt), "dd/MM/yyyy HH:mm:ss") : null,
      deliveredAt: it.deliveredAt ? format(new Date(it.deliveredAt), "dd/MM/yyyy HH:mm:ss") : null,
    };
  });
  const total = round2(items.reduce((s, it) => s + it.subtotal, 0));
  return {
    id: o.id,
    customer: o.ERP_customer?.name ?? "Cliente",
    date: o.date ? format(new Date(o.date), "dd/MM/yyyy HH:mm:ss") : null,
    items,
    total,
  };
}

function shapePosSaleDetail(o) {
  const base = shapeOrderDetail(o);
  const docType = o.documentType || "consumidor_final";
  const customerLabel =
    docType === "consumidor_final" ? "Consumidor final" : base.customer;
  return {
    ...base,
    customer: customerLabel,
    paymentMethod: o.paymentMethod || "efectivo",
    documentType: docType,
    status: o.status,
    isCredit: o.status === "pendiente",
  };
}

/**
 * GET /finance/calendar-month?year=2026&month=6
 * Totales por día del mes (ligero, para la grilla del calendario).
 */
export const getCalendarMonthSummary = async (req, res) => {
  try {
    const range = parseMonthQuery(req);
    if (!range) {
      return res.status(400).json({ message: "Parámetros year y month (1-12) requeridos" });
    }

    const groupedItemIds = await loadGroupedItemIds();

    const [orders, payments, expenses, directItems] = await Promise.all([
      fetchOrdersInRange(range.start, range.end),
      fetchPaymentsInRange(range.startStr, range.endStr),
      fetchExpensesInRange(range.startStr, range.endStr),
      fetchDirectPaidItemsInRange(range.start, range.end, groupedItemIds),
    ]);

    const days = {};
    addOrdersToDays(days, orders);
    addPosSalesToDays(days, orders);
    addPaymentsToDays(days, payments);
    addDirectPaymentsToDays(days, directItems, groupedItemIds);
    addExpensesToDays(days, expenses);

    return res.json({
      days,
      totals: sumMonthTotals(days, range.start, range.end),
    });
  } catch (error) {
    console.error("getCalendarMonthSummary:", error);
    return res.status(500).json({ message: "Error al cargar resumen del calendario" });
  }
};

/**
 * GET /finance/calendar-day?date=YYYY-MM-DD
 * Detalle completo de un solo día (modal).
 */
export const getCalendarDayDetail = async (req, res) => {
  try {
    const range = parseDayQuery(req);
    if (!range) {
      return res.status(400).json({ message: "Parámetro date (YYYY-MM-DD) requerido" });
    }

    const [groupedItemIds, maps] = await Promise.all([
      loadGroupedItemIds(),
      loadCustomerAndGroupMaps(),
    ]);

    const [orders, payments, expenses, directItems] = await Promise.all([
      fetchOrdersInRange(range.start, range.end),
      fetchPaymentsInRange(range.startStr, range.endStr),
      fetchExpensesInRange(range.startStr, range.endStr),
      fetchDirectPaidItemsInRange(range.start, range.end, groupedItemIds),
    ]);

    const { customerName, groupConcept } = maps;

    const regularOrders = orders.filter((o) => !isPosOrder(o));
    const posOrders = orders.filter(isPosOrder);
    const shapedOrders = regularOrders.map(shapeOrderDetail);
    const posSales = posOrders.map(shapePosSaleDetail);

    const abonos = payments.map((p) => ({
      id: p.id,
      amount: round2(p.amount),
      customer: customerName.get(p.customerId) || `Cliente #${p.customerId}`,
      group: groupConcept.get(p.groupId) || `Grupo #${p.groupId}`,
      method: p.method,
      note: p.note,
    }));

    const directPayments = directItems.map((it) => {
      const order = it.ERP_order;
      const customer = order?.ERP_customer?.name ?? "Cliente";
      const qty = Number(it.quantity ?? 0);
      const price = Number(it.price ?? 0);
      return {
        orderId: order?.id ?? it.orderId,
        itemId: it.id,
        customer,
        qty,
        price,
        subtotal: round2(qty * price),
        paidAt: it.paidAt ? format(new Date(it.paidAt), "dd/MM/yyyy HH:mm:ss") : null,
      };
    });

    const dayExpenses = expenses.map((e) => ({
      id: e.id,
      concept: e.concept,
      category: e.category,
      productName: e.ERP_inventory_product?.name || null,
      amount: round2(e.amount),
    }));

    const days = {};
    addOrdersToDays(days, orders);
    addPosSalesToDays(days, orders);
    addPaymentsToDays(days, payments);
    addDirectPaymentsToDays(days, directItems, groupedItemIds);
    addExpensesToDays(days, expenses);
    const totals = days[range.key] || emptyDayMetrics();

    return res.json({
      orders: shapedOrders,
      posSales,
      abonos,
      directPayments,
      expenses: dayExpenses,
      totals,
    });
  } catch (error) {
    console.error("getCalendarDayDetail:", error);
    return res.status(500).json({ message: "Error al cargar detalle del día" });
  }
};
