import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Grid, Paper, Box, Stack } from "@mui/material";
import { getFinanceDashboardRequest } from "../../../api/financeRequest";
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

export const DashBoardPage = () => {
    const [loading, setLoading] = useState(true);
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
    const [obligations, setObligations] = useState({
        summary: { totalReceivable: 0, totalPayable: 0, openCount: 0 },
        topOpen: [],
    });
    const [recurring, setRecurring] = useState({
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
    });
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
        [workbench]
    );

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const { data } = await getFinanceDashboardRequest();

                setSummary(data.summary ?? {});
                setOverView(data.overView ?? []);
                setIncomeExpenseBreakdown(data.incomeExpenseBreakdown ?? {});
                setProductsStock(data.productsStock ?? defaultProductsStock);
                setWorkbench({
                    customers: data.workbench?.customers ?? [],
                    orders: data.workbench?.orders ?? [],
                    groups: data.workbench?.groups ?? [],
                    payments: data.workbench?.payments ?? [],
                });
                setObligations(data.obligations ?? {
                    summary: { totalReceivable: 0, totalPayable: 0, openCount: 0 },
                    topOpen: [],
                });
                setRecurring(data.recurring ?? {
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
                });
            } catch (err) {
                console.error("Error al cargar dashboard:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    return (
        <Box
            sx={{
                width: "100%",
                maxWidth: "100%",
                minWidth: 0,
                boxSizing: "border-box",
                overflowX: "hidden",
                opacity: loading ? 0.7 : 1,
                transition: "opacity 0.2s",
            }}
        >
            <Box sx={{ mb: { xs: 2, md: 3 } }}>
                <FinanceSummaryCards
                    summary={summary}
                    pendingTotal={pendingBreakdown.total}
                    obligationsSummary={obligations.summary}
                />
            </Box>

            <Grid container spacing={{ xs: 1.5, sm: 2 }}>
                {/* Columna izquierda: alertas + categorías */}
                <Grid item xs={12} lg={8}>
                    <Grid container spacing={{ xs: 1.5, sm: 2 }} alignItems="flex-start">
                        <Grid item xs={12} md={6} sx={{ minWidth: 0 }}>
                            <DashboardStockPanel
                                productsStock={productsStock}
                                onStockUpdated={setProductsStock}
                            />
                        </Grid>
                        <Grid item xs={12} md={6} sx={{ minWidth: 0 }}>
                            <IncomeExpenseCategoryChart data={incomeExpenseBreakdown} />
                        </Grid>
                        <Grid item xs={12} sx={{ minWidth: 0 }}>
                            <Paper sx={{ ...paperSx, overflowX: "auto" }}>
                                <YearFinanceOverviewChart onMonthSelect={handleYearMonthSelect} />
                            </Paper>
                        </Grid>
                    </Grid>
                </Grid>

                {/* Columna derecha: estados + préstamos/deudas */}
                <Grid item xs={12} lg={4}>
                    <Stack spacing={{ xs: 1.5, sm: 2 }} sx={{ minWidth: 0 }}>
                        <OrderStatusSummaryPanel overView={overView} />
                        <RecurringExpensesSummaryPanel recurring={recurring} />
                        <ObligationsSummaryPanel obligations={obligations} />
                    </Stack>
                </Grid>

                {/* Flujo de ingresos/gastos + velas — misma fila */}
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

                {/* Calendario — ancho completo */}
                <Grid item xs={12}>
                    <Box ref={calendarSectionRef}>
                        <Paper sx={{ ...paperSx, overflowX: "auto" }}>
                            <ChartCalendaryInfo navigateToMonth={calendarNavigate} />
                        </Paper>
                    </Box>
                </Grid>

                {/* Ingresos y compras por producto (Top 8) */}
                <Grid item xs={12}>
                    <ProductChartsPanel />
                </Grid>

                {/* Clientes y compras por producto — misma fila */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ ...paperSx, overflowX: "auto" }}>
                        <CustomersAccordionTable workbench={workbench} />
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
