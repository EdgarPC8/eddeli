import { getActiveAppSettings } from "../context/AppSettingsContext.jsx";

export const DEFAULT_APP_TIMEZONE = "America/Guayaquil";

export function getAppTimezone() {
  return getActiveAppSettings()?.timezone || DEFAULT_APP_TIMEZONE;
}

export function getZonedParts(instant = new Date(), timeZone = getAppTimezone()) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(
    fmt
      .formatToParts(instant)
      .filter((p) => p.type !== "literal")
      .map((p) => [p.type, p.value]),
  );
  const hourRaw = parts.hour === "24" ? "0" : parts.hour;
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(hourRaw),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

export function formatAppDateTime(value, options = {}) {
  const {
    timeZone = getAppTimezone(),
    showSeconds = true,
    fallback = "—",
  } = options;

  if (value == null || value === "") return fallback;
  const instant = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(instant.getTime())) return fallback;

  return instant.toLocaleString("es-EC", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    ...(showSeconds ? { second: "2-digit" } : {}),
    hour12: true,
  });
}

export function toAppDateTimeInput(value, timeZone = getAppTimezone()) {
  const instant = value == null ? new Date() : value instanceof Date ? value : new Date(value);
  const p = getZonedParts(instant, timeZone);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}T${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`;
}

export function nowAppDateTimeInput(timeZone = getAppTimezone()) {
  return toAppDateTimeInput(new Date(), timeZone);
}

/** datetime-local en zona de la app (reemplaza nowLocalDateTime). */
export function nowLocalDateTime() {
  return nowAppDateTimeInput();
}

export function toLocalDateTimeInput(value) {
  if (value == null || value === "") return nowAppDateTimeInput();
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) return value.slice(0, 16);
  return toAppDateTimeInput(value);
}

export const APP_TIMEZONE_OPTIONS = [
  { value: "America/Guayaquil", label: "Ecuador (Guayaquil)" },
  { value: "America/Bogota", label: "Colombia (Bogotá)" },
  { value: "America/Lima", label: "Perú (Lima)" },
  { value: "America/Caracas", label: "Venezuela (Caracas)" },
  { value: "America/Mexico_City", label: "México (Ciudad de México)" },
  { value: "America/Santiago", label: "Chile (Santiago)" },
  { value: "America/Argentina/Buenos_Aires", label: "Argentina (Buenos Aires)" },
  { value: "UTC", label: "UTC" },
];
