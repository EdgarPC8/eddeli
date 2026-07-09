import { Op } from "sequelize";
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  eachDayOfInterval,
  eachMonthOfInterval,
  startOfDay,
  endOfDay,
  format,
} from "date-fns";
import { OrderItem } from "../../models/Orders.js";
import { Income } from "../../models/Finance.js";
import { InventoryProduct } from "../../models/Inventory.js";
import { buildFinanceDateColumnWhere, financeBucketKey, toFinanceDayKey } from "../../utils/financeDateUtils.js";

const RANK_BAND_SIZE = 10;

const VALID_PERIODS = new Set(["week", "month", "year"]);

function parseRankBand(value) {
  const band = Number.parseInt(String(value ?? 1), 10);
  if (!Number.isFinite(band) || band < 1) return 1;
  return band;
}

function bandToRange(band) {
  const rankStart = (band - 1) * RANK_BAND_SIZE + 1;
  const rankEnd = band * RANK_BAND_SIZE;
  return { band, rankStart, rankEnd, rankBandSize: RANK_BAND_SIZE };
}

function getPeriodConfig(period) {
  const now = new Date();
  if (period === "week") {
    return {
      period,
      label: "Semana actual",
      granularity: "day",
      start: startOfDay(startOfWeek(now, { weekStartsOn: 1 })),
      end: endOfDay(endOfWeek(now, { weekStartsOn: 1 })),
    };
  }
  if (period === "month") {
    return {
      period,
      label: "Mes actual",
      granularity: "day",
      start: startOfDay(startOfMonth(now)),
      end: endOfDay(endOfMonth(now)),
    };
  }
  return {
    period,
    label: "Año actual",
    granularity: "month",
    start: startOfDay(startOfYear(now)),
    end: endOfDay(endOfYear(now)),
  };
}

function getBuckets({ start, end, granularity }) {
  if (granularity === "day") {
    return eachDayOfInterval({ start, end }).map((d) => ({
      key: format(d, "yyyy-MM-dd"),
      start: startOfDay(d),
      end: endOfDay(d),
    }));
  }
  return eachMonthOfInterval({ start, end }).map((d) => ({
    key: format(startOfMonth(d), "yyyy-MM-dd"),
    start: startOfDay(startOfMonth(d)),
    end: endOfDay(endOfMonth(d)),
  }));
}

function roundQty(n) {
  return Number(Number(n || 0).toFixed(4));
}

function roundAmt(n) {
  return Number(Number(n || 0).toFixed(2));
}

async function loadProductNames(ids) {
  if (!ids.length) return {};
  const rows = await InventoryProduct.findAll({
    where: { id: { [Op.in]: ids } },
    attributes: ["id", "name"],
  });
  const map = {};
  for (const p of rows) map[p.id] = p.name;
  return map;
}

function buildBundle(rows, periodConfig, rankBand, { getProductId, getDate, getQty, getAmount }) {
  const { rankStart, rankEnd } = bandToRange(rankBand);
  const sliceStart = rankStart - 1;
  const sliceEnd = rankEnd;

  const totals = new Map();
  for (const row of rows) {
    const pid = getProductId(row);
    if (pid == null) continue;
    const qty = getQty(row);
    const amt = getAmount(row);
    if (!totals.has(pid)) totals.set(pid, { qty: 0, amt: 0 });
    const t = totals.get(pid);
    t.qty += qty;
    t.amt += amt;
  }

  const ranked = [...totals.entries()].sort(
    (a, b) => b[1].qty - a[1].qty || b[1].amt - a[1].amt
  );
  const totalRanked = ranked.length;
  const bandSlice = ranked.slice(sliceStart, sliceEnd);
  const topIds = bandSlice.map(([id]) => id);
  const topIdSet = new Set(topIds);

  const actualRankStart = bandSlice.length ? rankStart : null;
  const actualRankEnd = bandSlice.length ? rankStart + bandSlice.length - 1 : null;

  const buckets = getBuckets(periodConfig);
  const dataset = [];
  const datasetAmount = [];

  for (const bucket of buckets) {
    const qtyPoint = { date: bucket.key };
    const amtPoint = { date: bucket.key };
    let bucketTotal = 0;

    for (const row of rows) {
      const rowBucketKey =
        periodConfig.granularity === "day"
          ? toFinanceDayKey(getDate(row))
          : financeBucketKey(getDate(row), periodConfig.granularity);
      if (!rowBucketKey || rowBucketKey !== bucket.key) continue;
      const pid = getProductId(row);
      if (!topIdSet.has(pid)) continue;
      const qty = getQty(row);
      const amt = getAmount(row);
      bucketTotal += amt + qty;
      const k = String(pid);
      qtyPoint[k] = roundQty((qtyPoint[k] || 0) + qty);
      amtPoint[k] = roundAmt((amtPoint[k] || 0) + amt);
    }

    if (bucketTotal <= 0) continue;

    dataset.push(qtyPoint);
    datasetAmount.push(amtPoint);
  }

  return {
    period: periodConfig.period,
    periodLabel: periodConfig.label,
    granularity: periodConfig.granularity,
    rankBand,
    rankStart: actualRankStart,
    rankEnd: bandSlice.length ? actualRankEnd : rankStart - 1,
    rankBandSize: RANK_BAND_SIZE,
    totalRanked,
    products: [],
    dataset,
    datasetAmount,
    _topIds: topIds,
    _totals: totals,
  };
}

async function finalizeBundle(partial) {
  const nameMap = await loadProductNames(partial._topIds);
  const products = partial._topIds.map((id, index) => {
    const t = partial._totals?.get(id);
    return {
      id,
      name: nameMap[id] || `Producto #${id}`,
      rank: partial.rankStart + index,
      totalQty: roundQty(t?.qty ?? 0),
      totalAmt: roundAmt(t?.amt ?? 0),
    };
  });
  const { _topIds, _totals, ...rest } = partial;
  return { ...rest, products };
}

async function buildSalesBundle(periodConfig, rankBand) {
  const { start, end } = periodConfig;

  const dateClause = buildFinanceDateColumnWhere(start, end);
  const incomeWhere = {
    referenceType: "order_item",
    referenceId: { [Op.ne]: null },
    ...(dateClause ? { [Op.and]: [dateClause] } : {}),
  };

  const incomes = await Income.findAll({
    where: incomeWhere,
    attributes: ["date", "amount", "referenceId"],
    raw: true,
  });

  if (!incomes.length) {
    const partial = buildBundle([], periodConfig, rankBand, {
      getProductId: () => null,
      getDate: () => null,
      getQty: () => 0,
      getAmount: () => 0,
    });
    return finalizeBundle(partial);
  }

  const itemIds = [...new Set(incomes.map((i) => i.referenceId))];
  const items = await OrderItem.findAll({
    where: { id: { [Op.in]: itemIds } },
    attributes: ["id", "productId", "quantity", "price"],
    include: [
      {
        model: InventoryProduct,
        as: "ERP_inventory_product",
        attributes: [],
        required: true,
        where: { type: "final" },
      },
    ],
  });
  const itemById = new Map(items.map((it) => [it.id, it]));

  const rows = [];
  for (const inc of incomes) {
    const item = itemById.get(inc.referenceId);
    if (!item) continue;
    rows.push({
      productId: item.productId,
      date: inc.date,
      quantity: item.quantity,
      amount: Number(inc.amount ?? 0),
    });
  }

  const partial = buildBundle(rows, periodConfig, rankBand, {
    getProductId: (r) => r.productId,
    getDate: (r) => r.date,
    getQty: (r) => Number(r.quantity || 0),
    getAmount: (r) => Number(r.amount || 0),
  });

  return finalizeBundle(partial);
}

export const getProductSeriesCharts = async (req, res) => {
  try {
    const period = VALID_PERIODS.has(req.query.period) ? req.query.period : "month";
    const rankBand = parseRankBand(req.query.band);
    const periodConfig = getPeriodConfig(period);
    const range = bandToRange(rankBand);

    const sales = await buildSalesBundle(periodConfig, rankBand);

    const totalRanked = sales.totalRanked ?? 0;
    const totalBands = Math.max(1, Math.ceil(totalRanked / RANK_BAND_SIZE));

    res.json({
      period,
      band: rankBand,
      rankStart: range.rankStart,
      rankEnd: range.rankEnd,
      rankBandSize: RANK_BAND_SIZE,
      totalRanked,
      totalBands,
      periodLabel: periodConfig.label,
      granularity: periodConfig.granularity,
      sales,
    });
  } catch (error) {
    console.error("getProductSeriesCharts:", error);
    res.status(500).json({ message: "Error al obtener series de productos" });
  }
};
