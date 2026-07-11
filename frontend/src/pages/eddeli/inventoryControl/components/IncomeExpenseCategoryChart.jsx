import { useMemo, useState, useCallback } from "react";
import {
  Box,
  Paper,
  Stack,
  Button,
  useTheme,
  alpha,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { PieChart } from "@mui/x-charts/PieChart";
import ChartBlockHeader from "../../../../components/Charts/ChartBlockHeader";
import { ChartSkeleton } from "../../../../components/ContentSkeleton.jsx";
import { money } from "../collections/helpers.js";
import { getIncomeExpenseBreakdownDetail } from "../../../../api/financeRequest";
import IncomeExpenseCategoryDetailDialog from "./IncomeExpenseCategoryDetailDialog";
import {
  dashboardTwinPanelSx,
  DASHBOARD_TWIN_PANEL_BODY_HEIGHT,
} from "./dashboardTwinPanelLayout.js";

const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const round2 = (n) => Number(toNum(n).toFixed(2));

const CHART_SIZE = 220;

export default function IncomeExpenseCategoryChart({ data }) {
  const theme = useTheme();
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
    const incomeShades = (groups.Ingresos ?? []).map((r, i) => ({
      id: `i-${r.label}`,
      label: r.label,
      value: round2(r.value),
      color: alpha(incomeColor, Math.min(0.95, 0.5 + i * 0.08)),
    }));
    const expenseShades = (groups.Gastos ?? []).map((r, i) => ({
      id: `e-${r.label}`,
      label: r.label,
      value: round2(r.value),
      color: alpha(expenseColor, Math.min(0.95, 0.5 + i * 0.08)),
    }));
    return [...incomeShades, ...expenseShades];
  }, [groups, incomeColor, expenseColor]);

  const series = useMemo(
    () => [
      {
        id: "platforms",
        data: [
          { id: "ingresos", label: "Ingresos", value: totalIncome, color: incomeColor },
          { id: "gastos", label: "Gastos", value: totalExpense, color: expenseColor },
        ],
        innerRadius: 0,
        outerRadius: 48,
        paddingAngle: 2,
        cornerRadius: 4,
        valueFormatter: (item) => (item ? `${item.label}: ${money(item.value)}` : ""),
        highlightScope: { fade: "global", highlight: "item" },
      },
      {
        id: "categories",
        data: outerData,
        innerRadius: 58,
        outerRadius: 76,
        paddingAngle: 1.5,
        cornerRadius: 3,
        valueFormatter: (item) => (item ? `${item.label}: ${money(item.value)}` : ""),
        highlightScope: { fade: "global", highlight: "item" },
      },
    ],
    [totalIncome, totalExpense, outerData, incomeColor, expenseColor]
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

  const paperSx = {
    p: { xs: 1.5, sm: 2 },
    borderRadius: 2,
    minWidth: 0,
    width: "100%",
    display: "flex",
    flexDirection: "column",
    border: "1px solid",
    borderColor: alpha(theme.palette.divider, 0.6),
    ...dashboardTwinPanelSx,
  };

  if (!platforms || !groups) {
    return (
      <Paper sx={paperSx}>
        <ChartBlockHeader
          title="Ingresos y gastos por categoría"
          subtitle="Totales por fecha en Income y Expense (no por fecha de pedido)."
          sx={{ mb: 1, flexShrink: 0 }}
        />
        <Box sx={{ height: DASHBOARD_TWIN_PANEL_BODY_HEIGHT, overflow: "hidden" }}>
          <ChartSkeleton height={Math.max(160, DASHBOARD_TWIN_PANEL_BODY_HEIGHT - 48)} />
        </Box>
      </Paper>
    );
  }

  return (
    <>
      <Paper sx={paperSx}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="flex-start"
          spacing={1}
          sx={{ mb: 1, flexShrink: 0 }}
        >
        <ChartBlockHeader
          title="Ingresos y gastos por categoría"
          subtitle="Totales por fecha en Income y Expense (no por fecha de pedido)."
          sx={{ mb: 0, flex: 1 }}
        />
          <Button
            size="small"
            variant="outlined"
            startIcon={<VisibilityIcon />}
            onClick={handleOpenDetail}
            sx={{ flexShrink: 0 }}
          >
            Ver detalle
          </Button>
        </Stack>

        <Box
          sx={{
            height: DASHBOARD_TWIN_PANEL_BODY_HEIGHT,
            minHeight: DASHBOARD_TWIN_PANEL_BODY_HEIGHT,
            maxHeight: DASHBOARD_TWIN_PANEL_BODY_HEIGHT,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          <PieChart
            series={series}
            width={CHART_SIZE}
            height={CHART_SIZE}
            margin={{ top: 4, right: 4, bottom: 4, left: 4 }}
            legend={{ hidden: true }}
            slotProps={{
              tooltip: { trigger: "item" },
            }}
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
