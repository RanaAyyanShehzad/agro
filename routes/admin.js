import express from "express";
import { 
  register, Login, getMyProfile, Logout, updateProfile, deleteProfile, 
  changePassword, sendOTP, resetPassword, verifyOtp,
  // Admin management functions
  getAllUsers, addUser, deleteUser, toggleUserStatus, hardDeleteUser,
  // Category management
  createCategory, getAllCategories, updateCategory, deleteCategory,
  // Product management
  getProductsByStatus, toggleProductVisibility,
  // System configuration
  updateSystemConfig, getSystemConfig,
  // Order management
  getAllOrdersAdmin, getOrderByIdAdmin,
  // Dispute management
  getAllDisputes, getDisputeById
} from "../controllers/admin.js";
import { isAuthenticated } from "../middlewares/auth.js";
import { checkIsAdmin } from "../middlewares/checkIsAdmin.js";

const router = express.Router();

// Public routes
router.post("/new", register); 
router.post("/login", Login);
router.post("/forgot-password", sendOTP);
router.post("/reset-password", resetPassword);
router.post("/verify", verifyOtp);

// Protected routes (require authentication)
router.use(isAuthenticated);

// Admin profile routes
router.get("/logout", Logout);
router.get("/me", getMyProfile);
router.put("/update", updateProfile);
router.delete("/delete", deleteProfile);
router.put("/change-password", changePassword);

// Admin-only routes (require admin role)
router.use(checkIsAdmin);

// User management
router.get("/users", getAllUsers);
router.post("/users/add", addUser);
router.delete("/users/:role/:userId", deleteUser);
router.put("/users/:role/:userId/toggle-status", toggleUserStatus);
router.delete("/users/:role/:userId/hard-delete", hardDeleteUser);

// Product category management
router.post("/categories", createCategory);
router.get("/categories", getAllCategories);
router.put("/categories/:categoryId", updateCategory);
router.delete("/categories/:categoryId", deleteCategory);

// Product management
router.get("/products", getProductsByStatus);
router.put("/products/:productId/visibility", toggleProductVisibility);

// System configuration
router.get("/config", getSystemConfig);
router.put("/config", updateSystemConfig);

// Order management
router.get("/orders", getAllOrdersAdmin);
router.get("/orders/:orderId", getOrderByIdAdmin);

// Dispute management
router.get("/disputes", getAllDisputes);
router.get("/disputes/:disputeId", getDisputeById);

export default router;
