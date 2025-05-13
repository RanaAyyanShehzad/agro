import express from "express"
import { isAuthenticated } from "../../middlewares/auth.js"
import { cancelOrder, createOrder, getAllOrders, getOrderById, getSupplierOrders, getUserOrders, updateOrderStatus } from "../../controllers/order.js";
const router=express.Router();
router.use(isAuthenticated);
router.post('/place-order',createOrder);
router.get('/user-orders',getUserOrders);
router.get('/item/:orderId',getOrderById);
router.put('/update-status/:orderId',updateOrderStatus);
router.put('/cancel/:orderId',cancelOrder);
router.get('/supplier-orders',getSupplierOrders);
router.get('/all',getAllOrders);


export default router;
