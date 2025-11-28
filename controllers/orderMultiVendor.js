import { OrderMultiVendor } from "../models/orderMultiVendor.js";
import { calculateOrderStatus } from "../utils/orderHelpers.js";
import ErrorHandler from "../middlewares/error.js";
import { getRole } from "../middlewares/orderMiddleware.js";

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

    // Recalculate order status
    order.orderStatus = calculateOrderStatus(order);

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

    // Update order status
    order.orderStatus = "cancelled";

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

