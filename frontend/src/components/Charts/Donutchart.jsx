import * as React from 'react';
import { PieChart } from '@mui/x-charts/PieChart';
import { useTheme, useMediaQuery, Box, Typography, Grid } from '@mui/material';
import { getChartSeriesColors, CHART_SEMANTIC_INDEX } from '../../theme/chartPalette';

export default function DonutChart() {
  const theme = useTheme();
  const data = React.useMemo(() => {
    const s = getChartSeriesColors(theme);
    return [
      { label: 'No Pagados', value: 35, color: s[CHART_SEMANTIC_INDEX.alert] },
      { label: 'Pagados no Entregados', value: 20, color: s[CHART_SEMANTIC_INDEX.warm] },
      { label: 'No Pagados ni Entregados', value: 10, color: s[CHART_SEMANTIC_INDEX.secondary] },
      { label: 'Entregados no Pagados', value: 5, color: s[CHART_SEMANTIC_INDEX.positive] },
    ];
  }, [theme]);
  const isXs = useMediaQuery(theme.breakpoints.down('sm'));
  const isMd = useMediaQuery(theme.breakpoints.down('md'));

  const chartScale = isXs ? 1 : isMd ? 1.3 : 1.5;
  const baseRadius = 50;
  const outerRadius = baseRadius * chartScale;
  const innerRadius = outerRadius * 0.5;
  const chartSize = outerRadius * 2.2;

  return (
    <Grid container spacing={2} alignItems="center">
      <Grid item xs={12} sm={8}>
        {/* Este Box ahora usa full width y alinea el gráfico a la derecha */}
        <Box
          display="flex"
          justifyContent="flex-end"
          width="100%"
          sx={{ pl: 2 }} // Puedes ajustar este padding si quieres que no quede muy pegado al borde
        >
          <Box sx={{ minWidth: chartSize }}>
      <PieChart
  width={chartSize}
  height={chartSize}
  legend={{ hidden: true }} // 👈 esta línea es clave para que no se monte encima
  series={[
    {
      innerRadius,
      outerRadius,
      arcLabel: ({ value }) => `${value}`,
      arcLabelMinAngle: 10,
      paddingAngle: 4,
      data,
    },
  ]}
/>

          </Box>
        </Box>
      </Grid>

      <Grid item xs={12} sm={4}>
        <Box display="flex" flexDirection="column" alignItems={isXs ? 'center' : 'flex-start'}>
          {data.map((entry) => (
            <Box key={entry.label} display="flex" alignItems="center" mb={1}>
              <Box
                sx={{
                  width: 14,
                  height: 14,
                  backgroundColor: entry.color,
                  borderRadius: 1,
                  marginRight: 1,
                }}
              />
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {entry.label}:&nbsp;
                <Typography component="span" color="text.secondary">
                  {entry.value}
                </Typography>
              </Typography>
            </Box>
          ))}
        </Box>
      </Grid>
    </Grid>
  );
}
