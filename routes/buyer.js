import express from "express";
import { register,Login,getMyProfile,Logout, updateProfile, deleteProfile, changePassword, sendOTP, resetPassword, getAllBuyers } from "../controllers/buyer.js";
import { authBuyer } from "../middlewares/auth.js";

const router = express.Router();

router.post("/new", register); 
router.post("/login",Login);
router.get("/logout",authBuyer,Logout);
router.get("/me",authBuyer, getMyProfile);
router.put("/update",authBuyer, updateProfile);
router.delete("/delete",authBuyer, deleteProfile);
router.get("/all",getAllBuyers);
router.put("/change-password",authBuyer,changePassword);
router.post("/forgot-password", sendOTP);
router.post("/reset-password", resetPassword);

export default router;
