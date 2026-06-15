import { useMemo, useState, useCallback } from "react";
import {
  Box,
  Paper,
  Typography,
  Stack,
  Button,
  CircularProgress,
  useTheme,
  alpha,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { PieChart } from "@mui/x-charts/PieChart";
import { money } from "../collections/helpers.js";
import { getChartSeriesColors } from "../../../../theme/chartPalette";
import { getIncomeExpenseBreakdownDetail } from "../../../../api/financeRequest";
import IncomeExpenseCategoryDetailDialog from "./IncomeExpenseCategoryDetailDialog";

const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const round2 = (n) => Number(toNum(n).toFixed(2));

export default function IncomeExpenseCategoryChart({ data }) {
  const theme = useTheme();
  const chartColors = useMemo(() => getChartSeriesColors(theme), [theme]);
  const incomeColor = theme.palette.success.main;
  const expenseColor = theme.palette.error.main;

  const [modalOpen, setModalOpen] = useState(false);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const platforms = data?.platforms;
  const groups = data?.groups;

  const totalIncome = round2(
    data?.meta?.totals?.income ?? platforms?.find((p) => p.label === "Ingresos")?.value ?? 0
  );
  const totalExpense = round2(
    data?.meta?.totals?.expense ?? platforms?.find((p) => p.label === "Gastos")?.value ?? 0
  );

  const outerData = useMemo(() => {
    if (!groups) return [];
    const income = (groups.Ingresos ?? []).map((r) => ({
      id: `i-${r.label}`,
      label: r.label,
      value: round2(r.value),
    }));
    const expense = (groups.Gastos ?? []).map((r) => ({
      id: `e-${r.label}`,
      label: r.label,
      value: round2(r.value),
    }));
    return [...income, ...expense];
  }, [groups]);

  const totalAll = round2(totalIncome + totalExpense);

  const series = useMemo(
    () => [
      {
        id: "platforms",
        data: [
          { id: "ingresos", label: "Ingresos", value: totalIncome },
          { id: "gastos", label: "Gastos", value: totalExpense },
        ],
        innerRadius: 0,
        outerRadius: 68,
        valueFormatter: (item) => (item ? money(item.value) : ""),
        arcLabel: (d) => d.label,
        arcLabelMinAngle: 10,
      },
      {
        id: "categories",
        data: outerData,
        innerRadius: 82,
        outerRadius: 108,
        valueFormatter: (item) => (item ? money(item.value) : ""),
        arcLabel: (d) => (d.value > 0 && totalAll > 0 && d.value / totalAll > 0.05 ? d.label : ""),
        arcLabelMinAngle: 12,
      },
    ],
    [totalIncome, totalExpense, outerData, totalAll]
  );

  const handleOpenDetail = useCallback(async () => {
    setModalOpen(true);
    setDetailData(null);
    setDetailLoading(true);
    try {
      const { data: payload } = await getIncomeExpenseBreakdownDetail();
      setDetailData(payload);
    } catch (err) {
      console.error("Error al cargar detalle categorías:", err);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const handleCloseDetail = useCallback(() => {
    setModalOpen(false);
    setDetailData(null);
    setDetailLoading(false);
  }, []);

  if (!platforms || !groups) {
    return (
      <Paper sx={{ p: 2, borderRadius: 2, minWidth: 0, width: "100%" }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>
          Ingresos y gastos por categoría
        </Typography>
        <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
          <CircularProgress size={28} />
        </Box>
      </Paper>
    );
  }

  return (
    <>
      <Paper
        sx={{
          p: { xs: 1.5, sm: 2 },
          borderRadius: 2,
          minWidth: 0,
          width: "100%",
          boxSizing: "border-box",
          border: "1px solid",
          borderColor: alpha(theme.palette.divider, 0.6),
          cursor: "pointer",
          transition: "border-color 0.15s ease, box-shadow 0.15s ease",
          "&:hover": { borderColor: "primary.main", boxShadow: 1 },
        }}
        onClick={handleOpenDetail}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1} mb={1}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              Ingresos y gastos por categoría
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Clic para ver detalle por categoría
            </Typography>
          </Box>
          <Button
            size="small"
            startIcon={<VisibilityIcon />}
            onClick={(e) => { e.stopPropagation(); handleOpenDetail(); }}
            sx={{ flexShrink: 0 }}
          >
            Ver detalle
          </Button>
        </Stack>

        <Box sx={{ width: "100%", display: "flex", justifyContent: "center", minWidth: 0, overflow: "hidden", pointerEvents: "none" }}>
          <PieChart
            series={series}
            colors={[incomeColor, expenseColor, ...chartColors]}
            width={340}
            height={280}
            margin={{ top: 4, right: 4, bottom: 4, left: 4 }}
            legend={{ hidden: true }}
          />
        </Box>
      </Paper>

      <IncomeExpenseCategoryDetailDialog
        open={modalOpen}
        onClose={handleCloseDetail}
        data={detailData}
        loading={detailLoading}
      />
    </>
  );
}
