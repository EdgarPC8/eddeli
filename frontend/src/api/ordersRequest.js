import axios, { jwt } from "./axios.js";
import { endOfMonth, format, startOfMonth, subMonths } from "date-fns";

/// 🟢 Pedidos
// Crear un nuevo pedido con items
export const createOrderRequest = async (data) =>
  await axios.post("/orders", data, {
    headers: { Authorization: jwt() },
  });

/** Venta atómica desde caja (turno abierto, stock, ingreso). */
export const posCheckoutRequest = async (data) =>
  await axios.post("/orders/pos/checkout", data, {
    headers: { Authorization: jwt() },
  });

/** Ventas POS para facturación e impresión. */
export const getPosSalesRequest = async (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return axios.get(`/orders/pos/sales${qs ? `?${qs}` : ""}`, {
    headers: { Authorization: jwt() },
  });
};

// Cambiar estado del pedido (entregado, cancelado)
export const updateOrderStatusRequest = async (orderId, status) =>
  await axios.put(`/orders/${orderId}/status`, { status }, {
    headers: { Authorization: jwt() },
  });

// Obtener pedidos (con cliente e items). Opcional: { from, to, page, pageSize, all }
export const getAllOrdersRequest = async ({ from, to, all = true, page, pageSize } = {}) => {
  const params = new URLSearchParams();
  if (from) params.set("from", format(from, "yyyy-MM-dd"));
  if (to) params.set("to", format(to, "yyyy-MM-dd"));
  if (all) params.set("all", "true");
  if (page) params.set("page", String(page));
  if (pageSize) params.set("pageSize", String(pageSize));
  const qs = params.toString();
  return axios.get(`/orders${qs ? `?${qs}` : ""}`, {
    headers: { Authorization: jwt() },
  });
};

/** Rango mes visible + mes anterior. */
export const getOrdersForMonthRequest = async (visibleMonth) => {
  const from = startOfMonth(subMonths(visibleMonth, 1));
  const to = endOfMonth(visibleMonth);
  return getAllOrdersRequest({ from, to });
};
  export const updateOrderRequest = async (id, data) =>
  await axios.put(`/orders/${id}`, data, {
    headers: { Authorization: jwt() },
  });

/** Agregar una línea (producto) a un pedido ya creado — solo Admin/Programador en backend. */
export const addOrderItemToOrderRequest = async (orderId, data) =>
  await axios.post(`/orders/${orderId}/items`, data, {
    headers: { Authorization: jwt() },
  });
// ✅ Marcar ítem como entregado
export const markItemAsDeliveredRequest = async (itemId) =>
  await axios.put(`/orders/order-items/${itemId}/mark-delivered`, {}, {
    headers: { Authorization: jwt() },
  });

// 💰 Marcar ítem como pagado
export const markItemAsPaidRequest = async (itemId) =>
  await axios.put(`/orders/order-items/${itemId}/mark-paid`, {}, {
    headers: { Authorization: jwt() },
  });
  export const updateOrderItemRequest = async (itemId, data) =>
  await axios.put(`/orders/order-items/${itemId}`, data, {
    headers: { Authorization: jwt() },
  });

/** Solo Programador — dashboard estados de pedido (fechas + stock, solo Logs). */
export const programmerDashboardOrderItemCorrectionRequest = async (itemId, data) =>
  await axios.put(`/orders/order-items/${itemId}`, {
    ...data,
    programmerDashboard: true,
  }, {
    headers: { Authorization: jwt() },
  });


export const getAllCustomersRequest = async () =>
  await axios.get('/orders/customers', { headers: { Authorization: jwt() } });

export const createCustomerRequest = async (data) =>
  await axios.post('/orders/customers', data, { headers: { Authorization: jwt() } });

export const updateCustomerRequest = async (id, data) =>
  await axios.put(`/orders/customers/${id}`, data, { headers: { Authorization: jwt() } });

export const deleteCustomerRequest = async (id) =>
  await axios.delete(`/orders/customers/${id}`, { headers: { Authorization: jwt() } });

export const deleteOrder = async (id) =>
  await axios.delete(`/orders/order/${id}`, { headers: { Authorization: jwt() } });
export const deleteOrderItem = async (id) =>
  await axios.delete(`/orders/order-items/${id}`, { headers: { Authorization: jwt() } });
/** Rango mes visible + mes anterior (proveedores). */
export const getSupplierOrdersForMonthRequest = async (visibleMonth) => {
  const from = startOfMonth(subMonths(visibleMonth, 1));
  const to = endOfMonth(visibleMonth);
  return getAllSupplierOrdersRequest({ from, to });
};

// ===============================
// 🟠 PROVEEDORES Y PEDIDOS A PROVEEDOR
// ===============================
export const getAllSuppliersRequest = async () =>
  await axios.get("/orders/suppliers", { headers: { Authorization: jwt() } });

export const createSupplierRequest = async (data) =>
  await axios.post("/orders/suppliers", data, { headers: { Authorization: jwt() } });

export const updateSupplierRequest = async (id, data) =>
  await axios.put(`/orders/suppliers/${id}`, data, { headers: { Authorization: jwt() } });

export const deleteSupplierRequest = async (id) =>
  await axios.delete(`/orders/suppliers/${id}`, { headers: { Authorization: jwt() } });

export const getAllSupplierOrdersRequest = async ({ from, to } = {}) => {
  const params = new URLSearchParams();
  if (from) params.set("from", format(from, "yyyy-MM-dd"));
  if (to) params.set("to", format(to, "yyyy-MM-dd"));
  const qs = params.toString();
  return axios.get(`/orders/supplier-orders${qs ? `?${qs}` : ""}`, {
    headers: { Authorization: jwt() },
  });
};

export const createSupplierOrderRequest = async (data) =>
  await axios.post("/orders/supplier-orders", data, { headers: { Authorization: jwt() } });

export const updateSupplierOrderRequest = async (id, data) =>
  await axios.put(`/orders/supplier-orders/${id}`, data, { headers: { Authorization: jwt() } });

export const addSupplierOrderItemRequest = async (orderId, data) =>
  await axios.post(`/orders/supplier-orders/${orderId}/items`, data, {
    headers: { Authorization: jwt() },
  });

export const deleteSupplierOrderRequest = async (id) =>
  await axios.delete(`/orders/supplier-orders/${id}`, { headers: { Authorization: jwt() } });

export const markSupplierOrderReceivedRequest = async (id, data = {}) =>
  await axios.put(`/orders/supplier-orders/${id}/received`, data, {
    headers: { Authorization: jwt() },
  });

export const markSupplierOrderPaidRequest = async (id, data = {}) =>
  await axios.put(`/orders/supplier-orders/${id}/paid`, data, {
    headers: { Authorization: jwt() },
  });

// ===============================
// 🟣 FINANCE WORKBENCH (COBRANZAS)
// ===============================

/**
 * 🔹 Cargar TODO el módulo de cobranzas
 * Clientes + pedidos + grupos + pagos
 * GET /orders/workbench/all
 */
export const getFinanceWorkbenchAllRequest = async () =>
  await axios.get("/orders/workbench/all", {
    headers: { Authorization: jwt() },
  });

/** Pedidos con estados, stock de producto y resumen (módulo estados). */
export const getOrderStatusWorkbenchRequest = async () =>
  await axios.get("/orders/status-workbench", {
    headers: { Authorization: jwt() },
  });

/**
 * 🔹 Crear grupo por ITEMS
 * POST /orders/workbench/item-groups
 * data: { customerId, itemIds: [], concept? }
 */
export const createItemGroupRequest = async (data) =>
  await axios.post("/orders/workbench/item-groups", data, {
    headers: { Authorization: jwt() },
  });

/**
 * 🔹 Agregar ítems a un grupo existente
 * POST /orders/workbench/item-groups/:groupId/add-items
 * data: { itemIds: [] }
 */
export const addItemsToGroupRequest = async (groupId, data) =>
  await axios.post(`/orders/workbench/item-groups/${groupId}/add-items`, data, {
    headers: { Authorization: jwt() },
  });

/**
 * 🔹 Editar grupo (concept/status)
 * PUT /orders/workbench/item-groups/:groupId
 * data: { concept?, status? }  // "open" | "closed" | "cancelled"
 */
export const updateItemGroupRequest = async (groupId, data) =>
  await axios.put(`/orders/workbench/item-groups/${groupId}`, data, {
    headers: { Authorization: jwt() },
  });

/**
 * 🔹 Eliminar grupo
 * DELETE /orders/workbench/item-groups/:groupId
 */
export const deleteItemGroupRequest = async (groupId) =>
  await axios.delete(`/orders/workbench/item-groups/${groupId}`, {
    headers: { Authorization: jwt() },
  });

/**
 * 🔹 Mover / quitar / agregar item a grupo
 * POST /orders/workbench/item-groups/move-item
 * data: { orderItemId, toGroupId }  // toGroupId = null => quitar del grupo
 */
export const moveItemBetweenGroupsRequest = async (data) =>
  await axios.post("/orders/workbench/item-groups/move-item", data, {
    headers: { Authorization: jwt() },
  });

/**
 * 🔹 Abonar / pagar a un grupo (crea Payment + Income)
 * POST /orders/workbench/item-groups/:groupId/pay
 * data: { amount, date?, note?, method? }
 */
export const payItemGroupRequest = async (groupId, data) =>
  await axios.post(`/orders/workbench/item-groups/${groupId}/pay`, data, {
    headers: { Authorization: jwt() },
  });

/**
 * 🔹 Editar un pago (sincroniza el Income asociado)
 * PUT /orders/workbench/payments/:paymentId
 * data: { amount?, date?, note?, method?, status? }
 */
export const updateGroupPaymentRequest = async (paymentId, data) =>
  await axios.put(`/orders/workbench/payments/${paymentId}`, data, {
    headers: { Authorization: jwt() },
  });

/**
 * 🔹 Eliminar un pago (borra Payment + Applications + Income asociado)
 * DELETE /orders/workbench/payments/:paymentId
 */
export const deleteGroupPaymentRequest = async (paymentId) =>
  await axios.delete(`/orders/workbench/payments/${paymentId}`, {
    headers: { Authorization: jwt() },
  });
