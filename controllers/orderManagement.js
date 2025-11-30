import { Order } from "../models/order.js";
import { OrderMultiVendor } from "../models/orderMultiVendor.js";
import { Dispute } from "../models/dispute.js";
import { SystemConfig, CONFIG_KEYS } from "../models/systemConfig.js";
import { buyer } from "../models/buyer.js";
import { farmer } from "../models/farmer.js";
import { supplier } from "../models/supplier.js";
import { product } from "../models/products.js";
import ErrorHandler from "../middlewares/error.js";
import { sendEmail } from "../utils/sendEmail.js";
import { createNotification } from "../utils/notifications.js";
import { logOrderChange } from "../utils/orderHistoryLogger.js";
import jwt from "jsonwebtoken";

/**
 * Get user ID and role from token
 */
const getUserFromToken = (req) => {
  const { token } = req.cookies;
  if (!token) throw new ErrorHandler("Authentication required", 401);
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  return { userId: decoded._id, role: decoded.role };
};

/**
 * Helper function to populate orderId from both Order and OrderMultiVendor models
 */
/**
 * Populate buyer and seller information in dispute
 */
const populateBuyerSeller = async (dispute) => {
  try {
    // Populate buyerId - could be Buyer or Farmer
    const buyerId = dispute.buyerId?._id || dispute.buyerId;
    if (buyerId) {
      let buyerInfo = await buyer.findById(buyerId).select("name email phone").lean();
      if (!buyerInfo) {
        buyerInfo = await farmer.findById(buyerId).select("name email phone").lean();
      }
      dispute.buyerId = buyerInfo || buyerId;
    }

    // Populate sellerId - could be Farmer or Supplier (based on sellerRole)
    const sellerId = dispute.sellerId?._id || dispute.sellerId;
    if (sellerId) {
      let sellerInfo = null;
      if (dispute.sellerRole === "farmer") {
        sellerInfo = await farmer.findById(sellerId).select("name email phone").lean();
      } else if (dispute.sellerRole === "supplier") {
        sellerInfo = await supplier.findById(sellerId).select("name email phone").lean();
      }
      dispute.sellerId = sellerInfo || sellerId;
    }
  } catch (error) {
    console.error("Error populating buyer/seller info:", error);
  }
};

const populateOrderId = async (dispute) => {
  if (!dispute || !dispute.orderId) {
    return dispute;
  }

  // If orderId is already populated (object), return as is
  if (typeof dispute.orderId === 'object' && dispute.orderId !== null && !dispute.orderId._id) {
    return dispute;
  }

  const orderId = dispute.orderId._id || dispute.orderId;

  // Try OrderMultiVendor first (new model)
  let order = await OrderMultiVendor.findById(orderId)
    .populate("customerId", "name email phone")
    .populate("products.productId", "name price images")
    .lean();
  
  // If not found, try old Order model
  if (!order) {
    order = await Order.findById(orderId)
      .populate("userId", "name email phone")
      .populate("products.productId", "name price images")
      .lean();
  }
  
  dispute.orderId = order || dispute.orderId;
  return dispute;
};

/**
 * Update order status from shipped to delivered (with time validation)
 */
export const updateOrderToDelivered = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { proofOfDelivery } = req.body; // { images: [], notes: "" }
    const { userId, role } = getUserFromToken(req);

    // Get configuration for minimum time
    const config = await SystemConfig.findOne({ 
      configKey: CONFIG_KEYS.SHIPPED_TO_DELIVERED_MINUTES 
    });
    const minMinutes = config?.configValue || 10; // Default 10 minutes for testing

    // Find order - check both models
    let order = await Order.findById(orderId);
    let isMultiVendor = false;
    
    if (!order) {
      order = await OrderMultiVendor.findById(orderId);
      isMultiVendor = true;
    }

    if (!order) {
      return next(new ErrorHandler("Order not found", 404));
    }

    // Check if user is seller (farmer/supplier) of products in this order
    let isSeller = false;
    if (isMultiVendor) {
      isSeller = order.products.some(p => 
        (p.farmerId && p.farmerId.toString() === userId && role === "farmer") ||
        (p.supplierId && p.supplierId.toString() === userId && role === "supplier")
      );
    } else {
      // For old Order model, check if user owns any products
      await order.populate("products.productId");
      isSeller = order.products.some(p => 
        p.productId?.upLoadedBy?.userID?.toString() === userId
      );
    }

    if (!isSeller && role !== "admin") {
      return next(new ErrorHandler("You don't have permission to update this order", 403));
    }

    // Check if dispute is open - cannot update status if dispute exists
    if (order.dispute_status === "open" || order.dispute_status === "pending_admin_review") {
      return next(new ErrorHandler(
        "Cannot update order status while dispute is open. Please resolve the dispute first.",
        400
      ));
    }

    // Validate status transition
    const currentStatus = isMultiVendor ? order.orderStatus : order.status;
    if (currentStatus !== "shipped") {
      return next(new ErrorHandler(
        `Cannot mark as delivered. Current status is "${currentStatus}". Order must be in "shipped" status.`,
        400
      ));
    }

    // Check time constraint - seller can't mark as delivered until min time has passed
    const shippedAt = order.shippedAt || order.updatedAt;
    if (!shippedAt) {
      return next(new ErrorHandler("Order shipped timestamp not found", 400));
    }

    const now = new Date();
    const timeDiff = (now - new Date(shippedAt)) / (1000 * 60); // minutes

    if (timeDiff < minMinutes) {
      const remainingMinutes = Math.ceil(minMinutes - timeDiff);
      return next(new ErrorHandler(
        `Cannot mark as delivered yet. Please wait ${remainingMinutes} more minute(s). Minimum ${minMinutes} minutes required after shipping.`,
        400
      ));
    }

    // Update order status
    if (isMultiVendor) {
      order.orderStatus = "delivered";
      order.deliveredAt = now;
      if (proofOfDelivery) {
        order.proofOfDelivery = {
          images: proofOfDelivery.images || [],
          notes: proofOfDelivery.notes || "",
          uploadedAt: now
        };
      }
    } else {
      order.status = "delivered";
      order.deliveredAt = now;
      order.deliveryInfo.actualDeliveryDate = now;
      if (proofOfDelivery) {
        order.proofOfDelivery = {
          images: proofOfDelivery.images || [],
          notes: proofOfDelivery.notes || "",
          uploadedAt: now
        };
      }
    }

    await order.save();

    // Log order change
    await logOrderChange(
      order._id,
      isMultiVendor ? "multivendor" : "old",
      { userId, role, name: "" },
      "delivered",
      "shipped",
      "delivered",
      null,
      "Seller marked order as delivered"
    );

    // Send email and notification to buyer
    try {
      const customerId = isMultiVendor ? order.customerId : order.userId;
      const customerModel = isMultiVendor ? order.customerModel : (order.userRole === "buyer" ? "Buyer" : "Farmer");
      
      let customer = null;
      if (customerModel === "Buyer" || customerModel === "buyer") {
        customer = await buyer.findById(customerId);
      } else {
        customer = await farmer.findById(customerId);
      }

      if (customer) {
        // Get confirmation time limit
        const config = await SystemConfig.findOne({ 
          configKey: CONFIG_KEYS.DELIVERED_TO_RECEIVED_MINUTES 
        });
        const confirmMinutes = config?.configValue || 1440; // Default 24 hours
        const confirmHours = Math.floor(confirmMinutes / 60);

        if (customer.email) {
          await sendEmail(
            customer.email,
            "Order Delivered - Please Confirm Receipt",
            `Dear ${customer.name},\n\nYour order #${orderId} has been delivered.\n\nPlease confirm receipt or report any issues within the next ${confirmHours} hours. If you don't respond, the order will be automatically confirmed.\n\nThank you!`
          );
        }

        // Create notification
        await createNotification(
          customerId,
          customerModel.toLowerCase(),
          "order_delivered",
          "Order Delivered - Please Confirm Receipt",
          `Your order #${orderId} has been delivered. Please confirm receipt within ${confirmHours} hours.`,
          {
            relatedId: order._id,
            relatedType: "order",
            actionUrl: `/orders/${orderId}`,
            priority: "high",
            sendEmail: false // Already sent email
          }
        );
      }
    } catch (emailError) {
      console.error("Failed to send delivery confirmation email:", emailError);
    }

    res.status(200).json({
      success: true,
      message: "Order marked as delivered successfully",
      order
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Buyer confirms receipt of order
 */
export const confirmOrderReceipt = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { userId, role } = getUserFromToken(req);

    if (role !== "buyer" && role !== "farmer") {
      return next(new ErrorHandler("Only buyers can confirm receipt", 403));
    }

    // Find order
    let order = await Order.findById(orderId);
    let isMultiVendor = false;
    
    if (!order) {
      order = await OrderMultiVendor.findById(orderId);
      isMultiVendor = true;
    }

    if (!order) {
      return next(new ErrorHandler("Order not found", 404));
    }

    // Verify buyer owns this order
    const customerId = isMultiVendor ? order.customerId : order.userId;
    if (customerId.toString() !== userId) {
      return next(new ErrorHandler("This order does not belong to you", 403));
    }

    // Check if order is in delivered status
    const currentStatus = isMultiVendor ? order.orderStatus : order.status;
    if (currentStatus !== "delivered") {
      return next(new ErrorHandler(
        `Cannot confirm receipt. Order status is "${currentStatus}". Order must be in "delivered" status.`,
        400
      ));
    }

    // Check if dispute is open
    if (order.dispute_status === "open" || order.dispute_status === "pending_admin_review") {
      return next(new ErrorHandler(
        "Cannot confirm receipt while dispute is open. Please resolve the dispute first.",
        400
      ));
    }

    // Update order status to received and payment to complete
    const now = new Date();
    if (isMultiVendor) {
      // Update all product statuses to received
      order.products.forEach(productItem => {
        if (productItem.status === "delivered") {
          productItem.status = "received";
          productItem.receivedAt = now;
        }
      });
      order.orderStatus = "received";
      order.receivedAt = now;
    } else {
      order.status = "received";
      order.receivedAt = now;
    }

    // Update payment status: mark as complete when buyer confirms receipt
    // For cash-on-delivery: payment is collected on delivery, so mark as complete
    // For online payment: payment should already be complete, but ensure it's marked
    order.payment_status = "complete";
    if (order.paymentInfo) {
      order.paymentInfo.status = "completed";
      // Set paidAt timestamp if not already set (for cash-on-delivery)
      if (!order.paymentInfo.paidAt) {
        order.paymentInfo.paidAt = now;
      }
    }

    await order.save();

    // Log order change
    await logOrderChange(
      order._id,
      isMultiVendor ? "multivendor" : "old",
      { userId, role, name: "" },
      "received",
      "delivered",
      "received",
      null,
      "Buyer confirmed receipt"
    );

    // Send notification to seller
    try {
      if (isMultiVendor) {
        // Get sellers from products
        const sellerIds = new Set();
        order.products.forEach(p => {
          if (p.farmerId) sellerIds.add({ id: p.farmerId, role: "farmer" });
          if (p.supplierId) sellerIds.add({ id: p.supplierId, role: "supplier" });
        });

        for (const sellerInfo of sellerIds) {
          let seller = null;
          if (sellerInfo.role === "farmer") {
            seller = await farmer.findById(sellerInfo.id);
          } else {
            seller = await supplier.findById(sellerInfo.id);
          }

          if (seller) {
            await createNotification(
              sellerInfo.id,
              sellerInfo.role,
              "order_received",
              "Order Confirmed by Buyer",
              `Order #${orderId} has been confirmed as received by the buyer. Payment status updated to complete.`,
              {
                relatedId: order._id,
                relatedType: "order",
                priority: "medium",
                sendEmail: true
              }
            );
          }
        }
      }
    } catch (notifError) {
      console.error("Failed to send confirmation notification:", notifError);
    }

    res.status(200).json({
      success: true,
      message: "Order receipt confirmed successfully",
      order
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a dispute for an order
 */
export const createDispute = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { disputeType, reason, proofOfFault } = req.body; // proofOfFault: { images: [], description: "" }
    const { userId, role } = getUserFromToken(req);

    if (role !== "buyer" && role !== "farmer") {
      return next(new ErrorHandler("Only buyers can create disputes", 403));
    }

    // Find order
    let order = await Order.findById(orderId);
    let isMultiVendor = false;
    
    if (!order) {
      order = await OrderMultiVendor.findById(orderId);
      isMultiVendor = true;
    }

    if (!order) {
      return next(new ErrorHandler("Order not found", 404));
    }

    // Verify buyer owns this order
    const customerId = isMultiVendor ? order.customerId : order.userId;
    if (customerId.toString() !== userId) {
      return next(new ErrorHandler("This order does not belong to you", 403));
    }

    // Check if order is in appropriate status for dispute
    const currentStatus = isMultiVendor ? order.orderStatus : order.status;
    
    // Dispute can be created at: shipped (if past estimated time), delivered, or received (within time window)
    if (!["shipped", "delivered", "received"].includes(currentStatus)) {
      return next(new ErrorHandler(
        `Cannot create dispute. Order must be in "shipped", "delivered", or "received" status. Current status: "${currentStatus}"`,
        400
      ));
    }

    // For "shipped" status: can create dispute if estimated delivery time has passed
    if (currentStatus === "shipped") {
      const expectedDeliveryDate = isMultiVendor ? order.expected_delivery_date : order.expected_delivery_date;
      if (expectedDeliveryDate) {
        const now = new Date();
        if (now < new Date(expectedDeliveryDate)) {
          return next(new ErrorHandler(
            `Cannot create dispute. Estimated delivery date has not passed yet. Expected delivery: ${new Date(expectedDeliveryDate).toLocaleString()}`,
            400
          ));
        }
      } else {
        // If no estimated delivery date, allow dispute after a reasonable time (e.g., 7 days)
        const shippedAt = isMultiVendor ? order.shippedAt : order.shippedAt;
        if (shippedAt) {
          const daysSinceShipped = (new Date() - new Date(shippedAt)) / (1000 * 60 * 60 * 24); // days
          if (daysSinceShipped < 7) {
            return next(new ErrorHandler(
              `Cannot create dispute. Order was shipped less than 7 days ago. Please wait for estimated delivery time.`,
              400
            ));
          }
        }
      }
    }

    // For "delivered" status: can create dispute if buyer didn't receive (non_delivery) or other issues
    // No time restriction - buyer can dispute immediately if they didn't receive
    if (currentStatus === "delivered") {
      // Allow dispute creation - buyer can dispute if they didn't receive the order
      // or if there are issues with the delivered product
    }

    // For "received" status: can create dispute within time window after confirmation
    if (currentStatus === "received") {
      const config = await SystemConfig.findOne({ 
        configKey: CONFIG_KEYS.DELIVERED_TO_RECEIVED_MINUTES 
      });
      const disputeWindowMinutes = config?.configValue || 1440; // Default 24 hours
      
      const receivedAt = isMultiVendor ? order.receivedAt : order.receivedAt;
      if (receivedAt) {
        const timeSinceReceived = (new Date() - new Date(receivedAt)) / (1000 * 60); // minutes
        if (timeSinceReceived > disputeWindowMinutes) {
          return next(new ErrorHandler(
            `Cannot create dispute. Order was confirmed more than ${disputeWindowMinutes} minutes ago. Please contact support.`,
            400
          ));
        }
      }
    }

    // Check if dispute already exists
    if (order.dispute_status !== "none") {
      return next(new ErrorHandler("A dispute already exists for this order", 400));
    }

    if (!disputeType || !reason) {
      return next(new ErrorHandler("disputeType and reason are required", 400));
    }

    // Get seller information
    let sellerId = null;
    let sellerRole = null;
    
    if (isMultiVendor) {
      // For multi-vendor, get the first seller (in real scenario, you might want to handle multiple sellers)
      const firstProduct = order.products[0];
      if (firstProduct.farmerId) {
        sellerId = firstProduct.farmerId;
        sellerRole = "farmer";
      } else if (firstProduct.supplierId) {
        sellerId = firstProduct.supplierId;
        sellerRole = "supplier";
      }
    } else {
      // For old Order model
      await order.populate("products.productId");
      const firstProduct = order.products[0];
      if (firstProduct?.productId?.upLoadedBy) {
        sellerId = firstProduct.productId.upLoadedBy.userID;
        sellerRole = firstProduct.productId.upLoadedBy.role;
      }
    }

    if (!sellerId) {
      return next(new ErrorHandler("Seller information not found", 400));
    }

    // Create dispute
    const dispute = await Dispute.create({
      orderId: order._id,
      buyerId: userId,
      sellerId,
      sellerRole,
      disputeType,
      reason,
      buyerProof: {
        images: proofOfFault?.images || [],
        description: proofOfFault?.description || "",
        uploadedAt: new Date()
      },
      status: "open"
    });

    // Update order
    order.dispute_status = "open";
    // Keep payment_status as pending
    if (order.payment_status !== "pending") {
      order.payment_status = "pending";
    }
    
    // Store proof of fault in order
    if (proofOfFault) {
      order.proofOfFault = {
        images: proofOfFault.images || [],
        description: proofOfFault.description || "",
        uploadedAt: new Date()
      };
    }

    await order.save();

    // Get dispute response time limit
    const config = await SystemConfig.findOne({ 
      configKey: CONFIG_KEYS.DISPUTE_RESPONSE_MINUTES 
    });
    const responseMinutes = config?.configValue || 10;

    // Send email and notification to seller
    try {
      let seller = null;
      if (sellerRole === "farmer") {
        seller = await farmer.findById(sellerId);
      } else if (sellerRole === "supplier") {
        seller = await supplier.findById(sellerId);
      }

      if (seller) {
        if (seller.email) {
          await sendEmail(
            seller.email,
            "Dispute Opened - Action Required",
            `Dear ${seller.name},\n\nA dispute has been opened for order #${orderId}.\n\nReason: ${reason}\n\nPlease respond with your evidence and proposal within ${responseMinutes} minutes. If you don't respond, the dispute will be automatically escalated to admin.\n\nThank you!`
          );
        }

        // Create notification
        await createNotification(
          sellerId,
          sellerRole,
          "dispute_opened",
          "Dispute Opened - Action Required",
          `A dispute has been opened for order #${orderId}. Please respond within ${responseMinutes} minutes.`,
          {
            relatedId: dispute._id,
            relatedType: "dispute",
            actionUrl: `/disputes/${dispute._id}`,
            priority: "high",
            sendEmail: false // Already sent email
          }
        );
      }
    } catch (emailError) {
      console.error("Failed to send dispute notification email:", emailError);
    }

    res.status(201).json({
      success: true,
      message: "Dispute created successfully",
      dispute
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Seller responds to dispute
 */
export const respondToDispute = async (req, res, next) => {
  try {
    const { disputeId } = req.params;
    const { evidence, proposal } = req.body; // evidence: [], proposal: ""
    const { userId, role } = getUserFromToken(req);

    if (role !== "farmer" && role !== "supplier") {
      return next(new ErrorHandler("Only sellers can respond to disputes", 403));
    }

    // Validate disputeId is a valid ObjectId
    if (!disputeId || !disputeId.match(/^[0-9a-fA-F]{24}$/)) {
      return next(new ErrorHandler("Invalid dispute ID format", 400));
    }

    const dispute = await Dispute.findById(disputeId);
    if (!dispute) {
      return next(new ErrorHandler("Dispute not found", 404));
    }

    // Verify seller owns this dispute
    if (dispute.sellerId.toString() !== userId || dispute.sellerRole !== role) {
      return next(new ErrorHandler("This dispute does not belong to you", 403));
    }

    if (dispute.status !== "open") {
      return next(new ErrorHandler("Dispute is not open for response", 400));
    }

    if (!evidence || !Array.isArray(evidence) || evidence.length === 0) {
      return next(new ErrorHandler("Evidence (array of image URLs) is required", 400));
    }

    if (!proposal || !proposal.trim()) {
      return next(new ErrorHandler("Proposal is required", 400));
    }

    // Check if dispute is within response time limit
    const config = await SystemConfig.findOne({ 
      configKey: CONFIG_KEYS.DISPUTE_RESPONSE_MINUTES 
    });
    const responseMinutes = config?.configValue || 10; // Default 10 minutes
    
    const disputeAge = (new Date() - dispute.createdAt) / (1000 * 60); // minutes
    
    // Update dispute
    dispute.sellerResponse = {
      evidence: evidence,
      proposal: proposal.trim(),
      respondedAt: new Date()
    };
    
    // If seller responded within time limit, keep status as open
    // Otherwise, it should already be escalated (handled by cron job)
    await dispute.save();

    // Populate orderId, buyerId, and sellerId for response
    await populateOrderId(dispute);
    await populateBuyerSeller(dispute);

    // Send email and notification to buyer
    try {
      const buyerUser = await buyer.findById(dispute.buyerId) || 
                       await farmer.findById(dispute.buyerId);
      
      if (buyerUser) {
        if (buyerUser.email) {
          await sendEmail(
            buyerUser.email,
            "Seller Responded to Dispute",
            `Dear ${buyerUser.name},\n\nThe seller has responded to your dispute for order #${dispute.orderId}.\n\nProposal: ${proposal}\n\nPlease review and accept or reject the proposal.\n\nThank you!`
          );
        }

        // Create notification
        await createNotification(
          dispute.buyerId,
          buyerUser.constructor.modelName === "Buyer" ? "buyer" : "farmer",
          "dispute_response",
          "Seller Responded to Dispute",
          `The seller has responded to your dispute for order #${dispute.orderId}. Please review the proposal.`,
          {
            relatedId: dispute._id,
            relatedType: "dispute",
            actionUrl: `/disputes/${dispute._id}`,
            priority: "high",
            sendEmail: false // Already sent email
          }
        );
      }
    } catch (emailError) {
      console.error("Failed to send dispute response email:", emailError);
    }

    res.status(200).json({
      success: true,
      message: "Dispute response submitted successfully",
      dispute
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Buyer accepts or rejects seller's proposal
 */
export const resolveDispute = async (req, res, next) => {
  try {
    const { disputeId } = req.params;
    const { action } = req.body; // "accept" or "reject"
    const { userId, role } = getUserFromToken(req);

    if (role !== "buyer" && role !== "farmer") {
      return next(new ErrorHandler("Only buyers can resolve disputes", 403));
    }

    // Validate disputeId is a valid ObjectId
    if (!disputeId || !disputeId.match(/^[0-9a-fA-F]{24}$/)) {
      return next(new ErrorHandler("Invalid dispute ID format", 400));
    }

    const dispute = await Dispute.findById(disputeId);
    if (!dispute) {
      return next(new ErrorHandler("Dispute not found", 404));
    }

    // Populate orderId, buyerId, and sellerId from both models
    await populateOrderId(dispute);
    await populateBuyerSeller(dispute);

    // Verify buyer owns this dispute
    if (dispute.buyerId.toString() !== userId) {
      return next(new ErrorHandler("This dispute does not belong to you", 403));
    }

    if (dispute.status !== "open") {
      return next(new ErrorHandler("Dispute is not open for resolution", 400));
    }

    if (!dispute.sellerResponse || !dispute.sellerResponse.proposal) {
      return next(new ErrorHandler("Seller has not responded yet", 400));
    }

    // Get orderId (could be ObjectId or populated object)
    const orderId = dispute.orderId?._id || dispute.orderId;

    if (action === "accept") {
      // Buyer accepts proposal - close dispute, complete payment
      dispute.status = "closed";
      dispute.buyerAccepted = true;
      dispute.resolvedAt = new Date();

      // Update order - try both models
      let order = await OrderMultiVendor.findById(orderId);
      if (!order) {
        order = await Order.findById(orderId);
      }
      if (order) {
        order.dispute_status = "closed";
        order.payment_status = "complete";
        if (order.paymentInfo) {
          order.paymentInfo.status = "completed";
        }
        await order.save();
      }
    } else if (action === "reject") {
      // Buyer rejects - escalate to admin
      dispute.status = "pending_admin_review";
      
      // Update order - try both models
      let order = await OrderMultiVendor.findById(orderId);
      if (!order) {
        order = await Order.findById(orderId);
      }
      if (order) {
        order.dispute_status = "pending_admin_review";
        await order.save();
      }
    } else {
      return next(new ErrorHandler("Invalid action. Use 'accept' or 'reject'", 400));
    }

    await dispute.save();

    // Populate orderId, buyerId, and sellerId for response
    await populateOrderId(dispute);
    await populateBuyerSeller(dispute);

    res.status(200).json({
      success: true,
      message: `Dispute ${action === "accept" ? "resolved" : "escalated to admin"} successfully`,
      dispute
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin makes final ruling on dispute
 */
export const adminRulingOnDispute = async (req, res, next) => {
  try {
    const { disputeId } = req.params;
    const { decision, notes } = req.body; // decision: "buyer_win" or "seller_win"
    const adminId = req.adminId;

    if (!decision || !["buyer_win", "seller_win"].includes(decision)) {
      return next(new ErrorHandler("Decision must be 'buyer_win' or 'seller_win'", 400));
    }

    // Validate disputeId is a valid ObjectId
    if (!disputeId || !disputeId.match(/^[0-9a-fA-F]{24}$/)) {
      return next(new ErrorHandler("Invalid dispute ID format", 400));
    }

    const dispute = await Dispute.findById(disputeId);
    if (!dispute) {
      return next(new ErrorHandler("Dispute not found", 404));
    }

    if (dispute.status !== "pending_admin_review") {
      return next(new ErrorHandler("Dispute is not pending admin review", 400));
    }

    // Get orderId (could be ObjectId or populated object)
    const orderId = dispute.orderId?._id || dispute.orderId;

    // Update dispute
    dispute.status = "closed";
    dispute.adminRuling = {
      decision,
      notes: notes || "",
      ruledAt: new Date(),
      adminId
    };
    dispute.resolvedAt = new Date();
    await dispute.save();

    // Update order payment status based on ruling - try both models
    let order = await OrderMultiVendor.findById(orderId);
    if (!order) {
      order = await Order.findById(orderId);
    }
    if (order) {
      order.dispute_status = "closed";
      
      if (decision === "buyer_win") {
        order.payment_status = "refunded";
        if (order.paymentInfo) {
          order.paymentInfo.status = "refunded";
        }
      } else {
        order.payment_status = "complete";
        if (order.paymentInfo) {
          order.paymentInfo.status = "completed";
        }
      }
      
      await order.save();
    }

    // Populate orderId, buyerId, and sellerId for response
    await populateOrderId(dispute);
    await populateBuyerSeller(dispute);

    // Get admin details for notifications
    const adminUser = await admin.findById(adminId);

    // Send notifications and emails to both parties
    try {
      const buyerUser = await buyer.findById(dispute.buyerId) || 
                       await farmer.findById(dispute.buyerId);
      
      let seller = null;
      if (dispute.sellerRole === "farmer") {
        seller = await farmer.findById(dispute.sellerId);
      } else {
        seller = await supplier.findById(dispute.sellerId);
      }

      const decisionText = decision === "buyer_win" ? "Buyer Wins - Refund Approved" : "Seller Wins - Payment Completed";
      const orderIdStr = dispute.orderId?._id?.toString() || dispute.orderId?.toString() || "N/A";

      // Send notification and email to buyer
      if (buyerUser) {
        // In-app notification
        await createNotification(
          dispute.buyerId,
          buyerUser.role || "buyer",
          "dispute_admin_ruling",
          "Dispute Resolution",
          `Your dispute has been resolved. Decision: ${decisionText}${notes ? `\nNotes: ${notes}` : ""}`,
          {
            relatedId: dispute._id,
            relatedType: "dispute",
            sendEmail: false // We'll send email separately with more details
          }
        );

        // Email notification
        if (buyerUser.email) {
          await sendEmail(
            buyerUser.email,
            "Dispute Resolution",
            `Dear ${buyerUser.name},\n\nThe dispute for order #${orderIdStr} has been resolved.\n\nDecision: ${decisionText}\n\n${notes ? `Notes: ${notes}\n\n` : ""}Thank you!`
          );
        }
      }

      // Send notification and email to seller
      if (seller) {
        // In-app notification
        await createNotification(
          dispute.sellerId,
          dispute.sellerRole,
          "dispute_admin_ruling",
          "Dispute Resolution",
          `Your dispute has been resolved. Decision: ${decisionText}${notes ? `\nNotes: ${notes}` : ""}`,
          {
            relatedId: dispute._id,
            relatedType: "dispute",
            sendEmail: false // We'll send email separately with more details
          }
        );

        // Email notification
        if (seller.email) {
          await sendEmail(
            seller.email,
            "Dispute Resolution",
            `Dear ${seller.name},\n\nThe dispute for order #${orderIdStr} has been resolved.\n\nDecision: ${decisionText}\n\n${notes ? `Notes: ${notes}\n\n` : ""}Thank you!`
          );
        }
      }
    } catch (emailError) {
      console.error("Failed to send dispute resolution notifications:", emailError);
    }

    res.status(200).json({
      success: true,
      message: "Dispute resolved by admin successfully",
      dispute
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get disputes for seller (farmer/supplier)
 */
export const getSellerDisputes = async (req, res, next) => {
  try {
    const { userId, role } = getUserFromToken(req);

    if (role !== "farmer" && role !== "supplier") {
      return next(new ErrorHandler("Only sellers can access this endpoint", 403));
    }

    const { 
      status, 
      disputeType,
      page = 1, 
      limit = 20 
    } = req.query;

    const filter = {
      sellerId: userId,
      sellerRole: role
    };

    if (status) filter.status = status;
    if (disputeType) filter.disputeType = disputeType;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const disputes = await Dispute.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Manually populate buyerId and orderId from both Order and OrderMultiVendor models
    const disputesWithOrders = await Promise.all(
      disputes.map(async (dispute) => {
        // Populate buyerId - could be Buyer or Farmer
        const buyerId = dispute.buyerId?._id || dispute.buyerId;
        if (buyerId) {
          let buyerInfo = await buyer.findById(buyerId).select("name email phone").lean();
          if (!buyerInfo) {
            buyerInfo = await farmer.findById(buyerId).select("name email phone").lean();
          }
          dispute.buyerId = buyerInfo || buyerId;
        }

        // Get orderId - could be ObjectId or already populated object
        const orderId = dispute.orderId?._id || dispute.orderId;
        
        if (orderId) {
          // Try OrderMultiVendor first (new model)
          let order = await OrderMultiVendor.findById(orderId)
            .populate("customerId", "name email phone")
            .populate("products.productId", "name price images")
            .populate("products.farmerId", "name email")
            .populate("products.supplierId", "name email")
            .lean();
          
          // If not found, try old Order model
          if (!order) {
            order = await Order.findById(orderId)
              .populate("userId", "name email phone")
              .populate("products.productId", "name price images")
              .lean();
          }
          
          dispute.orderId = order || orderId;
        }
        return dispute;
      })
    );

    const total = await Dispute.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: disputesWithOrders.length,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      disputes: disputesWithOrders
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get dispute by ID for seller
 */
export const getSellerDisputeById = async (req, res, next) => {
  try {
    const { disputeId } = req.params;
    const { userId, role } = getUserFromToken(req);

    if (role !== "farmer" && role !== "supplier") {
      return next(new ErrorHandler("Only sellers can access this endpoint", 403));
    }

    // Validate disputeId is a valid ObjectId
    if (!disputeId || !disputeId.match(/^[0-9a-fA-F]{24}$/)) {
      return next(new ErrorHandler("Invalid dispute ID format", 400));
    }

    const dispute = await Dispute.findOne({
      _id: disputeId,
      sellerId: userId,
      sellerRole: role
    })
      .lean();

    if (!dispute) {
      return next(new ErrorHandler("Dispute not found or access denied", 404));
    }

    // Populate buyerId - could be Buyer or Farmer
    const buyerId = dispute.buyerId?._id || dispute.buyerId;
    if (buyerId) {
      let buyerInfo = await buyer.findById(buyerId).select("name email phone").lean();
      if (!buyerInfo) {
        buyerInfo = await farmer.findById(buyerId).select("name email phone").lean();
      }
      dispute.buyerId = buyerInfo || buyerId;
    }

    // Populate orderId from both models
    // Get orderId - could be ObjectId or already populated object
    const orderId = dispute.orderId?._id || dispute.orderId;
    
    if (orderId) {
      // Try OrderMultiVendor first (new model)
      let order = await OrderMultiVendor.findById(orderId)
        .populate("customerId", "name email phone address")
        .populate("products.productId", "name price images")
        .populate("products.farmerId", "name email phone")
        .populate("products.supplierId", "name email phone")
        .lean();
      
      // If not found, try old Order model
      if (!order) {
        order = await Order.findById(orderId)
          .populate("userId", "name email phone address")
          .populate("products.productId", "name price images")
          .lean();
      }
      
      dispute.orderId = order || orderId;
    }

    res.status(200).json({
      success: true,
      dispute
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get disputes for buyer
 */
export const getBuyerDisputes = async (req, res, next) => {
  try {
    const { userId, role } = getUserFromToken(req);

    if (role !== "buyer" && role !== "farmer") {
      return next(new ErrorHandler("Only buyers can access this endpoint", 403));
    }

    const { 
      status, 
      disputeType,
      page = 1, 
      limit = 20 
    } = req.query;

    const filter = {
      buyerId: userId
    };

    if (status) filter.status = status;
    if (disputeType) filter.disputeType = disputeType;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const disputes = await Dispute.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Manually populate sellerId and orderId from both Order and OrderMultiVendor models
    const disputesWithOrders = await Promise.all(
      disputes.map(async (dispute) => {
        // Populate sellerId - could be Farmer or Supplier (based on sellerRole)
        const sellerId = dispute.sellerId?._id || dispute.sellerId;
        if (sellerId) {
          let sellerInfo = null;
          if (dispute.sellerRole === "farmer") {
            sellerInfo = await farmer.findById(sellerId).select("name email phone").lean();
          } else if (dispute.sellerRole === "supplier") {
            sellerInfo = await supplier.findById(sellerId).select("name email phone").lean();
          }
          dispute.sellerId = sellerInfo || sellerId;
        }

        // Get orderId - could be ObjectId or already populated object
        const orderId = dispute.orderId?._id || dispute.orderId;
        
        if (orderId) {
          // Try OrderMultiVendor first (new model)
          let order = await OrderMultiVendor.findById(orderId)
            .populate("customerId", "name email phone")
            .populate("products.productId", "name price images")
            .populate("products.farmerId", "name email")
            .populate("products.supplierId", "name email")
            .lean();
          
          // If not found, try old Order model
          if (!order) {
            order = await Order.findById(orderId)
              .populate("userId", "name email phone")
              .populate("products.productId", "name price images")
              .lean();
          }
          
          dispute.orderId = order || orderId;
        }
        return dispute;
      })
    );

    const total = await Dispute.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: disputesWithOrders.length,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      disputes: disputesWithOrders
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get dispute by ID for buyer
 */
export const getBuyerDisputeById = async (req, res, next) => {
  try {
    const { disputeId } = req.params;
    const { userId, role } = getUserFromToken(req);

    if (role !== "buyer" && role !== "farmer") {
      return next(new ErrorHandler("Only buyers can access this endpoint", 403));
    }

    // Validate disputeId is a valid ObjectId
    if (!disputeId || !disputeId.match(/^[0-9a-fA-F]{24}$/)) {
      return next(new ErrorHandler("Invalid dispute ID format", 400));
    }

    const dispute = await Dispute.findOne({
      _id: disputeId,
      buyerId: userId
    })
      .lean();

    if (!dispute) {
      return next(new ErrorHandler("Dispute not found or access denied", 404));
    }

    // Populate sellerId - could be Farmer or Supplier (based on sellerRole)
    const sellerId = dispute.sellerId?._id || dispute.sellerId;
    if (sellerId) {
      let sellerInfo = null;
      if (dispute.sellerRole === "farmer") {
        sellerInfo = await farmer.findById(sellerId).select("name email phone").lean();
      } else if (dispute.sellerRole === "supplier") {
        sellerInfo = await supplier.findById(sellerId).select("name email phone").lean();
      }
      dispute.sellerId = sellerInfo || sellerId;
    }

    // Populate orderId from both models
    // Get orderId - could be ObjectId or already populated object
    const orderId = dispute.orderId?._id || dispute.orderId;
    
    if (orderId) {
      // Try OrderMultiVendor first (new model)
      let order = await OrderMultiVendor.findById(orderId)
        .populate("customerId", "name email phone address")
        .populate("products.productId", "name price images")
        .populate("products.farmerId", "name email phone")
        .populate("products.supplierId", "name email phone")
        .lean();
      
      // If not found, try old Order model
      if (!order) {
        order = await Order.findById(orderId)
          .populate("userId", "name email phone address")
          .populate("products.productId", "name price images")
          .lean();
      }
      
      dispute.orderId = order || orderId;
    }

    res.status(200).json({
      success: true,
      dispute
    });
  } catch (error) {
    next(error);
  }
};

