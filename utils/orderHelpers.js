/**
 * Calculate order status based on product statuses
 * @param {Object} order - Order document with products array
 * @returns {String} Calculated order status
 */
export const calculateOrderStatus = (order) => {
  if (!order || !order.products || order.products.length === 0) {
    return "pending";
  }

  const productStatuses = order.products.map(product => product.status);
  const uniqueStatuses = [...new Set(productStatuses)];

  // If all products have the same status, return that status
  if (uniqueStatuses.length === 1) {
    return uniqueStatuses[0];
  }

  // Mixed statuses - check for specific conditions
  if (productStatuses.includes("cancelled")) {
    return "partially_cancelled";
  }

  if (productStatuses.includes("received")) {
    return "partially_received";
  }

  if (productStatuses.includes("delivered")) {
    return "partially_delivered";
  }

  if (productStatuses.includes("shipped")) {
    return "partially_shipped";
  }

  if (productStatuses.includes("pending")) {
    return "pending"; // If any product is pending, order is pending
  }

  // Default to processing if no specific conditions match
  return "processing";
};

/**
 * Validate product status transition
 * @param {String} currentStatus - Current product status
 * @param {String} newStatus - New product status
 * @returns {Boolean} Whether transition is valid
 */
export const isValidStatusTransition = (currentStatus, newStatus) => {
  const validTransitions = {
    pending: ["confirmed", "cancelled", "rejected"], // Pending can go to confirmed (when accepted) or cancelled/rejected
    processing: ["confirmed", "shipped", "cancelled"], // Processing can go to confirmed, shipped, or cancelled
    confirmed: ["processing", "shipped", "cancelled"], // Confirmed can go to processing, shipped, or cancelled
    shipped: ["delivered"], // Shipped can only go to delivered (with time validation)
    delivered: ["received"], // Delivered can only go to received (when buyer confirms)
    received: [], // Final state - cannot change
    cancelled: [], // Final state - cannot change
    rejected: [] // Final state - cannot change
  };

  return validTransitions[currentStatus]?.includes(newStatus) || false;
};

