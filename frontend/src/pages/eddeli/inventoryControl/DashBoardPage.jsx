import React, { useState, useEffect, useMemo } from "react";
import { Grid, Paper, Box, Stack } from "@mui/material";
import { getFinanceDashboardRequest } from "../../../api/financeRequest";
import BarChartDays from "./components/Charts/BarChartDays";
import LineChartMonth from "./components/Charts/LineChartMonth";
import CustomersAccordionTable from "./components/CustomersAccordionTable";
import BarChartOp from "./components/Charts/BarChartOp";
import ChartCalendaryInfo from "./components/Charts/ChartCalendaryInfo";
import ExpenseByDateLine from "./components/Charts/ExpenseByDateLine";
import ExpensePurchaseStats from "./components/Charts/ExpensePurchaseStats";
import ChartBlockHeader from "../../../components/Charts/ChartBlockHeader";
import GlobalFinanceBudgetPanel from "./components/Charts/GlobalFinanceBudgetPanel";
import FinanceSummaryCards from "./components/FinanceSummaryCards";
import DashboardStockPanel from "./components/DashboardStockPanel";
import OrderStatusSummaryPanel from "./components/OrderStatusSummaryPanel";
import IncomeExpenseCategoryChart from "./components/IncomeExpenseCategoryChart";
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
    const [dataOrders, setDataOrders] = useState([]);
    const [summary, setSummary] = useState({ totalIncome: 0, totalExpense: 0 });
    const [productsStock, setProductsStock] = useState(defaultProductsStock);
    const [overView, setOverView] = useState([]);
    const [ordersForCharts, setOrdersForCharts] = useState([]);
    const [expensesForChart, setExpensesForChart] = useState([]);
    const [allExpensesList, setAllExpensesList] = useState([]);
    const [incomeExpenseBreakdown, setIncomeExpenseBreakdown] = useState({});
    const [weeklySales, setWeeklySales] = useState({});
    const [topProductsDailySales, setTopProductsDailySales] = useState({});
    const [workbench, setWorkbench] = useState({
        customers: [],
        orders: [],
        groups: [],
        payments: [],
    });

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
                setDataOrders(data.orders ?? []);
                setOverView(data.overView ?? []);
                setWeeklySales(data.weeklySales ?? { labels: [], values: [] });
                setTopProductsDailySales(data.topProductsDailySales ?? {});
                setIncomeExpenseBreakdown(data.incomeExpenseBreakdown ?? {});
                setOrdersForCharts(data.ordersForCharts ?? []);
                setExpensesForChart(data.expensesForChart ?? []);
                setAllExpensesList(Array.isArray(data.expenses) ? data.expenses : []);
                setProductsStock(data.productsStock ?? defaultProductsStock);
                setWorkbench({
                    customers: data.workbench?.customers ?? [],
                    orders: data.workbench?.orders ?? [],
                    groups: data.workbench?.groups ?? [],
                    payments: data.workbench?.payments ?? [],
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
                />
            </Box>

            <Grid container spacing={{ xs: 1.5, sm: 2 }}>
                {/* Columna izquierda: inventario + ingresos/gastos */}
                <Grid item xs={12} lg={8}>
                    <Stack spacing={{ xs: 1.5, sm: 2 }} sx={{ minWidth: 0 }}>
                        <DashboardStockPanel
                            productsStock={productsStock}
                            onStockUpdated={setProductsStock}
                        />
                        <IncomeExpenseCategoryChart data={incomeExpenseBreakdown} />
                    </Stack>
                </Grid>

                {/* Columna derecha: estados + ventas semanales */}
                <Grid item xs={12} lg={4}>
                    <Stack spacing={{ xs: 1.5, sm: 2 }} sx={{ minWidth: 0 }}>
                        <OrderStatusSummaryPanel overView={overView} />
                        <Paper sx={paperSx}>
                            <Box sx={{ textAlign: "left", minWidth: 0, overflowX: "auto" }}>
                                <BarChartDays
                                    dataDays={weeklySales.labels}
                                    dataValues={weeklySales.values}
                                />
                            </Box>
                        </Paper>
                    </Stack>
                </Grid>

                {/* Calendario — ancho completo */}
                <Grid item xs={12}>
                    <Paper sx={{ ...paperSx, overflowX: "auto" }}>
                        <ChartCalendaryInfo />
                    </Paper>
                </Grid>

                {/* Top productos / barras */}
                <Grid item xs={12} md={7}>
                    <Paper sx={{ ...paperSx, overflowX: "auto" }}>
                        <LineChartMonth bundle={topProductsDailySales} />
                    </Paper>
                </Grid>
                <Grid item xs={12} md={5}>
                    <Paper sx={{ ...paperSx, overflowX: "auto" }}>
                        <BarChartOp orders={ordersForCharts} />
                    </Paper>
                </Grid>

                {/* Presupuesto global */}
                <Grid item xs={12}>
                    <Paper sx={paperSx}>
                        <Box sx={{ textAlign: "left", minWidth: 0, overflowX: "auto" }}>
                            <GlobalFinanceBudgetPanel
                                orders={dataOrders}
                                expenses={allExpensesList}
                            />
                        </Box>
                    </Paper>
                </Grid>

                {/* Gastos por fecha */}
                <Grid item xs={12}>
                    <Paper sx={{ ...paperSx, overflowX: "auto" }}>
                        <ExpenseByDateLine sampleExpenses={expensesForChart} />
                    </Paper>
                </Grid>

                {/* Clientes */}
                <Grid item xs={12}>
                    <Paper sx={paperSx}>
                        <Box sx={{ textAlign: "left", minWidth: 0, overflowX: "auto", px: { xs: 0.5, sm: 1 }, pt: 0.5 }}>
                            <ChartBlockHeader
                                title="Clientes, pedidos y saldos"
                                subtitle="Por cliente: ventas históricas, cobrable bruto, abonos en grupos y saldo pendiente (Cobranzas)."
                            />
                        </Box>
                        <Box sx={{ overflowX: "auto", minWidth: 0 }}>
                            <CustomersAccordionTable workbench={workbench} />
                        </Box>
                    </Paper>
                </Grid>

                {/* Estadísticas de compras */}
                <Grid item xs={12}>
                    <Paper sx={{ ...paperSx, overflowX: "auto" }}>
                        <ExpensePurchaseStats sampleExpenses={expensesForChart} />
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

export default DashBoardPage;
