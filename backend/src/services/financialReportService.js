import { Op, fn, col, literal } from "sequelize";
import { Order, OrderItem, Customer } from "../models/Orders.js";
import {
  InventoryProduct,
  InventoryCategory,
  Store,
} from "../models/Inventory.js";
import { StoreStock } from "../models/StoreStock.js";
import {
  ItemGroup,
  ItemGroupItem,
  Payment,
} from "../models/Finance.js";
import { buildFinanceDateColumnWhere } from "../utils/financeDateUtils.js";
import { storeHoldsInventory } from "./storeStockService.js";
import { CashShift } from "../models/CashShift.js";

export function parseStoreIdsList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((id) => Number(id)).filter(Boolean);
  return String(value)
    .split(",")
    .map((s) => Number(s.trim()))
    .filter(Boolean);
}

export function resolveOrderItemStoreId(item) {
  const delivered =
    item?.deliveredStoreId != null ? Number(item.deliveredStoreId) : null;
  const shiftStore =
    item?.ERP_order?.shift?.storeId != null
      ? Number(item.ERP_order.shift.storeId)
      : item?.ERP_order?.shift?.store?.id != null
        ? Number(item.ERP_order.shift.store.id)
        : null;
  return delivered || shiftStore || null;
}

export function itemMatchesStoreIds(item, storeIds) {
  if (!storeIds?.length) return true;
  const storeId = resolveOrderItemStoreId(item);
  return storeId != null && storeIds.includes(storeId);
}

const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const round2 = (n) => Number(toNum(n).toFixed(2));

const billableLineTotal = (it) => {
  const qty = toNum(it.quantity);
  const billable = Math.max(0, qty - toNum(it.damagedQty) - toNum(it.giftQty));
  return round2(billable * toNum(it.price));
};

function productUnitValue(product) {
  if (!product) return 0;
  const cost = toNum(product.supplierPrice);
  const price = toNum(product.price);
  return cost > 0 ? cost : price;
}

/**
 * Por cobrar de pedidos cuya fecha cae en el rango (o todo si no hay fechas).
 * storeIds: si se indica, solo ítems ligados a esos locales (entrega o turno caja).
 */
export async function computePeriodReceivables({ startDate, endDate, storeIds } = {}) {
  const filterStoreIds = parseStoreIdsList(storeIds);
  const orderDateWhere = buildFinanceDateColumnWhere(startDate, endDate);
  const orderRows = await Order.findAll({
    where: orderDateWhere || {},
    attributes: ["id"],
    raw: true,
  });
  const orderIds = orderRows.map((o) => Number(o.id)).filter(Boolean);
  if (orderDateWhere && !orderIds.length) {
    return {
      total: 0,
      soldTotal: 0,
      collectedTotal: 0,
      byCustomer: [],
    };
  }

  const orderIdFilter = orderIds.length ? { orderId: { [Op.in]: orderIds } } : {};

  const [groupLinks, openGroups, completedPayments, allItems] = await Promise.all([
    ItemGroupItem.findAll({ attributes: ["groupId", "orderItemId"], raw: true }),
    ItemGroup.findAll({ where: { status: "open" }, attributes: ["id"], raw: true }),
    Payment.findAll({
      where: { status: "completed" },
      attributes: ["groupId", "amount"],
      raw: true,
    }),
    OrderItem.findAll({
      where: orderIdFilter,
      attributes: [
        "id",
        "orderId",
        "price",
        "quantity",
        "damagedQty",
        "giftQty",
        "paidAt",
        "deliveredStoreId",
      ],
      include: [
        {
          model: Order,
          as: "ERP_order",
          attributes: ["id", "customerId", "shiftId"],
          include: [
            { model: Customer, as: "ERP_customer", attributes: ["id", "name"] },
            {
              model: CashShift,
              as: "shift",
              attributes: ["id", "storeId"],
              required: false,
            },
          ],
        },
      ],
    }),
  ]);

  const allItemsFiltered = filterStoreIds.length
    ? allItems.filter((it) => itemMatchesStoreIds(it, filterStoreIds))
    : allItems;

  const groupedItemIds = new Set(groupLinks.map((x) => x.orderItemId));
  const openGroupIdSet = new Set(openGroups.map((g) => g.id));
  const itemsByOpenGroupId = new Map();
  for (const link of groupLinks) {
    if (!openGroupIdSet.has(link.groupId)) continue;
    if (!itemsByOpenGroupId.has(link.groupId)) itemsByOpenGroupId.set(link.groupId, []);
    itemsByOpenGroupId.get(link.groupId).push(link.orderItemId);
  }

  const paidByGroupId = new Map();
  for (const p of completedPayments) {
    const gid = p.groupId;
    paidByGroupId.set(gid, round2((paidByGroupId.get(gid) || 0) + toNum(p.amount)));
  }

  const itemById = new Map(allItemsFiltered.map((it) => [it.id, it]));
  const customerDebt = new Map();

  const addDebt = (customerId, customerName, amount) => {
    if (amount <= 0) return;
    const key = customerId || customerName || "sin-cliente";
    const prev = customerDebt.get(key) || {
      customerId: customerId || null,
      customerName: customerName || "Sin cliente",
      amount: 0,
    };
    prev.amount = round2(prev.amount + amount);
    customerDebt.set(key, prev);
  };

  let groupRemainingTotal = 0;
  for (const [groupId, itemIds] of itemsByOpenGroupId) {
    const periodItemIds = itemIds.filter((id) => itemById.has(id));
    if (!periodItemIds.length) continue;
    const totalCalc = periodItemIds.reduce(
      (sum, id) => sum + billableLineTotal(itemById.get(id)),
      0,
    );
    const paid = paidByGroupId.get(groupId) || 0;
    const remaining = Math.max(0, round2(totalCalc - paid));
    groupRemainingTotal += remaining;
    if (remaining > 0) {
      const first = itemById.get(periodItemIds[0]);
      const cust = first?.ERP_order?.ERP_customer;
      addDebt(cust?.id, cust?.name, remaining);
    }
  }

  let soldTotal = 0;
  let collectedTotal = 0;
  let ungroupedRemaining = 0;

  for (const it of allItemsFiltered) {
    const line = billableLineTotal(it);
    soldTotal += line;
    if (it.paidAt) {
      collectedTotal += line;
      continue;
    }
    if (groupedItemIds.has(it.id)) continue;
    ungroupedRemaining += line;
    const cust = it.ERP_order?.ERP_customer;
    addDebt(cust?.id, cust?.name, line);
  }

  soldTotal = round2(soldTotal);
  collectedTotal = round2(collectedTotal);
  const total = round2(groupRemainingTotal + ungroupedRemaining);

  const byCustomer = [...customerDebt.values()]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 15);

  return {
    total,
    soldTotal,
    collectedTotal,
    byCustomer,
  };
}

/**
 * Valor del inventario en locales propios (sucursal operativa).
 */
export async function computeStoreInventorySnapshot({
  locationKinds = ["propia"],
  storeIds,
} = {}) {
  const explicitStoreIds = parseStoreIdsList(storeIds);
  let stores;

  if (explicitStoreIds.length) {
    stores = await Store.findAll({
      where: { id: { [Op.in]: explicitStoreIds }, isActive: true },
      attributes: ["id", "name", "locationKind"],
      order: [["id", "ASC"]],
    });
  } else {
    stores = await Store.findAll({
      where: { isActive: true, locationKind: { [Op.in]: locationKinds } },
      attributes: ["id", "name", "locationKind"],
      order: [["id", "ASC"]],
    });
  }

  const targetStoreIds = stores
    .filter((s) => storeHoldsInventory(s.locationKind))
    .map((s) => s.id);

  if (!targetStoreIds.length) {
    return {
      stores: [],
      productCount: 0,
      totalUnits: 0,
      valueAtCost: 0,
      valueAtSale: 0,
      topProducts: [],
    };
  }

  const rows = await StoreStock.findAll({
    where: {
      storeId: { [Op.in]: targetStoreIds },
      quantity: { [Op.gt]: 0 },
    },
    include: [
      {
        model: InventoryProduct,
        as: "product",
        attributes: ["id", "name", "price", "supplierPrice"],
        include: [
          {
            model: InventoryCategory,
            attributes: ["name"],
            required: false,
          },
        ],
      },
      { model: Store, as: "store", attributes: ["id", "name"] },
    ],
  });

  let productCount = 0;
  let totalUnits = 0;
  let valueAtCost = 0;
  let valueAtSale = 0;
  const productMap = new Map();

  for (const row of rows) {
    const qty = toNum(row.quantity);
    if (qty <= 0) continue;
    productCount += 1;
    totalUnits += qty;
    const unitCost = productUnitValue(row.product);
    const unitSale = toNum(row.product?.price) || unitCost;
    valueAtCost += qty * unitCost;
    valueAtSale += qty * unitSale;

    const pid = row.productId;
    const prev = productMap.get(pid) || {
      productId: pid,
      name: row.product?.name || `Producto #${pid}`,
      category: row.product?.ERP_inventory_categories?.name || null,
      storeName: row.store?.name || null,
      quantity: 0,
      valueAtCost: 0,
      valueAtSale: 0,
    };
    prev.quantity = round2(prev.quantity + qty);
    prev.valueAtCost = round2(prev.valueAtCost + qty * unitCost);
    prev.valueAtSale = round2(prev.valueAtSale + qty * unitSale);
    productMap.set(pid, prev);
  }

  const topProducts = [...productMap.values()]
    .sort((a, b) => b.valueAtCost - a.valueAtCost)
    .slice(0, 20);

  return {
    stores: stores.map((s) => ({ id: s.id, name: s.name, locationKind: s.locationKind })),
    productCount,
    totalUnits: round2(totalUnits),
    valueAtCost: round2(valueAtCost),
    valueAtSale: round2(valueAtSale),
    topProducts,
  };
}
