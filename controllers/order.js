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
import { Dispute } from '../models/dispute.js';

const getRole = (req) => {
  const { token } = req.cookies;
  if (!token) throw new ErrorHandler("Authentication token missing", 401);
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  return { role: decoded.role };
};

export const createOrder = async (req, res, next) => {
  try {
    const { cartId, paymentMethod, street, city, zipCode, phoneNumber, notes } = req.body;
    const userId = req.user._id || req.user.id;
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
          relatedId: orderGroupId,
          relatedType: "order",
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
    const userId = req.user._id || req.user.id;
    if (!userId) {
      return next(new ErrorHandler("User ID not found", 401));
    }
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
    const userId = req.user._id || req.user.id;
    const userRole = getRole(req).role;
    
    const order = await Order.findById(orderId)
      .populate("products.productId")
      .populate("sellerId", "name email phone")
      .lean();
    
    if (!order) return next(new ErrorHandler("Order not found", 404));

    // Manually populate userId based on userRole (buyer or farmer)
    let customerInfo = {
      name: "N/A",
      email: "N/A",
      phone: "N/A",
      address: "N/A"
    };

    if (order.userId && order.userRole) {
      try {
        let customer = null;
        if (order.userRole === "buyer") {
          customer = await buyer.findById(order.userId).select("name email phone address").lean();
        } else if (order.userRole === "farmer") {
          customer = await farmer.findById(order.userId).select("name email phone address").lean();
        }

        if (customer) {
          customerInfo = {
            name: customer.name || "N/A",
            email: customer.email || "N/A",
            phone: customer.phone || order.shippingAddress?.phoneNumber || "N/A",
            address: customer.address || `${order.shippingAddress?.street || ""}, ${order.shippingAddress?.city || ""}`.replace(/^,\s*|,\s*$/g, "") || "N/A"
          };
        }
      } catch (populateError) {
        console.error("Error populating customer info:", populateError);
        // Fallback to shipping address if available
        if (order.shippingAddress) {
          customerInfo.phone = order.shippingAddress.phoneNumber || "N/A";
          customerInfo.address = `${order.shippingAddress.street || ""}, ${order.shippingAddress.city || ""}`.replace(/^,\s*|,\s*$/g, "") || "N/A";
        }
      }
    } else if (order.shippingAddress) {
      // Fallback to shipping address if userId/userRole not available
      customerInfo.phone = order.shippingAddress.phoneNumber || "N/A";
      customerInfo.address = `${order.shippingAddress.street || ""}, ${order.shippingAddress.city || ""}`.replace(/^,\s*|,\s*$/g, "") || "N/A";
    }

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
          ...order,
          userId: order.userId ? {
            _id: order.userId,
            ...customerInfo
          } : null,
          customer: customerInfo
        }
      });
    }

    // For buyers/farmers (customers), only show their own orders
    if (order.userId.toString() !== userId.toString()) {
      return next(new ErrorHandler("Order not found", 404));
    }

    res.status(200).json({ 
      success: true, 
      order: {
        ...order,
        userId: order.userId ? {
          _id: order.userId,
          ...customerInfo
        } : null,
        customer: customerInfo
      }
    });
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
    const userId = req.user._id || req.user.id;

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

    // Get current status and normalize to lowercase for comparison
    const currentStatus = (order.status || "").toLowerCase();
    const newStatusLower = (status || "").toLowerCase();

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
        `Cannot update status of an order that is ${order.status}. Status cannot be changed.`,
        400
      ));
    }

    // Validate status transitions
    const validStatuses = ["pending", "processing", "shipped", "out_for_delivery", "delivered", "received", "cancelled"];
    if (!validStatuses.includes(newStatusLower)) {
      return next(new ErrorHandler(
        `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
        400
      ));
    }

    // Prevent seller from directly marking as "delivered" - only buyer can confirm delivery
    if (newStatusLower === "delivered" && (userRole === 'farmer' || userRole === 'supplier')) {
      return next(new ErrorHandler(
        "Sellers cannot mark orders as 'delivered'. Only buyers can confirm delivery after receiving the order.",
        403
      ));
    }

    // Define allowed transitions (all lowercase for consistent comparison)
    const allowedTransitions = {
      "pending": ["processing", "cancelled"], // Accept changes to processing, reject changes to cancelled
      "processing": ["shipped", "cancelled"],
      "shipped": ["out_for_delivery", "cancelled"],
      "out_for_delivery": [], // Cannot change from out_for_delivery - buyer must confirm delivery
      "delivered": [], // Cannot change from delivered (buyer must confirm)
      "received": [], // Cannot change from received
      "cancelled": [], // Cannot change from cancelled
      "canceled": [] // Alias for cancelled
    };

    // Check if transition is allowed (using normalized lowercase statuses)
    // Trim and normalize to handle any whitespace issues
    const normalizedCurrentStatus = currentStatus.trim();
    const normalizedNewStatus = newStatusLower.trim();
    
    const allowedNextStatuses = allowedTransitions[normalizedCurrentStatus] || [];
    
    // Debug logging
    console.log("Status transition check:", {
      originalStatus: order.status,
      normalizedCurrentStatus,
      requestedStatus: status,
      normalizedNewStatus,
      allowedNextStatuses,
      hasTransition: allowedNextStatuses.includes(normalizedNewStatus)
    });
    
    if (!allowedNextStatuses.includes(normalizedNewStatus)) {
      return next(new ErrorHandler(
        `Cannot change status from "${order.status}" to "${status}". ` +
        `Current normalized status: "${normalizedCurrentStatus}". ` +
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

    // Update order status (use normalized lowercase status)
    const oldStatus = order.status;
    order.status = normalizedNewStatus;
    
    // Handle status-specific timestamps and data
    const now = new Date();
    if (normalizedNewStatus === 'shipped') {
      order.shippedAt = now;
      if (!order.expected_delivery_date) {
        const expectedDate = new Date();
        expectedDate.setDate(expectedDate.getDate() + 7);
        order.expected_delivery_date = expectedDate;
      }
    }
    
    if (normalizedNewStatus === 'out_for_delivery') {
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
    
    if (normalizedNewStatus === 'delivered') {
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

      if (customerId && (normalizedNewStatus === "shipped" || normalizedNewStatus === "out_for_delivery" || normalizedNewStatus === "delivered")) {
        let notificationType, title, message;
        if (normalizedNewStatus === "shipped") {
          notificationType = "order_shipped";
          title = "Order Shipped";
          message = `Your order #${orderId} has been shipped and is on its way.`;
        } else if (normalizedNewStatus === "out_for_delivery") {
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
          processing: "Your order is being processed and prepared for shipment.",
          shipped: "Your order has been shipped and is on its way to you.",
          out_for_delivery: `Your order is out for delivery. Tracking ID: ${order.trackingId || 'N/A'}`,
          delivered: "Your order has been delivered successfully. Please confirm receipt.",
          received: "Your order has been received and payment is complete.",
          cancelled: "Your order has been cancelled.",
          canceled: "Your order has been cancelled."
        };

        const statusMessage = statusMessages[normalizedNewStatus] || `Your order status has been updated to ${normalizedNewStatus}.`;
        const emailSubject = `Order Status Update - ${normalizedNewStatus.charAt(0).toUpperCase() + normalizedNewStatus.slice(1)}`;
        const emailText = `Dear ${customer.name},\n\nYour order #${orderId} status has been updated from "${oldStatus}" to "${normalizedNewStatus}".\n\n${statusMessage}\n\nThank you for shopping with us!`;

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
      message: `Order status updated successfully from "${oldStatus}" to "${normalizedNewStatus}"`,
      data: {
        orderId: order._id,
        previousStatus: oldStatus,
        currentStatus: normalizedNewStatus,
        updatedAt: order.updatedAt,
        order: populatedOrder
      },
      metadata: {
        statusTransition: {
          from: oldStatus,
          to: normalizedNewStatus,
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
    const userId = req.user._id || req.user.id;

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
    const userId = req.user._id || req.user.id;
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

/**
 * Buyer confirms receipt - marks order as "Received" and completes payment
 * Only buyers can confirm receipt after the order is delivered
 */
export const confirmReceipt = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const userId = req.user._id || req.user.id;
    const userRole = getRole(req).role;

    // Only buyers and farmers (as customers) can confirm receipt
    if (userRole !== 'buyer' && userRole !== 'farmer') {
      return next(new ErrorHandler(
        "Only buyers can confirm receipt. Sellers cannot confirm receipt.",
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
    if (order.status !== 'delivered') {
      return next(new ErrorHandler(
        `Cannot confirm receipt. Order must be in "delivered" status. Current status: "${order.status}"`,
        400
      ));
    }

    // Check if dispute is open
    if (order.dispute_status === "open" || order.dispute_status === "pending_admin_review") {
      return next(new ErrorHandler(
        "Cannot confirm receipt while dispute is open. Please resolve the dispute first.",
        400
      ));
    }

    // Update order status
    const oldStatus = order.status;
    order.status = "received";
    order.receivedAt = new Date();
    
    // Complete payment
    order.payment_status = "complete";
    if (order.paymentInfo) {
      order.paymentInfo.status = "complete";
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
        "received",
        null,
        `Order receipt confirmed by buyer. Payment completed.`
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
          "order_received",
          "Order Received",
          `Order #${orderId} has been received and payment completed by the buyer.`,
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
        const emailSubject = "Order Received - Payment Completed";
        const emailText = `Dear ${seller.name},\n\nThe buyer has confirmed receipt of order #${orderId}.\n\nPayment has been completed successfully.\n\nThank you!`;

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
      message: "Order receipt confirmed successfully. Payment completed.",
      data: {
        orderId: order._id,
        trackingId: order.trackingId,
        previousStatus: oldStatus,
        currentStatus: "received",
        receivedAt: order.receivedAt,
        paymentStatus: "complete",
        updatedAt: order.updatedAt,
        order: populatedOrder
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Seller accepts order - changes status from pending to confirmed/processing
 */
export const acceptOrder = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { estimatedDeliveryDate } = req.body;
    const userRole = getRole(req).role;
    const userId = req.user._id || req.user.id;

    // Only sellers (farmer/supplier) can accept orders
    if (userRole !== 'farmer' && userRole !== 'supplier') {
      return next(new ErrorHandler(
        "Only sellers (farmers/suppliers) can accept orders.",
        403
      ));
    }

    // Find order
    const order = await Order.findById(orderId)
      .populate("products.productId")
      .populate("sellerId", "name email");
    
    if (!order) {
      return next(new ErrorHandler("Order not found", 404));
    }

    // Check if user is the seller of this order
    // Handle both populated and non-populated sellerId
    const sellerIdValue = order.sellerId?._id || order.sellerId;
    const expectedModel = userRole === 'farmer' ? 'Farmer' : 'Supplier';
    
    if (!sellerIdValue || sellerIdValue.toString() !== userId.toString() || order.sellerModel !== expectedModel) {
      return next(new ErrorHandler("You don't have permission to accept this order.", 403));
    }

    // Check if order is in valid status
    if (order.status !== 'pending') {
      return next(new ErrorHandler(
        `Cannot accept order. Order must be in "pending" status. Current status: "${order.status}"`,
        400
      ));
    }

    // Check if dispute is open
    if (order.dispute_status === "open" || order.dispute_status === "pending_admin_review") {
      return next(new ErrorHandler(
        "Cannot accept order while dispute is open. Please resolve the dispute first.",
        400
      ));
    }

    // Update order status
    const oldStatus = order.status;
    order.status = "processing"; // Changed from pending to processing (confirmed status doesn't exist in enum)
    
    // Set estimated delivery date if provided
    if (estimatedDeliveryDate) {
      if (!order.deliveryInfo) {
        order.deliveryInfo = {};
      }
      order.deliveryInfo.estimatedDeliveryDate = new Date(estimatedDeliveryDate);
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
        "processing",
        null,
        `Order accepted by seller${estimatedDeliveryDate ? `. Estimated delivery: ${estimatedDeliveryDate}` : ''}`
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
          "order_accepted",
          "Order Accepted",
          `Your order #${orderId} has been accepted by the seller.`,
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
        const emailSubject = "Order Accepted";
        const emailText = `Dear ${customer.name},\n\nYour order #${orderId} has been accepted by the seller.\n\n${estimatedDeliveryDate ? `Estimated delivery date: ${new Date(estimatedDeliveryDate).toLocaleDateString()}\n\n` : ''}Thank you!`;

        await sendEmail(customer.email, emailSubject, emailText);
      }
    } catch (emailError) {
      console.error("Failed to send order status email:", emailError);
    }

    // Populate order for response
    const populatedOrder = await Order.findById(order._id)
      .populate("products.productId")
      .populate("sellerId", "name email phone")
      .lean();

    // Manually populate userId based on userRole
    let customerInfo = {
      name: "N/A",
      email: "N/A",
      phone: "N/A",
      address: "N/A"
    };

    if (populatedOrder.userId && populatedOrder.userRole) {
      try {
        let customer = null;
        if (populatedOrder.userRole === "buyer") {
          customer = await buyer.findById(populatedOrder.userId).select("name email phone address").lean();
        } else if (populatedOrder.userRole === "farmer") {
          customer = await farmer.findById(populatedOrder.userId).select("name email phone address").lean();
        }

        if (customer) {
          customerInfo = {
            name: customer.name || "N/A",
            email: customer.email || "N/A",
            phone: customer.phone || populatedOrder.shippingAddress?.phoneNumber || "N/A",
            address: customer.address || `${populatedOrder.shippingAddress?.street || ""}, ${populatedOrder.shippingAddress?.city || ""}`.replace(/^,\s*|,\s*$/g, "") || "N/A"
          };
        }
      } catch (populateError) {
        console.error("Error populating customer info:", populateError);
        if (populatedOrder.shippingAddress) {
          customerInfo.phone = populatedOrder.shippingAddress.phoneNumber || "N/A";
          customerInfo.address = `${populatedOrder.shippingAddress.street || ""}, ${populatedOrder.shippingAddress.city || ""}`.replace(/^,\s*|,\s*$/g, "") || "N/A";
        }
      }
    } else if (populatedOrder.shippingAddress) {
      customerInfo.phone = populatedOrder.shippingAddress.phoneNumber || "N/A";
      customerInfo.address = `${populatedOrder.shippingAddress.street || ""}, ${populatedOrder.shippingAddress.city || ""}`.replace(/^,\s*|,\s*$/g, "") || "N/A";
    }

    res.status(200).json({
      success: true,
      message: "Order accepted successfully",
      order: {
        ...populatedOrder,
        userId: populatedOrder.userId ? {
          _id: populatedOrder.userId,
          ...customerInfo
        } : null,
        customer: customerInfo
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Seller rejects order - changes status to canceled
 */
export const rejectOrder = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;
    const userRole = getRole(req).role;
    const userId = req.user._id || req.user.id;

    // Only sellers (farmer/supplier) can reject orders
    if (userRole !== 'farmer' && userRole !== 'supplier') {
      return next(new ErrorHandler(
        "Only sellers (farmers/suppliers) can reject orders.",
        403
      ));
    }

    // Find order
    const order = await Order.findById(orderId)
      .populate("products.productId")
      .populate("sellerId", "name email");
    
    if (!order) {
      return next(new ErrorHandler("Order not found", 404));
    }

    // Check if user is the seller of this order
    // Handle both populated and non-populated sellerId
    const sellerIdValue = order.sellerId?._id || order.sellerId;
    const expectedModel = userRole === 'farmer' ? 'Farmer' : 'Supplier';
    
    if (!sellerIdValue || sellerIdValue.toString() !== userId.toString() || order.sellerModel !== expectedModel) {
      return next(new ErrorHandler("You don't have permission to reject this order.", 403));
    }

    // Check if order is in valid status
    if (order.status !== 'pending') {
      return next(new ErrorHandler(
        `Cannot reject order. Order must be in "pending" status. Current status: "${order.status}"`,
        400
      ));
    }

    // Check if dispute is open
    if (order.dispute_status === "open" || order.dispute_status === "pending_admin_review") {
      return next(new ErrorHandler(
        "Cannot reject order while dispute is open. Please resolve the dispute first.",
        400
      ));
    }

    // Update order status
    const oldStatus = order.status;
    order.status = "canceled";
    
    // Store rejection reason in deliveryInfo.notes if provided
    if (reason) {
      if (!order.deliveryInfo) {
        order.deliveryInfo = {};
      }
      order.deliveryInfo.notes = `Order rejected by seller. Reason: ${reason}`;
    }
    
    // Update payment status
    order.payment_status = "cancelled";
    if (order.paymentInfo) {
      order.paymentInfo.status = "cancelled";
    }

    // Restore product quantities
    try {
      for (const productItem of order.products) {
        const dbProduct = await product.findById(productItem.productId);
        if (dbProduct) {
          dbProduct.quantity += productItem.quantity;
          await dbProduct.save();
        }
      }
    } catch (restoreError) {
      console.error("Error restoring product quantities:", restoreError);
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
        "canceled",
        null,
        `Order rejected by seller. ${reason ? `Reason: ${reason}` : ''}`
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
          "order_rejected",
          "Order Rejected",
          `Your order #${orderId} has been rejected by the seller.${reason ? ` Reason: ${reason}` : ''}`,
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
        const emailSubject = "Order Rejected";
        const emailText = `Dear ${customer.name},\n\nYour order #${orderId} has been rejected by the seller.\n\n${reason ? `Reason: ${reason}\n\n` : ''}If you have any questions, please contact the seller.\n\nThank you!`;

        await sendEmail(customer.email, emailSubject, emailText);
      }
    } catch (emailError) {
      console.error("Failed to send order status email:", emailError);
    }

    // Populate order for response
    const populatedOrder = await Order.findById(order._id)
      .populate("products.productId")
      .populate("sellerId", "name email phone")
      .lean();

    // Manually populate userId based on userRole
    let customerInfo = {
      name: "N/A",
      email: "N/A",
      phone: "N/A",
      address: "N/A"
    };

    if (populatedOrder.userId && populatedOrder.userRole) {
      try {
        let customer = null;
        if (populatedOrder.userRole === "buyer") {
          customer = await buyer.findById(populatedOrder.userId).select("name email phone address").lean();
        } else if (populatedOrder.userRole === "farmer") {
          customer = await farmer.findById(populatedOrder.userId).select("name email phone address").lean();
        }

        if (customer) {
          customerInfo = {
            name: customer.name || "N/A",
            email: customer.email || "N/A",
            phone: customer.phone || populatedOrder.shippingAddress?.phoneNumber || "N/A",
            address: customer.address || `${populatedOrder.shippingAddress?.street || ""}, ${populatedOrder.shippingAddress?.city || ""}`.replace(/^,\s*|,\s*$/g, "") || "N/A"
          };
        }
      } catch (populateError) {
        console.error("Error populating customer info:", populateError);
        if (populatedOrder.shippingAddress) {
          customerInfo.phone = populatedOrder.shippingAddress.phoneNumber || "N/A";
          customerInfo.address = `${populatedOrder.shippingAddress.street || ""}, ${populatedOrder.shippingAddress.city || ""}`.replace(/^,\s*|,\s*$/g, "") || "N/A";
        }
      }
    } else if (populatedOrder.shippingAddress) {
      customerInfo.phone = populatedOrder.shippingAddress.phoneNumber || "N/A";
      customerInfo.address = `${populatedOrder.shippingAddress.street || ""}, ${populatedOrder.shippingAddress.city || ""}`.replace(/^,\s*|,\s*$/g, "") || "N/A";
    }

    res.status(200).json({
      success: true,
      message: "Order rejected successfully",
      order: {
        ...populatedOrder,
        userId: populatedOrder.userId ? {
          _id: populatedOrder.userId,
          ...customerInfo
        } : null,
        customer: customerInfo
      }
    });
  } catch (error) {
    next(error);
  }
};

export const cancelOrder = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const userId = req.user._id || req.user.id;
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
    const vendorId = req.user._id || req.user.id;
    if (!vendorId) {
      return next(new ErrorHandler("User ID not found", 401));
    }
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
      .sort({ createdAt: -1 })
      .lean();

    // Manually populate userId based on userRole (buyer or farmer)
    // Since userId doesn't have ref/refPath, we need to populate manually
    const formattedOrders = await Promise.all(orders.map(async (order) => {
      let customerInfo = {
        name: "N/A",
        email: "N/A",
        phone: "N/A",
        address: "N/A"
      };

      if (order.userId && order.userRole) {
        try {
          let customer = null;
          if (order.userRole === "buyer") {
            customer = await buyer.findById(order.userId).select("name email phone address").lean();
          } else if (order.userRole === "farmer") {
            customer = await farmer.findById(order.userId).select("name email phone address").lean();
          }

          if (customer) {
            customerInfo = {
              name: customer.name || "N/A",
              email: customer.email || "N/A",
              phone: customer.phone || order.shippingAddress?.phoneNumber || "N/A",
              address: customer.address || `${order.shippingAddress?.street || ""}, ${order.shippingAddress?.city || ""}`.replace(/^,\s*|,\s*$/g, "") || "N/A"
            };
          }
        } catch (populateError) {
          console.error("Error populating customer info:", populateError);
          // Fallback to shipping address if available
          if (order.shippingAddress) {
            customerInfo.phone = order.shippingAddress.phoneNumber || "N/A";
            customerInfo.address = `${order.shippingAddress.street || ""}, ${order.shippingAddress.city || ""}`.replace(/^,\s*|,\s*$/g, "") || "N/A";
          }
        }
      } else if (order.shippingAddress) {
        // Fallback to shipping address if userId/userRole not available
        customerInfo.phone = order.shippingAddress.phoneNumber || "N/A";
        customerInfo.address = `${order.shippingAddress.street || ""}, ${order.shippingAddress.city || ""}`.replace(/^,\s*|,\s*$/g, "") || "N/A";
      }

      return {
        ...order,
        customer: customerInfo,
        userId: order.userId ? {
          _id: order.userId,
          ...customerInfo
        } : null
      };
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
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Manually populate userId based on userRole (buyer or farmer)
    const populatedOrders = await Promise.all(orders.map(async (order) => {
      let customerInfo = {
        name: "N/A",
        email: "N/A",
        phone: "N/A",
        address: "N/A"
      };

      if (order.userId && order.userRole) {
        try {
          let customer = null;
          if (order.userRole === "buyer") {
            customer = await buyer.findById(order.userId).select("name email phone address").lean();
          } else if (order.userRole === "farmer") {
            customer = await farmer.findById(order.userId).select("name email phone address").lean();
          }

          if (customer) {
            customerInfo = {
              name: customer.name || "N/A",
              email: customer.email || "N/A",
              phone: customer.phone || order.shippingAddress?.phoneNumber || "N/A",
              address: customer.address || `${order.shippingAddress?.street || ""}, ${order.shippingAddress?.city || ""}`.replace(/^,\s*|,\s*$/g, "") || "N/A"
            };
          }
        } catch (populateError) {
          console.error("Error populating customer info:", populateError);
          // Fallback to shipping address if available
          if (order.shippingAddress) {
            customerInfo.phone = order.shippingAddress.phoneNumber || "N/A";
            customerInfo.address = `${order.shippingAddress.street || ""}, ${order.shippingAddress.city || ""}`.replace(/^,\s*|,\s*$/g, "") || "N/A";
          }
        }
      } else if (order.shippingAddress) {
        // Fallback to shipping address if userId/userRole not available
        customerInfo.phone = order.shippingAddress.phoneNumber || "N/A";
        customerInfo.address = `${order.shippingAddress.street || ""}, ${order.shippingAddress.city || ""}`.replace(/^,\s*|,\s*$/g, "") || "N/A";
      }

      return {
        ...order,
        userId: order.userId ? {
          _id: order.userId,
          ...customerInfo
        } : null,
        customer: customerInfo,
        // Add customerId and buyerId for frontend compatibility (admin portal expects these)
        customerId: order.userId ? {
          _id: order.userId,
          ...customerInfo
        } : null,
        buyerId: order.userId ? {
          _id: order.userId,
          ...customerInfo
        } : null
      };
    }));

    const totalOrders = await Order.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: populatedOrders.length,
      totalOrders,
      totalPages: Math.ceil(totalOrders / parseInt(limit)),
      currentPage: parseInt(page),
      orders: populatedOrders
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
    const userId = req.user._id || req.user.id;
    const userRole = getRole(req).role;

    if (!orderGroupId) {
      return next(new ErrorHandler("Order group ID is required", 400));
    }

    // Find all orders with this orderGroupId
    const orders = await Order.find({ orderGroupId })
      .populate("products.productId")
      .populate("sellerId", "name email phone")
      .sort({ createdAt: -1 })
      .lean();

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

    // Manually populate userId for each order based on userRole
    const populatedOrders = await Promise.all(orders.map(async (order) => {
      let customerInfo = {
        name: "N/A",
        email: "N/A",
        phone: "N/A",
        address: "N/A"
      };

      if (order.userId && order.userRole) {
        try {
          let customer = null;
          if (order.userRole === "buyer") {
            customer = await buyer.findById(order.userId).select("name email phone address").lean();
          } else if (order.userRole === "farmer") {
            customer = await farmer.findById(order.userId).select("name email phone address").lean();
          }

          if (customer) {
            customerInfo = {
              name: customer.name || "N/A",
              email: customer.email || "N/A",
              phone: customer.phone || order.shippingAddress?.phoneNumber || "N/A",
              address: customer.address || `${order.shippingAddress?.street || ""}, ${order.shippingAddress?.city || ""}`.replace(/^,\s*|,\s*$/g, "") || "N/A"
            };
          }
        } catch (populateError) {
          console.error("Error populating customer info:", populateError);
          if (order.shippingAddress) {
            customerInfo.phone = order.shippingAddress.phoneNumber || "N/A";
            customerInfo.address = `${order.shippingAddress.street || ""}, ${order.shippingAddress.city || ""}`.replace(/^,\s*|,\s*$/g, "") || "N/A";
          }
        }
      } else if (order.shippingAddress) {
        customerInfo.phone = order.shippingAddress.phoneNumber || "N/A";
        customerInfo.address = `${order.shippingAddress.street || ""}, ${order.shippingAddress.city || ""}`.replace(/^,\s*|,\s*$/g, "") || "N/A";
      }

      return {
        ...order,
        userId: order.userId ? {
          _id: order.userId,
          ...customerInfo
        } : null,
        customer: customerInfo
      };
    }));

    // Calculate totals
    const totalPrice = populatedOrders.reduce((sum, order) => sum + (order.totalPrice || 0), 0);
    const allStatuses = populatedOrders.map(o => o.status);
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
      count: populatedOrders.length,
      totalPrice: totalPrice,
      overallStatus: overallStatus,
      orders: populatedOrders,
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

/**
 * Create dispute (buyer only)
 * POST /api/v1/order/dispute/:orderId
 * 
 * Disputes can be created:
 * 1. After order is "shipped" AND expected delivery date has expired
 * 2. After order is "out_for_delivery" (buyer can dispute non-delivery)
 * 3. After order is "delivered" (buyer confirmed delivery but can dispute product issues)
 * 4. After order is "received" (buyer can still dispute product quality/faults)
 */
export const createDispute = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { disputeType, reason, proofOfFault } = req.body;
    const userId = req.user._id || req.user.id;
    const userRole = getRole(req).role;

    // Only buyers and farmers (as customers) can create disputes
    if (userRole !== 'buyer' && userRole !== 'farmer') {
      return next(new ErrorHandler("Only buyers can create disputes", 403));
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
      return next(new ErrorHandler("You don't have permission to create a dispute for this order.", 403));
    }

    // Check if dispute already exists for this order
    const existingDispute = await Dispute.findOne({ orderId });
    if (existingDispute) {
      return next(new ErrorHandler("A dispute already exists for this order", 400));
    }

    // Validate required fields
    if (!disputeType || !reason) {
      return next(new ErrorHandler("Dispute type and reason are required", 400));
    }

    // Validate order status - disputes can only be created after order is shipped or later
    const validStatusesForDispute = ["shipped", "out_for_delivery", "delivered", "received"];
    if (!validStatusesForDispute.includes(order.status)) {
      return next(new ErrorHandler(
        `Cannot create dispute. Order must be in one of these statuses: ${validStatusesForDispute.join(", ")}. ` +
        `Current status: "${order.status}". ` +
        `Disputes can only be created after the order has been shipped.`,
        400
      ));
    }

    // Special validation for "shipped" status - check if expected delivery date has expired
    if (order.status === "shipped") {
      if (!order.expected_delivery_date) {
        return next(new ErrorHandler(
          "Cannot create dispute. Expected delivery date is not set for this order. " +
          "Please wait until the seller sets the expected delivery date or marks the order as out for delivery.",
          400
        ));
      }

      const now = new Date();
      const expectedDeliveryDate = new Date(order.expected_delivery_date);
      
      // Allow dispute if expected delivery date has passed (with 1 day buffer for timezone issues)
      const oneDayInMs = 24 * 60 * 60 * 1000;
      if (now < new Date(expectedDeliveryDate.getTime() + oneDayInMs)) {
        return next(new ErrorHandler(
          `Cannot create dispute yet. Expected delivery date is ${expectedDeliveryDate.toLocaleDateString()}. ` +
          `You can create a dispute after the expected delivery date has passed.`,
          400
        ));
      }
    }

    // For "out_for_delivery" status - buyer can dispute non-delivery
    // For "delivered" and "received" status - buyer can dispute product faults/issues
    // No additional validation needed for these statuses

    // Get seller information
    const sellerId = order.sellerId;
    const sellerModel = order.sellerModel;
    const sellerRole = sellerModel === "Farmer" ? "farmer" : "supplier";

    // Create dispute
    const dispute = await Dispute.create({
      orderId: order._id,
      buyerId: userId,
      sellerId: sellerId,
      sellerRole: sellerRole,
      disputeType,
      reason,
      buyerProof: proofOfFault ? {
        images: proofOfFault.images || [],
        description: proofOfFault.description || "",
        uploadedAt: new Date()
      } : undefined,
      status: "open"
    });

    // Update order dispute status
    order.dispute_status = "open";
    await order.save();

    // Send notification to seller
    try {
      const { createNotification } = await import("../utils/notifications.js");
      await createNotification(
        sellerId,
        sellerRole,
        "dispute_created",
        "New Dispute Created",
        `A dispute has been created for order #${orderId}. Please respond to resolve it.`,
        {
          relatedId: dispute._id,
          relatedType: "dispute",
          actionUrl: `/disputes/${dispute._id}`,
          priority: "high",
          sendEmail: true
        }
      );
    } catch (notifError) {
      console.error("Failed to send dispute notification:", notifError);
    }

    // Populate dispute for response
    const populatedDispute = await Dispute.findById(dispute._id)
      .populate("orderId")
      .populate("buyerId", "name email")
      .populate("sellerId", "name email")
      .lean();

    res.status(201).json({
      success: true,
      message: "Dispute created successfully",
      dispute: populatedDispute
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get dispute by ID (buyer/seller can get their own disputes)
 * GET /api/v1/order/dispute/:disputeId
 */
export const getDisputeById = async (req, res, next) => {
  try {
    const { disputeId } = req.params;
    const userId = req.user._id || req.user.id;
    const userRole = getRole(req).role;

    // Find dispute
    const dispute = await Dispute.findById(disputeId)
      .populate("orderId")
      .populate("buyerId", "name email phone")
      .populate("sellerId", "name email phone")
      .populate("adminRuling.adminId", "name email")
      .lean();
    
    if (!dispute) {
      return next(new ErrorHandler("Dispute not found", 404));
    }

    // Check if user has permission to view this dispute
    // Buyers can view disputes where they are the buyer
    // Sellers can view disputes where they are the seller
    // Admins can view any dispute
    const isBuyer = (userRole === 'buyer' || userRole === 'farmer') && 
                    dispute.buyerId.toString() === userId.toString();
    const isSeller = (userRole === 'farmer' || userRole === 'supplier') && 
                     dispute.sellerId.toString() === userId.toString();
    const isAdmin = userRole === 'admin';

    if (!isBuyer && !isSeller && !isAdmin) {
      return next(new ErrorHandler("You don't have permission to view this dispute.", 403));
    }

    // Manually populate orderId if it's not already populated
    if (dispute.orderId && typeof dispute.orderId === 'object' && !dispute.orderId.products) {
      const order = await Order.findById(dispute.orderId._id || dispute.orderId)
        .populate("products.productId", "name price images")
        .populate("userId", "name email phone")
        .populate("sellerId", "name email phone")
        .lean();
      dispute.orderId = order || dispute.orderId;
    }

    res.status(200).json({
      success: true,
      dispute
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get buyer disputes
 * GET /api/v1/order/disputes/buyer
 */
export const getBuyerDisputes = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const userRole = getRole(req).role;
    const { status, page = 1, limit = 50 } = req.query;

    // Only buyers and farmers (as customers) can get their disputes
    if (userRole !== 'buyer' && userRole !== 'farmer') {
      return next(new ErrorHandler("Only buyers can access this endpoint", 403));
    }

    const filter = { buyerId: userId };
    if (status && status !== "all") {
      filter.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const disputes = await Dispute.find(filter)
      .populate("orderId")
      .populate("sellerId", "name email phone")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Dispute.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: disputes.length,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      disputes
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get seller disputes
 * GET /api/v1/order/disputes
 */
export const getSellerDisputes = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    if (!userId) {
      return next(new ErrorHandler("User ID not found", 401));
    }
    const userRole = getRole(req).role;
    const { status, page = 1, limit = 50 } = req.query;

    // Only sellers (farmer/supplier) can get their disputes
    if (userRole !== 'farmer' && userRole !== 'supplier') {
      return next(new ErrorHandler("Only sellers can access this endpoint", 403));
    }

    const sellerRole = userRole;
    const filter = { 
      sellerId: mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId,
      sellerRole: sellerRole
    };
    if (status && status !== "all") {
      filter.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const disputes = await Dispute.find(filter)
      .populate("buyerId", "name email phone")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Manually populate orderId to ensure it's properly populated with products
    const disputesWithOrders = await Promise.all(
      disputes.map(async (dispute) => {
        if (!dispute.orderId) {
          return dispute;
        }
        
        try {
          // Handle both ObjectId and populated object cases
          let orderId;
          
          // Check if it's already a populated order object with products
          if (dispute.orderId && typeof dispute.orderId === 'object' && Array.isArray(dispute.orderId.products)) {
            // Already fully populated, return as is
            return dispute;
          }
          
          // Extract the orderId - with .lean(), ObjectIds are returned as objects with _id property
          if (typeof dispute.orderId === 'object' && dispute.orderId !== null) {
            // Check if it has _id property (from .lean() ObjectId conversion)
            if (dispute.orderId._id) {
              orderId = dispute.orderId._id.toString ? dispute.orderId._id.toString() : String(dispute.orderId._id);
            } else if (dispute.orderId.toString && typeof dispute.orderId.toString === 'function') {
              // It's a Mongoose ObjectId instance, convert to string
              orderId = dispute.orderId.toString();
            } else {
              // Try to get _id from the object
              orderId = String(dispute.orderId._id || dispute.orderId);
            }
          } else {
            // It's already a string or primitive
            orderId = String(dispute.orderId);
          }
          
          // Validate ObjectId format
          if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
            console.warn(`Invalid orderId format for dispute ${dispute._id}: ${orderId}`);
            return dispute;
          }
          
          // Fetch and populate the order
          const order = await Order.findById(orderId)
            .populate("products.productId", "name price images")
            .populate("userId", "name email phone")
            .populate("sellerId", "name email phone")
            .lean();
            
          if (order) {
            dispute.orderId = order;
          } else {
            console.warn(`Order not found for dispute ${dispute._id}: orderId ${orderId}`);
          }
        } catch (err) {
          console.error(`Error populating order for dispute ${dispute._id}:`, err.message || err);
          // Keep the original orderId if populate fails
        }
        
        return dispute;
      })
    );

    const total = await Dispute.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: disputesWithOrders.length,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      disputes: disputesWithOrders
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Seller respond to dispute
 * PUT /api/v1/order/dispute/:disputeId/respond
 */
export const respondToDispute = async (req, res, next) => {
  try {
    const { disputeId } = req.params;
    const { evidence, proposal } = req.body;
    const userId = req.user._id || req.user.id;
    const userRole = getRole(req).role;

    // Only sellers (farmer/supplier) can respond to disputes
    if (userRole !== 'farmer' && userRole !== 'supplier') {
      return next(new ErrorHandler("Only sellers can respond to disputes", 403));
    }

    // Find dispute
    const dispute = await Dispute.findById(disputeId)
      .populate("orderId")
      .populate("buyerId", "name email")
      .populate("sellerId", "name email");
    
    if (!dispute) {
      return next(new ErrorHandler("Dispute not found", 404));
    }

    // Check if user is the seller of this dispute
    if (dispute.sellerId.toString() !== userId.toString()) {
      return next(new ErrorHandler("You don't have permission to respond to this dispute.", 403));
    }

    // Check if dispute is still open
    if (dispute.status !== "open") {
      return next(new ErrorHandler(`Cannot respond to dispute. Current status: "${dispute.status}"`, 400));
    }

    // Validate required fields
    if (!proposal || proposal.trim() === "") {
      return next(new ErrorHandler("Resolution proposal is required", 400));
    }

    // Update dispute with seller response
    dispute.sellerResponse = {
      evidence: evidence || [],
      proposal: proposal.trim(),
      respondedAt: new Date()
    };
    dispute.status = "pending_admin_review";

    // Update order dispute status
    const orderId = dispute.orderId?._id || dispute.orderId?.toString() || dispute.orderId;
    const order = await Order.findById(orderId);
    if (order) {
      order.dispute_status = "pending_admin_review";
      await order.save();
    }

    await dispute.save();

    // Send notification to buyer
    try {
      const { createNotification } = await import("../utils/notifications.js");
      await createNotification(
        dispute.buyerId,
        "buyer",
        "dispute_response",
        "Seller Responded to Dispute",
        `The seller has responded to your dispute for order #${dispute.orderId}. Please review their proposal.`,
        {
          relatedId: dispute._id,
          relatedType: "dispute",
          actionUrl: `/disputes/${dispute._id}`,
          priority: "medium",
          sendEmail: true
        }
      );
    } catch (notifError) {
      console.error("Failed to send dispute response notification:", notifError);
    }

    // Populate dispute for response
    const populatedDispute = await Dispute.findById(dispute._id)
      .populate("orderId")
      .populate("buyerId", "name email")
      .populate("sellerId", "name email")
      .lean();

    res.status(200).json({
      success: true,
      message: "Dispute response submitted successfully",
      dispute: populatedDispute
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin ruling on dispute
 * PUT /api/v1/order/dispute/:disputeId/admin-ruling
 */
export const adminRuling = async (req, res, next) => {
  try {
    const { disputeId } = req.params;
    const { decision, notes } = req.body;
    const adminId = req.user._id || req.user.id;
    const userRole = getRole(req).role;

    // Only admins can make rulings
    if (userRole !== 'admin') {
      return next(new ErrorHandler("Only admins can make dispute rulings", 403));
    }

    // Find dispute
    const dispute = await Dispute.findById(disputeId)
      .populate("orderId")
      .populate("buyerId", "name email")
      .populate("sellerId", "name email");
    
    if (!dispute) {
      return next(new ErrorHandler("Dispute not found", 404));
    }

    // Validate decision
    if (!decision || !["buyer_win", "seller_win"].includes(decision)) {
      return next(new ErrorHandler("Valid decision (buyer_win or seller_win) is required", 400));
    }

    // Update dispute with admin ruling
    dispute.adminRuling = {
      decision,
      notes: notes || "",
      ruledAt: new Date(),
      adminId: adminId
    };
    dispute.status = "closed";
    dispute.resolvedAt = new Date();

    // Update order dispute status
    const orderId = dispute.orderId?._id || dispute.orderId?.toString() || dispute.orderId;
    const order = await Order.findById(orderId);
    if (order) {
      order.dispute_status = "closed";
      await order.save();
    }

    await dispute.save();

    // Send notifications to both parties
    try {
      const { createNotification } = await import("../utils/notifications.js");
      const winner = decision === "buyer_win" ? dispute.buyerId : dispute.sellerId;
      const loser = decision === "buyer_win" ? dispute.sellerId : dispute.buyerId;
      const winnerRole = decision === "buyer_win" ? "buyer" : dispute.sellerRole;
      const loserRole = decision === "buyer_win" ? dispute.sellerRole : "buyer";

      await createNotification(
        winner,
        winnerRole,
        "dispute_resolved",
        "Dispute Resolved in Your Favor",
        `The dispute for order #${dispute.orderId} has been resolved in your favor.`,
        {
          relatedId: dispute._id,
          relatedType: "dispute",
          priority: "high",
          sendEmail: true
        }
      );

      await createNotification(
        loser,
        loserRole,
        "dispute_resolved",
        "Dispute Resolved",
        `The dispute for order #${dispute.orderId} has been resolved.`,
        {
          relatedId: dispute._id,
          relatedType: "dispute",
          priority: "medium",
          sendEmail: true
        }
      );
    } catch (notifError) {
      console.error("Failed to send dispute resolution notifications:", notifError);
    }

    // Populate dispute for response
    const populatedDispute = await Dispute.findById(dispute._id)
      .populate("orderId")
      .populate("buyerId", "name email")
      .populate("sellerId", "name email")
      .populate("adminRuling.adminId", "name email")
      .lean();

    res.status(200).json({
      success: true,
      message: "Dispute resolved successfully",
      dispute: populatedDispute
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Resolve dispute (buyer accepts seller's proposal)
 * PUT /api/v1/order/dispute/:disputeId/resolve
 */
export const resolveDispute = async (req, res, next) => {
  try {
    const { disputeId } = req.params;
    const { action } = req.body; // "accept" or "reject"
    const userId = req.user._id || req.user.id;
    const userRole = getRole(req).role;

    // Only buyers can resolve disputes by accepting/rejecting seller's proposal
    if (userRole !== 'buyer' && userRole !== 'farmer') {
      return next(new ErrorHandler("Only buyers can resolve disputes", 403));
    }

    // Find dispute
    const dispute = await Dispute.findById(disputeId)
      .populate("orderId")
      .populate("buyerId", "name email")
      .populate("sellerId", "name email");
    
    if (!dispute) {
      return next(new ErrorHandler("Dispute not found", 404));
    }

    // Check if user is the buyer of this dispute
    if (dispute.buyerId.toString() !== userId.toString()) {
      return next(new ErrorHandler("You don't have permission to resolve this dispute.", 403));
    }

    // Check if dispute has seller response
    if (!dispute.sellerResponse || !dispute.sellerResponse.proposal) {
      return next(new ErrorHandler("Seller has not responded to this dispute yet", 400));
    }

    // Check if dispute is in pending_admin_review status
    if (dispute.status !== "pending_admin_review") {
      return next(new ErrorHandler(`Cannot resolve dispute. Current status: "${dispute.status}"`, 400));
    }

    if (action === "accept") {
      // Buyer accepts seller's proposal - close dispute
      dispute.buyerAccepted = true;
      dispute.status = "closed";
      dispute.resolvedAt = new Date();

      // Update order dispute status
      const orderId = dispute.orderId?._id || dispute.orderId?.toString() || dispute.orderId;
      const order = await Order.findById(orderId);
      if (order) {
        order.dispute_status = "closed";
        await order.save();
      }

      await dispute.save();

      // Send notification to seller
      try {
        const { createNotification } = await import("../utils/notifications.js");
        await createNotification(
          dispute.sellerId,
          dispute.sellerRole,
          "dispute_resolved",
          "Dispute Resolved",
          `The buyer has accepted your proposal for dispute #${disputeId}.`,
          {
            relatedId: dispute._id,
            relatedType: "dispute",
            priority: "medium",
            sendEmail: true
          }
        );
      } catch (notifError) {
        console.error("Failed to send dispute resolution notification:", notifError);
      }

      res.status(200).json({
        success: true,
        message: "Dispute resolved successfully. Seller's proposal accepted.",
        dispute
      });
    } else if (action === "reject") {
      // Buyer rejects seller's proposal - escalate to admin
      dispute.status = "pending_admin_review";
      await dispute.save();

      res.status(200).json({
        success: true,
        message: "Dispute escalated to admin for review",
        dispute
      });
    } else {
      return next(new ErrorHandler("Invalid action. Must be 'accept' or 'reject'", 400));
    }
  } catch (error) {
    next(error);
  }
};
