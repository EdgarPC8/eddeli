import { getFinanceSummary } from "./FinanceController.js";
import {
  getOrderAnalytics,
  getIncomeExpenseBreakdown,
} from "./AnalyticsController.js";
import { getFinanceWorkbenchAll } from "./OrderGroupFinanceController.js";
import { getAllProducts } from "./ProductController.js";
import { invokeController, buildProductsStockAlerts } from "../../utils/invokeController.js";
import { computeObligationsDashboardData } from "./LoanObligationController.js";
import { computeRecurringDashboardData } from "./RecurringExpenseController.js";

const emptyObligations = {
  summary: { totalReceivable: 0, totalPayable: 0, openCount: 0 },
  topOpen: [],
};

const emptyRecurring = {
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
};

/**
 * GET /finance/dashboard/hero — solo lo necesario para las cards superiores.
 * Rápido: summary + obligaciones (préstamos/deudas de las cards).
 */
export const getFinanceDashboardHero = async (req, res) => {
  try {
    const [summary, obligations] = await Promise.all([
      invokeController(getFinanceSummary, req),
      computeObligationsDashboardData(),
    ]);

    return res.json({
      summary: summary ?? {},
      obligations: obligations ?? emptyObligations,
    });
  } catch (error) {
    console.error("getFinanceDashboardHero:", error);
    return res.status(error?.status || 500).json({
      message: error?.data?.message || error?.message || "Error al cargar resumen del dashboard",
    });
  }
};

/**
 * GET /finance/dashboard/rest — paneles inferiores (stock, estados, cobranzas, etc.).
 * No repite summary ni obligations (ya vinieron en /hero).
 */
export const getFinanceDashboardRest = async (req, res) => {
  try {
    const [
      overView,
      incomeExpenseBreakdown,
      workbench,
      products,
      recurring,
    ] = await Promise.all([
      invokeController(getOrderAnalytics, req),
      invokeController(getIncomeExpenseBreakdown, req),
      invokeController(getFinanceWorkbenchAll, req),
      invokeController(getAllProducts, { ...req, query: { ...req.query, all: "true" } }),
      computeRecurringDashboardData(),
    ]);

    const productsList = Array.isArray(products)
      ? products
      : products?.products ?? products?.data ?? [];

    return res.json({
      overView: Array.isArray(overView) ? overView : [],
      incomeExpenseBreakdown: incomeExpenseBreakdown ?? {},
      workbench: {
        customers: workbench?.customers ?? [],
        orders: workbench?.orders ?? [],
        groups: workbench?.groups ?? [],
        payments: workbench?.payments ?? [],
      },
      productsStock: buildProductsStockAlerts(productsList),
      recurring: recurring ?? emptyRecurring,
    });
  } catch (error) {
    console.error("getFinanceDashboardRest:", error);
    return res.status(error?.status || 500).json({
      message: error?.data?.message || error?.message || "Error al cargar paneles del dashboard",
    });
  }
};

/**
 * GET /finance/dashboard — carga agregada completa (compatibilidad).
 */
export const getFinanceDashboard = async (req, res) => {
  try {
    const [hero, rest] = await Promise.all([
      (async () => {
        const [summary, obligations] = await Promise.all([
          invokeController(getFinanceSummary, req),
          computeObligationsDashboardData(),
        ]);
        return { summary, obligations };
      })(),
      (async () => {
        const [
          overView,
          incomeExpenseBreakdown,
          workbench,
          products,
          recurring,
        ] = await Promise.all([
          invokeController(getOrderAnalytics, req),
          invokeController(getIncomeExpenseBreakdown, req),
          invokeController(getFinanceWorkbenchAll, req),
          invokeController(getAllProducts, { ...req, query: { ...req.query, all: "true" } }),
          computeRecurringDashboardData(),
        ]);
        const productsList = Array.isArray(products)
          ? products
          : products?.products ?? products?.data ?? [];
        return {
          overView,
          incomeExpenseBreakdown,
          workbench,
          productsStock: buildProductsStockAlerts(productsList),
          recurring,
        };
      })(),
    ]);

    return res.json({
      summary: hero.summary ?? {},
      overView: Array.isArray(rest.overView) ? rest.overView : [],
      incomeExpenseBreakdown: rest.incomeExpenseBreakdown ?? {},
      workbench: {
        customers: rest.workbench?.customers ?? [],
        orders: rest.workbench?.orders ?? [],
        groups: rest.workbench?.groups ?? [],
        payments: rest.workbench?.payments ?? [],
      },
      productsStock: rest.productsStock ?? { agotados: [], porAgotarse: [] },
      obligations: hero.obligations ?? emptyObligations,
      recurring: rest.recurring ?? emptyRecurring,
      expenses: [],
      orders: [],
      expensesForChart: [],
    });
  } catch (error) {
    console.error("getFinanceDashboard:", error);
    return res.status(error?.status || 500).json({
      message: error?.data?.message || error?.message || "Error al cargar dashboard",
    });
  }
};
