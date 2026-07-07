/** Marca en `ERP_orders.notes` para ventas hechas desde el punto de venta. */
export const CAJA_POS_TAG = "[CAJA_POS]";

/** Condición de venta en notas del pedido (contado vs crédito). */
export const SALE_CONTADO_TAG = "[CONTADO]";
export const SALE_CREDITO_TAG = "[CREDITO]";

export function buildCajaOrderNotes({ baseNote, saleType }) {
  const conditionTag = saleType === "credito" ? SALE_CREDITO_TAG : SALE_CONTADO_TAG;
  const text = String(baseNote || "")
    .replace(/\[CAJA_POS\]/g, "")
    .replace(/\[CONTADO\]/g, "")
    .replace(/\[CREDITO\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return `${CAJA_POS_TAG} ${conditionTag} ${text}`.trim();
}

/**
 * Texto a mostrar como cliente: en caja mostrador sin datos de ticket se muestra "Consumidor final".
 */
export function getOrderCustomerDisplay(order) {
  if (!order) return "—";
  const notes = String(order.notes || "");
  const c = order.customer;
  const name = String(c?.name || "").trim();
  if (!notes.includes(CAJA_POS_TAG)) return name || "—";
  const low = notes.toLowerCase();
  if (
    low.includes("mostrador") ||
    low.includes("consumidor final") ||
    low.includes("sin datos de cliente")
  ) {
    return "Consumidor Final";
  }
  return name || "—";
}

export function isCajaPosOrder(order) {
  return String(order?.notes || "").includes(CAJA_POS_TAG);
}

/** Cliente genérico para ventas de mostrador sin datos de factura. */
export function findConsumidorFinalCustomer(customers) {
  return (
    customers.find((c) => {
      const n = String(c.name || "").toLowerCase();
      return n.includes("consumidor") || n.includes("final");
    }) ?? null
  );
}
