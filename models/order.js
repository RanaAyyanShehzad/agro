import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, "User ID is required"],
  },
  userRole: {
    type: String,
    required: [true, "User role is required"],
    enum: ["buyer", "farmer"]
  },
  products: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Products",
        required: [true, "Product ID is required"]
      },
      quantity: {
        type: Number,
        required: [true, "Quantity is required"],
        min: [1, "Quantity must be at least 1"]
      }
    }
  ],
  totalPrice: {
    type: Number,
    required: [true, "Total price is required"],
    min: [0, "Total price cannot be negative"]
  },
  // Order-specific fields
  status: {
    type: String,
    required: true,
    enum: [
      "pending", 
      "processing", 
      "shipped", 
      "delivered", 
      "received",
      "canceled"
    ],
    default: "pending"
  },
  // Expected delivery date (set when order is shipped)
  expected_delivery_date: {
    type: Date
  },
  // Timestamp when order was shipped
  shippedAt: {
    type: Date
  },
  // Timestamp when order was delivered
  deliveredAt: {
    type: Date
  },
  // Timestamp when buyer confirmed receipt
  receivedAt: {
    type: Date
  },
  // Dispute status
  dispute_status: {
    type: String,
    enum: ["none", "open", "pending_admin_review", "closed"],
    default: "none",
    index: true
  },
  // Payment status (separate from paymentInfo.status for clarity)
  payment_status: {
    type: String,
    enum: ["pending", "complete", "refunded", "cancelled"],
    default: "pending",
    index: true
  },
  // Seller-uploaded Proof of Delivery
  proofOfDelivery: {
    images: [{
      type: String // URLs to uploaded images
    }],
    notes: {
      type: String,
      maxlength: 500
    },
    uploadedAt: {
      type: Date
    }
  },
  // Buyer-uploaded Proof of Fault/Non-Receipt (for disputes)
  proofOfFault: {
    images: [{
      type: String // URLs to uploaded images
    }],
    description: {
      type: String,
      maxlength: 1000
    },
    uploadedAt: {
      type: Date
    }
  },
  paymentInfo: {
    method: {
      type: String,
      required: true,
      enum: ["easypaisa", "cash-on-delivery", "jazzcash"]
    },
    status: {
      type: String,
      required: true,
      enum: ["pending", "completed", "failed", "refunded", "cancelled"],
      default: "pending"
    },
    transactionId: {
      type: String
    },
    paidAt: {
      type: Date
    }
  },
  shippingAddress: {
    street: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true
    },
    zipCode: {
      type: String,
      required: true
    },
    phoneNumber: {
      type: String,
      required: true
    }
  },
  deliveryInfo: {
    estimatedDeliveryDate: {
      type: Date
    },
    actualDeliveryDate: {
      type: Date
    },
    notes: {
      type: String
    }
  },
  // Include order notes for any special instructions
  notes: {
    type: String
  },
  // Reference to original cart
  cartId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Cart"
  }
}, {
  timestamps: true
});

// Create indexes for frequent queries
orderSchema.index({ userId: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ "paymentInfo.status": 1 });
orderSchema.index({ "products.supplier.userID": 1 });
orderSchema.index({ dispute_status: 1 });
orderSchema.index({ payment_status: 1 });
orderSchema.index({ expected_delivery_date: 1 });

export const Order = mongoose.model("Order", orderSchema);