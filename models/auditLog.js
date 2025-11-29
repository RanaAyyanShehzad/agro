import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Admin",
    required: [true, "Admin ID is required"],
    index: true
  },
  adminName: {
    type: String,
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      "user_created",
      "user_deleted",
      "user_soft_deleted",
      "user_hard_deleted",
      "user_suspended",
      "user_unsuspended",
      "user_activated",
      "user_deactivated",
      "user_locked",
      "user_unlocked",
      "user_password_reset",
      "product_created",
      "product_updated",
      "product_deleted",
      "product_visibility_changed",
      "category_created",
      "category_updated",
      "category_deleted",
      "order_status_changed",
      "order_payment_changed",
      "order_cancelled",
      "dispute_ruled",
      "system_config_updated",
      "notification_sent"
    ],
    index: true
  },
  entityType: {
    type: String,
    enum: ["user", "product", "category", "order", "dispute", "system", "notification"],
    required: true
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    index: true
  },
  entityName: {
    type: String // Human-readable name (e.g., user email, product name)
  },
  details: {
    type: mongoose.Schema.Types.Mixed, // Store additional details as JSON
    default: {}
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
auditLogSchema.index({ adminId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1 });
auditLogSchema.index({ createdAt: -1 });

export const AuditLog = mongoose.model("AuditLog", auditLogSchema);

