/**
 * @deprecated No importado en App.jsx. Pantalla antigua de inicio inventario.
 * Mantener solo como referencia o eliminar cuando confirmes que no se usa.
 */
import React, { useState, useEffect } from "react";
import {
  Grid, Paper, Typography, Box,
  Tooltip,
  IconButton
} from "@mui/material";
import ResponsiveTable from "./components/DataTableFinance";
import { getAllProductsAll } from "../../../api/inventoryControlRequest";
import {
  getFinanceSummaryRequest,
  getAllIncomesRequest,
  getAllExpensesRequest,
  getOverViewRequest,
} from "../../../api/financeRequest";
import { getAllOrdersRequest } from "../../../api/ordersRequest";
import TablePro from "../../../components/Tables/TablePro";
import {
  Edit,
  Delete
} from "@mui/icons-material"





const paperStyle = {
  padding: "16px",
  textAlign: "center",
  height: "100%",
  boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
};

export const HomePage = () => {
  const [dataOrders, setDataOrders] = useState([]);
  const [summary, setSummary] = useState({ totalIncome: 0, totalExpense: 0 });
  const [transactions, setTransactions] = useState([]);
  const [productsAgotados, setProductsAgotados] = useState([]);
  const [productsPorAgotarse, setProductsPorAgotarse] = useState([]);
  const [overView, setOverView] = useState([]);
  const balance = summary.totalIncome - summary.totalExpense;
  const percentExpense = summary.totalIncome
    ? (summary.totalExpense / summary.totalIncome) * 100
    : 0;

  const fetchProducts = async () => {
    const { data } = await getAllProductsAll();

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
        const [resSummary, resIncomes, resExpenses, resOrders,resOverViews] = await Promise.all([
          getFinanceSummaryRequest(),
          getAllIncomesRequest(),
          getAllExpensesRequest(),
          getAllOrdersRequest(),
          getOverViewRequest(),
        ]);
        setDataOrders(resOrders.data);
        setSummary(resSummary.data);
        setOverView(resOverViews.data);

        console.log(resOverViews.data);

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

  return (
    <Box sx={{ padding: 3 }}>
      <Grid container spacing={2}>
        {/* FILA 1 - TOTALES */}
        <Grid item xs={12} md={3}>
          <Paper style={paperStyle}>
            <Typography variant="h6">💰 Total Dinero</Typography>
            <Typography variant="h5">${balance}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={3}>
          <Paper style={paperStyle}>
            <Typography variant="h6">📈 Total Ingresos</Typography>
            <Typography variant="h5">${summary.totalIncome}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={3}>
          <Paper style={paperStyle}>
            <Typography variant="h6">📉 Total Gastos</Typography>
            <Typography variant="h5">${summary.totalExpense}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={3}>
          <Paper style={paperStyle}>
            <Typography variant="h6">📦 Total Pedidos</Typography>
            <Typography variant="h5">{dataOrders.length} pedidos</Typography>
          </Paper>
        </Grid>

        {/* FILA 2 - Productos por agotarse */}
        <Grid item xs={12} md={6}>
          <Paper style={paperStyle}>
            {/* <ResponsiveTable
              columns={[...productColumns, { id: "minStock", label: "minStock" }]}
              rows={productsPorAgotarse}
              title="⚠️ Productos por agotarse"
            /> */}
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
            {/* <ResponsiveTable
              columns={productColumns}
              rows={productsAgotados}
              title="❌ Productos agotados"
            /> */}
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

        {/* FILA 3 - Gráficos u otros */}
        <Grid item xs={12} md={6}>
          <Paper style={paperStyle}>
            <Typography variant="h6">🛒 Productos más vendidos</Typography>
            <Box mt={2}>[Gráfico o tabla]</Box>
          </Paper>
       
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper style={paperStyle}>
            <Typography variant="h6">📋 Pedidos por estado</Typography>
            <Box mt={2}>[Gráfico o tabla]</Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default HomePage;
