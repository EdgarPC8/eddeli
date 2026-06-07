import { Box, useTheme } from "@mui/material";
import { BarChart } from "@mui/x-charts/BarChart";
import ChartBlockHeader from "../../../../../components/Charts/ChartBlockHeader";
import { getChartSeriesColors } from "../../../../../theme/chartPalette";

export default function BarChartDays({
  dataDays = ["L", "M", "W", "J", "V", "S", "D"],
  dataValues = [0, 0, 0, 0, 0, 0, 0],
  title = "Ventas diarias (semana actual)",
  subtitle = "Suma en dólares de pedidos con estado «pagado» por día, de lunes a domingo (según datos del servidor).",
}) {
  const theme = useTheme();
  const barColor = getChartSeriesColors(theme)[0];

  return (
    <Box>
      <ChartBlockHeader title={title} subtitle={subtitle} />
      <BarChart
        height={160}
        colors={[barColor]}
        xAxis={[{ scaleType: "band", data: dataDays }]}
        yAxis={[{ width: 36 }]}
        series={[{ data: dataValues, label: "Ventas" }]}
        margin={{ left: 4, right: 10, top: 8, bottom: 4 }}
        barLabel="value"
      />
    </Box>
  );
}
