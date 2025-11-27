/**
 * Calculate order status based on product statuses
 * @param {Object} order - Order document with products array
 * @returns {String} Calculated order status
 */
export const calculateOrderStatus = (order) => {
  if (!order || !order.products || order.products.length === 0) {
    return "processing";
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

  if (productStatuses.includes("delivered")) {
    return "partially_delivered";
  }

  if (productStatuses.includes("shipped")) {
    return "partially_shipped";
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
    processing: ["confirmed", "cancelled"],
    confirmed: ["shipped", "cancelled"],
    shipped: ["delivered"],
    delivered: [], // Final state
    cancelled: [] // Final state
  };

  return validTransitions[currentStatus]?.includes(newStatus) || false;
};

