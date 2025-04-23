import express from "express";
import { register,Login,getMyProfile,Logout, updateProfile, deleteProfile, changePassword, sendOTP, resetPassword, getAllSuppliers } from "../controllers/supplier.js";
import {  isAuthenticated } from "../middlewares/auth.js";

const router = express.Router();

router.post("/new", register); 
router.post("/login",Login);
router.get("/logout",isAuthenticated,Logout);
router.get("/me",isAuthenticated, getMyProfile);
router.put("/update",isAuthenticated, updateProfile);
router.delete("/delete",isAuthenticated, deleteProfile);
router.get("/all",getAllSuppliers);
router.put("/change-password",isAuthenticated,changePassword);
router.post("/forgot-password", sendOTP);
router.post("/reset-password", resetPassword);

export default router;
