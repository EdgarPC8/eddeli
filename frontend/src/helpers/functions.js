import { isValid, parse } from "date-fns";
import { formatAppDateTime, getAppTimezone } from "../utils/appDateTime.js";

const BACKEND_DT = "dd/MM/yyyy HH:mm:ss";
const BACKEND_DT_SHORT = "dd/MM/yyyy HH:mm";

/** Parsea ISO, Date o el formato del backend (dd/MM/yyyy HH:mm:ss). */
export function parseAppDate(value) {
  if (value == null || value === "") return null;
  if (value instanceof Date) return isValid(value) ? value : null;

  const text = String(value).trim();
  if (!text || text === "—") return null;

  if (/^\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}/.test(text)) {
    const fmt = text.length > 16 ? BACKEND_DT : BACKEND_DT_SHORT;
    const parsed = parse(text, fmt, new Date());
    if (isValid(parsed)) return parsed;
  }

  const iso = new Date(text);
  return isValid(iso) ? iso : null;
}

/** Fecha + hora legible en tablas (zona de la app desde configuración). */
export function formatDateTime(value, options = {}) {
  const { showSeconds = false, fallback = "—", timeZone } = options;
  const date = parseAppDate(value);
  if (!date) return fallback;

  if (timeZone || getAppTimezone()) {
    return formatAppDateTime(date, { showSeconds, fallback, timeZone });
  }

  return date.toLocaleString("es-EC", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    ...(showSeconds ? { second: "2-digit" } : {}),
    hour12: true,
  });
}

/** Alias histórico: misma salida que formatDateTime. */
export function formatDate(value, options) {
  return formatDateTime(value, options);
}

export function anonimizarTextoChino(texto) {
  const caracteresChinos = "的一是不了人我在有他这为之大来以个中上们";
  if (typeof texto !== "string") return texto;

  return Array.from(texto).map(() => {
    const i = Math.floor(Math.random() * caracteresChinos.length);
    return caracteresChinos[i];
  }).join('');
}
