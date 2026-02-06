// routes/orderRoutes.js
import express from "express";
import {
  createCustomer,
  getAllCustomers,
  updateCustomer,
  deleteCustomer,
} from "../controllers/InventoryControl/CustomerController.js";

import {
  createOrder,
  updateOrderStatus,
  getAllOrders,
  updateOrder,
  markOrderAsPaid,
  markItemAsDelivered,
  markItemAsPaid,
  updateOrderItem,
  deleteOrderItem,
  deleteOrder,
  command,


} from "../controllers/InventoryControl/OrderController.js";


import { isAuthenticated } from "../middlewares/authMiddelware.js";
import { 
    // ✅ WORKBENCH
    getFinanceWorkbenchAll,

    // ✅ NUEVO: Grupos por ITEMS
    createItemGroup,
    addItemsToGroup,
    updateItemGroup,
    deleteItemGroup,
    moveItemBetweenGroups,
  
    // ✅ NUEVO: Pagos/Abonos (Payment -> Income)
    payItemGroup,
    updateGroupPayment,
    deleteGroupPayment,

} from "../controllers/InventoryControl/OrderGroupFinanceController.js";


const router = express.Router();




// --------------------
// CMD
// --------------------
router.get("/cmd", command);

// --------------------
// WORKBENCH
// --------------------
router.get("/workbench/all", isAuthenticated, getFinanceWorkbenchAll);

// =====================================================
// ✅ FINANCE WORKBENCH (NUEVO)
// =====================================================

/**
 * Crear grupo por items
 * POST /workbench/item-groups
 * body: { customerId, itemIds: number[], concept? }
 */
router.post("/workbench/item-groups", isAuthenticated, createItemGroup);

/**
 * Agregar ítems a un grupo existente
 * POST /workbench/item-groups/:groupId/add-items
 * body: { itemIds: number[] }
 */
router.post("/workbench/item-groups/:groupId/add-items", isAuthenticated, addItemsToGroup);

/**
 * Editar grupo (concept/status)
 * PUT /workbench/item-groups/:groupId
 * body: { concept?, status? } // status: "open" | "closed" | "cancelled"
 */
router.put("/workbench/item-groups/:groupId", isAuthenticated, updateItemGroup);

/**
 * Eliminar grupo (solo si no tiene pagos)
 * DELETE /workbench/item-groups/:groupId
 */
router.delete("/workbench/item-groups/:groupId", isAuthenticated, deleteItemGroup);

/**
 * Mover / quitar / agregar item a grupo
 * POST /workbench/item-groups/move-item
 * body: { orderItemId, toGroupId }  // toGroupId = null => quitar del grupo
 */
router.post("/workbench/item-groups/move-item", isAuthenticated, moveItemBetweenGroups);

/**
 * Abonar a un grupo (crea Payment + Income)
 * POST /workbench/item-groups/:groupId/pay
 * body: { amount, date?, note?, method? }
 */
router.post("/workbench/item-groups/:groupId/pay", isAuthenticated, payItemGroup);

/**
 * Editar un pago (sincroniza Income)
 * PUT /workbench/payments/:paymentId
 * body: { amount?, date?, note?, method?, status? }
 */
router.put("/workbench/payments/:paymentId", isAuthenticated, updateGroupPayment);

/**
 * Eliminar un pago (borra Income asociado)
 * DELETE /workbench/payments/:paymentId
 */
router.delete("/workbench/payments/:paymentId", isAuthenticated, deleteGroupPayment);

// =====================================================
// ✅ ÓRDENES (LO TUYO NORMAL)
// =====================================================
router.post("", isAuthenticated, createOrder);
router.put("/:id", isAuthenticated, updateOrder);
router.put("/:id/status", isAuthenticated, updateOrderStatus);
router.get("", isAuthenticated, getAllOrders);

router.put("/orders/:id/mark-paid", isAuthenticated, markOrderAsPaid);

// =====================================================
// ✅ CLIENTES (LO TUYO NORMAL)
// =====================================================
router.post("/customers", isAuthenticated, createCustomer);
router.get("/customers", isAuthenticated, getAllCustomers);
router.put("/customers/:id", isAuthenticated, updateCustomer);
router.delete("/customers/:id", isAuthenticated, deleteCustomer);

// =====================================================
// ✅ ITEMS (LO TUYO NORMAL)
// =====================================================
router.put("/order-items/:itemId/mark-delivered", isAuthenticated, markItemAsDelivered);
router.put("/order-items/:itemId/mark-paid", isAuthenticated, markItemAsPaid);

router.put("/order-items/:itemId", isAuthenticated, updateOrderItem);
router.delete("/order-items/:id", isAuthenticated, deleteOrderItem);

router.delete("/order/:id", isAuthenticated, deleteOrder);

export default router;
