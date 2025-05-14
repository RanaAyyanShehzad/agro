import express from 'express';
import { 
    addToWishlist,
    getWishlist,removeFromWishlist,clearWishlist,
    moveToCart
} from '../controllers/wishlist.js';
import { isAuthenticated } from '../middlewares/auth.js';

const router = express.Router();

// All cart routes require authentication
router.use(isAuthenticated);

// Cart routes
router.post('/add', addToWishlist);
router.get('/my-wishlist', getWishlist);
router.delete('/item/:productId', removeFromWishlist);
router.delete('/clear', clearWishlist);
router.post('/addtocart',moveToCart);

export default router;