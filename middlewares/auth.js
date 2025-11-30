import jwt from "jsonwebtoken";
import { farmer } from "../models/farmer.js"
import ErrorHandler from "./error.js";
import { buyer } from "../models/buyer.js";
import { supplier } from "../models/supplier.js";
import { admin } from "../models/admin.js";
export const isAuthenticated = async (req, res, next) => {
    try {
        const { token } = req.cookies;
        if (!token) return next(new ErrorHandler("Login First", 401));
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const role = decoded.role;
        
        let user = null;
        if(role == "farmer"){
            user = await farmer.findById(decoded._id);
        }else if(role == "buyer"){
            user = await buyer.findById(decoded._id);
        }else if(role == "supplier"){
            user = await supplier.findById(decoded._id);
        }else if(role == "admin"){
            user = await admin.findById(decoded._id);
        }
        
        if (!user) {
            return next(new ErrorHandler("User not found", 404));
        }
        
        // Attach role to user object for easy access
        req.user = user;
        req.user.role = role;
        
        next();
    } catch (error) {
        next(error);
    }
}
