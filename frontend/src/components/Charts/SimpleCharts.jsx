import { useTheme } from "@mui/material";
import { BarChart } from "@mui/x-charts/BarChart";
import { getChartSeriesColors } from "../../theme/chartPalette";

/** Gráfico de barras simple (mismo patrón que tienda/BusinessOverviewChart). */
export default function SimpleCharts() {
  const theme = useTheme();
  const barColor = getChartSeriesColors(theme)[0];

  return (
    <BarChart
      height={150}
      colors={[barColor]}
      xAxis={[{ scaleType: "band", data: ["L", "M", "W", "J", "V", "S", "D"] }]}
      yAxis={[{ width: 30 }]}
      series={[{ data: [5, 17, 11, 5, 17, 11, 32], label: "Ventas" }]}
      margin={{ left: 0, right: 10, top: 8, bottom: 4 }}
      barLabel="value"
    />
  );
}
