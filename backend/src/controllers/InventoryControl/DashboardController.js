import { getFinanceSummary, getAllExpenses } from "./FinanceController.js";
import {
  getOrderAnalytics,
  getWeeklySales,
  getTopProductsDailySales,
  getIncomeExpenseBreakdown,
  getOrdersForCharts,
  getExpensesForChart,
} from "./AnalyticsController.js";
import { getAllOrders } from "./OrderController.js";
import { getFinanceWorkbenchAll } from "./OrderGroupFinanceController.js";
import { getAllProducts } from "./ProductController.js";
import { invokeController, buildProductsStockAlerts } from "../../utils/invokeController.js";

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
      weeklySales,
      topProductsDailySales,
      incomeExpenseBreakdown,
      ordersForCharts,
      expensesForChart,
      workbench,
      products,
    ] = await Promise.all([
      invokeController(getFinanceSummary, req),
      invokeController(getAllExpenses, req),
      invokeController(getAllOrders, req),
      invokeController(getOrderAnalytics, req),
      invokeController(getWeeklySales, req),
      invokeController(getTopProductsDailySales, req),
      invokeController(getIncomeExpenseBreakdown, req),
      invokeController(getOrdersForCharts, req),
      invokeController(getExpensesForChart, req),
      invokeController(getFinanceWorkbenchAll, req),
      invokeController(getAllProducts, req),
    ]);

    const productsStock = buildProductsStockAlerts(products);

    return res.json({
      summary,
      expenses: Array.isArray(expenses) ? expenses : [],
      orders: Array.isArray(orders) ? orders : [],
      overView: Array.isArray(overView) ? overView : [],
      weeklySales: weeklySales ?? { labels: [], values: [] },
      topProductsDailySales: topProductsDailySales ?? {},
      incomeExpenseBreakdown: incomeExpenseBreakdown ?? {},
      ordersForCharts: Array.isArray(ordersForCharts) ? ordersForCharts : [],
      expensesForChart: Array.isArray(expensesForChart) ? expensesForChart : [],
      workbench: {
        customers: workbench?.customers ?? [],
        orders: workbench?.orders ?? [],
        groups: workbench?.groups ?? [],
        payments: workbench?.payments ?? [],
      },
      productsStock,
    });
  } catch (error) {
    console.error("getFinanceDashboard:", error);
    return res.status(error?.status || 500).json({
      message: error?.data?.message || error?.message || "Error al cargar dashboard",
    });
  }
};
