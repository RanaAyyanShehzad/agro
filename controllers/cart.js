import { Cart } from "../models/cart.js";
import { product } from "../models/products.js";
import ErrorHandler from "../middlewares/error.js";
import jwt from "jsonwebtoken";
import {updateCartExpiration} from "../utils/cartUtils.js";

// Add or update an item in cart
export const addToCart = async (req, res, next) => {
  try {
    const { productId, quantity } = req.body;
    const userId = req.user._id;

    if (!productId || !quantity || quantity <= 0) {
      return next(new ErrorHandler("Product ID and valid quantity are required", 400));
    }

    const productDoc = await product.findById(productId);
    if (!productDoc) return next(new ErrorHandler("Product not found", 404));
    if (!productDoc.isAvailable) return next(new ErrorHandler("Product is not available", 400));
    if (quantity > productDoc.quantity) {
      return next(new ErrorHandler(`Only ${productDoc.quantity} units available`, 400));
    }

    // Prevent farmer from adding their own product
    const uploaderId = productDoc.upLoadedBy.userID;
    const uploaderRole = productDoc.upLoadedBy.role;
    const { token } = req.cookies;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role === "farmer" &&
        uploaderId.toString() === userId.toString() &&
        uploaderRole === "farmer") {
      return next(new ErrorHandler("You cannot add your own product to cart", 403));
    }

    if (decoded.role === "supplier") {
      return next(new ErrorHandler("Suppliers are not allowed to order", 403));
    }

    // Find or create the cart
    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = await Cart.create({
        userId,
        userRole: decoded.role,
        products: [{ productId, quantity }],
        totalPrice: productDoc.price * quantity,
        expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
      });
    } else {
      const index = cart.products.findIndex(
        item => item.productId.toString() === productId
      );

      if (index > -1) {
        const newQuantity = cart.products[index].quantity + quantity;
        if (newQuantity > productDoc.quantity) {
          return next(new ErrorHandler(`Only ${productDoc.quantity - cart.products[index].quantity} more units available`, 400));
        }
        cart.products[index].quantity = newQuantity;
      } else {
        cart.products.push({ productId, quantity });
      }

      await updateCartExpiration(cart);
      await cart.save();
    }

    await cart.populate("products.productId");
    calculateCartTotals(cart);
    await cart.save();

    res.status(200).json({
      success: true,
      message: "Item added to cart",
      cart,
      expiresAt: cart.expiresAt
    });
  } catch (err) {
    next(err);
  }
};

// Get current user's cart
export const getCart = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ userId: req.user._id }).populate("products.productId");
    
    if (!cart) {
      return res.status(200).json({ 
        success: true, 
        cart: { 
          userId: req.user._id,
          products: [],
          totalPrice: 0 
        } 
      });
    }

    // Verify if all products in cart are still available
    let cartUpdated = false;

    // ... existing product verification code ...

    if (cartUpdated) {
      calculateCartTotals(cart);
      
      // ADD THIS: Update cart expiration
      await updateCartExpiration(cart);
      
      await cart.save();
    } else {
      // Even if no product changes, still update the lastActivity time
      cart.lastActivity = new Date();
      await cart.save();
    }

    res.status(200).json({ 
      success: true, 
      cart,
      // ADD THIS: Include expiration in response
      expiresAt: cart.expiresAt
    });
  } catch (err) {
    next(err);
  }
};

// Remove an item from cart
export const removeFromCart = async (req, res, next) => {
  try {
    const { id } = req.params;
    const cart = await Cart.findOne({ userId: req.user._id }).populate("products.productId");
    
    if (!cart) {
      return next(new ErrorHandler("Cart not found", 404));
    }

    // Check if item exists in cart
    const itemIndex = cart.products.findIndex(
      item => item._id.toString() === id
    );

    if (itemIndex === -1) {
      return next(new ErrorHandler("Item not found in cart", 404));
    }

    // Remove the item
    cart.products.splice(itemIndex, 1);
    
    // Recalculate cart totals
    calculateCartTotals(cart);

    // ADD THIS: Update cart expiration
    await updateCartExpiration(cart);
    
    await cart.save();

    res.status(200).json({ 
      success: true, 
      message: "Item removed from cart",
      cart,
      // ADD THIS: Include expiration in response
      expiresAt: cart.expiresAt 
    });
  } catch (err) {
    next(err);
  }
};

// Clear the whole cart
export const clearCart = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ userId: req.user._id }).populate("products.productId");
    
    if (!cart) {
      return res.status(200).json({ 
        success: true, 
        message: "Cart is already empty" 
      });
    }

    // For clearCart, we usually delete the entire cart document
    // so no need to update expiration since it's being removed
    await Cart.findOneAndDelete({ userId: req.user._id }).populate("products.productId");
    
    res.status(200).json({ 
      success: true, 
      message: "Cart cleared successfully" 
    });
  } catch (err) {
    next(err);
  }
};

// Update quantity of a product in cart
export const updateCartItem = async (req, res, next) => {
  try {
    const { productId, quantity } = req.body;
    
    if (!quantity || quantity <= 0) {
      return next(new ErrorHandler("Valid quantity is required", 400));
    }

    const cart = await Cart.findOne({ userId: req.user._id }).populate("products.productId");
    
    if (!cart) {
      return next(new ErrorHandler("Cart not found", 404));
    }

    const itemIndex = cart.products.findIndex(
      item => item.productId.toString() === productId
    );

    if (itemIndex === -1) {
      return next(new ErrorHandler("Item not found in cart", 404));
    }

    // Verify product availability and quantity
    const productDoc = await product.findById(productId);
    
    if (!productDoc) {
      return next(new ErrorHandler("Product no longer exists", 404));
    }

    if (!productDoc.isAvailable) {
      return next(new ErrorHandler("Product is no longer available", 400));
    }

    if (quantity > productDoc.quantity) {
      return next(new ErrorHandler(`Only ${productDoc.quantity} units available for this product`, 400));
    }

    // Update the quantity
    cart.products[itemIndex].quantity = quantity;
    
    // Update price in case it changed
    if (cart.products[itemIndex].price !== productDoc.price) {
      cart.products[itemIndex].price = productDoc.price;
    }

    // Recalculate cart totals
    calculateCartTotals(cart);

    await updateCartExpiration(cart);
    await cart.save();
    
    res.status(200).json({ 
      success: true, 
      message: "Cart item updated successfully",
      cart,
      expiresAt: cart.expiresAt // Include expiration time
    });
  } catch (err) {
    next(err);
  }
};

// Get cart summary (item count and total price)
export const getCartSummary = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ userId: req.user._id }).populate("products.productId");
    
    if (!cart) {
      return res.status(200).json({ 
        success: true, 
        summary: { 
          totalItems: 0, 
          totalPrice: 0 
        } 
      });
    }

    // Just viewing the cart summary should extend activity time
    cart.lastActivity = new Date();
    await cart.save();

    // Calculate total items since it's not in the schema
    const totalItems = cart.products.reduce((total, item) => total + item.quantity, 0);

    res.status(200).json({
      success: true,
      summary: {
        totalItems: totalItems,
        totalPrice: cart.totalPrice || 0,
        // ADD THIS: Include expiration info
        expiresAt: cart.expiresAt,
        // Optional: Calculate time remaining
        timeRemaining: Math.floor((cart.expiresAt - new Date()) / (1000 * 60 * 60 * 24)) // days remaining
      }
    });
  } catch (err) {
    next(err);
  }
};
export const getCartExpiration = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ userId: req.user._id }).populate("products.productId");
    
    if (!cart) {
      return res.status(200).json({
        success: true,
        message: "No active cart found"
      });
    }
    
    // Calculate time remaining in milliseconds
    const timeRemaining = cart.expiresAt - new Date();
    
    // Convert to days, hours, minutes
    const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
    
    res.status(200).json({
      success: true,
      expiration: {
        expiresAt: cart.expiresAt,
        lastActivity: cart.lastActivity,
        timeRemaining: {
          days,
          hours,
          minutes,
          total: timeRemaining // total milliseconds remaining
        }
      }
    });
  } catch (err) {
    next(err);
  }
};

// Helper function to calculate cart totals
const calculateCartTotals = (cart) => {
  cart.totalPrice = cart.products.reduce((total, item) => {
    if (item.productId && item.productId.price) {
      return total + (item.productId.price * item.quantity);
    }
    return total;
  }, 0);
};


// // Calculate cart totals helper function
// const calculateCartTotals = (cart) => {
//   cart.totalItems = cart.products.reduce((total, item) => total + item.quantity, 0);
//   cart.totalPrice = cart.products.reduce((total, item) => total + (item.price * item.quantity), 0);
// };