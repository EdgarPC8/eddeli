import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Grid, Paper, Box, Stack } from "@mui/material";
import {
  getFinanceDashboardHeroRequest,
  getFinanceDashboardRestRequest,
} from "../../../api/financeRequest";
import { PanelSkeleton } from "../../../components/ContentSkeleton.jsx";
import CustomersAccordionTable from "./components/CustomersAccordionTable";
import ChartCalendaryInfo from "./components/Charts/ChartCalendaryInfo";
import ProductChartsPanel from "./components/Charts/ProductChartsPanel";
import ExpensePurchaseStats from "./components/Charts/ExpensePurchaseStats";
import CashFlowMirrorChart from "./components/Charts/CashFlowMirrorChart";
import CashFlowCandlestickChart from "./components/Charts/CashFlowCandlestickChart";
import { resolveMirrorFromCandle } from "./components/Charts/cashFlowLinkUtils";
import FinanceSummaryCards from "./components/FinanceSummaryCards";
import DashboardStockPanel from "./components/DashboardStockPanel";
import OrderStatusSummaryPanel from "./components/OrderStatusSummaryPanel";
import IncomeExpenseCategoryChart from "./components/IncomeExpenseCategoryChart";
import ObligationsSummaryPanel from "./components/ObligationsSummaryPanel";
import RecurringExpensesSummaryPanel from "./components/RecurringExpensesSummaryPanel";
import YearFinanceOverviewChart from "./components/Charts/YearFinanceOverviewChart";
import { buildPendingCollectionsBreakdown } from "./finance/pendingCollections.js";

const paperSx = {
  p: { xs: 1, sm: 1.5 },
  borderRadius: 2,
  height: "100%",
  boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
  overflow: "hidden",
  minWidth: 0,
};

const defaultProductsStock = { agotados: [], porAgotarse: [] };

const defaultObligations = {
  summary: { totalReceivable: 0, totalPayable: 0, openCount: 0 },
  topOpen: [],
};

const defaultRecurring = {
  summary: {
    monthlyBurden: 0,
    pendingThisMonth: 0,
    gapToCover: 0,
    dailySalesTarget: 0,
    daysLeftInMonth: 1,
    isProfitable: false,
    overdueCount: 0,
  },
  upcoming: [],
  overdue: [],
};

export const DashBoardPage = () => {
  const [loadingHero, setLoadingHero] = useState(true);
  const [loadingRest, setLoadingRest] = useState(true);
  const [summary, setSummary] = useState({ totalIncome: 0, totalExpense: 0 });
  const [productsStock, setProductsStock] = useState(defaultProductsStock);
  const [overView, setOverView] = useState([]);
  const [incomeExpenseBreakdown, setIncomeExpenseBreakdown] = useState({});
  const [workbench, setWorkbench] = useState({
    customers: [],
    orders: [],
    groups: [],
    payments: [],
  });
  const [obligations, setObligations] = useState(defaultObligations);
  const [recurring, setRecurring] = useState(defaultRecurring);
  const [mirrorFocus, setMirrorFocus] = useState(null);
  const calendarSectionRef = useRef(null);
  const [calendarNavigate, setCalendarNavigate] = useState(null);

  const handleYearMonthSelect = useCallback((date) => {
    setCalendarNavigate({ date, requestId: Date.now() });
    window.setTimeout(() => {
      calendarSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  }, []);

  const handleCandleSelect = useCallback((candle, candleGranularity) => {
    setMirrorFocus(resolveMirrorFromCandle(candleGranularity, candle));
  }, []);

  const handleClearMirrorFocus = useCallback(() => {
    setMirrorFocus(null);
  }, []);

  const pendingBreakdown = useMemo(
    () => buildPendingCollectionsBreakdown(workbench),
    [workbench],
  );

  // Por cobrar: workbench si ya cargó; si no, futureIncome del summary (hero).
  const pendingTotal = loadingRest
    ? Number(summary?.futureIncome ?? 0)
    : pendingBreakdown.total;

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoadingHero(true);
      setLoadingRest(true);

      // 1) Primero lo que se ve arriba (cards)
      try {
        const { data } = await getFinanceDashboardHeroRequest();
        if (cancelled) return;
        setSummary(data.summary ?? {});
        setObligations(data.obligations ?? defaultObligations);
      } catch (err) {
        console.error("Error al cargar hero del dashboard:", err);
      } finally {
        if (!cancelled) setLoadingHero(false);
      }

      // 2) Luego el resto, sin bloquear las cards
      try {
        const { data } = await getFinanceDashboardRestRequest();
        if (cancelled) return;
        setOverView(data.overView ?? []);
        setIncomeExpenseBreakdown(data.incomeExpenseBreakdown ?? {});
        setProductsStock(data.productsStock ?? defaultProductsStock);
        setWorkbench({
          customers: data.workbench?.customers ?? [],
          orders: data.workbench?.orders ?? [],
          groups: data.workbench?.groups ?? [],
          payments: data.workbench?.payments ?? [],
        });
        setRecurring(data.recurring ?? defaultRecurring);
      } catch (err) {
        console.error("Error al cargar paneles del dashboard:", err);
      } finally {
        if (!cancelled) setLoadingRest(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: "100%",
        minWidth: 0,
        boxSizing: "border-box",
        overflowX: "hidden",
      }}
    >
      <Box sx={{ mb: { xs: 2, md: 3 } }}>
        <FinanceSummaryCards
          summary={summary}
          pendingTotal={pendingTotal}
          obligationsSummary={obligations.summary}
          loading={loadingHero}
        />
      </Box>

      <Grid container spacing={{ xs: 1.5, sm: 2 }}>
        <Grid item xs={12} lg={8}>
          <Grid container spacing={{ xs: 1.5, sm: 2 }} alignItems="flex-start">
            <Grid item xs={12} md={6} sx={{ minWidth: 0 }}>
              {loadingRest ? (
                <PanelSkeleton height={260} />
              ) : (
                <DashboardStockPanel
                  productsStock={productsStock}
                  onStockUpdated={setProductsStock}
                />
              )}
            </Grid>
            <Grid item xs={12} md={6} sx={{ minWidth: 0 }}>
              {loadingRest ? (
                <PanelSkeleton height={260} />
              ) : (
                <IncomeExpenseCategoryChart data={incomeExpenseBreakdown} />
              )}
            </Grid>
            <Grid item xs={12} sx={{ minWidth: 0 }}>
              <Paper sx={{ ...paperSx, overflowX: "auto" }}>
                <YearFinanceOverviewChart onMonthSelect={handleYearMonthSelect} />
              </Paper>
            </Grid>
          </Grid>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Stack spacing={{ xs: 1.5, sm: 2 }} sx={{ minWidth: 0 }}>
            {loadingRest ? (
              <>
                <PanelSkeleton height={180} />
                <PanelSkeleton height={180} />
              </>
            ) : (
              <>
                <OrderStatusSummaryPanel overView={overView} />
                <RecurringExpensesSummaryPanel recurring={recurring} />
              </>
            )}
            {loadingHero ? (
              <PanelSkeleton height={180} />
            ) : (
              <ObligationsSummaryPanel obligations={obligations} />
            )}
          </Stack>
        </Grid>

        {/* Gráficos con su propia carga interna */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ ...paperSx, overflowX: "auto", height: "100%" }}>
            <CashFlowMirrorChart focus={mirrorFocus} onClearFocus={handleClearMirrorFocus} />
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <CashFlowCandlestickChart
            onCandleSelect={handleCandleSelect}
            onDrillReset={handleClearMirrorFocus}
            selectedKey={mirrorFocus?.highlightKey ?? null}
          />
        </Grid>

        <Grid item xs={12}>
          <Box ref={calendarSectionRef}>
            <Paper sx={{ ...paperSx, overflowX: "auto" }}>
              <ChartCalendaryInfo navigateToMonth={calendarNavigate} />
            </Paper>
          </Box>
        </Grid>

        <Grid item xs={12}>
          <ProductChartsPanel />
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ ...paperSx, overflowX: "auto" }}>
            {loadingRest ? (
              <PanelSkeleton height={280} />
            ) : (
              <CustomersAccordionTable workbench={workbench} />
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ ...paperSx, overflowX: "auto" }}>
            <ExpensePurchaseStats />
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashBoardPage;
