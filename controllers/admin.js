
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


// Controller functions
export const register = async (req, res, next) => {
  try {
    const { name, email, password, phone, address, imgURL } = req.body;

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