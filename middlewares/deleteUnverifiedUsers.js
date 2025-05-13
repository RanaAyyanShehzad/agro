// middlewares/deleteUnverifiedExpiredUsers.js
import { farmer } from "../models/farmer.js";
import { buyer } from "../models/buyer.js";
import { supplier } from "../models/supplier.js";

export const deleteUnverifiedUsers = async (req, res, next) => {
  try {
    const now = new Date();

    // Define cleanup logic for each user type
    const cleanup = async (Model, name) => {
      const result = await Model.deleteMany({
        verified: false,
        otpExpiry: { $lt: now },
      });
      if (result.deletedCount > 0) {
        console.log(`[${name}] Deleted ${result.deletedCount} expired unverified users`);
      }
    };

    await Promise.all([
      cleanup(farmer, "Farmer"),
      cleanup(buyer, "Buyer"),
      cleanup(supplier, "Supplier"),
    ]);

    next();
  } catch (error) {
    
    next();
  }
};
