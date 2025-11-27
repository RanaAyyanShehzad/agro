import {Cart} from "../models/cart.js";
export const checkCartExpiration = async (req, res, next) => {
    try {
      // Skip this middleware for non-cart routes
      if (!req.originalUrl.includes('/cart')) {
        return next();
      }
      
      const cart = await Cart.findOne({ userId: req.user._id });
      
      if (cart) {
        // Update the last activity time
        cart.lastActivity = new Date();
        
        // Refresh expiration date if cart is about to expire (e.g., less than 24 hours left)
        const oneDayFromNow = new Date(Date.now() + 1 * 60 * 60 * 1000);
        if (cart.expiresAt < oneDayFromNow) {
          // Reset expiration to 7 days from now
          cart.expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000);
        }
        
        await cart.save();
      }
      
      next();
    } catch (err) {
      // Non-critical error, just log and continue
      console.error('Error checking cart expiration:', err);
      next();
    }
  };