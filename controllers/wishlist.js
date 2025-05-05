import { Wishlist } from "../models/wishlist.js";
import { product } from "../models/products.js";
import { Cart } from "../models/cart.js";
import ErrorHandler from "../middlewares/error.js";
import jwt, { decode } from "jsonwebtoken";
import { updateCartExpiration } from "../utils/cartUtils.js";

// Add to wishlist
export const addToWishlist = async (req, res, next) => {
  try {
    const { productId } = req.body;
    const userId = req.user._id;

    if (!productId) {
      return next(new ErrorHandler("Product ID is required", 400));
    }

    const productDoc = await product.findById(productId);
    if (!productDoc) {
      return next(new ErrorHandler("Product not found", 404));
    }

    // Check if the user is a farmer trying to add their own product
    const { token } = req.cookies;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role === "farmer" && 
        productDoc.upLoadedBy.userID.toString() === userId.toString() &&
        productDoc.upLoadedBy.role === "farmer") {
      return next(new ErrorHandler("You cannot add your own product to wishlist", 403));
    }

    let wishlist = await Wishlist.findOne({ userId });

    if (!wishlist) {
      wishlist = await Wishlist.create({
        userId,
        userRole: decoded.role,
        products: [{
          productId: productDoc._id,
          name: productDoc.name,
          price: productDoc.price,
          supplier: {
            userID: productDoc.upLoadedBy.userID,
            role: productDoc.upLoadedBy.role,
            name: productDoc.upLoadedBy.name
          }
        }]
      });
    } else {
      // Check if product already in wishlist
      const itemExists = wishlist.products.some(
        item => item.productId.toString() === productId.toString()
      );

      if (itemExists) {
        return res.status(200).json({
          success: true,
          message: "Product already in wishlist"
        });
      }

      // Add product to wishlist
      wishlist.products.push({
        productId: productDoc._id,
        name: productDoc.name,
        price: productDoc.price,
        supplier: {
          userID: productDoc.upLoadedBy.userID,
          role: productDoc.upLoadedBy.role,
          name: productDoc.upLoadedBy.name
        }
      });

      await wishlist.save();
    }

    res.status(200).json({
      success: true,
      message: "Product added to wishlist",
      wishlist
    });
  } catch (err) {
    next(err);
  }
};

// Get user's wishlist
export const getWishlist = async (req, res, next) => {
  try {
    const wishlist = await Wishlist.findOne({ userId: req.user._id });

    if (!wishlist) {
      return res.status(200).json({
        success: true,
        wishlist: {
          userId: req.user._id,
          products: []
        }
      });
    }

    // Update product prices and availability
    let wishlistUpdated = false;
    for (let i = wishlist.products.length - 1; i >= 0; i--) {
      const productDoc = await product.findById(wishlist.products[i].productId);
      
      if (!productDoc) {
        // Remove if product no longer exists
        wishlist.products.splice(i, 1);
        wishlistUpdated = true;
        continue;
      }
      
      // Update price if it has changed
      if (wishlist.products[i].price !== productDoc.price) {
        wishlist.products[i].price = productDoc.price;
        wishlistUpdated = true;
      }
    }

    if (wishlistUpdated) {
      await wishlist.save();
    }

    res.status(200).json({
      success: true,
      wishlist
    });
  } catch (err) {
    next(err);
  }
};

// Remove from wishlist
export const removeFromWishlist = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const wishlist = await Wishlist.findOne({ userId: req.user._id });

    if (!wishlist) {
      return next(new ErrorHandler("Wishlist not found", 404));
    }

    // Find the item index
    const itemIndex = wishlist.products.findIndex(
      item => item.productId.toString() === productId
    );

    if (itemIndex === -1) {
      return next(new ErrorHandler("Product not found in wishlist", 404));
    }

    // Remove item
    wishlist.products.splice(itemIndex, 1);
    await wishlist.save();

    res.status(200).json({
      success: true,
      message: "Product removed from wishlist",
      wishlist
    });
  } catch (err) {
    next(err);
  }
};

// Clear wishlist
export const clearWishlist = async (req, res, next) => {
  try {
    const wishlist = await Wishlist.findOne({ userId: req.user._id });

    if (!wishlist) {
      return res.status(200).json({
        success: true,
        message: "Wishlist is already empty"
      });
    }

    await Wishlist.findOneAndDelete({ userId: req.user._id });

    res.status(200).json({
      success: true,
      message: "Wishlist cleared successfully"
    });
  } catch (err) {
    next(err);
  }
};
// Move item from wishlist to cart
export const moveToCart = async (req, res, next) => {
  try {
    const { productId, quantity = 1 } = req.body;
    const userId = req.user._id;

    if (!productId) {
      return next(new ErrorHandler("Product ID is required", 400));
    }

    // Find the wishlist
    const wishlist = await Wishlist.findOne({ userId });
    if (!wishlist) {
      return next(new ErrorHandler("Wishlist not found", 404));
    }

    // Check if product exists in wishlist
    const itemIndex = wishlist.products.findIndex(
      item => item.productId.toString() === productId
    );

    if (itemIndex === -1) {
      return next(new ErrorHandler("Product not found in wishlist", 404));
    }

    // Get product details
    const productDoc = await product.findById(productId);
    if (!productDoc) {
      // Remove from wishlist if product no longer exists
      wishlist.products.splice(itemIndex, 1);
      await wishlist.save();
      return next(new ErrorHandler("Product no longer exists", 404));
    }

    if (!productDoc.isAvailable) {
      return next(new ErrorHandler("Product is not available", 400));
    }

    if (quantity > productDoc.quantity) {
      return next(new ErrorHandler(`Only ${productDoc.quantity} units available for this product`, 400));
    }
    const { token } = req.cookies;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Add to cart
    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = await Cart.create({
        userId,
        userRole: decoded.role,
        products: [{
          productId: productDoc._id,
          name: productDoc.name,
          price: productDoc.price,
          quantity,
          supplier: {
            userID: productDoc.upLoadedBy.userID,
            role: productDoc.upLoadedBy.role,
            name: productDoc.upLoadedBy.name
          }
        }],
        totalPrice: productDoc.price * quantity,
        expiresAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000)
      });
    } else {
      // Check if product already in cart
      const cartItemIndex = cart.products.findIndex(
        item => item.productId.toString() === productId
      );

      if (cartItemIndex > -1) {
        // Update quantity
        const newQuantity = cart.products[cartItemIndex].quantity + quantity;
        
        if (newQuantity > productDoc.quantity) {
          return next(new ErrorHandler(`Cannot add ${quantity} more units. Only ${productDoc.quantity - cart.products[cartItemIndex].quantity} more units available.`, 400));
        }
        
        cart.products[cartItemIndex].quantity = newQuantity;
      } else {
        // Add new item to cart
        cart.products.push({
          productId: productDoc._id,
          name: productDoc.name,
          price: productDoc.price,
          quantity,
          supplier: {
            userID: productDoc.upLoadedBy.userID,
            role: productDoc.upLoadedBy.role,
            name: productDoc.upLoadedBy.name
          }
        });
      }

      // Calculate cart totals
      cart.totalPrice = cart.products.reduce((total, item) => total + (item.price * item.quantity), 0);
      await updateCartExpiration(cart);
      await cart.save();
    }

    // Remove from wishlist (optional - can keep in wishlist if desired)
    // wishlist.products.splice(itemIndex, 1);
    // await wishlist.save();

    res.status(200).json({
      success: true,
      message: "Product moved to cart",
      cart,
      expiresAt: cart.expiresAt
    });
  } catch (err) {
    next(err);
  }
};