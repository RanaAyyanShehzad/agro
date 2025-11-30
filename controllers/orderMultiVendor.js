import { OrderMultiVendor } from "../models/orderMultiVendor.js";
import { calculateOrderStatus } from "../utils/orderHelpers.js";
import ErrorHandler from "../middlewares/error.js";
import { getRole } from "../middlewares/orderMiddleware.js";
import { createNotification } from "../utils/notifications.js";
import { logOrderChange } from "../utils/orderHistoryLogger.js";
import { buyer } from "../models/buyer.js";
import { farmer } from "../models/farmer.js";
import { product } from "../models/products.js";
import { SystemConfig, CONFIG_KEYS } from "../models/systemConfig.js";

/**
 * Update product status in an order
 * Only the farmer/supplier who owns that product can update its status
 */
export const updateProductStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const order = req.order;
    const productItem = req.productItem;

    // Check if dispute is open - cannot update status if dispute exists
    if (order.dispute_status === "open" || order.dispute_status === "pending_admin_review") {
      return next(new ErrorHandler(
        "Cannot update order status while dispute is open. Please resolve the dispute first.",
        400
      ));
    }

    // Validate status
    const validStatuses = ["processing", "shipped", "delivered", "cancelled"];
    if (!status || !validStatuses.includes(status)) {
      return next(new ErrorHandler(`Invalid status. Must be one of: ${validStatuses.join(", ")}`, 400));
    }

    // Validate status transitions - enforce proper flow: confirmed → processing → shipped → delivered
    const currentProductStatus = productItem.status;
    
    // Define allowed transitions
    const allowedTransitions = {
      "pending": ["cancelled"], // Can only cancel from pending
      "confirmed": ["processing", "cancelled"], // Can go to processing or cancel
      "processing": ["shipped", "cancelled"], // Can go to shipped or cancel
      "shipped": ["delivered"], // Can only go to delivered
      "delivered": [], // Cannot change from delivered (buyer must confirm)
      "received": [], // Cannot change from received
      "rejected": [], // Cannot change from rejected
      "cancelled": [] // Cannot change from cancelled
    };

    // Check if transition is allowed
    const allowedNextStatuses = allowedTransitions[currentProductStatus] || [];
    if (!allowedNextStatuses.includes(status)) {
      return next(new ErrorHandler(
        `Cannot change status from "${currentProductStatus}" to "${status}". ` +
        `Allowed transitions: ${allowedNextStatuses.length > 0 ? allowedNextStatuses.join(", ") : "none"}`,
        400
      ));
    }

    // Prevent status reversals - once delivered, cannot go back
    if (currentProductStatus === "delivered" || currentProductStatus === "received") {
      return next(new ErrorHandler(
        `Cannot change status. Order is already ${currentProductStatus}. Status cannot be reversed.`,
        400
      ));
    }

    // Specific validations for each transition
    if (status === "processing" && currentProductStatus !== "confirmed") {
      return next(new ErrorHandler(
        `Cannot change to processing. Product must be in "confirmed" status. Current status: "${currentProductStatus}"`,
        400
      ));
    }

    if (status === "shipped" && currentProductStatus !== "processing") {
      return next(new ErrorHandler(
        `Cannot change to shipped. Product must be in "processing" status. Current status: "${currentProductStatus}"`,
        400
      ));
    }

    if (status === "delivered" && currentProductStatus !== "shipped") {
      return next(new ErrorHandler(
        `Cannot change to delivered. Product must be in "shipped" status. Current status: "${currentProductStatus}"`,
        400
      ));
    }

    // Time validation: Cannot mark as "delivered" immediately after "shipped"
    if (status === "delivered") {
      if (currentProductStatus !== "shipped") {
        return next(new ErrorHandler(
          `Cannot mark as delivered. Product must be in "shipped" status first.`,
          400
        ));
      }

      // Check if product was shipped
      if (!productItem.shippedAt) {
        return next(new ErrorHandler(
          "Product shipped timestamp not found. Cannot mark as delivered.",
          400
        ));
      }

      // Get configuration for minimum time
      const config = await SystemConfig.findOne({ 
        configKey: CONFIG_KEYS.SHIPPED_TO_DELIVERED_MINUTES 
      });
      const minMinutes = config?.configValue || 10; // Default 10 minutes

      const now = new Date();
      const timeDiff = (now - new Date(productItem.shippedAt)) / (1000 * 60); // minutes

      if (timeDiff < minMinutes) {
        const remainingMinutes = Math.ceil(minMinutes - timeDiff);
        return next(new ErrorHandler(
          `Cannot mark as delivered yet. Please wait ${remainingMinutes} more minute(s). Minimum ${minMinutes} minutes required after shipping.`,
          400
        ));
      }
    }

    // Update product status
    productItem.status = status;
    
    // Handle shipped status - set timestamps
    if (status === 'shipped') {
      productItem.shippedAt = new Date();
      // Use estimated delivery date from product if available, otherwise set default
      if (!order.expected_delivery_date) {
        if (productItem.estimatedDeliveryDate) {
          order.expected_delivery_date = productItem.estimatedDeliveryDate;
        } else {
          const expectedDate = new Date();
          expectedDate.setDate(expectedDate.getDate() + 7);
          order.expected_delivery_date = expectedDate;
        }
      }
    }
    
    if (status === 'delivered') {
      productItem.deliveredAt = new Date();
    }

    // Recalculate order status
    const oldOrderStatus = order.orderStatus;
    order.orderStatus = calculateOrderStatus(order);

    // Set order-level timestamps
    if (status === 'shipped' && !order.shippedAt) {
      order.shippedAt = new Date();
      if (!order.expected_delivery_date) {
        const expectedDate = new Date();
        expectedDate.setDate(expectedDate.getDate() + 7);
        order.expected_delivery_date = expectedDate;
      }
    }
    
    if (status === 'delivered' && !order.deliveredAt) {
      order.deliveredAt = new Date();
    }

    // Save order
    await order.save();

    // Log order change
    await logOrderChange(
      order._id,
      "multivendor",
      { userId: req.user?._id || "", role: getRole(req).role, name: req.user?.name || "" },
      status === "shipped" ? "shipped" : status === "delivered" ? "delivered" : "status",
      oldOrderStatus,
      order.orderStatus,
      null,
      `Product status updated to ${status}`
    );

    // Send notification to customer when order is shipped or delivered
    if (status === "shipped" || status === "delivered") {
      try {
        const customer = await (order.customerModel === "Buyer" 
          ? buyer.findById(order.customerId)
          : farmer.findById(order.customerId));

        if (customer) {
          await createNotification(
            order.customerId,
            order.customerModel.toLowerCase(),
            status === "shipped" ? "order_shipped" : "order_delivered",
            status === "shipped" ? "Order Shipped" : "Order Delivered",
            status === "shipped" 
              ? `Your order #${order._id} has been shipped and is on its way.`
              : `Your order #${order._id} has been delivered. Please confirm receipt.`,
            {
              relatedId: order._id,
              relatedType: "order",
              actionUrl: `/orders/${order._id}`,
              priority: "medium",
              sendEmail: true
            }
          );
        }
      } catch (notifError) {
        console.error("Failed to send order status notification:", notifError);
      }
    }

    // Populate and return updated order
    const updatedOrder = await OrderMultiVendor.findById(order._id)
      .populate("customerId", "name email phone address")
      .populate("products.productId")
      .populate("products.farmerId", "name email")
      .populate("products.supplierId", "name email")
      .lean();

    res.status(200).json({
      success: true,
      message: "Product status updated successfully",
      order: updatedOrder
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel an order
 * Only the buyer who placed the order can cancel
 * Cannot cancel if ANY product has status "shipped" or "delivered"
 */
export const cancelOrder = async (req, res, next) => {
  try {
    const order = req.order;

    // Restore product quantities before cancelling
    for (const productItem of order.products) {
      // Only restore if product hasn't been shipped or delivered
      if (productItem.status !== "shipped" && productItem.status !== "delivered") {
        const dbProduct = await product.findById(productItem.productId);
        if (dbProduct) {
          dbProduct.quantity += productItem.quantity;
          dbProduct.isAvailable = true; // Make available again
          await dbProduct.save();
        }
      }
    }

    // Update all product statuses to cancelled
    order.products.forEach(product => {
      product.status = "cancelled";
    });

    // Update order status
    order.orderStatus = "cancelled";
    
    // Update payment status based on payment method
    if (order.paymentInfo) {
      const paymentMethod = order.paymentInfo.method;
      
      // If cash on delivery: payment was never made, so mark as cancelled
      // If online payment (easypaisa/jazzcash): payment was made, so mark as refunded
      if (paymentMethod === "cash-on-delivery") {
        order.payment_status = "cancelled";
        order.paymentInfo.status = "cancelled";
      } else {
        // easypaisa or jazzcash - payment was made, needs refund
        order.payment_status = "refunded";
        order.paymentInfo.status = "refunded";
      }
    } else {
      // Fallback if paymentInfo doesn't exist
      order.payment_status = "cancelled";
    }

    // Save order
    await order.save();

    // Populate and return updated order
    const updatedOrder = await OrderMultiVendor.findById(order._id)
      .populate("customerId", "name email phone address")
      .populate("products.productId")
      .populate("products.farmerId", "name email")
      .populate("products.supplierId", "name email")
      .lean();

    res.status(200).json({
      success: true,
      message: "Order cancelled successfully",
      order: updatedOrder
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get order details with populated buyer and product information
 */
export const getOrderDetails = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const userId = req.user._id.toString();
    let userRole;
    try {
      const roleData = getRole(req);
      userRole = roleData.role;
    } catch (error) {
      return next(new ErrorHandler("Authentication required", 401));
    }

    const order = await OrderMultiVendor.findById(orderId)
      .populate("customerId", "name email phone address")
      .populate("products.productId")
      .populate("products.farmerId", "name email phone")
      .populate("products.supplierId", "name email phone")
      .lean();

    if (!order) {
      return next(new ErrorHandler("Order not found", 404));
    }

    // Check authorization
    // Buyers can only see their own orders
    if ((userRole === "buyer" || userRole === "farmer") && order.customerId?._id?.toString() !== userId) {
      return next(new ErrorHandler("You are not authorized to view this order", 403));
    }

    // Farmers/Suppliers can see orders containing their products
    if (userRole === "farmer" || userRole === "supplier") {
      const hasOwnProduct = order.products.some(product => {
        if (userRole === "farmer" && product.farmerId) {
          return product.farmerId._id.toString() === userId;
        }
        if (userRole === "supplier" && product.supplierId) {
          return product.supplierId._id.toString() === userId;
        }
        return false;
      });

      if (!hasOwnProduct) {
        return next(new ErrorHandler("You are not authorized to view this order", 403));
      }
    }

    res.status(200).json({
      success: true,
      order: {
        ...order,
        customer: order.customerId ? {
          name: order.customerId.name || "N/A",
          email: order.customerId.email || "N/A",
          phone: order.customerId.phone || order.shippingAddress?.phoneNumber || "N/A",
          address: order.customerId.address || `${order.shippingAddress?.street || ""}, ${order.shippingAddress?.city || ""}`.replace(/^,\s*|,\s*$/g, "") || "N/A"
        } : null
      }
    });
  } catch (error) {
    next(error);
  }
};

