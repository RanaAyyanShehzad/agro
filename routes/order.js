import express from "express";
import { isAuthenticated } from "../middlewares/auth.js";
import {
  createOrder,
  getUserOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder,
  getSupplierOrders,
  getAllOrders,
  getOrdersByGroup,
  markOutForDelivery,
  confirmDelivery
} from "../controllers/order.js";

const router = express.Router();

// All routes require authentication
router.use(isAuthenticated);

/**
 * POST /api/v1/order/create
 * Create order from cart
 */
router.post("/create", createOrder);

/**
 * GET /api/v1/order/my-orders
 * Get all orders for the authenticated user (buyer/farmer)
 */
router.get("/my-orders", getUserOrders);

/**
 * GET /api/v1/order/:orderId
 * Get order by ID
 */
router.get("/:orderId", getOrderById);

/**
 * PUT /api/v1/order/:orderId/status
 * Update order status (seller/admin only)
 */
router.put("/:orderId/status", updateOrderStatus);

/**
 * POST /api/v1/order/:orderId/out-for-delivery
 * Mark order as out for delivery with delivery details (seller only)
 */
router.post("/:orderId/out-for-delivery", markOutForDelivery);

/**
 * POST /api/v1/order/:orderId/confirm-delivery
 * Confirm delivery (buyer only)
 */
router.post("/:orderId/confirm-delivery", confirmDelivery);

/**
 * PATCH /api/v1/order/:orderId/cancel
 * Cancel order (buyer only)
 */
router.patch("/:orderId/cancel", cancelOrder);

/**
 * GET /api/v1/order/seller/orders
 * Get all orders for the authenticated seller (farmer/supplier)
 */
router.get("/seller/orders", getSupplierOrders);

/**
 * GET /api/v1/order/admin/all
 * Get all orders (admin only)
 */
router.get("/admin/all", getAllOrders);

/**
 * GET /api/v1/order/group/:orderGroupId
 * Get all orders by order group ID
 */
router.get("/group/:orderGroupId", getOrdersByGroup);

export default router;

