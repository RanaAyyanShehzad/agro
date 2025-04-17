import { farmer } from "../models/farmer.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import {sendCookie} from "../utils/features.js"
export const register= async(req,res)=>{
    
    const {name,email,password}=req.body;
    let user = await farmer.findOne({email});
    if(user)
         return res.status(409).json({
        success:false,
        message:"User already exit",
        });
    const hashedPassword= await bcrypt.hash(password,10);
    user= farmer.create({name,email,password:hashedPassword});
    sendCookie(user,res,"Regestered Successfully",201);
}
export const Login=async(req,res)=>{
    const {email,password}=req.body;
    let user=await farmer.findOne({email}).select("+password");
    if(!user)
        return res.status(404).json({
       success:false,
       message:"Invalid Email or Password",
       });
    
    const isMatch=await bcrypt.compare(password,user.password);
    if(!isMatch)
        return res.status(404).json({
       success:false,
       message:"Invalid Email or Password",
    });
    sendCookie(user,res,`Welcome back, ${user.name}`,201);

};
export const getMyProfile=(req,res)=>{
    res.status(200).json({
        success:true,
        user:req.user,
    });
};
export const Logout=(req,res)=>{
    res.status(200).cookie("token","",{expires:new Date(Date.now())}).json({
        success:true,
        user:req.user,
    });
};
export const deleteProfile= async(req,res)=>{
    try {
        let user=await farmer.findById(req.user._id);
        if(!user){
            return res.status(404).json({
                success:false,
                message:"Delete Failed",
            });
        }
        await user.deleteOne();
        res.status(200).clearCookie("token").json({
            success: true,
            message: "Profile deleted successfully",
          });
    } catch (error) {
        res.status(500).json({
            success:false,
            message:"Can not Delete",
            error: error.message,
        });
    }
};
export const updateProfile =async (req,res)=>{
    try {
        let user= await farmer.findById(req.user._id);
        console.log(user);
        if(!user){
            return res.status(404).json({
                success:false,
                message:"Update Failed",
            });
        }
        const{name,email,password}=req.body;
        if(name) user.name=name;
        if(email) user.email=email;
        if(password){
            const hashedPassword=await bcrypt.hash(password,10);
            user.password=hashedPassword;
        }
        await user.save();
        sendCookie(user,res,"Updated successfully",200);
    } catch (error) {
        res.status(500).json({
            success:false,
            message:"Can not update",
            error: error.message,
        });
        
    }
};