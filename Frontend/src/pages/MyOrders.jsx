import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import DisputeModal from "../components/DisputeModal";
import { RefreshCw, Gavel } from "lucide-react";

function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [reviewForm, setReviewForm] = useState({
    rating: 0,
    comment: "",
  });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [orderForDispute, setOrderForDispute] = useState(null);
  const [confirmingOrderId, setConfirmingOrderId] = useState(null);
  const navigate = useNavigate();
  const { role } = useAuth();

  // Get the appropriate products page based on user role
  const getProductsPage = () => {
    if (role === "farmer") {
      return "/farmer/farmerProducts";
    } else if (role === "buyer") {
      return "/buyer/products";
    }
    // Fallback (should not happen in protected routes)
    return "/";
  };

  // Format currency
  const formatCurrency = (amount) => {
    return `₨ ${amount?.toLocaleString() || "0"}`;
  };

  // Calculate total order amount from products
  const calculateOrderTotal = (order) => {
    if (!order.products || order.products.length === 0) {
      return order.totalPrice || 0;
    }
    return order.products.reduce((total, product) => {
      const price = product.productId?.price || product.price || 0;
      const quantity = product.quantity || 1;
      return total + price * quantity;
    }, 0);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const options = { year: "numeric", month: "long", day: "numeric" };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Get order status consistently - prioritize orderStatus, fallback to status
  const getOrderStatus = (order) => {
    return order?.orderStatus || order?.status || "pending";
  };

  // Get payment status consistently
  const getPaymentStatus = (order) => {
    return order?.paymentInfo?.status || order?.payment_status || "pending";
  };

  // Check if dispute can be created based on order status and timing
  const canCreateDispute = (order) => {
    const status = getOrderStatus(order);
    const disputeStatus = order?.dispute_status || "none";

    // If dispute already exists, cannot create a new one
    if (disputeStatus === "open" || disputeStatus === "pending_admin_review") {
      return { canCreate: false, reason: "dispute_exists" };
    }

    // For shipped orders: check if estimated delivery date has passed
    if (status === "shipped") {
      // Try order-level estimated delivery date first
      let estimatedDeliveryDate =
        order?.expected_delivery_date ||
        order?.estimatedDeliveryDate ||
        order?.deliveryInfo?.estimatedDeliveryDate;

      // If not found at order level, try to find from shipped products
      if (!estimatedDeliveryDate && order?.products?.length > 0) {
        // Find the earliest estimated delivery date from shipped products
        const shippedProducts = order.products.filter(
          (p) => p.status === "shipped" || p.status === "processing"
        );
        if (shippedProducts.length > 0) {
          const productDates = shippedProducts
            .map((p) => p.estimatedDeliveryDate)
            .filter(Boolean);
          if (productDates.length > 0) {
            // Use the earliest (soonest) estimated delivery date
            estimatedDeliveryDate = productDates.sort()[0];
          }
        }
      }

      if (!estimatedDeliveryDate) {
        return { canCreate: false, reason: "no_estimated_date" };
      }

      const estimatedDate = new Date(estimatedDeliveryDate);
      const now = new Date();

      // Check if estimated delivery date has passed (current time is after estimated date)
      if (now < estimatedDate) {
        return {
          canCreate: false,
          reason: "estimated_date_not_passed",
          estimatedDate: estimatedDate.toLocaleDateString(),
        };
      }

      return { canCreate: true };
    }

    // For delivered orders: check if still within dispute window (typically 7 days after delivery)
    if (status === "delivered") {
      const deliveredAt =
        order?.deliveredAt || order?.deliveryInfo?.actualDeliveryDate;

      if (!deliveredAt) {
        return { canCreate: true }; // Allow if no delivery date recorded
      }

      const deliveryDate = new Date(deliveredAt);
      const now = new Date();
      const daysSinceDelivery = Math.floor(
        (now - deliveryDate) / (1000 * 60 * 60 * 24)
      );

      // Dispute window: 7 days after delivery (should match backend configuration)
      // This is the predefined time period within which buyer can create dispute after delivery
      const DISPUTE_WINDOW_DAYS = 7;

      if (daysSinceDelivery > DISPUTE_WINDOW_DAYS) {
        return {
          canCreate: false,
          reason: "dispute_window_expired",
          daysSinceDelivery,
          windowDays: DISPUTE_WINDOW_DAYS,
        };
      }

      return {
        canCreate: true,
        daysRemaining: DISPUTE_WINDOW_DAYS - daysSinceDelivery,
      };
    }

    // For received orders: check if still within dispute window after receipt confirmation
    if (status === "received") {
      const receivedAt = order?.receivedAt;

      if (!receivedAt) {
        return { canCreate: true };
      }

      const receiptDate = new Date(receivedAt);
      const now = new Date();
      const daysSinceReceipt = Math.floor(
        (now - receiptDate) / (1000 * 60 * 60 * 24)
      );

      // Dispute window: 7 days after receipt confirmation (should match backend configuration)
      // This is the predefined time period within which buyer can create dispute after confirming receipt
      const DISPUTE_WINDOW_DAYS = 7;

      if (daysSinceReceipt > DISPUTE_WINDOW_DAYS) {
        return {
          canCreate: false,
          reason: "dispute_window_expired",
          daysSinceReceipt,
          windowDays: DISPUTE_WINDOW_DAYS,
        };
      }

      return {
        canCreate: true,
        daysRemaining: DISPUTE_WINDOW_DAYS - daysSinceReceipt,
      };
    }

    // For other statuses, cannot create dispute
    return { canCreate: false, reason: "invalid_status" };
  };

  // Check if dispute exists (open or pending review)
  const hasOpenDispute = (order) => {
    const disputeStatus = order?.dispute_status || "none";
    return disputeStatus === "open" || disputeStatus === "pending_admin_review";
  };

  // Star rating component
  const renderStarRating = (rating, interactive = false, onRate = null) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <button
          key={i}
          type={interactive ? "button" : "span"}
          onClick={interactive ? () => onRate(i) : undefined}
          className={`${
            interactive
              ? "cursor-pointer hover:scale-110 transition-transform"
              : "cursor-default"
          } ${i <= rating ? "text-yellow-400" : "text-gray-300"}`}
          disabled={!interactive}
        >
          <svg className="w-6 h-6 fill-current" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </button>
      );
    }
    return stars;
  };

  // Fetch user orders
  const fetchUserOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        "https://agrofarm-vd8i.onrender.com/api/v1/order/user-orders",
        {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch orders");
      }

      const data = await response.json();
      const ordersData = data.orders || [];
      
      // Debug: Log orders with trackingId to verify deliveryInfo
      const ordersWithTracking = ordersData.filter(o => o.trackingId);
      if (ordersWithTracking.length > 0) {
        console.log("Orders with tracking ID:", ordersWithTracking.map(o => ({
          orderId: o._id,
          trackingId: o.trackingId,
          hasDeliveryInfo: !!o.deliveryInfo,
          deliveryInfo: o.deliveryInfo,
          vehicleName: o.deliveryInfo?.vehicle?.name,
          riderName: o.deliveryInfo?.rider?.name,
          status: o.status || o.orderStatus
        })));
      }
      
      setOrders(ordersData);
    } catch (err) {
      setError(err.message || "Failed to fetch orders");
      toast.error(err.message || "Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  };

  // Confirm delivery (buyer) - marks order as "delivered"
  const confirmDelivery = async (orderId) => {
    if (confirmingOrderId) return; // Prevent duplicate calls

    if (
      !window.confirm(
        "Confirm that you have received this order? This will mark the order as delivered."
      )
    )
      return;

    try {
      setConfirmingOrderId(orderId);
      const response = await fetch(
        `https://agrofarm-vd8i.onrender.com/api/v1/order/${orderId}/confirm-delivery`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 400) {
          toast.error(
            data.message ||
              "Cannot confirm delivery. Order must be in 'out_for_delivery' status."
          );
        } else if (response.status === 403) {
          toast.error(
            data.message || "You don't have permission to confirm this order."
          );
        } else if (response.status === 404) {
          toast.error(data.message || "Order not found.");
        } else {
          toast.error(data.message || "Failed to confirm delivery");
        }
        throw new Error(data.message || "Failed to confirm delivery");
      }

      toast.success(data.message || "Order delivery confirmed successfully");
      await fetchUserOrders(); // Refresh orders
    } catch (err) {
      console.error("Error confirming delivery:", err);
      // Error toast already shown above
    } finally {
      setConfirmingOrderId(null);
    }
  };

  // Confirm order receipt (buyer) - marks order as "received" and completes payment
  const confirmOrderReceipt = async (orderId) => {
    if (confirmingOrderId) return; // Prevent duplicate calls

    if (
      !window.confirm(
        "Confirm that you have received this order? This will complete the payment."
      )
    )
      return;

    try {
      setConfirmingOrderId(orderId);
      const response = await fetch(
        `https://agrofarm-vd8i.onrender.com/api/v1/order/confirm-receipt/${orderId}`,
        {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 400) {
          toast.error(
            data.message ||
              "Cannot confirm receipt. Order must be in 'delivered' status and have no open disputes."
          );
        } else if (response.status === 403) {
          toast.error(
            data.message || "You don't have permission to confirm this order."
          );
        } else if (response.status === 404) {
          toast.error(data.message || "Order not found.");
        } else {
          toast.error(data.message || "Failed to confirm receipt");
        }
        throw new Error(data.message || "Failed to confirm receipt");
      }

      toast.success(data.message || "Order receipt confirmed successfully");
      await fetchUserOrders(); // Refresh orders
    } catch (err) {
      console.error("Error confirming receipt:", err);
      // Error toast already shown above
    } finally {
      setConfirmingOrderId(null);
    }
  };

  // Cancel order
  const cancelOrder = async (orderId) => {
    if (!window.confirm("Are you sure you want to cancel this order?")) return;

    try {
      const response = await fetch(
        `https://agrofarm-vd8i.onrender.com/api/v1/order/${orderId}/cancel`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to cancel order");
      }

      const data = await response.json();
      toast.success(data.message || "Order cancelled successfully");
      fetchUserOrders(); // Refresh orders list
    } catch (err) {
      console.error("Error cancelling order:", err);
      toast.error(err.message || "Failed to cancel order");
    }
  };

  // Open review modal
  const openReviewModal = (product) => {
    setSelectedProduct(product);
    setReviewForm({
      rating: 0,
      comment: "",
    });
    setShowReviewModal(true);
  };

  // Close review modal
  const closeReviewModal = () => {
    setShowReviewModal(false);
    setSelectedProduct(null);
    setReviewForm({
      rating: 0,
      comment: "",
    });
  };

  // Handle rating change
  const handleRatingChange = (rating) => {
    setReviewForm((prev) => ({
      ...prev,
      rating,
    }));
  };

  // Handle comment change
  const handleCommentChange = (e) => {
    setReviewForm((prev) => ({
      ...prev,
      comment: e.target.value,
    }));
  };

  // Submit review
  const submitReview = async (e) => {
    e.preventDefault();

    if (!selectedProduct) return;

    if (reviewForm.rating === 0) {
      toast.error("Please select a rating");
      return;
    }

    if (!reviewForm.comment.trim()) {
      toast.error("Please write a comment");
      return;
    }

    try {
      setSubmittingReview(true);

      const response = await fetch(
        "https://agrofarm-vd8i.onrender.com/api/review/add",
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            productId: selectedProduct.productId?._id,
            rating: reviewForm.rating,
            comment: reviewForm.comment.trim(),
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to submit review");
      }

      const data = await response.json();
      toast.success(data.message || "Review submitted successfully");
      closeReviewModal();
      fetchUserOrders(); // Refresh to show the review was added
    } catch (err) {
      console.error("Error submitting review:", err);
      toast.error(err.message || "Failed to submit review");
    } finally {
      setSubmittingReview(false);
    }
  };

  useEffect(() => {
    fetchUserOrders();
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-red-50 border-l-4 border-red-500 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-500"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-green-800">My Orders</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={async () => {
              await fetchUserOrders();
              toast.success("Orders refreshed");
            }}
            className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg shadow transition"
            title="Refresh Orders"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={() => navigate(getProductsPage())}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg shadow transition"
          >
            Continue Shopping
          </button>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-8 text-center max-w-md mx-auto">
          <div className="flex justify-center mb-6">
            <svg
              className="w-20 h-20 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-gray-800 mb-3">
            No Orders Found
          </h2>
          <p className="text-gray-500 mb-6">
            You haven't placed any orders yet
          </p>
          <button
            onClick={() => navigate(getProductsPage())}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg shadow-md transition-colors"
          >
            Browse Products
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => (
            <div
              key={order._id}
              className="bg-white rounded-xl shadow-md overflow-hidden"
            >
              <div className="p-6">
                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      Order #{order._id?.slice(-6).toUpperCase() || "N/A"}
                    </h2>
                    <p className="text-sm text-gray-500">
                      Placed on {formatDate(order.createdAt)}
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${(() => {
                        const status = getOrderStatus(order);
                        if (status === "canceled" || status === "cancelled") {
                          return "bg-red-100 text-red-800";
                        }
                        if (status === "delivered" || status === "received") {
                          return "bg-green-100 text-green-800";
                        }
                        if (status === "out_for_delivery") {
                          return "bg-orange-100 text-orange-800";
                        }
                        if (status === "shipped") {
                          return "bg-blue-100 text-blue-800";
                        }
                        if (status === "confirmed" || status === "processing") {
                          return "bg-purple-100 text-purple-800";
                        }
                        return "bg-yellow-100 text-yellow-800";
                      })()}`}
                    >
                      {getOrderStatus(order)?.replace(/_/g, " ").toUpperCase() || "PENDING"}
                    </span>
                    {order.trackingId && (
                      <div className="text-xs text-gray-600 mt-1">
                        Tracking ID: <span className="font-mono font-semibold">{order.trackingId}</span>
                      </div>
                    )}
                    <p className="text-lg font-semibold">
                      {formatCurrency(calculateOrderTotal(order))}
                    </p>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4 mt-4">
                  <h3 className="text-md font-medium text-gray-900 mb-3">
                    Order Items ({order.products?.length || 0})
                  </h3>
                  <div className="space-y-4">
                    {order.products?.map((product) => (
                      <div
                        key={product._id}
                        className="flex items-start gap-4 pb-4 border-b border-gray-100 last:border-0"
                      >
                        <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                          {product.productId?.images?.[0] ? (
                            <img
                              src={product.productId.images[0]}
                              alt={product.productId.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <svg
                                className="w-8 h-8"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="flex-grow w-full">
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                            <div className="flex-grow">
                              <h4 className="text-base font-bold text-gray-900 mb-2">
                                {product.productId?.name || "Unknown Product"}
                              </h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-500 font-medium">
                                    Quantity:
                                  </span>
                                  <span className="text-gray-900 font-semibold">
                                    {product.quantity || "1"}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-500 font-medium">
                                    Price:
                                  </span>
                                  <span className="text-gray-900 font-semibold">
                                    {formatCurrency(
                                      product.productId?.price || 0
                                    )}{" "}
                                    / {product.productId?.unit}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-500 font-medium">
                                    Total:
                                  </span>
                                  <span className="text-green-600 font-bold text-base">
                                    {formatCurrency(
                                      (product.productId?.price ||
                                        product.price ||
                                        0) * (product.quantity || 1)
                                    )}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-500 font-medium">
                                    Category:
                                  </span>
                                  <span className="text-gray-900 capitalize">
                                    {product.productId?.category}
                                  </span>
                                </div>
                              </div>
                              <div className="mt-3 pt-3 border-t border-gray-200">
                                <p className="text-sm text-gray-600">
                                  <span className="font-medium">Seller:</span>{" "}
                                  <span className="text-gray-900">
                                    {product.farmerId?.name ||
                                      product.supplierId?.name ||
                                      product.productId?.upLoadedBy
                                        ?.uploaderName ||
                                      "Unknown Seller"}
                                  </span>
                                </p>
                              </div>
                              {product.status && (
                                <div className="mt-3">
                                  <p className="text-sm">
                                    Status:{" "}
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                        product.status === "cancelled" ||
                                        product.status === "canceled"
                                          ? "bg-red-100 text-red-800"
                                          : product.status === "delivered"
                                          ? "bg-green-100 text-green-800"
                                          : product.status === "shipped"
                                          ? "bg-blue-100 text-blue-800"
                                          : "bg-yellow-100 text-yellow-800"
                                      }`}
                                    >
                                      {product.status?.toUpperCase() ||
                                        "PROCESSING"}
                                    </span>
                                  </p>
                                </div>
                              )}

                              {/* Review Button for Delivered Orders */}
                              {getOrderStatus(order) === "delivered" && (
                                <div className="mt-3">
                                  <button
                                    onClick={() => openReviewModal(product)}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition shadow-md hover:shadow-lg"
                                  >
                                    Add Review & Rating
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t-2 border-gray-200 pt-6 mt-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <svg
                      className="w-5 h-5 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    Shipping Information
                  </h3>
                  <div className="bg-gradient-to-br from-gray-50 to-white p-5 rounded-xl border border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white p-3 rounded-lg border border-gray-200">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                          Address
                        </p>
                        <p className="text-sm font-medium text-gray-900">
                          {order.shippingAddress?.street || "N/A"},{" "}
                          {order.shippingAddress?.city || "N/A"},{" "}
                          {order.shippingAddress?.zipCode || "N/A"}
                        </p>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-gray-200">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                          Phone
                        </p>
                        <p className="text-sm font-medium text-gray-900">
                          {order.shippingAddress?.phoneNumber || "N/A"}
                        </p>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-gray-200">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                          Payment Method
                        </p>
                        <p className="text-sm font-medium text-gray-900 capitalize">
                          {order.paymentInfo?.method?.replace(/-/g, " ") ||
                            "N/A"}
                        </p>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-gray-200">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                          Payment Status
                        </p>
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${(() => {
                            const paymentStatus = getPaymentStatus(order);
                            if (
                              paymentStatus === "complete" ||
                              paymentStatus === "completed"
                            ) {
                              return "bg-green-100 text-green-800";
                            }
                            if (paymentStatus === "pending") {
                              return "bg-yellow-100 text-yellow-800";
                            }
                            if (paymentStatus === "refunded") {
                              return "bg-red-100 text-red-800";
                            }
                            if (paymentStatus === "cancelled") {
                              return "bg-gray-100 text-gray-800";
                            }
                            return "bg-gray-100 text-gray-800";
                          })()}`}
                        >
                          {getPaymentStatus(order).toUpperCase()}
                        </span>
                      </div>
                      {order.trackingId && (
                        <div className="bg-white p-3 rounded-lg border border-gray-200">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                            Tracking ID
                          </p>
                          <p className="text-sm font-medium text-gray-900 font-mono">
                            {order.trackingId}
                          </p>
                        </div>
                      )}
                      {order.notes && (
                        <div className="md:col-span-2 bg-white p-3 rounded-lg border border-gray-200">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                            Order Notes
                          </p>
                          <p className="text-sm font-medium text-gray-900">
                            {order.notes}
                          </p>
                        </div>
                      )}
                      {/* Delivery Information - COMMENTED OUT: Delivery info section not showing data properly */}
                      {/* 
                      {order.trackingId && (
                        <div className="md:col-span-2 bg-white p-3 rounded-lg border border-gray-200">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                            Delivery Information
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            <div>
                              <p className="text-gray-600 font-medium mb-1">Vehicle:</p>
                              {order.deliveryInfo?.vehicle && order.deliveryInfo.vehicle.name ? (
                                <>
                                  <p className="text-gray-900">{order.deliveryInfo.vehicle.name}</p>
                                  <p className="text-gray-600 text-xs">Reg: {order.deliveryInfo.vehicle.registrationNumber || "N/A"}</p>
                                  <p className="text-gray-600 text-xs">Type: {order.deliveryInfo.vehicle.vehicleType || "N/A"}</p>
                                  <p className="text-gray-600 text-xs">Contact: {order.deliveryInfo.vehicle.contactInfo || "N/A"}</p>
                                </>
                              ) : (
                                <p className="text-gray-500 text-xs italic">Vehicle information not available</p>
                              )}
                            </div>
                            <div>
                              <p className="text-gray-600 font-medium mb-1">Rider:</p>
                              {order.deliveryInfo?.rider && order.deliveryInfo.rider.name ? (
                                <>
                                  <p className="text-gray-900">{order.deliveryInfo.rider.name}</p>
                                  <p className="text-gray-600 text-xs">Contact: {order.deliveryInfo.rider.contactInfo || "N/A"}</p>
                                </>
                              ) : (
                                <p className="text-gray-500 text-xs italic">Rider information not available</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                      */}
                    </div>
                  </div>
                </div>

                {(getOrderStatus(order) === "pending" ||
                  getOrderStatus(order) === "confirmed") && (
                  <div className="flex justify-end mt-6">
                    <button
                      onClick={() => cancelOrder(order._id)}
                      className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow transition"
                    >
                      Cancel Order
                    </button>
                  </div>
                )}

                {/* Action Buttons for Out for Delivery Orders */}
                {getOrderStatus(order) === "out_for_delivery" && (
                  <div className="flex justify-end gap-3 mt-6">
                    <button
                      onClick={() => confirmDelivery(order._id)}
                      disabled={confirmingOrderId === order._id}
                      className={`px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow transition font-medium flex items-center gap-2 ${
                        confirmingOrderId === order._id
                          ? "opacity-50 cursor-not-allowed"
                          : ""
                      }`}
                    >
                      {confirmingOrderId === order._id ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                          Confirming...
                        </>
                      ) : (
                        "Confirm Delivery"
                      )}
                    </button>
                  </div>
                )}

                {/* Action Buttons for Delivered Orders */}
                {getOrderStatus(order) === "delivered" &&
                  getPaymentStatus(order) !== "complete" &&
                  getPaymentStatus(order) !== "completed" && (
                    <div className="flex justify-end gap-3 mt-6">
                      {hasOpenDispute(order) ? (
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => navigate("/buyer/disputes")}
                            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg shadow transition font-medium flex items-center gap-2"
                          >
                            <Gavel className="w-4 h-4" />
                            Open Dispute
                          </button>
                          <span className="px-4 py-2 bg-orange-100 text-orange-800 rounded-lg text-sm font-medium">
                            {order.dispute_status === "open"
                              ? "Dispute in Progress"
                              : "Awaiting Admin Review"}{" "}
                            - Cannot Confirm Receipt
                          </span>
                        </div>
                      ) : (
                        (() => {
                          const disputeCheck = canCreateDispute(order);
                          if (disputeCheck.canCreate) {
                            return (
                              <>
                                <button
                                  onClick={() => {
                                    setOrderForDispute(order);
                                    setShowDisputeModal(true);
                                  }}
                                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg shadow transition font-medium"
                                >
                                  Create Dispute
                                </button>
                              { /*  <button
                                  onClick={() => confirmOrderReceipt(order._id)}
                                  disabled={confirmingOrderId === order._id}
                                  className={`px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow transition font-medium flex items-center gap-2 ${
                                    confirmingOrderId === order._id
                                      ? "opacity-50 cursor-not-allowed"
                                      : ""
                                  }`}
                                >
                                  {confirmingOrderId === order._id ? (
                                    <>
                                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                                      Confirming...
                                    </>
                                  ) : (
                                    "Confirm Receipt"
                                  )}
                                </button> */}
                                {disputeCheck.daysRemaining !== undefined && (
                                  <p className="text-sm text-gray-500 italic self-center">
                                    {disputeCheck.daysRemaining > 0
                                      ? `${disputeCheck.daysRemaining} day${
                                          disputeCheck.daysRemaining !== 1
                                            ? "s"
                                            : ""
                                        } remaining to create dispute`
                                      : "Last day to create dispute"}
                                  </p>
                                )}
                              </>
                            );
                          } else {
                            // Dispute window has expired
                            if (
                              disputeCheck.reason === "dispute_window_expired"
                            ) {
                              return (
                                <>
                                  <button
                                    onClick={() =>
                                      confirmOrderReceipt(order._id)
                                    }
                                    disabled={confirmingOrderId === order._id}
                                    className={`px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow transition font-medium flex items-center gap-2 ${
                                      confirmingOrderId === order._id
                                        ? "opacity-50 cursor-not-allowed"
                                        : ""
                                    }`}
                                  >
                                    {confirmingOrderId === order._id ? (
                                      <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                                        Confirming...
                                      </>
                                    ) : (
                                      "Confirm Receipt"
                                    )}
                                  </button>
                                  <p className="text-sm text-gray-500 italic self-center">
                                    Dispute creation window has expired (
                                    {disputeCheck.daysSinceDelivery ||
                                      disputeCheck.daysSinceReceipt}{" "}
                                    days since delivery)
                                  </p>
                                </>
                              );
                            }
                            // For other reasons, just show confirm receipt button
                            return (
                              <button
                                onClick={() => confirmOrderReceipt(order._id)}
                                disabled={confirmingOrderId === order._id}
                                className={`px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow transition font-medium flex items-center gap-2 ${
                                  confirmingOrderId === order._id
                                    ? "opacity-50 cursor-not-allowed"
                                    : ""
                                }`}
                              >
                                {confirmingOrderId === order._id ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                                    Confirming...
                                  </>
                                ) : (
                                  "Confirm Receipt"
                                )}
                              </button>
                            );
                          }
                        })()
                      )}
                    </div>
                  )}

                {/* Show confirmation status for received orders */}
                {(getOrderStatus(order) === "received" ||
                  getPaymentStatus(order) === "complete" ||
                  getPaymentStatus(order) === "completed") && (
                  <div className="flex justify-between items-center mt-6">
                    <div className="flex-1">
                      {(() => {
                        const disputeCheck = canCreateDispute(order);
                        if (hasOpenDispute(order)) {
                          return (
                            <button
                              onClick={() => navigate("/buyer/disputes")}
                              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg shadow transition font-medium flex items-center gap-2"
                            >
                              <Gavel className="w-4 h-4" />
                              Open Dispute
                            </button>
                          );
                        } else if (disputeCheck.canCreate) {
                          return (
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => {
                                  setOrderForDispute(order);
                                  setShowDisputeModal(true);
                                }}
                                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg shadow transition font-medium"
                              >
                                Create Dispute
                              </button>
                              {disputeCheck.daysRemaining !== undefined && (
                                <p className="text-sm text-gray-500 italic">
                                  {disputeCheck.daysRemaining > 0
                                    ? `${disputeCheck.daysRemaining} day${
                                        disputeCheck.daysRemaining !== 1
                                          ? "s"
                                          : ""
                                      } remaining to create dispute`
                                    : "Last day to create dispute"}
                                </p>
                              )}
                            </div>
                          );
                        } else if (
                          disputeCheck.reason === "dispute_window_expired"
                        ) {
                          return (
                            <p className="text-sm text-gray-500 italic">
                              Dispute creation window has expired (
                              {disputeCheck.daysSinceReceipt} days since
                              receipt)
                            </p>
                          );
                        }
                        return null;
                      })()}
                    </div>
                    <span className="px-4 py-2 bg-green-100 text-green-800 rounded-lg text-sm font-medium flex items-center gap-2">
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      Order Confirmed & Payment Completed
                    </span>
                  </div>
                )}

                {/* Dispute Button for Out for Delivery Orders */}
                {getOrderStatus(order) === "out_for_delivery" && (
                  <div className="flex justify-end mt-6">
                    {hasOpenDispute(order) ? (
                      <button
                        onClick={() => navigate("/buyer/disputes")}
                        className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg shadow transition font-medium flex items-center gap-2"
                      >
                        <Gavel className="w-4 h-4" />
                        Open Dispute
                      </button>
                    ) : (
                      (() => {
                        const disputeCheck = canCreateDispute(order);
                        if (disputeCheck.canCreate) {
                          return (
                            <button
                              onClick={() => {
                                setOrderForDispute(order);
                                setShowDisputeModal(true);
                              }}
                              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg shadow transition font-medium"
                            >
                              Create Dispute
                            </button>
                          );
                        }
                        return null;
                      })()
                    )}
                  </div>
                )}

                {/* Dispute Button for Shipped Orders */}
                {getOrderStatus(order) === "shipped" && (
                  <div className="flex justify-end mt-6">
                    {hasOpenDispute(order) ? (
                      <button
                        onClick={() => navigate("/buyer/disputes")}
                        className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg shadow transition font-medium flex items-center gap-2"
                      >
                        <Gavel className="w-4 h-4" />
                        Open Dispute
                      </button>
                    ) : (
                      (() => {
                        const disputeCheck = canCreateDispute(order);
                        if (disputeCheck.canCreate) {
                          return (
                            <button
                              onClick={() => {
                                setOrderForDispute(order);
                                setShowDisputeModal(true);
                              }}
                              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg shadow transition font-medium"
                            >
                              Create Dispute
                            </button>
                          );
                        } else {
                          // Show why dispute cannot be created
                          if (
                            disputeCheck.reason === "estimated_date_not_passed"
                          ) {
                            return (
                              <div className="flex flex-col items-end gap-2">
                                <p className="text-sm text-gray-600 text-right">
                                  Estimated delivery date:{" "}
                                  <span className="font-semibold">
                                    {disputeCheck.estimatedDate}
                                  </span>
                                </p>
                                <p className="text-sm text-gray-500 italic">
                                  Can create dispute after estimated delivery
                                  date passes
                                </p>
                              </div>
                            );
                          } else if (
                            disputeCheck.reason === "no_estimated_date"
                          ) {
                            return (
                              <p className="text-sm text-gray-500 italic">
                                Estimated delivery date not available
                              </p>
                            );
                          }
                          return null;
                        }
                      })()
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Add Review</h2>
                <button
                  onClick={closeReviewModal}
                  className="text-gray-500 hover:text-gray-700"
                  disabled={submittingReview}
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="mb-4 flex items-center gap-3">
                <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                  {selectedProduct.productId?.images?.[0] ? (
                    <img
                      src={selectedProduct.productId.images[0]}
                      alt={selectedProduct.productId.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {selectedProduct.productId?.name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {selectedProduct.productId?.category}
                  </p>
                </div>
              </div>

              <form onSubmit={submitReview}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rating *
                  </label>
                  <div className="flex space-x-1">
                    {renderStarRating(
                      reviewForm.rating,
                      true,
                      handleRatingChange
                    )}
                  </div>
                  {reviewForm.rating > 0 && (
                    <p className="text-sm text-gray-500 mt-1">
                      {reviewForm.rating} star
                      {reviewForm.rating !== 1 ? "s" : ""} selected
                    </p>
                  )}
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Review Comment *
                  </label>
                  <textarea
                    value={reviewForm.comment}
                    onChange={handleCommentChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows="4"
                    placeholder="Share your experience with this product..."
                    required
                    disabled={submittingReview}
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={closeReviewModal}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                    disabled={submittingReview}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition flex items-center gap-2"
                    disabled={submittingReview}
                  >
                    {submittingReview ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                        Submitting...
                      </>
                    ) : (
                      "Submit Review"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Dispute Modal */}
      <DisputeModal
        isOpen={showDisputeModal}
        onClose={() => {
          setShowDisputeModal(false);
          setOrderForDispute(null);
        }}
        order={orderForDispute}
      />
    </div>
  );
}

export default MyOrders;
