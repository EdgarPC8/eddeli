import { getFinanceSummary, getAllExpenses } from "./FinanceController.js";
import {
  getOrderAnalytics,
  getIncomeExpenseBreakdown,
  getExpensesForChart,
} from "./AnalyticsController.js";
import { getAllOrders } from "./OrderController.js";
import { getFinanceWorkbenchAll } from "./OrderGroupFinanceController.js";
import { getAllProducts } from "./ProductController.js";
import { invokeController, buildProductsStockAlerts } from "../../utils/invokeController.js";
import { computeObligationsDashboardData } from "./LoanObligationController.js";
import { computeRecurringDashboardData } from "./RecurringExpenseController.js";

/**
 * GET /finance/dashboard — carga agregada para el dashboard (una sola petición).
 */
export const getFinanceDashboard = async (req, res) => {
  try {
    const [
      summary,
      expenses,
      orders,
      overView,
      incomeExpenseBreakdown,
      expensesForChart,
      workbench,
      products,
      obligations,
      recurring,
    ] = await Promise.all([
      invokeController(getFinanceSummary, req),
      invokeController(getAllExpenses, req),
      invokeController(getAllOrders, { ...req, query: { ...req.query, all: "true" } }),
      invokeController(getOrderAnalytics, req),
      invokeController(getIncomeExpenseBreakdown, req),
      invokeController(getExpensesForChart, req),
      invokeController(getFinanceWorkbenchAll, req),
      invokeController(getAllProducts, { ...req, query: { ...req.query, all: "true" } }),
      computeObligationsDashboardData(),
      computeRecurringDashboardData(),
    ]);

    const productsList = Array.isArray(products)
      ? products
      : products?.products ?? products?.data ?? [];
    const ordersList = Array.isArray(orders) ? orders : orders?.data ?? [];

    const productsStock = buildProductsStockAlerts(productsList);

    return res.json({
      summary,
      expenses: Array.isArray(expenses) ? expenses : [],
      orders: ordersList,
      overView: Array.isArray(overView) ? overView : [],
      incomeExpenseBreakdown: incomeExpenseBreakdown ?? {},
      expensesForChart: Array.isArray(expensesForChart) ? expensesForChart : [],
      workbench: {
        customers: workbench?.customers ?? [],
        orders: workbench?.orders ?? [],
        groups: workbench?.groups ?? [],
        payments: workbench?.payments ?? [],
      },
      productsStock,
      obligations: obligations ?? {
        summary: { totalReceivable: 0, totalPayable: 0, openCount: 0 },
        topOpen: [],
      },
      recurring: recurring ?? {
        summary: {
          monthlyFixed: 0,
          monthlyVariableEstimate: 0,
          monthlyBurden: 0,
          pendingThisMonth: 0,
          paidThisMonth: 0,
          activeTemplates: 0,
          overdueCount: 0,
          monthIncome: 0,
          gapToCover: 0,
          dailySalesTarget: 0,
          daysLeftInMonth: 1,
          isProfitable: false,
        },
        upcoming: [],
        overdue: [],
      },
    });
  } catch (error) {
    console.error("getFinanceDashboard:", error);
    return res.status(error?.status || 500).json({
      message: error?.data?.message || error?.message || "Error al cargar dashboard",
    });
  }
};
