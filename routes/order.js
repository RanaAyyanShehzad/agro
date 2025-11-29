import express from "express"
import { isAuthenticated } from "../middlewares/auth.js"
import { cancelOrder, createOrder, getAllOrders, getOrderById, getSupplierOrders, getUserOrders, updateOrderStatus } from "../controllers/order.js";
import { 
  updateOrderToDelivered, 
  confirmOrderReceipt, 
  createDispute, 
  respondToDispute, 
  resolveDispute,
  adminRulingOnDispute,
  getSellerDisputes,
  getSellerDisputeById,
  getBuyerDisputes,
  getBuyerDisputeById
} from "../controllers/orderManagement.js";
import { acceptOrder, rejectOrder } from "../controllers/orderWorkflow.js";
import { checkIsAdmin } from "../middlewares/checkIsAdmin.js";

const router=express.Router();
router.use(isAuthenticated);

// Order creation and retrieval
router.post('/place-order',createOrder);
router.get('/user-orders',getUserOrders);
router.get('/item/:orderId',getOrderById);
router.put('/cancel/:orderId',cancelOrder);
router.get('/supplier-orders',getSupplierOrders);
router.get('/all',getAllOrders);

// Order workflow (seller accept/reject)
router.post('/:orderId/accept', acceptOrder);
router.post('/:orderId/reject', rejectOrder);

// Order status updates
router.put('/update-status/:orderId',updateOrderStatus);
router.put('/delivered/:orderId', updateOrderToDelivered);
router.put('/confirm-receipt/:orderId', confirmOrderReceipt);

// Dispute management
router.post('/dispute/:orderId', createDispute);
router.get('/disputes', getSellerDisputes); // Seller get all disputes (farmer/supplier only)
router.get('/disputes/buyer', getBuyerDisputes); // Buyer get all disputes (buyer/farmer only)
router.get('/dispute/:disputeId', getSellerDisputeById); // Seller get dispute by ID (farmer/supplier only)
router.get('/dispute/buyer/:disputeId', getBuyerDisputeById); // Buyer get dispute by ID (buyer/farmer only)
router.put('/dispute/:disputeId/respond', respondToDispute);
router.put('/dispute/:disputeId/resolve', resolveDispute);

// Admin-only dispute resolution
router.put('/dispute/:disputeId/admin-ruling', checkIsAdmin, adminRulingOnDispute);

export default router;
