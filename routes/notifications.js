import express from "express";
import { isAuthenticated } from "../middlewares/auth.js";
import {
  getUserNotificationsController,
  markNotificationAsReadController,
  markAllNotificationsAsReadController,
  deleteNotificationController
} from "../controllers/notifications.js";

const router = express.Router();

// Get all notifications for authenticated user
router.get("/", isAuthenticated, getUserNotificationsController);

// Mark a specific notification as read
router.patch("/:notificationId/read", isAuthenticated, markNotificationAsReadController);

// Mark all notifications as read
router.patch("/read-all", isAuthenticated, markAllNotificationsAsReadController);

// Delete a specific notification
router.delete("/:notificationId", isAuthenticated, deleteNotificationController);

export default router;

