/**
 * Modal de reporte de deuda del cliente.
 * Muestra una vista previa (resumen por producto y detalle por fecha) adaptada al
 * formato elegido (A4, 80 mm, 55 mm) y permite imprimir o descargar como PNG, PDF o TXT.
 */
import { useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Stack,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
  Divider,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ImageIcon from "@mui/icons-material/Image";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import DescriptionIcon from "@mui/icons-material/Description";
import PrintIcon from "@mui/icons-material/Print";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon from "@mui/icons-material/Check";
import {
  money,
  moneyUnitPrice,
  safeFileName,
  todayISO,
  toNum,
  getBillableQty,
  downloadTextFile,
} from "./helpers.js";
import { buildDetailedReportTxt } from "./reportBuilders.js";
import {
  downloadReceiptAsPng,
  downloadReceiptAsPdf,
  captureReceiptElement,
} from "../../../../utils/saleReceiptExport.js";
import { printHtmlDocument } from "../../../../utils/printHtmlDocument.js";

const escapeHtml = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const WEEKDAYS = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];
const MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

/** "2026-05-24" o "24/05/2026" → "Lunes, 24 de Mayo de 2026" (sin desfase de zona). */
function formatDateLong(value) {
  if (!value) return "—";
  const s = String(value).trim();
  let y;
  let m;
  let day;
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const dmy = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (iso) {
    y = Number(iso[1]);
    m = Number(iso[2]);
    day = Number(iso[3]);
  } else if (dmy) {
    day = Number(dmy[1]);
    m = Number(dmy[2]);
    y = Number(dmy[3]);
  } else {
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s;
    y = d.getFullYear();
    m = d.getMonth() + 1;
    day = d.getDate();
  }
  const d = new Date(y, m - 1, day);
  if (Number.isNaN(d.getTime())) return s;
  return `${WEEKDAYS[d.getDay()]}, ${day} de ${MONTHS[m - 1]} de ${y}`;
}

/** Tamaños de fuente/padding por formato. */
function getFontConfig(format) {
  if (format === "ticket55") return { title: 13, sub: 11, cell: 10, total: 13, pad: "2px 1px" };
  if (format === "ticket80") return { title: 15, sub: 12, cell: 11, total: 14, pad: "3px 2px" };
  return { title: 20, sub: 14, cell: 12, total: 16, pad: "4px 6px" };
}

export default function DebtReportDialog({ open, onClose, customer, items, onError }) {
  const captureRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [format, setFormat] = useState("a4");
  const [copied, setCopied] = useState(false);

  const report = useMemo(() => {
    const pending = (items || []).filter((it) => !it.paidAt);
    const byProduct = new Map();
    const byDate = new Map();
    let total = 0;

    for (const it of pending) {
      const qty = getBillableQty(it);
      if (qty <= 0) continue;
      const price = toNum(it.price, 0);
      const line = Number((qty * price).toFixed(2));
      total = Number((total + line).toFixed(2));

      const pKey = String(it.product || "(sin nombre)");
      if (!byProduct.has(pKey)) byProduct.set(pKey, { product: pKey, qty: 0, total: 0 });
      const agg = byProduct.get(pKey);
      agg.qty = Number((agg.qty + qty).toFixed(2));
      agg.total = Number((agg.total + line).toFixed(2));

      const dKey = String(it.orderDate || "—");
      if (!byDate.has(dKey)) byDate.set(dKey, []);
      byDate.get(dKey).push({ product: pKey, qty, price, line });
    }

    const products = Array.from(byProduct.values()).sort((a, b) => b.total - a.total);
    const dates = Array.from(byDate.entries()).sort((a, b) =>
      String(a[0]).localeCompare(String(b[0])),
    );
    return { products, dates, total };
  }, [items]);

  const bodyHtml = useMemo(() => {
    const F = getFontConfig(format);
    // Blanco y negro
    const BORDER = "#000";
    const ROW = "#ccc";
    const FONT = "'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

    const sectionHeader = (label) =>
      `<div style="font-size:${F.sub}px;font-weight:800;color:#000;border-bottom:2px solid ${BORDER};padding-bottom:3px;margin:14px 0 6px">${label}</div>`;

    const productRows = report.products.length
      ? report.products
          .map(
            (p) => `<tr style="border-bottom:1px solid ${ROW}">
              <td style="font-size:${F.cell}px;padding:${F.pad}">${escapeHtml(p.product)}</td>
              <td style="font-size:${F.cell}px;padding:${F.pad};text-align:center">${p.qty}</td>
              <td style="font-size:${F.cell}px;padding:${F.pad};text-align:right;font-weight:700">${money(p.total)}</td>
            </tr>`,
          )
          .join("")
      : `<tr><td colspan="3" style="font-size:${F.cell}px;padding:${F.pad};text-align:center">Sin saldo pendiente</td></tr>`;

    const dateBlocks = report.dates.length
      ? report.dates
          .map(
            ([date, rows]) => `
            <div style="font-weight:800;font-size:${F.cell}px;color:#000;border-bottom:1px solid ${BORDER};padding:3px 0;margin-top:8px">${escapeHtml(formatDateLong(date))}</div>
            <table style="width:100%;border-collapse:collapse"><tbody>
              ${rows
                .map(
                  (r) => `<tr style="border-bottom:1px solid ${ROW}">
                    <td style="font-size:${F.cell}px;padding:${F.pad}">${escapeHtml(r.product)}</td>
                    <td style="font-size:${F.cell}px;padding:${F.pad};text-align:center">${r.qty}</td>
                    <td style="font-size:${F.cell}px;padding:${F.pad};text-align:right">${moneyUnitPrice(r.price)}</td>
                    <td style="font-size:${F.cell}px;padding:${F.pad};text-align:right;font-weight:700">${money(r.line)}</td>
                  </tr>`,
                )
                .join("")}
            </tbody></table>`,
          )
          .join("")
      : `<div style="font-size:${F.cell}px">Sin datos.</div>`;

    return `<div style="font-family:${FONT};color:#000">
      <div style="text-align:center;font-weight:800;font-size:${F.title}px">Resumen de tu cuenta</div>
      <div style="text-align:center;font-size:${F.cell}px;margin-top:2px;margin-bottom:12px">${escapeHtml(formatDateLong(todayISO()))}</div>

      <div style="font-size:${F.sub}px;font-weight:800;color:#000">${escapeHtml(customer?.name || "—")}</div>
      ${customer?.phone ? `<div style="font-size:${F.cell}px">Tel: ${escapeHtml(customer.phone)}</div>` : ""}

      ${sectionHeader("Resumen por producto")}
      <table style="width:100%;border-collapse:collapse">
        <thead><tr style="border-bottom:2px solid ${BORDER}">
          <th style="text-align:left;font-size:${F.cell}px;padding:${F.pad};font-weight:800">Producto</th>
          <th style="text-align:center;font-size:${F.cell}px;padding:${F.pad};font-weight:800">Cant</th>
          <th style="text-align:right;font-size:${F.cell}px;padding:${F.pad};font-weight:800">Total</th>
        </tr></thead>
        <tbody>${productRows}</tbody>
      </table>

      ${sectionHeader("Detalle por fecha")}
      ${dateBlocks}

      <div style="margin-top:16px;border:2px solid ${BORDER};border-radius:6px;padding:10px 14px;display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:${F.sub}px;font-weight:800;color:#000">Saldo pendiente</span>
        <span style="font-size:${F.total}px;font-weight:800;color:#000">${money(report.total)}</span>
      </div>

      <div style="text-align:center;font-size:${F.cell}px;margin-top:16px;line-height:1.5">
        Gracias por su preferencia y confianza.
      </div>
    </div>`;
  }, [report, format, customer]);

  const baseName = `resumen_cuenta_${safeFileName(customer?.name)}_${todayISO()}`;
  const previewWidth = format === "ticket55" ? 240 : format === "ticket80" ? 320 : 720;

  const withBusy = async (fn, errMsg) => {
    try {
      setBusy(true);
      await fn();
    } catch (err) {
      onError?.(err?.message || errMsg);
    } finally {
      setBusy(false);
    }
  };

  const handlePng = () => withBusy(() => downloadReceiptAsPng(captureRef.current, `${baseName}.png`), "No se pudo generar la imagen");
  const handleCopy = () =>
    withBusy(async () => {
      if (!navigator.clipboard || typeof window.ClipboardItem === "undefined") {
        throw new Error("Tu navegador no permite copiar imágenes al portapapeles");
      }
      const canvas = await captureReceiptElement(captureRef.current);
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("No se pudo generar la imagen");
      await navigator.clipboard.write([new window.ClipboardItem({ "image/png": blob })]);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }, "No se pudo copiar la imagen");
  const handlePdf = () => withBusy(() => downloadReceiptAsPdf(captureRef.current, format, `${baseName}.pdf`), "No se pudo generar el PDF");
  const handlePrint = () => printHtmlDocument(bodyHtml, { format });
  const handleTxt = () => {
    const { txt } = buildDetailedReportTxt({
      title: "RESUMEN DE TU CUENTA",
      customer,
      items: (items || []).filter((it) => !it.paidAt),
    });
    downloadTextFile(`${baseName}.txt`, txt);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth scroll="paper">
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pr: 1 }}>
        <DialogTitle sx={{ pb: 1 }}>Resumen de tu cuenta</DialogTitle>
        <IconButton onClick={onClose} aria-label="Cerrar">
          <CloseIcon />
        </IconButton>
      </Box>
      <Divider />

      <DialogContent sx={{ bgcolor: "grey.100" }}>
        <Stack direction="row" justifyContent="center" sx={{ mb: 2 }}>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={format}
            onChange={(_, v) => v && setFormat(v)}
          >
            <ToggleButton value="a4">A4</ToggleButton>
            <ToggleButton value="ticket80">80 mm</ToggleButton>
            <ToggleButton value="ticket55">55 mm</ToggleButton>
          </ToggleButtonGroup>
        </Stack>

        {/* Elemento capturable (PNG/PDF) */}
        <Box
          ref={captureRef}
          sx={{
            bgcolor: "#fff",
            color: "#000",
            mx: "auto",
            width: "100%",
            maxWidth: previewWidth,
            p: format === "a4" ? 3 : 1.5,
            borderRadius: 1,
            boxShadow: 1,
            boxSizing: "border-box",
          }}
          dangerouslySetInnerHTML={{ __html: bodyHtml }}
        />
      </DialogContent>

      <Divider />
      <DialogActions sx={{ flexWrap: "wrap", gap: 1, px: 2, py: 1.5 }}>
        <Button onClick={onClose} color="inherit">Cerrar</Button>
        <Box sx={{ flex: 1 }} />
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button
            variant="outlined"
            color={copied ? "success" : "primary"}
            startIcon={copied ? <CheckIcon /> : <ContentCopyIcon />}
            onClick={handleCopy}
            disabled={busy}
          >
            {copied ? "¡Copiado!" : "Copiar"}
          </Button>
          <Button variant="outlined" startIcon={<DescriptionIcon />} onClick={handleTxt} disabled={busy}>
            TXT
          </Button>
          <Button variant="outlined" startIcon={<ImageIcon />} onClick={handlePng} disabled={busy}>
            PNG
          </Button>
          <Button variant="outlined" startIcon={<PictureAsPdfIcon />} onClick={handlePdf} disabled={busy}>
            PDF
          </Button>
          <Button variant="contained" startIcon={<PrintIcon />} onClick={handlePrint} disabled={busy}>
            Imprimir
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
}
