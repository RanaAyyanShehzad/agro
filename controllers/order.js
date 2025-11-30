import { Order } from '../models/order.js';
import { OrderMultiVendor } from '../models/orderMultiVendor.js';
import { Cart } from '../models/cart.js';
import jwt from "jsonwebtoken";
import ErrorHandler from '../middlewares/error.js';
import { buyer } from '../models/buyer.js';
import { farmer } from '../models/farmer.js';
import { sendEmail } from "../utils/sendEmail.js";
import { supplier } from '../models/supplier.js';
import { product } from '../models/products.js';
import { calculateOrderStatus } from '../utils/orderHelpers.js';

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

    // Build products array with farmerId/supplierId and price for OrderMultiVendor
    const productsWithVendorInfo = await Promise.all(
      cart.products.map(async (p) => {
        const dbProduct = await product.findById(p.productId._id);
        if (!dbProduct) {
          throw new ErrorHandler(`Product ${p.productId._id} not found`, 404);
        }

        const { userID, role } = dbProduct.upLoadedBy;
        const productItem = {
          productId: p.productId._id,
          quantity: p.quantity,
          price: dbProduct.price,
          status: "pending", // Changed to pending - seller must accept
          sellerAccepted: null // null = pending, true = accepted, false = rejected
        };

        // Add farmerId or supplierId based on product owner
        if (role === "farmer") {
          productItem.farmerId = userID;
          productItem.supplierId = null;
        } else if (role === "supplier") {
          productItem.supplierId = userID;
          productItem.farmerId = null;
        }

        return productItem;
      })
    );

    // Only buyers and farmers can place orders in multi-vendor system
    if (decode === "supplier") {
      return next(new ErrorHandler("Suppliers cannot place orders", 403));
    }

    const orderData = {
      customerId: userId,
      customerModel: decode === "buyer" ? "Buyer" : "Farmer",
      products: productsWithVendorInfo,
      totalPrice: cart.totalPrice,
      cartId: cart._id,
      paymentInfo: { method: paymentMethod, status: "pending" },
      shippingAddress: { street, city, zipCode, phoneNumber },
      notes
    };

    // Set initial order status - products are pending seller acceptance
    orderData.orderStatus = "pending"; // Order is pending until seller accepts

    let savedOrder = null;
    let cartDeleted = false;

    try {
      // Deduct product quantities before creating order
      for (const productItem of cart.products) {
        const dbProduct = await product.findById(productItem.productId);
        if (dbProduct) {
          // Check if enough quantity available
          if (productItem.quantity > dbProduct.quantity) {
            return next(new ErrorHandler(
              `Insufficient quantity for product ${dbProduct.name}. Only ${dbProduct.quantity} available.`,
              400
            ));
          }
          
          // Deduct quantity from product
          dbProduct.quantity -= productItem.quantity;
          if (dbProduct.quantity < 0) dbProduct.quantity = 0;
          
          await dbProduct.save();
          
          // Handle zero quantity - set isAvailable to false or delete
          const { handleZeroQuantity } = await import("../utils/features.js");
          await handleZeroQuantity(dbProduct);
        }
      }

      const order = new OrderMultiVendor(orderData);
      savedOrder = await order.save();

      const uniqueSuppliers = new Map();

      for (const productItem of cart.products) {
        const dbProduct = await product.findById(productItem.productId);
        if (dbProduct) {
          const { userID, role } = dbProduct.upLoadedBy;
          const key = `${role}_${userID.toString()}`;

          if (!uniqueSuppliers.has(key)) {
            const supplierUser = role === "supplier"
              ? await supplier.findById(userID)
              : await farmer.findById(userID);
            if (supplierUser?.email) uniqueSuppliers.set(key, supplierUser.email);
          }
        }
      }

      // Send notifications to all sellers
      const sellerNotifications = new Map();
      
      for (const productItem of savedOrder.products) {
        const dbProduct = await product.findById(productItem.productId);
        if (dbProduct) {
          const { userID, role } = dbProduct.upLoadedBy;
          const key = `${role}_${userID.toString()}`;
          
          if (!sellerNotifications.has(key)) {
            let sellerUser = null;
            if (role === "supplier") {
              sellerUser = await supplier.findById(userID);
            } else if (role === "farmer") {
              sellerUser = await farmer.findById(userID);
            }
            
            if (sellerUser) {
              sellerNotifications.set(key, {
                user: sellerUser,
                role: role
              });
              
              // Send email
              if (sellerUser.email) {
                await sendEmail(
                  sellerUser.email,
                  "New Order Received - Action Required",
                  `Dear ${sellerUser.name},\n\nYou have received a new order #${savedOrder._id}.\n\nPlease accept or reject this order from your dashboard.\n\nThank you!`
                );
              }
              
              // Create notification
              const { createNotification } = await import("../utils/notifications.js");
              await createNotification(
                userID,
                role,
                "order_placed",
                "New Order Received",
                `You have received a new order #${savedOrder._id}. Please accept or reject it.`,
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
        }
      }

      // Populate order with product and vendor information
      await savedOrder.populate({
        path: "products.productId",
        model: "Products",
      });
      await savedOrder.populate({
        path: "products.farmerId",
        select: "name email",
      });
      await savedOrder.populate({
        path: "products.supplierId",
        select: "name email",
      });
      await savedOrder.populate({
        path: "customerId",
        select: "name email phone address",
      });

      await Cart.findByIdAndDelete(cartId);
      cartDeleted = true;

      // Send notification to buyer
      const { createNotification } = await import("../utils/notifications.js");
      await createNotification(
        userId,
        decode,
        "order_placed",
        "Order Placed",
        `Your order #${savedOrder._id} has been placed successfully. Waiting for seller confirmation.`,
        {
          relatedId: savedOrder._id,
          relatedType: "order",
          actionUrl: `/orders/${savedOrder._id}`,
          priority: "medium"
        }
      );
      
      await sendEmail(user.email, "Order Placed", "Your order has been successfully placed. Waiting for seller confirmation.");

      return res.status(201).json({ success: true, message: "Order created successfully", order: savedOrder });
    } catch (innerError) {
      // Restore product quantities if order creation failed
      if (savedOrder && !cartDeleted) {
        try {
          for (const productItem of cart.products) {
            const dbProduct = await product.findById(productItem.productId);
            if (dbProduct) {
              dbProduct.quantity += productItem.quantity;
              dbProduct.isAvailable = true;
              await dbProduct.save();
            }
          }
          await OrderMultiVendor.findByIdAndDelete(savedOrder._id);
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
    
    // Use OrderMultiVendor for buyers/farmers (new orders)
    if (userRole === "buyer" || userRole === "farmer" ) {
      const orders = await OrderMultiVendor.find({ customerId: userId })
        .populate("customerId", "name email phone address")
        .populate("products.productId")
        .populate("products.farmerId", "name email")
        .populate("products.supplierId", "name email")
        .sort({ createdAt: -1 })
        .lean();
      
      return res.status(200).json({ success: true, count: orders.length, orders });
    }
    
    // Fallback to old Order model for farmers (if they have old orders)
    const orders = await Order.find({ userId }).populate("products.productId").sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: orders.length, orders });
  } catch (error) {
    next(error);
  }
};

export const getOrderById = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;
    const userRole = getRole(req).role;
    
    let order = await Order.findById(orderId).populate("products.productId");
    if (!order) return next(new ErrorHandler("Order not found", 404));

    // If user is supplier/farmer, check if they own any products in this order
    if (userRole === 'supplier' || userRole === 'farmer') {
      const supplierProducts = order.products.filter(
        p => p.productId?.upLoadedBy?.userID.toString() === userId
      );
      
      if (supplierProducts.length === 0) {
        return next(new ErrorHandler("Order not found", 404));
      }
      
      // Populate customer information for suppliers/farmers
      let customerInfo = null;
      if (order.userRole === "buyer") {
        const customer = await buyer.findById(order.userId).select("name email phone address");
        customerInfo = customer ? { 
          name: customer.name, 
          email: customer.email, 
          phone: customer.phone,
          address: customer.address 
        } : null;
      } else if (order.userRole === "farmer") {
        const customer = await farmer.findById(order.userId).select("name email phone address");
        customerInfo = customer ? { 
          name: customer.name, 
          email: customer.email, 
          phone: customer.phone,
          address: customer.address 
        } : null;
      }
      
      // Calculate total price for supplier's products only
      const supplierTotalPrice = supplierProducts.reduce((sum, item) => {
        return sum + (item.productId.price * item.quantity);
      }, 0);
      
      return res.status(200).json({ 
        success: true, 
        order: {
          ...order.toObject(),
          products: supplierProducts,
          totalPrice: supplierTotalPrice,
          customer: customerInfo
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

export const updateOrderStatus = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    const userRole = getRole(req).role;
    const userId = req.user.id;

    let order = await Order.findById(orderId).populate("products.productId");
    if (!order) return next(new ErrorHandler("Order not found", 404));

    // Prevent status updates if order is canceled
    if (order.status === 'canceled') {
      return next(new ErrorHandler("Cannot update status of a canceled order", 400));
    }

    const isSupplierProduct = order.products.some(p => p.productId?.upLoadedBy?.userID.toString() === userId);

    if (userRole !== 'admin' && !isSupplierProduct) {
      return next(new ErrorHandler("You don't have permission to update this order", 403));
    }

    const oldStatus = order.status;
    order.status = status;
    
    // Handle shipped status - set shippedAt and expected_delivery_date
    if (status === 'shipped') {
      order.shippedAt = new Date();
      // Set expected delivery date (default: 7 days from now, can be configured)
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() + 7);
      order.expected_delivery_date = expectedDate;
    }
    
    if (status === 'delivered') {
      order.deliveryInfo.actualDeliveryDate = new Date();
      order.deliveredAt = new Date();
    }

    await order.save();

    // Send email notification to customer about status update
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
          delivered: "Your order has been delivered successfully. Thank you for your purchase!",
          canceled: "Your order has been canceled."
        };

        const statusMessage = statusMessages[status] || `Your order status has been updated to ${status}.`;
        const emailSubject = `Order Status Update - ${status.charAt(0).toUpperCase() + status.slice(1)}`;
        const emailText = `Dear ${customer.name},\n\nYour order #${orderId} status has been updated from "${oldStatus}" to "${status}".\n\n${statusMessage}\n\nThank you for shopping with us!`;

        await sendEmail(customer.email, emailSubject, emailText);
      }
    } catch (emailError) {
      // Log email error but don't fail the request
      console.error("Failed to send order status email:", emailError);
    }

    res.status(200).json({ success: true, message: "Order status updated successfully", order });
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

    // Get all orders and filter by vendor's products
    const allOrders = await OrderMultiVendor.find()
      .populate("customerId", "name email phone address")
      .populate("products.productId")
      .populate("products.farmerId", "name email phone")
      .populate("products.supplierId", "name email phone")
      .sort({ createdAt: -1 })
      .lean();

    // Filter orders to only include those with vendor's products
    const filteredOrders = allOrders
      .map(order => {
        // Filter products to only show vendor's products
        const vendorProducts = order.products.filter(product => {
          if (userRole === "farmer" && product.farmerId && product.farmerId._id) {
            return product.farmerId._id.toString() === vendorId;
          }
          if (userRole === "supplier" && product.supplierId && product.supplierId._id) {
            return product.supplierId._id.toString() === vendorId;
          }
          return false;
        });

        // Only include order if it has vendor's products
        if (vendorProducts.length === 0) {
          return null;
        }

        // Calculate total price for vendor's products only
        const vendorTotalPrice = vendorProducts.reduce((sum, item) => {
          return sum + (item.price * item.quantity);
        }, 0);

        return {
          ...order,
          products: vendorProducts,
          totalPrice: vendorTotalPrice,
          customer: order.customerId ? {
            name: order.customerId.name || "N/A",
            email: order.customerId.email || "N/A",
            phone: order.customerId.phone || order.shippingAddress?.phoneNumber || "N/A",
            address: order.customerId.address || `${order.shippingAddress?.street || ""}, ${order.shippingAddress?.city || ""}`.replace(/^,\s*|,\s*$/g, "") || "N/A"
          } : {
            name: "N/A",
            email: "N/A",
            phone: "N/A",
            address: "N/A"
          }
        };
      })
      .filter(order => order !== null);

    res.status(200).json({ 
      success: true, 
      count: filteredOrders.length, 
      orders: filteredOrders 
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
