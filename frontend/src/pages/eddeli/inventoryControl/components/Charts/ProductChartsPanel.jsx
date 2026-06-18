import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  FormControl,
  Grid,
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
  const [purchases, setPurchases] = useState(null);
  const [meta, setMeta] = useState({ totalBands: 1, totalRanked: 0, rankStart: 1, rankEnd: 10 });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data } = await getProductSeriesChartsRequest(period, band);
        if (cancelled) return;
        setSales(data?.sales ?? null);
        setPurchases(data?.purchases ?? null);
        setMeta({
          totalBands: data?.totalBands ?? 1,
          totalRanked: data?.totalRanked ?? 0,
          rankStart: data?.rankStart ?? 1,
          rankEnd: data?.rankEnd ?? 10,
        });
      } catch (e) {
        console.error('ProductChartsPanel:', e);
        if (!cancelled) {
          setSales(null);
          setPurchases(null);
        }
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

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        justifyContent="space-between"
        spacing={1}
        sx={{ mb: 1.5 }}
      >
        <Typography variant="subtitle2" color="text.secondary">
          Ranking por importe en el período · bloques de 10 productos ({meta.totalRanked} con movimiento)
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel id="product-charts-band-label">Rango</InputLabel>
            <Select
              labelId="product-charts-band-label"
              label="Rango"
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

      <Grid container spacing={{ xs: 1.5, sm: 2 }}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ ...paperSx, overflowX: 'auto' }}>
            <ProductSeriesChart
              title="Ingresos por producto"
              subtitle={`Posiciones ${sales?.rankStart ?? meta.rankStart}–${sales?.rankEnd ?? meta.rankEnd} en ventas.`}
              bundle={sales}
              loading={loading}
            />
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ ...paperSx, overflowX: 'auto' }}>
            <ProductSeriesChart
              title="Compras por producto"
              subtitle={`Posiciones ${purchases?.rankStart ?? meta.rankStart}–${purchases?.rankEnd ?? meta.rankEnd} en compras.`}
              bundle={purchases}
              loading={loading}
            />
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
