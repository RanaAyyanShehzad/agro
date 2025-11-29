import mongoose from "mongoose";

const productHistorySchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Products",
    required: [true, "Product ID is required"],
    index: true
  },
  changedBy: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    role: {
      type: String,
      enum: ["farmer", "supplier", "admin"],
      required: true
    },
    name: {
      type: String
    }
  },
  changeType: {
    type: String,
    enum: ["price", "quantity", "description", "name", "category", "images", "availability", "visibility"],
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
  }
}, {
  timestamps: true
});

// Indexes
productHistorySchema.index({ productId: 1, createdAt: -1 });
productHistorySchema.index({ "changedBy.userId": 1 });

export const ProductHistory = mongoose.model("ProductHistory", productHistorySchema);

