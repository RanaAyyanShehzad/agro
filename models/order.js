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
        ref: "product",
        required: [true, "Product ID is required"]
      },
      name: {
        type: String,
        required: [true, "Product name is required"]
      },
      price: {
        type: Number,
        required: [true, "Product price is required"]
      },
      quantity: {
        type: Number,
        required: [true, "Quantity is required"],
        min: [1, "Quantity must be at least 1"]
      },
      supplier: {
        userID: {
          type: mongoose.Schema.Types.ObjectId,
          required: true
        },
        role: {
          type: String,
          required: true
        },
        name: String
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
      "canceled"
    ],
    default: "pending"
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
      enum: ["pending", "completed", "failed", "refunded"],
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

export const Order = mongoose.model("Order", orderSchema);