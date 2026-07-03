/**
 * Imprime HTML en iframe dedicado. En ticket ajusta la altura de @page al contenido
 * para evitar mucho papel en blanco en impresoras de rollo (TM-U220, térmicas, etc.).
 */
import { getTicketPageWidthMm, getTicketSideMarginMm, isTicketFormat } from "./receiptFormats.js";

export function printHtmlDocument(bodyHtml, { format = "a4" } = {}) {
  if (!bodyHtml) return;

  const isTicket = isTicketFormat(format);
  const ticketPageWidthMm = getTicketPageWidthMm(format) ?? 80;
  const sideMarginMm = getTicketSideMarginMm(format);

  const printStyles = isTicket
    ? `
    @page { size: ${ticketPageWidthMm}mm 200mm portrait; margin: 0; }
    *, *::before, *::after { box-sizing: border-box; }
    html, body {
      margin: 0 auto;
      padding: 0;
      width: ${ticketPageWidthMm}mm;
      max-width: ${ticketPageWidthMm}mm;
      min-width: ${ticketPageWidthMm}mm;
      height: auto;
      background: #fff;
      color: #000;
      writing-mode: horizontal-tb;
      overflow-x: hidden;
    }
    body { font-family: Arial, sans-serif; }
    .receipt-print-root {
      width: 100%;
      max-width: 100%;
      margin: 0;
      padding: 2mm ${sideMarginMm}mm 1.5mm ${sideMarginMm}mm;
      box-sizing: border-box;
      overflow: hidden;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }
    .receipt-print-root table {
      width: 100%;
      max-width: 100%;
      table-layout: fixed;
    }
    .receipt-print-root th,
    .receipt-print-root td {
      overflow: hidden;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }
    @media print {
      html, body {
        width: ${ticketPageWidthMm}mm !important;
        max-width: ${ticketPageWidthMm}mm !important;
        min-width: ${ticketPageWidthMm}mm !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      .receipt-print-root {
        width: 100% !important;
        max-width: 100% !important;
        padding: 2mm ${sideMarginMm}mm 1.5mm ${sideMarginMm}mm !important;
      }
    }
    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  `
    : `
    @page { size: A4; margin: 8mm; }
    html, body {
      margin: 0;
      padding: 0;
      background: #fff;
      color: #000;
    }
    body { font-family: Arial, sans-serif; }
    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  `;

  const wrappedBody = isTicket
    ? `<div class="receipt-print-root">${bodyHtml}</div>`
    : bodyHtml;

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Imprimir</title>
  <style>${printStyles}</style>
</head>
<body>${wrappedBody}</body>
</html>`;

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;";
  document.body.appendChild(iframe);

  const win = iframe.contentWindow;
  const doc = win?.document;
  if (!win || !doc) {
    iframe.remove();
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  const runPrint = () => {
    try {
      if (isTicket) {
        const root = doc.querySelector(".receipt-print-root") || doc.body;
        const heightPx = Math.max(root.scrollHeight, root.offsetHeight, root.clientHeight);
        const heightMm = Math.max(
          ticketPageWidthMm + 20,
          Math.ceil(heightPx * 0.264583) + 4,
        );
        const dyn = doc.createElement("style");
        dyn.textContent = `
          @page { size: ${ticketPageWidthMm}mm ${heightMm}mm portrait !important; margin: 0 !important; }
          html, body {
            width: ${ticketPageWidthMm}mm !important;
            max-width: ${ticketPageWidthMm}mm !important;
            min-width: ${ticketPageWidthMm}mm !important;
          }
        `;
        doc.head.appendChild(dyn);
      }
      win.focus();
      win.print();
    } finally {
      window.setTimeout(() => iframe.remove(), 1500);
    }
  };

  window.setTimeout(runPrint, 350);
}

/** Ancho útil ticket 80 mm (TM-U220 = 76 mm de rollo). */
export const TICKET_WIDTH_MM = 76;
/** Ancho ticket 55 mm. */
export const TICKET55_WIDTH_MM = 55;
