// routes/financeRoutes.js
import { Router } from "express";
import {
  createIncome,
  updateIncome,
  deleteIncome,
  getAllIncomes,
  createExpense,
  updateExpense,
  deleteExpense,
  getAllExpenses,
  getFinanceSummary,
} from "../controllers/InventoryControl/FinanceController.js";
import { isAuthenticated } from "../middlewares/authMiddelware.js";
import { getOrderAnalytics, getWeeklySales,getTopProductsDailySales,getProductRotationAnalysis,getIncomeExpenseBreakdown,getCustomerSalesSummary, getOrdersForCharts,getExpensesForChart } from "../controllers/InventoryControl/AnalyticsController.js";
import { getFinanceDashboard } from "../controllers/InventoryControl/DashboardController.js";
import { getCalendarMonthSummary, getCalendarDayDetail } from "../controllers/InventoryControl/CalendarFinanceController.js";
import {
  getObligationsWorkbench,
  getObligationById,
  createObligation,
  payObligation,
  cancelObligation,
} from "../controllers/InventoryControl/LoanObligationController.js";
import { getProductSeriesCharts } from "../controllers/InventoryControl/ProductSeriesController.js";


const router = new Router();

// ✅ Ingresos
router.post("/incomes", isAuthenticated, createIncome);
router.get("/incomes", isAuthenticated, getAllIncomes);
router.put("/incomes/:id", isAuthenticated, updateIncome);
router.delete("/incomes/:id", isAuthenticated, deleteIncome);

// ✅ Gastos
router.post("/expenses", isAuthenticated, createExpense);
router.get("/expenses", isAuthenticated, getAllExpenses);
router.put("/expenses/:id", isAuthenticated, updateExpense);
router.delete("/expenses/:id", isAuthenticated, deleteExpense);

// 📊 Resumen financiero
router.get("/summary", isAuthenticated, getFinanceSummary);
router.get("/dashboard", isAuthenticated, getFinanceDashboard);
router.get("/calendar-month", isAuthenticated, getCalendarMonthSummary);
router.get("/calendar-day", isAuthenticated, getCalendarDayDetail);


router.get("/overview",isAuthenticated, getOrderAnalytics);
router.get("/getWeeklySales",isAuthenticated, getWeeklySales);
router.get("/getTopProductsDailySales",isAuthenticated, getTopProductsDailySales);
router.get("/getProductRotationAnalysis",isAuthenticated, getProductRotationAnalysis);
router.get("/getIncomeExpenseBreakdown",isAuthenticated, getIncomeExpenseBreakdown);
router.get("/getCustomerSalesSummary",isAuthenticated, getCustomerSalesSummary);
router.get("/getOrdersForCharts",isAuthenticated, getOrdersForCharts);
router.get("/getExpensesForChart",isAuthenticated, getExpensesForChart);
router.get("/product-series", isAuthenticated, getProductSeriesCharts);

// Préstamos y deudas (sin pedido)
router.get("/obligations/workbench", isAuthenticated, getObligationsWorkbench);
router.get("/obligations/:id", isAuthenticated, getObligationById);
router.post("/obligations", isAuthenticated, createObligation);
router.post("/obligations/:id/pay", isAuthenticated, payObligation);
router.patch("/obligations/:id/cancel", isAuthenticated, cancelObligation);

export default router;
