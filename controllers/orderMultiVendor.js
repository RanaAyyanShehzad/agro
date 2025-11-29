import { OrderMultiVendor } from "../models/orderMultiVendor.js";
import { calculateOrderStatus } from "../utils/orderHelpers.js";
import ErrorHandler from "../middlewares/error.js";
import { getRole } from "../middlewares/orderMiddleware.js";
import { createNotification } from "../utils/notifications.js";
import { logOrderChange } from "../utils/orderHistoryLogger.js";
import { buyer } from "../models/buyer.js";
import { farmer } from "../models/farmer.js";

/**
 * Update product status in an order
 * Only the farmer/supplier who owns that product can update its status
 */
export const updateProductStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const order = req.order;
    const productItem = req.productItem;

    // Validate status
    const validStatuses = ["processing", "confirmed", "shipped", "delivered", "cancelled"];
    if (!status || !validStatuses.includes(status)) {
      return next(new ErrorHandler(`Invalid status. Must be one of: ${validStatuses.join(", ")}`, 400));
    }

    // Update product status
    productItem.status = status;
    
    // Handle shipped status - set timestamps
    if (status === 'shipped') {
      productItem.shippedAt = new Date();
      // Set expected delivery date at order level if not set
      if (!order.expected_delivery_date) {
        const expectedDate = new Date();
        expectedDate.setDate(expectedDate.getDate() + 7);
        order.expected_delivery_date = expectedDate;
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

    // Update all product statuses to cancelled
    order.products.forEach(product => {
      product.status = "cancelled";
    });

    // Update order and payment status
    order.orderStatus = "cancelled";
    if (order.paymentInfo) {
      order.paymentInfo.status = "cancelled";
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

