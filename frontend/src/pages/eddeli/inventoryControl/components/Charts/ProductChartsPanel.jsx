import { useEffect, useMemo, useState } from 'react';
import {
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { getProductSeriesChartsRequest } from '../../../../../api/financeRequest';
import ChartBlockHeader from '../../../../../components/Charts/ChartBlockHeader';
import { ChartSkeleton } from '../../../../../components/ContentSkeleton.jsx';
import ProductSeriesChart from './ProductSeriesChart';

const paperSx = {
  p: { xs: 1, sm: 1.5 },
  borderRadius: 2,
  height: '100%',
  boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
  overflow: 'hidden',
  minWidth: 0,
};

const PERIOD_OPTIONS = [
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mes' },
  { value: 'year', label: 'Año' },
];

const BAND_SIZE = 10;

function bandLabel(band) {
  const from = (band - 1) * BAND_SIZE + 1;
  const to = band * BAND_SIZE;
  return `Del ${from} al ${to}`;
}

export default function ProductChartsPanel() {
  const [period, setPeriod] = useState('month');
  const [band, setBand] = useState(1);
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState(null);
  const [meta, setMeta] = useState({ totalBands: 1, totalRanked: 0, rankStart: 1, rankEnd: 10 });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data } = await getProductSeriesChartsRequest(period, band);
        if (cancelled) return;
        setSales(data?.sales ?? null);
        setMeta({
          totalBands: data?.totalBands ?? 1,
          totalRanked: data?.totalRanked ?? 0,
          rankStart: data?.rankStart ?? 1,
          rankEnd: data?.rankEnd ?? 10,
        });
      } catch (e) {
        console.error('ProductChartsPanel:', e);
        if (!cancelled) setSales(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [period, band]);

  useEffect(() => {
    if (band > meta.totalBands) setBand(1);
  }, [meta.totalBands, band]);

  const bandOptions = useMemo(() => {
    const count = Math.max(1, meta.totalBands);
    return Array.from({ length: count }, (_, i) => i + 1);
  }, [meta.totalBands]);

  const periodLabel = sales?.periodLabel ?? '';
  const rankStart = sales?.rankStart ?? meta.rankStart;
  const rankEnd = sales?.rankEnd ?? meta.rankEnd;

  return (
    <Paper sx={{ ...paperSx, overflowX: 'auto' }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'flex-start', sm: 'flex-start' }}
        justifyContent="space-between"
        spacing={1}
        sx={{ mb: 1.5 }}
      >
        <ChartBlockHeader
          title="Ingresos por producto"
          subtitle="Por fecha de registro en Income (productos finales pagados). Importe y cantidad al pasar el mouse."
          sx={{ mb: 0, flex: 1 }}
        />
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ flexShrink: 0 }}>
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel id="product-charts-band-label">Rango</InputLabel>
            <Select
              labelId="product-charts-band-label"
              label="Rango"
              value={band}
              onChange={(e) => setBand(Number(e.target.value))}
              disabled={loading || meta.totalRanked === 0}
            >
              {bandOptions.map((b) => (
                <MenuItem key={b} value={b}>
                  {bandLabel(b)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={period}
            onChange={(_, v) => {
              if (v) {
                setPeriod(v);
                setBand(1);
              }
            }}
          >
            {PERIOD_OPTIONS.map((opt) => (
              <ToggleButton key={opt.value} value={opt.value} sx={{ textTransform: 'none', px: 1.5 }}>
                {opt.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Stack>
      </Stack>

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
        {loading
          ? 'Cargando…'
          : `${periodLabel} · posiciones ${rankStart}–${rankEnd} · ${meta.totalRanked} productos con ventas`}
      </Typography>

      {loading ? (
        <ChartSkeleton height={300} />
      ) : (
        <ProductSeriesChart
          bundle={sales}
          loading={false}
          chartHeight={300}
          showHeader={false}
          sideLegend
        />
      )}
    </Paper>
  );
}
