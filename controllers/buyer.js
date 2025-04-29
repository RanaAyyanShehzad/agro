import { buyer } from "../models/buyer.js";
import bcrypt from "bcrypt";
import { sendCookie } from "../utils/features.js"
import { sendSMS } from "../utils/sendSMS.js";
import { sendEmail } from "../utils/sendEmail.js";
import ErrorHandler from "../middlewares/error.js";
import { validation } from "../utils/condentialsValidation.js";
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

// Controller functions
export const register = async (req, res, next) => {
  try {
    const { name, email, password, phone, address } = req.body;
    
    // Use the validation function
    await validation(next, name, email, password, phone, address);
    
    // Check if user exists
    let user = await buyer.findOne({ email });
    if (user) return next(new ErrorHandler("User already exists", 409));

    // Create user with hashed password
    user = await buyer.create({ 
      name, 
      email, 
      password: await hashPassword(password), 
      phone, 
      address 
    });
    
    res.status(200).json({
      success: true,
      message: "Registered successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const Login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    let user = await buyer.findOne({ email }).select("+password");
    if (!user) return next(new ErrorHandler("Invalid Email or Password", 404));

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return next(new ErrorHandler("Invalid Email or Password", 404));
    
    sendCookie(user, "buyer", res, `Welcome back, ${user.name}`, 201);
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    // Verify buyer role
    verifyUserRole(req.cookies.token, "buyer", next);
    
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword)
      return next(new ErrorHandler("Please fill all fields", 400));

    // Validate new password
    if (!validatePassword(newPassword, next)) return;

    const user = await buyer.findById(req.user._id).select("+password");

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) return next(new ErrorHandler("Old password is incorrect", 401));

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

export const getMyProfile = (req, res, next) => {
  try {
    // Verify buyer role
    verifyUserRole(req.cookies.token, "buyer", next);
    
    res.status(200).json({
      success: true,
      user: req.user,
    });
  } catch (error) {
    // Error is handled in verifyUserRole
  }
};

export const Logout = (req, res, next) => {
  try {
    // Verify buyer role
    verifyUserRole(req.cookies.token, "buyer", next);
    
    res.status(200)
      .cookie("token", "", { expires: new Date(Date.now()) })
      .json({
        success: true,
        user: req.user,
      });
  } catch (error) {
    // Error is handled in verifyUserRole
  }
};

export const deleteProfile = async (req, res, next) => {
  try {
    // Verify buyer role
    verifyUserRole(req.cookies.token, "buyer", next);
    
    let user = await buyer.findById(req.user._id);
    if (!user) return next(new ErrorHandler("Delete Failed", 404));
    
    await user.deleteOne();
    
    res.status(200)
      .clearCookie("token")
      .json({
        success: true,
        message: "Profile deleted successfully",
      });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Can not Delete",
      error: error.message,
    });
  }
};

export const getAllBuyers = async (req, res, next) => {
  try {
    const buyers = await buyer.find().select("-password"); // exclude password
    
    res.status(200).json({
      success: true,
      buyers,
    });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    // Verify buyer role
    verifyUserRole(req.cookies.token, "buyer", next);
    
    const user = await buyer.findById(req.user._id);
    if (!user) return next(new ErrorHandler("Update Failed", 404));

    const { name, email, phone, address } = req.body;

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

    await user.save();
    sendCookie(user, "buyer", res, "Updated successfully", 200);
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
      user = await buyer.findOne({ email });
    } else {
      user = await buyer.findOne({ phone });
    }

    if (!user) return next(new ErrorHandler("User not found", 404));

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
      ? await buyer.findOne({ email })
      : await buyer.findOne({ phone });

    if (!user) return next(new ErrorHandler("User not found", 404));

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