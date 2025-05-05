import cron from 'node-cron';
import { Cart } from '../models/cart.js';

export const setupCartCleanupJob = () => {
  // Schedule job to run daily at midnight
  cron.schedule('0 0 * * *', async () => {
    try {
      
      // Find and delete carts that have expired
      const result = await Cart.deleteMany({
        expiresAt: { $lt: new Date() }
      });
      
      console.log(`Deleted ${result.deletedCount} expired carts`);
    } catch (error) {
      console.error('Error in cart cleanup job:', error);
    }
  });
  
  console.log('Cart cleanup job scheduled');
};