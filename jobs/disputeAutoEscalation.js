import cron from "node-cron";
import { Dispute } from "../models/dispute.js";
import { Order } from "../models/order.js";
import { OrderMultiVendor } from "../models/orderMultiVendor.js";
import { SystemConfig, CONFIG_KEYS } from "../models/systemConfig.js";
import { sendEmail } from "../utils/sendEmail.js";
import { admin } from "../models/admin.js";
import { createNotification } from "../utils/notifications.js";

/**
 * Automated dispute escalation service
 * Runs every hour to check for disputes that need admin review
 * Escalates disputes where seller hasn't responded within configured time
 */
export const startDisputeAutoEscalation = () => {
  // Run every hour at minute 15 (15 minutes past the hour)
  cron.schedule("15 * * * *", async () => {
    try {
      console.log("🔄 Running dispute auto-escalation job...");

      // Get configuration
      const config = await SystemConfig.findOne({ 
        configKey: CONFIG_KEYS.DISPUTE_RESPONSE_HOURS 
      });
      const responseHours = config?.configValue || 24; // Default 24 hours

      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - responseHours);

      let escalatedCount = 0;

      // Find disputes that are open, have no seller response, and were created before cutoff time
      const disputesToEscalate = await Dispute.find({
        status: "open",
        "sellerResponse.respondedAt": { $exists: false },
        createdAt: { $lte: cutoffTime }
      }).populate("orderId");

      for (const dispute of disputesToEscalate) {
        try {
          // Update dispute status to pending_admin_review
          dispute.status = "pending_admin_review";
          await dispute.save();

          escalatedCount++;

          // Update order dispute_status if order exists
          if (dispute.orderId) {
            const orderId = dispute.orderId._id || dispute.orderId;
            
            // Try OrderMultiVendor first
            let order = await OrderMultiVendor.findById(orderId);
            if (order) {
              order.dispute_status = "pending_admin_review";
              await order.save();
            } else {
              // Try old Order model
              order = await Order.findById(orderId);
              if (order) {
                order.dispute_status = "pending_admin_review";
                await order.save();
              }
            }
          }

          // Send email notification to admin
          try {
            const admins = await admin.find({});
            for (const adminUser of admins) {
              if (adminUser.email) {
                await sendEmail(
                  adminUser.email,
                  "Dispute Escalated - Admin Review Required",
                  `A dispute #${dispute._id} has been automatically escalated to admin review.\n\n` +
                  `Order ID: ${dispute.orderId?._id || dispute.orderId}\n` +
                  `Buyer ID: ${dispute.buyerId}\n` +
                  `Seller ID: ${dispute.sellerId}\n` +
                  `Dispute Type: ${dispute.disputeType}\n` +
                  `Reason: ${dispute.reason}\n\n` +
                  `The seller did not respond within ${responseHours} hours.\n\n` +
                  `Please review and make a ruling.`
                );

                // Create notification for admin
                await createNotification(
                  adminUser._id,
                  "admin",
                  "dispute_escalated",
                  "Dispute Escalated - Review Required",
                  `Dispute #${dispute._id} has been escalated. Seller did not respond within ${responseHours} hours.`,
                  {
                    relatedId: dispute._id,
                    relatedType: "dispute",
                    actionUrl: `/admin/disputes/${dispute._id}`,
                    priority: "high",
                    sendEmail: false // Already sent email above
                  }
                );
              }
            }
          } catch (emailError) {
            console.error(`Failed to send escalation email for dispute ${dispute._id}:`, emailError);
          }

          // Send notification to buyer
          try {
            await createNotification(
              dispute.buyerId,
              "buyer",
              "dispute_escalated",
              "Dispute Escalated to Admin",
              `Your dispute #${dispute._id} has been escalated to admin review because the seller did not respond within ${responseHours} hours.`,
              {
                relatedId: dispute._id,
                relatedType: "dispute",
                actionUrl: `/disputes/${dispute._id}`,
                priority: "medium",
                sendEmail: true
              }
            );
          } catch (notifError) {
            console.error(`Failed to send notification to buyer for dispute ${dispute._id}:`, notifError);
          }

        } catch (error) {
          console.error(`Error processing dispute ${dispute._id}:`, error);
        }
      }

      if (escalatedCount > 0) {
        console.log(`✅ Auto-escalated ${escalatedCount} dispute(s) to admin review`);
      } else {
        console.log("✅ No disputes to auto-escalate");
      }
    } catch (error) {
      console.error("❌ Error in dispute auto-escalation job:", error);
    }
  });

  console.log("✅ Dispute auto-escalation job scheduled (runs every hour at :15)");
};

