import {
  getBillableQty,
  getItemGroupId,
  sameGroupId,
  sum,
  toNum,
} from "../collections/helpers.js";

/**
 * Calcula el dinero por cobrar alineado con Cobranzas y /finance/summary.
 */
export function buildPendingCollectionsBreakdown({ customers = [], orders = [], groups = [], payments = [] }) {
  const groupIdByItemId = new Map();
  for (const o of orders) {
    const itemsArr = Array.isArray(o.items) ? o.items : [];
    for (const it of itemsArr) {
      const raw = getItemGroupId(it);
      if (raw == null || raw === "__grouped__") continue;
      const gid = Number(raw);
      if (!Number.isFinite(gid)) continue;
      groupIdByItemId.set(it.id, gid);
    }
  }

  const itemsByGroupId = new Map();
  for (const [itemId, groupId] of groupIdByItemId.entries()) {
    if (!itemsByGroupId.has(groupId)) itemsByGroupId.set(groupId, []);
    itemsByGroupId.get(groupId).push(itemId);
  }

  const paidByGroupId = new Map();
  for (const p of payments) {
    if (p.status !== "completed") continue;
    const pg = Number(p.groupId);
    if (!Number.isFinite(pg)) continue;
    paidByGroupId.set(
      pg,
      Number(((paidByGroupId.get(pg) || 0) + toNum(p.amount)).toFixed(2))
    );
  }

  const customerNameById = new Map(customers.map((c) => [c.id, c.name || `Cliente #${c.id}`]));

  const lineTotal = (it) => {
    const qty = getBillableQty({
      ...it,
      qty: it.qty ?? it.quantity ?? 0,
      damagedQty: it.damagedQty ?? 0,
      giftQty: it.giftQty ?? 0,
    });
    return Number((qty * toNum(it.price, 0)).toFixed(2));
  };

  const findItem = (itemId) => {
    for (const o of orders) {
      const itemsArr = Array.isArray(o.items) ? o.items : [];
      for (const it of itemsArr) {
        if (it.id === itemId) {
          return {
            ...it,
            orderId: o.id,
            orderDate: o.date,
            customerId: o.customerId,
            product: it.product ?? it.productName ?? it.name ?? "(sin nombre)",
          };
        }
      }
    }
    return null;
  };

  const byCustomer = new Map();
  const ensureCustomer = (customerId) => {
    if (!byCustomer.has(customerId)) {
      byCustomer.set(customerId, {
        customerId,
        customerName: customerNameById.get(customerId) || `Cliente #${customerId}`,
        ungrouped: 0,
        groups: 0,
        total: 0,
      });
    }
    return byCustomer.get(customerId);
  };

  const openGroups = [];
  let groupsTotal = 0;

  for (const g of groups) {
    if (g.status !== "open") continue;

    const itemIds = itemsByGroupId.get(Number(g.id)) || [];
    let groupTotalCalc = 0;
    const groupItems = [];

    for (const itemId of itemIds) {
      const it = findItem(itemId);
      if (!it) continue;
      const line = lineTotal(it);
      groupTotalCalc = Number((groupTotalCalc + line).toFixed(2));
      groupItems.push({
        id: it.id,
        orderId: it.orderId,
        orderDate: it.orderDate,
        product: it.product,
        lineTotal: line,
      });
    }

    const paid = paidByGroupId.get(Number(g.id)) || 0;
    const remaining = Number(Math.max(0, groupTotalCalc - paid).toFixed(2));
    if (remaining <= 0) continue;

    groupsTotal = Number((groupsTotal + remaining).toFixed(2));
    const row = ensureCustomer(g.customerId);
    row.groups = Number((row.groups + remaining).toFixed(2));
    row.total = Number((row.total + remaining).toFixed(2));

    openGroups.push({
      groupId: g.id,
      concept: g.concept || `Grupo #${g.id}`,
      customerId: g.customerId,
      customerName: customerNameById.get(g.customerId) || `Cliente #${g.customerId}`,
      total: groupTotalCalc,
      paid,
      remaining,
      itemsCount: groupItems.length,
      items: groupItems,
    });
  }

  const ungroupedItems = [];
  let ungroupedTotal = 0;

  for (const o of orders) {
    const itemsArr = Array.isArray(o.items) ? o.items : [];
    for (const it of itemsArr) {
      if (it.paidAt) continue;
      if (getItemGroupId(it)) continue;

      const line = lineTotal(it);
      if (line <= 0) continue;

      ungroupedTotal = Number((ungroupedTotal + line).toFixed(2));
      const row = ensureCustomer(o.customerId);
      row.ungrouped = Number((row.ungrouped + line).toFixed(2));
      row.total = Number((row.total + line).toFixed(2));

      ungroupedItems.push({
        id: it.id,
        orderId: o.id,
        orderDate: o.date,
        customerId: o.customerId,
        customerName: customerNameById.get(o.customerId) || `Cliente #${o.customerId}`,
        product: it.product ?? it.productName ?? it.name ?? "(sin nombre)",
        lineTotal: line,
      });
    }
  }

  for (const c of customers) {
    ensureCustomer(c.id);
  }

  const byCustomerRows = [...byCustomer.values()]
    .filter((r) => r.total > 0)
    .sort((a, b) => b.total - a.total);

  const total = Number((groupsTotal + ungroupedTotal).toFixed(2));

  openGroups.sort((a, b) => b.remaining - a.remaining);
  ungroupedItems.sort((a, b) => b.lineTotal - a.lineTotal);

  return {
    total,
    ungroupedTotal,
    groupsTotal,
    byCustomer: byCustomerRows,
    ungroupedItems,
    openGroups,
  };
}

/**
 * Métricas de deuda por cliente alineadas con Cobranzas.
 * - cobrableBruto: pendiente + abonos en grupos abiertos
 * - abonado: suma de pagos completados en grupos abiertos
 * - debe: saldo real por cobrar (mismo que debtTotal en workbench)
 */
export function buildCustomerDebtMetrics({ customers = [], orders = [], groups = [], payments = [] }) {
  const breakdown = buildPendingCollectionsBreakdown({ customers, orders, groups, payments });
  const byCustomerId = new Map(breakdown.byCustomer.map((r) => [r.customerId, r]));

  const openGroupIds = new Set(
    groups.filter((g) => g.status === "open").map((g) => Number(g.id))
  );

  const abonadoByCustomer = new Map();
  for (const p of payments) {
    if (p.status !== "completed") continue;
    if (!openGroupIds.has(Number(p.groupId))) continue;
    const cid = p.customerId;
    abonadoByCustomer.set(
      cid,
      Number(((abonadoByCustomer.get(cid) || 0) + toNum(p.amount)).toFixed(2))
    );
  }

  const metricsByCustomer = new Map();
  for (const c of customers) {
    const row = byCustomerId.get(c.id) || { ungrouped: 0, groups: 0, total: 0 };
    const abonado = Number((abonadoByCustomer.get(c.id) || 0).toFixed(2));
    const debe = Number(row.total.toFixed(2));
    const cobrableBruto = Number((debe + abonado).toFixed(2));
    metricsByCustomer.set(c.id, {
      customerId: c.id,
      cobrableBruto,
      abonado,
      debe,
      ungroupedPending: Number(row.ungrouped.toFixed(2)),
      groupsPending: Number(row.groups.toFixed(2)),
    });
  }

  return metricsByCustomer;
}

export function groupPaidAmount(payments, groupId) {
  const arr = payments.filter(
    (p) => sameGroupId(p.groupId, groupId) && p.status === "completed"
  );
  return Number(sum(arr, (p) => p.amount).toFixed(2));
}
