import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import axios from "axios";
import { useAuth } from "./AuthContext";

const NotificationContext = createContext();

const API_BASE = "https://agrofarm-vd8i.onrender.com/api";

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalNotifications: 0,
    hasMore: false,
  });
  const { isAuthenticated } = useAuth();

  const fetchNotifications = useCallback(
    async (params = {}) => {
      if (!isAuthenticated) {
        setNotifications([]);
        setUnreadCount(0);
        setPagination({
          currentPage: 1,
          totalPages: 1,
          totalNotifications: 0,
          hasMore: false,
        });
        return;
      }

      try {
        setLoading(true);
        const queryParams = new URLSearchParams({
          limit: params.limit || "50",
          page: params.page || "1",
          ...(params.isRead !== undefined && { isRead: params.isRead }),
        });

        const response = await axios.get(
          `${API_BASE}/notifications?${queryParams.toString()}`,
          { withCredentials: true }
        );

        console.log("Notifications API Response:", response.data);
        console.log("Response status:", response.status);

        // Handle different response structures
        let notificationsList = [];
        let unreadCountValue = 0;

        if (response.data.success) {
          const data = response.data.data || response.data;

          // Check if notifications are in data.notifications or directly in data
          notificationsList =
            data.notifications ||
            data.notification ||
            response.data.notifications ||
            [];
          setNotifications(notificationsList);

          console.log("Fetched notifications:", notificationsList.length);
          console.log("Notifications data:", notificationsList);

          // Handle both old and new response structures
          if (data.pagination) {
            // New structure with pagination object
            unreadCountValue = data.pagination.unreadCount || 0;
            setUnreadCount(unreadCountValue);
            setPagination({
              currentPage: data.pagination.currentPage || 1,
              totalPages: data.pagination.totalPages || 1,
              totalNotifications: data.pagination.totalNotifications || 0,
              hasMore: data.pagination.hasMore || false,
            });
          } else if (data.unreadCount !== undefined) {
            // Old structure (backward compatibility)
            unreadCountValue = data.unreadCount || 0;
            setUnreadCount(unreadCountValue);
            setPagination({
              currentPage: parseInt(params.page || "1"),
              totalPages: 1,
              totalNotifications: notificationsList.length,
              hasMore: false,
            });
          } else {
            // Fallback: calculate unread count from notifications
            unreadCountValue = notificationsList.filter(
              (n) => !n.isRead
            ).length;
            setUnreadCount(unreadCountValue);
            setPagination({
              currentPage: parseInt(params.page || "1"),
              totalPages: 1,
              totalNotifications: notificationsList.length,
              hasMore: false,
            });
          }

          console.log("Unread count:", unreadCountValue);
        } else if (response.data.notifications) {
          // Handle case where notifications are directly in response.data
          notificationsList = response.data.notifications || [];
          setNotifications(notificationsList);
          unreadCountValue = notificationsList.filter((n) => !n.isRead).length;
          setUnreadCount(unreadCountValue);
          console.log("Using direct notifications from response.data");
        } else {
          console.warn(
            "Notifications API returned success: false",
            response.data
          );
          console.warn("Full response:", response);
        }
      } catch (error) {
        console.error("Error fetching notifications:", error);
        console.error("Error response:", error.response?.data);
        console.error("Error status:", error.response?.status);
        // Don't show error toast for notifications to avoid spam
      } finally {
        setLoading(false);
      }
    },
    [isAuthenticated]
  );

  const markAsRead = useCallback(async (notificationId) => {
    try {
      const response = await axios.patch(
        `${API_BASE}/notifications/${notificationId}/read`,
        {},
        { withCredentials: true }
      );

      if (response.data.success) {
        setNotifications((prev) =>
          prev.map((notif) =>
            notif._id === notificationId
              ? { ...notif, isRead: true, readAt: new Date().toISOString() }
              : notif
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
      throw error;
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      const response = await axios.patch(
        `${API_BASE}/notifications/read-all`,
        {},
        { withCredentials: true }
      );

      if (response.data.success) {
        setNotifications((prev) =>
          prev.map((notif) => ({
            ...notif,
            isRead: true,
            readAt: new Date().toISOString(),
          }))
        );
        setUnreadCount(0);
      }
    } catch (error) {
      console.error("Error marking all as read:", error);
      throw error;
    }
  }, []);

  const deleteNotification = useCallback(async (notificationId) => {
    try {
      const response = await axios.delete(
        `${API_BASE}/notifications/${notificationId}`,
        { withCredentials: true }
      );

      if (response.data.success) {
        setNotifications((prev) => {
          const deleted = prev.find((n) => n._id === notificationId);
          const newList = prev.filter((n) => n._id !== notificationId);
          if (deleted && !deleted.isRead) {
            setUnreadCount((count) => Math.max(0, count - 1));
          }
          return newList;
        });
      }
    } catch (error) {
      console.error("Error deleting notification:", error);
      throw error;
    }
  }, []);

  // Fetch notifications on mount and when auth state changes
  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
      // Poll for new notifications every 30 seconds
      const interval = setInterval(() => {
        fetchNotifications();
      }, 30000);
      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        pagination,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within NotificationProvider"
    );
  }
  return context;
}
