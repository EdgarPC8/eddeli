import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfDay,
  endOfDay,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  addDays,
  addWeeks,
  addMonths,
} from "date-fns";
import { es } from "date-fns/locale";
import { Income, Expense } from "../../models/Finance.js";
import { toFinanceDayKey, financeBucketKey, toChartBusinessDay, buildFinanceDateWhere } from "../../utils/financeDateUtils.js";

const VALID_GRANULARITY = new Set(["day", "week", "month"]);

function round2(n) {
  return Number(Number(n || 0).toFixed(2));
}

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function bucketMeta(date, granularity) {
  const d = new Date(date);
  if (granularity === "day") {
    const start = startOfDay(d);
    return {
      key: format(start, "yyyy-MM-dd"),
      label: format(start, "EEE d MMM", { locale: es }),
      start,
      end: addDays(start, 1),
      time: toChartBusinessDay(start),
    };
  }
  if (granularity === "week") {
    const start = startOfWeek(d, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(d, { weekStartsOn: 1 });
    return {
      key: format(start, "yyyy-MM-dd"),
      label: `${format(start, "d MMM", { locale: es })} – ${format(weekEnd, "d MMM", { locale: es })}`,
      start,
      end: addWeeks(start, 1),
      time: toChartBusinessDay(start),
    };
  }
  const start = startOfMonth(d);
  return {
    key: format(start, "yyyy-MM"),
    label: format(start, "MMM yyyy", { locale: es }),
    start,
    end: addMonths(start, 1),
    time: toChartBusinessDay(start),
  };
}

function buildAllBuckets(granularity, firstTs, lastTs) {
  const start =
    granularity === "day"
      ? startOfDay(firstTs)
      : granularity === "week"
        ? startOfWeek(firstTs, { weekStartsOn: 1 })
        : startOfMonth(firstTs);
  const end =
    granularity === "day"
      ? endOfDay(lastTs)
      : granularity === "week"
        ? endOfWeek(lastTs, { weekStartsOn: 1 })
        : endOfMonth(lastTs);

  const seen = new Set();
  const buckets = [];

  const pushBucket = (d) => {
    const meta = bucketMeta(d, granularity);
    if (seen.has(meta.key)) return;
    seen.add(meta.key);
    buckets.push(meta);
  };

  if (granularity === "day") {
    for (const d of eachDayOfInterval({ start, end })) pushBucket(d);
  } else if (granularity === "week") {
    for (const ws of eachWeekOfInterval({ start, end }, { weekStartsOn: 1 })) pushBucket(ws);
  } else {
    for (const m of eachMonthOfInterval({ start, end })) pushBucket(m);
  }

  return buckets;
}

function openingBalanceBefore(movements, beforeDate) {
  let balance = 0;
  for (const m of movements) {
    if (m.ts < beforeDate) balance += m.delta;
    else break;
  }
  return balance;
}

function buildCandles(movements, buckets, granularity) {
  if (!buckets.length) return [];

  const movementsByKey = new Map();
  for (const m of movements) {
    const key = financeBucketKey(m.ts, granularity);
    if (!key) continue;
    if (!movementsByKey.has(key)) movementsByKey.set(key, []);
    movementsByKey.get(key).push(m);
  }

  let balance = openingBalanceBefore(movements, buckets[0].start);
  const candles = [];

  for (const bucket of buckets) {
    const open = round2(balance);
    let high = balance;
    let low = balance;

    for (const m of movementsByKey.get(bucket.key) || []) {
      balance += m.delta;
      high = Math.max(high, balance);
      low = Math.min(low, balance);
    }

    const close = round2(balance);
    candles.push({
      key: bucket.key,
      label: bucket.label,
      time: bucket.time,
      open,
      high: round2(high),
      low: round2(low),
      close,
      overdraft: low < 0,
      bullish: close >= open,
    });
  }

  return candles;
}

export const getCashFlowCandles = async (req, res) => {
  try {
    const granularity = VALID_GRANULARITY.has(req.query.granularity)
      ? req.query.granularity
      : "day";

    const limit = Math.min(50, Math.max(5, parseInt(req.query.limit, 10) || 25));
    const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);

    const [incomes, expenses] = await Promise.all([
      Income.findAll({ attributes: ["date", "amount"], raw: true }),
      Expense.findAll({ attributes: ["date", "amount"], raw: true }),
    ]);

    const movements = [
      ...incomes.map((r) => ({
        dayKey: toFinanceDayKey(r.date),
        ts: new Date(r.date),
        delta: toNum(r.amount),
      })),
      ...expenses.map((r) => ({
        dayKey: toFinanceDayKey(r.date),
        ts: new Date(r.date),
        delta: -toNum(r.amount),
      })),
    ]
      .filter((m) => m.dayKey)
      .sort((a, b) => a.ts - b.ts);

    if (!movements.length) {
      return res.json({
        granularity,
        candles: [],
        openingBalance: 0,
        totalCandles: 0,
        hasMore: false,
        limit,
        offset,
        currentBalance: 0,
      });
    }

    const allBuckets = buildAllBuckets(
      granularity,
      movements[0].ts,
      movements[movements.length - 1].ts
    );

    const totalCandles = allBuckets.length;
    const sliceEnd = Math.max(0, totalCandles - offset);
    const sliceStart = Math.max(0, sliceEnd - limit);
    const windowBuckets = allBuckets.slice(sliceStart, sliceEnd);
    const candles = buildCandles(movements, windowBuckets, granularity);

    const openingBalance = windowBuckets.length
      ? openingBalanceBefore(movements, windowBuckets[0].start)
      : 0;

    let currentBalance = 0;
    for (const m of movements) currentBalance += m.delta;

    return res.json({
      granularity,
      candles,
      openingBalance: round2(openingBalance),
      currentBalance: round2(currentBalance),
      totalCandles,
      hasMore: sliceStart > 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error("getCashFlowCandles:", error);
    return res.status(500).json({
      message: "Error al obtener velas de flujo de caja",
      error: error.message,
    });
  }
};
