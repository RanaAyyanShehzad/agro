import ErrorHandler from "../middlewares/error.js";
import { product } from "../models/products.js";
import { successMessage } from "../utils/features.js";
import { farmer } from "../models/farmer.js";
import { supplier } from "../models/supplier.js";
import { Review } from "../models/review.js";
import jwt from "jsonwebtoken";

// Utility: Decode user and role from JWT token
const getUserAndRole = (req) => {
    const { token } = req.cookies;
    if (!token) throw new ErrorHandler("Authentication token missing", 401);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return { userId: req.user._id, role: decoded.role };
};

// Utility: Get uploader by role
const getUploader = async (userId, role) => {
    if (role === "farmer") {
        return await farmer.findById(userId).select("+password");
    } else if (role === "supplier") {
        return await supplier.findById(userId).select("+password");
    } else {
        throw new ErrorHandler("Only farmers or suppliers can add products", 403);
    }
};

export const addProduct = async (req, res, next) => {
    try {
        const { name, description, price, unit, quantity,category, images } = req.body;
        const { userId, role } = getUserAndRole(req);

        if (
            !name?.trim() ||
            !description?.trim() ||
            !unit?.trim() ||
            price == null ||
            quantity == null || !category?.trim() ||
            !images ||
            !Array.isArray(images) ||
            images.length === 0
        ) {
            return next(new ErrorHandler("All fields including images are required", 400));
        }

        const nameRegex = /^[a-zA-Z\s-]+$/;
        if (!nameRegex.test(name)) {
            return next(new ErrorHandler("Name can only contain letters, spaces, and hyphens.", 400));
        }
if(price<=0 && price>=2000000){
    return next(new ErrorHandler("Price must be greater than 0 and less than 2000000", 400));
}
if(quantity<=0 && quantity>=1000){
    return next(new ErrorHandler("Quantity must be greater than 0 and less than 10000", 400));
}
        const uploader = await getUploader(userId, role);
        const uploaderName = uploader.name;
        const isAvailable = quantity > 0;

        await product.create({
            name,
            description,
            price,
            unit,
            quantity,
            category,
            isAvailable,
            images, // 👈 save image URLs
            upLoadedBy: {
                userID: userId,
                role,
                uploaderName,
            },
        });

        successMessage(res, "Product added successfully", 201);
    } catch (error) {
        next(error);
    }
};

// Get all products
export const getAllProducts = async (req, res, next) => {
  try {
    const sortBy = req.query.sort; // optional query param: rating, positive, etc.
    const products = await product.find();

    // Enrich each product with average rating and sentiment counts
    const enrichedProducts = await Promise.all(products.map(async (p) => {
      const reviews = await Review.find({ productId: p._id });

      const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
      const averageRating = reviews.length > 0 ? totalRating / reviews.length : 0;

      const sentimentCounts = {
        positive: reviews.filter(r => r.sentiment === 'positive').length,
        neutral: reviews.filter(r => r.sentiment === 'neutral').length,
        negative: reviews.filter(r => r.sentiment === 'negative').length
      };

      return {
        ...p.toObject(),
        averageRating: Number(averageRating.toFixed(1)),
        sentimentCounts
      };
    }));

    // Optional Sorting
    if (sortBy === "rating") {
      enrichedProducts.sort((a, b) => b.averageRating - a.averageRating);
    } else if (sortBy === "positive") {
      enrichedProducts.sort((a, b) => b.sentimentCounts.positive - a.sentimentCounts.positive);
    }

    res.status(200).json({ success: true, products: enrichedProducts });

  } catch (error) {
    next(error);
  }
};
export const getAllProductsForFarmer = async (req, res, next) => {
  try {
    const { userId, role } = getUserAndRole(req);
    const sortBy = req.query.sort;

    if (role !== "farmer") {
      return next(new ErrorHandler("Only farmers can access this route", 403));
    }

    const products = await product.find({
      isAvailable: true,
      "upLoadedBy.userID": { $ne: userId }
    });

    const enrichedProducts = await Promise.all(products.map(async (p) => {
      const reviews = await Review.find({ productId: p._id });

      const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
      const averageRating = reviews.length > 0 ? totalRating / reviews.length : 0;

      const sentimentCounts = {
        positive: reviews.filter(r => r.sentiment === 'positive').length,
        neutral: reviews.filter(r => r.sentiment === 'neutral').length,
        negative: reviews.filter(r => r.sentiment === 'negative').length
      };

      return {
        ...p.toObject(),
        averageRating: Number(averageRating.toFixed(1)),
        sentimentCounts
      };
    }));

    if (sortBy === "rating") {
      enrichedProducts.sort((a, b) => b.averageRating - a.averageRating);
    } else if (sortBy === "positive") {
      enrichedProducts.sort((a, b) => b.sentimentCounts.positive - a.sentimentCounts.positive);
    }

    res.status(200).json({ success: true, products: enrichedProducts });

  } catch (error) {
    next(error);
  }
};

// Get current user's products
export const getMyProduct = async (req, res, next) => {
    try {
        const { userId, role } = getUserAndRole(req);
        if (role === "buyer") {
            return next(new ErrorHandler("Buyers do not have products", 403));
        }

        const products = await product.find({ "upLoadedBy.userID": userId });
        res.status(200).json({ success: true, products });
    } catch (error) {
        next(error);
    }
};

// Delete a product
export const deleteProduct = async (req, res, next) => {
    try {
        const { userId, role } = getUserAndRole(req);
        const productId = req.params.id;

        const productToDelete = await product.findById(productId);
        if (!productToDelete) return next(new ErrorHandler("Product not found", 404));

        const isUploader = productToDelete.upLoadedBy.userID.toString() === userId.toString() &&
            productToDelete.upLoadedBy.role === role;
        if (!isUploader) {
            return next(new ErrorHandler("You are not allowed to delete this product", 403));
        }

        await product.deleteOne({ _id: productId });
        successMessage(res, "Product deleted successfully", 200);
    } catch (error) {
        next(error);
    }
};

// Update a product
export const updateProduct = async (req, res, next) => {
    try {
        const { userId, role } = getUserAndRole(req);
        const productId = req.params.id;
        const { name, description, price, unit, quantity,category, images } = req.body;

        const productToUpdate = await product.findById(productId);
        if (!productToUpdate) return next(new ErrorHandler("Product not found", 404));

        const isUploader = productToUpdate.upLoadedBy.userID.toString() === userId.toString() &&
            productToUpdate.upLoadedBy.role === role;
        if (!isUploader) {
            return next(new ErrorHandler("You are not allowed to update this product", 403));
        }

        if (!name?.trim() || !description?.trim() || !unit?.trim() || price == null ||
            quantity == null || !images || !category?.trim()||
            !Array.isArray(images) ||
            images.length === 0) {
            return next(new ErrorHandler("All fields are required", 400));
        }
        if(price<=0 && price>=2000000){
          return next(new ErrorHandler("Price must be greater than 0 and less than 2000000", 400));
      }
      if(quantity<=0 && quantity>=1000){
          return next(new ErrorHandler("Quantity must be greater than 0 and less than 10000", 400));
      }
        Object.assign(productToUpdate, {
            name,
            description,
            price,
            unit,
            quantity,
            category,
            isAvailable: quantity > 0,
            images,
            
        });

        await productToUpdate.save();
        successMessage(res, "Product updated successfully", 200);
    } catch (error) {
        next(error);
    }
};
