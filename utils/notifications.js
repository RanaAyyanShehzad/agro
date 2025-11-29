import { Notification } from "../models/notification.js";
import { sendEmail } from "./sendEmail.js";
import { buyer } from "../models/buyer.js";
import { farmer } from "../models/farmer.js";
import { supplier } from "../models/supplier.js";
import { admin } from "../models/admin.js";

/**
 * Create and send notification to user
 */
export const createNotification = async (userId, userRole, type, title, message, options = {}) => {
  try {
    const notification = await Notification.create({
      userId,
      userRole,
      type,
      title,
      message,
      relatedId: options.relatedId || null,
      relatedType: options.relatedType || null,
      priority: options.priority || "medium",
      actionUrl: options.actionUrl || null
    });

    // Send email notification if enabled
    if (options.sendEmail !== false) {
      try {
        let user = null;
        if (userRole === "buyer") {
          user = await buyer.findById(userId);
        } else if (userRole === "farmer") {
          user = await farmer.findById(userId);
        } else if (userRole === "supplier") {
          user = await supplier.findById(userId);
        } else if (userRole === "admin") {
          user = await admin.findById(userId);
        }

        if (user && user.email) {
          await sendEmail(
            user.email,
            title,
            message
          );
        }
      } catch (emailError) {
        console.error("Failed to send notification email:", emailError);
        // Don't fail notification creation if email fails
      }
    }

    return notification;
  } catch (error) {
    console.error("Failed to create notification:", error);
    throw error;
  }
};

/**
 * Get notifications for a user
 */
export const getUserNotifications = async (userId, userRole, options = {}) => {
  try {
    const { isRead, limit = 50, page = 1 } = options;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = { userId, userRole };
    if (isRead !== undefined) {
      filter.isRead = isRead;
    }

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Notification.countDocuments(filter);
    const unreadCount = await Notification.countDocuments({ userId, userRole, isRead: false });

    return {
      notifications,
      total,
      unreadCount,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit))
    };
  } catch (error) {
    console.error("Failed to get notifications:", error);
    throw error;
  }
};

/**
 * Mark notification as read
 */
export const markNotificationAsRead = async (notificationId, userId) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      { isRead: true, readAt: new Date() },
      { new: true }
    );
    return notification;
  } catch (error) {
    console.error("Failed to mark notification as read:", error);
    throw error;
  }
};

/**
 * Mark all notifications as read for a user
 */
export const markAllNotificationsAsRead = async (userId, userRole) => {
  try {
    const result = await Notification.updateMany(
      { userId, userRole, isRead: false },
      { isRead: true, readAt: new Date() }
    );
    return result;
  } catch (error) {
    console.error("Failed to mark all notifications as read:", error);
    throw error;
  }
};

/**
 * Delete notification
 */
export const deleteNotification = async (notificationId, userId) => {
  try {
    const notification = await Notification.findOneAndDelete({ _id: notificationId, userId });
    return notification;
  } catch (error) {
    console.error("Failed to delete notification:", error);
    throw error;
  }
};

