import React, { useState, useEffect } from "react";
import {
    Grid, Paper, Typography, Box,
    Tooltip,
    IconButton
} from "@mui/material";
import ResponsiveTable from "./components/DataTableFinance";
import { getAllProducts } from "../../../api/inventoryControlRequest";
import {
    getFinanceSummaryRequest,
    getAllIncomesRequest,
    getAllExpensesRequest,
    getOverViewRequest,
    getWeeklySales,
    getTopProductsDailySales,
    getProductRotationAnalysis,
    getIncomeExpenseBreakdown,
    getOrdersForCharts,
    getExpensesForChart,
} from "../../../api/financeRequest";
import { getAllOrdersRequest } from "../../../api/ordersRequest";
import TablePro from "../../../components/Tables/TablePro";
import {
    Edit,
    Delete
} from "@mui/icons-material"
import DonutChart from "../../../components/Charts/Donutchart";
import BarChartDays from "./components/Charts/BarChartDays";
import LineChartMonth from "./components/Charts/LineChartMonth";
import DoblePieChart from "../../../components/Charts/DoblePieChart";
import OrderAccordionTable from "./components/OrderAccordionTable";
import CustomersAccordionTable from "./components/CustomersAccordionTable";
import BarChartOp from "./components/Charts/BarChartOp";
import ChartCalendaryInfo from "./components/Charts/ChartCalendaryInfo";
import ExpenseByDateLine from "./components/Charts/ExpenseByDateLine";
import ExpensePurchaseStats from "./components/Charts/ExpensePurchaseStats";
import ChartBlockHeader from "../../../components/Charts/ChartBlockHeader";
import GlobalFinanceBudgetPanel from "./components/Charts/GlobalFinanceBudgetPanel";



const paperStyle = {
    padding: "5px",
    textAlign: "center",
    height: "100%",
    boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
};


export const DashBoardPage = () => {
    const [dataOrders, setDataOrders] = useState([]);
    const [summary, setSummary] = useState({ totalIncome: 0, totalExpense: 0 });
    const [transactions, setTransactions] = useState([]);
    const [productsAgotados, setProductsAgotados] = useState([]);
    const [productsPorAgotarse, setProductsPorAgotarse] = useState([]);
    const [overView, setOverView] = useState([]);
    const [ordersForCharts, setOrdersForCharts] = useState([]);
    const [expensesForChart, setExpensesForChart] = useState([]);
    const [allExpensesList, setAllExpensesList] = useState([]);
    const [productRotationAnalysis, setProductRotationAnalysis] = useState([]);
    const [incomeExpenseBreakdown, setIncomeExpenseBreakdown] = useState([]);
    const [weeklySales, setWeeklySales] = useState({});
    const [topProductsDailySales, setTopProductsDailySales] = useState({});
    const balance = summary.totalIncome - summary.totalExpense;
    const percentExpense = summary.totalIncome
        ? (summary.totalExpense / summary.totalIncome) * 100
        : 0;

    const fetchProducts = async () => {
        const { data } = await getAllProducts();

        const agotados = data.filter((p) => p.stock <= 0);
        const porAgotarse = data
            .filter((p) => p.stock > p.minStock)
            .sort((a, b) => Math.abs(a.stock - a.minStock) - Math.abs(b.stock - b.minStock))


        setProductsAgotados(agotados);
        setProductsPorAgotarse(porAgotarse);
    };

    useEffect(() => {
        fetchProducts();
        const fetchData = async () => {
            try {
                const [resSummary,
                     resIncomes,
                     resExpenses,
                     resOrders,
                     resOverViews,
                     resWeeklySales,
                     resTopProductsDailySales,
                     resProductRotationAnalysis,
                     resIncomeExpenseBreakdown,
                     resOrdersForCharts,
                     resExpensesForChart,
                    ] = await Promise.all([
                    getFinanceSummaryRequest(),
                    getAllIncomesRequest(),
                    getAllExpensesRequest(),
                    getAllOrdersRequest(),
                    getOverViewRequest(),
                    getWeeklySales(),
                    getTopProductsDailySales(),
                    getProductRotationAnalysis(),
                    getIncomeExpenseBreakdown(),
                    getOrdersForCharts(),
                    getExpensesForChart()
                ]);
                setDataOrders(resOrders.data);
                setSummary(resSummary.data);
                setOverView(resOverViews.data);
                setWeeklySales(resWeeklySales.data);
                setTopProductsDailySales(resTopProductsDailySales.data ?? {});
                setProductRotationAnalysis(resProductRotationAnalysis.data)
                setIncomeExpenseBreakdown(resIncomeExpenseBreakdown.data)
                setOrdersForCharts(resOrdersForCharts.data)
                setExpensesForChart(resExpensesForChart.data)
                setAllExpensesList(Array.isArray(resExpenses.data) ? resExpenses.data : [])

                const combined = [
                    ...resIncomes.data.map((i) => ({
                        name: "Ingreso",
                        description: i.concept,
                        date: i.date,
                        amount: i.amount,
                        status: "Ingreso",
                    })),
                    ...resExpenses.data.map((e) => ({
                        name: "Gasto",
                        description: e.concept,
                        date: e.date,
                        amount: e.amount,
                        status: "Gasto",
                    })),
                ];

                const sorted = combined.sort((a, b) => new Date(b.date) - new Date(a.date));
                setTransactions(sorted.slice(0, 10));
            } catch (err) {
                console.error("Error al cargar datos financieros:", err);
            }
        };

        fetchData();
    }, []);

    const productColumns = [
        { id: "name", label: "Producto" },
        { id: "price", label: "Precio", align: "right" },
        { id: "stock", label: "Stock", align: "right" },
    ];
    const AnaliticsColumns = [
        { id: "label", label: "Info", align: "left" },
        { id: "value", label: "Valor", align: "right" }
    ];

    const AnaliticsRotationColumns = [
        { id: "producto", label: "Producto", align: "left" },
        { id: "ultimaCompra", label: "Última compra", align: "center" },
        { id: "ultimoAgotamiento", label: "Último agotamiento", align: "center" },
        { id: "diasHastaAgotar", label: "Días hasta agotar", align: "center" },
        {
            id: "consumoPromedioPorDia",
            label: "Consumo promedio por día",
            align: "center",
        },
        {
            id: "cicloPromedio",
            label: "Ciclo promedio (compra → agotamiento)",
            align: "center",
        },
        { id: "unidad", label: "Unidad", align: "center" },
    ];



    return (
        <Box sx={{ padding: 3 }}>
            <Grid container spacing={2}>
                    <Grid container xs={12} md={8}>
                        {/* FILA 1 - TOTALES */}
                        <Grid item xs={12} md={3}>
                            <Paper style={paperStyle} >
                                <Typography variant="h6">💰 Total Dinero</Typography>
                                <Typography variant="h5">${balance.toFixed(2)}</Typography>
                            </Paper>
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <Paper style={paperStyle}>
                                <Typography variant="h6">📈 Total Ingresos</Typography>
                                <Typography variant="h5">${summary.totalIncome.toFixed(2)}</Typography>
                            </Paper>
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <Paper style={paperStyle}>
                                <Typography variant="h6">📉 Total Gastos</Typography>
                                <Typography variant="h5">${summary.totalExpense.toFixed(2)}</Typography>
                            </Paper>
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <Paper style={paperStyle}>
                                <Typography variant="h6">💰 Dinero Esperado</Typography>
                                <Typography variant="h5">
                                    ${summary?.projectedBalance?.toFixed(2) ?? "0.00"}
                                </Typography>

                            </Paper>
                        </Grid>

                        {/* FILA 2 - Productos por agotarse */}
                        <Grid item xs={12} md={6}>
                            <Paper style={paperStyle}>

                                <TablePro
                                    columns={[...productColumns, { id: "minStock", label: "minStock" }]}
                                    rows={productsPorAgotarse}
                                    showSearch={false}
                                    showPagination={true}
                                    defaultRowsPerPage={5}
                                    title="⚠️ Productos por agotarse"
                                />
                            </Paper>
                        </Grid>

                        {/* FILA 2 - Productos agotados */}
                        <Grid item xs={12} md={6}>
                            <Paper style={paperStyle}>

                                <TablePro
                                    columns={productColumns}
                                    rows={productsAgotados}
                                    showSearch={false}
                                    showPagination={true}
                                    defaultRowsPerPage={5}
                                    title="❌ Productos agotados"
                                />
                            </Paper>
                        </Grid>
                    </Grid>
                    <Grid container xs={12} md={4}>
                        <Grid item xs={12} md={12}>
                            <Paper style={paperStyle}>
                                <Box sx={{ textAlign: 'left', px: 0.5 }}>
                                    <ChartBlockHeader
                                        title="Resumen de estados de pedido"
                                        subtitle="Conteos según si los ítems están pagados y/o entregados (vista global de todas las órdenes)."
                                    />
                                </Box>
                                <TablePro
                                    columns={AnaliticsColumns}
                                    rows={overView}
                                    showSearch={false}
                                    showPagination={false}
                                    defaultRowsPerPage={5}
                                />
                            </Paper>

                        </Grid>
                        <Grid item xs={12} md={12}>
                            <Paper style={paperStyle}>
                                <Box sx={{ textAlign: 'left', px: 0.5 }}>
                                    <BarChartDays dataDays={weeklySales.labels} dataValues={weeklySales.values} />
                                </Box>
                            </Paper>
                        </Grid>
                    </Grid>




 
                <Grid container xs={12} md={12}>
                    <Grid item xs={12} md={5}>
                        <Paper style={paperStyle}>
                            {/* <TablePro
                                columns={AnaliticsRotationColumns}
                                rows={productRotationAnalysis}
                                showSearch={false}
                                showPagination={true}
                                defaultRowsPerPage={5}
                                title="Analisis de Productos"
                            /> */}
                            <DoblePieChart data={incomeExpenseBreakdown} displayMode="both" />

                        </Paper>



                    </Grid>
                    <Grid item xs={12} md={7}>
                        <Paper style={paperStyle}>
                                                <ChartCalendaryInfo orders={ordersForCharts}/>

                        </Paper>
                    </Grid>
                </Grid>
                        <Grid container xs={12} md={12}>
                    <Grid item xs={12} md={7}>
                        <Paper style={paperStyle}>
                            <LineChartMonth bundle={topProductsDailySales} />

                        </Paper>


                    </Grid>
                    <Grid item xs={12} md={5}>
                        <Paper style={paperStyle}>
                            <BarChartOp orders={ordersForCharts}/>
                        </Paper>


                    </Grid>
                  
                </Grid>
                <Grid container xs={12} md={12}>
                    <Grid item xs={12} md={12}>
                        <Paper style={paperStyle}>
                            <Box sx={{ textAlign: "left", px: 0.5, pt: 0.5 }}>
                                <GlobalFinanceBudgetPanel orders={dataOrders} expenses={allExpensesList} />
                            </Box>
                        </Paper>
                    </Grid>
                </Grid>
                   <Grid container xs={12} md={12}>
                    <Grid item xs={12} md={12}>
                        <Paper style={paperStyle}>
                        
                        <ExpenseByDateLine sampleExpenses={expensesForChart}/>

                        </Paper>

                    </Grid>
                  
                </Grid>
                   <Grid container xs={12} md={12}>
                    <Grid item xs={12} md={12}>
                        <Paper style={paperStyle}>
                        <Box sx={{ textAlign: 'left', px: 0.5, pt: 0.5 }}>
                            <ChartBlockHeader
                                title="Clientes, pedidos y saldos"
                                subtitle="Por cliente: pedidos, totales, deuda pendiente y detalle por producto. Datos desde el resumen de ventas del API."
                            />
                        </Box>
                        <CustomersAccordionTable/>
                        </Paper>

                    </Grid>
                  
                </Grid>
                   <Grid container xs={12} md={12}>
                    <Grid item xs={12} md={12}>
                        <Paper style={paperStyle}>
                        <ExpensePurchaseStats sampleExpenses={expensesForChart}/>
                        </Paper>

                    </Grid>
                  
                </Grid>

            </Grid>
        </Box>
    );
};

export default DashBoardPage;
