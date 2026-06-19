import {
  format,
  parseISO,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
} from "date-fns";
import { es } from "date-fns/locale";

/**
 * Al hacer clic en una vela, el flujo muestra un nivel más fino:
 * - vela día   → barras diarias de esa semana
 * - vela semana → barras diarias de esa semana (7 días)
 * - vela mes   → barras semanales de ese mes
 */
export function resolveMirrorFromCandle(candleGranularity, candle) {
  if (!candle?.key) return null;

  if (candleGranularity === "day") {
    const d = parseISO(candle.key);
    const start = startOfWeek(d, { weekStartsOn: 1 });
    const end = endOfWeek(d, { weekStartsOn: 1 });
    return {
      granularity: "day",
      startDate: format(start, "yyyy-MM-dd"),
      endDate: format(end, "yyyy-MM-dd"),
      periodLabel: `Semana del ${format(start, "d MMM", { locale: es })} al ${format(end, "d MMM yyyy", { locale: es })}`,
      highlightKey: candle.key,
      candleLabel: candle.label || format(d, "EEE d MMM", { locale: es }),
      sourceGranularity: candleGranularity,
    };
  }

  if (candleGranularity === "week") {
    const start = parseISO(candle.key);
    const end = endOfWeek(start, { weekStartsOn: 1 });
    return {
      granularity: "day",
      startDate: format(start, "yyyy-MM-dd"),
      endDate: format(end, "yyyy-MM-dd"),
      periodLabel: `${format(start, "d MMM", { locale: es })} – ${format(end, "d MMM yyyy", { locale: es })}`,
      highlightKey: candle.key,
      candleLabel: candle.label || `Semana del ${format(start, "d MMM", { locale: es })}`,
      sourceGranularity: candleGranularity,
    };
  }

  const d = parseISO(`${candle.key}-01`);
  const start = startOfMonth(d);
  const end = endOfMonth(d);
  return {
    granularity: "week",
    startDate: format(start, "yyyy-MM-dd"),
    endDate: format(end, "yyyy-MM-dd"),
    periodLabel: format(start, "MMMM yyyy", { locale: es }),
    highlightKey: candle.key,
    candleLabel: candle.label || format(d, "MMM yyyy", { locale: es }),
    sourceGranularity: candleGranularity,
  };
}

/** Rango de fechas para el modal al hacer clic en una barra del flujo. */
export function resolvePeriodRangeFromBucket(barGranularity, bucketKey) {
  if (!bucketKey) return null;

  if (barGranularity === "day") {
    const d = parseISO(bucketKey);
    const iso = format(d, "yyyy-MM-dd");
    return {
      granularity: "day",
      startDate: iso,
      endDate: iso,
      label: format(d, "EEEE d 'de' MMMM yyyy", { locale: es }),
    };
  }

  if (barGranularity === "week") {
    const start = parseISO(bucketKey);
    const end = endOfWeek(start, { weekStartsOn: 1 });
    return {
      granularity: "week",
      startDate: format(start, "yyyy-MM-dd"),
      endDate: format(end, "yyyy-MM-dd"),
      label: `Semana del ${format(start, "d MMM", { locale: es })} al ${format(end, "d MMM yyyy", { locale: es })}`,
    };
  }

  const d = parseISO(`${bucketKey}-01`);
  const start = startOfMonth(d);
  const end = endOfMonth(d);
  return {
    granularity: "month",
    startDate: format(start, "yyyy-MM-dd"),
    endDate: format(end, "yyyy-MM-dd"),
    label: format(start, "MMMM yyyy", { locale: es }),
  };
}
