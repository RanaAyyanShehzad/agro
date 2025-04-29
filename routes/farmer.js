import express from "express";
import { register,Login,getMyProfile,Logout, updateProfile, deleteProfile,getAllFarmers, changePassword, sendOTP, resetPassword, getFarmerProfileWithProducts } from "../controllers/farmer.js";
import { isAuthenticated } from "../middlewares/auth.js";

const router = express.Router();

router.post("/new", register); 
router.post("/login",Login);
router.get("/logout",isAuthenticated,Logout);
router.get("/me",isAuthenticated, getMyProfile);
router.put("/update",isAuthenticated, updateProfile);
router.delete("/delete",isAuthenticated, deleteProfile);
router.get("/all",getAllFarmers);
router.put("/changepassword",isAuthenticated,changePassword);
router.post("/forgot-password", sendOTP);
router.post("/reset-password", resetPassword);
router.get("/farmer/:farmerId",isAuthenticated,getFarmerProfileWithProducts);

export default router;
