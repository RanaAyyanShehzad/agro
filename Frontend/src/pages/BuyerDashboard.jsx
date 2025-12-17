import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { useNotifications } from "../context/NotificationContext";
import DisputeResolveModal from "../components/DisputeResolveModal";
import { Bell, Gavel, AlertCircle, RefreshCw } from "lucide-react";
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

function BuyerDashboard() {
  const navigate = useNavigate();
  const [ordersCount, setOrdersCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [cartItemsCount, setCartItemsCount] = useState(0);
  const [recentOrders, setRecentOrders] = useState([]);
  const [recommendedProducts, setRecommendedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [orderChartData, setOrderChartData] = useState([]);
  const [spendingData, setSpendingData] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [selectedDispute, setSelectedDispute] = useState(null);
  const { notifications, unreadCount, fetchNotifications } = useNotifications();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch buyer's orders
        const ordersResponse = await axios.get(
          "https://agrofarm-vd8i.onrender.com/api/v1/order/user-orders",
          { withCredentials: true }
        );
        const allOrders = ordersResponse.data.orders || [];
        setOrdersCount(allOrders.length);
        setRecentOrders(allOrders.slice(0, 3) || []);

        // Prepare order chart data (last 6 months)
        const orderChartData = [];
        for (let i = 5; i >= 0; i--) {
          const date = new Date();
          date.setMonth(date.getMonth() - i);
          const monthOrders = allOrders.filter((order) => {
            const orderDate = new Date(order.createdAt);
            return (
              orderDate.getMonth() === date.getMonth() &&
              orderDate.getFullYear() === date.getFullYear()
            );
          });
          orderChartData.push({
            month: date.toLocaleDateString("en-US", { month: "short" }),
            orders: monthOrders.length,
            spending: monthOrders.reduce(
              (sum, order) => sum + (order.totalPrice || 0),
              0
            ),
          });
        }
        setOrderChartData(orderChartData);
        setSpendingData(orderChartData);

        // Fetch wishlist count
        const wishlistResponse = await axios.get(
          "https://agrofarm-vd8i.onrender.com/api/wishlist/my-wishlist",
          { withCredentials: true }
        );
        setWishlistCount(wishlistResponse.data.wishlist?.products?.length || 0);

        // Fetch cart items count
        const cartResponse = await axios.get(
          "https://agrofarm-vd8i.onrender.com/api/cart/my-cart",
          { withCredentials: true }
        );
        setCartItemsCount(cartResponse.data.cart?.products?.length || 0);

        // Fetch recommended products
        const productsResponse = await axios.get(
          "https://agrofarm-vd8i.onrender.com/api/products/all",
          {
            withCredentials: true,
          }
        );
        setRecommendedProducts(
          productsResponse.data.products?.slice(0, 4) || []
        );

        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
        console.error("Error fetching dashboard data:", err);
      }
    };

    fetchData();
    fetchBuyerDisputes();
  }, []);

  const fetchBuyerDisputes = async () => {
    try {
      // Use buyer disputes endpoint: GET /api/v1/order/disputes/buyer
      const response = await axios.get(
        "https://agrofarm-vd8i.onrender.com/api/v1/order/disputes/buyer",
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

  function DashboardCard({
    title,
    value,
    subtitle,
    icon,
    bgColor,
    textColor,
    link,
  }) {
    return (
      <Link to={link || "#"}>
        <div
          className={`${bgColor} ${textColor} rounded-lg shadow-xl transform transition duration-300 ease-in-out hover:shadow-2xl hover:scale-105 p-6 cursor-pointer`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium opacity-80">{title}</p>
              <p className="text-2xl font-bold mt-1">
                {loading ? "Loading..." : value}
              </p>
              {subtitle && (
                <p className="text-xs mt-1 opacity-70">{subtitle}</p>
              )}
            </div>
            <div className="ml-4">{icon}</div>
          </div>
        </div>
      </Link>
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
        Buyer Dashboard
      </h1>

      {/* Dashboard Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {/* My Orders */}
        <DashboardCard
          title="My Orders"
          value={ordersCount}
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
          link="/buyer/myorders"
        />

        {/* My Wishlist */}
        <DashboardCard
          title="Wishlist"
          value={wishlistCount}
          icon={
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          }
          bgColor="bg-red-50"
          textColor="text-red-700"
          link="/buyer/wishlist"
        />

        {/* My Cart */}
        <DashboardCard
          title="Cart Items"
          value={cartItemsCount}
          // subtitle={
          //   cartItemsCount > 0 ? "Ready to checkout" : "Your cart is empty"
          // }
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
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          }
          bgColor="bg-blue-50"
          textColor="text-blue-700"
          link="/buyer/cart"
        />

        {/* Quick Actions */}
        <DashboardCard
          title="Quick Actions"
          value="Browse"
          // subtitle="Shop fresh products"
          icon={
            <svg
              className="w-8 h-8 text-purple-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          }
          bgColor="bg-purple-50"
          textColor="text-purple-700"
          link="/buyer/products"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Orders Chart */}
        <div className="bg-white rounded-lg shadow-xl p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Orders Trend (Last 6 Months)
          </h2>
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={orderChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="orders" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Spending Chart */}
        <div className="bg-white rounded-lg shadow-xl p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Spending Trend (Last 6 Months)
          </h2>
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={spendingData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip
                  formatter={(value) => [
                    `₨ ${value.toLocaleString()}`,
                    "Spending",
                  ]}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="spending"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: "#3b82f6", r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Main Content Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800">
              Recent Orders
            </h2>
            <div className="flex items-center gap-3">
              <button
                onClick={async () => {
                  setLoading(true);
                  try {
                    const ordersResponse = await axios.get(
                      "https://agrofarm-vd8i.onrender.com/api/v1/order/user-orders",
                      { withCredentials: true }
                    );
                    const allOrders = ordersResponse.data.orders || [];
                    setRecentOrders(allOrders.slice(0, 3));
                    setLoading(false);
                  } catch (err) {
                    setLoading(false);
                  }
                }}
                className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition"
                title="Refresh Orders"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <Link
                to="/buyer/myorders"
                className="text-green-600 hover:text-green-800 text-sm font-semibold"
              >
                View All
              </Link>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs font-semibold tracking-wide text-gray-500 uppercase border-b-2 border-b-gray-300">
                  <th className="px-4 py-3">Order ID</th>
                  <th className="px-4 py-3">Items</th>
                  <th className="px-4 py-3">Date</th>
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
                        {order.products.length} item
                        {order.products.length !== 1 ? "s" : ""}
                      </td>
                      <td className="px-4 py-3">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 text-xs font-semibold leading-tight rounded-full ${
                            order.status === "delivered"
                              ? "text-green-700 bg-green-100"
                              : order.status === "shipped"
                              ? "text-blue-700 bg-blue-100"
                              : "text-yellow-700 bg-yellow-100"
                          }`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold">
                        ₨ {order.totalPrice.toLocaleString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="px-4 py-3 text-center">
                      No recent orders found.{" "}
                      <Link
                        to="/buyer/products"
                        className="text-green-600 hover:text-green-800 font-semibold"
                      >
                        Start shopping
                      </Link>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recommended Products */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800">
              Recommended Products
            </h2>
            <Link
              to="/buyer/products"
              className="text-sm text-green-600 hover:text-green-800"
            >
              View All
            </Link>
          </div>
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-4">Loading products...</div>
            ) : recommendedProducts.length > 0 ? (
              recommendedProducts.map((product) => (
                <Link
                  to={`/product/${product._id}`}
                  key={product._id}
                  className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg border-b-2 border-gray-400 transition-colors"
                >
                  <div className="flex-shrink-0">
                    <img
                      src={
                        product.images[0] || "https://via.placeholder.com/50"
                      }
                      alt={product.name}
                      className="w-12 h-12 object-cover rounded"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {product.name}
                    </p>
                    <p className="text-sm text-gray-500">{product.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-green-600">
                      ₨ {product.price.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500">
                      {product.quantity > 0 ? "In stock" : "Out of stock"}
                    </p>
                  </div>
                </Link>
              ))
            ) : (
              <div className="text-center py-4 text-gray-500">
                No recommended products found
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Disputes & Notifications Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Disputes Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Gavel className="w-5 h-5 text-orange-600" />
              My Disputes
            </h2>
            <div className="flex items-center gap-3">
              <button
                onClick={async () => {
                  await fetchBuyerDisputes();
                }}
                className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition"
                title="Refresh Disputes"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <Link
                to="/buyer/disputes"
                className="text-sm text-green-600 hover:text-green-800 font-semibold"
              >
                View All
              </Link>
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
                      {dispute.sellerResponse?.proposal &&
                        dispute.sellerResponse?.respondedAt && (
                          <p className="text-xs text-blue-600 mt-1">
                            Seller has responded
                          </p>
                        )}
                    </div>
                    {dispute.status === "open" &&
                      dispute.sellerResponse?.proposal &&
                      dispute.sellerResponse?.respondedAt && (
                        <button
                          onClick={() => {
                            // If we have a real dispute ID, show modal, otherwise navigate
                            if (
                              dispute._id &&
                              !dispute._id.toString().includes("_dispute")
                            ) {
                              setSelectedDispute(dispute);
                              setShowDisputeModal(true);
                            } else {
                              navigate("/buyer/disputes");
                            }
                          }}
                          className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition"
                        >
                          Resolve
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
        <div className="bg-white rounded-lg shadow p-6">
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
              <Link
                to="/notifications"
                className="text-sm text-green-600 hover:text-green-800 font-semibold"
              >
                View All
              </Link>
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

      {/* Dispute Resolve Modal */}
      {showDisputeModal && selectedDispute && (
        <DisputeResolveModal
          isOpen={showDisputeModal}
          onClose={() => {
            setShowDisputeModal(false);
            setSelectedDispute(null);
          }}
          dispute={selectedDispute}
          onSuccess={() => {
            fetchBuyerDisputes();
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}

export default BuyerDashboard;
