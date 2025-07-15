// controllers/reviewController.js
import Sentiment from "sentiment";
import { Review } from "../models/review.js";
import jwt from "jsonwebtoken";
const sentiment = new Sentiment();
const getUserAndRole = (req) => {
    const { token } = req.cookies;
    if (!token) throw new ErrorHandler("Authentication token missing", 401);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return { userId: req.user._id, userRole: decoded.role };
};
export const addReview = async (req, res, next) => {
  try {
    const { productId, rating, comment } = req.body;
    const { userId, userRole } = getUserAndRole(req);

    const analysis = sentiment.analyze(comment);
    const sentimentResult =
      analysis.score > 0 ? "positive" : analysis.score < 0 ? "negative" : "neutral";

    const review = await Review.create({
      productId,
      userId,
      userRole,
      comment,
      rating,
      sentiment: sentimentResult,
    });

    res.status(201).json({ success: true, message: "Review submitted", review });
  } catch (error) {
    next(error);
  }
};
// GET /api/reviews/product/:productId?page=1&limit=5
export const getProductReviews = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;

    const totalReviews = await Review.countDocuments({ productId });

    const reviews = await Review.find({ productId })
      .sort({ createdAt: -1 }) // Latest first
      .skip(skip)
      .limit(limit);

    const sentimentStats = {
      positive: 0,
      neutral: 0,
      negative: 0,
    };
    let totalRating = 0;

    const allReviews = await Review.find({ productId });
    allReviews.forEach((r) => {
      sentimentStats[r.sentiment]++;
      totalRating += r.rating;
    });

    const averageRating = allReviews.length > 0 ? (totalRating / allReviews.length).toFixed(1) : 0;

    res.status(200).json({
      success: true,
      reviews,
      averageRating,
      sentimentStats,
      totalPages: Math.ceil(totalReviews / limit),
      currentPage: page
    });
  } catch (error) {
    next(error);
  }
};
