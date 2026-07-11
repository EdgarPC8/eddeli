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
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { useTheme, alpha } from '@mui/material/styles';
import {
  format,
  addMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  isSameMonth,
} from 'date-fns';
import { es } from 'date-fns/locale';
import ChartBlockHeader from '../../../../../components/Charts/ChartBlockHeader';
import { ChartSkeleton } from '../../../../../components/ContentSkeleton.jsx';
import { getChartSeriesColors, CHART_SEMANTIC_INDEX } from '../../../../../theme/chartPalette';
import CalendarDayDetailDialog from './CalendarDayDetailDialog';
import {
  getCalendarMonthSummaryRequest,
  getCalendarDayDetailRequest,
  getCalendarPeriodDetailRequest,
} from '../../../../../api/financeRequest';

function chunkArray(arr, size) {
  const r = [];
  for (let i = 0; i < arr.length; i += size) r.push(arr.slice(i, i + size));
  return r;
}

const emptyMetrics = () => ({
  ordersAmount: 0,
  ordersCount: 0,
  posSalesAmount: 0,
  posSalesCount: 0,
  posIncomeAmount: 0,
  posIncomeCount: 0,
  collectedAmount: 0,
  expensesAmount: 0,
});

const VIEW_ALL = 'all';
const VIEW_INCOME = 'income';

function roundMoney(n) {
  return Number(Number(n ?? 0).toFixed(2));
}

/** Caja: Income de venta POS, por fecha de entrada del dinero. */
function incomeCajaAmount(m) {
  return Number(m.posIncomeAmount ?? 0);
}

/** Cobros de pedidos y otros ingresos no-caja, por Income.date. */
function incomeCobrosAmount(m) {
  return Number(m.collectedAmount ?? 0);
}

/** Ingresos en vista dedicada: caja + cobros (misma fecha Income). */
function incomeViewTotal(m) {
  return roundMoney(incomeCajaAmount(m) + incomeCobrosAmount(m));
}

function pct(value, max) {
  if (!max || max <= 0) return 0;
  return Math.min(100, (Number(value) / max) * 100);
}

function DayValueStrip({
  valueText,
  barPercent,
  accentBorder,
  accentValue,
  track,
  theme,
}) {
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
          fontSize: '0.7rem',
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

export default function ChartCalendaryInfo({
  initialDate = new Date(),
  cellMinHeight = 100,
  navigateToMonth = null,
}) {
  const theme = useTheme();
  const [currentDate, setCurrentDate] = useState(initialDate);
  const [monthData, setMonthData] = useState({
    days: {},
    totals: { orders: 0, posSales: 0, posIncome: 0, collected: 0, expenses: 0 },
  });
  const [monthLoading, setMonthLoading] = useState(true);
  const [viewMode, setViewMode] = useState(VIEW_ALL);

  const isIncomeView = viewMode === VIEW_INCOME;

  const [selectedDay, setSelectedDay] = useState(null);
  const [dayDetail, setDayDetail] = useState(null);
  const [dayLoading, setDayLoading] = useState(false);
  const [periodGranularity, setPeriodGranularity] = useState('day');
  const [periodLabel, setPeriodLabel] = useState(null);

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

  const startDay = startOfMonth(currentDate);
  const endDay = endOfMonth(currentDate);
  const startWeek = startOfWeek(startDay, { weekStartsOn: 1 });
  const endWeek = endOfWeek(endDay, { weekStartsOn: 1 });
  const daysToShow = eachDayOfInterval({ start: startWeek, end: endWeek });
  const weeks = useMemo(() => chunkArray(daysToShow, 7), [daysToShow]);

  const moneyFmt = useCallback(
    (v) =>
      new Intl.NumberFormat('es-EC', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 2,
      }).format(v ?? 0),
    []
  );

  const getMetrics = useCallback(
    (date) => monthData.days[format(date, 'yyyy-MM-dd')] ?? emptyMetrics(),
    [monthData.days]
  );

  useEffect(() => {
    let cancelled = false;
    const loadMonth = async () => {
      setMonthLoading(true);
      try {
        const { data } = await getCalendarMonthSummaryRequest(
          currentDate.getFullYear(),
          currentDate.getMonth() + 1
        );
        if (!cancelled) {
          setMonthData({
            days: data?.days ?? {},
            totals: data?.totals ?? { orders: 0, posSales: 0, posIncome: 0, collected: 0, expenses: 0 },
          });
        }
      } catch (err) {
        console.error('Error calendario mes:', err);
        if (!cancelled) {
          setMonthData({ days: {}, totals: { orders: 0, posSales: 0, collected: 0, expenses: 0 } });
        }
      } finally {
        if (!cancelled) setMonthLoading(false);
      }
    };
    loadMonth();
    return () => { cancelled = true; };
  }, [currentDate]);

  const handleDayClick = useCallback(async (date) => {
    setSelectedDay(date);
    setPeriodGranularity('day');
    setPeriodLabel(null);
    setDayDetail(null);
    setDayLoading(true);
    try {
      const { data } = await getCalendarDayDetailRequest(format(date, 'yyyy-MM-dd'));
      setDayDetail(data);
    } catch (err) {
      console.error('Error detalle día:', err);
      setDayDetail({
        orders: [],
        posSales: [],
        incomes: [],
        abonos: [],
        directPayments: [],
        expenses: [],
        totals: emptyMetrics(),
      });
    } finally {
      setDayLoading(false);
    }
  }, []);

  const openMonthDetail = useCallback(async (monthDate) => {
    setCurrentDate(monthDate);
    setSelectedDay(monthDate);
    setPeriodGranularity('month');
    setPeriodLabel(format(monthDate, 'MMMM yyyy', { locale: es }));
    setDayDetail(null);
    setDayLoading(true);
    try {
      const start = format(startOfMonth(monthDate), 'yyyy-MM-dd');
      const end = format(endOfMonth(monthDate), 'yyyy-MM-dd');
      const { data } = await getCalendarPeriodDetailRequest(start, end);
      setDayDetail(data);
    } catch (err) {
      console.error('Error detalle mes:', err);
      setDayDetail({
        orders: [],
        posSales: [],
        incomes: [],
        abonos: [],
        directPayments: [],
        expenses: [],
        totals: emptyMetrics(),
      });
    } finally {
      setDayLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!navigateToMonth?.date) return;
    openMonthDetail(navigateToMonth.date);
  }, [navigateToMonth?.requestId, navigateToMonth?.date, openMonthDetail]);

  const handleCloseModal = useCallback(() => {
    setSelectedDay(null);
    setDayDetail(null);
    setDayLoading(false);
    setPeriodGranularity('day');
    setPeriodLabel(null);
  }, []);

  const monthIncomeTotal = useMemo(
    () => roundMoney((monthData.totals.posIncome ?? 0) + (monthData.totals.collected ?? 0)),
    [monthData.totals]
  );

  const outsideMonthBg = alpha(
    theme.palette.action.disabledBackground,
    theme.palette.mode === 'dark' ? 0.35 : 0.5
  );

  return (
    <Box sx={{ p: 2, position: 'relative' }}>
      {monthLoading && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            zIndex: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: alpha(theme.palette.background.paper, 0.85),
            borderRadius: 2,
            p: 2,
          }}
        >
          <Box sx={{ width: '100%', maxWidth: 480 }}>
            <ChartSkeleton height={220} />
          </Box>
        </Box>
      )}

      <ChartBlockHeader
        title="Calendario de pedidos y cobros"
        subtitle={
          isIncomeView
            ? 'Caja y cobros de pedidos por fecha en que entró el dinero (Income). Misma fecha; solo cambia el origen.'
            : 'Pedidos y caja por fecha del pedido; cobros y gastos por fecha en Income/Expense (igual que velas). Clic en un día para detalle.'
        }
        sx={{ mb: 0.5 }}
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
          disabled={monthLoading}
          onClick={() => setCurrentDate(addMonths(currentDate, -1))}
        >
          Mes Anterior
        </Button>
        <Typography variant="subtitle1" sx={{ flex: 1, textAlign: 'center', fontWeight: 700 }}>
          {format(currentDate, 'MMMM yyyy', { locale: es })}
        </Typography>
        <Button
          size="small"
          variant="outlined"
          disabled={monthLoading}
          onClick={() => setCurrentDate(addMonths(currentDate, 1))}
        >
          Mes Siguiente
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

        <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap', rowGap: 0.5 }}>
          {!isIncomeView && (
            <Chip size="small" label="$ pedido" sx={{ bgcolor: chartColors.orderMoney, color: theme.palette.getContrastText(chartColors.orderMoney) }} />
          )}
          {!isIncomeView && (
            <Chip size="small" label="$ caja" sx={{ bgcolor: chartColors.posSales, color: theme.palette.getContrastText(chartColors.posSales) }} />
          )}
          {isIncomeView && (
            <Chip size="small" label="$ caja" sx={{ bgcolor: chartColors.posSales, color: theme.palette.getContrastText(chartColors.posSales) }} />
          )}
          <Chip size="small" label={isIncomeView ? '$ cobros' : '$ ingresos'} sx={{ bgcolor: chartColors.collected, color: theme.palette.getContrastText(chartColors.collected) }} />
          {!isIncomeView && (
            <Chip size="small" label="$ gastos" sx={{ bgcolor: chartColors.expense, color: theme.palette.getContrastText(chartColors.expense) }} />
          )}
          {isIncomeView && (
            <Chip
              size="small"
              icon={<TrendingUpIcon />}
              label={`Total mes: ${moneyFmt(monthIncomeTotal)}`}
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

      <Grid container spacing={0.5} columns={8} sx={{ mb: 0.5 }}>
        {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => (
          <Grid item xs={1} key={d}>
            <Typography variant="caption" align="center" sx={{ display: 'block', color: 'text.secondary' }}>
              {d}
            </Typography>
          </Grid>
        ))}
        <Grid item xs={1}>
          <Typography variant="caption" align="center" sx={{ display: 'block', color: 'text.secondary', fontWeight: 700 }}>
            L–D
          </Typography>
        </Grid>
      </Grid>

      {weeks.map((week, idx) => {
        const monthDays = week.filter((d) => isSameMonth(d, currentDate));
        const metricsList = monthDays.map((date) => ({ date, ...getMetrics(date) }));

        const maxOA = isIncomeView ? 1 : Math.max(1, ...metricsList.map((m) => m.ordersAmount));
        const maxOpPos = isIncomeView ? 1 : Math.max(1, ...metricsList.map((m) => m.posSalesAmount));
        const maxCajaIncome = Math.max(1, ...metricsList.map((m) => incomeCajaAmount(m)));
        const maxCA = Math.max(1, ...metricsList.map((m) => incomeCobrosAmount(m)));
        const maxEA = isIncomeView ? 1 : Math.max(1, ...metricsList.map((m) => m.expensesAmount));

        let weekOrdersAmount = 0;
        let weekPosSalesAmount = 0;
        let weekPosIncomeAmount = 0;
        let weekCollectedAmount = 0;
        let weekExpensesAmount = 0;

        return (
          <Grid container spacing={0.5} columns={8} key={idx} alignItems="stretch">
            {week.map((date) => {
              const m = getMetrics(date);
              const isCurrentMonth = isSameMonth(date, currentDate);
              if (isCurrentMonth) {
                weekOrdersAmount += m.ordersAmount;
                weekPosSalesAmount += m.posSalesAmount;
                weekPosIncomeAmount += incomeCajaAmount(m);
                weekCollectedAmount += incomeCobrosAmount(m);
                weekExpensesAmount += m.expensesAmount;
              }

              const hasData = isCurrentMonth && (
                isIncomeView
                  ? incomeCajaAmount(m) > 0 || incomeCobrosAmount(m) > 0
                  : m.ordersCount > 0 ||
                    m.posSalesCount > 0 ||
                    incomeCobrosAmount(m) > 0 ||
                    m.expensesAmount > 0
              );

              const tip = isIncomeView
                ? `${format(date, 'dd/MM/yyyy')}\n` +
                  `Caja (entrada del dinero): ${moneyFmt(incomeCajaAmount(m))}\n` +
                  `Cobros pedidos: ${moneyFmt(incomeCobrosAmount(m))}\n` +
                  `Total ingresos: ${moneyFmt(incomeViewTotal(m))}`
                : `${format(date, 'dd/MM/yyyy')}\n` +
                  `Pedidos (fecha pedido): ${m.ordersCount} · ${moneyFmt(m.ordersAmount)}\n` +
                  `Caja (fecha pedido): ${m.posSalesCount} · ${moneyFmt(m.posSalesAmount)}\n` +
                  `Cobros pedidos (entrada $): ${moneyFmt(incomeCobrosAmount(m))}\n` +
                  `Gastos (Expense): ${moneyFmt(m.expensesAmount)}`;

              return (
                <Grid item xs={1} key={date.toISOString()}>
                  <Paper
                    elevation={hasData ? 1 : 0}
                    title={isCurrentMonth ? `${tip}\n\nClic para ver detalle` : tip}
                    onClick={isCurrentMonth && !monthLoading ? () => handleDayClick(date) : undefined}
                    sx={{
                      position: 'relative',
                      p: 0.5,
                      pt: 1.85,
                      minHeight: cellMinHeight,
                      borderRadius: 2,
                      bgcolor: isCurrentMonth ? 'background.paper' : outsideMonthBg,
                      border: '1px solid',
                      borderColor: 'divider',
                      cursor: isCurrentMonth && !monthLoading ? 'pointer' : 'default',
                      transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                      ...(isCurrentMonth && !monthLoading && {
                        '&:hover': { borderColor: 'primary.main', boxShadow: 1 },
                      }),
                    }}
                  >
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 4,
                        left: 5,
                        minWidth: 20,
                        height: 20,
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: alpha(theme.palette.text.primary, 0.06),
                        border: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <Typography variant="caption" sx={{ fontWeight: 800, fontSize: '0.7rem', lineHeight: 1 }}>
                        {format(date, 'd')}
                      </Typography>
                    </Box>

                    {hasData ? (
                      <Stack spacing={0.45} sx={{ mt: 0.1 }}>
                        {!isIncomeView && m.ordersAmount > 0 && (
                          <DayValueStrip
                            valueText={moneyFmt(m.ordersAmount)}
                            barPercent={pct(m.ordersAmount, maxOA)}
                            accentBorder={chartColors.orders}
                            accentValue={chartColors.orderMoney}
                            track={chartColors.track}
                            theme={theme}
                          />
                        )}
                        {!isIncomeView && m.posSalesAmount > 0 && (
                          <DayValueStrip
                            valueText={moneyFmt(m.posSalesAmount)}
                            barPercent={pct(m.posSalesAmount, maxOpPos)}
                            accentBorder={chartColors.posSales}
                            accentValue={chartColors.posSales}
                            track={chartColors.track}
                            theme={theme}
                          />
                        )}
                        {isIncomeView && incomeCajaAmount(m) > 0 && (
                          <DayValueStrip
                            valueText={moneyFmt(incomeCajaAmount(m))}
                            barPercent={pct(incomeCajaAmount(m), maxCajaIncome)}
                            accentBorder={chartColors.posSales}
                            accentValue={chartColors.posSales}
                            track={chartColors.track}
                            theme={theme}
                          />
                        )}
                        {incomeCobrosAmount(m) > 0 && (
                          <DayValueStrip
                            valueText={moneyFmt(incomeCobrosAmount(m))}
                            barPercent={pct(incomeCobrosAmount(m), maxCA)}
                            accentBorder={chartColors.collected}
                            accentValue={chartColors.collected}
                            track={chartColors.track}
                            theme={theme}
                          />
                        )}
                        {!isIncomeView && m.expensesAmount > 0 && (
                          <DayValueStrip
                            valueText={moneyFmt(m.expensesAmount)}
                            barPercent={pct(m.expensesAmount, maxEA)}
                            accentBorder={chartColors.expense}
                            accentValue={chartColors.expense}
                            track={chartColors.track}
                            theme={theme}
                          />
                        )}
                      </Stack>
                    ) : isCurrentMonth ? (
                      <Box sx={{ mt: 2, textAlign: 'center' }}>
                        <Typography variant="caption" color="text.disabled" sx={{ opacity: 0.5 }}>
                          —
                        </Typography>
                      </Box>
                    ) : null}
                  </Paper>
                </Grid>
              );
            })}

            <Grid item xs={1}>
              <Paper
                elevation={0}
                title={
                  isIncomeView
                    ? `Caja: ${moneyFmt(weekPosIncomeAmount)} · Cobros: ${moneyFmt(weekCollectedAmount)} · Total: ${moneyFmt(weekPosIncomeAmount + weekCollectedAmount)}`
                    : `Ped: ${moneyFmt(weekOrdersAmount)} · Caja: ${moneyFmt(weekPosSalesAmount)} · Cobros: ${moneyFmt(weekCollectedAmount)} · Gas: ${moneyFmt(weekExpensesAmount)}`
                }
                sx={{
                  p: 0.5,
                  minHeight: cellMinHeight,
                  borderRadius: 2,
                  bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.08 : 0.04),
                  border: '1px solid',
                  borderColor: 'divider',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 0.25,
                }}
              >
                {!isIncomeView && (
                  <Typography variant="body2" sx={{ fontWeight: 800, fontSize: '0.62rem', color: chartColors.orderMoney, lineHeight: 1.1 }}>
                    {moneyFmt(weekOrdersAmount)}
                  </Typography>
                )}
                {!isIncomeView && (
                  <Typography variant="body2" sx={{ fontWeight: 800, fontSize: '0.62rem', color: chartColors.posSales, lineHeight: 1.1 }}>
                    {moneyFmt(weekPosSalesAmount)}
                  </Typography>
                )}
                {isIncomeView && (
                  <Typography variant="body2" sx={{ fontWeight: 800, fontSize: '0.62rem', color: chartColors.posSales, lineHeight: 1.1 }}>
                    {moneyFmt(weekPosIncomeAmount)}
                  </Typography>
                )}
                <Typography variant="body2" sx={{ fontWeight: 800, fontSize: '0.62rem', color: chartColors.collected, lineHeight: 1.1 }}>
                  {moneyFmt(weekCollectedAmount)}
                </Typography>
                {isIncomeView && (
                  <Typography variant="body2" sx={{ fontWeight: 800, fontSize: '0.62rem', color: chartColors.incomeTotal, lineHeight: 1.1, pt: 0.25, borderTop: '1px solid', borderColor: 'divider', width: '100%', textAlign: 'center' }}>
                    {moneyFmt(weekPosIncomeAmount + weekCollectedAmount)}
                  </Typography>
                )}
                {isIncomeView ? null : (
                  <Typography variant="body2" sx={{ fontWeight: 800, fontSize: '0.62rem', color: chartColors.expense, lineHeight: 1.1 }}>
                    {moneyFmt(weekExpensesAmount)}
                  </Typography>
                )}
              </Paper>
            </Grid>
          </Grid>
        );
      })}

      <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 1, flexWrap: 'wrap', gap: 1 }}>
        {!isIncomeView && (
          <Paper elevation={0} sx={{ px: 1.5, py: 0.75, borderRadius: 1.5, bgcolor: alpha(chartColors.orderMoney, 0.08), border: '1px solid', borderColor: alpha(chartColors.orderMoney, 0.35) }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Pedidos en el mes</Typography>
            <Typography variant="body2" sx={{ fontWeight: 800, color: chartColors.orderMoney }}>{moneyFmt(monthData.totals.orders)}</Typography>
          </Paper>
        )}
        {!isIncomeView && (
        <Paper elevation={0} sx={{ px: 1.5, py: 0.75, borderRadius: 1.5, bgcolor: alpha(chartColors.posSales, 0.08), border: '1px solid', borderColor: alpha(chartColors.posSales, 0.35) }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Caja en el mes (fecha pedido)</Typography>
          <Typography variant="body2" sx={{ fontWeight: 800, color: chartColors.posSales }}>{moneyFmt(monthData.totals.posSales)}</Typography>
        </Paper>
        )}
        {isIncomeView && (
        <Paper elevation={0} sx={{ px: 1.5, py: 0.75, borderRadius: 1.5, bgcolor: alpha(chartColors.posSales, 0.08), border: '1px solid', borderColor: alpha(chartColors.posSales, 0.35) }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Caja en el mes (entrada del dinero)</Typography>
          <Typography variant="body2" sx={{ fontWeight: 800, color: chartColors.posSales }}>{moneyFmt(monthData.totals.posIncome)}</Typography>
        </Paper>
        )}
        <Paper elevation={0} sx={{ px: 1.5, py: 0.75, borderRadius: 1.5, bgcolor: alpha(chartColors.collected, 0.08), border: '1px solid', borderColor: alpha(chartColors.collected, 0.35) }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{isIncomeView ? 'Cobros pedidos en el mes' : 'Ingresos en el mes (Income)'}</Typography>
          <Typography variant="body2" sx={{ fontWeight: 800, color: chartColors.collected }}>{moneyFmt(monthData.totals.collected)}</Typography>
        </Paper>
        {isIncomeView && (
          <Paper elevation={0} sx={{ px: 1.5, py: 0.75, borderRadius: 1.5, bgcolor: alpha(chartColors.incomeTotal, 0.08), border: '1px solid', borderColor: alpha(chartColors.incomeTotal, 0.35) }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Total ingresos del mes</Typography>
            <Typography variant="body2" sx={{ fontWeight: 800, color: chartColors.incomeTotal }}>{moneyFmt(monthIncomeTotal)}</Typography>
          </Paper>
        )}
        {!isIncomeView && (
          <Paper elevation={0} sx={{ px: 1.5, py: 0.75, borderRadius: 1.5, bgcolor: alpha(chartColors.expense, 0.08), border: '1px solid', borderColor: alpha(chartColors.expense, 0.35) }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Gastos en el mes</Typography>
            <Typography variant="body2" sx={{ fontWeight: 800, color: chartColors.expense }}>{moneyFmt(monthData.totals.expenses)}</Typography>
          </Paper>
        )}
      </Stack>

      <CalendarDayDetailDialog
        open={Boolean(selectedDay)}
        date={selectedDay}
        detail={dayDetail}
        loading={dayLoading}
        onClose={handleCloseModal}
        moneyFmt={moneyFmt}
        colors={chartColors}
        viewMode={viewMode}
        periodGranularity={periodGranularity}
        periodLabel={periodLabel}
      />
    </Box>
  );
}
