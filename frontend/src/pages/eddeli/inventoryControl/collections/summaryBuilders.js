import { getBillableQty, toNum, todayISO } from "./helpers.js";
import { parse, isValid } from "date-fns";
import { es } from "date-fns/locale";

const pendingItemsOf = (customerItems) =>
  (customerItems || []).filter((it) => !it.paidAt);

export const isoInRange = (isoDate, start, end) => {
  if (!isoDate || !start || !end) return false;
  return isoDate >= start && isoDate <= end;
};

/** Convierte fecha de pedido (dd/MM/yyyy… o ISO) a yyyy-MM-dd para comparar con periodo. */
export function orderDateToIsoYYYYMMDD(dateStr) {
  if (dateStr == null || dateStr === "") return null;
  if (typeof dateStr !== "string") {
    const d = new Date(dateStr);
    return isValid(d) ? d.toISOString().slice(0, 10) : null;
  }
  const s = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  if (s.includes("/")) {
    const datePart = s.split(/\s+/)[0];
    const d = parse(datePart, "dd/MM/yyyy", new Date(), { locale: es });
    return isValid(d) ? d.toISOString().slice(0, 10) : null;
  }
  const d = new Date(s);
  return isValid(d) ? d.toISOString().slice(0, 10) : null;
}

/** Clave estable por fila de gasto (inclusiones en presupuesto). */
export function expenseBudgetRowKey(e, index) {
  if (e != null && e.id != null && e.id !== "") return `id:${e.id}`;
  const d =
    typeof e.date === "string"
      ? e.date.slice(0, 10)
      : e.date
        ? new Date(e.date).toISOString().slice(0, 10)
        : "";
  return `row:${index}:${d}:${String(e.concept ?? "")}:${toNum(e.amount)}`;
}

export const isFinanceRowIncluded = (map, key) => map[key] !== false;

/** Lunes de la semana ISO (fecha local) */
export const weekStartISO = (ref = new Date()) => {
  const d = new Date(ref);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
};

export const getPeriodBounds = (mode, customStart, customEnd) => {
  const today = todayISO();
  if (mode === "day") return { start: today, end: today, label: `Hoy (${today})` };
  if (mode === "week") {
    const start = weekStartISO();
    return { start, end: today, label: `Semana ${start} → ${today}` };
  }
  const start = customStart || today;
  const end = customEnd || today;
  return { start, end: end >= start ? end : start, label: `${start} → ${end}` };
};

export function buildPendingByProduct(customerItems) {
  const pendingItems = pendingItemsOf(customerItems);
  /** Una fila por combinación (nombre producto, precio unitario). */
  const byProductPrice = new Map();
  let grandTotal = 0;
  let grandQty = 0;

  for (const it of pendingItems) {
    const qty = getBillableQty(it);
    const price = toNum(it.price, 0);
    const total = Number((qty * price).toFixed(2));
    if (qty <= 0) continue;
    grandTotal = Number((grandTotal + total).toFixed(2));
    grandQty = Number((grandQty + qty).toFixed(2));
    const product = String(it.product || "(sin nombre)");
    const priceKey = String(price);
    const mapKey = `${product}\0${priceKey}`;
    if (!byProductPrice.has(mapKey)) {
      byProductPrice.set(mapKey, {
        product,
        unitPrice: price,
        qty: 0,
        total: 0,
      });
    }
    const agg = byProductPrice.get(mapKey);
    agg.qty = Number((agg.qty + qty).toFixed(2));
    agg.total = Number((agg.total + total).toFixed(2));
  }

  const rows = Array.from(byProductPrice.values()).sort((a, b) => {
    const byName = String(a.product).localeCompare(String(b.product), "es");
    if (byName !== 0) return byName;
    return a.unitPrice - b.unitPrice;
  });

  return {
    rows,
    grandTotal,
    grandQty,
  };
}

export function buildPendingByDate(customerItems) {
  const pendingItems = pendingItemsOf(customerItems);
  const byDate = new Map();

  for (const it of pendingItems) {
    const qty = getBillableQty(it);
    if (qty <= 0) continue;
    const price = toNum(it.price, 0);
    const lineTotal = Number((qty * price).toFixed(2));
    const dateKey = it.orderDate || "—";

    if (!byDate.has(dateKey)) {
      byDate.set(dateKey, { date: dateKey, products: [], qty: 0, total: 0 });
    }
    const day = byDate.get(dateKey);
    day.products.push({
      product: it.product || "(sin nombre)",
      qty,
      unitPrice: price,
      total: lineTotal,
      orderId: it.orderId,
    });
    day.qty = Number((day.qty + qty).toFixed(2));
    day.total = Number((day.total + lineTotal).toFixed(2));
  }

  const rows = Array.from(byDate.values())
    .map((d) => ({
      ...d,
      products: d.products.sort((a, b) => b.total - a.total),
    }))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));

  const grandTotal = Number(rows.reduce((s, r) => s + r.total, 0).toFixed(2));
  return { rows, grandTotal };
}

export function buildPeriodFinance({
  customerItems,
  customerPayments,
  allExpenses,
  periodStart,
  periodEnd,
}) {
  const salesByProduct = new Map();
  let salesTotal = 0;
  let salesQty = 0;

  for (const it of customerItems || []) {
    const orderDate = orderDateToIsoYYYYMMDD(it.orderDate) ?? it.orderDate?.slice?.(0, 10);
    if (!isoInRange(orderDate, periodStart, periodEnd)) continue;
    const qty = getBillableQty(it);
    if (qty <= 0) continue;
    const price = toNum(it.price, 0);
    const line = Number((qty * price).toFixed(2));
    salesTotal = Number((salesTotal + line).toFixed(2));
    salesQty = Number((salesQty + qty).toFixed(2));
    const key = String(it.product || "(sin nombre)");
    if (!salesByProduct.has(key)) {
      salesByProduct.set(key, { product: key, qty: 0, total: 0 });
    }
    const row = salesByProduct.get(key);
    row.qty = Number((row.qty + qty).toFixed(2));
    row.total = Number((row.total + line).toFixed(2));
  }

  const paymentsInPeriod = (customerPayments || []).filter(
    (p) => p.status === "completed" && isoInRange(p.date, periodStart, periodEnd)
  );
  const collectedTotal = Number(
    paymentsInPeriod.reduce((s, p) => s + toNum(p.amount), 0).toFixed(2)
  );

  const expensesInPeriod = (allExpenses || []).filter((e) =>
    isoInRange(
      typeof e.date === "string"
        ? e.date.slice(0, 10)
        : e.date
        ? new Date(e.date).toISOString().slice(0, 10)
        : null,
      periodStart,
      periodEnd
    )
  );
  const expensesTotal = Number(
    expensesInPeriod.reduce((s, e) => s + toNum(e.amount), 0).toFixed(2)
  );

  const profitEstimate = Number((salesTotal - expensesTotal).toFixed(2));

  return {
    salesRows: Array.from(salesByProduct.values()).sort((a, b) => b.total - a.total),
    salesTotal,
    salesQty,
    collectedTotal,
    paymentsInPeriod,
    expensesInPeriod,
    expensesTotal,
    profitEstimate,
  };
}

/**
 * Ventas por producto + gastos en un rango, **todos los pedidos** (no filtra por cliente).
 * Fechas de pedido: mismo criterio que cobranzas (`orderDateToIsoYYYYMMDD`).
 */
export function buildGlobalPeriodFinance({ orders, allExpenses, periodStart, periodEnd }) {
  const salesByProduct = new Map();
  let salesTotal = 0;
  let salesQty = 0;

  for (const o of orders || []) {
    const orderDate = orderDateToIsoYYYYMMDD(o.date);
    if (!isoInRange(orderDate, periodStart, periodEnd)) continue;
    const items = o.ERP_order_items || [];
    for (const it of items) {
      const qty = getBillableQty(it);
      if (qty <= 0) continue;
      const price = toNum(it.price, 0);
      const line = Number((qty * price).toFixed(2));
      salesTotal = Number((salesTotal + line).toFixed(2));
      salesQty = Number((salesQty + qty).toFixed(2));
      const key = String(
        it.ERP_inventory_product?.name?.trim() ||
          it.productName ||
          it.name ||
          "(sin nombre)"
      );
      if (!salesByProduct.has(key)) {
        salesByProduct.set(key, { product: key, qty: 0, total: 0 });
      }
      const row = salesByProduct.get(key);
      row.qty = Number((row.qty + qty).toFixed(2));
      row.total = Number((row.total + line).toFixed(2));
    }
  }

  const expensesInPeriod = (allExpenses || []).filter((e) =>
    isoInRange(
      typeof e.date === "string"
        ? e.date.slice(0, 10)
        : e.date
          ? new Date(e.date).toISOString().slice(0, 10)
          : null,
      periodStart,
      periodEnd
    )
  );
  const expensesTotal = Number(
    expensesInPeriod.reduce((s, e) => s + toNum(e.amount), 0).toFixed(2)
  );

  const profitEstimate = Number((salesTotal - expensesTotal).toFixed(2));

  return {
    salesRows: Array.from(salesByProduct.values()).sort((a, b) => b.total - a.total),
    salesTotal,
    salesQty,
    expensesInPeriod,
    expensesTotal,
    profitEstimate,
  };
}
