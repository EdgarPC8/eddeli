import * as React from 'react';
import {
  Alert,
  Box,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import ChartBlockHeader from '../../../../../components/Charts/ChartBlockHeader';
import { getExpensesForChart } from '../../../../../api/financeRequest';
import {
  parseISO,
  format,
  differenceInCalendarDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
} from 'date-fns';
import { es } from 'date-fns/locale';

const moneyFmt = (v) =>
  new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(
    Number(v || 0)
  );
const intFmt = (v) => new Intl.NumberFormat('es-EC', { maximumFractionDigits: 0 }).format(Number(v || 0));
const dayFmt = (d) => (d && !Number.isNaN(d) ? `${intFmt(d)} días` : '—');
const dateFmt = (iso) => {
  if (!iso) return '—';
  const d = parseISO(iso);
  if (Number.isNaN(d?.getTime?.())) return iso;
  return format(d, "d 'de' MMM yyyy", { locale: es });
};

const PERIOD_OPTIONS = [
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mes' },
  { value: 'year', label: 'Año' },
  { value: 'custom', label: 'Rango meses' },
];

function currentYearMonth() {
  return format(new Date(), 'yyyy-MM');
}

function januaryYearMonth() {
  return `${new Date().getFullYear()}-01`;
}

function toISODate(d) {
  return format(d, 'yyyy-MM-dd');
}

function monthRangeToBounds(fromYm, toYm) {
  const [fy, fm] = fromYm.split('-').map(Number);
  const [ty, tm] = toYm.split('-').map(Number);
  let start = startOfMonth(new Date(fy, fm - 1, 1));
  let end = endOfMonth(new Date(ty, tm - 1, 1));
  if (start > end) {
    const tmp = start;
    start = startOfMonth(end);
    end = endOfMonth(tmp);
  }
  const label = `${format(start, 'MMM yyyy', { locale: es })} → ${format(end, 'MMM yyyy', { locale: es })}`;
  return { start: toISODate(start), end: toISODate(end), label };
}

function getPeriodBounds(period, customFromMonth, customToMonth) {
  const now = new Date();
  if (period === 'week') {
    const start = startOfWeek(now, { weekStartsOn: 1 });
    const end = endOfWeek(now, { weekStartsOn: 1 });
    return {
      start: toISODate(start),
      end: toISODate(end),
      label: `Semana actual (${format(start, 'd MMM', { locale: es })} – ${format(end, 'd MMM yyyy', { locale: es })})`,
    };
  }
  if (period === 'month') {
    const start = startOfMonth(now);
    const end = endOfMonth(now);
    return {
      start: toISODate(start),
      end: toISODate(end),
      label: `Mes actual (${format(start, 'MMMM yyyy', { locale: es })})`,
    };
  }
  if (period === 'year') {
    const start = startOfYear(now);
    const end = endOfYear(now);
    return {
      start: toISODate(start),
      end: toISODate(end),
      label: `Año actual (${format(start, 'yyyy')})`,
    };
  }
  return monthRangeToBounds(customFromMonth, customToMonth);
}

function median(nums) {
  if (!nums.length) return NaN;
  const a = [...nums].sort((x, y) => x - y);
  const mid = Math.floor(a.length / 2);
  return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
}

function computeStats(expenses, periodBounds) {
  const map = new Map();
  for (const e of expenses) {
    if (e?.referenceId == null) continue;
    const key = e.referenceId;
    if (!map.has(key)) {
      map.set(key, { productId: key, productName: e.productName || `Producto #${key}`, rows: [] });
    }
    map.get(key).rows.push(e);
  }

  const now = new Date();
  const periodStart = parseISO(periodBounds.start);
  const periodEnd = parseISO(periodBounds.end);
  const periodDays = Math.max(1, differenceInCalendarDays(periodEnd, periodStart) + 1);
  const periodMonths = periodDays / 30.4375;
  const out = [];

  for (const g of map.values()) {
    const rows = [...g.rows].sort((a, b) => new Date(a.date) - new Date(b.date));
    const purchasesCount = rows.length;
    const totalAmount = rows.reduce((acc, r) => acc + Number(r.amount || 0), 0);
    const meanAmount = purchasesCount ? totalAmount / purchasesCount : 0;

    const firstDate = rows[0]?.date || null;
    const lastDate = rows[rows.length - 1]?.date || null;

    const intervals = [];
    for (let i = 1; i < rows.length; i++) {
      const prev = parseISO(rows[i - 1].date);
      const curr = parseISO(rows[i].date);
      const diff = differenceInCalendarDays(curr, prev);
      if (Number.isFinite(diff)) intervals.push(diff);
    }
    const meanIntervalDays = intervals.length ? intervals.reduce((a, b) => a + b, 0) / intervals.length : NaN;
    const medianIntervalDays = intervals.length ? median(intervals) : NaN;
    const minIntervalDays = intervals.length ? Math.min(...intervals) : NaN;
    const maxIntervalDays = intervals.length ? Math.max(...intervals) : NaN;

    const daysSinceLastPurchase = lastDate ? differenceInCalendarDays(now, parseISO(lastDate)) : NaN;
    const purchasesPerMonth = purchasesCount / periodMonths;
    const amountPerMonth = totalAmount / periodMonths;

    out.push({
      productId: g.productId,
      productName: g.productName,
      purchasesCount,
      totalAmount,
      meanAmount,
      firstDate,
      lastDate,
      meanIntervalDays,
      medianIntervalDays,
      minIntervalDays,
      maxIntervalDays,
      daysSinceLastPurchase,
      purchasesPerMonth,
      amountPerMonth,
    });
  }

  out.sort((a, b) => b.totalAmount - a.totalAmount);
  return out;
}

export default function ExpensePurchaseStats() {
  const [period, setPeriod] = React.useState('month');
  const [customFromMonth, setCustomFromMonth] = React.useState(januaryYearMonth());
  const [customToMonth, setCustomToMonth] = React.useState(currentYearMonth());
  const [loading, setLoading] = React.useState(true);
  const [expenses, setExpenses] = React.useState([]);

  const periodBounds = React.useMemo(
    () => getPeriodBounds(period, customFromMonth, customToMonth),
    [period, customFromMonth, customToMonth]
  );

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data } = await getExpensesForChart({
          startDate: periodBounds.start,
          endDate: periodBounds.end,
        });
        if (!cancelled) setExpenses(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error('ExpensePurchaseStats:', e);
        if (!cancelled) setExpenses([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [periodBounds.start, periodBounds.end]);

  const stats = React.useMemo(() => computeStats(expenses, periodBounds), [expenses, periodBounds]);

  const summary = React.useMemo(() => {
    const totalProducts = stats.length;
    const totalPurchases = stats.reduce((s, r) => s + r.purchasesCount, 0);
    const totalAmount = stats.reduce((s, r) => s + r.totalAmount, 0);
    const avgTicket = totalPurchases ? totalAmount / totalPurchases : 0;
    return { totalProducts, totalPurchases, totalAmount, avgTicket };
  }, [stats]);

  return (
    <Box>
      <ChartBlockHeader
        title="Compras / gastos agregados por producto"
        subtitle="Gastos con producto asociado en el período elegido. Intervalos entre compras, ticket medio y ritmo mensual según la duración del rango."
      />

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        justifyContent="space-between"
        spacing={1}
        sx={{ mt: 1, mb: 1 }}
        flexWrap="wrap"
        useFlexGap
      >
        <ToggleButtonGroup
          exclusive
          size="small"
          value={period}
          onChange={(_, v) => {
            if (v) setPeriod(v);
          }}
        >
          {PERIOD_OPTIONS.map((opt) => (
            <ToggleButton key={opt.value} value={opt.value} sx={{ textTransform: 'none', px: 1.5 }}>
              {opt.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>

        {period === 'custom' && (
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <TextField
              size="small"
              type="month"
              label="Desde mes"
              value={customFromMonth}
              onChange={(e) => setCustomFromMonth(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              size="small"
              type="month"
              label="Hasta mes"
              value={customToMonth}
              onChange={(e) => setCustomToMonth(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Stack>
        )}
      </Stack>

      <Alert severity="info" sx={{ py: 0.5, mb: 1.5 }}>
        {loading ? 'Cargando…' : periodBounds.label}
      </Alert>

      <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: 'wrap', rowGap: 0.5 }}>
        <Chip label={`Productos: ${intFmt(summary.totalProducts)}`} size="small" />
        <Chip label={`Compras: ${intFmt(summary.totalPurchases)}`} size="small" />
        <Chip label={`Total: ${moneyFmt(summary.totalAmount)}`} color="primary" size="small" />
        <Chip label={`Ticket medio: ${moneyFmt(summary.avgTicket)}`} color="success" size="small" />
      </Stack>

      <Box sx={{ overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 960 }}>
          <TableHead>
            <TableRow>
              <TableCell>Producto</TableCell>
              <TableCell align="right">Compras</TableCell>
              <TableCell align="right">Total</TableCell>
              <TableCell align="right">Media $</TableCell>
              <TableCell align="right">1ra compra</TableCell>
              <TableCell align="right">Última compra</TableCell>
              <TableCell align="right">Δ Promedio</TableCell>
              <TableCell align="right">Δ Mediana</TableCell>
              <TableCell align="right">Δ Min</TableCell>
              <TableCell align="right">Δ Max</TableCell>
              <TableCell align="right">Desde última</TableCell>
              <TableCell align="right">Compras/mes</TableCell>
              <TableCell align="right">$ / mes</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {stats.map((r) => (
              <TableRow key={r.productId} hover>
                <TableCell>{r.productName}</TableCell>
                <TableCell align="right">{intFmt(r.purchasesCount)}</TableCell>
                <TableCell align="right">{moneyFmt(r.totalAmount)}</TableCell>
                <TableCell align="right">{moneyFmt(r.meanAmount)}</TableCell>
                <TableCell align="right">{dateFmt(r.firstDate)}</TableCell>
                <TableCell align="right">{dateFmt(r.lastDate)}</TableCell>
                <TableCell align="right">{dayFmt(r.meanIntervalDays)}</TableCell>
                <TableCell align="right">{dayFmt(r.medianIntervalDays)}</TableCell>
                <TableCell align="right">{dayFmt(r.minIntervalDays)}</TableCell>
                <TableCell align="right">{dayFmt(r.maxIntervalDays)}</TableCell>
                <TableCell align="right">{dayFmt(r.daysSinceLastPurchase)}</TableCell>
                <TableCell align="right">{r.purchasesPerMonth ? r.purchasesPerMonth.toFixed(2) : '—'}</TableCell>
                <TableCell align="right">{Number.isFinite(r.amountPerMonth) ? moneyFmt(r.amountPerMonth) : '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>

      {!loading && stats.length === 0 && (
        <Box sx={{ mt: 2, color: 'text.secondary' }}>
          No hay compras con producto asociado en este período.
        </Box>
      )}
    </Box>
  );
}
