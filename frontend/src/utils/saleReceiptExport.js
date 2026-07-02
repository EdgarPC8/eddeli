import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { getTicketPdfPageSize, isTicketFormat } from "./receiptFormats.js";

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function captureReceiptElement(element) {
  if (!element) throw new Error("No hay vista previa para exportar.");
  return html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
  });
}

export async function downloadReceiptAsPng(element, filename = "comprobante.png") {
  const canvas = await captureReceiptElement(element);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("No se pudo generar la imagen.");
  triggerDownload(blob, filename);
}

export async function downloadReceiptAsPdf(element, format = "a4", filename = "comprobante.pdf") {
  const canvas = await captureReceiptElement(element);
  const imgData = canvas.toDataURL("image/png");
  const isTicket = isTicketFormat(format);
  const ticketSize = getTicketPdfPageSize(format);
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: isTicket ? ticketSize : "a4",
  });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = isTicket ? 2 : 8;
  const maxW = pageWidth - margin * 2;
  const imgH = (canvas.height * maxW) / canvas.width;
  let y = margin;
  let h = imgH;
  if (h > pageHeight - margin * 2) {
    h = pageHeight - margin * 2;
  }
  pdf.addImage(imgData, "PNG", margin, y, maxW, h);
  pdf.save(filename);
}
