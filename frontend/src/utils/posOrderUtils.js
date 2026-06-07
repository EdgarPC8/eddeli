/** Marca en `orders.notes` para ventas hechas desde el punto de venta. */
export const CAJA_POS_TAG = "[CAJA_POS]";

export function getOrderCustomerDisplay(order) {
  if (!order) return "—";
  const notes = String(order.notes || "");
  const c = order.customer;
  const parts = [c?.firstName, c?.secondName, c?.firstLastName, c?.secondLastName]
    .map((s) => String(s ?? "").trim())
    .filter(Boolean);
  const name = parts.length ? parts.join(" ") : String(c?.name || "").trim();
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
