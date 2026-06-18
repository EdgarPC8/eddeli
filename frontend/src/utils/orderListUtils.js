import { format, startOfMonth, endOfMonth, subMonths, parse } from "date-fns";

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

export function removeOrderFromList(orders, orderId, orderKind = "customer") {
  const key = orderKind === "supplier" ? `s:${orderId}` : `c:${orderId}`;
  return orders.filter((order) => orderListKey(order) !== key);
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

/** Clave única mezclando pedidos cliente y proveedor (mismo id numérico en tablas distintas). */
export function orderListKey(order) {
  return order?.orderKind === "supplier" ? `s:${order.id}` : `c:${order.id}`;
}

/** Une pedidos por id (recargas parciales sin duplicar). */
export function mergeOrdersById(existing, incoming) {
  const map = new Map((existing || []).map((o) => [orderListKey(o), o]));
  for (const o of incoming || []) map.set(orderListKey(o), o);
  return Array.from(map.values()).sort((a, b) => {
    const ta = parseOrderDateMs(a);
    const tb = parseOrderDateMs(b);
    if (tb !== ta) return tb - ta;
    return (b.id || 0) - (a.id || 0);
  });
}

function parseOrderDateMs(order) {
  if (!order?.date) return 0;
  try {
    return parse(order.date, "dd/MM/yyyy HH:mm:ss", new Date()).getTime();
  } catch {
    return 0;
  }
}