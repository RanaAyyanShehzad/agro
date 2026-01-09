
import bcrypt from "bcrypt";
import { sendCookie } from "../utils/features.js"
import { sendSMS } from "../utils/sendSMS.js";
import { sendEmail } from "../utils/sendEmail.js";
import ErrorHandler from "../middlewares/error.js";
import { validation } from "../utils/Validation.js";
import { isAccountLocked } from "../middlewares/failedAttempts.js";
import {
  hashPassword,
  validatePassword,
  verifyUserRole,
  generateOTP,
  validateEmail,
  validatePhone,
  validateName,
  validateAddress
} from "../utils/authUtils.js";
import { admin } from "../models/admin.js";
import { buyer } from "../models/buyer.js";
import { farmer } from "../models/farmer.js";
import { supplier } from "../models/supplier.js";
import { product } from "../models/products.js";
import { ProductCategory } from "../models/productCategory.js";
import { SystemConfig, CONFIG_KEYS } from "../models/systemConfig.js";
import { Dispute } from "../models/dispute.js";
import { Order } from "../models/order.js";
import { OrderMultiVendor } from "../models/orderMultiVendor.js";
import { AuditLog } from "../models/auditLog.js";
import { OrderHistory } from "../models/orderHistory.js";
import { ProductHistory } from "../models/productHistory.js";
import { createAuditLog } from "../utils/auditLogger.js";
import { logOrderChange } from "../utils/orderHistoryLogger.js";
import { createNotification } from "../utils/notifications.js";


// Controller functions
export const register = async (req, res, next) => {
  try {
    const { name, email, password, phone, address, img } = req.body;

    // Use the validation function
    await validation(next, name, email, password, phone, address);

    // Check if user exists
    let user = await admin.findOne({ email });
    if (user) return next(new ErrorHandler("Admin already exists", 409));
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit
    const otpExpiry = new Date(Date.now() + 30 * 60 * 1000); // 10 minutes from now
    // Create user with hashed password
    user = await admin.create({
      name,
      email,
      password: await hashPassword(password),
      phone,
      address,
      img: img,
      verified: false,
      otp,
      otpExpiry

    });
    await sendEmail(
      email,
      "Verify your account",
      `${name}, your OTP is ${otp}. It is valid for 30 minutes.`
    );
    res.status(200).json({
      success: true,
      message: "OTP sent to email. Please verify to complete registration.",
    });

  } catch (error) {
    next(error);
  }
};
export const verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    if (!email) {
      return next(new ErrorHandler("Please provide email", 404));
    }
    if (!otp) {
      return next(new ErrorHandler("Please provide 6-Digit code", 404));
    }

    const user = await admin.findOne({ email });

    if (!user) return next(new ErrorHandler("User not found", 404));
    if (user.verified) return next(new ErrorHandler("User already verified", 400));
    if (user.otp !== otp || user.otpExpiry < Date.now()) {
      return next(new ErrorHandler("Invalid or expired OTP", 400));
    }

    user.verified = true;
    user.otp = null;
    user.otpExpiry = null;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Account verified successfully.",
    });
  } catch (error) {
    next(error);
  }
};


export const resendOTP = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await admin.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.verified) {
      return res.status(400).json({ message: "Account is already verified" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit
    const otpExpiry = Date.now() + 30 * 60 * 1000; // 10 minutes from now

    user.otp = otp;
    user.otpExpiry = otpExpiry;
    await user.save();

    await sendEmail(
      email,
      "OTP resent",
      `Your OTP is ${otp}. It is valid for 30 minutes.`
    );

    return res.status(200).json({ message: "OTP resent successfully" });

  } catch (error) {
    next(error);
  }
};


export const Login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email) {
      return next(new ErrorHandler("Please provide email", 404));
    }
    if (!password) {
      return next(new ErrorHandler("Please provide password", 404));
    }
    let user = await admin.findOne({ email }).select("+password");
    if(!user){return next(new ErrorHandler("Admin not found",404))};
    if (!user.verified) {
      return next(new ErrorHandler("Please verify your account first", 403));
    }
    if (isAccountLocked(user)) {
      return next(new ErrorHandler(`Account is temporarily locked. Try again after ${user.lockUntil}.`, 403));
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      user.failedLoginAtempt += 1;

      if (user.failedLoginAtempt >= 5) {
        user.lockUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 min lock
      }

      await user.save();
      return next(new ErrorHandler("Invalid Email or Password", 404));
    }
    user.failedLoginAtempt = 0;
    user.lockUntil = undefined;

    sendCookie(user, "admin", res, `Welcome back, ${user.name}`, 201);
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    // Verify buyer role
    const decoded = verifyUserRole(req.cookies.token, "admin", next);

    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword)
      return next(new ErrorHandler("Please fill all fields", 400));

    // Validate new password
    if (!validatePassword(newPassword, next)) return;

    const user = await admin.findById(decoded._id).select("+password");

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) return next(new ErrorHandler("Old password is incorrect", 401));

     const samePass =await bcrypt.compare(newPassword,user.password);
    if(samePass) return next(new ErrorHandler("New password must be different from the old password", 400));
    user.password = await hashPassword(newPassword);
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const getMyProfile = async (req, res, next) => {
  try {
    // Verify buyer role
    const decoded = verifyUserRole(req.cookies.token, "admin", next);
    const user = await admin.findById(decoded._id);
    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    // Error is handled in verifyUserRole
  }
};

export const Logout = async (req, res, next) => {
  try {
    // Verify buyer role
    const decoded = verifyUserRole(req.cookies.token, "admin", next);
    const user = await admin.findById(decoded._id);

    res.status(200)
      .cookie("token", "", {
        expires: new Date(Date.now()),
        sameSite: process.env.NODE_ENV === 'Development' ? "Lax" : "none", // Prevent CSRF (optional but recommended)
        secure: process.env.NODE_ENV === 'Development' ? false : true,
      })
      .json({
        success: true,
        user,
      });
  } catch (error) {
    // Error is handled in verifyUserRole
  }
};

export const deleteProfile = async (req, res, next) => {
  try {
    // Verify buyer role
    const decoded = verifyUserRole(req.cookies.token, "admin", next);
    let countadmin = await admin.countDocuments({});

    if (countadmin > 1) {
      let user = await admin.findById(decoded._id);
      if (!user) return next(new ErrorHandler("Delete Failed", 404));
      await user.deleteOne();

      res.status(200)
        .clearCookie("token")
        .json({
          success: true,
          message: "Profile deleted successfully",
        });
    } else {
      return next(new ErrorHandler("Can not delete admin, First make someone admin", 403));
    }

  } catch (error) {
    next(error);
  }
};
export const updateProfile = async (req, res, next) => {
  try {
    // Verify buyer role
    const decoded = verifyUserRole(req.cookies.token, "admin", next);

    const user = await admin.findById(decoded._id);
    if (!user) return next(new ErrorHandler("Update Failed", 404));

    const { name, email, phone, address, img } = req.body;

    // Use simplified validation from common utils
    if (name) {
      if (!validateName(name, next)) return;
      user.name = name;
    }

    if (email) {
      if (!validateEmail(email, next)) return;
      user.email = email;
    }

    if (phone) {
      if (!validatePhone(phone, next)) return;
      user.phone = phone;
    }

    if (address !== undefined) {
      if (!validateAddress(address, next)) return;
      user.address = address;
    }
    if (img) {
      user.img = img;
    }

    await user.save();
    sendCookie(user, "admin", res, "Updated successfully", 200);
  } catch (error) {
    next(error);
  }
};

export const sendOTP = async (req, res, next) => {
  try {
    const { email, phone } = req.body;

    if (!email && !phone) {
      return next(new ErrorHandler("Please provide email or phone", 400));
    }

    let user;
    if (email) {
      user = await admin.findOne({ email });
    } else {
      user = await admin.findOne({ phone });
    }

    if (!user) return next(new ErrorHandler("User not found", 404));
    if (!user.verified) {
      return next(new ErrorHandler("Please verify your account first", 403));
    }
    // Generate OTP using common util
    const otp = generateOTP();
    user.otp = otp;
    user.otpExpiry = Date.now() + 2 * 60 * 1000; // 2 minutes
    await user.save();

    // Send OTP
    if (email) {
      await sendEmail(email, "FarmConnect Password Reset OTP", `Your OTP is: ${otp}`);
    } else {
      await sendSMS(phone, `Your FarmConnect OTP is: ${otp}`);
    }

    res.status(200).json({
      success: true,
      message: `OTP sent to your ${email ? "email" : "phone"}`,
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { email, phone, otp, newPassword } = req.body;

    if (!otp || !newPassword)
      return next(new ErrorHandler("OTP and new password are required", 400));

    // Find user by email or phone
    const user = email
      ? await admin.findOne({ email })
      : await admin.findOne({ phone });

    if (!user) return next(new ErrorHandler("User not found", 404));
    if (!user.verified) {
      return next(new ErrorHandler("Please verify your account first", 403));
    }
    // Verify OTP
    if (user.otp !== otp || user.otpExpiry < Date.now()) {
      return next(new ErrorHandler("Invalid or expired OTP", 400));
    }

    // Validate new password using common util
    if (!validatePassword(newPassword, next)) return;

    // Update password and clear OTP
    user.password = await hashPassword(newPassword);
    user.otp = null;
    user.otpExpiry = null;
    await user.save();

    if (email) {
      await sendEmail(email, "FarmConnect Password Reset", "Your password has been reset");
    }

    res.status(200).json({
      success: true,
      message: "Password reset successful",
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// ADMIN MANAGEMENT FUNCTIONS
// ============================================

/**
 * Get all users (including soft-deleted and security fields)
 */
export const getAllUsers = async (req, res, next) => {
  try {
    const { role, includeDeleted, page = 1, limit = 50 } = req.query;
    
    const filter = {};
    if (role) {
      filter.role = role;
    }
    if (includeDeleted !== "true") {
      filter.isAccountDeleted = false;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get users from all collections
    const buyers = await buyer.find(role === "buyer" || !role ? filter : { _id: null })
      .select("+failedLoginAtempt +lockUntil")
      .skip(role === "buyer" || !role ? skip : 0)
      .limit(role === "buyer" || !role ? parseInt(limit) : 0)
      .lean();
    
    const farmers = await farmer.find(role === "farmer" || !role ? filter : { _id: null })
      .select("+failedLoginAtempt +lockUntil")
      .skip(role === "farmer" || !role ? skip : 0)
      .limit(role === "farmer" || !role ? parseInt(limit) : 0)
      .lean();
    
    const suppliers = await supplier.find(role === "supplier" || !role ? filter : { _id: null })
      .select("+failedLoginAtempt +lockUntil")
      .skip(role === "supplier" || !role ? skip : 0)
      .limit(role === "supplier" || !role ? parseInt(limit) : 0)
      .lean();

    // Combine and format users
    const allUsers = [
      ...buyers.map(u => ({ ...u, role: "buyer" })),
      ...farmers.map(u => ({ ...u, role: "farmer" })),
      ...suppliers.map(u => ({ ...u, role: "supplier" }))
    ];

    res.status(200).json({
      success: true,
      count: allUsers.length,
      users: allUsers
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add a new user (Admin can create users)
 */
export const addUser = async (req, res, next) => {
  try {
    const { name, email, password, phone, address, role, img } = req.body;

    if (!name || !email || !password || !phone || !address || !role) {
      return next(new ErrorHandler("All fields are required", 400));
    }

    if (!["buyer", "farmer", "supplier"].includes(role)) {
      return next(new ErrorHandler("Invalid role. Must be buyer, farmer, or supplier", 400));
    }

    await validation(next, name, email, password, phone, address);

    let UserModel;
    if (role === "buyer") UserModel = buyer;
    else if (role === "farmer") UserModel = farmer;
    else UserModel = supplier;

    // Check if user exists
    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      return next(new ErrorHandler(`${role} with this email already exists`, 409));
    }

    const newUser = await UserModel.create({
      name,
      email,
      password: await hashPassword(password),
      phone,
      address,
      img: img || "",
      verified: true // Admin-created users are auto-verified
    });

    res.status(201).json({
      success: true,
      message: `${role} created successfully`,
      user: {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a user (soft delete)
 */
export const deleteUser = async (req, res, next) => {
  try {
    const { userId, role } = req.params;

    if (!["buyer", "farmer", "supplier"].includes(role)) {
      return next(new ErrorHandler("Invalid role", 400));
    }

    let UserModel;
    if (role === "buyer") UserModel = buyer;
    else if (role === "farmer") UserModel = farmer;
    else UserModel = supplier;

    const user = await UserModel.findById(userId);
    if (!user) {
      return next(new ErrorHandler("User not found", 404));
    }

    // Soft delete
    user.isAccountDeleted = true;
    user.isActive = false;
    user.deletedAt = new Date();
    await user.save();

    // If farmer/supplier, soft delete their products
    if (role === "farmer" || role === "supplier") {
      await product.updateMany(
        { "upLoadedBy.userID": userId },
        { 
          isDeleted: true, 
          isActive: false, 
          deletedAt: new Date() 
        }
      );
    }

    res.status(200).json({
      success: true,
      message: `${role} deleted successfully`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle user account status (lock/unlock, activate/deactivate)
 */
export const toggleUserStatus = async (req, res, next) => {
  try {
    const { userId, role } = req.params;
    const { action, lockDuration } = req.body; // action: "lock", "unlock", "activate", "deactivate"

    if (!["buyer", "farmer", "supplier"].includes(role)) {
      return next(new ErrorHandler("Invalid role", 400));
    }

    let UserModel;
    if (role === "buyer") UserModel = buyer;
    else if (role === "farmer") UserModel = farmer;
    else UserModel = supplier;

    const user = await UserModel.findById(userId);
    if (!user) {
      return next(new ErrorHandler("User not found", 404));
    }

    switch (action) {
      case "lock":
        const duration = lockDuration ? parseInt(lockDuration) : 30; // minutes, default 30
        user.lockUntil = new Date(Date.now() + duration * 60 * 1000);
        user.isActive = false;
        break;
      case "unlock":
        user.lockUntil = null;
        user.failedLoginAtempt = 0;
        user.isActive = true;
        break;
      case "activate":
        user.isActive = true;
        user.lockUntil = null;
        break;
      case "deactivate":
        user.isActive = false;
        break;
      default:
        return next(new ErrorHandler("Invalid action. Use: lock, unlock, activate, or deactivate", 400));
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: `User ${action}ed successfully`,
      user: {
        _id: user._id,
        name: user.name,
        isActive: user.isActive,
        lockUntil: user.lockUntil
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Permanently delete (hard delete) soft-deleted users
 */
export const hardDeleteUser = async (req, res, next) => {
  try {
    const { userId, role } = req.params;

    if (!["buyer", "farmer", "supplier"].includes(role)) {
      return next(new ErrorHandler("Invalid role", 400));
    }

    let UserModel;
    if (role === "buyer") UserModel = buyer;
    else if (role === "farmer") UserModel = farmer;
    else UserModel = supplier;

    const user = await UserModel.findById(userId);
    if (!user) {
      return next(new ErrorHandler("User not found", 404));
    }

    if (!user.isAccountDeleted) {
      return next(new ErrorHandler("User is not soft-deleted. Use delete endpoint first.", 400));
    }

    // Hard delete
    await UserModel.findByIdAndDelete(userId);

    res.status(200).json({
      success: true,
      message: `${role} permanently deleted`
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// PRODUCT CATEGORY MANAGEMENT
// ============================================

/**
 * Create a new product category
 */
export const createCategory = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const adminId = req.adminId;

    if (!name || !name.trim()) {
      return next(new ErrorHandler("Category name is required", 400));
    }

    const existingCategory = await ProductCategory.findOne({ name: name.trim() });
    if (existingCategory) {
      return next(new ErrorHandler("Category with this name already exists", 409));
    }

    const category = await ProductCategory.create({
      name: name.trim(),
      description: description?.trim() || "",
      createdBy: adminId
    });

    res.status(201).json({
      success: true,
      message: "Category created successfully",
      category
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all product categories
 */
export const getAllCategories = async (req, res, next) => {
  try {
    const { includeInactive = "false" } = req.query;
    
    const filter = {};
    if (includeInactive !== "true") {
      filter.isActive = true;
    }

    const categories = await ProductCategory.find(filter)
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: categories.length,
      categories
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a product category
 */
export const updateCategory = async (req, res, next) => {
  try {
    const { categoryId } = req.params;
    const { name, description, isActive } = req.body;
    const adminId = req.adminId;

    const category = await ProductCategory.findById(categoryId);
    if (!category) {
      return next(new ErrorHandler("Category not found", 404));
    }

    if (name && name.trim()) {
      const existingCategory = await ProductCategory.findOne({ 
        name: name.trim(), 
        _id: { $ne: categoryId } 
      });
      if (existingCategory) {
        return next(new ErrorHandler("Category with this name already exists", 409));
      }
      category.name = name.trim();
    }

    if (description !== undefined) {
      category.description = description?.trim() || "";
    }

    if (isActive !== undefined) {
      category.isActive = isActive;
    }

    category.updatedBy = adminId;
    await category.save();

    res.status(200).json({
      success: true,
      message: "Category updated successfully",
      category
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a product category (soft delete by setting isActive to false)
 */
export const deleteCategory = async (req, res, next) => {
  try {
    const { categoryId } = req.params;

    const category = await ProductCategory.findById(categoryId);
    if (!category) {
      return next(new ErrorHandler("Category not found", 404));
    }

    // Check if category is used by any products
    const productsCount = await product.countDocuments({ 
      category: category.name,
      isDeleted: false 
    });

    if (productsCount > 0) {
      return next(new ErrorHandler(
        `Cannot delete category. It is used by ${productsCount} product(s). Deactivate it instead.`,
        400
      ));
    }

    category.isActive = false;
    await category.save();

    res.status(200).json({
      success: true,
      message: "Category deleted successfully"
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// PRODUCT MANAGEMENT
// ============================================

/**
 * Get products by status (zero stock, flagged, etc.)
 */
export const getProductsByStatus = async (req, res, next) => {
  try {
    const { status, days = 30, page = 1, limit = 50 } = req.query;

    const filter = { isDeleted: false };
    const skip = (parseInt(page) - 1) * parseInt(limit);

    switch (status) {
      case "zero_stock":
        filter.quantity = 0;
        // Get products with zero stock for extended period
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));
        filter.updatedAt = { $lt: cutoffDate };
        break;
      case "inactive":
        filter.isActive = false;
        break;
      case "all":
        // No additional filter
        break;
      default:
        return next(new ErrorHandler("Invalid status. Use: zero_stock, inactive, or all", 400));
    }

    const products = await product.find(filter)
      .populate("upLoadedBy.userID", "name email")
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await product.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: products.length,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      products
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle product visibility (isActive)
 */
export const toggleProductVisibility = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      return next(new ErrorHandler("isActive must be a boolean value", 400));
    }

    const productDoc = await product.findById(productId);
    if (!productDoc) {
      return next(new ErrorHandler("Product not found", 404));
    }

    productDoc.isActive = isActive;
    await productDoc.save();

    res.status(200).json({
      success: true,
      message: `Product ${isActive ? "activated" : "deactivated"} successfully`,
      product: {
        _id: productDoc._id,
        name: productDoc.name,
        isActive: productDoc.isActive
      }
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// SYSTEM CONFIGURATION MANAGEMENT
// ============================================

/**
 * Update system configuration
 */
export const updateSystemConfig = async (req, res, next) => {
  try {
    const { configKey, configValue } = req.body;
    const adminId = req.adminId;

    if (!configKey || configValue === undefined) {
      return next(new ErrorHandler("configKey and configValue are required", 400));
    }

    // Validate config key
    const validKeys = Object.values(CONFIG_KEYS);
    if (!validKeys.includes(configKey)) {
      return next(new ErrorHandler(
        `Invalid config key. Valid keys: ${validKeys.join(", ")}`,
        400
      ));
    }

    // Validate config value based on key
    if (configKey === CONFIG_KEYS.MAX_TEMP_CELSIUS || configKey === CONFIG_KEYS.MIN_TEMP_CELSIUS) {
      if (typeof configValue !== "number") {
        return next(new ErrorHandler("Temperature must be a number", 400));
      }
    } else if (configKey === CONFIG_KEYS.FAQ_CONTENT) {
      if (typeof configValue !== "string" && !Array.isArray(configValue)) {
        return next(new ErrorHandler("FAQ content must be a string or array", 400));
      }
    } else if (configKey.includes("MINUTES") || configKey.includes("DAYS")) {
      if (typeof configValue !== "number" || configValue < 0) {
        return next(new ErrorHandler("Time value must be a positive number", 400));
      }
    }

    const config = await SystemConfig.findOneAndUpdate(
      { configKey },
      { 
        configValue,
        updatedBy: adminId
      },
      { upsert: true, new: true }
    );

    res.status(200).json({
      success: true,
      message: "Configuration updated successfully",
      config
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get system configuration
 */
export const getSystemConfig = async (req, res, next) => {
  try {
    const { configKey } = req.query;

    if (configKey) {
      const config = await SystemConfig.findOne({ configKey });
      if (!config) {
        return next(new ErrorHandler("Configuration not found", 404));
      }
      return res.status(200).json({
        success: true,
        config
      });
    }

    // Get all configurations
    const configs = await SystemConfig.find()
      .populate("updatedBy", "name email")
      .sort({ configKey: 1 });

    res.status(200).json({
      success: true,
      count: configs.length,
      configs
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// ORDER MANAGEMENT FOR ADMIN
// ============================================

/**
 * Get all orders (both Order and OrderMultiVendor models)
 */
export const getAllOrdersAdmin = async (req, res, next) => {
  try {
    const { 
      status, 
      paymentStatus, 
      disputeStatus,
      startDate, 
      endDate, 
      page = 1, 
      limit = 20,
      orderType = "all" // "all", "old", "multivendor"
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const allOrders = [];

    // Get orders from OrderMultiVendor (new system)
    if (orderType === "all" || orderType === "multivendor") {
      const multiVendorFilter = {};
      if (status) multiVendorFilter.orderStatus = status;
      if (paymentStatus) multiVendorFilter.payment_status = paymentStatus;
      if (disputeStatus) multiVendorFilter.dispute_status = disputeStatus;
      if (startDate || endDate) {
        multiVendorFilter.createdAt = {};
        if (startDate) multiVendorFilter.createdAt.$gte = new Date(startDate);
        if (endDate) multiVendorFilter.createdAt.$lte = new Date(endDate);
      }

      const multiVendorOrders = await OrderMultiVendor.find(multiVendorFilter)
        .populate("customerId", "name email phone address")
        .populate("products.productId")
        .populate("products.farmerId", "name email")
        .populate("products.supplierId", "name email")
        .sort({ createdAt: -1 })
        .skip(orderType === "all" ? skip : 0)
        .limit(orderType === "all" ? parseInt(limit) : 1000)
        .lean();

      allOrders.push(...multiVendorOrders.map(order => ({
        ...order,
        orderType: "multivendor",
        status: order.orderStatus
      })));
    }

    // Get orders from old Order model
    if (orderType === "all" || orderType === "old") {
      const oldOrderFilter = {};
      if (status) oldOrderFilter.status = status;
      if (paymentStatus) {
        oldOrderFilter["paymentInfo.status"] = paymentStatus;
      }
      if (disputeStatus) oldOrderFilter.dispute_status = disputeStatus;
      if (startDate || endDate) {
        oldOrderFilter.createdAt = {};
        if (startDate) oldOrderFilter.createdAt.$gte = new Date(startDate);
        if (endDate) oldOrderFilter.createdAt.$lte = new Date(endDate);
      }

      const oldOrders = await Order.find(oldOrderFilter)
        .populate("products.productId")
        .sort({ createdAt: -1 })
        .skip(orderType === "all" ? skip : 0)
        .limit(orderType === "all" ? parseInt(limit) : 1000)
        .lean();

      // Manually populate userId based on userRole (buyer or farmer)
      const populatedOldOrders = await Promise.all(oldOrders.map(async (order) => {
        let customerInfo = {
          name: "N/A",
          email: "N/A",
          phone: "N/A",
          address: "N/A"
        };

        if (order.userId && order.userRole) {
          try {
            let customer = null;
            if (order.userRole === "buyer") {
              customer = await buyer.findById(order.userId).select("name email phone address").lean();
            } else if (order.userRole === "farmer") {
              customer = await farmer.findById(order.userId).select("name email phone address").lean();
            }

            if (customer) {
              customerInfo = {
                name: customer.name || "N/A",
                email: customer.email || "N/A",
                phone: customer.phone || order.shippingAddress?.phoneNumber || "N/A",
                address: customer.address || `${order.shippingAddress?.street || ""}, ${order.shippingAddress?.city || ""}`.replace(/^,\s*|,\s*$/g, "") || "N/A"
              };
            }
          } catch (populateError) {
            console.error("Error populating customer info:", populateError);
            if (order.shippingAddress) {
              customerInfo.phone = order.shippingAddress.phoneNumber || "N/A";
              customerInfo.address = `${order.shippingAddress.street || ""}, ${order.shippingAddress.city || ""}`.replace(/^,\s*|,\s*$/g, "") || "N/A";
            }
          }
        } else if (order.shippingAddress) {
          customerInfo.phone = order.shippingAddress.phoneNumber || "N/A";
          customerInfo.address = `${order.shippingAddress.street || ""}, ${order.shippingAddress.city || ""}`.replace(/^,\s*|,\s*$/g, "") || "N/A";
        }

        return {
          ...order,
          orderType: "old",
          userId: order.userId ? {
            _id: order.userId,
            ...customerInfo
          } : null,
          customerId: order.userId ? {
            _id: order.userId,
            ...customerInfo
          } : null,
          buyerId: order.userId ? {
            _id: order.userId,
            ...customerInfo
          } : null,
          customer: customerInfo,
          customerModel: order.userRole === "buyer" ? "Buyer" : "Farmer"
        };
      }));

      allOrders.push(...populatedOldOrders);
    }

    // Sort all orders by creation date
    allOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Apply pagination if getting all orders
    const paginatedOrders = orderType === "all" 
      ? allOrders.slice(skip, skip + parseInt(limit))
      : allOrders;

    const total = allOrders.length;

    res.status(200).json({
      success: true,
      count: paginatedOrders.length,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      orders: paginatedOrders
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get order by ID (works with both models)
 */
export const getOrderByIdAdmin = async (req, res, next) => {
  try {
    const { orderId } = req.params;

    // Try OrderMultiVendor first
    let order = await OrderMultiVendor.findById(orderId)
      .populate("customerId", "name email phone address")
      .populate("products.productId")
      .populate("products.farmerId", "name email")
      .populate("products.supplierId", "name email");

    if (order) {
      return res.status(200).json({
        success: true,
        order: {
          ...order.toObject(),
          orderType: "multivendor",
          status: order.orderStatus
        }
      });
    }

    // Try old Order model
    order = await Order.findById(orderId)
      .populate("products.productId")
      .lean();

    if (!order) {
      return next(new ErrorHandler("Order not found", 404));
    }

    // Manually populate userId based on userRole (buyer or farmer)
    let customerInfo = {
      name: "N/A",
      email: "N/A",
      phone: "N/A",
      address: "N/A"
    };

    if (order.userId && order.userRole) {
      try {
        let customer = null;
        if (order.userRole === "buyer") {
          customer = await buyer.findById(order.userId).select("name email phone address").lean();
        } else if (order.userRole === "farmer") {
          customer = await farmer.findById(order.userId).select("name email phone address").lean();
        }

        if (customer) {
          customerInfo = {
            name: customer.name || "N/A",
            email: customer.email || "N/A",
            phone: customer.phone || order.shippingAddress?.phoneNumber || "N/A",
            address: customer.address || `${order.shippingAddress?.street || ""}, ${order.shippingAddress?.city || ""}`.replace(/^,\s*|,\s*$/g, "") || "N/A"
          };
        }
      } catch (populateError) {
        console.error("Error populating customer info:", populateError);
        if (order.shippingAddress) {
          customerInfo.phone = order.shippingAddress.phoneNumber || "N/A";
          customerInfo.address = `${order.shippingAddress.street || ""}, ${order.shippingAddress.city || ""}`.replace(/^,\s*|,\s*$/g, "") || "N/A";
        }
      }
    } else if (order.shippingAddress) {
      customerInfo.phone = order.shippingAddress.phoneNumber || "N/A";
      customerInfo.address = `${order.shippingAddress.street || ""}, ${order.shippingAddress.city || ""}`.replace(/^,\s*|,\s*$/g, "") || "N/A";
    }

    res.status(200).json({
      success: true,
      order: {
        ...order,
        orderType: "old",
        userId: order.userId ? {
          _id: order.userId,
          ...customerInfo
        } : null,
        customerId: order.userId ? {
          _id: order.userId,
          ...customerInfo
        } : null,
        buyerId: order.userId ? {
          _id: order.userId,
          ...customerInfo
        } : null,
        customer: customerInfo,
        customerModel: order.userRole === "buyer" ? "Buyer" : "Farmer"
      }
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// DISPUTE MANAGEMENT FOR ADMIN
// ============================================

/**
 * Get all disputes
 */
export const getAllDisputes = async (req, res, next) => {
  try {
    const { 
      status, 
      disputeType,
      startDate, 
      endDate, 
      page = 1, 
      limit = 20 
    } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (disputeType) filter.disputeType = disputeType;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const disputes = await Dispute.find(filter)
      .populate("buyerId", "name email phone")
      .populate("sellerId", "name email phone")
      .populate("adminRuling.adminId", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Manually populate orderId from both Order and OrderMultiVendor models
    const disputesWithOrders = await Promise.all(
      disputes.map(async (dispute) => {
        if (dispute.orderId) {
          // Try OrderMultiVendor first (new model)
          let order = await OrderMultiVendor.findById(dispute.orderId)
            .populate("customerId", "name email phone")
            .populate("products.productId", "name price images")
            .lean();
          
          // If not found, try old Order model
          if (!order) {
            order = await Order.findById(dispute.orderId)
              .populate("userId", "name email phone")
              .populate("products.productId", "name price images")
              .lean();
          }
          
          dispute.orderId = order || dispute.orderId;
        }
        return dispute;
      })
    );

    const total = await Dispute.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: disputesWithOrders.length,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      disputes: disputesWithOrders
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get dispute by ID
 */
export const getDisputeById = async (req, res, next) => {
  try {
    const { disputeId } = req.params;

    const dispute = await Dispute.findById(disputeId)
      .populate("buyerId", "name email phone address")
      .populate("sellerId", "name email phone address")
      .populate("adminRuling.adminId", "name email")
      .lean();

    if (!dispute) {
      return next(new ErrorHandler("Dispute not found", 404));
    }

    // Manually populate orderId from both Order and OrderMultiVendor models
    if (dispute.orderId) {
      // Try OrderMultiVendor first (new model)
      let order = await OrderMultiVendor.findById(dispute.orderId)
        .populate("customerId", "name email phone address")
        .populate("products.productId", "name price images")
        .populate("products.farmerId", "name email phone")
        .populate("products.supplierId", "name email phone")
        .lean();
      
      // If not found, try old Order model
      if (!order) {
        order = await Order.findById(dispute.orderId)
          .populate("userId", "name email phone address")
          .populate("products.productId", "name price images")
          .lean();
      }
      
      dispute.orderId = order || dispute.orderId;
    }

    res.status(200).json({
      success: true,
      dispute
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Notify parties about a dispute (admin only)
 * POST /api/v1/admin/disputes/:disputeId/notify
 */
export const notifyDispute = async (req, res, next) => {
  try {
    const { disputeId } = req.params;
    const { target = 'both', title, message, sendEmail = true } = req.body;

    const dispute = await Dispute.findById(disputeId)
      .populate('buyerId')
      .populate('sellerId')
      .lean();

    if (!dispute) return next(new ErrorHandler('Dispute not found', 404));

    const { createNotification } = await import('../utils/notifications.js');
    const { buyer } = await import('../models/buyer.js');
    const { farmer } = await import('../models/farmer.js');
    const { supplier } = await import('../models/supplier.js');

    // Helper to determine buyer role (buyer or farmer)
    const resolveBuyerRole = async (id) => {
      if (!id) return null;
      const b = await buyer.findById(id);
      if (b) return 'buyer';
      const f = await farmer.findById(id);
      if (f) return 'farmer';
      const s = await supplier.findById(id);
      if (s) return 'supplier';
      return null;
    };

    const notifyTargets = [];
    if (target === 'buyer' || target === 'both') notifyTargets.push('buyer');
    if (target === 'seller' || target === 'both') notifyTargets.push('seller');

    const promises = notifyTargets.map(async (t) => {
      if (t === 'buyer' && dispute.buyerId) {
        const resolvedRole = await resolveBuyerRole(dispute.buyerId);
        const roleToUse = resolvedRole || 'buyer';
        return createNotification(
          dispute.buyerId,
          roleToUse,
          'admin_notice',
          title || 'Notification from Admin',
          message || `Admin message regarding dispute #${disputeId}`,
          {
            relatedId: dispute._id,
            relatedType: 'dispute',
            priority: 'high',
            actionUrl: `/disputes/${dispute._id}`,
            sendEmail
          }
        );
      }
      if (t === 'seller' && dispute.sellerId) {
        const sellerRole = dispute.sellerRole || 'farmer';
        return createNotification(
          dispute.sellerId,
          sellerRole,
          'admin_notice',
          title || 'Notification from Admin',
          message || `Admin message regarding dispute #${disputeId}`,
          {
            relatedId: dispute._id,
            relatedType: 'dispute',
            priority: 'high',
            actionUrl: `/disputes/${dispute._id}`,
            sendEmail
          }
        );
      }
      return null;
    });

    await Promise.allSettled(promises);

    res.status(200).json({ success: true, message: 'Notifications sent (or queued) to selected parties' });
  } catch (error) {
    next(error);
  }
};

// ============================================
// USER SUSPENSION MANAGEMENT
// ============================================

/**
 * Suspend user account
 */
export const suspendUser = async (req, res, next) => {
  try {
    const { userId, role } = req.params;
    const { duration, reason } = req.body; // duration in minutes
    const adminId = req.adminId;
    const adminName = req.user?.name || "Admin";

    if (!["buyer", "farmer", "supplier"].includes(role)) {
      return next(new ErrorHandler("Invalid role", 400));
    }

    // Ensure duration is a valid positive integer
    const suspensionDuration = parseInt(duration);
    if (isNaN(suspensionDuration) || suspensionDuration <= 0) {
      return next(new ErrorHandler("Suspension duration (in minutes) is required and must be positive", 400));
    }

    let UserModel;
    if (role === "buyer") UserModel = buyer;
    else if (role === "farmer") UserModel = farmer;
    else UserModel = supplier;

    const user = await UserModel.findById(userId);
    if (!user) {
      return next(new ErrorHandler("User not found", 404));
    }

    // --- Time Calculation & Storage ---

    // 1. Calculate the suspension end time (stores as a standard UTC Date object)
    const suspendedUntilUTC = new Date();
    suspendedUntilUTC.setMinutes(suspendedUntilUTC.getMinutes() + suspensionDuration);
    
    // 2. Define options for PKT display
    const options = {
      timeZone: 'Asia/Karachi', 
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    };
    
    // 3. Create the formatted PKT string for notifications and response
    // This is the string representation, not the Date object for the DB.
    const suspendedUntilPKTString = suspendedUntilUTC.toLocaleString('en-US', options);

    // --- Update User Model ---

    user.isSuspended = true;
    // CRITICAL FIX: Store the actual UTC Date object in the database
    user.suspendedUntil = suspendedUntilUTC; 
    user.suspensionReason = reason || "Policy violation";
    user.isActive = false;

    await user.save();

    // --- Audit Log ---

    await createAuditLog(
      adminId,
      adminName,
      "user_suspended",
      "user",
      userId,
      {
        entityName: user.email,
        details: { 
          duration: suspensionDuration, 
          reason: user.suspensionReason, 
          // Log the readable PKT string
          suspendedUntilPKT: suspendedUntilPKTString 
        }
      }
    );

    // --- Send Notification ---

    await createNotification(
      userId,
      role,
      "account_suspended",
      "Account Suspended",
      // Use the correctly formatted PKT string for the message
      `Your account has been suspended until ${suspendedUntilPKTString}. Reason: ${user.suspensionReason}`, 
      { priority: "high", sendEmail: true }
    );

    // --- Response ---

    res.status(200).json({
      success: true,
      // Use the correctly formatted PKT string for the response message
      message: `User suspended until ${suspendedUntilPKTString}`, 
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        isSuspended: user.isSuspended,
        // Send the UTC time back, or the formatted string (sending both is safest)
        suspendedUntilUTC: user.suspendedUntil, 
        suspendedUntilPKT: suspendedUntilPKTString,
        suspensionReason: user.suspensionReason
      }
    });
  } catch (error) {
    next(error);
  }
};
/**
 * Lift user suspension
 */
export const unsuspendUser = async (req, res, next) => {
  try {
    const { userId, role } = req.params;
    const adminId = req.adminId;
    const adminName = req.user?.name || "Admin";

    if (!["buyer", "farmer", "supplier"].includes(role)) {
      return next(new ErrorHandler("Invalid role", 400));
    }

    let UserModel;
    if (role === "buyer") UserModel = buyer;
    else if (role === "farmer") UserModel = farmer;
    else UserModel = supplier;

    const user = await UserModel.findById(userId);
    if (!user) {
      return next(new ErrorHandler("User not found", 404));
    }

    if (!user.isSuspended) {
      return next(new ErrorHandler("User is not suspended", 400));
    }

    user.isSuspended = false;
    user.suspendedUntil = null;
    user.suspensionReason = null;
    user.isActive = true;

    await user.save();

    // Create audit log
    await createAuditLog(
      adminId,
      adminName,
      "user_unsuspended",
      "user",
      userId,
      {
        entityName: user.email
      }
    );

    // Send notification
    await createNotification(
      userId,
      role,
      "account_activated",
      "Account Suspension Lifted",
      "Your account suspension has been lifted. You can now access your account normally.",
      { priority: "medium", sendEmail: true }
    );

    res.status(200).json({
      success: true,
      message: "User suspension lifted successfully",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        isSuspended: user.isSuspended
      }
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// PASSWORD MANAGEMENT
// ============================================

/**
 * Reset user password (admin can force reset)
 */
export const resetUserPassword = async (req, res, next) => {
  try {
    const { userId, role } = req.params;
    const { generateTemporary } = req.body; // If true, generate temp password
    const adminId = req.adminId;
    const adminName = req.user?.name || "Admin";

    if (!["buyer", "farmer", "supplier"].includes(role)) {
      return next(new ErrorHandler("Invalid role", 400));
    }

    let UserModel;
    if (role === "buyer") UserModel = buyer;
    else if (role === "farmer") UserModel = farmer;
    else UserModel = supplier;

    const user = await UserModel.findById(userId).select("+password");
    if (!user) {
      return next(new ErrorHandler("User not found", 404));
    }

    let newPassword;
    const { newPassword: providedPassword } = req.body;
    
    if (providedPassword) {
      // Admin provided password - validate it
      if (!validatePassword(providedPassword, next)) return;
      newPassword = providedPassword;
    } else {
      // No password provided - generate temporary password
      // Generate password matching system pattern: exactly 8 chars, uppercase, lowercase, number, special char
      const lowercase = "abcdefghijklmnopqrstuvwxyz";
      const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      const numbers = "0123456789";
      const special = "!@#$%^&*()_+-=[]{}|;:',.<>?/~";
      
      // Generate random password with required characters
      let tempPassword = "";
      tempPassword += lowercase[Math.floor(Math.random() * lowercase.length)];
      tempPassword += uppercase[Math.floor(Math.random() * uppercase.length)];
      tempPassword += numbers[Math.floor(Math.random() * numbers.length)];
      tempPassword += special[Math.floor(Math.random() * special.length)];
      
      // Fill remaining length to exactly 8 chars
      const allChars = lowercase + uppercase + numbers + special;
      for (let i = tempPassword.length; i < 8; i++) {
        tempPassword += allChars[Math.floor(Math.random() * allChars.length)];
      }
      
      // Shuffle the password
      newPassword = tempPassword.split('').sort(() => Math.random() - 0.5).join('');
    }

    user.password = await hashPassword(newPassword);
    await user.save();

    // Create audit log
    await createAuditLog(
      adminId,
      adminName,
      "user_password_reset",
      "user",
      userId,
      {
        entityName: user.email,
        details: { temporaryPassword: !providedPassword }
      }
    );

    // Send email with new password
    if (user.email) {
      await sendEmail(
        user.email,
        "Password Reset by Admin",
        `Dear ${user.name},\n\nYour password has been reset by an administrator.\n\n${!providedPassword ? `Your temporary password is: ${newPassword}\n\nPlease change this password after logging in.` : "Please use your new password to login."}\n\nThank you!`
      );
    }

    res.status(200).json({
      success: true,
      message: "Password reset successfully",
      ...(!providedPassword && { temporaryPassword: newPassword })
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// VIEW FULL USER PROFILE
// ============================================

/**
 * Get full user profile with related data
 */
export const getUserFullProfile = async (req, res, next) => {
  try {
    const { userId, role } = req.params;

    if (!["buyer", "farmer", "supplier"].includes(role)) {
      return next(new ErrorHandler("Invalid role", 400));
    }

    let UserModel;
    if (role === "buyer") UserModel = buyer;
    else if (role === "farmer") UserModel = farmer;
    else UserModel = supplier;

    const user = await UserModel.findById(userId)
      .select("+failedLoginAtempt +lockUntil");

    if (!user) {
      return next(new ErrorHandler("User not found", 404));
    }

    const profile = {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        img: user.img,
        verified: user.verified,
        isActive: user.isActive,
        isAccountDeleted: user.isAccountDeleted,
        isSuspended: user.isSuspended,
        suspendedUntil: user.suspendedUntil,
        suspensionReason: user.suspensionReason,
        failedLoginAtempt: user.failedLoginAtempt,
        lockUntil: user.lockUntil,
        deletedAt: user.deletedAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    };

    // Add role-specific data
    if (role === "buyer") {
      // Get buyer's orders
      const orders = await OrderMultiVendor.find({ customerId: userId })
        .populate("products.productId", "name price images")
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();

      profile.orders = orders;
      profile.totalOrders = await OrderMultiVendor.countDocuments({ customerId: userId });
    } else if (role === "farmer" || role === "supplier") {
      // Get seller's products
      const products = await product.find({ "upLoadedBy.userID": userId })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();

      profile.products = products;
      profile.totalProducts = await product.countDocuments({ "upLoadedBy.userID": userId });

      // Get seller's orders (orders where their products are included)
      const sellerOrders = await OrderMultiVendor.find({
        $or: [
          { "products.farmerId": userId },
          { "products.supplierId": userId }
        ]
      })
        .populate("customerId", "name email phone")
        .populate("products.productId", "name price")
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();

      // Filter to only show orders with seller's products
      const filteredOrders = sellerOrders.map(order => {
        const sellerProducts = order.products.filter(p => 
          (role === "farmer" && p.farmerId && p.farmerId.toString() === userId) ||
          (role === "supplier" && p.supplierId && p.supplierId.toString() === userId)
        );
        return {
          ...order,
          products: sellerProducts
        };
      }).filter(order => order.products.length > 0);

      profile.ordersReceived = filteredOrders;
      profile.totalOrdersReceived = await OrderMultiVendor.countDocuments({
        $or: [
          { "products.farmerId": userId },
          { "products.supplierId": userId }
        ]
      });

      // Get delivered orders count
      const deliveredOrders = filteredOrders.filter(order => 
        order.orderStatus === "delivered" || order.orderStatus === "received"
      );
      profile.ordersDelivered = deliveredOrders.length;
    }

    res.status(200).json({
      success: true,
      profile
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// ADMIN ORDER OVERRIDE
// ============================================

/**
 * Admin change order status (override)
 */
export const adminChangeOrderStatus = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { status, reason } = req.body;
    const adminId = req.adminId;
    const adminName = req.user?.name || "Admin";

    // Find order
    let order = await OrderMultiVendor.findById(orderId);
    let isMultiVendor = true;
    
    if (!order) {
      order = await Order.findById(orderId);
      isMultiVendor = false;
    }

    if (!order) {
      return next(new ErrorHandler("Order not found", 404));
    }

    const oldStatus = isMultiVendor ? order.orderStatus : order.status;

    if (!status) {
      return next(new ErrorHandler("Status is required", 400));
    }

    // Validate status
    const validStatuses = isMultiVendor 
      ? ["processing", "confirmed", "shipped", "delivered", "received", "cancelled"]
      : ["pending", "processing", "shipped", "delivered", "received", "canceled"];

    if (!validStatuses.includes(status)) {
      return next(new ErrorHandler(`Invalid status. Valid statuses: ${validStatuses.join(", ")}`, 400));
    }

    // Update status
    if (isMultiVendor) {
      order.orderStatus = status;
      if (status === "shipped") order.shippedAt = new Date();
      if (status === "delivered") order.deliveredAt = new Date();
      if (status === "received") order.receivedAt = new Date();
    } else {
      order.status = status;
      if (status === "shipped") order.shippedAt = new Date();
      if (status === "delivered") order.deliveredAt = new Date();
      if (status === "received") order.receivedAt = new Date();
    }

    await order.save();

    // Log order change
    await logOrderChange(
      order._id,
      isMultiVendor ? "multivendor" : "old",
      { userId: adminId, role: "admin", name: adminName },
      "status",
      oldStatus,
      status,
      reason || null,
      "Admin override"
    );

    // Create audit log
    await createAuditLog(
      adminId,
      adminName,
      "order_status_changed",
      "order",
      order._id,
      {
        entityName: `Order ${order._id}`,
        details: { oldStatus, newStatus: status, reason }
      }
    );

    // Send notification to customer
    const customerId = isMultiVendor ? order.customerId : order.userId;
    const customerModel = isMultiVendor ? order.customerModel : (order.userRole === "buyer" ? "Buyer" : "Farmer");
    
    let customer = null;
    if (customerModel === "Buyer" || customerModel === "buyer") {
      customer = await buyer.findById(customerId);
    } else {
      customer = await farmer.findById(customerId);
    }
    if (customer) {
      
      const notificationType = status === 'canceled' || status === 'cancelled'
          ? 'order_cancelled' 
          : `order_${status}`; 
  
      await createNotification(
          customerId,
          customerModel.toLowerCase(),
          // Use the dynamically generated type
          notificationType, 
          "Order Status Updated",
          `Your order #${orderId} status has been changed to ${status} by admin.${reason ? ` Reason: ${reason}` : ""}`,
          {
              relatedId: order._id,
              relatedType: "order",
              priority: "high",
              sendEmail: true
          }
      );
  }
    if (customer) {
      await createNotification(
        customerId,
        customerModel.toLowerCase(),
        "order_status_changed",
        "Order Status Updated",
        `Your order #${orderId} status has been changed to ${status} by admin.${reason ? ` Reason: ${reason}` : ""}`,
        {
          relatedId: order._id,
          relatedType: "order",
          priority: "high",
          sendEmail: true
        }
      );
    }

    res.status(200).json({
      success: true,
      message: "Order status changed successfully",
      order
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin change payment status
 */
export const adminChangePaymentStatus = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { paymentStatus, reason } = req.body;
    const adminId = req.adminId;
    const adminName = req.user?.name || "Admin";

    // Find order
    let order = await OrderMultiVendor.findById(orderId);
    let isMultiVendor = true;
    
    if (!order) {
      order = await Order.findById(orderId);
      isMultiVendor = false;
    }

    if (!order) {
      return next(new ErrorHandler("Order not found", 404));
    }

    const oldPaymentStatus = order.payment_status;

    if (!paymentStatus) {
      return next(new ErrorHandler("Payment status is required", 400));
    }

    const validStatuses = ["pending", "complete", "refunded", "cancelled"];
    if (!validStatuses.includes(paymentStatus)) {
      return next(new ErrorHandler(`Invalid payment status. Valid statuses: ${validStatuses.join(", ")}`, 400));
    }

    // Update payment status
    order.payment_status = paymentStatus;
    if (order.paymentInfo) {
      order.paymentInfo.status = paymentStatus === "complete" ? "completed" : paymentStatus;
      if (paymentStatus === "complete") {
        order.paymentInfo.paidAt = new Date();
      }
    }

    await order.save();

    // Log order change
    await logOrderChange(
      order._id,
      isMultiVendor ? "multivendor" : "old",
      { userId: adminId, role: "admin", name: adminName },
      "payment_status",
      oldPaymentStatus,
      paymentStatus,
      reason || null,
      "Admin override"
    );

    // Create audit log
    await createAuditLog(
      adminId,
      adminName,
      "order_payment_changed",
      "order",
      order._id,
      {
        entityName: `Order ${order._id}`,
        details: { oldPaymentStatus, newPaymentStatus: paymentStatus, reason }
      }
    );

    res.status(200).json({
      success: true,
      message: "Payment status changed successfully",
      order
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// AUDIT LOGS & HISTORY
// ============================================

/**
 * Get audit logs
 */
export const getAuditLogs = async (req, res, next) => {
  try {
    const { adminId, action, entityType, entityId, startDate, endDate, page = 1, limit = 50 } = req.query;

    const { getAuditLogs: getLogs } = await import("../utils/auditLogger.js");
    const result = await getLogs({
      adminId,
      action,
      entityType,
      entityId,
      startDate,
      endDate,
      page: parseInt(page),
      limit: parseInt(limit)
    });

    res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get order history
 */
export const getOrderHistory = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const { getOrderHistory: getHistory } = await import("../utils/orderHistoryLogger.js");
    const result = await getHistory(orderId, {
      page: parseInt(page),
      limit: parseInt(limit)
    });

    // Convert timestamps to Pakistan timezone (PKT = UTC+5)
    const formatPakistanTime = (date) => {
      if (!date) return null;
      const utcDate = new Date(date);
      // Pakistan is UTC+5, so add 5 hours
      const pakistanTime = new Date(utcDate.getTime() + (5 * 60 * 60 * 1000));
      
      // Format as YYYY-MM-DD HH:mm:ss PKT
      const year = pakistanTime.getUTCFullYear();
      const month = String(pakistanTime.getUTCMonth() + 1).padStart(2, '0');
      const day = String(pakistanTime.getUTCDate()).padStart(2, '0');
      const hours = String(pakistanTime.getUTCHours()).padStart(2, '0');
      const minutes = String(pakistanTime.getUTCMinutes()).padStart(2, '0');
      const seconds = String(pakistanTime.getUTCSeconds()).padStart(2, '0');
      
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} PKT`;
    };

    // Format history entries with Pakistan time
    const formattedHistory = result.history.map(entry => ({
      _id: entry._id,
      orderId: entry.orderId,
      orderType: entry.orderType,
      changedBy: {
        userId: entry.changedBy.userId,
        role: entry.changedBy.role,
        name: entry.changedBy.name || "System"
      },
      changeType: entry.changeType,
      oldValue: entry.oldValue,
      newValue: entry.newValue,
      reason: entry.reason || null,
      notes: entry.notes || null,
      changedAt: formatPakistanTime(entry.createdAt),
      changedAtISO: entry.createdAt,
      timestamp: entry.createdAt
    }));

    res.status(200).json({
      success: true,
      count: formattedHistory.length,
      total: result.total,
      page: result.page,
      totalPages: result.totalPages,
      history: formattedHistory
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get product change history
 */
export const getProductHistory = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const { getProductHistory: getHistory } = await import("../utils/productHistoryLogger.js");
    const result = await getHistory(productId, {
      page: parseInt(page),
      limit: parseInt(limit)
    });

    res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
};