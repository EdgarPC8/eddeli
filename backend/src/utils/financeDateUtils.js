import {
  format,
  startOfWeek,
  startOfMonth,
  parseISO,
  isValid,
} from "date-fns";
import { Op, fn, col, where } from "sequelize";
import { toAppDayKey, getAppTimezone } from "./appDateTime.js";

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

export function buildFinanceDateColumnWhere(startInput, endInput) {
  const resolveKey = (v) => {
    if (v == null || v === "") return null;
    if (v instanceof Date) return toAppDayKey(v);
    const raw = String(v).slice(0, 10);
    if (DATE_ONLY_RE.test(raw)) return raw;
    return toAppDayKey(v);
  };

  const start = resolveKey(startInput);
  const end = resolveKey(endInput);
  if (!start && !end) return null;

  const dateExpr = fn("DATE", col("date"));
  if (start && end) return where(dateExpr, { [Op.between]: [start, end] });
  if (start) return where(dateExpr, { [Op.gte]: start });
  if (end) return where(dateExpr, { [Op.lte]: end });
  return null;
}

export function buildFinanceDateWhere(startDate, endDate) {
  const clause = buildFinanceDateColumnWhere(startDate, endDate);
  return clause ? { [Op.and]: [clause] } : {};
}

export { getAppTimezone };
