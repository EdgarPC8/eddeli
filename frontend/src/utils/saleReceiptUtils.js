import { getActiveAppSettings } from "../context/AppSettingsContext.jsx";
import { getOrderCustomerDisplay } from "./eddeliPosOrderUtils.js";
import { formatDateTime } from "../helpers/functions.js";
import { printHtmlDocument } from "./printHtmlDocument.js";
import { getReceiptLayout } from "./receiptFormats.js";

const to2 = (n) => Number(Number(n || 0).toFixed(2));
// Precio unitario: se conserva con hasta 3 decimales (ej. 0.125) para que la
// multiplicación cuadre. Los totales de dinero siguen redondeando a 2 decimales.
const to3 = (n) => Number(Number(n || 0).toFixed(3));

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
      customerCedula: "",
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
    customerCedula: raw.cedula || receipt.customerCedula || "",
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

/** Precio unitario en comprobante: hasta 3 decimales, mínimo 2 (ej. $0.125, $1.50). */
export function formatUnitMoneyReceipt(n) {
  const v = to3(n);
  const decimals = Math.round(v * 100) === v * 100 ? 2 : 3;
  return `$${v.toFixed(decimals)}`;
}

export function formatReceiptDate(iso) {
  return formatDateTime(iso);
}

/** Etiquetas cortas en comprobante impreso. */
export const RECEIPT_FIELD_LABELS = {
  name: "Nom:",
  cedula: "CI:",
  phone: "Tel:",
  address: "Dir:",
  payment: "Pag:",
};

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
    price: to3(row.price),
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

  const app = getActiveAppSettings();
  return {
    id: sale.id,
    businessName: app.alias || "App",
    businessDescription: app.description || "",
    documentTitle: documentTitleForType(docType),
    documentType: docType,
    documentTypeLabel: documentTypeLabel(docType),
    date: formatReceiptDate(sale.date || sale.paidAt),
    customerName: customerDisplay,
    customerPhone: customer.phone || "",
    customerAddress: customer.address || "",
    customerEmail: customer.email || "",
    customerCedula: customer.cedula || "",
    _customerRaw: {
      name: customerNameRaw,
      phone: customer.phone || "",
      address: customer.address || "",
      email: customer.email || "",
      cedula: customer.cedula || "",
    },
    paymentMethod: paymentMethodLabel(sale.paymentMethod),
    items,
    subtotal,
    iva,
    total,
    notes: String(sale.notes || "")
      .replace(/\[CAJA_POS\]/g, "")
      .replace(/\[CONTADO\]/g, "")
      .replace(/\[CREDITO\]/g, "")
      .trim(),
  };
}

/** Comprobante desde pedido de cliente (módulo pedidos). */
export function buildReceiptFromCustomerOrder(order) {
  if (!order) return null;
  const rawItems = order.ERP_order_items || order.items || [];
  const items = rawItems.map((row) => {
    const qty = Number(row.quantity || 0);
    const price = to3(row.price);
    const lineTotal = to2(qty * price);
    const taxRate = Number(row.ERP_inventory_product?.taxRate || row.taxRate || 0);
    let subtotal = lineTotal;
    let iva = 0;
    if (taxRate > 0) {
      subtotal = to2(lineTotal / (1 + taxRate / 100));
      iva = to2(lineTotal - subtotal);
    }
    return {
      name: row.ERP_inventory_product?.name || row.name || "Producto",
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
  const customer = order.ERP_customer || order.customer || {};

  return normalizeSaleReceipt({
    id: order.id,
    date: order.date,
    paidAt: order.paidAt,
    paymentMethod: order.paymentMethod || "credito",
    documentType: order.documentType || "nota_venta",
    notes: order.notes,
    customer,
    items,
    subtotal,
    iva,
    total,
  });
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
    const price = to3(row.price);
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

/** Aplica datos editables del cliente solo para vista previa / impresión. */
export function applyReceiptCustomerOverrides(receipt, fields = {}) {
  if (!receipt) return null;
  if (receipt.documentType === "consumidor_final") return receipt;

  return {
    ...receipt,
    customerName: String(fields.name ?? receipt.customerName ?? "").trim() || "—",
    customerCedula: String(fields.cedula ?? receipt.customerCedula ?? "").trim(),
    customerPhone: String(fields.phone ?? receipt.customerPhone ?? "").trim(),
    customerAddress: String(fields.address ?? receipt.customerAddress ?? "").trim(),
  };
}

export function printSaleReceipt(receipt, format, options = {}) {
  printHtmlDocument(buildPrintHtml(receipt, format, options), { format });
}

function buildPrintHtml(receipt, format, options = {}) {
  const { showNotes = true } = options;
  const layout = getReceiptLayout(format);
  const isTicket = layout.isTicket;
  const p = layout.print;
  const cols = layout.productColPct;
  const w = isTicket ? "100%" : "210mm";
  const fs = isTicket ? p.fs : "14px";
  const pad = isTicket ? "0" : "24px";
  const productCell = isTicket
    ? "padding:2px 1px;word-wrap:break-word;overflow-wrap:break-word;white-space:normal;vertical-align:top;line-height:1.35;font-weight:600"
    : "padding:2px 0;font-weight:600";
  const numCell = isTicket
    ? `text-align:center;padding:2px 1px;vertical-align:top;font-size:${p.num}px;font-weight:700`
    : "text-align:center;padding:2px 4px;font-weight:700";
  const moneyCell = isTicket
    ? `text-align:right;padding:2px 1px;vertical-align:top;font-size:${p.num}px;font-weight:700;word-wrap:break-word;overflow-wrap:break-word`
    : "text-align:right;padding:2px 0;font-weight:700";
  const totalRow = (label, value, bold = false) => {
    const fw = bold ? "font-weight:800;" : "font-weight:700;";
    const fsTotal = bold ? (isTicket ? `font-size:${p.totalBold}px;` : "font-size:17px;") : "";
    return `<div style="display:table;width:100%;${fw}${fsTotal}">
      <span style="display:table-cell;padding:0 1px">${label}</span>
      <span style="display:table-cell;text-align:right;white-space:nowrap;padding:0 1px">${value}</span>
    </div>`;
  };
  const signatureBlock = isTicket
    ? `<div style="margin-top:10px">
        <div style="border-top:1.5px solid #000;margin-top:28px;padding-top:5px;text-align:center;font-weight:800;font-size:${p.signature}px">Entrega</div>
        <div style="border-top:1.5px solid #000;margin-top:28px;padding-top:5px;text-align:center;font-weight:800;font-size:${p.signature}px">Recibe</div>
      </div>`
    : `<div style="display:flex;justify-content:space-between;gap:32px;margin-top:36px">
        <div style="flex:1;text-align:center">
          <div style="border-top:1.5px solid #000;margin-top:40px;padding-top:6px;font-weight:800;font-size:14px">Entrega</div>
        </div>
        <div style="flex:1;text-align:center">
          <div style="border-top:1.5px solid #000;margin-top:40px;padding-top:6px;font-weight:800;font-size:14px">Recibe</div>
        </div>
      </div>`;
  const rows = (receipt.items || [])
    .map(
      (it) =>
        `<tr>
          <td style="${productCell}">${escapeHtml(it.name)}</td>
          <td style="${numCell}">${it.quantity}</td>
          <td style="${moneyCell}">${formatUnitMoneyReceipt(it.price)}</td>
          <td style="${moneyCell}">${formatMoneyReceipt(it.lineTotal)}</td>
        </tr>`,
    )
    .join("");

  const totalQuantity = (receipt.items || []).reduce(
    (acc, it) => acc + Number(it.quantity || 0),
    0,
  );

  return `<div style="width:${w};max-width:${w};margin:0 auto;padding:${pad};box-sizing:border-box;font-family:Arial,sans-serif;font-size:${fs};font-weight:600;color:#000;line-height:1.35;overflow:hidden">
    <div style="text-align:center;margin-bottom:${isTicket ? 6 : 16}px">
      <div style="font-weight:800;font-size:${isTicket ? p.title : 22}px;color:#000">${escapeHtml(receipt.businessName)}</div>
      ${receipt.businessDescription ? `<div style="font-weight:800;font-size:${isTicket ? p.desc : 13}px;color:#000;margin-top:2px">${escapeHtml(receipt.businessDescription)}</div>` : ""}
      <div style="font-weight:800;margin-top:${isTicket ? 5 : 12}px;font-size:${isTicket ? p.docTitle : 17}px;color:#000">${escapeHtml(receipt.documentTitle)}</div>
      <div style="font-weight:800;font-size:${isTicket ? p.meta : 13}px;color:#000;margin-top:2px">N° ${receipt.id || "—"}</div>
      <div style="font-weight:900;font-size:${isTicket ? p.date : 18}px;color:#000;margin-top:3px">${escapeHtml(receipt.date)}</div>
    </div>
    <div style="margin-bottom:${isTicket ? 6 : 12}px;font-size:${isTicket ? p.customer : 16}px;font-weight:700;color:#000;line-height:1.4">
      <div style="margin-bottom:${isTicket ? 2 : 3}px"><strong>${RECEIPT_FIELD_LABELS.name}</strong> ${escapeHtml(receipt.customerName)}</div>
      ${receipt.customerCedula ? `<div style="margin-bottom:${isTicket ? 2 : 3}px"><strong>${RECEIPT_FIELD_LABELS.cedula}</strong> ${escapeHtml(receipt.customerCedula)}</div>` : ""}
      ${receipt.customerPhone ? `<div style="margin-bottom:${isTicket ? 2 : 3}px"><strong>${RECEIPT_FIELD_LABELS.phone}</strong> ${escapeHtml(receipt.customerPhone)}</div>` : ""}
      ${receipt.customerAddress ? `<div style="margin-bottom:${isTicket ? 2 : 3}px"><strong>${RECEIPT_FIELD_LABELS.address}</strong> ${escapeHtml(receipt.customerAddress)}</div>` : ""}
      <div><strong>${RECEIPT_FIELD_LABELS.payment}</strong> ${escapeHtml(receipt.paymentMethod)}</div>
    </div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:${isTicket ? 6 : 12}px;color:#000;table-layout:fixed">
      <thead>
        <tr style="border-bottom:1px solid #ccc">
          <th style="text-align:left;padding:2px 1px;font-weight:800;color:#000;width:${isTicket ? cols.product : "auto"}">Producto</th>
          <th style="text-align:center;padding:2px 1px;font-weight:800;color:#000;width:${isTicket ? cols.cant : "auto"}">Cant</th>
          <th style="text-align:right;padding:2px 1px;font-weight:800;color:#000;width:${isTicket ? cols.pu : "auto"}">P.U.</th>
          <th style="text-align:right;padding:2px 1px;font-weight:800;color:#000;width:${isTicket ? cols.total : "auto"}">Total</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr style="border-top:1px solid #ccc">
          <td style="text-align:right;padding:3px 1px;font-weight:800;color:#000">Total Cant</td>
          <td style="text-align:center;padding:3px 1px;font-weight:800;color:#000">${totalQuantity}</td>
          <td style="padding:3px 1px"></td>
          <td style="padding:3px 1px"></td>
        </tr>
      </tfoot>
    </table>
    <div style="border-top:1px dashed #999;padding-top:${isTicket ? 3 : 10}px;color:#000">
      ${totalRow("Subtotal", formatMoneyReceipt(receipt.subtotal))}
      ${receipt.iva > 0 ? totalRow("IVA", formatMoneyReceipt(receipt.iva)) : ""}
      ${totalRow("TOTAL", formatMoneyReceipt(receipt.total), true)}
    </div>
    ${showNotes && receipt.notes ? `<div style="margin-top:${isTicket ? 4 : 10}px;font-size:${isTicket ? p.notes : 12}px;font-weight:700;color:#000;word-wrap:break-word">${escapeHtml(receipt.notes)}</div>` : ""}
    <div style="text-align:center;margin-top:${isTicket ? 6 : 16}px;margin-bottom:0;font-size:${isTicket ? p.footer : 12}px;font-weight:800;color:#000">Gracias por su compra</div>
    ${signatureBlock}
  </div>`;
}

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
