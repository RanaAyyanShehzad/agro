import express from "express";
import { register,Login,getMyProfile,Logout, updateProfile, deleteProfile, changePassword, sendOTP, resetPassword } from "../controllers/admin.js";
import { isAuthenticated } from "../middlewares/auth.js";

const router = express.Router();

router.post("/new", register); 
router.post("/login",Login);
router.post("/forgot-password", sendOTP);
router.post("/reset-password", resetPassword);

router.use(isAuthenticated);

router.get("/logout",Logout);
router.get("/me", getMyProfile);
router.put("/update", updateProfile);
router.delete("/delete", deleteProfile);
router.put("/change-password",changePassword);


export default router;
