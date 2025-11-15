import { Order } from '../models/order.js';
import { Cart } from '../models/cart.js';
import jwt from "jsonwebtoken";
import ErrorHandler from '../middlewares/error.js';
import { buyer } from '../models/buyer.js';
import { farmer } from '../models/farmer.js';
import { sendEmail } from "../utils/sendEmail.js";
import { supplier } from '../models/supplier.js';
import { product } from '../models/products.js';

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

    let user = decode === "buyer" ? await buyer.findById(userId) : await farmer.findById(userId);

    const orderData = {
      userId: cart.userId,
      userRole: cart.userRole,
      products: cart.products.map(p => ({ productId: p.productId, quantity: p.quantity })),
      totalPrice: cart.totalPrice,
      cartId: cart._id,
      paymentInfo: { method: paymentMethod, status: "pending" },
      shippingAddress: { street, city, zipCode, phoneNumber },
      notes
    };

    let savedOrder = null;
    let cartDeleted = false;

    try {
      const order = new Order(orderData);
      savedOrder = await order.save();

      const uniqueSuppliers = new Map();

      for (const productItem of cart.products) {
        const dbProduct = await product.findById(productItem.productId);
        if (dbProduct) {
          if (dbProduct.quantity === 0) await product.findByIdAndDelete(productItem.productId);

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

      for (const email of uniqueSuppliers.values()) {
        await sendEmail(email, "New Order Received", "Your product(s) were ordered. Check your dashboard.");
      }

      await Cart.findByIdAndDelete(cartId);
      cartDeleted = true;

      await sendEmail(user.email, "Order Placed", "Your order has been successfully placed.");

      return res.status(201).json({ success: true, message: "Order created successfully", order: savedOrder });
    } catch (innerError) {
      if (savedOrder && !cartDeleted) await Order.findByIdAndDelete(savedOrder._id);
      throw innerError;
    }
  } catch (error) {
    next(error);
  }
};

export const getUserOrders = async (req, res, next) => {
  try {
    const userId = req.user.id;
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
    const order = await Order.findOne({ _id: orderId, userId }).populate("products.productId");
    if (!order) return next(new ErrorHandler("Order not found", 404));
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

    const isSupplierProduct = order.products.some(p => p.productId?.upLoadedBy?.userID.toString() === userId);

    if (userRole !== 'admin' && !isSupplierProduct) {
      return next(new ErrorHandler("You don't have permission to update this order", 403));
    }

    order.status = status;
    if (status === 'delivered') order.deliveryInfo.actualDeliveryDate = new Date();

    await order.save();
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
    await order.save();
    res.status(200).json({ success: true, message: "Order canceled successfully", order });
  } catch (error) {
    next(error);
  }
};

export const getSupplierOrders = async (req, res, next) => {
  try {
    const supplierId = req.user.id;
    const orders = await Order.find().populate("products.productId").sort({ createdAt: -1 });

    const filteredOrders = orders.map(order => {
      const supplierProducts = order.products.filter(
        p => p.productId?.upLoadedBy?.userID.toString() === supplierId
      );
      return { ...order.toObject(), products: supplierProducts };
    }).filter(order => order.products.length > 0);

    res.status(200).json({ success: true, count: filteredOrders.length, orders: filteredOrders });
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
