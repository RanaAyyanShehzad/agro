import mongoose from "mongoose";

const orderHistorySchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, "Order ID is required"],
    index: true
  },
  orderType: {
    type: String,
    enum: ["old", "multivendor"],
    required: true
  },
  changedBy: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    role: {
      type: String,
      enum: ["buyer", "farmer", "supplier", "admin"],
      required: true
    },
    name: {
      type: String
    }
  },
  changeType: {
    type: String,
    enum: ["status", "payment_status", "dispute_status", "accepted", "rejected", "shipped", "delivered", "received", "cancelled"],
    required: true
  },
  oldValue: {
    type: mongoose.Schema.Types.Mixed
  },
  newValue: {
    type: mongoose.Schema.Types.Mixed
  },
  reason: {
    type: String,
    maxlength: 500
  },
  notes: {
    type: String,
    maxlength: 1000
  }
}, {
  timestamps: true
});

// Indexes
orderHistorySchema.index({ orderId: 1, createdAt: -1 });
orderHistorySchema.index({ "changedBy.userId": 1 });
orderHistorySchema.index({ changeType: 1, createdAt: -1 });

export const OrderHistory = mongoose.model("OrderHistory", orderHistorySchema);

