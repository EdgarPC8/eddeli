import MoneyOffIcon from "@mui/icons-material/MoneyOff";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { formatDateTime } from "../../../../helpers/functions.js";

export const ORDER_STATUS_TABS = [
  {
    id: "unpaid",
    apiId: "unpaidOrders",
    label: "No pagados",
    subtitle: "Pedidos con ítems sin cobrar",
    color: "error",
    icon: MoneyOffIcon,
  },
  {
    id: "paid_undelivered",
    apiId: "paidUndeliveredOrders",
    label: "Pagados sin entregar",
    subtitle: "Cobrados pero falta entrega",
    color: "info",
    icon: LocalShippingIcon,
  },
  {
    id: "unpaid_undelivered",
    apiId: "unpaidUndeliveredOrders",
    label: "Sin pagar ni entregar",
    subtitle: "Pendientes de cobro y entrega",
    color: "warning",
    icon: HourglassEmptyIcon,
  },
  {
    id: "delivered_unpaid",
    apiId: "deliveredUnpaidOrders",
    label: "Entregados sin pagar",
    subtitle: "Ya entregado, falta el pago",
    color: "warning",
    icon: WarningAmberIcon,
  },
];

const TAB_BY_ID = Object.fromEntries(ORDER_STATUS_TABS.map((t) => [t.id, t]));
const TAB_BY_API_ID = Object.fromEntries(ORDER_STATUS_TABS.map((t) => [t.apiId, t]));

export function getStatusTab(id) {
  return TAB_BY_ID[id] || TAB_BY_API_ID[id] || ORDER_STATUS_TABS[0];
}

export function getOrderItems(order) {
  return Array.isArray(order?.ERP_order_items) ? order.ERP_order_items : [];
}

export function orderFlags(order) {
  const items = getOrderItems(order);
  if (!items.length) {
    return { allPaid: true, allDelivered: true, somePaid: false, someDelivered: false };
  }
  return {
    allPaid: items.every((i) => !!i.paidAt),
    allDelivered: items.every((i) => !!i.deliveredAt),
    somePaid: items.some((i) => !!i.paidAt),
    someDelivered: items.some((i) => !!i.deliveredAt),
  };
}

export function orderMatchesStatus(order, statusId) {
  const { allPaid, allDelivered } = orderFlags(order);
  switch (statusId) {
    case "unpaid":
      return !allPaid;
    case "paid_undelivered":
      return allPaid && !allDelivered;
    case "unpaid_undelivered":
      return !allPaid && !allDelivered;
    case "delivered_unpaid":
      return allDelivered && !allPaid;
    default:
      return false;
  }
}

export function buildOverviewCards(overView = []) {
  const countByApiId = new Map(
    (overView || []).map((row) => [row.id, Number(row.value ?? 0)])
  );
  return ORDER_STATUS_TABS.map((tab) => ({
    ...tab,
    count: countByApiId.get(tab.apiId) ?? 0,
  }));
}

export function parseDisplayDateToInput(display) {
  if (!display) return "";
  const m = String(display).match(
    /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})(?::(\d{2}))?/
  );
  if (!m) return "";
  const [, dd, mm, yyyy, hh, mi, ss] = m;
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

export function formatShortDisplayDate(display) {
  return formatDateTime(display);
}

export function formatShortOrderDate(display) {
  return formatDateTime(display);
}

export function inputToApiDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}
