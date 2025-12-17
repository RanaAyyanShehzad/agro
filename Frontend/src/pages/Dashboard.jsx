import React, { useState, useEffect } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { useDispatch, useSelector } from "react-redux";
import { setUser } from "../features/userSlice";
import { useTranslation } from "../hooks/useTranslation";
import { useWeatherDisplay } from "../hooks/useWeatherDisplay";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../context/NotificationContext";
import DisputeResponseModal from "../components/DisputeResponseModal";
import { AlertCircle, Bell, Gavel, RefreshCw } from "lucide-react";
import { toast } from "react-toastify";
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
  PieChart,
  Pie,
  Cell,
} from "recharts";

const getOrderStatus = (order) =>
  (order?.orderStatus || order?.status || "").toLowerCase();

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

function Dashboard() {
  const navigate = useNavigate();
  const [activeOrdersCount, setActiveOrdersCount] = useState(0);
  const [productsCount, setProductsCount] = useState(0);
  const [revenue, setRevenue] = useState(0);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [revenueData, setRevenueData] = useState([]);
  const [orderStatusData, setOrderStatusData] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [selectedDispute, setSelectedDispute] = useState(null);
  const { t } = useTranslation();
  const { notifications, unreadCount, fetchNotifications } = useNotifications();
  const {
    data: weatherData,
    city,
    status,
    alerts = [],
  } = useSelector((state) => state.weather);
  const fallbackWeather = useWeatherDisplay();
  const weatherLoading = status === "loading";
  const weatherTemperature =
    typeof weatherData?.temperature === "number"
      ? `${Math.round(weatherData.temperature)}°C`
      : fallbackWeather.temperature || "—";
  const weatherDescription =
    weatherData?.description || fallbackWeather.description || "—";
  const weatherLocation = city || fallbackWeather.city || "";
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
  const listItemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3, ease: "easeOut" },
    },
  };
  useEffect(() => {
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

        // Prepare revenue chart data (last 6 months)
        const revenueChartData = [];
        for (let i = 5; i >= 0; i--) {
          const date = new Date();
          date.setMonth(date.getMonth() - i);
          const monthOrders = orders.filter((order) => {
            const orderDate = new Date(order.createdAt);
            const status = getOrderStatus(order);
            const paymentStatus =
              order.paymentInfo?.status?.toLowerCase() || "";
            return (
              orderDate.getMonth() === date.getMonth() &&
              orderDate.getFullYear() === date.getFullYear() &&
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

        // Prepare order status chart data
        const statusCounts = {};
        orders.forEach((order) => {
          const status = getOrderStatus(order);
          statusCounts[status] = (statusCounts[status] || 0) + 1;
        });
        const statusData = Object.entries(statusCounts).map(
          ([name, value]) => ({
            name: name.charAt(0).toUpperCase() + name.slice(1),
            value,
          })
        );
        setOrderStatusData(statusData);

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
  }, []);

  function DashboardCard({ title, value, subtitle, icon, bgColor, textColor }) {
    return (
      <motion.div
        className={`${bgColor} ${textColor} rounded-xl p-6`}
        variants={cardVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        whileHover="hover"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium opacity-80">{title}</p>
            <p className="text-2xl font-bold mt-1">
              {loading ? t("common.loading") : value}
            </p>
            {subtitle && (
              <p className="text-xs mt-1 opacity-70 transition-colors">
                {subtitle}
              </p>
            )}
          </div>
          <motion.div
            className="ml-4"
            animate={{ rotate: [0, 2, -2, 0] }}
            transition={{ duration: 6, repeat: Infinity }}
          >
            {icon}
          </motion.div>
        </div>
      </motion.div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded">
          <p className="font-semibold">{t("weather.errorTitle") || "Error"}</p>
          <p>{error}</p>
          <button
            onClick={() => window.location.reload()}
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
      <h1 className="text-2xl font-semibold text-green-700 mb-6">
        {t("dashboard.title")}
      </h1>

      {/* Dashboard Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {/* Total Orders */}
        <DashboardCard
          title={t("dashboard.totalOrders")}
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
          title={t("dashboard.productsListed")}
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
          title={t("dashboard.revenueMonth") || "Total Revenue"}
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
          title={t("dashboard.weatherStatus")}
          value={weatherLoading ? t("common.loading") : weatherTemperature}
          subtitle={
            weatherLoading
              ? weatherDescription
              : `${weatherDescription}${
                  weatherLocation ? ` · ${weatherLocation}` : ""
                }`
          }
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

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Revenue Chart */}
        <div className="bg-white rounded-lg shadow-xl p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Revenue Trend (Last 6 Months)
          </h2>
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip
                  formatter={(value) => [
                    `₨ ${value.toLocaleString()}`,
                    "Revenue",
                  ]}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ fill: "#10b981", r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Order Status Chart */}
        <div className="bg-white rounded-lg shadow-xl p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Orders by Status
          </h2>
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
            </div>
          ) : orderStatusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={orderStatusData}
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
                  {orderStatusData.map((entry, index) => {
                    const colors = [
                      "#10b981",
                      "#3b82f6",
                      "#f59e0b",
                      "#ef4444",
                      "#8b5cf6",
                    ];
                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill={colors[index % colors.length]}
                      />
                    );
                  })}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              No order data available
            </div>
          )}
        </div>
      </div>

      {/* Main Content Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800">
              {t("dashboard.recentOrders")}
            </h2>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={async () => {
                  setLoading(true);
                  await fetchData();
                  toast.success("Orders refreshed");
                }}
                className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition"
                title="Refresh Orders"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => navigate("/farmer/orders")}
                className="text-green-600 hover:text-green-800 text-sm font-semibold"
              >
                {t("common.viewAll")}
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs font-semibold tracking-wide text-gray-500 uppercase border-b-2 border-b-gray-300">
                  <th className="px-4 py-3">{t("dashboard.table.order")}</th>
                  <th className="px-4 py-3">{t("dashboard.table.product")}</th>
                  <th className="px-4 py-3">{t("dashboard.table.buyer")}</th>
                  <th className="px-4 py-3">{t("dashboard.table.status")}</th>
                  <th className="px-4 py-3">{t("dashboard.table.amount")}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="px-4 py-3 text-center">
                      {t("dashboard.loadingOrders")}
                    </td>
                  </tr>
                ) : recentOrders.length > 0 ? (
                  recentOrders.map((order) => (
                    <motion.tr
                      key={order._id}
                      className="text-gray-700 border-b-2 border-b-gray-300"
                      variants={listItemVariants}
                      initial="hidden"
                      animate="visible"
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
                    </motion.tr>
                  ))
                ) : (
                  <motion.tr
                    variants={listItemVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    <td colSpan="5" className="px-4 py-3 text-center">
                      {t("dashboard.noOrders")}
                    </td>
                  </motion.tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Weather Forecast */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800">
              {t("dashboard.weatherForecast")}
            </h2>
            <span className="text-sm text-gray-500">
              {weatherLocation || t("weather.city")}
            </span>
          </div>
          <div className="space-y-4">
            {/* Today */}
            <motion.div
              className="flex items-center justify-between bg-sky-50 p-3 rounded-lg"
              variants={listItemVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
            >
              <div className="flex items-center space-x-3">
                <svg
                  className="w-10 h-10 text-yellow-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <div className="font-medium">{t("common.today")}</div>
                  <div className="text-sm text-gray-500">
                    {weatherDescription}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold">{weatherTemperature}</div>
                <div className="text-sm text-gray-500">
                  {weatherData?.humidity != null
                    ? `${weatherData.humidity}% ${
                        t("weather.humidity") || "Humidity"
                      }`
                    : "—"}
                </div>
              </div>
            </motion.div>

            {/* Weather Alerts (real-time from API) */}
            {/* <div className="mt-4 space-y-3">
              <h3 className="text-sm font-semibold text-gray-800">
                {t("weather.alerts")}
              </h3>
              {alerts && alerts.length > 0 ? (
                alerts.map((alert, index) => (
                  <motion.div
                    key={index}
                    className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded"
                    variants={listItemVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.3 }}
                  >
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg
                          className="h-5 w-5 text-yellow-500"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-yellow-800">
                          {alert.alert}
                        </p>
                        <p className="text-xs text-yellow-700 mt-1">
                          {t("weather.city")}: {alert.city} —{" "}
                          {alert.description}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <p className="text-sm text-gray-500">
                  {t("weather.noAlertsAvailable")}
                </p>
              )}
            </div> */}
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
                  toast.success("Disputes refreshed");
                }}
                className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition"
                title="Refresh Disputes"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate("/farmer/disputes")}
                className="text-green-600 hover:text-green-800 text-sm font-semibold"
              >
                View All
              </button>
            </div>
          </div>
          {disputes.length > 0 ? (
            <div className="space-y-3">
              {disputes.slice(0, 3).map((dispute, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
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
                          // Navigate to disputes page to handle dispute
                          navigate("/farmer/disputes");
                        }}
                        className="px-3 py-1 bg-orange-600 text-white text-xs rounded hover:bg-orange-700 transition"
                      >
                        View & Respond
                      </button>
                    )}
                  </div>
                </motion.div>
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
                  toast.success("Notifications refreshed");
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
                <motion.div
                  key={notification._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
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
                </motion.div>
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
            window.location.reload(); // Refresh dashboard data
          }}
        />
      )}
    </div>
  );
}

export default Dashboard;
