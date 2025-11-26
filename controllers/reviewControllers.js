// controllers/reviewController.js
import Sentiment from "sentiment";
import { Review } from "../models/review.js";
import { buyer } from "../models/buyer.js";
import { farmer } from "../models/farmer.js";
import jwt from "jsonwebtoken";
import ErrorHandler from "../middlewares/error.js";
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

    // Suppliers cannot write reviews
    if (userRole === "supplier") {
      return next(new ErrorHandler("Suppliers are not allowed to write reviews", 403));
    }

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

    // Attach basic user info (name) so frontend can show reviewer name
    let user = null;
    if (userRole === "buyer") {
      user = await buyer.findById(userId).select("name");
    } else if (userRole === "farmer") {
      user = await farmer.findById(userId).select("name");
    }

    const reviewWithUser = {
      ...review.toObject(),
      user: user ? { _id: user._id, name: user.name } : null,
    };

    res
      .status(201)
      .json({ success: true, message: "Review submitted", review: reviewWithUser });
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

    // For each review, load the corresponding user (buyer/farmer) to expose name
    const reviewsWithUser = await Promise.all(
      reviews.map(async (review) => {
        let user = null;
        if (review.userRole === "buyer") {
          user = await buyer.findById(review.userId).select("name");
        } else if (review.userRole === "farmer") {
          user = await farmer.findById(review.userId).select("name");
        }

        return {
          ...review.toObject(),
          user: user ? { _id: user._id, name: user.name } : null,
        };
      })
    );

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
      reviews: reviewsWithUser,
      averageRating,
      sentimentStats,
      totalPages: Math.ceil(totalReviews / limit),
      currentPage: page,
    });
  } catch (error) {
    next(error);
  }
};
