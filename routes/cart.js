import express from 'express';
import { 
  addToCart, 
  getCart, 
  removeFromCart, 
  clearCart, 
  updateCartItem,
  getCartSummary,
  getCartExpiration
} from '../controllers/cart.js';
import { isAuthenticated } from '../middlewares/auth.js';
import { checkCartExpiration } from '../middlewares/cartExpire.js';

const router = express.Router();

// All cart routes require authentication
router.use(isAuthenticated); // must come first
router.use(checkCartExpiration); // depends on req.user


// Cart routes
router.post('/add', addToCart);
router.get('/my-cart', getCart);
router.delete('/item/:id', removeFromCart);
router.delete('/clear', clearCart);
router.put('/update', updateCartItem);
router.get('/summary', getCartSummary);
router.get('/cart-expiry',getCartExpiration);

export default router;