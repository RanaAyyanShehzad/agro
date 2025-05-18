import { Wishlist } from "../models/wishlist.js";
import { product } from "../models/products.js";
import { Cart } from "../models/cart.js";
import ErrorHandler from "../middlewares/error.js";
import jwt from "jsonwebtoken";
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

    const { token } = req.cookies;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Prevent farmer from adding their own product
    if (
      decoded.role === "farmer" &&
      productDoc.upLoadedBy.userID.toString() === userId.toString() &&
      productDoc.upLoadedBy.role === "farmer"
    ) {
      return next(
        new ErrorHandler("You cannot add your own product to wishlist", 403)
      );
    }

    let wishlist = await Wishlist.findOne({ userId });

    if (!wishlist) {
      wishlist = await Wishlist.create({
        userId,
        userRole: decoded.role,
        products: [{ productId }]
      });
    } else {
      const alreadyExists = wishlist.products.some(
        item => item.productId.toString() === productId
      );

      if (alreadyExists) {
        return res.status(200).json({
          success: true,
          message: "Product already in wishlist"
        });
      }

      wishlist.products.push({ productId });
      await wishlist.save();
    }

    res.status(200).json({
      success: true,
      message: "Product added to wishlist"
    });
  } catch (err) {
    next(err);
  }
};

// Get user's wishlist
export const getWishlist = async (req, res, next) => {
  try {
    const wishlist = await Wishlist.findOne({ userId: req.user._id })
      .populate("products.productId");

    if (!wishlist) {
      return res.status(200).json({
        success: true,
        wishlist: { userId: req.user._id, products: [] }
      });
    }

    // Remove deleted products
    wishlist.products = wishlist.products.filter(p => p.productId !== null);
    await wishlist.save();

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

    const index = wishlist.products.findIndex(
      item => item.productId.toString() === productId
    );

    if (index === -1) {
      return next(new ErrorHandler("Product not found in wishlist", 404));
    }

    wishlist.products.splice(index, 1);
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

    const wishlist = await Wishlist.findOne({ userId });
    if (!wishlist) {
      return next(new ErrorHandler("Wishlist not found", 404));
    }

    const itemIndex = wishlist.products.findIndex(
      item => item.productId.toString() === productId
    );

    if (itemIndex === -1) {
      return next(new ErrorHandler("Product not found in wishlist", 404));
    }

    const productDoc = await product.findById(productId);
    if (!productDoc) {
      wishlist.products.splice(itemIndex, 1);
      await wishlist.save();
      return next(new ErrorHandler("Product no longer exists", 404));
    }

    if (!productDoc.isAvailable) {
      return next(new ErrorHandler("Product is not available", 400));
    }

    if (quantity > productDoc.quantity) {
      return next(
        new ErrorHandler(
          `Only ${productDoc.quantity} units available for this product`,
          400
        )
      );
    }

    const { token } = req.cookies;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    let cart = await Cart.findOne({ userId });

    if (!cart) {
      cart = await Cart.create({
        userId,
        userRole: decoded.role,
        products: [
          {
            productId: productDoc._id,
            name: productDoc.name,
            price: productDoc.price,
            quantity,
            category:productDoc.category,
            images:productDoc.images,
            supplier: {
              userID: productDoc.upLoadedBy.userID,
              role: productDoc.upLoadedBy.role,
              name: productDoc.upLoadedBy.name
            }
          }
        ],
        totalPrice: productDoc.price * quantity,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      });
    } else {
      const cartIndex = cart.products.findIndex(
        item => item.productId.toString() === productId
      );

      if (cartIndex > -1) {
        const newQty = cart.products[cartIndex].quantity + quantity;

        if (newQty > productDoc.quantity) {
          return next(
            new ErrorHandler(
              `Cannot add ${quantity} more. Only ${
                productDoc.quantity - cart.products[cartIndex].quantity
              } left.`,
              400
            )
          );
        }

        cart.products[cartIndex].quantity = newQty;
      } else {
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

      cart.totalPrice = cart.products.reduce(
        (total, item) => total + item.price * item.quantity,
        0
      );
      await updateCartExpiration(cart);
      await cart.save();
    }

    // Remove from wishlist after moving
    wishlist.products.splice(itemIndex, 1);
    await wishlist.save();

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
