import mongoose from "mongoose";

const wishlistSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, "User ID is required"],
    unique: true
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
      },
      addedAt: {
        type: Date,
        default: Date.now
      }
    }
  ]
}, {
  timestamps: true
});

export const Wishlist = mongoose.model("Wishlist", wishlistSchema);