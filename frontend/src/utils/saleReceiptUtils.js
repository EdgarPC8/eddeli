import { activeApp } from "../config/appInfo.js";
import { getOrderCustomerDisplay } from "./eddeliPosOrderUtils.js";

const to2 = (n) => Number(Number(n || 0).toFixed(2));

export const DOCUMENT_TYPE_LABELS = {
  factura: "Factura",
  nota_venta: "Nota de venta",
  documento: "Comprobante",
  consumidor_final: "Consumidor final",
};

/** Opciones para cambiar tipo de documento al imprimir (no modifica la venta en BD). */
export const DOCUMENT_TYPE_OPTIONS = [
  { value: "factura", label: "Factura" },
  { value: "nota_venta", label: "Nota de venta" },
  { value: "documento", label: "Comprobante" },
  { value: "consumidor_final", label: "Consumidor final" },
];

export function documentTypeLabel(type) {
  return DOCUMENT_TYPE_LABELS[type] || type || "—";
}

export function documentTitleForType(docType) {
  switch (docType) {
    case "factura":
      return "FACTURA";
    case "nota_venta":
      return "NOTA DE VENTA";
    case "consumidor_final":
      return "CONSUMIDOR FINAL";
    default:
      return "COMPROBANTE DE VENTA";
  }
}

/** Aplica tipo de documento solo para vista previa / impresión. */
export function applyReceiptDocumentType(receipt, documentType) {
  if (!receipt) return null;
  const docType = documentType || receipt.documentType || "documento";
  const raw = receipt._customerRaw || {};

  if (docType === "consumidor_final") {
    return {
      ...receipt,
      documentType: docType,
      documentTypeLabel: documentTypeLabel(docType),
      documentTitle: documentTitleForType(docType),
      customerName: "Consumidor Final",
      customerPhone: "",
      customerAddress: "",
      customerEmail: "",
    };
  }

  const nameFromRaw =
    String(raw.name || "").trim() ||
    (receipt.customerName && receipt.customerName !== "Consumidor Final"
      ? receipt.customerName
      : "") ||
    "—";

  return {
    ...receipt,
    documentType: docType,
    documentTypeLabel: documentTypeLabel(docType),
    documentTitle: documentTitleForType(docType),
    customerName: nameFromRaw,
    customerPhone: raw.phone || receipt.customerPhone || "",
    customerAddress: raw.address || receipt.customerAddress || "",
    customerEmail: raw.email || receipt.customerEmail || "",
  };
}

export function resolveStoredDocumentType(documentType, useCustomerData) {
  if (documentType === "factura") return "factura";
  if (documentType === "nota_venta") return "nota_venta";
  if (useCustomerData) return "documento";
  return "consumidor_final";
}

export function formatMoneyReceipt(n) {
  return `$${to2(n).toFixed(2)}`;
}

export function formatReceiptDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString("es-EC", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function paymentMethodLabel(method) {
  const m = String(method || "").toLowerCase();
  if (m === "efectivo") return "Efectivo";
  if (m === "transferencia") return "Transferencia";
  if (m === "tarjeta") return "Tarjeta";
  if (m === "credito") return "Crédito";
  return method || "—";
}

/** Construye datos de comprobante desde venta POS del API o desde carrito recién cobrado. */
export function normalizeSaleReceipt(sale) {
  if (!sale) return null;
  const items = (sale.items || []).map((row) => ({
    name: row.name || row.productName || "Producto",
    quantity: Number(row.quantity || 0),
    price: to2(row.price),
    lineTotal: to2(row.lineTotal ?? Number(row.quantity) * Number(row.price)),
    taxRate: Number(row.taxRate || 0),
    subtotal: to2(row.subtotal ?? row.lineTotal),
    iva: to2(row.iva || 0),
  }));
  const subtotal = to2(sale.subtotal ?? items.reduce((a, r) => a + r.subtotal, 0));
  const iva = to2(sale.iva ?? items.reduce((a, r) => a + r.iva, 0));
  const total = to2(sale.total ?? items.reduce((a, r) => a + r.lineTotal, 0));
  const customer = sale.customer || {};
  const docType = sale.documentType || "documento";
  const displayFromOrder = getOrderCustomerDisplay({ notes: sale.notes || "", customer });
  const customerNameRaw =
    String(customer.name || "").trim() ||
    (displayFromOrder && displayFromOrder !== "Consumidor Final" ? displayFromOrder : "");

  const customerDisplay =
    docType === "consumidor_final"
      ? "Consumidor Final"
      : customerNameRaw || displayFromOrder || customer.name || "—";

  return {
    id: sale.id,
    businessName: activeApp.alias || "EdDeli",
    businessDescription: activeApp.description || "",
    documentTitle: documentTitleForType(docType),
    documentType: docType,
    documentTypeLabel: documentTypeLabel(docType),
    date: formatReceiptDate(sale.date || sale.paidAt),
    customerName: customerDisplay,
    customerPhone: customer.phone || "",
    customerAddress: customer.address || "",
    customerEmail: customer.email || "",
    _customerRaw: {
      name: customerNameRaw,
      phone: customer.phone || "",
      address: customer.address || "",
      email: customer.email || "",
    },
    paymentMethod: paymentMethodLabel(sale.paymentMethod),
    items,
    subtotal,
    iva,
    total,
    notes: String(sale.notes || "").replace(/\[CAJA_POS\]/g, "").replace(/\[CONTADO\]/g, "").replace(/\[CREDITO\]/g, "").trim(),
  };
}

export function buildReceiptFromCheckout({
  orderId,
  cart,
  customer,
  documentType,
  paymentMethod,
  saleType,
  notes,
}) {
  const items = cart.map((row) => {
    const qty = Number(row.quantity || 0);
    const price = to2(row.price);
    const lineTotal = to2(qty * price);
    const taxRate = Number(row.taxRate || 0);
    let subtotal = lineTotal;
    let iva = 0;
    if (taxRate > 0) {
      subtotal = to2(lineTotal / (1 + taxRate / 100));
      iva = to2(lineTotal - subtotal);
    }
    return {
      name: row.name,
      quantity: qty,
      price,
      taxRate,
      subtotal,
      iva,
      lineTotal,
    };
  });
  const subtotal = items.reduce((a, r) => a + r.subtotal, 0);
  const iva = items.reduce((a, r) => a + r.iva, 0);
  const total = items.reduce((a, r) => a + r.lineTotal, 0);
  const docType = documentType;
  return normalizeSaleReceipt({
    id: orderId,
    date: new Date().toISOString(),
    paidAt: saleType === "credito" ? null : new Date().toISOString(),
    paymentMethod: saleType === "credito" ? "credito" : paymentMethod,
    documentType: docType,
    notes,
    customer,
    items,
    subtotal,
    iva,
    total,
  });
}

export function printSaleReceipt(receipt, format) {
  const root = document.getElementById("sale-receipt-print-root");
  if (!root) return;
  root.innerHTML = buildPrintHtml(receipt, format);
  root.className = format === "ticket80" ? "print-ticket80" : "print-a4";
  window.print();
}

function buildPrintHtml(receipt, format) {
  const isTicket = format === "ticket80";
  const w = isTicket ? "80mm" : "210mm";
  const fs = isTicket ? "11px" : "13px";
  const pad = isTicket ? "6px 4px" : "24px";
  const rows = (receipt.items || [])
    .map(
      (it) =>
        `<tr>
          <td style="padding:2px 0">${escapeHtml(it.name)}</td>
          <td style="text-align:center;padding:2px 4px">${it.quantity}</td>
          <td style="text-align:right;padding:2px 0">${formatMoneyReceipt(it.price)}</td>
          <td style="text-align:right;padding:2px 0">${formatMoneyReceipt(it.lineTotal)}</td>
        </tr>`,
    )
    .join("");

  return `<div style="width:${w};max-width:100%;margin:0 auto;padding:${pad};font-family:Arial,sans-serif;font-size:${fs};color:#000">
    <div style="text-align:center;margin-bottom:${isTicket ? 8 : 16}px">
      <div style="font-weight:700;font-size:${isTicket ? 14 : 20}px;color:#000">${escapeHtml(receipt.businessName)}</div>
      ${receipt.businessDescription ? `<div style="font-weight:700;font-size:${isTicket ? 10 : 12}px;color:#000;margin-top:4px">${escapeHtml(receipt.businessDescription)}</div>` : ""}
      <div style="font-weight:700;margin-top:${isTicket ? 8 : 12}px;font-size:${isTicket ? 12 : 16}px;color:#000">${escapeHtml(receipt.documentTitle)}</div>
      <div style="font-weight:700;font-size:${isTicket ? 10 : 12}px;color:#000;margin-top:4px">N° ${receipt.id || "—"} · ${escapeHtml(receipt.date)}</div>
    </div>
    <div style="margin-bottom:${isTicket ? 6 : 12}px;font-size:${isTicket ? 10 : 12}px;color:#000">
      <div><strong>Cliente:</strong> ${escapeHtml(receipt.customerName)}</div>
      ${receipt.customerPhone ? `<div><strong>Tel:</strong> ${escapeHtml(receipt.customerPhone)}</div>` : ""}
      ${receipt.customerAddress ? `<div><strong>Dir:</strong> ${escapeHtml(receipt.customerAddress)}</div>` : ""}
      <div><strong>Pago:</strong> ${escapeHtml(receipt.paymentMethod)}</div>
    </div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:${isTicket ? 6 : 12}px;color:#000">
      <thead>
        <tr style="border-bottom:1px solid #ccc">
          <th style="text-align:left;padding:2px 0;font-weight:700;color:#000">Producto</th>
          <th style="text-align:center;padding:2px 4px;font-weight:700;color:#000">Cant</th>
          <th style="text-align:right;padding:2px 0;font-weight:700;color:#000">P.U.</th>
          <th style="text-align:right;padding:2px 0;font-weight:700;color:#000">Total</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div style="border-top:1px dashed #999;padding-top:${isTicket ? 6 : 10}px;color:#000">
      <div style="display:flex;justify-content:space-between"><span>Subtotal</span><span>${formatMoneyReceipt(receipt.subtotal)}</span></div>
      ${receipt.iva > 0 ? `<div style="display:flex;justify-content:space-between"><span>IVA</span><span>${formatMoneyReceipt(receipt.iva)}</span></div>` : ""}
      <div style="display:flex;justify-content:space-between;font-weight:700;font-size:${isTicket ? 13 : 16}px;margin-top:4px;color:#000"><span>TOTAL</span><span>${formatMoneyReceipt(receipt.total)}</span></div>
    </div>
    ${receipt.notes ? `<div style="margin-top:${isTicket ? 6 : 10}px;font-size:${isTicket ? 9 : 11}px;color:#000">${escapeHtml(receipt.notes)}</div>` : ""}
    <div style="text-align:center;margin-top:${isTicket ? 10 : 16}px;font-size:${isTicket ? 9 : 11}px;color:#000">Gracias por su compra</div>
  </div>`;
}

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
