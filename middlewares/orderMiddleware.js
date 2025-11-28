import jwt from "jsonwebtoken";
import ErrorHandler from "./error.js";
import { OrderMultiVendor } from "../models/orderMultiVendor.js";

/**
 * Get user role from JWT token
 */
export const getRole = (req) => {
  const { token } = req.cookies;
  if (!token) throw new ErrorHandler("Authentication token missing", 401);
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  return { role: decoded.role, userId: decoded._id };
};

/**
 * Middleware to check if user is the buyer of the order
 */
export const isOrderBuyer = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const userId = req.user._id.toString();
    const { role } = getRole(req);

    if (role !== "buyer" && role !== "farmer") {
      return next(new ErrorHandler("Only customers can perform this action", 403));
    }

    const order = await OrderMultiVendor.findById(orderId);
    if (!order) {
      return next(new ErrorHandler("Order not found", 404));
    }

    if (order.customerId.toString() !== userId) {
      return next(new ErrorHandler("You are not authorized to access this order", 403));
    }

    req.order = order;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to check if user owns a specific product in the order
 */
export const isProductOwner = async (req, res, next) => {
  try {
    const { orderId, productId } = req.params;
    const userId = req.user._id.toString();
    const { role } = getRole(req);

    if (role !== "farmer" && role !== "supplier") {
      return next(new ErrorHandler("Only farmers or suppliers can update product status", 403));
    }

    const order = await OrderMultiVendor.findById(orderId);
    if (!order) {
      return next(new ErrorHandler("Order not found", 404));
    }

    const productItem = order.products.find(
      p => p._id.toString() === productId
    );

    if (!productItem) {
      return next(new ErrorHandler("Product not found in this order", 404));
    }

    // Check if user owns this product
    const isOwner = 
      (role === "farmer" && productItem.farmerId?.toString() === userId) ||
      (role === "supplier" && productItem.supplierId?.toString() === userId);

    if (!isOwner) {
      return next(new ErrorHandler("You are not authorized to update this product status", 403));
    }

    // Check if product is already cancelled
    if (productItem.status === "cancelled") {
      return next(new ErrorHandler("Cannot update status of a cancelled product", 400));
    }

    req.order = order;
    req.productItem = productItem;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to check if order can be cancelled
 */
export const canCancelOrder = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const userId = req.user._id.toString();
    const { role } = getRole(req);

    if (role !== "buyer" && role !== "farmer") {
      return next(new ErrorHandler("Only customers can cancel orders", 403));
    }

    const order = await OrderMultiVendor.findById(orderId);
    if (!order) {
      return next(new ErrorHandler("Order not found", 404));
    }

    if (order.customerId.toString() !== userId) {
      return next(new ErrorHandler("You are not authorized to cancel this order", 403));
    }

    // Check if any product is shipped or delivered
    const hasShippedOrDelivered = order.products.some(
      product => product.status === "shipped" || product.status === "delivered"
    );

    if (hasShippedOrDelivered) {
      return next(new ErrorHandler("Cannot cancel order with shipped or delivered products", 400));
    }

    req.order = order;
    next();
  } catch (error) {
    next(error);
  }
};

