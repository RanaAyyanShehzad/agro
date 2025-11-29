import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, "User ID is required"],
    index: true
  },
  userRole: {
    type: String,
    enum: ["buyer", "farmer", "supplier", "admin"],
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: [
      "order_placed",
      "order_accepted",
      "order_rejected",
      "order_confirmed",
      "order_processing",
      "order_shipped",
      "order_delivered",
      "order_received",
      "order_cancelled",
      "dispute_opened",
      "dispute_response",
      "dispute_resolved",
      "dispute_admin_ruling",
      "payment_complete",
      "payment_refunded",
      "product_approved",
      "product_rejected",
      "account_suspended",
      "account_activated",
      "password_reset",
      "system_announcement"
    ],
    required: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  message: {
    type: String,
    required: true,
    maxlength: 1000
  },
  relatedId: {
    type: mongoose.Schema.Types.ObjectId, // Order ID, Dispute ID, Product ID, etc.
    index: true
  },
  relatedType: {
    type: String,
    enum: ["order", "dispute", "product", "user", "system", null],
    default: null
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true
  },
  readAt: {
    type: Date
  },
  priority: {
    type: String,
    enum: ["low", "medium", "high", "urgent"],
    default: "medium"
  },
  actionUrl: {
    type: String, // URL to navigate when notification is clicked
    maxlength: 500
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, userRole: 1 });
notificationSchema.index({ type: 1, createdAt: -1 });

export const Notification = mongoose.model("Notification", notificationSchema);

