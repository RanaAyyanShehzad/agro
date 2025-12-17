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
  confirmDelivery,
  confirmReceipt,
  acceptOrder,
  rejectOrder
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
 * POST /api/v1/order/place-order (alias for /create for backward compatibility)
 * Create order from cart
 */
router.post("/place-order", createOrder);

/**
 * GET /api/v1/order/my-orders
 * Get all orders for the authenticated user (buyer/farmer)
 */
router.get("/my-orders", getUserOrders);

/**
 * GET /api/v1/order/user-orders (alias for my-orders for backward compatibility)
 * Get all orders for the authenticated user (buyer/farmer)
 */
router.get("/user-orders", getUserOrders);

/**
 * GET /api/v1/order/item/:orderId (alias for :orderId for backward compatibility)
 * Get order by ID - must come before /:orderId to match correctly
 */
router.get("/item/:orderId", getOrderById);

/**
 * PUT /api/v1/order/update-status/:orderId (alias for backward compatibility)
 * Update order status (seller/admin only) - must come before /:orderId routes
 */
router.put("/update-status/:orderId", updateOrderStatus);

/**
 * PUT /api/v1/order/confirm-receipt/:orderId
 * Confirm receipt (buyer only) - marks order as received and completes payment
 * Must come before /:orderId routes
 */
router.put("/confirm-receipt/:orderId", confirmReceipt);

/**
 * PUT /api/v1/order/:orderId/status
 * Update order status (seller/admin only)
 */
router.put("/:orderId/status", updateOrderStatus);

/**
 * POST /api/v1/order/:orderId/accept
 * Accept order (seller only) - changes status from pending to confirmed
 */
router.post("/:orderId/accept", acceptOrder);

/**
 * POST /api/v1/order/:orderId/reject
 * Reject order (seller only) - changes status to canceled
 */
router.post("/:orderId/reject", rejectOrder);

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
 * GET /api/v1/order/:orderId
 * Get order by ID - must come after all specific routes
 */
router.get("/:orderId", getOrderById);

/**
 * GET /api/v1/order/seller/orders
 * Get all orders for the authenticated seller (farmer/supplier)
 */
router.get("/seller/orders", getSupplierOrders);

/**
 * GET /api/v1/order/supplier-orders (alias for seller/orders for backward compatibility)
 * Get all orders for the authenticated seller (farmer/supplier)
 */
router.get("/supplier-orders", getSupplierOrders);

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

