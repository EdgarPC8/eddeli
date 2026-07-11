import * as React from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { BarChart } from '@mui/x-charts/BarChart';
import TableRowsIcon from '@mui/icons-material/TableRows';
import CloseIcon from '@mui/icons-material/Close';
import ChartBlockHeader from '../../../../../components/Charts/ChartBlockHeader';
import { ChartSkeleton } from '../../../../../components/ContentSkeleton.jsx';
import { getExpensesForChart } from '../../../../../api/financeRequest';
import { getChartSeriesColors, CHART_SEMANTIC_INDEX } from '../../../../../theme/chartPalette';
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
  { value: 'all', label: 'Todos' },
  { value: 'custom', label: 'Rango meses' },
];

const BAND_SIZE = 10;

function bandLabel(band) {
  const from = (band - 1) * BAND_SIZE + 1;
  const to = band * BAND_SIZE;
  return `Del ${from} al ${to}`;
}

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
  if (period === 'all') {
    return {
      start: null,
      end: null,
      label: 'Todo el historial',
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
  let periodStart = periodBounds.start ? parseISO(periodBounds.start) : null;
  let periodEnd = periodBounds.end ? parseISO(periodBounds.end) : null;

  if (!periodStart || !periodEnd) {
    const dates = expenses
      .map((e) => e?.date)
      .filter(Boolean)
      .map((d) => parseISO(d))
      .filter((d) => !Number.isNaN(d.getTime()));
    if (dates.length) {
      periodStart = new Date(Math.min(...dates.map((d) => d.getTime())));
      periodEnd = new Date(Math.max(...dates.map((d) => d.getTime())));
    } else {
      periodStart = now;
      periodEnd = now;
    }
  }

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

function truncateLabel(name, max = 26) {
  const s = String(name || '');
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

function PurchaseStatsTable({ stats }) {
  return (
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
              <TableCell align="right">
                {Number.isFinite(r.amountPerMonth) ? moneyFmt(r.amountPerMonth) : '—'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}

export default function ExpensePurchaseStats() {
  const theme = useTheme();
  const [period, setPeriod] = React.useState('month');
  const [band, setBand] = React.useState(1);
  const [customFromMonth, setCustomFromMonth] = React.useState(januaryYearMonth());
  const [customToMonth, setCustomToMonth] = React.useState(currentYearMonth());
  const [loading, setLoading] = React.useState(true);
  const [expenses, setExpenses] = React.useState([]);
  const [detailOpen, setDetailOpen] = React.useState(false);

  const periodBounds = React.useMemo(
    () => getPeriodBounds(period, customFromMonth, customToMonth),
    [period, customFromMonth, customToMonth]
  );

  React.useEffect(() => {
    setBand(1);
  }, [period, periodBounds.start, periodBounds.end]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const params = { insumosOnly: true };
        if (periodBounds.start) params.startDate = periodBounds.start;
        if (periodBounds.end) params.endDate = periodBounds.end;
        const { data } = await getExpensesForChart(params);
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

  const totalBands = Math.max(1, Math.ceil(stats.length / BAND_SIZE));

  React.useEffect(() => {
    if (band > totalBands) setBand(1);
  }, [band, totalBands]);

  const bandOptions = React.useMemo(
    () => Array.from({ length: totalBands }, (_, i) => i + 1),
    [totalBands]
  );

  const bandSlice = React.useMemo(() => {
    const start = (band - 1) * BAND_SIZE;
    return stats.slice(start, start + BAND_SIZE);
  }, [stats, band]);

  const rankStart = bandSlice.length ? (band - 1) * BAND_SIZE + 1 : 0;
  const rankEnd = bandSlice.length ? rankStart + bandSlice.length - 1 : 0;

  const summary = React.useMemo(() => {
    const totalProducts = stats.length;
    const totalPurchases = stats.reduce((s, r) => s + r.purchasesCount, 0);
    const totalAmount = stats.reduce((s, r) => s + r.totalAmount, 0);
    const avgTicket = totalPurchases ? totalAmount / totalPurchases : 0;
    return { totalProducts, totalPurchases, totalAmount, avgTicket };
  }, [stats]);

  const chartDataset = React.useMemo(
    () =>
      bandSlice.map((r, idx) => ({
        label: truncateLabel(r.productName),
        fullName: r.productName,
        value: Number(r.totalAmount || 0),
        purchases: r.purchasesCount,
        rank: (band - 1) * BAND_SIZE + idx + 1,
      })),
    [bandSlice, band]
  );

  const barColor = getChartSeriesColors(theme)[CHART_SEMANTIC_INDEX.money] ?? getChartSeriesColors(theme)[0];

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'flex-start', sm: 'flex-start' }}
        justifyContent="space-between"
        spacing={1}
        sx={{ mb: 0.5 }}
      >
        <ChartBlockHeader
          title="Compras de insumos por producto"
          subtitle="Gastos por fecha en Expense (materia prima e insumos). Elige el período y el bloque del ranking."
          sx={{ mb: 0, flex: 1 }}
        />
        <Button
          variant="outlined"
          size="small"
          startIcon={<TableRowsIcon />}
          onClick={() => setDetailOpen(true)}
          disabled={loading || stats.length === 0}
          sx={{ flexShrink: 0, mt: { xs: 0, sm: 0.5 } }}
        >
          Ver detalle
        </Button>
      </Stack>

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

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
          <FormControl size="small" sx={{ minWidth: 130 }} disabled={loading || stats.length === 0}>
            <InputLabel id="expense-stats-band-label">Rango top</InputLabel>
            <Select
              labelId="expense-stats-band-label"
              label="Rango top"
              value={band}
              onChange={(e) => setBand(Number(e.target.value))}
            >
              {bandOptions.map((b) => (
                <MenuItem key={b} value={b}>
                  {bandLabel(b)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {period === 'custom' && (
            <>
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
            </>
          )}
        </Stack>
      </Stack>

      <Alert severity="info" sx={{ py: 0.5, mb: 1.5 }}>
        {loading ? 'Cargando…' : `${periodBounds.label} · solo insumos (materia prima)`}
      </Alert>

      <Stack direction="row" spacing={1} sx={{ mb: 1.5, flexWrap: 'wrap', rowGap: 0.5 }}>
        <Chip label={`Insumos: ${intFmt(summary.totalProducts)}`} size="small" />
        <Chip label={`Compras: ${intFmt(summary.totalPurchases)}`} size="small" />
        <Chip label={`Total: ${moneyFmt(summary.totalAmount)}`} color="primary" size="small" />
        <Chip label={`Ticket medio: ${moneyFmt(summary.avgTicket)}`} color="success" size="small" />
      </Stack>

      <Paper
        variant="outlined"
        sx={{
          p: 1,
          borderRadius: 2,
          bgcolor: alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.04 : 0.02),
        }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, px: 0.5 }}>
          {bandSlice.length > 0
            ? `Posiciones ${rankStart}–${rankEnd} por monto de compra (${stats.length} insumos con movimiento)`
            : `Ranking por monto de compra (${stats.length} insumos con movimiento)`}
        </Typography>

        {loading ? (
          <ChartSkeleton height={220} />
        ) : chartDataset.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
            No hay compras de insumos en este período.
          </Typography>
        ) : (
          <BarChart
            layout="horizontal"
            dataset={chartDataset}
            height={Math.max(200, 40 * chartDataset.length)}
            yAxis={[{ scaleType: 'band', dataKey: 'label', width: 130 }]}
            xAxis={[{ valueFormatter: (v) => moneyFmt(v) }]}
            series={[
              {
                type: 'bar',
                dataKey: 'value',
                label: 'Total comprado',
                valueFormatter: (v) => moneyFmt(v),
                color: barColor,
              },
            ]}
            margin={{ left: 4, right: 12, top: 8, bottom: 24 }}
            slotProps={{
              legend: { hidden: true },
              tooltip: {
                trigger: 'item',
              },
            }}
          />
        )}
      </Paper>

      <Dialog
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        fullWidth
        maxWidth="lg"
        scroll="paper"
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1 }}>
          Detalle de compras de insumos
          <IconButton aria-label="Cerrar" onClick={() => setDetailOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {periodBounds.label} · {intFmt(stats.length)} insumos · Total {moneyFmt(summary.totalAmount)}
          </Typography>
          <PurchaseStatsTable stats={stats} />
          {!loading && stats.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              No hay compras de insumos en este período.
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 2, py: 1.5 }}>
          <Button onClick={() => setDetailOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
