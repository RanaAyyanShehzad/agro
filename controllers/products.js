import ErrorHandler from "../middlewares/error.js";
import { product } from "../models/products.js";
import { successMessage } from "../utils/features.js";
import { farmer } from "../models/farmer.js";
import { supplier } from "../models/supplier.js";
import jwt from "jsonwebtoken";

export const addProduct = async (req, res, next) => {
    try {
        const { name, description, price, unit, quantity } = req.body;
        const _id = req.user._id;
        const { token } = req.cookies;
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const role = decoded.role;
        let uploaderName, uploader;
        let isAvailable = true;
        if (!name || name.trim() === "") {
            return next(new ErrorHandler("Name is required", 400));
        }
        if (!description || description.trim() === "") {
            return next(new ErrorHandler("Description is required", 400));
        }
        if (!price) {
            return next(new ErrorHandler("Price is required", 400));
        }
        if (!unit || unit.trim() === "") {
            return next(new ErrorHandler("Unit is required", 400));
        }
        if (quantity === undefined || quantity === null) {
            return next(new ErrorHandler("Quantity is required", 400));
        }
        if (role == "farmer") {
            uploader = await farmer.findById(_id).select("+password");
        } else if (role == "supplier") {
            uploader = await supplier.findById(_id).select("+password");
        } else {
            return next(new ErrorHandler("Buyer can not add product", 400));
        }
        uploaderName = uploader.name;
        if (quantity <= 0) {
            isAvailable = false;
        }
        const newProduct = await product.create({
            name,
            description,
            price,
            unit,
            quantity,
            upLoadedBy: {  //  spelling fix
                userID: _id,
                role,
                uploaderName,
            }, isAvailable
        });

        successMessage(res, "Product added successfully", 201);
    } catch (error) {
        next(error);
    }
}
export const getAllProducts = async (req, res, next) => {
    try {
        const products = await product.find();
        res.status(200).json({
            success: true,
            products,
        });
    } catch (error) {
        next(error);
    }
}
export const getMyProduct = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { token } = req.cookies;
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const role = decoded.role;
        if(role=="buyer"){
            return next(new ErrorHandler("Buyer do not have any product",403));
        }
        const products = await product.find({ "upLoadedBy.userID": userId });

        res.status(200).json({
            success: true,
            products,
        });

    } catch (error) {
        next(error);
    }
}
export const deleteProduct = async (req, res, next) => {
    try {
        const productId = req.params.id;
        const userId = req.user._id;
        const { token } = req.cookies;
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const role = decoded.role;
         // Find the product first
         const productToDelete = await product.findById(productId);
        // Check if the logged-in user is the uploader
        if (
            productToDelete.upLoadedBy.userID.toString() !== userId.toString() ||
            productToDelete.upLoadedBy.role !== role
        ) {
            return next(new ErrorHandler("You are not allowed to delete this product", 403));
        }
       

        if (!productToDelete) {
            return next(new ErrorHandler("Product not found", 404));
        }

        
        

        // Delete the product
        await product.deleteOne({ _id: productId });

        successMessage(res, "Product deleted successfully", 200);
    } catch (error) {
        next(error);
    }
};

export const updateProduct = async (req, res, next) => {
    try {
        const productId = req.params.id;
        const userId = req.user._id;
        const { token } = req.cookies;
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const role = decoded.role;
        const { name, description, price, unit, quantity } = req.body;
        let isAvailable = true;

        // Find the product first
        const productToUpdate = await product.findById(productId);

        if (!productToUpdate) {
            return next(new ErrorHandler("Product not found", 404));
        }
        //check if uploader is the user to update product
        if (
            productToUpdate.upLoadedBy.userID.toString() !== userId.toString() ||
            productToUpdate.upLoadedBy.role !== role
        ) {
            return next(new ErrorHandler("You are not allowed to Update this product", 403));
        }
        if (!name || name.trim() === "") {
            return next(new ErrorHandler("Name is required", 400));
        }
        if (!description || description.trim() === "") {
            return next(new ErrorHandler("Description is required", 400));
        }
        if (!price) {
            return next(new ErrorHandler("Price is required", 400));
        }
        if (!unit || unit.trim() === "") {
            return next(new ErrorHandler("Unit is required", 400));
        }
        if (quantity === undefined || quantity === null) {
            return next(new ErrorHandler("Quantity is required", 400));
        }
        if (quantity <= 0) {
            isAvailable = false;
        }
        productToUpdate.name = name;
        productToUpdate.description = description;
        productToUpdate.price = price;
        productToUpdate.unit = unit;
        productToUpdate.quantity = quantity;
        productToUpdate.isAvailable = isAvailable;

        await productToUpdate.save();
        successMessage(res, "Product updated successfuly", 200);
    } catch (error) {
        next(error);
    }

}