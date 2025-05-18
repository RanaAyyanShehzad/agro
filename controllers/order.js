import { Order } from '../models/order.js';
import { Cart } from '../models/cart.js';
import jwt from "jsonwebtoken";
import ErrorHandler from '../middlewares/error.js';
import { buyer } from '../models/buyer.js';
import { farmer } from '../models/farmer.js';
import { sendEmail } from "../utils/sendEmail.js";
import { supplier } from '../models/supplier.js';
import { product } from '../models/products.js'; // Import the product model

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

    const cart = await Cart.findOne({ _id: cartId, userId });

    if (!cart) {
      return next(new ErrorHandler("Cart not found or doesn't belong to you", 404));
    }

    if (cart.products.length === 0) {
      return next(new ErrorHandler("Cannot create order with empty cart", 400));
    }

    let user;
    if (decode === "buyer") {
      user = await buyer.findById(userId);
    } else if (decode === "farmer") {
      user = await farmer.findById(userId);
    }

    const orderData = {
      userId: cart.userId,
      userRole: cart.userRole,
      products: cart.products,
      totalPrice: cart.totalPrice,
      cartId: cart._id,
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
      notes
    };

    let savedOrder = null;
    let cartDeleted = false;

    try {
      const order = new Order(orderData);
      savedOrder = await order.save();

      const uniqueSuppliers = new Map();

      for (const productItem of cart.products) {
        const { productId } = productItem;

        // Fetch product from DB
        const dbProduct = await product.findById(productId);
        if (dbProduct) {
          if (dbProduct.quantity === 0) {
            await product.findByIdAndDelete(productId);
          }
        }

        const { userID, role } = productItem.supplier;
        const key = `${role}_${userID.toString()}`;

        if (!uniqueSuppliers.has(key)) {
          let supplierUser = null;

          if (role === "supplier") {
            supplierUser = await supplier.findById(userID);
          } else if (role === "farmer") {
            supplierUser = await farmer.findById(userID);
          }

          if (supplierUser?.email) {
            uniqueSuppliers.set(key, supplierUser.email);
          }
        }
      }

      for (const [_, email] of uniqueSuppliers) {
        await sendEmail(email, "New Order Received", "Your product(s) were ordered. Check your dashboard.");
      }

      await Cart.findByIdAndDelete(cartId);
      cartDeleted = true;

      await sendEmail(user.email, "Order Placed", "Your order has been successfully placed.");

      return res.status(201).json({
        success: true,
        message: "Order created successfully",
        order: savedOrder
      });

    } catch (innerError) {
      if (savedOrder && !cartDeleted) {
        await Order.findByIdAndDelete(savedOrder._id);
      }
      throw innerError;
    }

  } catch (error) {
    next(error);
  }
};



// Get all orders for a user
export const getUserOrders = async (req, res,next) => {
  try {
    const userId = req.user.id; // Assuming user ID comes from auth middleware
    
    const orders = await Order.find({ userId })
      .sort({ createdAt: -1 }); // Sort by newest first
    
    return res.status(200).json({
      success: true,
      count: orders.length,
      orders
    });
    
  } catch (error) {
    next(error);
  }
};

// Get a specific order by ID
export const getOrderById = async (req, res,next) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id; // Assuming user ID comes from auth middleware
    const order = await Order.findOne({ 
      _id: orderId,
      userId
    });
    
    if (!order) {
      return next(new ErrorHandler("Order not found",404));
    }
    
    return res.status(200).json({
      success: true,
      order
    });
    
  } catch (error) {
    next(error); 
  }
};

// Update order status (admin or farmer only)
export const updateOrderStatus = async (req, res,next) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    
    // Validate the user has permission (admin or supplier of products)
    // This logic would depend on your auth system
    const userRole = getRole(req).role;
    const userId = req.user.id;
    
    let order;
    
    if (userRole === 'admin') {
      // Admin can update any order
      order = await Order.findById(orderId);
    } else if (userRole === 'farmer' || userRole==='supplier') {
      // Farmer can only update orders containing their products
      order = await Order.findOne({ 
        _id: orderId,
        "products.supplier.userID": userId
      });
    } else {
      return  next(new ErrorHandler("You don't have permission to update this order",403));
    }
    
    if (!order) {
      return next(new ErrorHandler("Order not found or you don't have permission to update it", 404));

    }
    
    // Update the order status
    order.status = status;
    
    // If status is delivered, update delivery info
    if (status === 'delivered') {
      order.deliveryInfo.actualDeliveryDate = new Date();
    }
    
    await order.save();
    
    return res.status(200).json({
      success: true,
      message: "Order status updated successfully",
      order
    });
    
  } catch (error) {
    next(error);
  }
};

// Update payment info
// export const updatePaymentInfo = async (req, res,next) => {
//   try {
//     const { orderId } = req.params;
//     const { paymentStatus, transactionId } = req.body;
//     const userId = req.user.id; // Assuming user ID comes from auth middleware
    
//     const order = await Order.findOne({ 
//       _id: orderId,
//       userId // Ensure the order belongs to the user
//     });
    
//     if (!order) {
//       return next(new ErrorHandler("order not found",404));
//     }
    
//     // Update payment information
//     order.paymentInfo.status = paymentStatus;
//     if (transactionId) {
//       order.paymentInfo.transactionId = transactionId;
//     }
    
//     // If payment is completed, update the paidAt timestamp
//     if (paymentStatus === 'completed') {
//       order.paymentInfo.paidAt = new Date();
//     }
    
//     await order.save();
    
//     return res.status(200).json({
//       success: true,
//       message: "Payment information updated successfully",
//       order
//     });
    
//   } catch (error) {
//     next(error);
//   }
// };

// Cancel order
export const cancelOrder = async (req, res,next) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id; // Assuming user ID comes from auth middleware
    
    const order = await Order.findOne({ 
      _id: orderId,
      userId // Ensure the order belongs to the user
    });
    
    if (!order) {
      return next(new ErrorHandler("Order not found",404));
    }
    
    // Can only cancel if order is pending or processing
    if (order.status !== 'pending' && order.status !== 'processing') {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel order in '${order.status}' status`
      });
    }
    
    // Update order status to canceled
    order.status = 'canceled';
    await order.save();
    
    return res.status(200).json({
      success: true,
      message: "Order canceled successfully",
      order
    });
    
  } catch (error) {
    next(error);
  }
};

// Get orders for a specific supplier (farmer/supplier only)
export const getSupplierOrders = async (req, res, next) => {
  try {
    const supplierId = req.user.id;

    // Step 1: Find all orders where any product belongs to this supplier
    const orders = await Order.find({
      "products.supplier.userID": supplierId
    }).sort({ createdAt: -1 });

    // Step 2: Filter products inside each order
    const filteredOrders = orders.map(order => {
      const supplierProducts = order.products.filter(
        p => p.supplier.userID.toString() === supplierId
      );

      return {
        ...order.toObject(), // convert Mongoose doc to plain object
        products: supplierProducts
      };
    });

    return res.status(200).json({
      success: true,
      count: filteredOrders.length,
      orders: filteredOrders
    });

  } catch (error) {
    next(error);
  }
};


// Admin: Get all orders with filtering options
export const getAllOrders = async (req, res,next) => {
  try {
    // Check if user is admin
    if (getRole(req).role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Not authorized to access all orders"
      });
    }
    
    const { status, paymentStatus, startDate, endDate, page = 1, limit = 10 } = req.query;
    
    // Build filter object
    const filter = {};
    
    if (status) filter.status = status;
    if (paymentStatus) filter["paymentInfo.status"] = paymentStatus;
    
    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    
    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get orders with pagination
    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get total count for pagination
    const totalOrders = await Order.countDocuments(filter);
    
    return res.status(200).json({
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