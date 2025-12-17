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
  // Seller information (single vendor per order)
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, "Seller ID is required"],
    refPath: "sellerModel"
  },
  sellerModel: {
    type: String,
    required: true,
    enum: ["Farmer", "Supplier"]
  },
  // Order grouping: orders from same checkout share same orderGroupId
  orderGroupId: {
    type: mongoose.Schema.Types.ObjectId,
    default: function() {
      return new mongoose.Types.ObjectId();
    },
    index: true
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
      },
      price: {
        type: Number,
        required: [true, "Price is required"],
        min: [0, "Price cannot be negative"]
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
      "out_for_delivery",
      "delivered", 
      "received",
      "canceled"
    ],
    default: "pending"
  },
  // Tracking ID for logistics
  trackingId: {
    type: String,
    unique: true,
    sparse: true
  },
  // Expected delivery date (set when order is shipped)
  expected_delivery_date: {
    type: Date
  },
  // Timestamp when order was shipped
  shippedAt: {
    type: Date
  },
  // Timestamp when order is out for delivery
  outForDeliveryAt: {
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
    },
    // Vehicle information
    vehicle: {
      name: {
        type: String
      },
      registrationNumber: {
        type: String
      },
      vehicleType: {
        type: String,
        enum: ["Motorcycle", "Car", "Van", "Truck", "Rickshaw", "Other"]
      },
      contactInfo: {
        type: String
      }
    },
    // Rider/Delivery person information
    rider: {
      name: {
        type: String
      },
      contactInfo: {
        type: String
      }
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
orderSchema.index({ sellerId: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ "paymentInfo.status": 1 });
orderSchema.index({ dispute_status: 1 });
orderSchema.index({ payment_status: 1 });
orderSchema.index({ expected_delivery_date: 1 });
orderSchema.index({ orderGroupId: 1 }); // For grouping orders from same checkout
orderSchema.index({ trackingId: 1 }); // For tracking ID lookups

export const Order = mongoose.model("Order", orderSchema);