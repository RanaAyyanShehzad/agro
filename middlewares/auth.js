import jwt from "jsonwebtoken";
import { farmer } from "../models/farmer.js"
import ErrorHandler from "./error.js";
import { buyer } from "../models/buyer.js";
import { supplier } from "../models/supplier.js";
import { AwsInstance } from "twilio/lib/rest/accounts/v1/credential/aws.js";
import { admin } from "../models/admin.js";
export const isAuthenticated = async (req, res, next) => {
    try {
        const { token } = req.cookies;
        if (!token) return next(new ErrorHandler("Login First", 404));
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const role=decoded.role;
        if(role=="farmer"){
            req.user = await farmer.findById(decoded._id);
        }else if(role=="buyer"){
            req.user = await buyer.findById(decoded._id);
        }else if(role=="supplier"){
            req.user = await supplier.findById(decoded._id);
        }else if(role=="admin"){
            req.user= await admin.findById(decoded._id);
        } 
        
        next();
    } catch (error) {
        next(error);
    }
}
