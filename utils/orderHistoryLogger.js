import { OrderHistory } from "../models/orderHistory.js";

/**
 * Log order status change
 */
export const logOrderChange = async (orderId, orderType, changedBy, changeType, oldValue, newValue, reason = null, notes = null) => {
  try {
    const history = await OrderHistory.create({
      orderId,
      orderType,
      changedBy: {
        userId: changedBy.userId,
        role: changedBy.role,
        name: changedBy.name || ""
      },
      changeType,
      oldValue,
      newValue,
      reason,
      notes
    });
    return history;
  } catch (error) {
    console.error("Failed to log order change:", error);
    // Don't throw - history logging shouldn't break main functionality
    return null;
  }
};

/**
 * Get order change history
 */
export const getOrderHistory = async (orderId, options = {}) => {
  try {
    const { limit = 50, page = 1 } = options;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const history = await OrderHistory.find({ orderId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await OrderHistory.countDocuments({ orderId });

    return {
      history,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit))
    };
  } catch (error) {
    console.error("Failed to get order history:", error);
    throw error;
  }
};

