import express from "express";
import { register,Login,getMyProfile,Logout, updateProfile,
     deleteProfile, changePassword, sendOTP, resetPassword,
      getAllBuyers, verifyOtp, resendOTP } from "../../controllers/buyer.js";
import { isAuthenticated } from "../../middlewares/auth.js";
import { deleteUnverifiedUsers } from "../../middlewares/deleteUnverifiedUsers.js";

const router = express.Router();

router.post("/new",deleteUnverifiedUsers, register); 
router.post("/login",deleteUnverifiedUsers,Login);
router.post("/verify",deleteUnverifiedUsers,verifyOtp);
router.post("/resendOTP",deleteUnverifiedUsers,resendOTP);
router.post("/forgot-password",deleteUnverifiedUsers, sendOTP);
router.post("/reset-password", resetPassword);
router.get("/all",getAllBuyers);

router.use(isAuthenticated);

router.get("/logout",Logout);
router.get("/me", getMyProfile);
router.put("/update", updateProfile);
router.delete("/delete", deleteProfile);
router.put("/change-password",changePassword);


export default router;
