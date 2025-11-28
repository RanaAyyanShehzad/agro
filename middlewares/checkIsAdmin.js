import jwt from "jsonwebtoken";
import ErrorHandler from "./error.js";

/**
 * Middleware to check if the authenticated user has Admin role
 * Must be used after isAuthenticated middleware
 */
export const checkIsAdmin = (req, res, next) => {
  try {
    const { token } = req.cookies;
    if (!token) {
      return next(new ErrorHandler("Authentication required", 401));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.role !== "admin") {
      return next(new ErrorHandler("Admin access required. You don't have permission to perform this action.", 403));
    }

    // Attach admin info to request
    req.adminId = decoded._id;
    req.adminRole = decoded.role;
    
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return next(new ErrorHandler("Invalid authentication token", 401));
    }
    if (error.name === "TokenExpiredError") {
      return next(new ErrorHandler("Authentication token expired", 401));
    }
    next(error);
  }
};

