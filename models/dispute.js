import mongoose from "mongoose";

const disputeSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order",
    required: [true, "Order ID is required"],
    index: true
  },
  buyerId: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, "Buyer ID is required"],
    index: true
  },
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, "Seller ID is required"],
    index: true
  },
  sellerRole: {
    type: String,
    enum: ["farmer", "supplier"],
    required: true
  },
  disputeType: {
    type: String,
    enum: ["non_delivery", "product_fault", "wrong_item", "other"],
    required: true
  },
  reason: {
    type: String,
    required: [true, "Dispute reason is required"],
    maxlength: 1000
  },
  buyerProof: {
    images: [{
      type: String // URLs to uploaded images
    }],
    description: {
      type: String,
      maxlength: 2000
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  },
  sellerResponse: {
    evidence: [{
      type: String // URLs to uploaded images/documents
    }],
    proposal: {
      type: String,
      maxlength: 2000
    },
    respondedAt: {
      type: Date
    }
  },
  status: {
    type: String,
    enum: ["open", "pending_admin_review", "closed"],
    default: "open",
    index: true
  },
  buyerAccepted: {
    type: Boolean,
    default: false
  },
  adminRuling: {
    decision: {
      type: String,
      enum: ["buyer_win", "seller_win", null],
      default: null
    },
    notes: {
      type: String,
      maxlength: 2000
    },
    ruledAt: {
      type: Date
    },
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin"
    }
  },
  resolvedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes for performance
disputeSchema.index({ orderId: 1, status: 1 });
disputeSchema.index({ buyerId: 1 });
disputeSchema.index({ sellerId: 1 });

export const Dispute = mongoose.model("Dispute", disputeSchema);

