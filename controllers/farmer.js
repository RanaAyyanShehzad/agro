import { farmer } from "../models/farmer.js";
import bcrypt from "bcrypt";
import { sendCookie } from "../utils/features.js"
import { sendSMS } from "../utils/sendSMS.js";
import { sendEmail } from "../utils/sendEmail.js";
import ErrorHandler from "../middlewares/error.js";
import jwt from "jsonwebtoken";
export const register = async (req, res, next) => {
  try {
    const { name, email, password, phone, address } = req.body;
    if (!name || name.trim() === "") {
      return next(new ErrorHandler("Name is required", 400));
    }
    //Checking email pattern
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return next(new ErrorHandler("Please provide a valid email", 400));
    }
    //checking password length and validity
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return next(new ErrorHandler("Password must be at least 8 characters long and include uppercase, lowercase, number, and special character.", 400));
    }
    //checking phone number
    const phoneRegex = /^\+92\d{10}$/;
    if (!phoneRegex.test(phone)) {
      return next(new ErrorHandler("Phone number must be in +92XXXXXXXXXX format", 400));
    }
    if (!address || address.trim() === "") {
      return next(new ErrorHandler("Address is required", 400));
    }
    // check user exit or not
    let user = await farmer.findOne({ email });
    if (user) return next(new ErrorHandler("User already exit", 409));

    //hashed password
    const hashedPassword = await bcrypt.hash(password, 10);
    user = await farmer.create({ name, email, password: hashedPassword, phone, address });
    sendCookie(user, "farmer", res, "Regestered Successfully", 201);
  } catch (error) {
    next(error);
  }
}
export const Login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    let user = await farmer.findOne({ email }).select("+password");
    if (!user) return next(new ErrorHandler("Invalid Email or Password", 404));

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return next(new ErrorHandler("Invalid Email or Password", 404));
    sendCookie(user, "farmer", res, `Welcome back, ${user.name}`, 201);
  } catch (error) {
    next(error);
  }

};
export const changePassword = async (req, res, next) => {
  try {
    const { token } = req.cookies;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const role = decoded.role;
    if (role != "farmer") {
      return next(new ErrorHandler("You are not allowed to change password"), 403);
    }
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword)
      return next(new ErrorHandler("Please fill all fields", 400));

    if (newPassword.length < 8 || !/[!@#$%^&*]/.test(newPassword))
      return next(new ErrorHandler("Password must be 8+ characters and include special characters", 400));

    const user = await farmer.findById(req.user._id).select("+password");

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) return next(new ErrorHandler("Old password is incorrect", 401));

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const getMyProfile = (req, res) => {
  res.status(200).json({
    success: true,
    user: req.user,
  });
};
export const Logout = (req, res) => {
  const { token } = req.cookies;
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const role = decoded.role;
  if (role != "farmer") {
    return next(new ErrorHandler("You are not allowed to logout"), 403);
  }
  res.status(200).cookie("token", "", { expires: new Date(Date.now()) }).json({
    success: true,
    user: req.user,
  });
};
export const deleteProfile = async (req, res, next) => {
  try {
    const { token } = req.cookies;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const role = decoded.role;
    if (role != "farmer") {
      return next(new ErrorHandler("You are not allowed to delete this profile"), 403);
    }
    let user = await farmer.findById(req.user._id);
    if (!user) return next(new ErrorHandler("Delete Failed", 404));
    await user.deleteOne();
    res.status(200).clearCookie("token").json({
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
export const getAllFarmers = async (req, res, next) => {
  try {
    const farmers = await farmer.find().select("-password"); // exclude password
    res.status(200).json({
      success: true,
      farmers,
    });
  } catch (error) {
    next(error);
  }
};
export const updateProfile = async (req, res, next) => {
  try {
    const { token } = req.cookies;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const role = decoded.role;
    if (role != "farmer") {
      return next(new ErrorHandler("You are not allowed to update profile"), 403);
    }
    const user = await farmer.findById(req.user._id);
    if (!user) return next(new ErrorHandler("Update Failed", 404));

    const { name, email, password, phone, address } = req.body;

    // Name validation
    if (!name?.trim()) return next(new ErrorHandler("Name is required", 400));
    user.name = name;

    // Email validation
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email))
        return next(new ErrorHandler("Please provide a valid email", 400));
      user.email = email;
    }

    // Phone validation
    if (phone) {
      const phoneRegex = /^\+92\d{10}$/;
      if (!phoneRegex.test(phone))
        return next(
          new ErrorHandler("Phone number must be in +92XXXXXXXXXX format", 400)
        );
      user.phone = phone;
    }

    // Address validation
    if (!address?.trim())
      return next(new ErrorHandler("Address is required", 400));
    user.address = address;

    await user.save();
    sendCookie(user, "farmer", res, "Updated successfully", 200);
  } catch (error) {
    next(error);
  }
};
export const sendOTP = async (req, res, next) => {
  try {
    const { email, phone } = req.body;
    let user;

    if (email) {
      user = await farmer.findOne({ email });
    } else if (phone) {
      user = await farmer.findOne({ phone });
    } else {
      return next(new ErrorHandler("Please provide email or phone", 400));
    }

    if (!user) return next(new ErrorHandler("User not found", 404));

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpiry = Date.now() + 2 * 60 * 1000;
    await user.save();

    if (email) {
      await sendEmail(email, "FarmConnect Password Reset OTP", `Your OTP is: ${otp}`);
    } else if (phone) {
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
    if (!otp || !newPassword) return next(new ErrorHandler("OTP and new password are required", 400));

    const user = email
      ? await farmer.findOne({ email })
      : await farmer.findOne({ phone });

    if (!user) return next(new ErrorHandler("User not found", 404));
    if (user.otp !== otp || user.otpExpiry < Date.now()) {
      return next(new ErrorHandler("Invalid or expired OTP", 400));
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return next(new ErrorHandler("Password does not meet requirements", 400));
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.otp = null;
    user.otpExpiry = null;
    await user.save();
    await sendEmail(email, "FarmConnect Password Reset", "Your password has been reset");
    res.status(200).json({
      success: true,
      message: "Password reset successful",
    });
  } catch (error) {
    next(error);
  }
};

