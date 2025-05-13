import express from "express";
import { register,Login,getMyProfile,Logout,verifyOtp, 
    updateProfile, deleteProfile, changePassword, sendOTP, 
    resetPassword, getAllSuppliers, getSupplierProfileWithProducts,
     resendOTP } from "../controllers/supplier.js";
import {  isAuthenticated } from "../middlewares/auth.js";
import { deleteUnverifiedUsers } from "../middlewares/deleteUnverifiedUsers.js";

const router = express.Router();

router.post("/new",deleteUnverifiedUsers, register); 
router.post("/verify",deleteUnverifiedUsers,verifyOtp);
router.post("/resendOTP",deleteUnverifiedUsers,resendOTP);
router.post("/login",deleteUnverifiedUsers,Login);
router.get("/logout",isAuthenticated,Logout);
router.get("/me",isAuthenticated, getMyProfile);
router.put("/update",isAuthenticated, updateProfile);
router.delete("/delete",isAuthenticated, deleteProfile);
router.get("/all",getAllSuppliers);
router.put("/change-password",isAuthenticated,changePassword);
router.post("/forgot-password",deleteUnverifiedUsers, sendOTP);
router.post("/reset-password", resetPassword);
router.get("/supplier/:supplierId",isAuthenticated,getSupplierProfileWithProducts);
export default router;
