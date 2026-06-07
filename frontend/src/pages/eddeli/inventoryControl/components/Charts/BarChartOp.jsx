import * as React from 'react';
import { useMemo, useState } from 'react';
import { Box, Button, Stack, Typography, Chip, Paper, useTheme, alpha } from '@mui/material';
import { BarChart } from '@mui/x-charts/BarChart';
import {
  format, startOfWeek, endOfWeek, parse, isWithinInterval,
} from 'date-fns';
import { es } from 'date-fns/locale';
import ChartBlockHeader from '../../../../../components/Charts/ChartBlockHeader';
import { getChartSeriesColors, CHART_SEMANTIC_INDEX } from '../../../../../theme/chartPalette';

const intFmt = (v) => new Intl.NumberFormat('es-EC', { maximumFractionDigits: 0 }).format(v ?? 0);
const moneyFmt = (v) =>
  new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(v ?? 0);

const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function parseOrderDate(s) {
  return parse(s, 'dd/MM/yyyy HH:mm:ss', new Date());
}

function aggregateWeek(orders, weekStart, weekEnd) {
  const rows = DAYS.map((day) => ({
    day,
    date: null,
    ordersCount: 0,
    ordersAmount: 0,
    paidOrdersCount: 0,
    paidAmount: 0,
  }));

  orders.forEach((o) => {
    const od = parseOrderDate(o.date);
    if (!isWithinInterval(od, { start: weekStart, end: weekEnd })) return;

    const idx = Number(format(od, 'i')) - 1;
    rows[idx].date = od;
    rows[idx].ordersCount += 1;

    let orderTotal = 0;
    let paidTotal = 0;
    let hasPaid = false;
    (o.ERP_order_items || []).forEach((it) => {
      const q = Number(it.quantity ?? 0);
      const sub = q * Number(it.price ?? 0);
      orderTotal += sub;
      if (it.paidAt) {
        hasPaid = true;
        paidTotal += sub;
      }
    });

    rows[idx].ordersAmount += orderTotal;
    if (hasPaid) rows[idx].paidOrdersCount += 1;
    rows[idx].paidAmount += paidTotal;
  });

  return rows;
}

export default function BarChartOp({ orders = [], initialDate = new Date() }) {
  const theme = useTheme();
  const [anchorDate, setAnchorDate] = useState(initialDate);

  const weekStart = startOfWeek(anchorDate, { locale: es, weekStartsOn: 1 });
  const weekEnd = endOfWeek(weekStart, { locale: es, weekStartsOn: 1 });

  const rows = useMemo(() => aggregateWeek(orders, weekStart, weekEnd), [orders, weekStart, weekEnd]);

  const totals = useMemo(() => {
    let ordersCount = 0;
    let ordersAmount = 0;
    let paidOrdersCount = 0;
    let paidAmount = 0;
    rows.forEach((r) => {
      ordersCount += r.ordersCount;
      ordersAmount += r.ordersAmount;
      paidOrdersCount += r.paidOrdersCount;
      paidAmount += r.paidAmount;
    });
    return { ordersCount, ordersAmount, paidOrdersCount, paidAmount };
  }, [rows]);

  const p = theme.palette;
  const series = getChartSeriesColors(theme);
  const cOrders = series[CHART_SEMANTIC_INDEX.primary];
  const cPaid = series[CHART_SEMANTIC_INDEX.positive];
  const cOrdersSoft = alpha(cOrders, theme.palette.mode === 'dark' ? 0.55 : 0.65);
  const cPaidSoft = alpha(cPaid, theme.palette.mode === 'dark' ? 0.55 : 0.65);
  const chipText = (hex) => p.getContrastText(hex);

  const weekTitle = `${format(weekStart, "d 'de' MMM", { locale: es })} – ${format(weekEnd, "d 'de' MMM, yyyy", { locale: es })}`;

  return (
    <Box>
      <ChartBlockHeader
        title="Pedidos por día de la semana"
        subtitle="Por cada día (lun–dom): barras de cantidad de pedidos y su valor en $; las barras de «pagado» son pedidos con al menos un ítem pagado y el $ cobrado ese día. Navega con las flechas para otras semanas."
      />

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 1.25,
          position: 'relative',
        }}
      >
        <Button
          size="small"
          variant="outlined"
          onClick={() => setAnchorDate((d) => new Date(d.getTime() - 7 * 24 * 60 * 60 * 1000))}
          sx={{ position: 'absolute', left: 0 }}
        >
          ◀
        </Button>
        <Typography variant="subtitle2" sx={{ textAlign: 'center', fontWeight: 700, color: 'text.secondary' }}>
          Semana: {weekTitle}
        </Typography>
        <Button
          size="small"
          variant="outlined"
          onClick={() => setAnchorDate((d) => new Date(d.getTime() + 7 * 24 * 60 * 60 * 1000))}
          sx={{ position: 'absolute', right: 0 }}
        >
          ▶
        </Button>
      </Box>

      <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: 'wrap', rowGap: 0.5 }}>
        <Chip size="small" label="Pedidos (#)" sx={{ bgcolor: cOrders, color: chipText(cOrders) }} />
        <Chip size="small" label="Pedidos ($)" sx={{ bgcolor: cOrdersSoft, color: chipText(cOrders) }} />
        <Chip size="small" label="Pagados (#)" sx={{ bgcolor: cPaid, color: chipText(cPaid) }} />
        <Chip size="small" label="Pagados ($)" sx={{ bgcolor: cPaidSoft, color: chipText(cPaid) }} />
      </Stack>

      <BarChart
        dataset={rows}
        height={360}
        xAxis={[{ dataKey: 'day', scaleType: 'band' }]}
        yAxis={[
          { id: 'count', label: 'Cantidad (#)' },
          { id: 'money', label: 'Dinero (USD)' },
        ]}
        margin={{ left: 58, right: 58, top: 12, bottom: 28 }}
        barCategoryGap={12}
        series={[
          {
            dataKey: 'ordersCount',
            label: 'Pedidos (#)',
            stack: 'orders',
            yAxisKey: 'count',
            color: cOrders,
          },
          {
            dataKey: 'paidOrdersCount',
            label: 'Pagados (#)',
            stack: 'orders',
            yAxisKey: 'count',
            color: cPaid,
          },
          {
            dataKey: 'ordersAmount',
            label: 'Pedidos ($)',
            stack: 'money',
            yAxisKey: 'money',
            color: cOrdersSoft,
            valueFormatter: (v) => moneyFmt(v),
          },
          {
            dataKey: 'paidAmount',
            label: 'Pagados ($)',
            stack: 'money',
            yAxisKey: 'money',
            color: cPaidSoft,
            valueFormatter: (v) => moneyFmt(v),
          },
        ]}
        slotProps={{
          legend: { hidden: false },
          tooltip: {
            trigger: 'axis',
            itemContent: ({ series, item }) =>
              `${series.label}: ${
                series.yAxisKey === 'money' ? moneyFmt(item.value) : intFmt(item.value)
              }`,
          },
        }}
      />

      <Box sx={{ mt: 1.5, display: 'flex', justifyContent: 'flex-end' }}>
        <Paper
          elevation={0}
          variant="outlined"
          sx={{
            px: 1.5,
            py: 0.75,
            borderRadius: 2,
            bgcolor: alpha(p.text.primary, theme.palette.mode === 'dark' ? 0.06 : 0.03),
            borderColor: 'divider',
          }}
        >
          <Typography variant="caption" sx={{ display: 'block', fontWeight: 700, color: 'text.primary' }}>
            Total semana · Pedidos: {intFmt(totals.ordersCount)} — {moneyFmt(totals.ordersAmount)}
          </Typography>
          <Typography variant="caption" sx={{ display: 'block', fontWeight: 700, color: cPaid }}>
            Pagados: {intFmt(totals.paidOrdersCount)} — {moneyFmt(totals.paidAmount)}
          </Typography>
        </Paper>
      </Box>
    </Box>
  );
}
