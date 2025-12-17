import React, { useState, useEffect } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Users,
  Package,
  ShoppingCart,
  TrendingUp,
  AlertCircle,
  RefreshCw,
  Bell,
  Gavel,
} from "lucide-react";
import { useNotifications } from "../context/NotificationContext";

const API_BASE = "https://agrofarm-vd8i.onrender.com/api/v1/admin";

function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProducts: 0,
    totalOrders: 0,
    activeUsers: 0,
    inactiveProducts: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userChartData, setUserChartData] = useState([]);
  const [orderChartData, setOrderChartData] = useState([]);
  const [productStatusData, setProductStatusData] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [disputesCount, setDisputesCount] = useState({
    open: 0,
    pending_review: 0,
    total: 0,
  });
  const { notifications, unreadCount } = useNotifications();

  useEffect(() => {
    fetchDashboardData();
    fetchDisputes();
  }, []);

  const fetchDisputes = async () => {
    try {
      const response = await axios.get(`${API_BASE}/disputes?limit=5`, {
        withCredentials: true,
      });
      if (response.data.success) {
        const disputesData = response.data.disputes || [];
        setDisputes(disputesData);
        setDisputesCount({
          open: disputesData.filter((d) => d.status === "open").length,
          pending_review: disputesData.filter(
            (d) => d.status === "pending_admin_review"
          ).length,
          total: response.data.total || disputesData.length,
        });
      }
    } catch (error) {
      console.error("Error fetching disputes:", error);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch all users
      const usersRes = await axios.get(`${API_BASE}/users`, {
        withCredentials: true,
      });
      const users = usersRes.data.users || [];
      const activeUsers = users.filter(
        (u) => u.isActive && !u.isAccountDeleted
      );
      setStats((prev) => ({
        ...prev,
        totalUsers: users.length,
        activeUsers: activeUsers.length,
      }));

      // Prepare user chart data by role
      const roleCounts = {};
      users.forEach((user) => {
        roleCounts[user.role] = (roleCounts[user.role] || 0) + 1;
      });
      setUserChartData(
        Object.entries(roleCounts).map(([name, value]) => ({ name, value }))
      );

      // Fetch products
      const productsRes = await axios.get(`${API_BASE}/products?status=all`, {
        withCredentials: true,
      });
      const products = productsRes.data.products || [];
      const inactiveProducts = products.filter((p) => !p.isActive);
      setStats((prev) => ({
        ...prev,
        totalProducts: products.length,
        inactiveProducts: inactiveProducts.length,
      }));

      // Prepare product status data
      const statusCounts = {
        active: products.filter((p) => p.isActive && p.quantity > 0).length,
        inactive: inactiveProducts.length,
        zeroStock: products.filter((p) => p.quantity === 0).length,
      };
      setProductStatusData(
        Object.entries(statusCounts).map(([name, value]) => ({ name, value }))
      );

      // Fetch orders - try to get all orders
      try {
        let allOrders = [];
        let page = 1;
        let hasMore = true;
        const limit = 1000; // Fetch in batches

        // Fetch all orders using pagination
        while (hasMore && page <= 10) {
          // Safety limit to prevent infinite loops
          try {
            const ordersRes = await axios.get(
              `${API_BASE}/orders?limit=${limit}&page=${page}`,
              {
                withCredentials: true,
              }
            );
            const orders = ordersRes.data.orders || [];

            if (orders.length === 0) {
              // No more orders
              hasMore = false;
            } else {
              allOrders = [...allOrders, ...orders];

              // If total is provided and we've reached it, stop
              if (
                ordersRes.data.total &&
                allOrders.length >= ordersRes.data.total
              ) {
                hasMore = false;
              } else if (orders.length < limit) {
                // Got fewer orders than limit, no more pages
                hasMore = false;
              }
            }
          } catch (pageError) {
            console.error(`Error fetching orders page ${page}:`, pageError);
            hasMore = false;
          }

          page++;
        }

        // Calculate the 6-month window (same as graph)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        sixMonthsAgo.setDate(1); // Start of the month 6 months ago
        sixMonthsAgo.setHours(0, 0, 0, 0);

        // Filter orders to only include those from the last 6 months (for chart and order count)
        const ordersLast6Months = allOrders.filter((order) => {
          if (!order.createdAt && !order.orderDate) return false;
          try {
            const orderDate = new Date(order.createdAt || order.orderDate);
            // Check if order date is valid and within the 6-month window
            if (isNaN(orderDate.getTime())) return false;
            return orderDate >= sixMonthsAgo;
          } catch (e) {
            return false;
          }
        });

        // Calculate total orders (all orders from last 6 months)
        const totalOrders = ordersLast6Months.length;

        console.log("Total Orders (Last 6 Months):", totalOrders);
        console.log("All Orders Count:", allOrders.length);

        setStats((prev) => ({
          ...prev,
          totalOrders,
        }));

        // Prepare order trend data (last 6 months)
        const orderTrendData = [];

        for (let i = 5; i >= 0; i--) {
          const date = new Date();
          date.setMonth(date.getMonth() - i);
          const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
          monthStart.setHours(0, 0, 0, 0);
          const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
          monthEnd.setHours(23, 59, 59, 999);

          // Filter orders for this month (from the already filtered 6-month set)
          const monthOrders = ordersLast6Months.filter((order) => {
            try {
              const orderDate = new Date(order.createdAt || order.orderDate);
              if (isNaN(orderDate.getTime())) return false;
              return orderDate >= monthStart && orderDate <= monthEnd;
            } catch (e) {
              return false;
            }
          });

          // Count orders for this month
          const monthOrderCount = monthOrders.length;

          orderTrendData.push({
            month: date.toLocaleDateString("en-US", { month: "short" }),
            orders: monthOrderCount,
          });
        }

        setOrderChartData(orderTrendData);
      } catch (orderError) {
        console.error("Could not fetch orders:", orderError);
        // Set default empty data
        const defaultData = [];
        for (let i = 5; i >= 0; i--) {
          const date = new Date();
          date.setMonth(date.getMonth() - i);
          defaultData.push({
            month: date.toLocaleDateString("en-US", { month: "short" }),
            orders: 0,
          });
        }
        setOrderChartData(defaultData);
        // Don't set error state for orders, just log it
        console.warn("Orders data unavailable, using defaults");
      }

      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
      console.error("Error fetching dashboard data:", err);
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.4, ease: "easeOut" },
    },
    hover: {
      y: -6,
      scale: 1.01,
      boxShadow: "0 20px 40px rgba(16, 185, 129, 0.15)",
    },
  };

  const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded">
          <p className="font-semibold">Error</p>
          <p>{error}</p>
          <button
            onClick={fetchDashboardData}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="m-0 p-0">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
        <button
          onClick={fetchDashboardData}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
        <motion.div
          className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 shadow-lg"
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          whileHover="hover"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600 opacity-80">
                Total Users
              </p>
              <p className="text-3xl font-bold text-blue-700 mt-1">
                {loading ? "..." : stats.totalUsers}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                {stats.activeUsers} active
              </p>
            </div>
            <Users className="w-12 h-12 text-blue-500" />
          </div>
        </motion.div>

        <motion.div
          className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 shadow-lg"
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          whileHover="hover"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600 opacity-80">
                Total Products
              </p>
              <p className="text-3xl font-bold text-green-700 mt-1">
                {loading ? "..." : stats.totalProducts}
              </p>
              <p className="text-xs text-green-600 mt-1">
                {stats.inactiveProducts} inactive
              </p>
            </div>
            <Package className="w-12 h-12 text-green-500" />
          </div>
        </motion.div>

        <motion.div
          className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 shadow-lg"
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          whileHover="hover"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600 opacity-80">
                Total Orders
              </p>
              <p className="text-3xl font-bold text-purple-700 mt-1">
                {loading ? "..." : stats.totalOrders}
              </p>
              <p className="text-xs text-purple-600 mt-1">Last 6 months</p>
            </div>
            <ShoppingCart className="w-12 h-12 text-purple-500" />
          </div>
        </motion.div>

        <motion.div
          className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-6 shadow-lg"
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          whileHover="hover"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-600 opacity-80">
                Inactive Products
              </p>
              <p className="text-3xl font-bold text-red-700 mt-1">
                {loading ? "..." : stats.inactiveProducts}
              </p>
            </div>
            <AlertCircle className="w-12 h-12 text-red-500" />
          </div>
        </motion.div>

        <motion.div
          className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-6 shadow-lg"
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          whileHover="hover"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-indigo-600 opacity-80">
                Active Users
              </p>
              <p className="text-3xl font-bold text-indigo-700 mt-1">
                {loading ? "..." : stats.activeUsers}
              </p>
              <p className="text-xs text-indigo-600 mt-1">
                {stats.totalUsers > 0
                  ? `${Math.round(
                      (stats.activeUsers / stats.totalUsers) * 100
                    )}%`
                  : "0%"}
              </p>
            </div>
            <TrendingUp className="w-12 h-12 text-indigo-500" />
          </div>
        </motion.div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Users by Role Chart */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Users by Role
          </h2>
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
            </div>
          ) : userChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={userChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {userChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              No user data available
            </div>
          )}
        </div>

        {/* Product Status Chart */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Product Status
          </h2>
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
            </div>
          ) : productStatusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={productStatusData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              No product data available
            </div>
          )}
        </div>

        {/* Orders Trend Chart */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Orders Trend (Last 6 Months)
          </h2>
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
            </div>
          ) : orderChartData.length > 0 &&
            orderChartData.some((d) => d.orders > 0) ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={orderChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="orders" fill="#3b82f6" name="Number of Orders" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              No orders data available
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-6 bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Link
            to="/admin/users"
            className="flex flex-col items-center justify-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition text-center"
          >
            <Users className="w-6 h-6 text-blue-600 mb-2" />
            <span className="text-sm font-medium text-blue-700">Users</span>
          </Link>
          <Link
            to="/admin/categories"
            className="flex flex-col items-center justify-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition text-center"
          >
            <Package className="w-6 h-6 text-green-600 mb-2" />
            <span className="text-sm font-medium text-green-700">
              Categories
            </span>
          </Link>
          <Link
            to="/admin/products"
            className="flex flex-col items-center justify-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition text-center"
          >
            <Package className="w-6 h-6 text-purple-600 mb-2" />
            <span className="text-sm font-medium text-purple-700">
              Products
            </span>
          </Link>
          <Link
            to="/admin/orders"
            className="flex flex-col items-center justify-center p-4 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition text-center"
          >
            <ShoppingCart className="w-6 h-6 text-yellow-600 mb-2" />
            <span className="text-sm font-medium text-yellow-700">Orders</span>
          </Link>
          <Link
            to="/admin/disputes"
            className="flex flex-col items-center justify-center p-4 bg-red-50 rounded-lg hover:bg-red-100 transition text-center"
          >
            <AlertCircle className="w-6 h-6 text-red-600 mb-2" />
            <span className="text-sm font-medium text-red-700">Disputes</span>
          </Link>
          <Link
            to="/admin/config"
            className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition text-center"
          >
            <TrendingUp className="w-6 h-6 text-gray-600 mb-2" />
            <span className="text-sm font-medium text-gray-700">Config</span>
          </Link>
        </div>
      </div>

      {/* Disputes & Notifications Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Disputes Section */}
        <div className="bg-white rounded-lg shadow-xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Gavel className="w-5 h-5 text-orange-600" />
              Disputes
              {disputesCount.pending_review > 0 && (
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {disputesCount.pending_review} pending
                </span>
              )}
            </h2>
            <Link
              to="/admin/disputes"
              className="text-green-600 hover:text-green-800 text-sm font-semibold"
            >
              View All
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-orange-50 p-3 rounded-lg">
              <p className="text-xs text-gray-600">Open</p>
              <p className="text-2xl font-bold text-orange-600">
                {disputesCount.open}
              </p>
            </div>
            <div className="bg-red-50 p-3 rounded-lg">
              <p className="text-xs text-gray-600">Pending Review</p>
              <p className="text-2xl font-bold text-red-600">
                {disputesCount.pending_review}
              </p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-xs text-gray-600">Total</p>
              <p className="text-2xl font-bold text-gray-600">
                {disputesCount.total}
              </p>
            </div>
          </div>
          {disputes.length > 0 ? (
            <div className="space-y-3">
              {disputes.slice(0, 3).map((dispute) => (
                <div
                  key={dispute._id}
                  className={`p-3 rounded-lg border ${
                    dispute.status === "pending_admin_review"
                      ? "bg-red-50 border-red-200"
                      : "bg-orange-50 border-orange-200"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        Dispute #{dispute._id?.slice(-8) || "N/A"}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        Order: #
                        {dispute.orderId?._id?.slice(-8) ||
                          dispute.orderId?.slice(-8) ||
                          "N/A"}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        Type: {dispute.disputeType?.replace("_", " ") || "N/A"}
                      </p>
                    </div>
                    <Link
                      to="/admin/disputes"
                      className="px-3 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700 transition"
                    >
                      Review
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">
              No disputes found
            </p>
          )}
        </div>

        {/* Notifications Section */}
        <div className="bg-white rounded-lg shadow-xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-600" />
              Notifications
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </h2>
            <Link
              to="/notifications"
              className="text-green-600 hover:text-green-800 text-sm font-semibold"
            >
              View All
            </Link>
          </div>
          {notifications.length > 0 ? (
            <div className="space-y-3">
              {notifications.slice(0, 5).map((notification) => (
                <div
                  key={notification._id}
                  className={`p-3 rounded-lg border ${
                    notification.isRead
                      ? "bg-gray-50 border-gray-200"
                      : "bg-blue-50 border-blue-200"
                  }`}
                >
                  <p className="text-sm font-medium text-gray-900">
                    {notification.title}
                  </p>
                  <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                    {notification.message}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(notification.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">
              No notifications
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
