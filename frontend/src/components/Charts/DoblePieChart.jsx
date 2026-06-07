import * as React from "react";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import { useTheme, alpha } from "@mui/material/styles";
import { PieChart } from "@mui/x-charts/PieChart";
import ChartBlockHeader from "./ChartBlockHeader";
import { getChartSeriesColors } from "../../theme/chartPalette";

const toNum = (v, def = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};
const round2 = (n) => Number.parseFloat(toNum(n).toFixed(2));

/**
 * data: { platforms, groups, meta? }
 * displayMode: "value" | "percent" | "both"
 */
export default function DoblePieChart({ data, displayMode = "value" }) {
  const theme = useTheme();

  const chartColors = React.useMemo(() => {
    const base = getChartSeriesColors(theme);
    const m = theme.palette.mode === "dark";
    return [
      ...base,
      ...base.slice(0, 6).map((c) => alpha(c, m ? 0.78 : 0.88)),
    ];
  }, [theme]);

  const platforms = data?.platforms;
  const groups = data?.groups;

  const totalPlatforms = React.useMemo(
    () => round2((platforms ?? []).reduce((s, p) => s + toNum(p.value, 0), 0)),
    [platforms]
  );

  const outerRawData = React.useMemo(() => {
    if (!platforms || !groups) return [];
    let combined = [];
    platforms.forEach((p) => {
      const sub = groups[p.label] || [];
      combined = combined.concat(
        sub.map((v) => ({
          label: v.label === "Other" ? `Other (${p.label})` : v.label,
          value: round2(v.value || 0),
          _platform: p.label,
        }))
      );
    });
    return combined;
  }, [platforms, groups]);

  const totalOuter = React.useMemo(
    () => round2(outerRawData.reduce((s, it) => s + toNum(it.value, 0), 0)),
    [outerRawData]
  );

  const makeFormatter = React.useCallback(
    (total) => (item) => {
      if (!item) return "";
      const amount = round2(item.value);
      const pct = total > 0 ? round2((toNum(item.value, 0) / total) * 100) : 0;

      switch (displayMode) {
        case "percent":
          return `${pct}%`;
        case "both":
          return `${amount} (${pct}%)`;
        case "value":
        default:
          return `${amount}`;
      }
    },
    [displayMode]
  );

  const platformFormatter = React.useMemo(
    () => makeFormatter(totalPlatforms),
    [makeFormatter, totalPlatforms]
  );

  const outerFormatter = React.useMemo(
    () => makeFormatter(totalOuter),
    [makeFormatter, totalOuter]
  );

  const platformSeries = React.useMemo(
    () => ({
      innerRadius: 0,
      outerRadius: 80,
      id: "platform-series",
      data: platforms ?? [],
      valueFormatter: platformFormatter,
      arcLabel: (d) => `${d.label}`,
      arcLabelMinAngle: 10,
    }),
    [platforms, platformFormatter]
  );

  const groupSeries = React.useMemo(
    () => ({
      innerRadius: 100,
      outerRadius: 120,
      id: "group-series",
      data: outerRawData,
      valueFormatter: outerFormatter,
      arcLabel: (d) => `${d.label}`,
      arcLabelMinAngle: 10,
    }),
    [outerRawData, outerFormatter]
  );

  if (!data || !data.platforms || !data.groups) {
    return (
      <Box sx={{ width: "100%", display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ width: "100%" }}>
      <ChartBlockHeader
        title="Ingresos y gastos por categoría"
        subtitle="Anillo interior: total de ingresos vs gastos. Anillo exterior: desglose por categoría de cada uno. Los valores siguen el modo elegido en el controlador (monto, % o ambos)."
      />
      <Box sx={{ width: "100%", display: "flex", justifyContent: "center" }}>
        <PieChart
          series={[platformSeries, groupSeries]}
          colors={chartColors}
          width={360}
          height={340}
          margin={{ top: 8, bottom: 8 }}
          slotProps={{
            legend: { position: { vertical: "middle", horizontal: "right" } },
          }}
        />
      </Box>
    </Box>
  );
}
