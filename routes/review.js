import express from 'express';
import { addReview, getProductReviews } from '../controllers/reviewControllers.js';
import { isAuthenticated } from '../middlewares/auth.js';


const router = express.Router();

// All cart routes require authentication
router.use(isAuthenticated); // must come first
router.post('/add',addReview);
router.get('/get-review',getProductReviews);

export default router;