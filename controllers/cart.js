import { Cart } from "../models/cart.js";
import { product } from "../models/products.js";
import ErrorHandler from "../middlewares/error.js";
import jwt from "jsonwebtoken";
import { updateCartExpiration } from "../utils/cartUtils.js";
import { handleZeroQuantity } from "../utils/features.js";

// ---------------------- ADD TO CART ----------------------
export const addToCart = async (req, res, next) => {
  try {
    const { productId, quantity } = req.body;
    const userId = req.user._id;

    if (!productId || !quantity || quantity <= 0) {
      return next(new ErrorHandler("Product ID and valid quantity are required", 400));
    }

    const productDoc = await product.findById(productId);
    if (!productDoc) return next(new ErrorHandler("Product not found", 404));
    if (productDoc.isDeleted || !productDoc.isActive) return next(new ErrorHandler("Product is not available", 400));
    if (!productDoc.isAvailable) return next(new ErrorHandler("Product is not available", 400));

    // Check availability but don't deduct quantity yet (will be deducted when order is placed)
    if (quantity > productDoc.quantity) {
      return next(new ErrorHandler(`Only ${productDoc.quantity} units available`, 400));
    }

    // Prevent farmer from buying their own product
    const uploaderId = productDoc.upLoadedBy.userID;
    const uploaderRole = productDoc.upLoadedBy.role;

    const decoded = jwt.verify(req.cookies.token, process.env.JWT_SECRET);

    if (
      decoded.role === "farmer" &&
      uploaderRole === "farmer" &&
      uploaderId.toString() === userId.toString()
    ) {
      return next(new ErrorHandler("You cannot add your own product to cart", 403));
    }

    if (decoded.role === "supplier") {
      return next(new ErrorHandler("Suppliers are not allowed to order", 403));
    }

    // Check if cart exists
    let cart = await Cart.findOne({ userId });

    if (!cart) {
      // Create new cart
      cart = await Cart.create({
        userId,
        userRole: decoded.role,
        products: [{ productId, quantity }],
        totalPrice: productDoc.price * quantity,
        expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
      });
    } else {
      // Add/update existing item
      const index = cart.products.findIndex(
        (item) => item.productId.toString() === productId
      );

      if (index > -1) {
        const newQty = cart.products[index].quantity + quantity;

        if (newQty > productDoc.quantity) {
          return next(
            new ErrorHandler(
              `Only ${productDoc.quantity - cart.products[index].quantity} more units available`,
              400
            )
          );
        }

        cart.products[index].quantity = newQty;
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
      expiresAt: cart.expiresAt,
    });
  } catch (err) {
    next(err);
  }
};

// ---------------------- GET CART ----------------------
export const getCart = async (req, res, next) => {
  try {
    let cart = await Cart.findOne({ userId: req.user._id }).populate(
      "products.productId"
    );

    // If no cart exists → return empty cart
    if (!cart) {
      return res.status(200).json({
        success: true,
        cart: { userId: req.user._id, products: [], totalPrice: 0 },
        expiresAt: null
      });
    }

    let updated = false;

    // 🔥 CLEANUP CART: remove unavailable / deleted / out-of-stock
    cart.products = cart.products.filter((item) => {
      const product = item.productId;

      // Product deleted
      if (!product) {
        updated = true;
        return false;
      }

      // Product unavailable
      if (!product.isAvailable) {
        updated = true;
        return false;
      }

      // Stock zero → remove from cart
      if (product.quantity <= 0) {
        updated = true;
        return false;
      }

      // Adjust quantity if user selected more than available stock
      if (item.quantity > product.quantity) {
        item.quantity = product.quantity;
        updated = true;
      }

      return true;
    });

    // 🔄 If updated → recalculate totals and save
    if (updated) {
      calculateCartTotals(cart);
      await updateCartExpiration(cart);
      await cart.save();
    } 
    else {
      // No change → only update lastActivity
      cart.lastActivity = new Date();
      await cart.save();
    }

    return res.status(200).json({
      success: true,
      cart,
      expiresAt: cart.expiresAt,
    });

  } catch (err) {
    next(err);
  }
};


// ---------------------- REMOVE ITEM ----------------------
export const removeFromCart = async (req, res, next) => {
  try {
    const { id } = req.params;

    const cart = await Cart.findOne({ userId: req.user._id }).populate("products.productId");

    if (!cart) return next(new ErrorHandler("Cart not found", 404));

    const index = cart.products.findIndex((item) => item._id.toString() === id);
    if (index === -1) return next(new ErrorHandler("Item not found", 404));
    
    // No need to restore quantity since we don't deduct when adding to cart
    // Quantity will only be deducted when order is placed
    
    cart.products.splice(index, 1);

    calculateCartTotals(cart);
    await updateCartExpiration(cart);
    await cart.save();

    res.status(200).json({
      success: true,
      message: "Item removed",
      cart,
      expiresAt: cart.expiresAt
    });
  } catch (err) {
    next(err);
  }
};

// ---------------------- CLEAR CART ----------------------
export const clearCart = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ userId: req.user._id }).populate("products.productId");

    // No need to restore quantity since we don't deduct when adding to cart
    // Quantity will only be deducted when order is placed

    await Cart.findOneAndDelete({ userId: req.user._id });

    res.status(200).json({
      success: true,
      message: "Cart cleared successfully"
    });
  } catch (err) {
    next(err);
  }
};

// ---------------------- UPDATE ITEM QUANTITY ----------------------
export const updateCartItem = async (req, res, next) => {
  try {
    const { productId, quantity } = req.body;

    const cart = await Cart.findOne({ userId: req.user._id });
    if (!cart) return next(new ErrorHandler("Cart not found", 404));

    const index = cart.products.findIndex(
      (item) => item.productId.toString() === productId
    );

    if (index === -1) {
      return next(new ErrorHandler("Product not found in cart", 404));
    }

   

    const productDoc = await product.findById(productId);
    if (!productDoc) return next(new ErrorHandler("Product not found", 404));

    // Check availability but don't deduct quantity yet (will be deducted when order is placed)
    const oldQty = cart.products[index].quantity;     // current qty in cart
    const difference = quantity - oldQty;             // calculate change

    if (difference > 0) {
      // user increased quantity → check if available
      if (difference > productDoc.quantity) {
        return next(
          new ErrorHandler(`Only ${productDoc.quantity} more available`, 400)
        );
      }
    }

    // update cart quantity
    cart.products[index].quantity = quantity;

    // Recalculate totals
    await cart.populate("products.productId");
    calculateCartTotals(cart);
    
    cart.expirationTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // extend validity
    await cart.save();

    res.status(200).json({
      success: true,
      message: "Cart updated successfully",
      cart,
    });

  } catch (err) {
    next(err);
  }
};


// ---------------------- CART SUMMARY ----------------------
export const getCartSummary = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ userId: req.user._id }).populate("products.productId");

    if (!cart) {
      return res.status(200).json({
        success: true,
        summary: { totalItems: 0, totalPrice: 0 }
      });
    }

    cart.lastActivity = new Date();
    await cart.save();

    const totalItems = cart.products.reduce((sum, i) => sum + i.quantity, 0);

    res.status(200).json({
      success: true,
      summary: {
        totalItems,
        totalPrice: cart.totalPrice,
        expiresAt: cart.expiresAt
      }
    });
  } catch (err) {
    next(err);
  }
};

// ---------------------- GET CART EXPIRATION ----------------------
export const getCartExpiration = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ userId: req.user._id });

    if (!cart) {
      return res.status(200).json({ success: true, message: "No active cart" });
    }

    const timeRemaining = cart.expiresAt - new Date();

    const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeRemaining % 86400000) / 3600000);
    const minutes = Math.floor((timeRemaining % 3600000) / 60000);

    res.status(200).json({
      success: true,
      expiration: {
        expiresAt: cart.expiresAt,
        lastActivity: cart.lastActivity,
        timeRemaining: { days, hours, minutes, total: timeRemaining }
      }
    });
  } catch (err) {
    next(err);
  }
};

// ---------------------- CALCULATE TOTALS ----------------------
const calculateCartTotals = (cart) => {
  cart.totalPrice = cart.products.reduce((sum, item) => {
    return sum + (item.productId.price * item.quantity);
  }, 0);
};
