import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";

/** Formato de fechas igual que getAllOrders en el backend. */
export function formatOrderTimestamp(value) {
  if (!value) return null;
  try {
    return format(new Date(value), "dd/MM/yyyy HH:mm:ss");
  } catch {
    return null;
  }
}

/** Campos de ítem listos para pintar en la tabla (paidAt, deliveredAt, etc.). */
export function formatOrderItemFromApi(item) {
  if (!item) return {};
  return {
    paidAt: formatOrderTimestamp(item.paidAt),
    deliveredAt: formatOrderTimestamp(item.deliveredAt),
    quantity: item.quantity,
    price: item.price,
    soldQty: item.soldQty,
  };
}

export function patchOrderItemInList(orders, orderId, itemId, fields) {
  return orders.map((order) => {
    if (order.id !== orderId) return order;
    return {
      ...order,
      ERP_order_items: order.ERP_order_items.map((it) =>
        it.id === itemId ? { ...it, ...fields } : it
      ),
    };
  });
}

export function removeOrderFromList(orders, orderId) {
  return orders.filter((order) => order.id !== orderId);
}

export function removeOrderItemFromList(orders, orderId, itemId) {
  return orders.map((order) => {
    if (order.id !== orderId) return order;
    return {
      ...order,
      ERP_order_items: order.ERP_order_items.filter((it) => it.id !== itemId),
    };
  });
}

/** Mes visible + 1 mes atrás (para el calendario). */
export function getOrdersFetchRange(visibleMonth) {
  const from = startOfMonth(subMonths(visibleMonth, 1));
  const to = endOfMonth(visibleMonth);
  return { from, to };
}

export function monthCacheKey(date) {
  return format(date, "yyyy-MM");
}

/** Une pedidos por id (recargas parciales sin duplicar). */
export function mergeOrdersById(existing, incoming) {
  const map = new Map((existing || []).map((o) => [o.id, o]));
  for (const o of incoming || []) map.set(o.id, o);
  return Array.from(map.values()).sort((a, b) => b.id - a.id);
}