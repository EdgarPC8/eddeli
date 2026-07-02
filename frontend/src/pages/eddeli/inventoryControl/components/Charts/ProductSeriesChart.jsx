import * as React from 'react';
import { Box, Grid, Stack, Typography, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { LineChart } from '@mui/x-charts/LineChart';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import ChartBlockHeader from '../../../../../components/Charts/ChartBlockHeader';
import { getChartSeriesColors } from '../../../../../theme/chartPalette';

const moneyFmt = (v) =>
  new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(
    Number(v ?? 0)
  );

const qtyFmt = (v) =>
  new Intl.NumberFormat('es-EC', { maximumFractionDigits: 2 }).format(Number(v ?? 0));

function rowAmountSum(row, products) {
  let sum = 0;
  for (const { id } of products) {
    const v = row[String(id)];
    if (typeof v === 'number' && !Number.isNaN(v)) sum += v;
  }
  return sum;
}

function formatXLabel(date, granularity) {
  const d = new Date(date);
  if (granularity === 'month') {
    return d.toLocaleDateString('es-EC', { month: 'short', year: '2-digit' });
  }
  return d.toLocaleDateString('es-EC', { day: '2-digit', month: 'short' });
}

function ProductLegendList({ products, paletteColors }) {
  if (!products.length) return null;

  return (
    <Stack
      spacing={1}
      sx={{
        py: 0.5,
        pr: { xs: 0, md: 1 },
        maxHeight: { xs: 200, md: 320 },
        overflowY: 'auto',
      }}
    >
      {products.map((item, index) => {
        const color = paletteColors[index % paletteColors.length];
        return (
          <Stack key={item.id} direction="row" spacing={1} alignItems="flex-start" sx={{ minWidth: 0 }}>
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: 0.5,
                bgcolor: color,
                flexShrink: 0,
                mt: 0.35,
                boxShadow: `0 0 0 1px ${alpha(color, 0.4)}`,
              }}
            />
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="body2" fontWeight={600} sx={{ lineHeight: 1.3 }} title={item.name}>
                {item.rank != null ? `#${item.rank} ` : ''}
                {item.name}
              </Typography>
              {(item.totalAmt > 0 || item.totalQty > 0) && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.35 }}>
                  {moneyFmt(item.totalAmt)}
                  {item.totalQty > 0 ? ` · ${qtyFmt(item.totalQty)} u` : ''}
                </Typography>
              )}
            </Box>
          </Stack>
        );
      })}
    </Stack>
  );
}

export default function ProductSeriesChart({
  title,
  subtitle = '',
  bundle = null,
  loading = false,
  chartHeight = 250,
  showHeader = true,
  sideLegend = false,
}) {
  const theme = useTheme();
  const products = bundle?.products ?? [];
  const granularity = bundle?.granularity ?? 'day';

  const paletteColors = React.useMemo(() => getChartSeriesColors(theme), [theme]);
  const axisStroke = theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.28)';
  const tickFill = theme.palette.text.secondary;

  const { preparedData, qtyByIndex } = React.useMemo(() => {
    const amountRows = bundle?.datasetAmount ?? [];
    const qtyRows = bundle?.dataset ?? [];
    const qtyByDate = new Map(qtyRows.map((r) => [r.date, r]));
    const qtyIndex = [];
    const rows = [];

    for (const point of amountRows) {
      const qtyPoint = qtyByDate.get(point.date) || {};
      const newPoint = { date: new Date(`${point.date}T12:00:00`) };
      const qtySlice = {};

      for (const { id } of products) {
        const k = String(id);
        const amt = point[k];
        newPoint[k] = typeof amt === 'number' && !Number.isNaN(amt) && amt !== 0 ? amt : null;
        qtySlice[k] = Number(qtyPoint[k] ?? 0);
      }

      if (rowAmountSum(newPoint, products) <= 0) continue;
      qtyIndex.push(qtySlice);
      rows.push(newPoint);
    }

    return { preparedData: rows, qtyByIndex: qtyIndex };
  }, [bundle, products]);

  const yFormatter = React.useCallback((v) => {
    if (v == null || Number.isNaN(v) || v === 0) return '—';
    return moneyFmt(v);
  }, []);

  const series = React.useMemo(
    () =>
      products.map((item, index) => {
        const base = paletteColors[index % paletteColors.length];
        return {
          id: String(item.id),
          label: item.rank != null ? `#${item.rank} ${item.name}` : item.name,
          dataKey: String(item.id),
          area: true,
          showMark: false,
          color: base,
          curve: 'monotoneX',
          connectNulls: true,
          valueFormatter: (v) => yFormatter(v),
        };
      }),
    [products, paletteColors, yFormatter]
  );

  const tooltipRenderer = React.useCallback(
    (params) => {
      if (!params?.series?.length) return '';
      const dataIndex = params.series[0]?.dataIndex ?? 0;
      const row = preparedData[dataIndex];
      if (!row) return '';
      const dateStr = format(row.date, "EEEE, d 'de' MMMM yyyy", { locale: es });
      const qtySlice = qtyByIndex[dataIndex] || {};

      const lines = params.series
        .map((s, i) => {
          const id = s.id;
          const amt = s.data?.[dataIndex];
          if (amt == null || Number.isNaN(amt)) return '';
          const qty = qtySlice[id] ?? 0;
          const color = paletteColors[i % paletteColors.length];
          return `
            <div style="display:flex;align-items:flex-start;gap:8px;margin:4px 0;">
              <span style="width:10px;height:10px;border-radius:2px;background:${color};margin-top:4px;flex-shrink:0;"></span>
              <div style="flex:1;min-width:0;">
                <div style="font-weight:600;">${s.label}</div>
                <div style="font-size:12px;opacity:0.9;">${moneyFmt(amt)} · Cant. ${qtyFmt(qty)}</div>
              </div>
            </div>`;
        })
        .join('');

      return `<div style="padding:10px 12px;max-width:280px;"><div style="font-weight:700;margin-bottom:6px;">${dateStr}</div>${lines}</div>`;
    },
    [preparedData, qtyByIndex, paletteColors]
  );

  const periodHint = bundle?.periodLabel ? `${bundle.periodLabel}. ` : '';

  const chartBlock = (
    <>
      {loading ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
          Cargando…
        </Typography>
      ) : products.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
          No hay productos en este rango del ranking para el período.
        </Typography>
      ) : preparedData.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
          Estos productos no tienen movimiento en las fechas del período.
        </Typography>
      ) : (
        <LineChart
          dataset={preparedData}
          xAxis={[
            {
              id: 'time',
              dataKey: 'date',
              scaleType: 'time',
              valueFormatter: (date) => formatXLabel(date, granularity),
              tickLabelStyle: { fill: tickFill },
            },
          ]}
          yAxis={[
            {
              width: 72,
              tickLabelStyle: { fill: tickFill },
              valueFormatter: yFormatter,
            },
          ]}
          series={series}
          height={chartHeight}
          experimentalFeatures={{ preferStrictDomainInLineCharts: true }}
          margin={{ left: 4, right: 8, top: 8, bottom: 24 }}
          slotProps={{
            axisLine: { stroke: axisStroke },
            axisTick: { stroke: axisStroke },
            legend: { hidden: true },
            tooltip: {
              trigger: 'axis',
              renderer: tooltipRenderer,
            },
          }}
          sx={{
            '& .MuiAreaElement-root': {
              fillOpacity: theme.palette.mode === 'dark' ? 0.14 : 0.18,
            },
            '& .MuiLineElement-root': {
              strokeWidth: 2.5,
              strokeOpacity: 1,
              filter: `drop-shadow(0 0 1px ${alpha(theme.palette.common.black, 0.15)})`,
            },
          }}
        />
      )}
    </>
  );

  return (
    <Box sx={{ width: '100%', minWidth: 0 }}>
      {showHeader && (
        <ChartBlockHeader
          title={title}
          subtitle={`${periodHint}${subtitle} Pasa el mouse sobre un día para ver importe y cantidad.`}
        />
      )}

      {sideLegend ? (
        <Grid container spacing={{ xs: 1.5, md: 2 }} alignItems="stretch">
          <Grid item xs={12} md={3.5} lg={3} sx={{ minWidth: 0 }}>
            {loading ? (
              <Typography variant="body2" color="text.secondary">
                Cargando…
              </Typography>
            ) : (
              <ProductLegendList products={products} paletteColors={paletteColors} />
            )}
          </Grid>
          <Grid item xs={12} md={8.5} lg={9} sx={{ minWidth: 0 }}>
            {chartBlock}
          </Grid>
        </Grid>
      ) : (
        chartBlock
      )}
    </Box>
  );
}
