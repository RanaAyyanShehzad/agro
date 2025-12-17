import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../context/NotificationContext";
import DisputeResponseModal from "../components/DisputeResponseModal";
import { Bell, Gavel, RefreshCw } from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

function getOrderStatus(order) {
  return (order?.orderStatus || order?.status || "").toLowerCase();
}

// Calculate total order amount from products
const calculateOrderTotal = (order) => {
  if (!order || !order.products || order.products.length === 0) {
    return order?.totalPrice || 0; // Fallback to existing totalPrice if no products
  }
  return order.products.reduce((total, product) => {
    const productData = product.productId || product;
    const price = parseFloat(productData.price || product.price || 0);
    const quantity = parseFloat(product.quantity || 1);
    return total + price * quantity;
  }, 0);
};

function SupplierDashboard() {
  const navigate = useNavigate();
  const [activeOrdersCount, setActiveOrdersCount] = useState(0);
  const [productsCount, setProductsCount] = useState(0);
  const [revenue, setRevenue] = useState(0);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [disputes, setDisputes] = useState([]);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [selectedDispute, setSelectedDispute] = useState(null);
  const { notifications, unreadCount, fetchNotifications } = useNotifications();
  const [revenueData, setRevenueData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch active orders count
        const ordersResponse = await axios.get(
          "https://agrofarm-vd8i.onrender.com/api/v1/order/supplier-orders",
          {
            withCredentials: true,
          }
        );

        const ordersData = ordersResponse.data || {};
        let orders = [];

        if (ordersData.success !== undefined) {
          if (ordersData.success) {
            orders = ordersData.orders || [];
          } else {
            throw new Error(ordersData.message || "Failed to load orders");
          }
        } else {
          orders = ordersData.orders || ordersData || [];
        }

        setActiveOrdersCount(orders.length);

        // Calculate revenue from all completed orders with completed payment
        // Filter orders that are delivered OR received AND have payment status "completed" only
        const completedOrders = orders.filter((order) => {
          const status = getOrderStatus(order);
          const paymentStatus = order.paymentInfo?.status?.toLowerCase() || "";
          return (
            (status === "delivered" || status === "received") &&
            paymentStatus === "completed"
          );
        });

        // Calculate total revenue from all completed orders (not just current month)
        const totalRevenue = completedOrders.reduce(
          (sum, order) => sum + calculateOrderTotal(order),
          0
        );
        setRevenue(totalRevenue);

        // Prepare revenue chart data for last 6 months
        const revenueChartData = [];
        for (let i = 5; i >= 0; i--) {
          const date = new Date();
          date.setMonth(date.getMonth() - i);
          const month = date.getMonth();
          const year = date.getFullYear();

          const monthOrders = orders.filter((order) => {
            const orderDate = new Date(order.createdAt);
            const status = getOrderStatus(order);
            const paymentStatus =
              order.paymentInfo?.status?.toLowerCase() || "";
            return (
              orderDate.getMonth() === month &&
              orderDate.getFullYear() === year &&
              (status === "delivered" || status === "received") &&
              paymentStatus === "completed"
            );
          });

          const monthRevenue = monthOrders.reduce(
            (sum, order) => sum + calculateOrderTotal(order),
            0
          );

          revenueChartData.push({
            month: date.toLocaleDateString("en-US", { month: "short" }),
            revenue: monthRevenue,
          });
        }
        setRevenueData(revenueChartData);

        // Set recent orders (latest 3)
        const sortedOrders = [...orders].sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );
        setRecentOrders(sortedOrders.slice(0, 3));

        // Fetch products count
        const productsResponse = await axios.get(
          "https://agrofarm-vd8i.onrender.com/api/products/my_product",
          {
            withCredentials: true,
          }
        );
        setProductsCount(productsResponse.data.products?.length || 0);

        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
        console.error("Error fetching dashboard data:", err);
      }
    };

    fetchData();
    fetchDisputes();
  }, []);

  const fetchDisputes = async () => {
    try {
      // Use seller disputes endpoint: GET /api/v1/order/disputes
      const response = await axios.get(
        "https://agrofarm-vd8i.onrender.com/api/v1/order/disputes",
        { withCredentials: true }
      );

      if (response.data.success && response.data.disputes) {
        // Filter to show only open/pending disputes on dashboard
        const activeDisputes = response.data.disputes.filter(
          (d) => d.status !== "closed"
        );
        setDisputes(activeDisputes);
      } else {
        setDisputes([]);
      }
    } catch (error) {
      console.error("Error fetching disputes:", error);
      setDisputes([]);
    }
  };

  function DashboardCard({ title, value, subtitle, icon, bgColor, textColor }) {
    return (
      <div
        className={`${bgColor} ${textColor} rounded-lg shadow-xl transform transition duration-300 ease-in-out hover:shadow-2xl hover:scale-105 p-6`}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium opacity-80">{title}</p>
            <p className="text-2xl font-bold mt-1">
              {loading ? "Loading..." : value}
            </p>
            {subtitle && <p className="text-xs mt-1 opacity-70">{subtitle}</p>}
          </div>
          <div className="ml-4">{icon}</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-500">Error loading dashboard: {error}</div>
    );
  }

  return (
    <div className="m-0 p-0">
      <h1 className="text-2xl font-semibold text-green-700 mb-6">
        Supplier Dashboard
      </h1>

      {/* Dashboard Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {/* Total Orders */}
        <DashboardCard
          title="Total Orders"
          value={activeOrdersCount}
          icon={
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          }
          bgColor="bg-green-50"
          textColor="text-green-700"
        />

        {/* Products Listed */}
        <DashboardCard
          title="Products Listed"
          value={productsCount}
          icon={
            <svg
              className="w-8 h-8 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          }
          bgColor="bg-blue-50"
          textColor="text-blue-700"
        />

        {/* Total Revenue */}
        <DashboardCard
          title="Total Revenue"
          value={`₨ ${revenue.toLocaleString()}`}
          subtitle="From completed orders"
          icon={
            <svg
              className="w-8 h-8 text-yellow-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
          bgColor="bg-yellow-50"
          textColor="text-yellow-700"
        />

        {/* Weather Status */}
        <DashboardCard
          title="Weather Status"
          value="Clear"
          subtitle="28°C - Islamabad"
          icon={
            <svg
              className="w-8 h-8 text-sky-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"
              />
            </svg>
          }
          bgColor="bg-sky-50"
          textColor="text-sky-700"
        />
      </div>

      {/* Revenue Chart and Recent Orders in One Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Revenue Chart */}
        <div className="bg-white rounded-lg shadow-xl p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Revenue Trend (Last 6 Months)
          </h2>
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <p className="text-gray-500">Loading chart data...</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip
                  formatter={(value) => `₨ ${value.toLocaleString()}`}
                  labelStyle={{ color: "#374151" }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#10b981"
                  strokeWidth={2}
                  name="Revenue"
                  dot={{ fill: "#10b981", r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-lg shadow-xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800">
              Recent Orders
            </h2>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={async () => {
                  setLoading(true);
                  const fetchData = async () => {
                    try {
                      const ordersResponse = await axios.get(
                        "https://agrofarm-vd8i.onrender.com/api/v1/order/supplier-orders",
                        { withCredentials: true }
                      );
                      const orders = ordersResponse.data.orders || [];
                      setRecentOrders(orders.slice(0, 3));
                      setLoading(false);
                    } catch (err) {
                      setLoading(false);
                    }
                  };
                  await fetchData();
                }}
                className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition"
                title="Refresh Orders"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => navigate("/supplier/orders")}
                className="text-green-600 hover:text-green-800 text-sm font-semibold"
              >
                View All
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs font-semibold tracking-wide text-gray-500 uppercase border-b-2 border-b-gray-300">
                  <th className="px-4 py-3">Order ID</th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Buyer</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="px-4 py-3 text-center">
                      Loading orders...
                    </td>
                  </tr>
                ) : recentOrders.length > 0 ? (
                  recentOrders.map((order) => (
                    <tr
                      key={order._id}
                      className="text-gray-700 border-b-2 border-b-gray-300"
                    >
                      <td className="px-4 py-3">#{order._id.slice(-6)}</td>
                      <td className="px-4 py-3">
                        {order.products[0]?.productId?.name ||
                          order.products[0]?.name ||
                          "N/A"}
                      </td>
                      <td className="px-4 py-3">
                        {(() => {
                          const customer =
                            order.customer ||
                            (order.buyerId && typeof order.buyerId === "object"
                              ? order.buyerId
                              : null);
                          return (
                            customer?.name ||
                            customer?.email ||
                            customer?.phone ||
                            "N/A"
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 text-xs font-semibold leading-tight rounded-full ${(() => {
                            const status = getOrderStatus(order);
                            if (status === "delivered" || status === "received")
                              return "text-green-700 bg-green-100";
                            if (status === "out_for_delivery")
                              return "text-orange-700 bg-orange-100";
                            if (status === "shipped")
                              return "text-indigo-700 bg-indigo-100";
                            if (
                              status === "processing" ||
                              status === "confirmed"
                            )
                              return "text-blue-700 bg-blue-100";
                            if (status === "pending")
                              return "text-yellow-700 bg-yellow-100";
                            if (status === "cancelled" || status === "canceled")
                              return "text-red-700 bg-red-100";
                            return "text-gray-700 bg-gray-100";
                          })()}`}
                        >
                          {(
                            order.orderStatus ||
                            order.status ||
                            "pending"
                          ).replace(/_/g, " ").toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold">
                        ₨ {calculateOrderTotal(order).toLocaleString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="px-4 py-3 text-center">
                      No recent orders found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Disputes & Notifications Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Disputes Section */}
        <div className="bg-white rounded-lg shadow-xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Gavel className="w-5 h-5 text-orange-600" />
              Active Disputes
            </h2>
            <div className="flex items-center gap-3">
              <button
                onClick={async () => {
                  await fetchDisputes();
                }}
                className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition"
                title="Refresh Disputes"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate("/supplier/disputes")}
                className="text-green-600 hover:text-green-800 text-sm font-semibold"
              >
                View All
              </button>
            </div>
          </div>
          {disputes.length > 0 ? (
            <div className="space-y-3">
              {disputes.slice(0, 3).map((dispute, index) => (
                <div
                  key={index}
                  className="p-3 bg-orange-50 border border-orange-200 rounded-lg"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        Order #
                        {typeof dispute.orderId === "object" &&
                        dispute.orderId?._id
                          ? dispute.orderId._id.slice(-8)
                          : typeof dispute.orderId === "string"
                          ? dispute.orderId.slice(-8)
                          : "N/A"}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        Status: {dispute.status}
                      </p>
                    </div>
                    {dispute.status === "open" && (
                      <button
                        onClick={() => {
                          // Navigate to orders page to handle dispute
                          navigate("/supplier/disputes");
                        }}
                        className="px-3 py-1 bg-orange-600 text-white text-xs rounded hover:bg-orange-700 transition"
                      >
                        View & Respond
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">
              No active disputes
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
            <div className="flex items-center gap-3">
              <button
                onClick={async () => {
                  await fetchNotifications();
                }}
                className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition"
                title="Refresh Notifications"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate("/notifications")}
                className="text-green-600 hover:text-green-800 text-sm font-semibold"
              >
                View All
              </button>
            </div>
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

      {/* Dispute Response Modal */}
      {showDisputeModal && selectedDispute && (
        <DisputeResponseModal
          isOpen={showDisputeModal}
          onClose={() => {
            setShowDisputeModal(false);
            setSelectedDispute(null);
          }}
          dispute={selectedDispute}
          onSuccess={() => {
            fetchDisputes();
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}

export default SupplierDashboard;
