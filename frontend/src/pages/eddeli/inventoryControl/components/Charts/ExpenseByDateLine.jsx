// ExpenseByDateLine.jsx — gastos por fecha, líneas por producto (con filtros Top N + Otros)
import * as React from 'react';
import { LineChart } from '@mui/x-charts/LineChart';
import {
  Box,
  Stack,
  Typography,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  Tooltip,
  useTheme,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import ChartBlockHeader from '../../../../../components/Charts/ChartBlockHeader';
import { getChartSeriesColors } from '../../../../../theme/chartPalette';

const moneyFmt = (v) =>
  new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(
    Number(v || 0)
  );
const intFmt = (v) =>
  new Intl.NumberFormat('es-EC', { maximumFractionDigits: 0 }).format(Number(v || 0));

const COLORS_FALLBACK = [
  '#1976d2',
  '#9c27b0',
  '#2e7d32',
  '#ef6c00',
  '#d32f2f',
  '#455a64',
  '#6d4c41',
  '#00796b',
  '#c2185b',
  '#512da8',
  '#0288d1',
  '#7cb342',
  '#f9a825',
  '#5d4037',
  '#616161',
  '#00838f',
  '#8e24aa',
  '#43a047',
  '#fb8c00',
  '#e53935',
];

const TOP_OPTIONS = [
  { value: 5, label: 'Top 5' },
  { value: 8, label: 'Top 8' },
  { value: 10, label: 'Top 10' },
  { value: 15, label: 'Top 15' },
  { value: 9999, label: 'Todos' },
];

const OTHERS_ID = '__otros__';

function sumSeries(arr) {
  return arr.reduce((s, v) => s + (v == null || Number.isNaN(v) ? 0 : Number(v)), 0);
}

export default function ExpenseByDateLine({ sampleExpenses = [] }) {
  const theme = useTheme();
  const [mode, setMode] = React.useState('amount');
  const [topLimit, setTopLimit] = React.useState(8);
  const [groupOthers, setGroupOthers] = React.useState(true);

  const chartColors = React.useMemo(() => {
    const fromTheme = getChartSeriesColors(theme);
    return [...fromTheme, ...COLORS_FALLBACK];
  }, [theme]);

  const dates = React.useMemo(() => {
    const uniq = Array.from(new Set(sampleExpenses.map((e) => e?.date).filter(Boolean))).sort(
      (a, b) => new Date(a) - new Date(b)
    );
    return uniq;
  }, [sampleExpenses]);

  const products = React.useMemo(() => {
    const map = new Map();
    for (const e of sampleExpenses) {
      if (e?.referenceId == null) continue;
      if (!map.has(e.referenceId)) {
        map.set(e.referenceId, {
          id: e.referenceId,
          name: e.productName || `Producto #${e.referenceId}`,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.id - b.id);
  }, [sampleExpenses]);

  const matrices = React.useMemo(() => {
    const init = {};
    for (const p of products) {
      init[p.id] = {
        amount: Array(dates.length).fill(null),
        count: Array(dates.length).fill(null),
      };
    }
    const dayKeyToIndex = new Map(dates.map((d, i) => [d, i]));
    const acc = {};
    for (const p of products) acc[p.id] = {};

    for (const e of sampleExpenses) {
      if (e?.referenceId == null) continue;
      const idx = dayKeyToIndex.get(e.date);
      if (idx == null) continue;
      const pid = e.referenceId;
      if (!acc[pid][idx]) acc[pid][idx] = { amount: 0, count: 0 };
      acc[pid][idx].amount += Number(e.amount || 0);
      acc[pid][idx].count += 1;
    }

    for (const p of products) {
      for (let i = 0; i < dates.length; i++) {
        const v = acc[p.id][i];
        init[p.id].amount[i] = v ? v.amount : null;
        init[p.id].count[i] = v ? v.count : null;
      }
    }
    return init;
  }, [products, dates, sampleExpenses]);

  /** Ranking por total del período (según modo) */
  const ranked = React.useMemo(() => {
    return products
      .map((p) => {
        const m = matrices[p.id];
        const arr = mode === 'amount' ? m.amount : m.count;
        const total = sumSeries(arr.map((v) => v ?? 0));
        return { ...p, total };
      })
      .sort((a, b) => b.total - a.total);
  }, [products, matrices, mode]);

  const { displayProducts, displayMatrices } = React.useMemo(() => {
    if (ranked.length === 0) {
      return { displayProducts: [], displayMatrices: {} };
    }

    const isAll = topLimit >= 9999;
    const n = isAll ? ranked.length : Math.min(topLimit, ranked.length);
    const top = ranked.slice(0, n);
    const rest = ranked.slice(n);

    if (isAll || !groupOthers || rest.length === 0) {
      const list = isAll ? ranked : top;
      const dm = {};
      for (const p of list) {
        dm[p.id] = matrices[p.id];
      }
      return { displayProducts: list, displayMatrices: dm };
    }

    const otrosAmount = dates.map((_, i) =>
      rest.reduce((s, p) => s + (matrices[p.id].amount[i] ?? 0), 0)
    );
    const otrosCount = dates.map((_, i) =>
      rest.reduce((s, p) => s + (matrices[p.id].count[i] ?? 0), 0)
    );

    const otrosMatrix = {
      amount: otrosAmount.map((v) => (v > 0 ? v : null)),
      count: otrosCount.map((v) => (v > 0 ? v : null)),
    };

    const dm = {};
    for (const p of top) dm[p.id] = matrices[p.id];
    dm[OTHERS_ID] = otrosMatrix;

    return {
      displayProducts: [
        ...top,
        {
          id: OTHERS_ID,
          name: `Otros (${rest.length} prod.)`,
          total: rest.reduce((s, p) => s + p.total, 0),
        },
      ],
      displayMatrices: dm,
    };
  }, [ranked, matrices, dates, topLimit, groupOthers, mode]);

  const series = React.useMemo(() => {
    return displayProducts.map((p, i) => ({
      id: `prod-${p.id}`,
      label: p.name,
      data: displayMatrices[p.id][mode],
      color: chartColors[i % chartColors.length],
      curve: 'monotoneX',
      connectNulls: true,
      showMark: displayProducts.length <= 12,
      valueFormatter: (value) => {
        if (value == null) return '';
        return mode === 'amount' ? moneyFmt(value) : intFmt(value);
      },
    }));
  }, [displayProducts, displayMatrices, mode, chartColors]);

  const tooltipRenderer = React.useCallback(
    (params) => {
      if (!params?.series?.length) return '';
      const index = params.series[0]?.dataIndex ?? 0;
      const date = dates[index];
      if (!date) return '';
      const d = parseISO(date);
      const dateStr = isValid(d)
        ? format(d, "EEEE, d 'de' MMMM yyyy", { locale: es })
        : date;

      const rows = displayProducts
        .map((p, i) => {
          const a = displayMatrices[p.id].amount[index] ?? 0;
          const c = displayMatrices[p.id].count[index] ?? 0;
          const color = chartColors[i % chartColors.length];
          return `
        <div style="display:flex; align-items:center; gap:8px; margin:2px 0;">
          <span style="display:inline-block; width:10px; height:10px; background:${color}; border-radius:2px;"></span>
          <div style="flex:1;">${p.name}</div>
          <div style="text-align:right;">
            <div><span style="opacity:${mode === 'amount' ? 1 : 0.7}">Monto:</span> <b>${moneyFmt(a)}</b></div>
            <div><span style="opacity:${mode === 'count' ? 1 : 0.7}">Cant.:</span> <b>${intFmt(c)}</b></div>
          </div>
        </div>
      `;
        })
        .join('');

      return `
      <div style="padding:10px 12px">
        <div style="font-weight:700; margin-bottom:6px;">${dateStr}</div>
        ${rows}
      </div>
    `;
    },
    [dates, displayProducts, displayMatrices, mode, chartColors]
  );

  const showGroupSwitch = topLimit < 9999;

  return (
    <Box>
      <Stack spacing={1.5} sx={{ mb: 1.5 }}>
        <ChartBlockHeader
          title="Gastos por fecha (por producto)"
          subtitle="Cada línea es un producto vinculado al gasto (referenceId). Usa Top N y «Otros» para no saturar el gráfico. El modo Monto suma importes; Cantidad cuenta movimientos."
        />
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          justifyContent="flex-end"
          gap={1}
        >
          <RadioGroup row value={mode} onChange={(e) => setMode(e.target.value)} name="mode-chart">
            <FormControlLabel value="amount" control={<Radio size="small" />} label="Monto ($)" />
            <FormControlLabel value="count" control={<Radio size="small" />} label="Cantidad (#)" />
          </RadioGroup>
        </Stack>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'stretch', sm: 'center' }}
          gap={2}
          flexWrap="wrap"
        >
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel id="exp-top-label">Productos visibles</InputLabel>
            <Select
              labelId="exp-top-label"
              label="Productos visibles"
              value={topLimit >= 9999 ? 9999 : topLimit}
              onChange={(e) => {
                const v = e.target.value;
                setTopLimit(typeof v === 'string' ? parseInt(v, 10) : v);
              }}
            >
              {TOP_OPTIONS.map((o) => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {showGroupSwitch && (
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <Tooltip title="Junta en una sola línea los productos que no entran en el Top N, para no saturar el gráfico.">
                <InfoOutlinedIcon fontSize="small" color="action" />
              </Tooltip>
              <FormControlLabel
                control={
                  <Switch
                    checked={groupOthers}
                    onChange={(e) => setGroupOthers(e.target.checked)}
                    size="small"
                  />
                }
                label='Agrupar resto en «Otros»'
              />
            </Stack>
          )}

          <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 420 }}>
            Se ordenan por total ({mode === 'amount' ? '$' : 'nº gastos'}) en el período. Las líneas chicas
            pasan a «Otros» si activas el agrupado.
          </Typography>
        </Stack>
      </Stack>

      {displayProducts.length === 0 ? (
        <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
          No hay gastos con producto asociado en estos datos.
        </Typography>
      ) : (
        <LineChart
          height={Math.min(520, 320 + displayProducts.length * 8)}
          xAxis={[
            {
              scaleType: 'time',
              data: dates.map((d) => parseISO(d)),
              valueFormatter: (v) => format(v, 'd MMM', { locale: es }),
            },
          ]}
          series={series}
          margin={{ left: 56, right: 24, top: 16, bottom: 28 }}
          slotProps={{
            tooltip: { trigger: 'axis', renderer: tooltipRenderer },
            legend: {
              direction: displayProducts.length > 8 ? 'horizontal' : 'horizontal',
              position: { vertical: 'bottom', horizontal: 'middle' },
            },
          }}
        />
      )}
    </Box>
  );
}
