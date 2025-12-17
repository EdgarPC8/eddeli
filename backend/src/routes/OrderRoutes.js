// routes/orderRoutes.js
import express from 'express';
import { createCustomer, getAllCustomers, updateCustomer ,deleteCustomer} from '../controllers/InventoryControl/CustomerController.js';
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
    fixIncomeFromOrderItemsMismatch,
    getFinanceWorkbenchAll,
createOrderGroup,
payOrderGroup,
 } from '../controllers/InventoryControl/OrderController.js';

import { isAuthenticated } from '../middlewares/authMiddelware.js';

const router = express.Router();


router.get("/workbench/all", isAuthenticated, getFinanceWorkbenchAll);

/**
 * Crear grupo (deuda) desde pedidos
 * POST /finance/order-groups
 * body: { customerId, orderIds[], concept }
 */
router.post("/order-groups", isAuthenticated, createOrderGroup);

/**
 * Abonar a un grupo
 * POST /finance/order-groups/:groupIncomeId/pay
 * body: { amount, date, note }
 */
router.post(
  "/order-groups/:groupIncomeId/pay",
  isAuthenticated,
  payOrderGroup
);



router.get('/cmd', fixIncomeFromOrderItemsMismatch);
router.post('', isAuthenticated, createOrder);
router.put('/:id', isAuthenticated, updateOrder);
router.put('/:id/status', isAuthenticated, updateOrderStatus);
router.get('', isAuthenticated, getAllOrders);

router.put('/orders/:id/mark-paid', isAuthenticated, markOrderAsPaid);

router.post('/customers', isAuthenticated, createCustomer);
router.get('/customers', isAuthenticated, getAllCustomers);
router.put('/customers/:id', isAuthenticated, updateCustomer);
router.delete('/customers/:id', isAuthenticated, deleteCustomer);


router.put('/order-items/:itemId/mark-delivered', isAuthenticated, markItemAsDelivered);
router.put('/order-items/:itemId/mark-paid', isAuthenticated, markItemAsPaid);
router.delete('/order-items/:id', isAuthenticated, deleteOrderItem);
router.delete('/order/:id', isAuthenticated, deleteOrder);


router.put('/order-items/:itemId', isAuthenticated, updateOrderItem);





export default router;
