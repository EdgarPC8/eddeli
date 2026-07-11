import axios, { jwt } from "./axios.js";

// ✅ Ingresos

// Crear un nuevo ingreso
export const createIncomeRequest = async (data) => {
  return await axios.post("/finance/incomes", data, {
    headers: { Authorization: jwt() },
  });
};

// Obtener todos los ingresos
export const getAllIncomesRequest = async () => {
  return await axios.get("/finance/incomes", {
    headers: { Authorization: jwt() },
  });
};

// Actualizar un ingreso
export const updateIncomeRequest = async (id, data) => {
  return await axios.put(`/finance/incomes/${id}`, data, {
    headers: { Authorization: jwt() },
  });
};

// Eliminar un ingreso
export const deleteIncomeRequest = async (id) => {
  return await axios.delete(`/finance/incomes/${id}`, {
    headers: { Authorization: jwt() },
  });
};

// ✅ Gastos

// Crear un nuevo gasto
export const createExpenseRequest = async (data) => {
  return await axios.post("/finance/expenses", data, {
    headers: { Authorization: jwt() },
  });
};

// Obtener todos los gastos
export const getAllExpensesRequest = async () => {
  return await axios.get("/finance/expenses", {
    headers: { Authorization: jwt() },
  });
};

// Actualizar un gasto
export const updateExpenseRequest = async (id, data) => {
  return await axios.put(`/finance/expenses/${id}`, data, {
    headers: { Authorization: jwt() },
  });
};

// Eliminar un gasto
export const deleteExpenseRequest = async (id) => {
  return await axios.delete(`/finance/expenses/${id}`, {
    headers: { Authorization: jwt() },
  });
};

// 📊 Resumen financiero

// Obtener resumen de ingresos, gastos y balance
export const getFinanceSummaryRequest = async () => {
  return await axios.get("/finance/summary", {
    headers: { Authorization: jwt() },
  });
};

/** Series de ventas por producto final (semana | mes | año). */
export const getProductSeriesChartsRequest = async (period = "month", band = 1) =>
  axios.get("/finance/product-series", {
    params: { period, band },
    headers: { Authorization: jwt() },
  });

/** Cards superiores del dashboard (rápido). */
export const getFinanceDashboardHeroRequest = async () => {
  return await axios.get("/finance/dashboard/hero", {
    headers: { Authorization: jwt() },
  });
};

/** Paneles inferiores del dashboard (carga diferida). */
export const getFinanceDashboardRestRequest = async () => {
  return await axios.get("/finance/dashboard/rest", {
    headers: { Authorization: jwt() },
  });
};

/** Carga agregada del dashboard (una sola petición). */
export const getFinanceDashboardRequest = async () => {
  return await axios.get("/finance/dashboard", {
    headers: { Authorization: jwt() },
  });
};

/** Resumen ligero del calendario por mes (solo totales por día). */
export const getCalendarMonthSummaryRequest = async (year, month) => {
  return await axios.get("/finance/calendar-month", {
    params: { year, month },
    headers: { Authorization: jwt() },
  });
};

/** Resumen anual: totales por mes (pedidos, caja, cobranzas, gastos). */
export const getCalendarYearSummaryRequest = async (year) =>
  axios.get("/finance/calendar-year", {
    params: { year },
    headers: { Authorization: jwt() },
  });

/** Detalle de un día para el modal del calendario. */
export const getCalendarDayDetailRequest = async (date) => {
  return await axios.get("/finance/calendar-day", {
    params: { date },
    headers: { Authorization: jwt() },
  });
};

/** Detalle agregado de un rango (día, semana o mes). */
export const getCalendarPeriodDetailRequest = async (startDate, endDate) =>
  axios.get("/finance/calendar-period", {
    params: { startDate, endDate: endDate ?? startDate },
    headers: { Authorization: jwt() },
  });
export const getOverViewRequest = async () => {
  return await axios.get("/finance/overview", {
    headers: { Authorization: jwt() },
  });
};
export const getWeeklySales = async () => {
  return await axios.get("/finance/getWeeklySales", {
    headers: { Authorization: jwt() },
  });
};
/** Respuesta: { paid, delivered } cada uno con products, dataset, datasetAmount */
export const getTopProductsDailySales = async () => {
  return await axios.get("/finance/getTopProductsDailySales", {
    headers: { Authorization: jwt() },
  });
};
export const getProductRotationAnalysis = async () => {
  return await axios.get("/finance/getProductRotationAnalysis", {
    headers: { Authorization: jwt() },
  });
};
export const getIncomeExpenseBreakdown = async () => {
  return await axios.get("/finance/getIncomeExpenseBreakdown", {
    headers: { Authorization: jwt() },
  });
};

/** Desglose por categoría con líneas de detalle (modal). */
export const getIncomeExpenseBreakdownDetail = async () => {
  return await axios.get("/finance/getIncomeExpenseBreakdown", {
    params: { detail: "1" },
    headers: { Authorization: jwt() },
  });
};
export const getCustomerSalesSummary = async () => {
  return await axios.get("/finance/getCustomerSalesSummary", {
    headers: { Authorization: jwt() },
  });
};
export const getOrdersForCharts = async () => {
  return await axios.get("/finance/getOrdersForCharts", {
    headers: { Authorization: jwt() },
  });
};
export const getExpensesForChart = async ({ startDate, endDate, insumosOnly = true } = {}) => {
  const params = {};
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;
  if (insumosOnly) params.insumosOnly = "1";
  return await axios.get("/finance/getExpensesForChart", {
    params,
    headers: { Authorization: jwt() },
  });
};

export const getCashFlowMirrorRequest = async ({ granularity = "day", startDate, endDate } = {}) => {
  const params = { granularity };
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;
  return await axios.get("/finance/cash-flow-mirror", {
    params,
    headers: { Authorization: jwt() },
  });
};

/** Velas japonesas del saldo acumulado (ingresos − gastos). */
export const getCashFlowCandlesRequest = async ({
  granularity = "day",
  limit = 25,
  offset = 0,
} = {}) =>
  axios.get("/finance/cash-flow-candles", {
    params: { granularity, limit, offset },
    headers: { Authorization: jwt() },
  });

// Préstamos y deudas (sin pedido)
export const getObligationsWorkbenchRequest = async (params = {}) =>
  axios.get("/finance/obligations/workbench", {
    params,
    headers: { Authorization: jwt() },
  });

export const getObligationByIdRequest = async (id) =>
  axios.get(`/finance/obligations/${id}`, {
    headers: { Authorization: jwt() },
  });

export const createObligationRequest = async (data) =>
  axios.post("/finance/obligations", data, {
    headers: { Authorization: jwt(), "Content-Type": "application/json" },
  });

export const payObligationRequest = async (id, data) =>
  axios.post(`/finance/obligations/${id}/pay`, data, {
    headers: { Authorization: jwt(), "Content-Type": "application/json" },
  });

export const cancelObligationRequest = async (id) =>
  axios.patch(`/finance/obligations/${id}/cancel`, null, {
    headers: { Authorization: jwt() },
  });

// Gastos recurrentes (arriendo, servicios, permisos)
export const getRecurringWorkbenchRequest = async (params = {}) =>
  axios.get("/finance/recurring/workbench", {
    params,
    headers: { Authorization: jwt() },
  });

export const createRecurringTemplateRequest = async (data) =>
  axios.post("/finance/recurring/templates", data, {
    headers: { Authorization: jwt(), "Content-Type": "application/json" },
  });

export const updateRecurringTemplateRequest = async (id, data) =>
  axios.put(`/finance/recurring/templates/${id}`, data, {
    headers: { Authorization: jwt(), "Content-Type": "application/json" },
  });

export const updateRecurringOccurrenceRequest = async (id, data) =>
  axios.patch(`/finance/recurring/occurrences/${id}`, data, {
    headers: { Authorization: jwt(), "Content-Type": "application/json" },
  });

export const payRecurringOccurrenceRequest = async (id, data) =>
  axios.post(`/finance/recurring/occurrences/${id}/pay`, data, {
    headers: { Authorization: jwt(), "Content-Type": "application/json" },
  });

export const skipRecurringOccurrenceRequest = async (id, data) =>
  axios.patch(`/finance/recurring/occurrences/${id}/skip`, data, {
    headers: { Authorization: jwt(), "Content-Type": "application/json" },
  });

export const generateRecurringOccurrencesRequest = async () =>
  axios.post("/finance/recurring/generate", null, {
    headers: { Authorization: jwt() },
  });
