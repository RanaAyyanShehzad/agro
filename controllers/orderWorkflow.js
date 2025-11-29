import { OrderMultiVendor } from "../models/orderMultiVendor.js";
import { Order } from "../models/order.js";
import { product } from "../models/products.js";
import { buyer } from "../models/buyer.js";
import { farmer } from "../models/farmer.js";
import { supplier } from "../models/supplier.js";
import { SystemConfig, CONFIG_KEYS } from "../models/systemConfig.js";
import ErrorHandler from "../middlewares/error.js";
import { createNotification } from "../utils/notifications.js";
import { logOrderChange } from "../utils/orderHistoryLogger.js";
import { sendEmail } from "../utils/sendEmail.js";
import jwt from "jsonwebtoken";

/**
 * Get user ID and role from token
 */
const getUserFromToken = (req) => {
  const { token } = req.cookies;
  if (!token) throw new ErrorHandler("Authentication required", 401);
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  return { userId: decoded._id, role: decoded.role };
};

/**
 * Seller accepts order
 */
export const acceptOrder = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { userId, role } = getUserFromToken(req);

    if (role !== "farmer" && role !== "supplier") {
      return next(new ErrorHandler("Only sellers can accept orders", 403));
    }

    // Find order
    const order = await OrderMultiVendor.findById(orderId)
      .populate("customerId", "name email")
      .populate("products.productId");

    if (!order) {
      return next(new ErrorHandler("Order not found", 404));
    }

    // Find products owned by this seller
    const sellerProducts = order.products.filter(p => {
      if (role === "farmer" && p.farmerId) {
        return p.farmerId.toString() === userId;
      }
      if (role === "supplier" && p.supplierId) {
        return p.supplierId.toString() === userId;
      }
      return false;
    });

    if (sellerProducts.length === 0) {
      return next(new ErrorHandler("You don't have any products in this order", 403));
    }

    // Check if products are already accepted/rejected
    const pendingProducts = sellerProducts.filter(p => p.status === "pending" && p.sellerAccepted === null);
    if (pendingProducts.length === 0) {
      return next(new ErrorHandler("No pending products to accept in this order", 400));
    }

    // Accept all seller's products - set to confirmed first, then processing
    for (const productItem of pendingProducts) {
      productItem.sellerAccepted = true;
      productItem.status = "confirmed";
    }

    // Check if all products in order are accepted
    const allProductsAccepted = order.products.every(p => 
      p.status !== "pending" || p.sellerAccepted === true
    );

    // If all products accepted, move them to processing
    if (allProductsAccepted) {
      order.products.forEach(p => {
        if (p.status === "confirmed") {
          p.status = "processing";
        }
      });
      order.orderStatus = "processing";
    } else {
      // Some products still pending, keep order status as processing but products are confirmed
      order.orderStatus = "processing";
    }

    await order.save();

    // Log order change
    await logOrderChange(
      order._id,
      "multivendor",
      { userId, role, name: req.user?.name || "" },
      "accepted",
      "pending",
      "confirmed",
      null,
      "Seller accepted the order"
    );

    // Send notification and email to buyer
    const customer = order.customerId;
    if (customer) {
      await createNotification(
        customer._id,
        order.customerModel.toLowerCase(),
        "order_accepted",
        "Order Accepted",
        `Your order #${orderId} has been accepted by the seller and is now being processed.`,
        {
          relatedId: order._id,
          relatedType: "order",
          actionUrl: `/orders/${orderId}`,
          priority: "medium",
          sendEmail: true
        }
      );
    }

    res.status(200).json({
      success: true,
      message: "Order accepted successfully",
      order
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Seller rejects order
 */
export const rejectOrder = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;
    const { userId, role } = getUserFromToken(req);

    if (role !== "farmer" && role !== "supplier") {
      return next(new ErrorHandler("Only sellers can reject orders", 403));
    }

    if (!reason || !reason.trim()) {
      return next(new ErrorHandler("Rejection reason is required", 400));
    }

    // Find order
    const order = await OrderMultiVendor.findById(orderId)
      .populate("customerId", "name email")
      .populate("products.productId");

    if (!order) {
      return next(new ErrorHandler("Order not found", 404));
    }

    // Find products owned by this seller
    const sellerProducts = order.products.filter(p => {
      if (role === "farmer" && p.farmerId) {
        return p.farmerId.toString() === userId;
      }
      if (role === "supplier" && p.supplierId) {
        return p.supplierId.toString() === userId;
      }
      return false;
    });

    if (sellerProducts.length === 0) {
      return next(new ErrorHandler("You don't have any products in this order", 403));
    }

    // Check if products are already accepted/rejected
    const pendingProducts = sellerProducts.filter(p => p.status === "pending" && p.sellerAccepted === null);
    if (pendingProducts.length === 0) {
      return next(new ErrorHandler("No pending products to reject in this order", 400));
    }

    // Reject all seller's products
    for (const productItem of pendingProducts) {
      productItem.sellerAccepted = false;
      productItem.status = "rejected";
      productItem.sellerRejectedAt = new Date();
      productItem.rejectionReason = reason.trim();
    }

    // Check if all products are rejected or if order should be cancelled
    const allRejected = order.products.every(p => p.status === "rejected" || p.status === "cancelled");
    const hasRejected = order.products.some(p => p.status === "rejected");

    if (allRejected) {
      // All products rejected, cancel entire order
      order.orderStatus = "cancelled";
      order.payment_status = "cancelled";
      if (order.paymentInfo) {
        order.paymentInfo.status = "cancelled";
      }
    } else if (hasRejected) {
      // Some products rejected, update order status
      order.orderStatus = "cancelled";
    }

    await order.save();

    // Log order change
    await logOrderChange(
      order._id,
      "multivendor",
      { userId, role, name: req.user?.name || "" },
      "rejected",
      "pending",
      "rejected",
      reason.trim(),
      "Seller rejected the order"
    );

    // Send notification to buyer
    const customer = order.customerId;
    if (customer) {
      await createNotification(
        customer._id,
        order.customerModel.toLowerCase(),
        "order_rejected",
        "Order Rejected",
        `Your order #${orderId} has been rejected by the seller. Reason: ${reason}`,
        {
          relatedId: order._id,
          relatedType: "order",
          actionUrl: `/orders/${orderId}`,
          priority: "high"
        }
      );
    }

    res.status(200).json({
      success: true,
      message: "Order rejected successfully. Order has been cancelled.",
      order
    });
  } catch (error) {
    next(error);
  }
};

