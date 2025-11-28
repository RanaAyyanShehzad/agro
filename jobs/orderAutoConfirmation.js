import cron from "node-cron";
import { Order } from "../models/order.js";
import { OrderMultiVendor } from "../models/orderMultiVendor.js";
import { SystemConfig, CONFIG_KEYS } from "../models/systemConfig.js";
import { sendEmail } from "../utils/sendEmail.js";
import { buyer } from "../models/buyer.js";
import { farmer } from "../models/farmer.js";

/**
 * Automated cleanup service that confirms orders after delivery
 * Runs every hour to check for orders that need auto-confirmation
 */
export const startOrderAutoConfirmation = () => {
  // Run every hour at minute 0
  cron.schedule("0 * * * *", async () => {
    try {
      console.log("🔄 Running order auto-confirmation job...");

      // Get configuration
      const config = await SystemConfig.findOne({ 
        configKey: CONFIG_KEYS.DELIVERED_TO_RECEIVED_MINUTES 
      });
      const autoConfirmMinutes = config?.configValue || 1440; // Default 24 hours (1440 minutes)

      const cutoffTime = new Date();
      cutoffTime.setMinutes(cutoffTime.getMinutes() - autoConfirmMinutes);

      let confirmedCount = 0;

      // Process OrderMultiVendor (new orders)
      const multiVendorOrders = await OrderMultiVendor.find({
        orderStatus: "delivered",
        dispute_status: { $in: ["none", "closed"] },
        deliveredAt: { $lte: cutoffTime },
        receivedAt: null // Not yet confirmed
      });

      for (const order of multiVendorOrders) {
        try {
          order.orderStatus = "received";
          order.receivedAt = new Date();
          order.payment_status = "complete";
          
          if (order.paymentInfo) {
            order.paymentInfo.status = "completed";
            order.paymentInfo.paidAt = new Date();
          }

          await order.save();
          confirmedCount++;

          // Send notification email
          try {
            const customerModel = order.customerModel;
            let customer = null;
            if (customerModel === "Buyer") {
              customer = await buyer.findById(order.customerId);
            } else {
              customer = await farmer.findById(order.customerId);
            }

            if (customer && customer.email) {
              await sendEmail(
                customer.email,
                "Order Auto-Confirmed",
                `Dear ${customer.name},\n\nYour order #${order._id} has been automatically confirmed as received after ${autoConfirmMinutes} minutes.\n\nPayment status has been updated to complete.\n\nThank you for your purchase!`
              );
            }
          } catch (emailError) {
            console.error(`Failed to send auto-confirmation email for order ${order._id}:`, emailError);
          }
        } catch (error) {
          console.error(`Error processing order ${order._id}:`, error);
        }
      }

      // Process old Order model
      const oldOrders = await Order.find({
        status: "delivered",
        dispute_status: { $in: ["none", "closed"] },
        deliveredAt: { $lte: cutoffTime },
        receivedAt: null
      });

      for (const order of oldOrders) {
        try {
          order.status = "received";
          order.receivedAt = new Date();
          order.payment_status = "complete";
          
          if (order.paymentInfo) {
            order.paymentInfo.status = "completed";
            order.paymentInfo.paidAt = new Date();
          }

          await order.save();
          confirmedCount++;

          // Send notification email
          try {
            let customer = null;
            if (order.userRole === "buyer") {
              customer = await buyer.findById(order.userId);
            } else {
              customer = await farmer.findById(order.userId);
            }

            if (customer && customer.email) {
              await sendEmail(
                customer.email,
                "Order Auto-Confirmed",
                `Dear ${customer.name},\n\nYour order #${order._id} has been automatically confirmed as received after ${autoConfirmMinutes} minutes.\n\nPayment status has been updated to complete.\n\nThank you for your purchase!`
              );
            }
          } catch (emailError) {
            console.error(`Failed to send auto-confirmation email for order ${order._id}:`, emailError);
          }
        } catch (error) {
          console.error(`Error processing order ${order._id}:`, error);
        }
      }

      if (confirmedCount > 0) {
        console.log(`✅ Auto-confirmed ${confirmedCount} order(s)`);
      } else {
        console.log("✅ No orders to auto-confirm");
      }
    } catch (error) {
      console.error("❌ Error in order auto-confirmation job:", error);
    }
  });

  console.log("✅ Order auto-confirmation job scheduled (runs every hour)");
};

