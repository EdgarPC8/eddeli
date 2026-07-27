import {
  format,
  startOfWeek,
  startOfMonth,
  parseISO,
  isValid,
} from "date-fns";
import { Op } from "sequelize";
import { toAppDayKey, getAppTimezone, zonedDateTimeToUtc } from "./appDateTime.js";

const DATE_ONLY_RE = /^(\d{4}-\d{2}-\d{2})/;

/** @see toAppDayKey */
export function toFinanceDayKey(value) {
  return toAppDayKey(value);
}

export function parseFinanceDayKey(key) {
  if (!key || !DATE_ONLY_RE.test(String(key))) return null;
  const d = parseISO(String(key).slice(0, 10));
  return isValid(d) ? d : null;
}

export function financeBucketKey(value, granularity) {
  const dayKey = toAppDayKey(value);
  if (!dayKey) return null;
  const d = parseFinanceDayKey(dayKey);
  if (!d) return null;
  if (granularity === "day") return dayKey;
  if (granularity === "week") {
    return format(startOfWeek(d, { weekStartsOn: 1 }), "yyyy-MM-dd");
  }
  return format(startOfMonth(d), "yyyy-MM");
}

export function toChartBusinessDay(value) {
  const key = toAppDayKey(value);
  return key || undefined;
}

export function parseFinanceDayParam(value) {
  if (!value) return null;
  return parseFinanceDayKey(String(value).slice(0, 10));
}

function resolveDayKey(v) {
  if (v == null || v === "") return null;
  if (v instanceof Date) return toAppDayKey(v);
  const raw = String(v).slice(0, 10);
  if (DATE_ONLY_RE.test(raw)) return raw;
  return toAppDayKey(v);
}

/** Inicio del día civil (00:00:00) en zona de la app → UTC Date. */
export function dayKeyStartUtc(dayKey) {
  const [y, m, d] = String(dayKey).split("-").map(Number);
  if (!y || !m || !d) return null;
  return zonedDateTimeToUtc(y, m, d, 0, 0, 0);
}

/** Inicio del día siguiente (límite exclusivo) en zona de la app → UTC Date. */
export function dayKeyEndExclusiveUtc(dayKey) {
  const [y, m, d] = String(dayKey).split("-").map(Number);
  if (!y || !m || !d) return null;
  // Date.UTC maneja desborde de mes/día.
  const next = new Date(Date.UTC(y, m - 1, d + 1, 12, 0, 0));
  return zonedDateTimeToUtc(
    next.getUTCFullYear(),
    next.getUTCMonth() + 1,
    next.getUTCDate(),
    0,
    0,
    0,
  );
}

/**
 * Filtro por columna `date` usable con índice (sin DATE(date)).
 * Rango semiabierto: start 00:00 inclusive → end+1 00:00 exclusive.
 */
export function buildFinanceDateColumnWhere(startInput, endInput) {
  const start = resolveDayKey(startInput);
  const end = resolveDayKey(endInput);
  if (!start && !end) return null;

  if (start && end) {
    const from = dayKeyStartUtc(start);
    const toEx = dayKeyEndExclusiveUtc(end);
    if (!from || !toEx) return null;
    return { date: { [Op.gte]: from, [Op.lt]: toEx } };
  }
  if (start) {
    const from = dayKeyStartUtc(start);
    if (!from) return null;
    return { date: { [Op.gte]: from } };
  }
  const toEx = dayKeyEndExclusiveUtc(end);
  if (!toEx) return null;
  return { date: { [Op.lt]: toEx } };
}

export function buildFinanceDateWhere(startDate, endDate) {
  const clause = buildFinanceDateColumnWhere(startDate, endDate);
  return clause ? { [Op.and]: [clause] } : {};
}

export { getAppTimezone };
