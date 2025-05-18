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
        ref: "products", // Reference to product model
        required: [true, "Product ID is required"]
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