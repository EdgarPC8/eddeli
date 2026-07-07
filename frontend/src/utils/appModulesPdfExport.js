/**
 * Exportación PDF del catálogo de módulos (/info).
 *
 * ⚠️ MANTENIMIENTO — MODIFICA ESTE ARCHIVO cuando cambies módulos, secciones o funciones:
 * - Los datos vienen de `frontend/src/config/appModulesCatalog.js` (fuente de verdad).
 * - Si cambias columnas, colores o diseño del PDF, hazlo aquí.
 * - Si solo agregas/quitas secciones o funciones en el catálogo, normalmente basta con
 *   actualizar appModulesCatalog.js; este archivo usa esos datos automáticamente.
 */
import { jsPDF } from "jspdf";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { activeApp } from "../config/appInfo.js";
import {
  APP_ROLES_LEGEND,
  APP_MODULE_GROUPS,
  APP_ACCOUNT_SECTIONS,
  APP_PUBLIC_SECTIONS,
} from "../config/appModulesCatalog.js";

const MARGIN = 14;
const PAGE_FOOTER_H = 10;

/** Colores EdDeli (cabeceras y filas alternas). */
const THEME = {
  headerFill: [198, 106, 42],
  headerText: [255, 255, 255],
  groupFill: [255, 236, 214],
  groupText: [92, 48, 8],
  rowAlt: [248, 248, 248],
  border: [210, 210, 210],
  bodyText: [30, 30, 30],
};

const SECTION_COLUMNS = [
  { key: "name", label: "Sección", width: 30 },
  { key: "path", label: "Ruta", width: 34 },
  { key: "description", label: "Descripción", width: 76 },
  { key: "roles", label: "Roles", width: 38 },
];

const ROLE_COLUMNS = [
  { key: "name", label: "Rol", width: 36 },
  { key: "description", label: "Descripción", width: 142 },
];

const FUNCTION_COLUMNS = [
  { key: "section", label: "Sección", width: 28 },
  { key: "name", label: "Función", width: 34 },
  { key: "description", label: "Descripción", width: 116 },
];

function pageWidth(doc) {
  return doc.internal.pageSize.getWidth();
}

function pageHeight(doc) {
  return doc.internal.pageSize.getHeight();
}

function tableTotalWidth(columns) {
  return columns.reduce((s, c) => s + c.width, 0);
}

function ensureSpace(doc, y, need) {
  if (y + need <= pageHeight(doc) - MARGIN - PAGE_FOOTER_H) return y;
  doc.addPage();
  return MARGIN;
}

function wrapCell(doc, text, width, fontSize) {
  doc.setFontSize(fontSize);
  return doc.splitTextToSize(String(text ?? "—"), Math.max(8, width - 4));
}

function measureRowHeight(doc, columns, row, fontSize, isHeader) {
  const pad = 2.5;
  let maxLines = 1;
  for (const col of columns) {
    const raw = isHeader ? col.label : row[col.key];
    const lines = wrapCell(doc, raw, col.width, fontSize);
    maxLines = Math.max(maxLines, lines.length);
  }
  return maxLines * (fontSize * 0.42) + pad * 2;
}

function drawTableRow(doc, y, columns, row, { isHeader = false, zebra = false } = {}) {
  const x0 = MARGIN;
  const fontSize = isHeader ? 8.5 : 8;
  const rowH = measureRowHeight(doc, columns, row, fontSize, isHeader);
  y = ensureSpace(doc, y, rowH + 1);

  let x = x0;
  for (const col of columns) {
    const w = col.width;
    if (isHeader) {
      doc.setFillColor(...THEME.headerFill);
      doc.setDrawColor(...THEME.border);
      doc.rect(x, y, w, rowH, "FD");
      doc.setTextColor(...THEME.headerText);
      doc.setFont("helvetica", "bold");
    } else {
      doc.setFillColor(...(zebra ? THEME.rowAlt : [255, 255, 255]));
      doc.setDrawColor(...THEME.border);
      doc.rect(x, y, w, rowH, "FD");
      doc.setTextColor(...THEME.bodyText);
      doc.setFont("helvetica", "normal");
    }

    const text = isHeader ? col.label : row[col.key];
    const lines = wrapCell(doc, text, w, fontSize);
    const lineStep = fontSize * 0.42;
    const textBlockH = lines.length * lineStep;
    let ty = y + (rowH - textBlockH) / 2 + lineStep * 0.75;
    for (const line of lines) {
      doc.text(line, x + 2, ty);
      ty += lineStep;
    }
    x += w;
  }

  doc.setTextColor(...THEME.bodyText);
  return y + rowH;
}

function drawTable(doc, y, columns, rows) {
  const headerRow = {};
  let cy = drawTableRow(doc, y, columns, headerRow, { isHeader: true });
  rows.forEach((row, index) => {
    cy = drawTableRow(doc, cy, columns, row, { zebra: index % 2 === 1 });
  });
  return cy + 3;
}

function writeGroupTitle(doc, y, title, subtitle) {
  y = ensureSpace(doc, y, 14);
  const w = tableTotalWidth(SECTION_COLUMNS);
  doc.setFillColor(...THEME.groupFill);
  doc.setDrawColor(...THEME.border);
  doc.rect(MARGIN, y, w, 9, "FD");
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...THEME.groupText);
  doc.text(title, MARGIN + 2.5, y + 5.8);
  y += 10;
  if (subtitle) {
    y = ensureSpace(doc, y, 6);
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(90, 90, 90);
    const lines = doc.splitTextToSize(subtitle, w);
    for (const line of lines) {
      doc.text(line, MARGIN, y);
      y += 4;
    }
    y += 2;
  }
  doc.setTextColor(...THEME.bodyText);
  return y;
}

function writeHeading(doc, y, text) {
  y = ensureSpace(doc, y, 10);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...THEME.groupText);
  doc.text(text, MARGIN, y);
  return y + 7;
}

function sectionRows(sections) {
  return sections.map((s) => ({
    name: s.name,
    path: s.path,
    description: s.description,
    roles: (s.roles || []).join(", "),
  }));
}

function functionRowsFromSections(sections) {
  const rows = [];
  for (const section of sections) {
    for (const fn of section.functions || []) {
      rows.push({
        section: section.name,
        name: fn.name,
        description: fn.description,
      });
    }
  }
  return rows;
}

function writeFunctionsSubtitle(doc, y, label) {
  y = ensureSpace(doc, y, 8);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 100, 100);
  doc.text(label, MARGIN, y);
  doc.setTextColor(...THEME.bodyText);
  return y + 5;
}

function drawFunctionsForSections(doc, y, sections, subtitle = "Funciones por sección") {
  const rows = functionRowsFromSections(sections);
  if (!rows.length) return y;
  y = writeFunctionsSubtitle(doc, y, subtitle);
  return drawTable(doc, y, FUNCTION_COLUMNS, rows);
}

function addFooters(doc) {
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i += 1) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120);
    doc.text(
      `${activeApp.alias || "EdDeli"} — Módulos y secciones · Pág. ${i}/${total}`,
      MARGIN,
      pageHeight(doc) - 6,
    );
    doc.setTextColor(...THEME.bodyText);
  }
}

/**
 * Genera y descarga el catálogo de módulos en PDF con tablas y cabeceras de color.
 */
export function downloadAppModulesPdf() {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const contentW = pageWidth(doc) - MARGIN * 2;
  let y = MARGIN;

  const dateStr = format(new Date(), "d 'de' MMMM yyyy, HH:mm", { locale: es });

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...THEME.groupText);
  doc.text(activeApp.name, MARGIN, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...THEME.bodyText);
  for (const line of [
    `Versión ${activeApp.version} · ${activeApp.description}`,
    `Generado: ${dateStr}`,
    `Desarrollado por ${activeApp.author}`,
  ]) {
    doc.text(line, MARGIN, y);
    y += 5;
  }
  y += 4;

  y = writeHeading(doc, y, "Roles del sistema");
  y = drawTable(
    doc,
    y,
    ROLE_COLUMNS,
    APP_ROLES_LEGEND.map((r) => ({ name: r.name, description: r.description })),
  );
  y += 4;

  y = writeHeading(doc, y, "Módulos del menú");
  for (const group of APP_MODULE_GROUPS) {
    y = writeGroupTitle(doc, y, group.label, group.summary);
    y = drawTable(doc, y, SECTION_COLUMNS, sectionRows(group.sections));
    y = drawFunctionsForSections(doc, y, group.sections);
    y += 2;
  }

  y = writeHeading(doc, y, "Cuenta de usuario");
  y = drawTable(doc, y, SECTION_COLUMNS, sectionRows(APP_ACCOUNT_SECTIONS));
  y = drawFunctionsForSections(doc, y, APP_ACCOUNT_SECTIONS);
  y += 4;

  y = writeHeading(doc, y, "Acceso público (sin login)");
  y = drawTable(doc, y, SECTION_COLUMNS, sectionRows(APP_PUBLIC_SECTIONS));
  y = drawFunctionsForSections(doc, y, APP_PUBLIC_SECTIONS);

  addFooters(doc);

  const safeName = (activeApp.alias || "EdDeli").replace(/\s+/g, "-");
  doc.save(`${safeName}-modulos-secciones-funciones.pdf`);
}
