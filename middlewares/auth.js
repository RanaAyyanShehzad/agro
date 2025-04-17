import jwt from "jsonwebtoken";
import {farmer} from "../models/farmer.js"
export const isAuthenticated=async (req,res,next)=>{
    const {token}=req.cookies;
    console.log({token});
    if(!token)
        return res.status(404).json({
            success:false,
            message:"Login First",
        });
    const decoded=jwt.verify(token,process.env.JWT_SECRET);
    req.user=await farmer.findById(decoded._id);
    next();
}
