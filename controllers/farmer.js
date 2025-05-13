import { farmer } from "../models/farmer.js";
import { product } from "../models/products.js";
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

// Controller functions
export const register = async (req, res, next) => {
  try {
    const { name, email, password, phone, address, imgURL } = req.body;

    // Use the validation function
    await validation(next, name, email, password, phone, address);

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit
    const otpExpiry = new Date(Date.now() + 30 * 60 * 1000); // 10 minutes from now
    // Create user with hashed password
    user = await farmer.create({
      name,
      email,
      password: await hashPassword(password),
      phone,
      address,
      img: imgURL,
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

    const user = await farmer.findOne({ email });

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

    const user = await farmer.findOne({ email });

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
    let user = await farmer.findOne({ email }).select("+password");
    if (!user) return next(new ErrorHandler("Invalid Email or Password", 404));
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
    await sendEmail(email, "Login successfully", `Welcome back, ${user.name}!, We're thrilled to have you again`);
    sendCookie(user, "farmer", res, `Welcome back, ${user.name}`, 201);
  } catch (error) {
    next(error);
  }
};

export const getFarmerProfileWithProducts = async (req, res, next) => {
  try {
    const { farmerId } = req.params;

    // Find farmer
    const farmerProfile = await farmer.findOne({
      _id: farmerId,
      verified: true

    }).select("-password -otp -otpExpiry -failedLoginAtempt -lockUntil -createdAt -updatedAt");

    if (!farmerProfile) {
      return next(new ErrorHandler("Farmer not found", 404));
    }

    // Find products uploaded by this farmer
    const farmerProducts = await product.find({
      "upLoadedBy.userID": farmerId,
      "upLoadedBy.role": "farmer"
    });

    res.status(200).json({
      success: true,
      farmer: farmerProfile,
      products: farmerProducts
    });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    // Verify farmer role
    verifyUserRole(req.cookies.token, "farmer", next);

    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword)
      return next(new ErrorHandler("Please fill all fields", 400));

    // Validate new password
    if (!validatePassword(newPassword, next)) return;

    const user = await farmer.findById(req.user._id).select("+password");

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) return next(new ErrorHandler("Old password is incorrect", 401));

    user.password = await hashPassword(newPassword);
    await user.save();
    await sendEmail(user.email, "Password changed successfully",
      `${user.name}, your password has been successfully changed`
    )
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
    // Verify farmer role
    verifyUserRole(req.cookies.token, "farmer", next);

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
    // Verify farmer role
    verifyUserRole(req.cookies.token, "farmer", next);

    res.status(200)
      .cookie("token", "", {
        expires: new Date(Date.now()),
        sameSite: process.env.NODE_ENV === 'Development' ? "Lax" : "none", // Prevent CSRF (optional but recommended)
        secure: process.env.NODE_ENV === 'Development' ? false : true,
      })
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
    // Verify farmer role
    verifyUserRole(req.cookies.token, "farmer", next);

    let user = await farmer.findById(req.user._id);
    if (!user) return next(new ErrorHandler("Delete Failed", 404));
    const email = user.email;
    const name = user.name;
    await user.deleteOne();
    await sendEmail(email, "Account deleted successfully", `${name}, your account has been deleted successfully`);

    res.status(200)
      .clearCookie("token")
      .json({
        success: true,
        message: "Profile deleted successfully",
      });
  } catch (error) {
    next(error);
  }
};

export const getAllFarmers = async (req, res, next) => {
  try {
    verifyUserRole(req.cookies.token, "admin", next);
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
    // Verify farmer role
    verifyUserRole(req.cookies.token, "farmer", next);

    const user = await farmer.findById(req.user._id);
    if (!user) return next(new ErrorHandler("Update Failed", 404));

    const { name, email, phone, address, imgURL } = req.body;

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
    if (imgURL) {
      user.img = imgURL;
    }

    await user.save();
    await sendEmail(email, "Profile updated successfully", `${name}, your profile has been updated successfully`);
    sendCookie(user, "farmer", res, "Updated successfully", 200);
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
      user = await farmer.findOne({ email });
    } else {
      user = await farmer.findOne({ phone });
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
      await sendEmail(email, "FarmConnect Password Reset OTP",
        `Please don't share this verification code with anyone.
        If you made this request, plaese enter the 6 digit code on verify page :
               ${otp}    
        If you not made this request simply Ignore this`);
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
      ? await farmer.findOne({ email })
      : await farmer.findOne({ phone });

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
      await sendEmail(email, "FarmConnect Password Reset", "Your password has been reset successfully");
    }

    res.status(200).json({
      success: true,
      message: "Password reset successful",
    });
  } catch (error) {
    next(error);
  }
};