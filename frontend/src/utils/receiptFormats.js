/** Formatos de comprobante: A4 y tickets térmicos. */
export const TICKET_FORMATS = ["ticket80", "ticket55"];

export function isTicketFormat(format) {
  return TICKET_FORMATS.includes(format);
}

export function getTicketPageWidthMm(format) {
  if (format === "ticket55") return 55;
  if (format === "ticket80") return 80;
  return null;
}

/** Márgenes izquierdo y derecho iguales dentro del rollo (mm). */
export function getTicketSideMarginMm(format) {
  if (format === "ticket55") return 2;
  if (format === "ticket80") return 3;
  return 0;
}

/** Ancho útil de contenido después de márgenes laterales. */
export function getTicketPrintWidthMm(format) {
  const page = getTicketPageWidthMm(format);
  if (!page) return null;
  return page - getTicketSideMarginMm(format) * 2;
}

export function getTicketLabel(format) {
  if (format === "ticket55") return "Ticket 55 mm";
  if (format === "ticket80") return "Ticket 80 mm";
  return null;
}

export function getTicketPdfPageSize(format) {
  if (format === "ticket55") return [55, 200];
  if (format === "ticket80") return [80, 200];
  return null;
}

/** Tamaños de vista previa e impresión según formato. */
export function getReceiptLayout(format) {
  if (format === "a4") {
    return {
      isTicket: false,
      previewWidth: null,
      maxWidth: 720,
      pad: 3,
      baseFont: 15,
      businessName: 22,
      businessDesc: 13,
      docTitle: 17,
      meta: 13,
      date: 18,
      customer: 16,
      total: 17,
      footer: 12,
      signature: 14,
      tableProductWidth: "auto",
      productColPct: null,
      print: null,
    };
  }

  const narrow = format === "ticket55";
  return {
    isTicket: true,
    narrow,
    previewWidth: narrow ? 200 : 280,
    maxWidth: narrow ? 200 : 280,
    pad: narrow ? 0.75 : 1,
    baseFont: narrow ? 12 : 14,
    businessName: narrow ? 14 : 17,
    businessDesc: narrow ? 10 : 12,
    docTitle: narrow ? 13 : 15,
    meta: narrow ? 10 : 12,
    date: narrow ? 13 : 16,
    customer: narrow ? 12 : 14,
    total: narrow ? 13 : 15,
    footer: narrow ? 10 : 11,
    signature: narrow ? 11 : 13,
    tableProductWidth: narrow ? "38%" : "42%",
    productColPct: narrow
      ? { product: "38%", cant: "14%", pu: "24%", total: "24%" }
      : { product: "40%", cant: "12%", pu: "24%", total: "24%" },
    print: narrow
      ? {
          fs: "11px",
          title: 14,
          desc: 10,
          docTitle: 13,
          meta: 10,
          date: 13,
          customer: 12,
          num: 10,
          totalBold: 13,
          notes: 10,
          footer: 10,
          signature: 11,
          padH: "1mm",
        }
      : {
          fs: "13px",
          title: 17,
          desc: 12,
          docTitle: 15,
          meta: 12,
          date: 16,
          customer: 14,
          num: 12,
          totalBold: 15,
          notes: 11,
          footer: 11,
          signature: 13,
          padH: "2mm",
        },
  };
}
