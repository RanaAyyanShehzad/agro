import { Order } from "../models/order.js";
import { product } from "../models/products.js";
import ErrorHandler from "../middlewares/error.js";
import jwt from "jsonwebtoken";

// Create a new order
export const createOrder = async (req, res, next) => {
  try {
    const { token } = req.cookies;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.role !== "buyer") {
      return next(new ErrorHandler("Only buyers can create orders", 403));
    }
    
    const { products: orderProducts, shippingAddress, paymentMethod, notes } = req.body;
    
    if (!orderProducts || !Array.isArray(orderProducts) || orderProducts.length === 0) {
      return next(new ErrorHandler("No products provided for order", 400));
    }
    
    if (!shippingAddress) {
      return next(new ErrorHandler("Shipping address is required", 400));
    }
    
    // Validate products and calculate total price
    let totalPrice = 0;
    const validatedProducts = [];
    
    for (const item of orderProducts) {
      const productDoc = await product.findById(item.productId);
      
      if (!productDoc) {
        return next(new ErrorHandler(`Product ${item.productId} not found`, 404));
      }
      
      if (!productDoc.isAvailable) {
        return next(new ErrorHandler(`Product ${productDoc.name} is not available`, 400));
      }
      
      if (item.quantity > productDoc.quantity) {
        return next(new ErrorHandler(`Insufficient quantity for ${productDoc.name}`, 400));
      }
      
      const itemTotal = productDoc.price * item.quantity;
      totalPrice += itemTotal;
      
      validatedProducts.push({
        productId: productDoc._id,
        name: productDoc.name,
        price: productDoc.price,
        quantity: item.quantity,
        supplier: productDoc.upLoadedBy
      });
    }
    
    // Create the order
    const order = await Order.create({
      buyerId: req.user._id,
      products: validatedProducts,
      totalPrice,
      shippingAddress,
      paymentMethod: paymentMethod || 'cash',
      notes
    });
    
    // Update product quantities
    for (const item of validatedProducts) {
      await product.findByIdAndUpdate(
        item.productId,
        { $inc: { quantity: -item.quantity } }
      );
    }
    
    res.status(201).json({
      success: true,
      message: "Order created successfully",
      order
    });
  } catch (error) {
    next(error);
  }
};

// Get all orders for buyer
export const getMyOrders = async (req, res, next) => {
  try {
    const { token } = req.cookies;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.role !== "buyer") {
      return next(new ErrorHandler("Access denied", 403));
    }
    
    const orders = await Order.find({ buyerId: req.user._id }).sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      orders
    });
  } catch (error) {
    next(error);
  }
};

// Get specific order by ID
export const getOrderById = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findById(orderId);
    
    if (!order) {
      return next(new ErrorHandler("Order not found", 404));
    }
    
    // Security check: only the buyer who created the order or the supplier of products can view
    const { token } = req.cookies;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.role === "buyer") {
      if (order.buyerId.toString() !== req.user._id.toString()) {
        return next(new ErrorHandler("You can only view your own orders", 403));
      }
    } else if (decoded.role === "farmer" || decoded.role === "supplier") {
      // Check if supplier has products in this order
      const hasSupplierProducts = order.products.some(
        item => item.supplier.userID.toString() === req.user._id.toString() && 
                item.supplier.role === decoded.role
      );
      
      if (!hasSupplierProducts) {
        return next(new ErrorHandler("You can only view orders containing your products", 403));
      }
    } else {
      return next(new ErrorHandler("Access denied", 403));
    }
    
    res.status(200).json({
      success: true,
      order
    });
  } catch (error) {
    next(error);
  }
};

// Cancel an order
export const cancelOrder = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findById(orderId);
    
    if (!order) {
      return next(new ErrorHandler("Order not found", 404));
    }
    
    const { token } = req.cookies;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.role !== "buyer" || order.buyerId.toString() !== req.user._id.toString()) {
      return next(new ErrorHandler("You can only cancel your own orders", 403));
    }
    
    if (order.status === 'delivered' || order.status === 'cancelled') {
      return next(new ErrorHandler(`Cannot cancel order in ${order.status} status`, 400));
    }
    
    order.status = 'cancelled';
    await order.save();
    
    // Restore product quantities
    for (const item of order.products) {
      await product.findByIdAndUpdate(
        item.productId,
        { $inc: { quantity: item.quantity } }
      );
    }
    
    res.status(200).json({
      success: true,
      message: "Order cancelled successfully",
      order
    });
  } catch (error) {
    next(error);
  }
};

// Update order status (for suppliers/farmers)
export const updateOrderStatus = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    
    if (!['processing', 'shipped', 'delivered'].includes(status)) {
      return next(new ErrorHandler("Invalid status value", 400));
    }
    
    const order = await Order.findById(orderId);
    
    if (!order) {
      return next(new ErrorHandler("Order not found", 404));
    }
    
    if (order.status === 'cancelled') {
      return next(new ErrorHandler("Cannot update cancelled order", 400));
    }
    
    const { token } = req.cookies;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.role !== "farmer" && decoded.role !== "supplier") {
      return next(new ErrorHandler("Only suppliers/farmers can update order status", 403));
    }
    
    // Check if supplier has products in this order
    const hasSupplierProducts = order.products.some(
      item => item.supplier.userID.toString() === req.user._id.toString() && 
              item.supplier.role === decoded.role
    );
    
    if (!hasSupplierProducts) {
      return next(new ErrorHandler("You can only update orders containing your products", 403));
    }
    
    order.status = status;
    await order.save();
    
    res.status(200).json({
      success: true,
      message: `Order status updated to ${status}`,
      order
    });
  } catch (error) {
    next(error);
  }
};

// Get orders for a supplier/farmer
export const getSupplierOrders = async (req, res, next) => {
  try {
    const { token } = req.cookies;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.role !== "farmer" && decoded.role !== "supplier") {
      return next(new ErrorHandler("Access denied", 403));
    }
    
    // Find orders containing products from this supplier/farmer
    const orders = await Order.find({
      "products.supplier.userID": req.user._id,
      "products.supplier.role": decoded.role
    }).sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      orders
    });
  } catch (error) {
    next(error);
  }
};

// Get all orders (admin only)
export const getAllOrders = async (req, res, next) => {
  try {
    // const { token } = req.cookies;
    // const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // if (decoded.role !== "admin") {
    //   return next(new ErrorHandler("Only admins can access all orders", 403));
    // }
    
    const orders = await Order.find().sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      ordersCount: orders.length,
      orders
    });
  } catch (error) {
    next(error);
  }
};