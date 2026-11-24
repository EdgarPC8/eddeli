import { Op } from "sequelize";
import {
  format,
  parseISO,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  startOfDay,
  endOfDay,
  subWeeks,
  subMonths,
  isValid,
} from "date-fns";
import { es } from "date-fns/locale";
import { Income, Expense } from "../../models/Finance.js";
import { financeBucketKey, buildPaddedFinanceDateColumnWhere, filterByFinanceDayKeyRange } from "../../utils/financeDateUtils.js";
import { addMoney, subMoney, round2Money } from "../../utils/moneyPrecision.js";
const VALID_GRANULARITY = new Set(["day", "week", "month"]);

function round2(n) {
  return round2Money(n);
}

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function parseDateParam(value) {
  if (!value) return null;
  const d = parseISO(String(value));
  return isValid(d) ? d : null;
}

function getDefaultRange(granularity) {
  const now = new Date();
  if (granularity === "day") {
    return {
      start: startOfWeek(now, { weekStartsOn: 1 }),
      end: endOfWeek(now, { weekStartsOn: 1 }),
      periodLabel: "Semana actual (día a día)",
    };
  }
  if (granularity === "week") {
    const end = endOfWeek(now, { weekStartsOn: 1 });
    const start = startOfWeek(subWeeks(now, 7), { weekStartsOn: 1 });
    return { start, end, periodLabel: "Últimas 8 semanas" };
  }
  const end = endOfMonth(now);
  const start = startOfMonth(subMonths(now, 5));
  return { start, end, periodLabel: "Últimos 6 meses" };
}

function bucketKeyFromDate(date, granularity) {
  return financeBucketKey(date, granularity);
}

function buildEmptyBuckets(granularity, start, end) {
  const map = new Map();

  const base = (key, label) => ({
    key,
    label,
    income: 0,
    expense: 0,
    merma: 0,
    expenseTotal: 0,
    netBalance: 0,
    marginPct: 0,
  });

  if (granularity === "day") {
    for (const d of eachDayOfInterval({ start, end })) {
      const key = format(d, "yyyy-MM-dd");
      map.set(key, base(key, format(d, "EEE d", { locale: es })));
    }
    return map;
  }

  if (granularity === "week") {
    for (const ws of eachWeekOfInterval({ start, end }, { weekStartsOn: 1 })) {
      const key = format(ws, "yyyy-MM-dd");
      const we = endOfWeek(ws, { weekStartsOn: 1 });
      const label = `${format(ws, "d MMM", { locale: es })} – ${format(we, "d MMM", { locale: es })}`;
      map.set(key, base(key, label));
    }
    return map;
  }

  for (const m of eachMonthOfInterval({ start, end })) {
    const key = format(startOfMonth(m), "yyyy-MM");
    map.set(key, base(key, format(m, "MMM yyyy", { locale: es })));
  }
  return map;
}

function finalizeBuckets(map) {
  const buckets = [...map.values()].map((b) => {
    const income = round2(b.income);
    const expense = round2(b.expense);
    const expenseTotal = expense;
    const netBalance = subMoney(income, expenseTotal);
    const marginPct = income > 0 ? round2((netBalance / income) * 100) : 0;
    return {
      ...b,
      income,
      expense,
      merma: 0,
      expenseTotal,
      netBalance,
      marginPct,
    };
  });

  const totals = buckets.reduce(
    (acc, b) => {
      acc.income = addMoney(acc.income, b.income);
      acc.expense = addMoney(acc.expense, b.expense);
      acc.expenseTotal = addMoney(acc.expenseTotal, b.expenseTotal);
      return acc;
    },
    { income: 0, expense: 0, expenseTotal: 0 }
  );

  totals.merma = 0;
  totals.netBalance = subMoney(totals.income, totals.expenseTotal);
  totals.marginPct = totals.income > 0 ? round2((totals.netBalance / totals.income) * 100) : 0;

  return { buckets, totals };
}

function addToBucket(map, date, granularity, field, amount) {
  const key = bucketKeyFromDate(date, granularity);
  if (!map.has(key)) return;
  const bucket = map.get(key);
  bucket[field] = addMoney(bucket[field], amount);
}

export const getCashFlowMirror = async (req, res) => {
  try {
    const granularity = VALID_GRANULARITY.has(req.query.granularity)
      ? req.query.granularity
      : "day";

    const customStart = parseDateParam(req.query.startDate);
    const customEnd = parseDateParam(req.query.endDate);
    const defaults = getDefaultRange(granularity);
    const start = customStart ? startOfDay(customStart) : defaults.start;
    const end = customEnd ? endOfDay(customEnd) : defaults.end;

    const startIso = format(start, "yyyy-MM-dd");
    const endIso = format(end, "yyyy-MM-dd");

    const bucketMap = buildEmptyBuckets(granularity, start, end);

    const padded = buildPaddedFinanceDateColumnWhere(startIso, endIso, 1);
    const dateClause = padded?.where ? { [Op.and]: [padded.where] } : {};

    const [incomesRaw, expensesRaw] = await Promise.all([
      Income.findAll({
        where: dateClause,
        attributes: ["date", "amount"],
        raw: true,
      }),
      Expense.findAll({
        where: dateClause,
        attributes: ["date", "amount"],
        raw: true,
      }),
    ]);

    const incomes = padded
      ? filterByFinanceDayKeyRange(incomesRaw, padded.startKey, padded.endKey)
      : incomesRaw;
    const expenses = padded
      ? filterByFinanceDayKeyRange(expensesRaw, padded.startKey, padded.endKey)
      : expensesRaw;

    for (const row of incomes) {
      addToBucket(bucketMap, row.date, granularity, "income", row.amount);
    }

    for (const row of expenses) {
      addToBucket(bucketMap, row.date, granularity, "expense", row.amount);
    }

    const { buckets, totals } = finalizeBuckets(bucketMap);

    return res.json({
      granularity,
      periodLabel: defaults.periodLabel,
      startDate: startIso,
      endDate: endIso,
      buckets,
      totals,
    });
  } catch (error) {
    console.error("getCashFlowMirror:", error);
    return res.status(500).json({
      message: "Error al obtener flujo de ingresos y egresos",
      error: error.message,
    });
  }
};
