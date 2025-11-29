import { ProductHistory } from "../models/productHistory.js";

/**
 * Log product change history
 */
export const logProductChange = async (productId, changedBy, changeType, oldValue, newValue, reason = null) => {
  try {
    const history = await ProductHistory.create({
      productId,
      changedBy: {
        userId: changedBy.userId,
        role: changedBy.role,
        name: changedBy.name || ""
      },
      changeType,
      oldValue,
      newValue,
      reason
    });
    return history;
  } catch (error) {
    console.error("Failed to log product change:", error);
    // Don't throw - history logging shouldn't break main functionality
    return null;
  }
};

/**
 * Get product change history
 */
export const getProductHistory = async (productId, options = {}) => {
  try {
    const { limit = 50, page = 1 } = options;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const history = await ProductHistory.find({ productId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await ProductHistory.countDocuments({ productId });

    return {
      history,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit))
    };
  } catch (error) {
    console.error("Failed to get product history:", error);
    throw error;
  }
};

