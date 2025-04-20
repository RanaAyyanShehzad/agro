import express from "express";
import { register,Login,getMyProfile,Logout, updateProfile, deleteProfile, changePassword, sendOTP, resetPassword, getAllSuppliers } from "../controllers/supplier.js";
import {  authSupplier } from "../middlewares/auth.js";

const router = express.Router();

router.post("/new", register); 
router.post("/login",Login);
router.get("/logout",authSupplier,Logout);
router.get("/me",authSupplier, getMyProfile);
router.put("/update",authSupplier, updateProfile);
router.delete("/delete",authSupplier, deleteProfile);
router.get("/all",getAllSuppliers);
router.put("/change-password",authSupplier,changePassword);
router.post("/forgot-password", sendOTP);
router.post("/reset-password", resetPassword);

export default router;
