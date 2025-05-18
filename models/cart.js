import mongoose from "mongoose";

const cartSchema = new mongoose.Schema({
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
      },images:{
        type:[String],
        required:true
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
    default: 0,
    min: [0, "Total price cannot be negative"]
  },
  expiresAt: {
    type: Date,
    default: function() {
      // Default expiration time: 7 days from now
      return new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    },
  },
  lastActivity: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create index for TTL expiration
cartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Cart = mongoose.model("Cart", cartSchema);