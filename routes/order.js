import express from "express";
import { 
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
  updateOrderStatus,
  getSupplierOrders,
  getAllOrders
} from "../controllers/order.js";
import { isAuthenticated } from "../middlewares/auth.js";

const router = express.Router();

// Buyer routes
router.post("/create", isAuthenticated, createOrder);
router.get("/my", isAuthenticated, getMyOrders);
router.get("/:orderId", isAuthenticated, getOrderById);
router.put("/:orderId/cancel", isAuthenticated, cancelOrder);

// Supplier/Farmer routes
router.put("/:orderId/status", isAuthenticated, updateOrderStatus);
router.get("/supplier/all", isAuthenticated, getSupplierOrders);

// Admin routes
router.get("/admin/all", isAuthenticated, getAllOrders);

export default router;