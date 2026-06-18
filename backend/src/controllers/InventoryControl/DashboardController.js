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
    ] = await Promise.all([
      invokeController(getFinanceSummary, req),
      invokeController(getAllExpenses, req),
      invokeController(getAllOrders, req),
      invokeController(getOrderAnalytics, req),
      invokeController(getIncomeExpenseBreakdown, req),
      invokeController(getExpensesForChart, req),
      invokeController(getFinanceWorkbenchAll, req),
      invokeController(getAllProducts, req),
      computeObligationsDashboardData(),
    ]);

    const productsStock = buildProductsStockAlerts(products);

    return res.json({
      summary,
      expenses: Array.isArray(expenses) ? expenses : [],
      orders: Array.isArray(orders) ? orders : [],
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
    });
  } catch (error) {
    console.error("getFinanceDashboard:", error);
    return res.status(error?.status || 500).json({
      message: error?.data?.message || error?.message || "Error al cargar dashboard",
    });
  }
};
