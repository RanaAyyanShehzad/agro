import jwt from "jsonwebtoken";
import { farmer } from "../models/farmer.js"
import ErrorHandler from "./error.js";
import { buyer } from "../models/buyer.js";
import { supplier } from "../models/supplier.js";
export const isAuthenticated = async (req, res, next) => {
    try {
        const { token } = req.cookies;
        if (!token) return next(new ErrorHandler("Login First", 404));
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await farmer.findById(decoded._id);
        next();
    } catch (error) {
        next(error);
    }
}
export const authBuyer = async (req, res, next) => {
    try {
        const { token } = req.cookies;
        if (!token) return next(new ErrorHandler("Login First", 404));
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await buyer.findById(decoded._id);
        next();
    } catch (error) {
        next(error);
    }
}
export const authSupplier = async (req, res, next) => {
    try {
        const { token } = req.cookies;
        if (!token) return next(new ErrorHandler("Login First", 404));
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await supplier.findById(decoded._id);
        next();
    } catch (error) {
        next(error);
    }
}

