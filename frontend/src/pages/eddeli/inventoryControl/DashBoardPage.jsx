import React, { useState, useEffect, useMemo } from "react";
import { Grid, Paper, Box, Stack } from "@mui/material";
import { getFinanceDashboardRequest } from "../../../api/financeRequest";
import CustomersAccordionTable from "./components/CustomersAccordionTable";
import ChartCalendaryInfo from "./components/Charts/ChartCalendaryInfo";
import ProductChartsPanel from "./components/Charts/ProductChartsPanel";
import ExpensePurchaseStats from "./components/Charts/ExpensePurchaseStats";
import ChartBlockHeader from "../../../components/Charts/ChartBlockHeader";
import FinanceSummaryCards from "./components/FinanceSummaryCards";
import DashboardStockPanel from "./components/DashboardStockPanel";
import OrderStatusSummaryPanel from "./components/OrderStatusSummaryPanel";
import IncomeExpenseCategoryChart from "./components/IncomeExpenseCategoryChart";
import ObligationsSummaryPanel from "./components/ObligationsSummaryPanel";
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

                {/* Columna derecha: estados + préstamos/deudas */}
                <Grid item xs={12} lg={4}>
                    <Stack spacing={{ xs: 1.5, sm: 2 }} sx={{ minWidth: 0 }}>
                        <OrderStatusSummaryPanel overView={overView} />
                        <ObligationsSummaryPanel obligations={obligations} />
                    </Stack>
                </Grid>

                {/* Calendario — ancho completo */}
                <Grid item xs={12}>
                    <Paper sx={{ ...paperSx, overflowX: "auto" }}>
                        <ChartCalendaryInfo />
                    </Paper>
                </Grid>

                {/* Ingresos y compras por producto (Top 8) */}
                <Grid item xs={12}>
                    <ProductChartsPanel />
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
                        <ExpensePurchaseStats />
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

export default DashBoardPage;
