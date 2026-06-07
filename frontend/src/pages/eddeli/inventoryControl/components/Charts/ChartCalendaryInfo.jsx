import React, { useState, useMemo, useCallback } from 'react';
import {
  Box,
  Button,
  Typography,
  Grid,
  Paper,
  Stack,
  Chip,
  LinearProgress,
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import {
  format,
  addMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  isSameDay,
  parse,
  isSameMonth,
} from 'date-fns';
import { es } from 'date-fns/locale';
import ChartBlockHeader from '../../../../../components/Charts/ChartBlockHeader';
import { getChartSeriesColors, CHART_SEMANTIC_INDEX } from '../../../../../theme/chartPalette';

function chunkArray(arr, size) {
  const r = [];
  for (let i = 0; i < arr.length; i += size) r.push(arr.slice(i, i + size));
  return r;
}

function calcDayMetrics(orders) {
  const ordersCount = orders.length;
  let deliveredUnits = 0;
  let ordersAmount = 0;
  let paidAmount = 0;

  orders.forEach((o) => {
    (o.ERP_order_items || []).forEach((it) => {
      const q = Number(it.quantity ?? 0);
      const sub = q * Number(it.price ?? 0);
      ordersAmount += sub;
      if (it.deliveredAt) deliveredUnits += q;
      if (it.paidAt) paidAmount += sub;
    });
  });

  return { ordersCount, deliveredUnits, ordersAmount, paidAmount };
}

function pct(value, max) {
  if (!max || max <= 0) return 0;
  return Math.min(100, (Number(value) / max) * 100);
}

/** Solo color (borde + fondo) + valor + barra fina */
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
  cellMinHeight = 86,
  orders = [],
}) {
  const theme = useTheme();
  const [currentDate, setCurrentDate] = useState(initialDate);

  const chartColors = useMemo(() => {
    const p = theme.palette;
    const s = getChartSeriesColors(theme);
    return {
      orders: s[CHART_SEMANTIC_INDEX.primary],
      orderMoney: s[CHART_SEMANTIC_INDEX.money],
      delivery: s[CHART_SEMANTIC_INDEX.secondary],
      paid: s[CHART_SEMANTIC_INDEX.positive],
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

  const monthPaidTotal = useMemo(() => {
    let total = 0;
    daysToShow.forEach((date) => {
      if (!isSameMonth(date, currentDate)) return;
      const dayOrders = orders.filter((o) =>
        isSameDay(parse(o.date, 'dd/MM/yyyy HH:mm:ss', new Date()), date)
      );
      total += calcDayMetrics(dayOrders).paidAmount;
    });
    return total;
  }, [daysToShow, currentDate, orders]);

  const outsideMonthBg = alpha(
    theme.palette.action.disabledBackground,
    theme.palette.mode === 'dark' ? 0.35 : 0.5
  );

  return (
    <Box sx={{ p: 2 }}>
      <ChartBlockHeader
        title="Calendario de pedidos y cobros"
        subtitle="Por día: franja superior = $ total de líneas del pedido; inferior = $ pagado (ítems con pago). Columna L–D resume la semana. Colores coinciden con la leyenda."
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
          onClick={() => setCurrentDate(addMonths(currentDate, 1))}
        >
          Mes Siguiente
        </Button>
      </Box>

      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1, flexWrap: 'wrap', rowGap: 0.5 }}>
        <Chip
          size="small"
          label="$ pedido"
          sx={{
            bgcolor: chartColors.orderMoney,
            color: theme.palette.getContrastText(chartColors.orderMoney),
          }}
        />
        <Chip
          size="small"
          label="$ pagado"
          sx={{
            bgcolor: chartColors.paid,
            color: theme.palette.getContrastText(chartColors.paid),
          }}
        />
      </Stack>

      <Grid container spacing={0.5} columns={8} sx={{ mb: 0.5 }}>
        {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => (
          <Grid item xs={1} key={d}>
            <Typography
              variant="caption"
              align="center"
              sx={{ display: 'block', color: 'text.secondary' }}
            >
              {d}
            </Typography>
          </Grid>
        ))}
        <Grid item xs={1}>
          <Typography
            variant="caption"
            align="center"
            sx={{ display: 'block', color: 'text.secondary', fontWeight: 700 }}
          >
            L–D
          </Typography>
        </Grid>
      </Grid>

      {weeks.map((week, idx) => {
        const monthDays = week.filter((d) => isSameMonth(d, currentDate));
        const metricsList = monthDays.map((date) => {
          const dayOrders = orders.filter((o) =>
            isSameDay(parse(o.date, 'dd/MM/yyyy HH:mm:ss', new Date()), date)
          );
          return { date, ...calcDayMetrics(dayOrders) };
        });

        const maxOA = Math.max(1, ...metricsList.map((m) => m.ordersAmount));
        const maxPA = Math.max(1, ...metricsList.map((m) => m.paidAmount));

        let weekOrdersAmount = 0;
        let weekPaidAmount = 0;

        return (
          <Grid container spacing={0.5} columns={8} key={idx} alignItems="stretch">
            {week.map((date) => {
              const dayOrders = orders.filter((o) =>
                isSameDay(parse(o.date, 'dd/MM/yyyy HH:mm:ss', new Date()), date)
              );
              const m = calcDayMetrics(dayOrders);
              const isCurrentMonth = isSameMonth(date, currentDate);
              if (isCurrentMonth) {
                weekOrdersAmount += m.ordersAmount;
                weekPaidAmount += m.paidAmount;
              }

              const hasData = isCurrentMonth && dayOrders.length > 0;

              const tip =
                `${format(date, 'dd/MM/yyyy')}\n` +
                `${m.ordersCount} ped. · ${moneyFmt(m.ordersAmount)}\n` +
                `${m.deliveredUnits} u. entreg. · ${moneyFmt(m.paidAmount)}`;

              return (
                <Grid item xs={1} key={date.toISOString()}>
                  <Paper
                    elevation={hasData ? 1 : 0}
                    title={tip}
                    sx={{
                      position: 'relative',
                      p: 0.5,
                      pt: 1.85,
                      minHeight: cellMinHeight,
                      borderRadius: 2,
                      bgcolor: isCurrentMonth ? 'background.paper' : outsideMonthBg,
                      border: '1px solid',
                      borderColor: 'divider',
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
                      <Stack spacing={0.5} sx={{ mt: 0.1 }}>
                        <DayValueStrip
                          valueText={moneyFmt(m.ordersAmount)}
                          barPercent={pct(m.ordersAmount, maxOA)}
                          accentBorder={chartColors.orders}
                          accentValue={chartColors.orderMoney}
                          track={chartColors.track}
                          theme={theme}
                        />
                        <DayValueStrip
                          valueText={moneyFmt(m.paidAmount)}
                          barPercent={pct(m.paidAmount, maxPA)}
                          accentBorder={chartColors.delivery}
                          accentValue={chartColors.paid}
                          track={chartColors.track}
                          theme={theme}
                        />
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
                title={`${moneyFmt(weekOrdersAmount)} / ${moneyFmt(weekPaidAmount)}`}
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
                  gap: 0.5,
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 800,
                    fontSize: '0.72rem',
                    color: chartColors.orderMoney,
                    lineHeight: 1.2,
                  }}
                >
                  {moneyFmt(weekOrdersAmount)}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 800,
                    fontSize: '0.72rem',
                    color: chartColors.paid,
                    lineHeight: 1.2,
                  }}
                >
                  {moneyFmt(weekPaidAmount)}
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        );
      })}

      <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end' }}>
        <Paper
          elevation={0}
          sx={{
            px: 1.5,
            py: 0.75,
            borderRadius: 1.5,
            bgcolor: alpha(chartColors.paid, theme.palette.mode === 'dark' ? 0.15 : 0.08),
            border: '1px solid',
            borderColor: alpha(chartColors.paid, 0.35),
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 800, color: chartColors.paid }}>
            {moneyFmt(monthPaidTotal)}
          </Typography>
        </Paper>
      </Box>
    </Box>
  );
}
