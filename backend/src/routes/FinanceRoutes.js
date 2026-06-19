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
import { getCalendarMonthSummary, getCalendarDayDetail, getCalendarPeriodDetail, getCalendarYearSummary } from "../controllers/InventoryControl/CalendarFinanceController.js";
import {
  getObligationsWorkbench,
  getObligationById,
  createObligation,
  payObligation,
  cancelObligation,
} from "../controllers/InventoryControl/LoanObligationController.js";
import { getProductSeriesCharts } from "../controllers/InventoryControl/ProductSeriesController.js";
import { getCashFlowMirror } from "../controllers/InventoryControl/CashFlowMirrorController.js";
import { getCashFlowCandles } from "../controllers/InventoryControl/CashFlowCandlestickController.js";
import {
  getRecurringWorkbench,
  createRecurringTemplate,
  updateRecurringTemplate,
  updateRecurringOccurrence,
  payRecurringOccurrence,
  skipRecurringOccurrence,
  generateRecurringOccurrences,
} from "../controllers/InventoryControl/RecurringExpenseController.js";


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
router.get("/calendar-year", isAuthenticated, getCalendarYearSummary);
router.get("/calendar-day", isAuthenticated, getCalendarDayDetail);
router.get("/calendar-period", isAuthenticated, getCalendarPeriodDetail);


router.get("/overview",isAuthenticated, getOrderAnalytics);
router.get("/getWeeklySales",isAuthenticated, getWeeklySales);
router.get("/getTopProductsDailySales",isAuthenticated, getTopProductsDailySales);
router.get("/getProductRotationAnalysis",isAuthenticated, getProductRotationAnalysis);
router.get("/getIncomeExpenseBreakdown",isAuthenticated, getIncomeExpenseBreakdown);
router.get("/getCustomerSalesSummary",isAuthenticated, getCustomerSalesSummary);
router.get("/getOrdersForCharts",isAuthenticated, getOrdersForCharts);
router.get("/getExpensesForChart",isAuthenticated, getExpensesForChart);
router.get("/product-series", isAuthenticated, getProductSeriesCharts);
router.get("/cash-flow-mirror", isAuthenticated, getCashFlowMirror);
router.get("/cash-flow-candles", isAuthenticated, getCashFlowCandles);

// Préstamos y deudas (sin pedido)
router.get("/obligations/workbench", isAuthenticated, getObligationsWorkbench);
router.get("/obligations/:id", isAuthenticated, getObligationById);
router.post("/obligations", isAuthenticated, createObligation);
router.post("/obligations/:id/pay", isAuthenticated, payObligation);
router.patch("/obligations/:id/cancel", isAuthenticated, cancelObligation);

// Gastos recurrentes (arriendo, servicios, permisos)
router.get("/recurring/workbench", isAuthenticated, getRecurringWorkbench);
router.post("/recurring/templates", isAuthenticated, createRecurringTemplate);
router.put("/recurring/templates/:id", isAuthenticated, updateRecurringTemplate);
router.post("/recurring/generate", isAuthenticated, generateRecurringOccurrences);
router.patch("/recurring/occurrences/:id", isAuthenticated, updateRecurringOccurrence);
router.post("/recurring/occurrences/:id/pay", isAuthenticated, payRecurringOccurrence);
router.patch("/recurring/occurrences/:id/skip", isAuthenticated, skipRecurringOccurrence);

export default router;
