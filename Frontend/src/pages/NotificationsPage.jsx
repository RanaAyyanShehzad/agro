import React, { useState, useEffect } from "react";
import { Bell, Check, Trash2, ExternalLink, Filter } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useNotifications } from "../context/NotificationContext";
import { toast } from "react-toastify";

function NotificationsPage() {
  const [filter, setFilter] = useState("all"); // all, read, unread
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    loading,
    pagination,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  useEffect(() => {
    const params = {
      page,
      limit: 20,
      ...(filter === "read" && { isRead: "true" }),
      ...(filter === "unread" && { isRead: "false" }),
    };
    fetchNotifications(params);
  }, [filter, page, fetchNotifications]);

  useEffect(() => {
    if (pagination.totalPages) {
      setTotalPages(pagination.totalPages);
    }
  }, [pagination]);

  const handleMarkAsRead = async (notificationId) => {
    try {
      await markAsRead(notificationId);
      toast.success("Notification marked as read");
    } catch (error) {
      toast.error("Failed to mark notification as read");
    }
  };

  const handleDelete = async (notificationId) => {
    try {
      await deleteNotification(notificationId);
      toast.success("Notification deleted");
    } catch (error) {
      toast.error("Failed to delete notification");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead();
      toast.success("All notifications marked as read");
    } catch (error) {
      toast.error("Failed to mark all as read");
    }
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.isRead) {
      await handleMarkAsRead(notification._id);
    }
    // Removed navigation - notifications are now informational only
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "order_placed":
        return "📦";
      case "order_accepted":
        return "✅";
      case "order_rejected":
        return "❌";
      case "order_shipped":
        return "🚚";
      case "order_delivered":
        return "📬";
      case "order_received":
        return "🎉";
      case "dispute_opened":
      case "dispute_created":
        return "⚠️";
      case "dispute_response":
        return "💬";
      case "dispute_escalated":
        return "🔴";
      case "dispute_resolved":
        return "⚖️";
      default:
        return "🔔";
    }
  };

  const getNotificationColor = (type, isRead) => {
    if (isRead) return "bg-white border-gray-200";
    if (type?.includes("order")) return "bg-blue-50 border-blue-300";
    if (type?.includes("dispute")) return "bg-orange-50 border-orange-300";
    return "bg-gray-50 border-gray-300";
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <Bell className="w-8 h-8 text-green-600" />
            Notifications
          </h1>
          <p className="text-gray-600 mt-1">
            {unreadCount > 0
              ? `${unreadCount} unread notification${
                  unreadCount > 1 ? "s" : ""
                }`
              : "All caught up!"}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            <Check className="w-4 h-4" />
            Mark all as read
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex items-center gap-4">
          <Filter className="w-5 h-5 text-gray-500" />
          <div className="flex gap-2">
            <button
              onClick={() => {
                setFilter("all");
                setPage(1);
              }}
              className={`px-4 py-2 rounded-lg transition ${
                filter === "all"
                  ? "bg-green-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              All
            </button>
            <button
              onClick={() => {
                setFilter("unread");
                setPage(1);
              }}
              className={`px-4 py-2 rounded-lg transition ${
                filter === "unread"
                  ? "bg-green-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Unread ({unreadCount})
            </button>
            <button
              onClick={() => {
                setFilter("read");
                setPage(1);
              }}
              className={`px-4 py-2 rounded-lg transition ${
                filter === "read"
                  ? "bg-green-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Read
            </button>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mx-auto"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center">
            <Bell className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 text-lg">No notifications found</p>
            <p className="text-gray-400 text-sm mt-2">
              {filter === "all"
                ? "You're all caught up!"
                : `No ${filter} notifications`}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map((notification) => (
              <motion.div
                key={notification._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 border-l-4 transition-all hover:bg-gray-50 ${
                  !notification.isRead
                    ? getNotificationColor(notification.type, false)
                    : getNotificationColor(notification.type, true)
                }`}
              >
                <div className="flex items-start gap-4">
                  <span className="text-3xl flex-shrink-0">
                    {getNotificationIcon(notification.type)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3
                            className={`font-semibold ${
                              notification.isRead
                                ? "text-gray-700"
                                : "text-gray-900"
                            }`}
                          >
                            {notification.title}
                          </h3>
                          {!notification.isRead && (
                            <span className="h-2 w-2 bg-blue-500 rounded-full flex-shrink-0"></span>
                          )}
                          {notification.priority && (
                            <span
                              className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getPriorityColor(
                                notification.priority
                              )}`}
                            >
                              {notification.priority}
                            </span>
                          )}
                        </div>
                        <p
                          className={`text-sm mt-1 ${
                            notification.isRead
                              ? "text-gray-600"
                              : "text-gray-800"
                          }`}
                        >
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span>
                            {new Date(notification.createdAt).toLocaleString()}
                          </span>
                          {notification.relatedType && (
                            <span className="capitalize">
                              {notification.relatedType}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!notification.isRead && (
                          <button
                            onClick={() => handleMarkAsRead(notification._id)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                            title="Mark as read"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(notification._id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-4 border-t border-gray-200 flex items-center justify-between">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default NotificationsPage;
