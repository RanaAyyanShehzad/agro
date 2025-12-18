import mongoose from "mongoose";

const productItemSchema = new mongoose.Schema({
  // Note: productId may reference a soft-deleted product
  // Orders maintain a snapshot of product info (name, price, quantity)
  // Even if product is deleted, order remains valid and functional
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Products",
    required: [true, "Product ID is required"]
  },
  farmerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Farmer",
    default: null
  },
  supplierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Supplier",
    default: null
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
  },
  status: {
    type: String,
    enum: ["pending", "processing", "confirmed", "shipped", "out_for_delivery", "delivered", "received", "cancelled", "rejected"],
    default: "pending"
  },
  sellerAccepted: {
    type: Boolean,
    default: null // null = pending, true = accepted, false = rejected
  },
  sellerRejectedAt: {
    type: Date
  },
  rejectionReason: {
    type: String,
    maxlength: 500
  },
  // Estimated delivery date (set when seller accepts order)
  estimatedDeliveryDate: {
    type: Date
  },
  // Per-product timestamps (for multi-vendor orders)
  shippedAt: {
    type: Date
  },
  outForDeliveryAt: {
    type: Date
  },
  deliveredAt: {
    type: Date
  },
  receivedAt: {
    type: Date
  }
}, { _id: true });

const orderSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, "Customer ID is required"],
    refPath: "customerModel"
  },
  customerModel: {
    type: String,
    required: true,
    enum: ["Buyer", "Farmer"]
  },
  products: {
    type: [productItemSchema],
    required: [true, "Products are required"],
    validate: {
      validator: function(products) {
        return products.length > 0;
      },
      message: "Order must contain at least one product"
    }
  },
  orderStatus: {
    type: String,
    enum: [
      "pending",
      "processing",
      "confirmed",
      "shipped",
      "out_for_delivery",
      "delivered",
      "received",
      "cancelled",
      "partially_shipped",
      "partially_delivered",
      "partially_received",
      "partially_cancelled"
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
  // Timestamp when order is out for delivery
  outForDeliveryAt: {
    type: Date
  },
  // Tracking ID for logistics
  trackingId: {
    type: String,
    unique: true,
    sparse: true
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
  totalPrice: {
    type: Number,
    required: [true, "Total price is required"],
    min: [0, "Total price cannot be negative"]
  },
  paymentInfo: {
    method: {
      type: String,
      enum: ["easypaisa", "cash-on-delivery", "jazzcash"],
      required: true
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "refunded", "cancelled"],
      default: "pending"
    },
    transactionId: {
      type: String,
      default: null
    },
    paidAt: {
      type: Date,
      default: null
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
      type: Date,
      default: null
    },
    actualDeliveryDate: {
      type: Date,
      default: null
    },
    vehicle: {
      name: {
        type: String,
        default: null
      },
      registrationNumber: {
        type: String,
        default: null
      },
      vehicleType: {
        type: String,
        enum: ["Motorcycle", "Car", "Van", "Truck", "Rickshaw", "Other"],
        default: null
      },
      contactInfo: {
        type: String,
        default: null
      }
    },
    rider: {
      name: {
        type: String,
        default: null
      },
      contactInfo: {
        type: String,
        default: null
      }
    },
    notes: {
      type: String,
      default: null
    }
  },
  notes: {
    type: String,
    default: null
  },
  cartId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Cart",
    default: null
  }
}, {
  timestamps: true
});

// Indexes for performance
orderSchema.index({ customerId: 1 });
orderSchema.index({ orderStatus: 1 });
orderSchema.index({ "products.farmerId": 1 });
orderSchema.index({ "products.supplierId": 1 });
orderSchema.index({ "paymentInfo.status": 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ dispute_status: 1 });
orderSchema.index({ payment_status: 1 });
orderSchema.index({ expected_delivery_date: 1 });

// Validate each product item has either farmerId or supplierId
orderSchema.pre("validate", function(next) {
  for (const product of this.products) {
    if (!product.farmerId && !product.supplierId) {
      return next(new Error("Each product must have either farmerId or supplierId"));
    }
    if (product.farmerId && product.supplierId) {
      return next(new Error("Product cannot have both farmerId and supplierId"));
    }
  }
  next();
});

export const OrderMultiVendor = mongoose.model("OrderMultiVendor", orderSchema);

