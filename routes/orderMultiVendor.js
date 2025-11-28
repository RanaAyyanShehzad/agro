import express from "express";
import { isAuthenticated } from "../middlewares/auth.js";
import {
  updateProductStatus,
  cancelOrder,
  getOrderDetails
} from "../controllers/orderMultiVendor.js";
import {
  isProductOwner,
  canCancelOrder
} from "../middlewares/orderMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(isAuthenticated);

/**
 * PATCH /order/:orderId/product/:productId/status
 * Update product status in an order
 * Only the farmer/supplier who owns that product can update its status
 */
router.put(
  "/order/:orderId/product/:productId/status",
  isProductOwner,
  updateProductStatus
);

/**
 * PATCH /order/:orderId/cancel
 * Cancel an order
 * Only the buyer who placed the order can cancel
 */
router.put(
  "/order/:orderId/cancel",
  canCancelOrder,
  cancelOrder
);

/**
 * GET /order/:orderId
 * Get order details with populated buyer and product information
 */
router.get("/order/:orderId", getOrderDetails);

export default router;

