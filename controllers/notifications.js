import ErrorHandler from "../middlewares/error.js";
import { getUserNotifications, markNotificationAsRead, markAllNotificationsAsRead, deleteNotification } from "../utils/notifications.js";

/**
 * Get all notifications for the authenticated user
 */
export const getUserNotificationsController = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;
    
    const { isRead, limit = 50, page = 1 } = req.query;
    
    const result = await getUserNotifications(userId, userRole, {
      isRead: isRead !== undefined ? isRead === 'true' : undefined,
      limit: parseInt(limit),
      page: parseInt(page)
    });

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark a specific notification as read
 */
export const markNotificationAsReadController = async (req, res, next) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user._id;

    const notification = await markNotificationAsRead(notificationId, userId);

    if (!notification) {
      return next(new ErrorHandler("Notification not found or access denied", 404));
    }

    res.status(200).json({
      success: true,
      message: "Notification marked as read",
      data: notification
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark all notifications as read for the authenticated user
 */
export const markAllNotificationsAsReadController = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;

    const result = await markAllNotificationsAsRead(userId, userRole);

    res.status(200).json({
      success: true,
      message: "All notifications marked as read",
      data: {
        modifiedCount: result.modifiedCount
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a specific notification
 */
export const deleteNotificationController = async (req, res, next) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user._id;

    const notification = await deleteNotification(notificationId, userId);

    if (!notification) {
      return next(new ErrorHandler("Notification not found or access denied", 404));
    }

    res.status(200).json({
      success: true,
      message: "Notification deleted successfully"
    });
  } catch (error) {
    next(error);
  }
};

