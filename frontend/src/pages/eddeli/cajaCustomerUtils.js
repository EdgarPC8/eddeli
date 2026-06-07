export function buildCustomerDisplayName(customer) {
  return String(customer?.name || "").trim() || "—";
}

export function formatCustomerDocument() {
  return "";
}
