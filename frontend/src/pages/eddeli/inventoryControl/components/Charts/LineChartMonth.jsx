import * as React from 'react';
import { Box, Stack, ToggleButton, ToggleButtonGroup, Typography, useTheme } from '@mui/material';
import { LineChart } from '@mui/x-charts/LineChart';
import ChartBlockHeader from '../../../../../components/Charts/ChartBlockHeader';
import { getChartSeriesColors } from '../../../../../theme/chartPalette';

const moneyFmt = (v) =>
  new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(
    Number(v ?? 0)
  );

function rowSumForSeries(row, seriesName) {
  let sum = 0;
  seriesName.forEach(({ id }) => {
    const k = String(id);
    const v = row[k];
    const n = typeof v === 'number' && !Number.isNaN(v) ? v : 0;
    sum += n;
  });
  return sum;
}

function pickSlice(bundle, dateBy) {
  if (!bundle || typeof bundle !== 'object') {
    return { products: [], dataset: [], datasetAmount: [] };
  }
  if (bundle.paid || bundle.delivered) {
    const block = dateBy === 'delivered' ? bundle.delivered : bundle.paid;
    const b = block && typeof block === 'object' ? block : {};
    return {
      products: Array.isArray(b.products) ? b.products : [],
      dataset: Array.isArray(b.dataset) ? b.dataset : [],
      datasetAmount: Array.isArray(b.datasetAmount) ? b.datasetAmount : [],
    };
  }
  return {
    products: Array.isArray(bundle.products) ? bundle.products : [],
    dataset: Array.isArray(bundle.dataset) ? bundle.dataset : [],
    datasetAmount: Array.isArray(bundle.datasetAmount) ? bundle.datasetAmount : [],
  };
}

/**
 * @param {object} props
 * @param {{ paid?: object, delivered?: object, products?: array, dataset?: array, datasetAmount?: array }} [props.bundle] — API v2: { paid, delivered }; legacy: raíz con products/dataset
 */
export default function LineChartMonth({ bundle = {} }) {
  const theme = useTheme();
  const [dateBy, setDateBy] = React.useState('paid');
  const [metric, setMetric] = React.useState('quantity');

  const showDateToggle = Boolean(bundle?.paid != null || bundle?.delivered != null);

  const { products: seriesName, dataset: data, datasetAmount: dataAmount } = React.useMemo(
    () => pickSlice(bundle, dateBy),
    [bundle, dateBy]
  );

  const hasAmount = Array.isArray(dataAmount) && dataAmount.length > 0;
  const rawRows = metric === 'amount' && hasAmount ? dataAmount : data;

  React.useEffect(() => {
    if (metric === 'amount' && !hasAmount) setMetric('quantity');
  }, [metric, hasAmount]);

  const paletteColors = React.useMemo(() => getChartSeriesColors(theme), [theme]);

  const axisStroke = theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.28)';
  const tickFill = theme.palette.text.secondary;

  const preparedData = React.useMemo(() => {
    const normalized = rawRows.map((point) => {
      const newPoint = { ...point, date: new Date(point.date) };
      seriesName.forEach(({ id }) => {
        const key = String(id);
        if (typeof newPoint[key] !== 'number' || Number.isNaN(newPoint[key])) {
          newPoint[key] = 0;
        }
      });
      return newPoint;
    });

    return normalized
      .filter((row) => rowSumForSeries(row, seriesName) > 0)
      .map((row) => {
        const out = { date: row.date };
        seriesName.forEach(({ id }) => {
          const key = String(id);
          const v = row[key];
          const n = typeof v === 'number' && !Number.isNaN(v) ? v : 0;
          out[key] = n === 0 ? null : n;
        });
        return out;
      });
  }, [rawRows, seriesName]);

  const yFormatter = React.useCallback(
    (v) => {
      if (v == null || Number.isNaN(v)) return '—';
      if (v === 0) return '—';
      return metric === 'amount' ? moneyFmt(v) : String(Math.round(v));
    },
    [metric]
  );

  const series = React.useMemo(
    () =>
      seriesName.map((item, index) => {
        const color = paletteColors[index % paletteColors.length];
        return {
          id: String(item.id),
          label: item.name,
          dataKey: String(item.id),
          area: true,
          showMark: false,
          color,
          curve: 'monotoneX',
          connectNulls: true,
          valueFormatter: (v) => yFormatter(v),
        };
      }),
    [seriesName, paletteColors, yFormatter]
  );

  const dateByHint =
    dateBy === 'delivered'
      ? 'Cada punto se ubica el día de entrega del ítem (deliveredAt).'
      : 'Cada punto se ubica el día en que el ítem quedó pagado (paidAt).';

  const metricHint =
    metric === 'amount' && hasAmount
      ? 'Importe = cantidad × precio de línea.'
      : 'Cantidades vendidas en ese criterio de fecha.';

  return (
    <Box sx={{ width: '100%' }}>
      <ChartBlockHeader
        title="Top productos vendidos por día"
        subtitle={`Último mes. ${dateByHint} ${metricHint} No se muestran días sin movimiento ni tramos en cero por producto.`}
      />
      <Stack direction="row" justifyContent="flex-end" flexWrap="wrap" gap={1} sx={{ mb: 1 }}>
        {showDateToggle && (
          <ToggleButtonGroup
            size="small"
            exclusive
            value={dateBy}
            onChange={(_, v) => v && setDateBy(v)}
            color="primary"
          >
            <ToggleButton value="paid">Por fecha de pago</ToggleButton>
            <ToggleButton value="delivered">Por fecha de entrega</ToggleButton>
          </ToggleButtonGroup>
        )}
        {hasAmount && (
          <ToggleButtonGroup
            size="small"
            exclusive
            value={metric}
            onChange={(_, v) => v && setMetric(v)}
            color="primary"
          >
            <ToggleButton value="quantity">Cantidad</ToggleButton>
            <ToggleButton value="amount">Importe ($)</ToggleButton>
          </ToggleButtonGroup>
        )}
      </Stack>
      {seriesName.length === 0 || preparedData.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
          No hay datos en el período para este criterio de fecha.
        </Typography>
      ) : (
        <LineChart
          dataset={preparedData}
          xAxis={[
            {
              id: 'Días',
              dataKey: 'date',
              scaleType: 'time',
              valueFormatter: (date) =>
                new Date(date).toLocaleDateString('es-EC', {
                  day: '2-digit',
                  month: 'short',
                }),
              tickLabelStyle: { fill: tickFill },
            },
          ]}
          yAxis={[
            {
              width: metric === 'amount' ? 72 : 56,
              tickLabelStyle: { fill: tickFill },
              valueFormatter: yFormatter,
            },
          ]}
          series={series}
          height={250}
          experimentalFeatures={{ preferStrictDomainInLineCharts: true }}
          margin={{ left: 4, right: 8, top: 8, bottom: 24 }}
          slotProps={{
            axisLine: { stroke: axisStroke },
            axisTick: { stroke: axisStroke },
            legend: {
              labelStyle: { fill: theme.palette.text.primary },
            },
          }}
          sx={{
            '& .MuiChartsLegend-series text': { fill: `${theme.palette.text.primary} !important` },
          }}
        />
      )}
    </Box>
  );
}
