import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import ErrorHandler from "../middlewares/error.js";

// General utility functions for authentication and user management
export const hashPassword = async (password) => {
  return await bcrypt.hash(password, 10);
};

export const validatePassword = (password, next) => {
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  if (!passwordRegex.test(password)) {
    next(new ErrorHandler("Password must be at least 8 characters long and include uppercase, lowercase, number, and special character.", 400));
    return false;
  }
  return true;
};

export const verifyUserRole = (token, expectedRole, next) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== expectedRole) {
      throw new Error("Unauthorized");
    }
    return decoded;
  } catch (error) {
    next(new ErrorHandler("You are not authorized for this action", 403));
    throw new Error("Authorization failed");
  }
};

// Generate OTP for password reset
export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Standard validators
export const validateEmail = (email, next) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    next(new ErrorHandler("Please provide a valid email", 400));
    return false;
  }
  return true;
};

export const validatePhone = (phone, next) => {
  const phoneRegex = /^\+92\d{10}$/;
  if (!phoneRegex.test(phone)) {
    next(new ErrorHandler("Phone number must be in +92XXXXXXXXXX format", 400));
    return false;
  }
  return true;
};

export const validateName = (name, next) => {
  if (!name || name.trim() === "") {
    next(new ErrorHandler("Name is required", 400));
    return false;
  }
  return true;
};

export const validateAddress = (address, next) => {
  if (!address || address.trim() === "") {
    next(new ErrorHandler("Address is required", 400));
    return false;
  }
  return true;
};