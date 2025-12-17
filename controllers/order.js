import { Order } from '../models/order.js';
import { Cart } from '../models/cart.js';
import mongoose from 'mongoose';
import jwt from "jsonwebtoken";
import ErrorHandler from '../middlewares/error.js';
import { buyer } from '../models/buyer.js';
import { farmer } from '../models/farmer.js';
import { sendEmail } from "../utils/sendEmail.js";
import { supplier } from '../models/supplier.js';
import { product } from '../models/products.js';
import { calculateOrderStatus, generateTrackingId } from '../utils/orderHelpers.js';

const getRole = (req) => {
  const { token } = req.cookies;
  if (!token) throw new ErrorHandler("Authentication token missing", 401);
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  return { role: decoded.role };
};

export const createOrder = async (req, res, next) => {
  try {
    const { cartId, paymentMethod, street, city, zipCode, phoneNumber, notes } = req.body;
    const userId = req.user.id;
    const decode = getRole(req).role;

    const cart = await Cart.findOne({ _id: cartId, userId }).populate("products.productId");
    if (!cart) return next(new ErrorHandler("Cart not found or doesn't belong to you", 404));
    if (cart.products.length === 0) return next(new ErrorHandler("Cannot create order with empty cart", 400));

    let user = null;
    if (decode === "buyer") {
      user = await buyer.findById(userId);
    } else if (decode === "farmer") {
      user = await farmer.findById(userId);
    }
    if (!user) {
      return next(new ErrorHandler("User not found", 404));
    }

    // Only buyers and farmers can place orders
    if (decode === "supplier") {
      return next(new ErrorHandler("Suppliers cannot place orders", 403));
    }

    // Step 1: Group cart items by seller (farmer or supplier)
    // MULTI-VENDOR SUPPORT: Each seller's products will be placed in a separate order
    // This ensures that if a buyer purchases products from different sellers,
    // each seller receives their own separate order for their products only
    const sellerGroups = new Map(); // key: "role_userID", value: { sellerId, sellerModel, products: [] }

    // First, validate all products and get seller info
    // Group products by their seller (farmer or supplier)
    for (const cartItem of cart.products) {
      const dbProduct = await product.findById(cartItem.productId._id);
      if (!dbProduct) {
        return next(new ErrorHandler(`Product ${cartItem.productId._id} not found`, 404));
      }

      // Check if enough quantity available
      if (cartItem.quantity > dbProduct.quantity) {
        return next(new ErrorHandler(
          `Insufficient quantity for product ${dbProduct.name}. Only ${dbProduct.quantity} available.`,
          400
        ));
      }

      // Get seller information from product
      const { userID, role } = dbProduct.upLoadedBy;
      if (!userID || !role) {
        return next(new ErrorHandler(
          `Product ${dbProduct.name} does not have valid seller information.`,
          400
        ));
      }

      // Create unique key for each seller (combination of role and userID)
      // This ensures products from the same seller are grouped together
      const sellerKey = `${role}_${userID.toString()}`;

      // Initialize seller group if it doesn't exist
      if (!sellerGroups.has(sellerKey)) {
        sellerGroups.set(sellerKey, {
          sellerId: userID,
          sellerModel: role === "farmer" ? "Farmer" : "Supplier",
          products: []
        });
      }

      // Add product to the appropriate seller's group
      sellerGroups.get(sellerKey).products.push({
        productId: cartItem.productId._id,
        quantity: cartItem.quantity,
        price: dbProduct.price
      });
    }

    // Validate that we have at least one seller group
    if (sellerGroups.size === 0) {
      return next(new ErrorHandler("No valid sellers found for the products in cart.", 400));
    }

    // Generate a single orderGroupId for all orders from this checkout
    const orderGroupId = new mongoose.Types.ObjectId();
    const createdOrders = [];
    let cartDeleted = false;

    try {
      // Step 2: Deduct product quantities before creating orders
      for (const cartItem of cart.products) {
        const dbProduct = await product.findById(cartItem.productId);
        if (dbProduct) {
          dbProduct.quantity -= cartItem.quantity;
          if (dbProduct.quantity < 0) dbProduct.quantity = 0;
          await dbProduct.save();
          
          // Handle zero quantity - set isAvailable to false or delete
          const { handleZeroQuantity } = await import("../utils/features.js");
          await handleZeroQuantity(dbProduct);
        }
      }

      // Step 3: Create separate Order document for each seller
      // MULTI-VENDOR: Each seller gets their own order with only their products
      // All orders from this checkout share the same orderGroupId for tracking
      for (const [sellerKey, sellerData] of sellerGroups) {
        // Calculate total price for this seller's products
        const totalPrice = sellerData.products.reduce((sum, item) => {
          return sum + (item.price * item.quantity);
        }, 0);

        // Generate unique tracking ID for this order
        let trackingId = generateTrackingId();
        // Ensure tracking ID is unique (retry if collision)
        let existingOrder = await Order.findOne({ trackingId });
        while (existingOrder) {
          trackingId = generateTrackingId();
          existingOrder = await Order.findOne({ trackingId });
        }

        const orderData = {
          userId: userId,
          userRole: decode,
          sellerId: sellerData.sellerId,
          sellerModel: sellerData.sellerModel,
          products: sellerData.products,
          totalPrice: totalPrice,
          cartId: cart._id,
          orderGroupId: orderGroupId, // Same group ID for all orders from this checkout
          trackingId: trackingId, // Generate tracking ID for logistics
          paymentInfo: {
            method: paymentMethod,
            status: "pending"
          },
          shippingAddress: {
            street,
            city,
            zipCode,
            phoneNumber
          },
          notes: notes,
          status: "pending"
        };

        const order = new Order(orderData);
        const savedOrder = await order.save();
        createdOrders.push(savedOrder);

        // Send notification to seller
        let sellerUser = null;
        if (sellerData.sellerModel === "Supplier") {
          sellerUser = await supplier.findById(sellerData.sellerId);
        } else if (sellerData.sellerModel === "Farmer") {
          sellerUser = await farmer.findById(sellerData.sellerId);
        }

        if (sellerUser) {
          // Send email to seller
          if (sellerUser.email) {
            await sendEmail(
              sellerUser.email,
              "New Order Received",
              `Dear ${sellerUser.name},\n\nYou have received a new order #${savedOrder._id}.\n\nPlease check your dashboard to view order details.\n\nThank you!`
            );
          }

          // Create notification for seller
          const { createNotification } = await import("../utils/notifications.js");
          await createNotification(
            sellerData.sellerId,
            sellerData.sellerModel.toLowerCase(),
            "order_placed",
            "New Order Received",
            `You have received a new order #${savedOrder._id}. Please check your dashboard.`,
            {
              relatedId: savedOrder._id,
              relatedType: "order",
              actionUrl: `/orders/${savedOrder._id}`,
              priority: "high",
              sendEmail: false // Already sent email above
            }
          );
        }
      }

      // Delete cart after successful order creation
      await Cart.findByIdAndDelete(cartId);
      cartDeleted = true;

      // Populate orders with product and seller information
      const populatedOrders = await Promise.all(
        createdOrders.map(async (order) => {
          return await Order.findById(order._id)
            .populate("products.productId")
            .populate("sellerId", "name email phone")
            .populate("userId", "name email phone address");
        })
      );

      // Send notification to buyer
      const { createNotification } = await import("../utils/notifications.js");
      await createNotification(
        userId,
        decode,
        "order_placed",
        "Order Placed Successfully",
        `Your order has been placed successfully. ${createdOrders.length} order(s) created.`,
        {
          relatedId: orderGroupId.toString(),
          relatedType: "order_group",
          actionUrl: `/orders?group=${orderGroupId}`,
          priority: "medium"
        }
      );

      await sendEmail(
        user.email,
        "Order Placed Successfully",
        `Your order has been successfully placed. ${createdOrders.length} order(s) have been created and will be processed by their respective sellers.`
      );

      return res.status(201).json({
        success: true,
        message: `Order created successfully. ${createdOrders.length} separate order(s) created for ${sellerGroups.size} seller(s).`,
        orderGroupId: orderGroupId,
        orders: populatedOrders,
        count: populatedOrders.length,
        sellersCount: sellerGroups.size,
        note: "Each seller's products are in a separate order for multi-vendor support."
      });
    } catch (innerError) {
      // Restore product quantities if order creation failed
      if (!cartDeleted && createdOrders.length > 0) {
        try {
          for (const cartItem of cart.products) {
            const dbProduct = await product.findById(cartItem.productId);
            if (dbProduct) {
              dbProduct.quantity += cartItem.quantity;
              dbProduct.isAvailable = true;
              await dbProduct.save();
            }
          }
          // Delete any created orders
          for (const order of createdOrders) {
            await Order.findByIdAndDelete(order._id);
          }
        } catch (restoreError) {
          console.error("Error restoring product quantities:", restoreError);
        }
      }
      throw innerError;
    }
  } catch (error) {
    next(error);
  }
};

export const getUserOrders = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userRole = getRole(req).role;
    
    // Get all orders for this user
    const orders = await Order.find({ userId })
      .populate("products.productId")
      .populate("sellerId", "name email phone")
      .sort({ createdAt: -1 })
      .lean();
    
    // Group orders by orderGroupId for better organization
    const ordersByGroup = new Map();
    const ungroupedOrders = [];
    
    for (const order of orders) {
      if (order.orderGroupId) {
        if (!ordersByGroup.has(order.orderGroupId.toString())) {
          ordersByGroup.set(order.orderGroupId.toString(), []);
        }
        ordersByGroup.get(order.orderGroupId.toString()).push(order);
      } else {
        ungroupedOrders.push(order);
      }
    }
    
    res.status(200).json({
      success: true,
      count: orders.length,
      orders: orders,
      groupedOrders: Array.from(ordersByGroup.entries()).map(([groupId, groupOrders]) => ({
        orderGroupId: groupId,
        orders: groupOrders,
        totalOrders: groupOrders.length,
        totalPrice: groupOrders.reduce((sum, o) => sum + (o.totalPrice || 0), 0)
      })),
      ungroupedOrders: ungroupedOrders
    });
  } catch (error) {
    next(error);
  }
};

export const getOrderById = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;
    const userRole = getRole(req).role;
    
    const order = await Order.findById(orderId)
      .populate("products.productId")
      .populate("sellerId", "name email phone")
      .populate("userId", "name email phone address");
    
    if (!order) return next(new ErrorHandler("Order not found", 404));

    // If user is supplier/farmer, check if they are the seller of this order
    if (userRole === 'supplier' || userRole === 'farmer') {
      const expectedModel = userRole === 'farmer' ? 'Farmer' : 'Supplier';
      
      if (order.sellerId.toString() !== userId.toString() || order.sellerModel !== expectedModel) {
        return next(new ErrorHandler("Order not found", 404));
      }
      
      // Return order with customer information
      return res.status(200).json({ 
        success: true, 
        order: {
          ...order.toObject(),
          customer: order.userId ? {
            name: order.userId.name || "N/A",
            email: order.userId.email || "N/A",
            phone: order.userId.phone || order.shippingAddress?.phoneNumber || "N/A",
            address: order.userId.address || `${order.shippingAddress?.street || ""}, ${order.shippingAddress?.city || ""}`.replace(/^,\s*|,\s*$/g, "") || "N/A"
          } : null
        }
      });
    }

    // For buyers/farmers (customers), only show their own orders
    if (order.userId.toString() !== userId.toString()) {
      return next(new ErrorHandler("Order not found", 404));
    }

    res.status(200).json({ success: true, order });
  } catch (error) {
    next(error);
  }
};

/**
 * Comprehensive Order Status Update Endpoint
 * Handles order status updates with proper validation, transitions, and responses
 */
export const updateOrderStatus = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    const userRole = getRole(req).role;
    const userId = req.user.id;

    // Validate status is provided
    if (!status) {
      return next(new ErrorHandler("Status is required", 400));
    }

    // Find order
    const order = await Order.findById(orderId)
      .populate("products.productId")
      .populate("userId", "name email phone address")
      .populate("sellerId", "name email");
    
    if (!order) {
      return next(new ErrorHandler("Order not found", 404));
    }

    // Get current status
    const currentStatus = order.status;

    // Check if dispute is open - cannot update status if dispute exists
    if (order.dispute_status === "open" || order.dispute_status === "pending_admin_review") {
      return next(new ErrorHandler(
        "Cannot update order status while dispute is open. Please resolve the dispute first.",
        400
      ));
    }

    // Prevent status updates if order is canceled or received
    if (currentStatus === 'canceled' || currentStatus === 'cancelled' || currentStatus === 'received') {
      return next(new ErrorHandler(
        `Cannot update status of an order that is ${currentStatus}. Status cannot be changed.`,
        400
      ));
    }

    // Validate status transitions
    const validStatuses = ["pending", "confirmed", "processing", "shipped", "out_for_delivery", "delivered", "cancelled"];
    if (!validStatuses.includes(status)) {
      return next(new ErrorHandler(
        `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
        400
      ));
    }

    // Prevent seller from directly marking as "delivered" - only buyer can confirm delivery
    if (status === "delivered" && (userRole === 'farmer' || userRole === 'supplier')) {
      return next(new ErrorHandler(
        "Sellers cannot mark orders as 'delivered'. Only buyers can confirm delivery after receiving the order.",
        403
      ));
    }

    // Define allowed transitions
    const allowedTransitions = {
      "pending": ["confirmed", "cancelled"],
      "confirmed": ["processing", "cancelled"],
      "processing": ["shipped", "cancelled"],
      "shipped": ["out_for_delivery", "cancelled"],
      "out_for_delivery": [], // Cannot change from out_for_delivery - buyer must confirm delivery
      "delivered": [], // Cannot change from delivered (buyer must confirm)
      "received": [], // Cannot change from received
      "cancelled": [] // Cannot change from cancelled
    };

    // Check if transition is allowed
    const allowedNextStatuses = allowedTransitions[currentStatus] || [];
    if (!allowedNextStatuses.includes(status)) {
      return next(new ErrorHandler(
        `Cannot change status from "${currentStatus}" to "${status}". ` +
        `Allowed transitions: ${allowedNextStatuses.length > 0 ? allowedNextStatuses.join(", ") : "none"}`,
        400
      ));
    }

    // Check authorization - only sellers (farmer/supplier) or admin can update status
    let isAuthorized = false;
    if (userRole === 'admin') {
      isAuthorized = true;
    } else if (userRole === 'farmer' || userRole === 'supplier') {
      // Check if user is the seller of this order
      const expectedModel = userRole === 'farmer' ? 'Farmer' : 'Supplier';
      isAuthorized = order.sellerId.toString() === userId.toString() && 
                     order.sellerModel === expectedModel;
    }

    if (!isAuthorized) {
      return next(new ErrorHandler(
        "You don't have permission to update this order status. Only sellers (farmers/suppliers) or admins can update order status.",
        403
      ));
    }

    // Time validation for delivered status (only for buyer confirmation)
    if (status === "delivered") {
      if (currentStatus !== "out_for_delivery") {
        return next(new ErrorHandler(
          `Cannot mark as delivered. Order must be in "out_for_delivery" status. Current status: "${currentStatus}"`,
          400
        ));
      }

      // Check if order was marked out for delivery
      if (!order.outForDeliveryAt) {
        return next(new ErrorHandler(
          "Order out for delivery timestamp not found. Cannot mark as delivered.",
          400
        ));
      }
    }

    // Update order status
    const oldStatus = currentStatus;
    order.status = status;
    
    // Handle status-specific timestamps and data
    const now = new Date();
    if (status === 'shipped') {
      order.shippedAt = now;
      if (!order.expected_delivery_date) {
        const expectedDate = new Date();
        expectedDate.setDate(expectedDate.getDate() + 7);
        order.expected_delivery_date = expectedDate;
      }
    }
    
    if (status === 'out_for_delivery') {
      order.outForDeliveryAt = now;
      // Generate tracking ID if not already set
      if (!order.trackingId) {
        let trackingId = generateTrackingId();
        let existingOrder = await Order.findOne({ trackingId });
        while (existingOrder) {
          trackingId = generateTrackingId();
          existingOrder = await Order.findOne({ trackingId });
        }
        order.trackingId = trackingId;
      }
    }
    
    if (status === 'delivered') {
      order.deliveredAt = now;
      if (order.deliveryInfo) {
        order.deliveryInfo.actualDeliveryDate = now;
      }
    }

    // Save order
    await order.save();

    // Log order change (if logging utility exists)
    try {
      const { logOrderChange } = await import("../utils/orderHistoryLogger.js");
      await logOrderChange(
        order._id,
        "order",
        { userId, role: userRole, name: req.user.name || "" },
        "status",
        oldStatus,
        status,
        null,
        `Order status updated from ${oldStatus} to ${status}`
      );
    } catch (logError) {
      console.warn("Failed to log order change:", logError);
    }

    // Send notification to customer
    try {
      const { createNotification } = await import("../utils/notifications.js");
      const customerId = order.userId?._id || order.userId;
      const customerRole = order.userRole || "buyer";

      if (customerId && (status === "shipped" || status === "out_for_delivery" || status === "delivered")) {
        let notificationType, title, message;
        if (status === "shipped") {
          notificationType = "order_shipped";
          title = "Order Shipped";
          message = `Your order #${orderId} has been shipped and is on its way.`;
        } else if (status === "out_for_delivery") {
          notificationType = "order_out_for_delivery";
          title = "Order Out for Delivery";
          message = `Your order #${orderId} is out for delivery. Tracking ID: ${order.trackingId || 'N/A'}`;
        } else {
          notificationType = "order_delivered";
          title = "Order Delivered";
          message = `Your order #${orderId} has been delivered. Please confirm receipt.`;
        }
        
        await createNotification(
          customerId,
          customerRole,
          notificationType,
          title,
          message,
          {
            relatedId: order._id,
            relatedType: "order",
            actionUrl: `/orders/${orderId}`,
            priority: "medium",
            sendEmail: true
          }
        );
      }
    } catch (notifError) {
      console.error("Failed to send order status notification:", notifError);
    }

    // Send email notification to customer
    try {
      let customer = null;
      if (order.userRole === "buyer") {
        customer = await buyer.findById(order.userId);
      } else if (order.userRole === "farmer") {
        customer = await farmer.findById(order.userId);
      }

      if (customer && customer.email) {
        const statusMessages = {
          pending: "Your order is pending confirmation.",
          confirmed: "Your order has been confirmed by the seller.",
          processing: "Your order is being processed and prepared for shipment.",
          shipped: "Your order has been shipped and is on its way to you.",
          out_for_delivery: `Your order is out for delivery. Tracking ID: ${order.trackingId || 'N/A'}`,
          delivered: "Your order has been delivered successfully. Please confirm receipt.",
          cancelled: "Your order has been cancelled."
        };

        const statusMessage = statusMessages[status] || `Your order status has been updated to ${status}.`;
        const emailSubject = `Order Status Update - ${status.charAt(0).toUpperCase() + status.slice(1)}`;
        const emailText = `Dear ${customer.name},\n\nYour order #${orderId} status has been updated from "${oldStatus}" to "${status}".\n\n${statusMessage}\n\nThank you for shopping with us!`;

        await sendEmail(customer.email, emailSubject, emailText);
      }
    } catch (emailError) {
      console.error("Failed to send order status email:", emailError);
    }

    // Populate order for response
    const populatedOrder = await Order.findById(order._id)
      .populate("userId", "name email phone address")
      .populate("products.productId")
      .populate("sellerId", "name email phone")
      .lean();

    // Return comprehensive response
    res.status(200).json({
      success: true,
      message: `Order status updated successfully from "${oldStatus}" to "${status}"`,
      data: {
        orderId: order._id,
        previousStatus: oldStatus,
        currentStatus: status,
        updatedAt: order.updatedAt,
        order: populatedOrder
      },
      metadata: {
        statusTransition: {
          from: oldStatus,
          to: status,
          timestamp: new Date().toISOString()
        },
        authorizedBy: {
          userId: userId,
          role: userRole
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Seller marks order as "Out for Delivery" with delivery details
 * This endpoint allows seller to assign vehicle and rider information
 */
export const markOutForDelivery = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { 
      vehicleName, 
      vehicleRegistrationNumber, 
      vehicleType, 
      vehicleContactInfo,
      riderName,
      riderContactInfo 
    } = req.body;
    const userRole = getRole(req).role;
    const userId = req.user.id;

    // Only sellers (farmer/supplier) can mark orders as out for delivery
    if (userRole !== 'farmer' && userRole !== 'supplier') {
      return next(new ErrorHandler(
        "Only sellers (farmers/suppliers) can mark orders as out for delivery.",
        403
      ));
    }

    // Find order
    const order = await Order.findById(orderId)
      .populate("products.productId")
      .populate("userId", "name email phone address")
      .populate("sellerId", "name email");
    
    if (!order) {
      return next(new ErrorHandler("Order not found", 404));
    }

    // Check if user is the seller of this order
    const expectedModel = userRole === 'farmer' ? 'Farmer' : 'Supplier';
    if (order.sellerId.toString() !== userId.toString() || order.sellerModel !== expectedModel) {
      return next(new ErrorHandler("You don't have permission to update this order.", 403));
    }

    // Check if order is in valid status
    if (order.status !== 'shipped') {
      return next(new ErrorHandler(
        `Cannot mark as out for delivery. Order must be in "shipped" status. Current status: "${order.status}"`,
        400
      ));
    }

    // Check if dispute is open
    if (order.dispute_status === "open" || order.dispute_status === "pending_admin_review") {
      return next(new ErrorHandler(
        "Cannot update order status while dispute is open. Please resolve the dispute first.",
        400
      ));
    }

    // Validate required fields
    if (!vehicleName || !vehicleRegistrationNumber || !vehicleType || !vehicleContactInfo) {
      return next(new ErrorHandler(
        "Vehicle information is required: vehicleName, vehicleRegistrationNumber, vehicleType, and vehicleContactInfo.",
        400
      ));
    }

    if (!riderName || !riderContactInfo) {
      return next(new ErrorHandler(
        "Rider information is required: riderName and riderContactInfo.",
        400
      ));
    }

    // Validate vehicle type
    const validVehicleTypes = ["Motorcycle", "Car", "Van", "Truck", "Rickshaw", "Other"];
    if (!validVehicleTypes.includes(vehicleType)) {
      return next(new ErrorHandler(
        `Invalid vehicle type. Must be one of: ${validVehicleTypes.join(", ")}`,
        400
      ));
    }

    // Update order status and delivery info
    const oldStatus = order.status;
    order.status = "out_for_delivery";
    order.outForDeliveryAt = new Date();

    // Generate tracking ID if not already set
    if (!order.trackingId) {
      let trackingId = generateTrackingId();
      let existingOrder = await Order.findOne({ trackingId });
      while (existingOrder) {
        trackingId = generateTrackingId();
        existingOrder = await Order.findOne({ trackingId });
      }
      order.trackingId = trackingId;
    }

    // Set delivery info with vehicle and rider details
    if (!order.deliveryInfo) {
      order.deliveryInfo = {};
    }
    order.deliveryInfo.vehicle = {
      name: vehicleName,
      registrationNumber: vehicleRegistrationNumber,
      vehicleType: vehicleType,
      contactInfo: vehicleContactInfo
    };
    order.deliveryInfo.rider = {
      name: riderName,
      contactInfo: riderContactInfo
    };

    await order.save();

    // Log order change
    try {
      const { logOrderChange } = await import("../utils/orderHistoryLogger.js");
      await logOrderChange(
        order._id,
        "order",
        { userId, role: userRole, name: req.user.name || "" },
        "status",
        oldStatus,
        "out_for_delivery",
        null,
        `Order marked as out for delivery. Tracking ID: ${order.trackingId}`
      );
    } catch (logError) {
      console.warn("Failed to log order change:", logError);
    }

    // Send notification to customer
    try {
      const { createNotification } = await import("../utils/notifications.js");
      const customerId = order.userId?._id || order.userId;
      const customerRole = order.userRole || "buyer";

      if (customerId) {
        await createNotification(
          customerId,
          customerRole,
          "order_out_for_delivery",
          "Order Out for Delivery",
          `Your order #${orderId} is out for delivery. Tracking ID: ${order.trackingId}`,
          {
            relatedId: order._id,
            relatedType: "order",
            actionUrl: `/orders/${orderId}`,
            priority: "high",
            sendEmail: true
          }
        );
      }
    } catch (notifError) {
      console.error("Failed to send order status notification:", notifError);
    }

    // Send email notification to customer
    try {
      let customer = null;
      if (order.userRole === "buyer") {
        customer = await buyer.findById(order.userId);
      } else if (order.userRole === "farmer") {
        customer = await farmer.findById(order.userId);
      }

      if (customer && customer.email) {
        const emailSubject = "Order Out for Delivery";
        const emailText = `Dear ${customer.name},\n\nYour order #${orderId} is now out for delivery.\n\nTracking ID: ${order.trackingId}\n\nVehicle Details:\n- Name: ${vehicleName}\n- Registration: ${vehicleRegistrationNumber}\n- Type: ${vehicleType}\n- Contact: ${vehicleContactInfo}\n\nRider Details:\n- Name: ${riderName}\n- Contact: ${riderContactInfo}\n\nYou will receive your order soon. Please confirm delivery once you receive it.\n\nThank you!`;

        await sendEmail(customer.email, emailSubject, emailText);
      }
    } catch (emailError) {
      console.error("Failed to send order status email:", emailError);
    }

    // Populate order for response
    const populatedOrder = await Order.findById(order._id)
      .populate("userId", "name email phone address")
      .populate("products.productId")
      .populate("sellerId", "name email phone")
      .lean();

    res.status(200).json({
      success: true,
      message: `Order marked as out for delivery successfully. Tracking ID: ${order.trackingId}`,
      data: {
        orderId: order._id,
        trackingId: order.trackingId,
        previousStatus: oldStatus,
        currentStatus: "out_for_delivery",
        updatedAt: order.updatedAt,
        deliveryInfo: order.deliveryInfo,
        order: populatedOrder
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Buyer confirms delivery - marks order as "Delivered"
 * Only buyers can confirm delivery after receiving the order
 */
export const confirmDelivery = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;
    const userRole = getRole(req).role;

    // Only buyers and farmers (as customers) can confirm delivery
    if (userRole !== 'buyer' && userRole !== 'farmer') {
      return next(new ErrorHandler(
        "Only buyers can confirm delivery. Sellers cannot mark orders as delivered.",
        403
      ));
    }

    // Find order
    const order = await Order.findById(orderId)
      .populate("products.productId")
      .populate("userId", "name email phone address")
      .populate("sellerId", "name email");
    
    if (!order) {
      return next(new ErrorHandler("Order not found", 404));
    }

    // Check if user is the customer of this order
    if (order.userId.toString() !== userId.toString()) {
      return next(new ErrorHandler("You don't have permission to confirm this order.", 403));
    }

    // Check if order is in valid status
    if (order.status !== 'out_for_delivery') {
      return next(new ErrorHandler(
        `Cannot confirm delivery. Order must be in "out_for_delivery" status. Current status: "${order.status}"`,
        400
      ));
    }

    // Check if dispute is open
    if (order.dispute_status === "open" || order.dispute_status === "pending_admin_review") {
      return next(new ErrorHandler(
        "Cannot update order status while dispute is open. Please resolve the dispute first.",
        400
      ));
    }

    // Update order status
    const oldStatus = order.status;
    order.status = "delivered";
    order.deliveredAt = new Date();
    
    if (order.deliveryInfo) {
      order.deliveryInfo.actualDeliveryDate = new Date();
    }

    await order.save();

    // Log order change
    try {
      const { logOrderChange } = await import("../utils/orderHistoryLogger.js");
      await logOrderChange(
        order._id,
        "order",
        { userId, role: userRole, name: req.user.name || "" },
        "status",
        oldStatus,
        "delivered",
        null,
        `Order delivery confirmed by buyer`
      );
    } catch (logError) {
      console.warn("Failed to log order change:", logError);
    }

    // Send notification to seller
    try {
      const { createNotification } = await import("../utils/notifications.js");
      const sellerId = order.sellerId?._id || order.sellerId;
      const sellerModel = order.sellerModel.toLowerCase();

      if (sellerId) {
        await createNotification(
          sellerId,
          sellerModel,
          "order_delivered",
          "Order Delivered",
          `Order #${orderId} has been delivered and confirmed by the buyer.`,
          {
            relatedId: order._id,
            relatedType: "order",
            actionUrl: `/orders/${orderId}`,
            priority: "medium",
            sendEmail: true
          }
        );
      }
    } catch (notifError) {
      console.error("Failed to send order status notification:", notifError);
    }

    // Send email notification to seller
    try {
      let seller = null;
      if (order.sellerModel === "Supplier") {
        seller = await supplier.findById(order.sellerId);
      } else if (order.sellerModel === "Farmer") {
        seller = await farmer.findById(order.sellerId);
      }

      if (seller && seller.email) {
        const emailSubject = "Order Delivered";
        const emailText = `Dear ${seller.name},\n\nThe buyer has confirmed delivery of order #${orderId}.\n\nOrder has been successfully delivered.\n\nThank you!`;

        await sendEmail(seller.email, emailSubject, emailText);
      }
    } catch (emailError) {
      console.error("Failed to send order status email:", emailError);
    }

    // Populate order for response
    const populatedOrder = await Order.findById(order._id)
      .populate("userId", "name email phone address")
      .populate("products.productId")
      .populate("sellerId", "name email phone")
      .lean();

    res.status(200).json({
      success: true,
      message: "Order delivery confirmed successfully",
      data: {
        orderId: order._id,
        trackingId: order.trackingId,
        previousStatus: oldStatus,
        currentStatus: "delivered",
        deliveredAt: order.deliveredAt,
        updatedAt: order.updatedAt,
        order: populatedOrder
      }
    });
  } catch (error) {
    next(error);
  }
};

export const cancelOrder = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;
    const order = await Order.findOne({ _id: orderId, userId });
    if (!order) return next(new ErrorHandler("Order not found", 404));

    if (order.status !== 'pending' && order.status !== 'processing') {
      return res.status(400).json({ success: false, message: `Cannot cancel order in '${order.status}' status` });
    }

    order.status = 'canceled';
    
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
    
    await order.save();
    res.status(200).json({ success: true, message: "Order canceled successfully", order });
  } catch (error) {
    next(error);
  }
};

export const getSupplierOrders = async (req, res, next) => {
  try {
    const vendorId = req.user.id;
    const userRole = getRole(req).role;

    // Only farmers and suppliers can access this
    if (userRole !== "farmer" && userRole !== "supplier") {
      return next(new ErrorHandler("Only farmers and suppliers can access this endpoint", 403));
    }

    // Get all orders where this vendor is the seller
    const orders = await Order.find({
      sellerId: vendorId,
      sellerModel: userRole === "farmer" ? "Farmer" : "Supplier"
    })
      .populate("products.productId")
      .populate("userId", "name email phone address")
      .sort({ createdAt: -1 })
      .lean();

    // Format orders with customer information
    const formattedOrders = orders.map(order => ({
      ...order,
      customer: order.userId ? {
        name: order.userId.name || "N/A",
        email: order.userId.email || "N/A",
        phone: order.userId.phone || order.shippingAddress?.phoneNumber || "N/A",
        address: order.userId.address || `${order.shippingAddress?.street || ""}, ${order.shippingAddress?.city || ""}`.replace(/^,\s*|,\s*$/g, "") || "N/A"
      } : {
        name: "N/A",
        email: "N/A",
        phone: "N/A",
        address: "N/A"
      }
    }));

    res.status(200).json({ 
      success: true, 
      count: formattedOrders.length, 
      orders: formattedOrders 
    });
  } catch (error) {
    next(error);
  }
};

export const getAllOrders = async (req, res, next) => {
  try {
    if (getRole(req).role !== 'admin') {
      return res.status(403).json({ success: false, message: "Not authorized to access all orders" });
    }

    const { status, paymentStatus, startDate, endDate, page = 1, limit = 10 } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (paymentStatus) filter["paymentInfo.status"] = paymentStatus;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const orders = await Order.find(filter)
      .populate("products.productId")
      .populate("sellerId", "name email")
      .populate("userId", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalOrders = await Order.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: orders.length,
      totalOrders,
      totalPages: Math.ceil(totalOrders / parseInt(limit)),
      currentPage: parseInt(page),
      orders
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get orders by orderGroupId - returns all orders from the same checkout
 */
export const getOrdersByGroup = async (req, res, next) => {
  try {
    const { orderGroupId } = req.params;
    const userId = req.user.id;
    const userRole = getRole(req).role;

    if (!orderGroupId) {
      return next(new ErrorHandler("Order group ID is required", 400));
    }

    // Find all orders with this orderGroupId
    const orders = await Order.find({ orderGroupId })
      .populate("products.productId")
      .populate("sellerId", "name email phone")
      .populate("userId", "name email phone address")
      .sort({ createdAt: -1 });

    if (orders.length === 0) {
      return next(new ErrorHandler("No orders found for this group", 404));
    }

    // Check authorization - user must be the customer or admin
    if (userRole !== 'admin') {
      const firstOrder = orders[0];
      if (firstOrder.userId.toString() !== userId.toString()) {
        return next(new ErrorHandler("You don't have permission to view these orders", 403));
      }
    }

    // Calculate totals
    const totalPrice = orders.reduce((sum, order) => sum + (order.totalPrice || 0), 0);
    const allStatuses = orders.map(o => o.status);
    const uniqueStatuses = [...new Set(allStatuses)];

    // Determine overall status
    let overallStatus = "pending";
    if (uniqueStatuses.length === 1) {
      overallStatus = uniqueStatuses[0];
    } else if (allStatuses.every(s => s === "delivered" || s === "received")) {
      overallStatus = "delivered";
    } else if (allStatuses.some(s => s === "canceled" || s === "cancelled")) {
      overallStatus = "partially_cancelled";
    } else if (allStatuses.some(s => s === "shipped")) {
      overallStatus = "partially_shipped";
    } else if (allStatuses.some(s => s === "processing" || s === "confirmed")) {
      overallStatus = "processing";
    }

    res.status(200).json({
      success: true,
      orderGroupId: orderGroupId,
      count: orders.length,
      totalPrice: totalPrice,
      overallStatus: overallStatus,
      orders: orders,
      summary: {
        byStatus: uniqueStatuses.reduce((acc, status) => {
          acc[status] = allStatuses.filter(s => s === status).length;
          return acc;
        }, {}),
        bySeller: orders.map(order => ({
          sellerId: order.sellerId._id || order.sellerId,
          sellerName: order.sellerId.name || "N/A",
          orderId: order._id,
          status: order.status,
          totalPrice: order.totalPrice
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};
