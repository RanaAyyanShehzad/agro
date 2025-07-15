// models/review.js
import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Products",
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: "userRole",
    required: true,
  },
  userRole: {
    type: String,
    enum: ["buyer", "farmer"],
    required: true,
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  comment: {
    type: String,
    required: true,
  },
  sentiment: {
    type: String,
    enum: ["positive", "neutral", "negative"],
    default: "neutral",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const Review = mongoose.model("Review", reviewSchema);
