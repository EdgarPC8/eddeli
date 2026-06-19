import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Grid,
  Paper,
  Stack,
  Chip,
  LinearProgress,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { useTheme, alpha } from '@mui/material/styles';
import {
  format,
  isSameMonth,
} from 'date-fns';
import { es } from 'date-fns/locale';
import ChartBlockHeader from '../../../../../components/Charts/ChartBlockHeader';
import { getChartSeriesColors, CHART_SEMANTIC_INDEX } from '../../../../../theme/chartPalette';
import { getCalendarYearSummaryRequest } from '../../../../../api/financeRequest';

const VIEW_ALL = 'all';
const VIEW_INCOME = 'income';

const emptyMetrics = () => ({
  ordersAmount: 0,
  ordersCount: 0,
  posSalesAmount: 0,
  posSalesCount: 0,
  collectedAmount: 0,
  expensesAmount: 0,
});

function roundMoney(n) {
  return Number(Number(n ?? 0).toFixed(2));
}

function pct(value, max) {
  if (!max || max <= 0) return 0;
  return Math.min(100, (Number(value) / max) * 100);
}

function incomeTotal(m) {
  return Number(m.posSalesAmount ?? 0) + Number(m.collectedAmount ?? 0);
}

function hasMonthData(m, isIncomeView) {
  if (isIncomeView) {
    return m.posSalesCount > 0 || m.collectedAmount > 0;
  }
  return (
    m.ordersCount > 0 ||
    m.posSalesCount > 0 ||
    m.collectedAmount > 0 ||
    m.expensesAmount > 0
  );
}

function ValueStrip({ valueText, barPercent, accentBorder, accentValue, track, theme }) {
  const fill = accentValue ?? accentBorder;
  return (
    <Box
      sx={{
        borderLeft: 3,
        borderColor: accentBorder,
        pl: 0.65,
        pr: 0.35,
        py: 0.35,
        borderRadius: '0 8px 8px 0',
        bgcolor: alpha(accentBorder, theme.palette.mode === 'dark' ? 0.12 : 0.07),
      }}
    >
      <Typography
        variant="body2"
        sx={{
          fontWeight: 800,
          fontSize: '0.68rem',
          lineHeight: 1.15,
          color: fill,
          textAlign: 'center',
        }}
      >
        {valueText}
      </Typography>
      <LinearProgress
        variant="determinate"
        value={barPercent}
        sx={{
          mt: 0.35,
          height: 3,
          borderRadius: 1,
          bgcolor: track,
          '& .MuiLinearProgress-bar': {
            borderRadius: 1,
            bgcolor: fill,
          },
        }}
      />
    </Box>
  );
}

export default function YearFinanceOverviewChart({
  initialYear = new Date().getFullYear(),
  onMonthSelect,
}) {
  const theme = useTheme();
  const [year, setYear] = useState(initialYear);
  const [months, setMonths] = useState({});
  const [totals, setTotals] = useState({ orders: 0, posSales: 0, collected: 0, expenses: 0 });
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState(VIEW_ALL);

  const isIncomeView = viewMode === VIEW_INCOME;

  const chartColors = useMemo(() => {
    const p = theme.palette;
    const s = getChartSeriesColors(theme);
    return {
      orders: s[CHART_SEMANTIC_INDEX.primary],
      orderMoney: s[CHART_SEMANTIC_INDEX.money],
      posSales: theme.palette.info.main,
      collected: s[CHART_SEMANTIC_INDEX.positive],
      incomeTotal: theme.palette.warning.main,
      expense: p.error.main,
      track: alpha(p.text.primary, theme.palette.mode === 'dark' ? 0.2 : 0.12),
    };
  }, [theme]);

  const moneyFmt = useCallback(
    (v) =>
      new Intl.NumberFormat('es-EC', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 2,
      }).format(v ?? 0),
    []
  );

  const moneyFmtCompact = useCallback(
    (v) =>
      new Intl.NumberFormat('es-EC', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }).format(v ?? 0),
    []
  );

  const monthDates = useMemo(
    () => Array.from({ length: 12 }, (_, i) => new Date(year, i, 1)),
    [year]
  );

  const metricsList = useMemo(
    () =>
      monthDates.map((date) => {
        const key = format(date, 'yyyy-MM');
        return { date, key, ...(months[key] ?? emptyMetrics()) };
      }),
    [monthDates, months]
  );

  const maxOA = Math.max(1, ...metricsList.map((m) => m.ordersAmount));
  const maxPA = Math.max(1, ...metricsList.map((m) => m.posSalesAmount));
  const maxCA = Math.max(1, ...metricsList.map((m) => m.collectedAmount));
  const maxIA = Math.max(1, ...metricsList.map((m) => incomeTotal(m)));
  const maxEA = Math.max(1, ...metricsList.map((m) => m.expensesAmount));

  const yearIncomeTotal = useMemo(
    () => roundMoney((totals.posSales ?? 0) + (totals.collected ?? 0)),
    [totals]
  );

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await getCalendarYearSummaryRequest(year);
        if (!cancelled) {
          setMonths(data?.months ?? {});
          setTotals(data?.totals ?? { orders: 0, posSales: 0, collected: 0, expenses: 0 });
        }
      } catch (err) {
        console.error('Error resumen anual:', err);
        if (!cancelled) {
          setMonths({});
          setTotals({ orders: 0, posSales: 0, collected: 0, expenses: 0 });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [year]);

  const handleMonthClick = useCallback(
    (date) => {
      onMonthSelect?.(date);
    },
    [onMonthSelect]
  );

  const now = new Date();

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2 }, position: 'relative', minWidth: 0 }}>
      {loading && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            zIndex: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: alpha(theme.palette.background.paper, 0.6),
            borderRadius: 2,
          }}
        >
          <CircularProgress size={28} />
        </Box>
      )}

      <ChartBlockHeader
        title="Resumen anual por mes"
        subtitle={
          isIncomeView
            ? 'Vista ingresos: caja, cobranzas y total por mes. Clic en un mes para ver el calendario abajo.'
            : 'Pedidos, caja, cobranzas y gastos por mes. Clic en un mes para abrirlo en el calendario.'
        }
        sx={{ mb: 0.75 }}
      />

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 1,
          gap: 1,
          flexWrap: 'wrap',
        }}
      >
        <Button
          size="small"
          variant="outlined"
          disabled={loading}
          onClick={() => setYear((y) => y - 1)}
        >
          Año anterior
        </Button>
        <Typography variant="subtitle1" sx={{ flex: 1, textAlign: 'center', fontWeight: 700 }}>
          {year}
        </Typography>
        <Button
          size="small"
          variant="outlined"
          disabled={loading}
          onClick={() => setYear((y) => y + 1)}
        >
          Año siguiente
        </Button>
      </Box>

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', sm: 'center' }}
        spacing={1}
        sx={{ mb: 1 }}
      >
        <ToggleButtonGroup
          exclusive
          size="small"
          value={viewMode}
          onChange={(_, v) => { if (v) setViewMode(v); }}
          sx={{ flexWrap: 'wrap' }}
        >
          <ToggleButton value={VIEW_ALL} sx={{ textTransform: 'none', gap: 0.75 }}>
            <ViewModuleIcon fontSize="small" />
            Todo
          </ToggleButton>
          <ToggleButton value={VIEW_INCOME} sx={{ textTransform: 'none', gap: 0.75 }}>
            <TrendingUpIcon fontSize="small" />
            Ingresos
          </ToggleButton>
        </ToggleButtonGroup>

        <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', rowGap: 0.5 }}>
          {!isIncomeView && (
            <Chip size="small" label="$ pedido" sx={{ bgcolor: chartColors.orderMoney, color: theme.palette.getContrastText(chartColors.orderMoney) }} />
          )}
          <Chip size="small" label="$ caja" sx={{ bgcolor: chartColors.posSales, color: theme.palette.getContrastText(chartColors.posSales) }} />
          <Chip size="small" label="$ cobranzas" sx={{ bgcolor: chartColors.collected, color: theme.palette.getContrastText(chartColors.collected) }} />
          <Chip size="small" label="$ total" sx={{ bgcolor: chartColors.incomeTotal, color: theme.palette.getContrastText(chartColors.incomeTotal) }} />
          {!isIncomeView && (
            <Chip size="small" label="$ gastos" sx={{ bgcolor: chartColors.expense, color: theme.palette.getContrastText(chartColors.expense) }} />
          )}
          {isIncomeView && (
            <Chip
              size="small"
              icon={<TrendingUpIcon />}
              label={`Total año: ${moneyFmt(yearIncomeTotal)}`}
              sx={{
                fontWeight: 700,
                bgcolor: alpha(chartColors.incomeTotal, 0.12),
                color: chartColors.incomeTotal,
                border: '1px solid',
                borderColor: alpha(chartColors.incomeTotal, 0.35),
              }}
            />
          )}
        </Stack>
      </Stack>

      <Grid container spacing={1}>
        {metricsList.map((m) => {
          const isCurrent = isSameMonth(m.date, now) && year === now.getFullYear();
          const data = hasMonthData(m, isIncomeView);
          const monthIncome = incomeTotal(m);
          const tip = isIncomeView
            ? `${format(m.date, 'MMMM yyyy', { locale: es })}\n` +
              `Caja: ${m.posSalesCount} · ${moneyFmt(m.posSalesAmount)}\n` +
              `Cobranzas: ${moneyFmt(m.collectedAmount)}\n` +
              `Total ingresos: ${moneyFmt(monthIncome)}`
            : `${format(m.date, 'MMMM yyyy', { locale: es })}\n` +
              `Pedidos: ${m.ordersCount} · ${moneyFmt(m.ordersAmount)}\n` +
              `Caja: ${m.posSalesCount} · ${moneyFmt(m.posSalesAmount)}\n` +
              `Cobranzas: ${moneyFmt(m.collectedAmount)}\n` +
              `Ingresos: ${moneyFmt(monthIncome)}\n` +
              `Gastos: ${moneyFmt(m.expensesAmount)}`;

          return (
            <Grid item xs={6} sm={4} md={2} key={m.key}>
              <Paper
                elevation={data ? 1 : 0}
                title={data ? `${tip}\n\nClic para ver en calendario` : tip}
                onClick={!loading ? () => handleMonthClick(m.date) : undefined}
                sx={{
                  position: 'relative',
                  p: 0.75,
                  pt: 2.1,
                  minHeight: 118,
                  borderRadius: 2,
                  bgcolor: 'background.paper',
                  border: '1px solid',
                  borderColor: isCurrent ? 'primary.main' : 'divider',
                  cursor: !loading ? 'pointer' : 'default',
                  opacity: data ? 1 : 0.72,
                  transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                  ...(!loading && {
                    '&:hover': { borderColor: 'primary.main', boxShadow: 1 },
                  }),
                }}
              >
                <Box
                  sx={{
                    position: 'absolute',
                    top: 6,
                    left: 8,
                    right: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 800,
                      fontSize: '0.72rem',
                      textTransform: 'capitalize',
                      color: isCurrent ? 'primary.main' : 'text.primary',
                    }}
                  >
                    {format(m.date, 'MMM', { locale: es })}
                  </Typography>
                  {isCurrent && (
                    <Chip label="Actual" size="small" color="primary" sx={{ height: 18, fontSize: '0.62rem' }} />
                  )}
                </Box>

                {data ? (
                  <Stack spacing={0.4}>
                    {!isIncomeView && m.ordersAmount > 0 && (
                      <ValueStrip
                        valueText={moneyFmtCompact(m.ordersAmount)}
                        barPercent={pct(m.ordersAmount, maxOA)}
                        accentBorder={chartColors.orders}
                        accentValue={chartColors.orderMoney}
                        track={chartColors.track}
                        theme={theme}
                      />
                    )}
                    {m.posSalesAmount > 0 && (
                      <ValueStrip
                        valueText={moneyFmtCompact(m.posSalesAmount)}
                        barPercent={pct(m.posSalesAmount, maxPA)}
                        accentBorder={chartColors.posSales}
                        accentValue={chartColors.posSales}
                        track={chartColors.track}
                        theme={theme}
                      />
                    )}
                    {m.collectedAmount > 0 && (
                      <ValueStrip
                        valueText={moneyFmtCompact(m.collectedAmount)}
                        barPercent={pct(m.collectedAmount, maxCA)}
                        accentBorder={chartColors.collected}
                        accentValue={chartColors.collected}
                        track={chartColors.track}
                        theme={theme}
                      />
                    )}
                    {isIncomeView && monthIncome > 0 && (
                      <ValueStrip
                        valueText={moneyFmtCompact(monthIncome)}
                        barPercent={pct(monthIncome, maxIA)}
                        accentBorder={chartColors.incomeTotal}
                        accentValue={chartColors.incomeTotal}
                        track={chartColors.track}
                        theme={theme}
                      />
                    )}
                    {!isIncomeView && m.expensesAmount > 0 && (
                      <ValueStrip
                        valueText={moneyFmtCompact(m.expensesAmount)}
                        barPercent={pct(m.expensesAmount, maxEA)}
                        accentBorder={chartColors.expense}
                        accentValue={chartColors.expense}
                        track={chartColors.track}
                        theme={theme}
                      />
                    )}
                  </Stack>
                ) : (
                  <Typography variant="caption" color="text.disabled" sx={{ display: 'block', textAlign: 'center', mt: 1 }}>
                    Sin movimientos
                  </Typography>
                )}
              </Paper>
            </Grid>
          );
        })}
      </Grid>

      <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 1.25, flexWrap: 'wrap', gap: 1 }}>
        {!isIncomeView && (
          <Paper elevation={0} sx={{ px: 1.5, py: 0.75, borderRadius: 1.5, bgcolor: alpha(chartColors.orderMoney, 0.08), border: '1px solid', borderColor: alpha(chartColors.orderMoney, 0.35) }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Pedidos en el año</Typography>
            <Typography variant="body2" sx={{ fontWeight: 800, color: chartColors.orderMoney }}>{moneyFmt(totals.orders)}</Typography>
          </Paper>
        )}
        <Paper elevation={0} sx={{ px: 1.5, py: 0.75, borderRadius: 1.5, bgcolor: alpha(chartColors.posSales, 0.08), border: '1px solid', borderColor: alpha(chartColors.posSales, 0.35) }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Caja en el año</Typography>
          <Typography variant="body2" sx={{ fontWeight: 800, color: chartColors.posSales }}>{moneyFmt(totals.posSales)}</Typography>
        </Paper>
        <Paper elevation={0} sx={{ px: 1.5, py: 0.75, borderRadius: 1.5, bgcolor: alpha(chartColors.collected, 0.08), border: '1px solid', borderColor: alpha(chartColors.collected, 0.35) }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Cobranzas en el año</Typography>
          <Typography variant="body2" sx={{ fontWeight: 800, color: chartColors.collected }}>{moneyFmt(totals.collected)}</Typography>
        </Paper>
        <Paper elevation={0} sx={{ px: 1.5, py: 0.75, borderRadius: 1.5, bgcolor: alpha(chartColors.incomeTotal, 0.08), border: '1px solid', borderColor: alpha(chartColors.incomeTotal, 0.35) }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Total ingresos</Typography>
          <Typography variant="body2" sx={{ fontWeight: 800, color: chartColors.incomeTotal }}>{moneyFmt(yearIncomeTotal)}</Typography>
        </Paper>
        {!isIncomeView && (
          <Paper elevation={0} sx={{ px: 1.5, py: 0.75, borderRadius: 1.5, bgcolor: alpha(chartColors.expense, 0.08), border: '1px solid', borderColor: alpha(chartColors.expense, 0.35) }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Gastos en el año</Typography>
            <Typography variant="body2" sx={{ fontWeight: 800, color: chartColors.expense }}>{moneyFmt(totals.expenses)}</Typography>
          </Paper>
        )}
      </Stack>
    </Box>
  );
}
