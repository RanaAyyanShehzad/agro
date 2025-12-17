import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { motion } from "framer-motion";
import {
  ShoppingCart,
  Search,
  RefreshCw,
  Eye,
  Package,
  Truck,
  CheckCircle,
  Edit,
  CreditCard,
  Clock,
  History,
} from "lucide-react";
import { Link } from "react-router-dom";

const API_BASE = "https://agrofarm-vd8i.onrender.com/api/v1/admin";

// Helper function to format date and time in PKT (Pakistan Standard Time, UTC+5)
const formatDateAndTimePKT = (dateString) => {
  if (!dateString) return { date: "N/A", time: "N/A" };

  try {
    const date = new Date(dateString);
    // PKT is UTC+5, so add 5 hours to UTC time
    const pktOffset = 5 * 60 * 60 * 1000; // 5 hours in milliseconds
    const pktDate = new Date(date.getTime() + pktOffset);

    // Get UTC components (since we manually added offset)
    const year = pktDate.getUTCFullYear();
    const month = String(pktDate.getUTCMonth() + 1).padStart(2, "0");
    const day = String(pktDate.getUTCDate()).padStart(2, "0");
    const hours = String(pktDate.getUTCHours()).padStart(2, "0");
    const minutes = String(pktDate.getUTCMinutes()).padStart(2, "0");
    const seconds = String(pktDate.getUTCSeconds()).padStart(2, "0");

    // Format date as DD/MM/YYYY
    const dateStr = `${day}/${month}/${year}`;
    // Format time as HH:MM:SS
    const timeStr = `${hours}:${minutes}:${seconds}`;

    return { date: dateStr, time: timeStr };
  } catch (error) {
    console.error("Error formatting date:", error);
    return { date: "N/A", time: "N/A" };
  }
};

function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showPaymentStatusModal, setShowPaymentStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [newPaymentStatus, setNewPaymentStatus] = useState("");
  const [statusReason, setStatusReason] = useState("");
  const [orderHistory, setOrderHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      // Use correct admin orders endpoint from API docs: /api/v1/admin/orders
      const params = new URLSearchParams();
      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }
      params.append("page", "1");
      params.append("limit", "50");

      const response = await axios.get(
        `${API_BASE}/orders?${params.toString()}`,
        { withCredentials: true }
      );

      // Handle response according to API docs structure
      if (response.data.success && response.data.orders) {
        // Ensure orders array is properly set
        const ordersData = Array.isArray(response.data.orders)
          ? response.data.orders
          : [];
        setOrders(ordersData);
      } else {
        // Fallback for different response structure
        const ordersData = Array.isArray(response.data.orders)
          ? response.data.orders
          : Array.isArray(response.data)
          ? response.data
          : [];
        setOrders(ordersData);
      }
    } catch (error) {
      // Handle 404 - endpoint doesn't exist
      if (error.response?.status === 404) {
        console.warn(
          "Admin orders endpoint not found. This feature may not be implemented yet."
        );
        toast.info(
          "Admin orders endpoint is not available yet. Please contact the backend team."
        );
        setOrders([]);
      } else {
        console.error("Error fetching orders:", error);
        toast.error(error.response?.data?.message || "Failed to fetch orders");
        setOrders([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { bg: "bg-yellow-100", text: "text-yellow-800" },
      processing: { bg: "bg-blue-100", text: "text-blue-800" },
      shipped: { bg: "bg-purple-100", text: "text-purple-800" },
      delivered: { bg: "bg-green-100", text: "text-green-800" },
      received: { bg: "bg-green-200", text: "text-green-900" },
      canceled: { bg: "bg-red-100", text: "text-red-800" },
    };
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span
        className={`px-2 py-1 text-xs font-semibold rounded-full ${config.bg} ${config.text}`}
      >
        {status}
      </span>
    );
  };

  const getPaymentBadge = (status) => {
    const statusConfig = {
      pending: { bg: "bg-yellow-100", text: "text-yellow-800" },
      complete: { bg: "bg-green-100", text: "text-green-800" },
      refunded: { bg: "bg-red-100", text: "text-red-800" },
      cancelled: { bg: "bg-gray-100", text: "text-gray-800" },
    };
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span
        className={`px-2 py-1 text-xs font-semibold rounded-full ${config.bg} ${config.text}`}
      >
        {status}
      </span>
    );
  };

  const filteredOrders = orders.filter((order) => {
    if (!order) return false;

    // Handle both customerId (object) and buyerId (string/object) structures
    const customerName =
      (order.customerId &&
        typeof order.customerId === "object" &&
        order.customerId.name) ||
      (order.buyerId &&
        typeof order.buyerId === "object" &&
        order.buyerId.name) ||
      "";
    const orderId = order._id?.toLowerCase() || "";

    // If search term is empty, show all orders
    if (!searchTerm.trim()) return true;

    const matchesSearch =
      orderId.includes(searchTerm.toLowerCase()) ||
      customerName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const handleViewOrder = async (orderId) => {
    try {
      const response = await axios.get(`${API_BASE}/orders/${orderId}`, {
        withCredentials: true,
      });
      if (response.data.success && response.data.order) {
        setSelectedOrder(response.data.order);
        setShowOrderModal(true);
        // Fetch order history
        fetchOrderHistory(orderId);
      } else {
        toast.error("Failed to load order details");
      }
    } catch (error) {
      console.error("Error fetching order details:", error);
      toast.error(
        error.response?.data?.message || "Failed to load order details"
      );
    }
  };

  const fetchOrderHistory = async (orderId) => {
    try {
      setLoadingHistory(true);
      const response = await axios.get(
        `${API_BASE}/orders/${orderId}/history`,
        {
          withCredentials: true,
          params: {
            page: 1,
            limit: 50,
          },
        }
      );
      if (response.data.success && response.data.history) {
        setOrderHistory(response.data.history || []);
      } else {
        setOrderHistory([]);
      }
    } catch (error) {
      console.error("Error fetching order history:", error);
      // Don't show error toast for history, just set empty array
      setOrderHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleStatusChange = async () => {
    if (!selectedOrder || !newStatus) return;
    try {
      const requestBody = {
        status: newStatus,
      };
      // Add reason if provided
      if (statusReason.trim()) {
        requestBody.reason = statusReason.trim();
      }

      const response = await axios.put(
        `${API_BASE}/orders/${selectedOrder._id}/status`,
        requestBody,
        { withCredentials: true }
      );
      if (response.data.success) {
        toast.success(
          response.data.message || "Order status updated successfully"
        );
        setShowStatusModal(false);
        setNewStatus("");
        setStatusReason("");
        fetchOrders();
        handleViewOrder(selectedOrder._id); // Refresh order details
        // Refresh history after status change
        setTimeout(() => {
          fetchOrderHistory(selectedOrder._id);
        }, 500);
      }
    } catch (error) {
      console.error("Error updating order status:", error);
      // toast.error(
      //   error.response?.data?.message || "Failed to update order status"
      // );
       setShowStatusModal(false);
        setNewStatus("");
        setStatusReason("");
        fetchOrders();
        handleViewOrder(selectedOrder._id); // Refresh order details
        // Refresh history after status change
        setTimeout(() => {
          fetchOrderHistory(selectedOrder._id);
        }, 500);
    }
  };

  const handlePaymentStatusChange = async () => {
    if (!selectedOrder || !newPaymentStatus) return;
    try {
      const response = await axios.put(
        `${API_BASE}/orders/${selectedOrder._id}/payment-status`,
        { paymentStatus: newPaymentStatus },
        { withCredentials: true }
      );
      if (response.data.success) {
        toast.success("Payment status updated successfully");
        setShowPaymentStatusModal(false);
        setNewPaymentStatus("");
        fetchOrders();
        handleViewOrder(selectedOrder._id); // Refresh order details
        // Refresh history after payment status change
        setTimeout(() => {
          fetchOrderHistory(selectedOrder._id);
        }, 500);
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to update payment status"
      );
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Order Management</h1>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="received">Received</option>
            <option value="canceled">Canceled</option>
          </select>
          <button
            onClick={fetchOrders}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mx-auto"></div>
          </div>
        ) : filteredOrders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Buyer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Items
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredOrders.map((order) => (
                  <motion.tr
                    key={order._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="hover:bg-gray-50 transition"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 font-mono">
                        {order._id || "N/A"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 font-medium">
                        {(() => {
                          // Handle customerId (object with name)
                          if (
                            order.customerId &&
                            typeof order.customerId === "object" &&
                            order.customerId.name
                          ) {
                            return order.customerId.name;
                          }
                          // Handle buyerId (object with name)
                          if (
                            order.buyerId &&
                            typeof order.buyerId === "object" &&
                            order.buyerId.name
                          ) {
                            return order.buyerId.name;
                          }
                          // Handle buyerId as string (old format)
                          if (typeof order.buyerId === "string") {
                            return "Buyer ID: " + order.buyerId.slice(-8);
                          }
                          return "Unknown";
                        })()}
                      </div>
                      <div className="text-sm text-gray-500">
                        {(() => {
                          if (
                            order.customerId &&
                            typeof order.customerId === "object" &&
                            order.customerId.email
                          ) {
                            return order.customerId.email;
                          }
                          if (
                            order.buyerId &&
                            typeof order.buyerId === "object" &&
                            order.buyerId.email
                          ) {
                            return order.buyerId.email;
                          }
                          return "";
                        })()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {order.products?.length || 0} items
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">
                        ₨ {Number(order.totalPrice || 0).toLocaleString()}
                      </div>
                      {order.orderType && (
                        <div className="text-xs text-gray-500 mt-1">
                          {order.orderType === "multivendor"
                            ? "Multi-vendor"
                            : "Standard"}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(order.status || order.orderStatus)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getPaymentBadge(
                        (() => {
                          // Try paymentInfo.status first (new format)
                          if (
                            order.paymentInfo &&
                            typeof order.paymentInfo === "object" &&
                            order.paymentInfo.status
                          ) {
                            return order.paymentInfo.status;
                          }
                          // Fallback to payment_status
                          if (order.payment_status) {
                            return order.payment_status;
                          }
                          return "pending";
                        })()
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex flex-col">
                        <span>
                          {formatDateAndTimePKT(order.createdAt).date}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatDateAndTimePKT(order.createdAt).time} PKT
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleViewOrder(order._id)}
                        className="text-blue-600 hover:text-blue-900 flex items-center gap-1 transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-gray-500">
            <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p>No orders found</p>
            <p className="text-sm mt-2">
              Note: Admin orders endpoint may need to be implemented
            </p>
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      {showOrderModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-800 mb-1">
                  Order Details
                </h2>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-mono text-gray-600">
                    {selectedOrder._id || "N/A"}
                  </p>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(selectedOrder._id);
                      toast.success("Order ID copied to clipboard!");
                    }}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    title="Copy Order ID"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                  </button>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowOrderModal(false);
                  setSelectedOrder(null);
                  setOrderHistory([]);
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Customer Info */}
              <div className="bg-gradient-to-br from-green-50 to-green-100 p-5 rounded-xl border border-green-200 shadow-sm">
                <h4 className="text-sm font-bold text-green-800 mb-4 flex items-center gap-2 uppercase tracking-wide">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                  CUSTOMER INFORMATION
                </h4>
                <div className="space-y-3 text-sm">
                  {(() => {
                    const customerObj =
                      selectedOrder.customerId ||
                      (selectedOrder.buyerId &&
                      typeof selectedOrder.buyerId === "object"
                        ? selectedOrder.buyerId
                        : null);
                    const customer = customerObj || null;

                    return (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Name</span>
                          <span className="font-medium text-gray-800">
                            {customer?.name || "N/A"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Email</span>
                          <span className="font-medium text-gray-800">
                            {customer?.email || "N/A"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Phone</span>
                          <span className="font-medium text-gray-800">
                            {customer?.phone ||
                              selectedOrder.shippingAddress?.phoneNumber ||
                              "N/A"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Address</span>
                          <span className="text-right font-medium text-gray-800">
                            {customer?.address ||
                              (selectedOrder.shippingAddress?.street &&
                              selectedOrder.shippingAddress?.city
                                ? `${selectedOrder.shippingAddress.street}, ${selectedOrder.shippingAddress.city}`
                                : selectedOrder.shippingAddress?.street ||
                                  "N/A")}
                          </span>
                        </div>
                      </>
                    );
                  })()}
                  {/* Order Date & Time */}
                  {selectedOrder.createdAt && (
                    <>
                      <div className="flex justify-between pt-2 border-t border-green-200">
                        <span className="text-gray-500">Order Date</span>
                        <span className="font-medium text-gray-800">
                          {formatDateAndTimePKT(selectedOrder.createdAt).date}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Order Time</span>
                        <span className="font-medium text-gray-800">
                          {formatDateAndTimePKT(selectedOrder.createdAt).time}{" "}
                          PKT
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Order Status */}
              <div className="bg-white border-2 border-gray-200 rounded-xl p-5 shadow-sm">
                <h4 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wide flex items-center justify-between">
                  <span>Order Status & Payment</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setNewStatus(
                          selectedOrder.status || selectedOrder.orderStatus
                        );
                        setShowStatusModal(true);
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                      title="Change Order Status"
                    >
                      <Edit className="w-3 h-3" />
                      Update Status
                    </button>
                    <button
                      onClick={() => {
                        setNewPaymentStatus(
                          selectedOrder.paymentInfo?.status ||
                            selectedOrder.payment_status ||
                            "pending"
                        );
                        setShowPaymentStatusModal(true);
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors"
                      title="Change Payment Status"
                    >
                      <CreditCard className="w-3 h-3" />
                      Update Payment
                    </button>
                  </div>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <p className="text-xs font-semibold text-gray-600 uppercase mb-2">
                      Order Status
                    </p>
                    {getStatusBadge(
                      selectedOrder.status || selectedOrder.orderStatus
                    )}
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <p className="text-xs font-semibold text-gray-600 uppercase mb-2">
                      Payment Status
                    </p>
                    {getPaymentBadge(
                      selectedOrder.paymentInfo?.status ||
                        selectedOrder.payment_status ||
                        "pending"
                    )}
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <p className="text-xs font-semibold text-gray-600 uppercase mb-2">
                      Dispute Status
                    </p>
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                      {selectedOrder.dispute_status || "none"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Products */}
              <div>
                <h4 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Package className="w-5 h-5 text-green-600" />
                  ORDER ITEMS ({selectedOrder.products?.length || 0})
                </h4>
                <div className="border-2 border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="divide-y divide-gray-200">
                    {selectedOrder.products?.map((item, index) => {
                      const product = item.productId || item;
                      const vendorName =
                        item.farmerId?.name ||
                        item.supplierId?.name ||
                        product.upLoadedBy?.uploaderName ||
                        "N/A";
                      const vendorRole = item.farmerId
                        ? "Farmer"
                        : item.supplierId
                        ? "Supplier"
                        : "N/A";
                      const vendorInfo =
                        item.farmerId || item.supplierId || null;

                      return (
                        <div
                          key={item._id || index}
                          className="p-4 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex gap-4">
                            {/* Product Image */}
                            {product.images?.[0] && (
                              <img
                                src={product.images[0]}
                                alt={product.name}
                                className="h-20 w-20 rounded-lg object-cover border-2 border-gray-200 shadow-sm flex-shrink-0"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex-1">
                                  <h4 className="font-semibold text-gray-900 text-base">
                                    {product.name || "Unknown Product"}
                                  </h4>
                                  <p className="text-sm text-gray-600 mt-1">
                                    Quantity: {item.quantity}{" "}
                                    {product.unit ? product.unit : ""} × ₨
                                    {Number(
                                      item.price || product.price || 0
                                    ).toLocaleString()}
                                  </p>
                                </div>
                                <div className="text-right ml-4">
                                  <p className="font-bold text-gray-900 text-lg">
                                    ₨
                                    {(
                                      item.quantity *
                                      (item.price || product.price || 0)
                                    ).toLocaleString()}
                                  </p>
                                  <span className="inline-flex items-center px-2 py-1 mt-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                    {item.status ||
                                      product.status ||
                                      "processing"}
                                  </span>
                                </div>
                              </div>
                              {/* Seller Info */}
                              {vendorInfo && (
                                <div className="mt-3 pt-3 border-t border-gray-200">
                                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-3 rounded-lg border border-blue-200">
                                    <p className="text-xs font-bold text-blue-800 uppercase tracking-wide mb-2">
                                      {vendorRole} Information
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                                      <div>
                                        <span className="text-gray-500">
                                          Name:
                                        </span>{" "}
                                        <span className="font-medium text-gray-800">
                                          {vendorInfo.name || vendorName}
                                        </span>
                                      </div>
                                      {vendorInfo.email && (
                                        <div>
                                          <span className="text-gray-500">
                                            Email:
                                          </span>{" "}
                                          <span className="font-medium text-gray-800">
                                            {vendorInfo.email}
                                          </span>
                                        </div>
                                      )}
                                      {vendorInfo.phone && (
                                        <div>
                                          <span className="text-gray-500">
                                            Phone:
                                          </span>{" "}
                                          <span className="font-medium text-gray-800">
                                            {vendorInfo.phone}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Order Summary */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-5 border border-gray-200 shadow-sm">
                <div className="space-y-3">
                  {/* Calculate subtotal from all products */}
                  {(() => {
                    const subtotal =
                      selectedOrder.products?.reduce((sum, item) => {
                        const product = item.productId || item;
                        const price = item.price || product.price || 0;
                        return sum + item.quantity * price;
                      }, 0) ||
                      selectedOrder.totalPrice ||
                      0;

                    const deliveryFee = selectedOrder.deliveryFee || 0;
                    const total = subtotal + deliveryFee;

                    return (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-base text-gray-600">
                            Subtotal
                          </span>
                          <span className="text-lg font-semibold text-gray-800">
                            ₨{Number(subtotal).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-base text-gray-600">
                            Delivery Fee
                          </span>
                          <span className="text-lg font-semibold text-gray-800">
                            ₨{Number(deliveryFee).toLocaleString()}
                          </span>
                        </div>
                        <div className="border-t border-gray-300 pt-3 mt-3">
                          <div className="flex justify-between items-center">
                            <span className="text-xl font-bold text-gray-900">
                              Total Amount
                            </span>
                            <span className="text-3xl font-bold text-green-600">
                              ₨{Number(total).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
                {selectedOrder.paymentInfo && (
                  <div className="mt-4 pt-4 border-t border-gray-300">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">
                        Payment Method
                      </span>
                      <span className="text-sm font-medium text-gray-800">
                        {selectedOrder.paymentInfo.method || "N/A"}
                      </span>
                    </div>
                    {selectedOrder.paymentInfo.transactionId && (
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-sm text-gray-600">
                          Transaction ID
                        </span>
                        <span className="text-sm font-medium text-gray-800">
                          {selectedOrder.paymentInfo.transactionId}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Order Status History */}
              <div className="border-t border-gray-200 pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <History className="w-5 h-5 text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-800">
                    Status History
                  </h3>
                </div>
                {loadingHistory ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500 mx-auto"></div>
                    <p className="text-sm text-gray-500 mt-2">
                      Loading history...
                    </p>
                  </div>
                ) : orderHistory.length > 0 ? (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {orderHistory.map((entry, index) => (
                      <div
                        key={entry._id || index}
                        className="relative pl-8 pb-4 border-l-2 border-gray-200 last:border-l-0"
                      >
                        <div className="absolute left-0 top-0 w-4 h-4 bg-green-500 rounded-full -translate-x-[9px]"></div>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-gray-900">
                                  {entry.changedBy?.name || "System"}
                                </span>
                                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800 capitalize">
                                  {entry.changedBy?.role || "system"}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600">
                                Changed {entry.changeType?.replace("_", " ")}{" "}
                                from{" "}
                                <span className="font-medium text-gray-800">
                                  "{entry.oldValue}"
                                </span>{" "}
                                to{" "}
                                <span className="font-medium text-green-600">
                                  "{entry.newValue}"
                                </span>
                              </p>
                              {entry.notes && (
                                <p className="text-sm text-gray-500 mt-1 italic">
                                  Note: {entry.notes}
                                </p>
                              )}
                              {entry.reason && (
                                <p className="text-sm text-gray-500 mt-1">
                                  Reason: {entry.reason}
                                </p>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-1 text-sm text-gray-500 ml-4">
                              <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                <span className="font-medium">
                                  {formatDateAndTimePKT(entry.timestamp).date}
                                </span>
                              </div>
                              <span className="text-xs">
                                {formatDateAndTimePKT(entry.timestamp).time} PKT
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <History className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                    <p>No status history available</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Status Change Modal */}
      {showStatusModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
          >
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Change Order Status
            </h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Status *
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Select Status</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="confirmed">Confirmed</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="received">Received</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason (Optional)
              </label>
              <textarea
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                placeholder="Enter reason for status change (e.g., Admin override due to shipping delay)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows="3"
              />
              <p className="text-xs text-gray-500 mt-1">
                This reason will be included in the notification sent to the
                customer.
              </p>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowStatusModal(false);
                  setNewStatus("");
                  setStatusReason("");
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleStatusChange}
                disabled={!newStatus}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Update Status
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Payment Status Change Modal */}
      {showPaymentStatusModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
          >
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Change Payment Status
            </h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Payment Status
              </label>
              <select
                value={newPaymentStatus}
                onChange={(e) => setNewPaymentStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="pending">Pending</option>
                <option value="complete">Complete</option>
                <option value="refunded">Refunded</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowPaymentStatusModal(false);
                  setNewPaymentStatus("");
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={handlePaymentStatusChange}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition"
              >
                Update Payment Status
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

export default AdminOrders;
