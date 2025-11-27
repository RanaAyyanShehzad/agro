import mongoose from "mongoose";

const productItemSchema = new mongoose.Schema({
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
    enum: ["processing", "confirmed", "shipped", "delivered", "cancelled"],
    default: "processing"
  }
}, { _id: true });

const orderSchema = new mongoose.Schema({
  buyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Buyer",
    required: [true, "Buyer ID is required"]
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
      "processing",
      "confirmed",
      "shipped",
      "delivered",
      "cancelled",
      "partially_shipped",
      "partially_delivered",
      "partially_cancelled"
    ],
    default: "processing"
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
      enum: ["pending", "completed", "failed", "refunded"],
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
orderSchema.index({ buyerId: 1 });
orderSchema.index({ orderStatus: 1 });
orderSchema.index({ "products.farmerId": 1 });
orderSchema.index({ "products.supplierId": 1 });
orderSchema.index({ "paymentInfo.status": 1 });
orderSchema.index({ createdAt: -1 });

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

