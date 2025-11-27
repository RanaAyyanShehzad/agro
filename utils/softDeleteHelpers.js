import { OrderMultiVendor } from "../models/orderMultiVendor.js";

/**
 * Check if a product has active orders
 * Active statuses: "processing", "confirmed", "shipped"
 * @param {String} productId - Product ID to check
 * @returns {Promise<{hasActiveOrders: Boolean, count: Number}>}
 */
export const checkActiveOrders = async (productId) => {
  try {
    const activeStatuses = ["processing", "confirmed", "shipped"];
    
    const orders = await OrderMultiVendor.find({
      "products.productId": productId,
      "products.status": { $in: activeStatuses },
      orderStatus: { $ne: "cancelled" }
    }).lean();

    const hasActiveOrders = orders.length > 0;
    
    return {
      hasActiveOrders,
      count: orders.length,
      orders: hasActiveOrders ? orders : []
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Check if a user (farmer/supplier) has active orders
 * @param {String} userId - User ID to check
 * @param {String} role - User role ("farmer" or "supplier")
 * @returns {Promise<{hasActiveOrders: Boolean, count: Number}>}
 */
export const checkUserActiveOrders = async (userId, role) => {
  try {
    const activeStatuses = ["processing", "confirmed", "shipped"];
    const field = role === "farmer" ? "products.farmerId" : "products.supplierId";
    
    const orders = await OrderMultiVendor.find({
      [field]: userId,
      "products.status": { $in: activeStatuses },
      orderStatus: { $ne: "cancelled" }
    }).lean();

    const hasActiveOrders = orders.length > 0;
    
    return {
      hasActiveOrders,
      count: orders.length,
      orders: hasActiveOrders ? orders : []
    };
  } catch (error) {
    throw error;
  }
};

