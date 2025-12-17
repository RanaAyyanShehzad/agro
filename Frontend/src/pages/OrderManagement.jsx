import { useState, useEffect } from "react";
import {
  FiSearch,
  FiFilter,
  FiX,
  FiChevronDown,
  FiChevronUp,
  FiPrinter,
  FiEdit,
  FiEye,
  FiRefreshCw,
  FiAlertCircle,
  FiDownload,
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import jsPDF from "jspdf";
import "jspdf-autotable";

function OrderManagement() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [ordersPerPage] = useState(10);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [orderToReject, setOrderToReject] = useState(null);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [orderToAccept, setOrderToAccept] = useState(null);
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState("");
  const [showOutForDeliveryModal, setShowOutForDeliveryModal] = useState(false);
  const [orderToMarkOutForDelivery, setOrderToMarkOutForDelivery] = useState(null);
  const [deliveryForm, setDeliveryForm] = useState({
    vehicleName: "",
    vehicleRegistrationNumber: "",
    vehicleType: "Motorcycle",
    vehicleContactInfo: "",
    riderName: "",
    riderContactInfo: ""
  });
  const navigate = useNavigate();

  // Fetch orders from API with authentication
  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        "https://agrofarm-vd8i.onrender.com/api/v1/order/supplier-orders",
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        // Ensure orders have customer information
        const ordersWithCustomer = (data.orders || []).map((order) => {
          // Log for debugging if customer info is missing
          if (
            !order.customer &&
            (!order.buyerId || typeof order.buyerId === "string")
          ) {
            console.warn("Order missing customer info:", order._id, {
              hasCustomer: !!order.customer,
              buyerIdType: typeof order.buyerId,
              buyerId: order.buyerId,
            });
          }
          return order;
        });
        setOrders(ordersWithCustomer);
      } else {
        setError(data.message || "Failed to fetch orders");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Accept order (seller) with estimated delivery date
  const handleAcceptOrder = async (orderId, estimatedDate) => {
    if (!estimatedDate || estimatedDate.trim() === "") {
      toast.error("Please provide an estimated delivery date");
      return;
    }

    // Validate that the date is in the future
    const selectedDate = new Date(estimatedDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate <= today) {
      toast.error("Estimated delivery date must be in the future");
      return;
    }

    try {
      // Format date as ISO string
      const formattedDate = new Date(estimatedDate).toISOString();

      const response = await fetch(
        `https://agrofarm-vd8i.onrender.com/api/v1/order/${orderId}/accept`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            estimatedDeliveryDate: formattedDate,
          }),
        }
      );

      // Handle response parsing with error handling
      let data;
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        throw new Error(
          response.status === 404
            ? "Order accept endpoint not found"
            : response.status >= 500
            ? "Server error occurred"
            : `Unexpected response: ${response.status}`
        );
      }

      data = await response.json();

      if (!response.ok) {
        // Handle specific error status codes
        if (response.status === 400) {
          throw new Error(
            data.message ||
              "Invalid request. Please check the estimated delivery date."
          );
        } else if (response.status === 403) {
          throw new Error(
            data.message || "You don't have permission to accept this order"
          );
        } else if (response.status === 404) {
          throw new Error(data.message || "Order not found");
        } else {
          throw new Error(
            data.message || `Failed to accept order: ${response.status}`
          );
        }
      }

      if (data.success) {
        toast.success(data.message || "Order accepted successfully!");
        setShowAcceptModal(false);
        setEstimatedDeliveryDate("");
        setOrderToAccept(null);
        fetchOrders(); // Refresh orders
        if (selectedOrder && selectedOrder._id === orderId) {
          setSelectedOrder(data.order);
        }
      } else {
        toast.error(data.message || "Failed to accept order");
      }
    } catch (error) {
      console.error("Error accepting order:", error);
      toast.error(error.message || "Failed to accept order. Please try again.");
    }
  };

  // Reject order (seller)
  const handleRejectOrder = async (orderId, reason) => {
    if (!reason || reason.trim() === "") {
      toast.error("Please provide a reason for rejection");
      return;
    }

    try {
      const response = await fetch(
        `https://agrofarm-vd8i.onrender.com/api/v1/order/${orderId}/reject`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ reason }),
        }
      );

      // Handle response parsing with error handling
      let data;
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        throw new Error(
          response.status === 404
            ? "Order reject endpoint not found"
            : response.status >= 500
            ? "Server error occurred"
            : `Unexpected response: ${response.status}`
        );
      }

      data = await response.json();

      if (!response.ok) {
        // Handle specific error status codes
        if (response.status === 400) {
          throw new Error(
            data.message ||
              "Invalid request. Please check the rejection reason."
          );
        } else if (response.status === 403) {
          throw new Error(
            data.message || "You don't have permission to reject this order"
          );
        } else if (response.status === 404) {
          throw new Error(data.message || "Order not found");
        } else {
          throw new Error(
            data.message || `Failed to reject order: ${response.status}`
          );
        }
      }

      if (data.success) {
        toast.success(data.message || "Order rejected successfully");
        setShowRejectModal(false);
        setRejectReason("");
        setOrderToReject(null);
        fetchOrders(); // Refresh orders
        if (selectedOrder && selectedOrder._id === orderId) {
          setSelectedOrder(data.order);
        }
      } else {
        toast.error(data.message || "Failed to reject order");
      }
    } catch (error) {
      console.error("Error rejecting order:", error);
      toast.error(error.message || "Failed to reject order. Please try again.");
    }
  };

  // Check if order is pending and needs seller action (accept/reject)
  const hasPendingProducts = (order) => {
    const orderStatus = (order.orderStatus || order.status || "").toLowerCase();
    // Order is pending if status is "pending" - seller needs to accept or reject
    return orderStatus === "pending";
  };

  // Mark order as Out for Delivery
  const handleMarkOutForDelivery = async (orderId, deliveryData) => {
    try {
      const response = await fetch(
        `https://agrofarm-vd8i.onrender.com/api/v1/order/${orderId}/out-for-delivery`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(deliveryData),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 400) {
          throw new Error(
            data.message || "Invalid delivery information provided."
          );
        } else if (response.status === 403) {
          throw new Error(
            data.message || "You don't have permission to mark this order as out for delivery."
          );
        } else if (response.status === 404) {
          throw new Error(data.message || "Order not found");
        } else {
          throw new Error(
            data.message || `Failed to mark order as out for delivery: ${response.status}`
          );
        }
      }

      if (data.success) {
        toast.success(data.message || "Order marked as out for delivery successfully");
        setShowOutForDeliveryModal(false);
        setOrderToMarkOutForDelivery(null);
        setDeliveryForm({
          vehicleName: "",
          vehicleRegistrationNumber: "",
          vehicleType: "Motorcycle",
          vehicleContactInfo: "",
          riderName: "",
          riderContactInfo: ""
        });
        fetchOrders(); // Refresh orders
        if (selectedOrder && selectedOrder._id === orderId) {
          setSelectedOrder(data.data?.order || data.order);
        }
      } else {
        toast.error(data.message || "Failed to mark order as out for delivery");
      }
    } catch (error) {
      console.error("Error marking order as out for delivery:", error);
      toast.error(error.message || "Failed to mark order as out for delivery. Please try again.");
    }
  };

  // Validate status transition on frontend (must match backend allowedTransitions)
  const validateStatusTransition = (currentStatus, newStatus) => {
    // Backend allowedTransitions from controllers/order.js:
    // pending → processing (via accept), cancelled (via reject)
    // processing → shipped, cancelled
    // shipped → out_for_delivery (use "Mark Out for Delivery" button, not dropdown)
    // Note: delivered and received cannot be set by seller (buyer only)
    const validTransitions = {
      pending: ["cancelled"], // Accept changes to processing, reject changes to cancelled
      processing: ["shipped", "cancelled"],
      shipped: ["cancelled"], // out_for_delivery should use "Mark Out for Delivery" button, not dropdown
      out_for_delivery: [], // Cannot be changed by seller - buyer must confirm delivery
      delivered: [], // Cannot be changed by seller
      received: [], // Final status
      cancelled: [], // Final status
      canceled: [], // Alias for cancelled
    };

    const current = (currentStatus || "").toLowerCase();
    const next = (newStatus || "").toLowerCase();
    const allowed = validTransitions[current] || [];

    if (!allowed.includes(next)) {
      return {
        valid: false,
        message: `Cannot change status from "${currentStatus}" to "${newStatus}". Allowed transitions: ${
          allowed.join(", ") || "none (use accept/reject buttons for pending orders)"
        }`,
      };
    }

    return { valid: true };
  };

  // Handle product status change (multi-vendor system)
  const handleProductStatusChange = async (
    orderId,
    productItemId,
    newStatus
  ) => {
    if (!orderId || !productItemId) {
      toast.error("Missing order or product information");
      return;
    }

    try {
      // Validate IDs before making the request
      if (!orderId || typeof orderId !== "string" || orderId.trim() === "") {
        toast.error("Invalid order ID");
        return;
      }
      if (
        !productItemId ||
        typeof productItemId !== "string" ||
        productItemId.trim() === ""
      ) {
        toast.error("Invalid product item ID");
        return;
      }

      // Get current product status for validation
      const currentProduct = selectedOrder?.products?.find(
        (p) => p._id === productItemId
      );
      const currentStatus = currentProduct?.status;

      // Validate status transition on frontend
      if (currentStatus) {
        const validation = validateStatusTransition(currentStatus, newStatus);
        if (!validation.valid) {
          toast.error(validation.message);
          return;
        }
      }

      // Make API call to update product status
      // productItemId should be the _id of the product item in the order's products array
      // Use the correct endpoint: PUT /api/v1/order/:orderId/product/:productId/status
      // Note: This endpoint is registered via orderMultiVendorRoutes at /api/v1
      const url = `https://agrofarm-vd8i.onrender.com/api/v1/order/${orderId}/product/${productItemId}/status`;

      console.log("Updating product status:", {
        orderId,
        productItemId,
        newStatus,
        url,
      });

      const response = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ status: newStatus }),
      });

      // Get response text first to handle both JSON and HTML responses
      const responseText = await response.text();
      let responseData;

      // Try to parse as JSON, but handle non-JSON responses gracefully
      try {
        responseData = JSON.parse(responseText);
      } catch (parseError) {
        // Response is not JSON (likely HTML error page)
        console.error("Failed to parse response as JSON:", {
          status: response.status,
          statusText: response.statusText,
          url,
          responsePreview: responseText.substring(0, 500),
        });

        // Check if it's a 404 or similar error
        if (response.status === 404) {
          throw new Error(
            "Status update endpoint not found. Please contact support or check if the backend endpoint is configured correctly."
          );
        } else if (response.status >= 500) {
          throw new Error(
            "Server error occurred while updating status. Please try again later."
          );
        } else {
          throw new Error(
            `Failed to update status. Server returned status ${response.status}. Please check the endpoint configuration.`
          );
        }
      }

      // Handle different error status codes with specific messages
      if (!response.ok) {
        console.error("API Error:", {
          status: response.status,
          data: responseData,
        });

        // Handle specific error cases based on status code
        if (response.status === 400) {
          // Bad Request - Invalid status or invalid transition
          const errorMsg = responseData.message || "Invalid status transition";
          toast.error(errorMsg);
          throw new Error(errorMsg);
        } else if (response.status === 403) {
          // Forbidden - Not authorized to update this order
          const errorMsg =
            responseData.message ||
            "You don't have permission to update this order status";
          toast.error(errorMsg);
          throw new Error(errorMsg);
        } else if (response.status === 404) {
          // Not Found - Order or product not found
          const errorMsg = responseData.message || "Order or product not found";
          toast.error(errorMsg);
          throw new Error(errorMsg);
        } else {
          // Other errors
          const errorMsg =
            responseData.message ||
            `Failed to update status: ${response.status}`;
          toast.error(errorMsg);
          throw new Error(errorMsg);
        }
      }

      if (!responseData.success) {
        const errorMsg = responseData.message || "Failed to update status";
        toast.error(errorMsg);
        throw new Error(errorMsg);
      }

      toast.success(
        responseData.message || "Product status updated successfully"
      );

      // Update selected order with the response data
      // Handle both response structures: responseData.order or responseData.data?.order
      let updatedOrder = responseData.order || responseData.data?.order;

      // If response doesn't include the full order, fetch it fresh
      if (!updatedOrder) {
        console.log(
          "Response doesn't include order, fetching fresh order data..."
        );
        updatedOrder = await fetchSingleOrder(orderId);
      }

      if (updatedOrder) {
        // Update the selected order immediately
        setSelectedOrder(updatedOrder);

        // Console log the new selected order status for debugging
        console.log("✅ Status updated successfully. New order state:", {
          orderId: updatedOrder._id,
          orderStatus: updatedOrder.orderStatus || updatedOrder.status,
          products: updatedOrder.products?.map((p) => ({
            productItemId: p._id,
            productId: p.productId?._id || p.productId,
            status: p.status,
            name: p.productId?.name || p.name,
          })),
        });

        // Verify the specific product was updated
        const updatedProduct = updatedOrder.products?.find(
          (p) => p._id === productItemId
        );
        if (updatedProduct) {
          console.log("✅ Product status verified:", {
            productItemId: updatedProduct._id,
            status: updatedProduct.status,
            expectedStatus: newStatus,
            match: updatedProduct.status === newStatus,
          });
        } else {
          console.warn("⚠️ Updated product not found in response:", {
            productItemId,
            availableProductIds: updatedOrder.products?.map((p) => p._id),
          });
        }
      } else {
        console.warn(
          "⚠️ Could not fetch updated order, refreshing from list..."
        );
        // Fallback: refresh orders and find the updated one
        await fetchOrders();
        // Find the updated order from the refreshed list
        const refreshedOrder = orders.find((o) => o._id === orderId);
        if (refreshedOrder) {
          setSelectedOrder(refreshedOrder);
        }
      }

      // Refresh orders list to show updated status
      await fetchOrders();

      // Close the modal after successful status update
      setShowOrderDetails(false);
      setSelectedOrder(null);
    } catch (err) {
      console.error("Error updating product status:", err);
      toast.error(err.message || "Failed to update product status");
    }
  };

  // Handle status change with authentication
  const handleStatusChange = async (orderId, newStatus) => {
    try {
      // First update locally for instant UI feedback
      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order._id === orderId ? { ...order, status: newStatus } : order
        )
      );

      if (selectedOrder && selectedOrder._id === orderId) {
        setSelectedOrder((prev) => ({ ...prev, status: newStatus }));
      }

      // Then make API call to persist the change
      const response = await fetch(
        `https://agrofarm-vd8i.onrender.com/api/v1/order/update-status/${orderId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to update status: ${response.status}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || "Failed to update status");
      }
      if (data.success) {
        toast.success(data.message || "Updated successfully");
      }
      fetchOrders();
    } catch (err) {
      console.error("Error updating order status:", err);
      // Revert local changes if API call fails
      setOrders((prevOrders) => [...prevOrders]);
      if (selectedOrder && selectedOrder._id === orderId) {
        setSelectedOrder((prev) => ({ ...prev, status: selectedOrder.status }));
      }
      // Show error to user
      setError(err.message);
    }
  };

  // Filter orders based on status and search term
  // In your filtering logic, replace the current filteredOrders with this:
  const searchTermLower = (searchTerm || "").toLowerCase();
  const numericSearch = (searchTerm || "").replace(/\D/g, "");
  const filteredOrders = (orders || []).filter((order) => {
    const orderStatus = order.orderStatus || order.status || "";
    const matchesStatus =
      statusFilter === "all" ||
      orderStatus?.toLowerCase() === statusFilter.toLowerCase();

    const matchesId = order._id?.toLowerCase().includes(searchTermLower);

    const matchesProduct = (order.products || []).some((item) => {
      const product = item.productId || item;
      return product?.name?.toLowerCase().includes(searchTermLower);
    });

    // Handle both customer object and buyerId (which might be object or string)
    const customerObj =
      order.customer ||
      (order.buyerId && typeof order.buyerId === "object"
        ? order.buyerId
        : null);
    const matchesCustomerName =
      customerObj?.name?.toLowerCase().includes(searchTermLower) || false;
    const matchesCustomerEmail =
      customerObj?.email?.toLowerCase().includes(searchTermLower) || false;
    const matchesCustomerPhone =
      customerObj?.phone?.toLowerCase().includes(searchTermLower) || false;

    const matchesAddress =
      order.shippingAddress?.street?.toLowerCase().includes(searchTermLower) ||
      false;

    const matchesCity =
      order.shippingAddress?.city?.toLowerCase().includes(searchTermLower) ||
      false;

    const phoneDigits =
      order.shippingAddress?.phoneNumber?.replace(/\D/g, "") || "";
    const matchesPhone =
      numericSearch.length > 0 ? phoneDigits.includes(numericSearch) : false;

    return (
      matchesStatus &&
      (matchesId ||
        matchesProduct ||
        matchesCustomerName ||
        matchesCustomerEmail ||
        matchesCustomerPhone ||
        matchesAddress ||
        matchesCity ||
        matchesPhone)
    );
  });

  // Fetch single order by ID
  const fetchSingleOrder = async (orderId) => {
    try {
      const response = await fetch(
        `https://agrofarm-vd8i.onrender.com/api/v1/order/item/${orderId}`,
        {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch order: ${response.status}`);
      }

      const data = await response.json();
      if (data.success && data.order) {
        return data.order;
      }
      return null;
    } catch (error) {
      console.error("Error fetching single order:", error);
      return null;
    }
  };

  // View order details - Use order data directly (already has all information)
  const viewOrderDetails = (order) => {
    setSelectedOrder(order);
    setShowOrderDetails(true);
  };

  // Get status color and display text
  const getStatusInfo = (status) => {
    const statusLower = status?.toLowerCase() || "";
    switch (statusLower) {
      case "pending":
        return { color: "bg-yellow-100 text-yellow-800", text: "Pending" };
      case "processing":
        return { color: "bg-blue-100 text-blue-800", text: "Processing" };
      case "confirmed":
        return { color: "bg-purple-100 text-purple-800", text: "Confirmed" };
      case "shipped":
        return { color: "bg-indigo-100 text-indigo-800", text: "Shipped" };
      case "out_for_delivery":
        return { color: "bg-orange-100 text-orange-800", text: "Out for Delivery" };
      case "delivered":
        return { color: "bg-green-100 text-green-800", text: "Delivered" };
      case "canceled":
      case "cancelled":
        return { color: "bg-red-100 text-red-800", text: "Cancelled" };
      case "partially_shipped":
        return {
          color: "bg-indigo-100 text-indigo-800",
          text: "Partially Shipped",
        };
      case "partially_delivered":
        return {
          color: "bg-green-100 text-green-800",
          text: "Partially Delivered",
        };
      case "partially_cancelled":
        return {
          color: "bg-red-100 text-red-800",
          text: "Partially Cancelled",
        };
      default:
        return {
          color: "bg-gray-100 text-gray-800",
          text: status || "Unknown",
        };
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return `Rs. ${amount?.toLocaleString() || "0"}`;
  };

  // Calculate total order amount from products
  const calculateOrderTotal = (order) => {
    if (!order.products || order.products.length === 0) {
      return order.totalPrice || 0;
    }
    return order.products.reduce((total, product) => {
      const productData = product.productId || product;
      const price = productData.price || product.price || 0;
      const quantity = product.quantity || 1;
      return total + price * quantity;
    }, 0);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Generate and download PDF invoice
  const downloadInvoicePDF = async (order) => {
    if (downloadingInvoice) return; // Prevent multiple clicks

    try {
      setDownloadingInvoice(true);

      // Use the order data directly (already has all information from PATCH response)
      const orderData = order;

      const doc = new jsPDF();

      // Set up document
      doc.setFontSize(20);
      doc.text("Order Invoice", 14, 20);

      // Company/Business Info
      doc.setFontSize(12);
      doc.text("FarmConnect", 14, 30);
      doc.setFontSize(10);
      doc.text("Agri-Marketplace", 14, 36);

      // Order Info
      doc.setFontSize(11);
      doc.text(`Order ID: ${orderData._id}`, 14, 50);
      doc.text(`Order Date: ${formatDate(orderData.createdAt)}`, 14, 56);
      doc.text(
        `Status: ${orderData.status?.toUpperCase() || "PENDING"}`,
        14,
        62
      );

      // Customer Info
      const customerY = 72;
      const customer =
        orderData.customer ||
        (orderData.buyerId && typeof orderData.buyerId === "object"
          ? orderData.buyerId
          : null);
      doc.setFontSize(11);
      doc.text("Customer Information:", 14, customerY);
      doc.setFontSize(10);
      doc.text(`Name: ${customer?.name || "N/A"}`, 14, customerY + 6);
      doc.text(`Email: ${customer?.email || "N/A"}`, 14, customerY + 12);
      doc.text(
        `Phone: ${
          customer?.phone || orderData.shippingAddress?.phoneNumber || "N/A"
        }`,
        14,
        customerY + 18
      );

      const addressText =
        customer?.address ||
        `${orderData.shippingAddress?.street || ""}, ${
          orderData.shippingAddress?.city || ""
        }, ${orderData.shippingAddress?.zipCode || ""}`.replace(
          /^,\s*|,\s*$/g,
          ""
        );
      const addressLines = doc.splitTextToSize(`Address: ${addressText}`, 180);
      doc.text(addressLines, 14, customerY + 24);

      // Shipping Address (on the right side)
      const shippingY = customerY;
      doc.setFontSize(11);
      doc.text("Shipping Address:", 120, shippingY);
      doc.setFontSize(10);
      const shippingLines = doc.splitTextToSize(
        `${orderData.shippingAddress?.street || "N/A"}, ${
          orderData.shippingAddress?.city || "N/A"
        }, ${orderData.shippingAddress?.zipCode || "N/A"}`,
        70
      );
      doc.text(shippingLines, 120, shippingY + 6);
      doc.text(
        `Phone: ${orderData.shippingAddress?.phoneNumber || "N/A"}`,
        120,
        shippingY + 18
      );

      // Payment Info
      const paymentY = customerY + 40;
      doc.setFontSize(11);
      doc.text("Payment Information:", 14, paymentY);
      doc.setFontSize(10);
      doc.text(
        `Method: ${
          orderData.paymentInfo?.method?.replace(/-/g, " ").toUpperCase() ||
          "N/A"
        }`,
        14,
        paymentY + 6
      );
      doc.text(
        `Status: ${orderData.paymentInfo?.status?.toUpperCase() || "N/A"}`,
        14,
        paymentY + 12
      );

      // Prepare table data
      const products = orderData.products || [];
      let tableY = paymentY + 25;

      // Table header
      doc.setFontSize(11);
      doc.setFillColor(34, 139, 34);
      doc.rect(14, tableY, 180, 8, "F");
      doc.setTextColor(255, 255, 255);
      doc.text("Product", 16, tableY + 6);
      doc.text("Quantity", 90, tableY + 6);
      doc.text("Price", 140, tableY + 6);
      doc.text("Total", 175, tableY + 6);

      tableY += 10;
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);

      // Table rows
      products.forEach((item, index) => {
        const product = item.productId || item;
        const productName = product.name || "Unknown Product";
        const quantity = item.quantity || 0;
        const unitPrice = product.price || 0;
        const total = quantity * unitPrice;
        const unit = product.unit || "";

        // Alternate row colors
        if (index % 2 === 0) {
          doc.setFillColor(245, 245, 245);
          doc.rect(14, tableY - 2, 180, 8, "F");
        }

        // Truncate long product names
        const maxWidth = 65;
        let displayName = productName;
        if (doc.getTextWidth(displayName) > maxWidth) {
          displayName = doc.splitTextToSize(displayName, maxWidth)[0] + "...";
        }

        doc.text(displayName, 16, tableY + 5);
        doc.text(`${quantity} ${unit}`, 90, tableY + 5);
        doc.text(`Rs. ${unitPrice.toLocaleString()}`, 140, tableY + 5);
        doc.text(`Rs. ${total.toLocaleString()}`, 175, tableY + 5);

        tableY += 10;
      });

      const finalY = tableY;

      // Order notes
      if (orderData.notes) {
        doc.setFontSize(10);
        doc.text(`Order Notes: ${orderData.notes}`, 14, finalY + 10);
      }

      // Calculate total from products for PDF
      const pdfTotal = (orderData.products || []).reduce((total, item) => {
        const product = item.productId || item;
        const price = product.price || 0;
        const quantity = item.quantity || 0;
        return total + price * quantity;
      }, 0);

      // Total
      doc.setFontSize(12);
      doc.text(
        `Total: Rs. ${pdfTotal.toLocaleString() || "0"}`,
        120,
        finalY + 15,
        { align: "right" }
      );

      // Footer
      doc.setFontSize(8);
      doc.text("Thank you for your business!", 105, 280, { align: "center" });
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 105, 285, {
        align: "center",
      });

      // Save the PDF
      doc.save(`Invoice-${orderData._id.substring(0, 8)}.pdf`);
      toast.success("Invoice downloaded successfully!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate invoice PDF");
    } finally {
      setDownloadingInvoice(false);
    }
  };
  // Add this to your modal component (outside the return)
  useEffect(() => {
    if (showOrderDetails) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [showOrderDetails]);
  // Pagination logic
  const indexOfLastOrder = currentPage * ordersPerPage;
  const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
  const currentOrders = filteredOrders.slice(
    indexOfFirstOrder,
    indexOfLastOrder
  );
  const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);

  // Refresh orders
  const refreshOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        "https://agrofarm-vd8i.onrender.com/api/v1/order/supplier-orders",
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setOrders(data.orders);
        setError(null);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-4">
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg flex items-start">
          <FiAlertCircle className="h-5 w-5 mr-2 mt-0.5" />
          <div>
            <p className="font-bold">Error</p>
            <p>{error}</p>
            <button
              onClick={refreshOrders}
              className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition flex items-center"
            >
              <FiRefreshCw className="mr-2" />
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-8"
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-green-700">
              Order Management
            </h1>
            <p className="text-gray-600">Manage and track all your orders</p>
          </div>
          <button
            onClick={refreshOrders}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            <FiRefreshCw className="animate-spin" />
            Refresh Orders
          </button>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiSearch className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search by order ID, customer name, product, address, or phone..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="relative">
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              <FiFilter />
              Filter Orders
              {isFilterOpen ? <FiChevronUp /> : <FiChevronDown />}
            </button>

            <AnimatePresence>
              {isFilterOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="absolute z-10 mt-2 w-56 bg-white rounded-md shadow-lg overflow-hidden"
                >
                  <div className="p-4 space-y-2 border-b">
                    <h3 className="text-sm font-medium text-gray-700">
                      Order Status
                    </h3>
                    {[
                      "all",
                      "pending",
                      "processing",
                      "confirmed",
                      "shipped",
                      "out_for_delivery",
                      "delivered",
                      "partially_shipped",
                      "partially_delivered",
                      "partially_cancelled",
                      "canceled",
                      "cancelled",
                    ].map((status) => (
                      <label
                        key={status}
                        className="flex items-center space-x-2"
                      >
                        <input
                          type="radio"
                          name="status"
                          checked={statusFilter === status}
                          onChange={() => setStatusFilter(status)}
                          className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300"
                        />
                        <span className="text-sm text-gray-700 capitalize">
                          {status === "all" ? "All Statuses" : status}
                        </span>
                      </label>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* Orders List */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden "
      >
        <div className="overflow-x-auto scrollbar-hide">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Products
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentOrders.length > 0 ? (
                currentOrders.map((order) => (
                  <motion.tr
                    key={order._id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {order._id.substring(0, 8)}...
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {(() => {
                          const customerObj =
                            order.customer ||
                            (order.buyerId && typeof order.buyerId === "object"
                              ? order.buyerId
                              : null);
                          return customerObj?.name || "N/A";
                        })()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {(() => {
                          const customerObj =
                            order.customer ||
                            (order.buyerId && typeof order.buyerId === "object"
                              ? order.buyerId
                              : null);
                          return customerObj?.email || customerObj?.phone || "";
                        })()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {order.products.length} items
                      </div>
                      <div className="text-xs text-gray-500">
                        {order.products[0]?.productId?.name ||
                          order.products[0]?.name ||
                          "N/A"}
                        {order.products.length > 1
                          ? ` +${order.products.length - 1} more`
                          : ""}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {formatDate(order.createdAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(calculateOrderTotal(order))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          getStatusInfo(order.orderStatus || order.status).color
                        }`}
                      >
                        {getStatusInfo(order.orderStatus || order.status).text}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          order.paymentInfo.status === "completed"
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {order.paymentInfo.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        {(() => {
                          const orderStatus = (
                            order.orderStatus ||
                            order.status ||
                            ""
                          ).toLowerCase();
                          const isCancelled =
                            orderStatus === "cancelled" ||
                            orderStatus === "canceled";
                          return hasPendingProducts(order) && !isCancelled;
                        })() && (
                          <>
                            <button
                              onClick={() => {
                                setOrderToAccept(order);
                                setShowAcceptModal(true);
                              }}
                              className="text-green-600 hover:text-green-900 px-3 py-1 rounded-md hover:bg-green-50 transition text-xs font-medium"
                              title="Accept Order"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => {
                                setOrderToReject(order);
                                setShowRejectModal(true);
                              }}
                              className="text-red-600 hover:text-red-900 px-3 py-1 rounded-md hover:bg-red-50 transition text-xs font-medium"
                              title="Reject Order"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => viewOrderDetails(order)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded-full hover:bg-blue-50 transition"
                          title="View Details"
                        >
                          <FiEye className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="px-6 py-4 text-center">
                    <div className="text-gray-500 py-8">
                      <svg
                        className="mx-auto h-12 w-12 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1}
                          d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <h3 className="mt-2 text-sm font-medium">
                        No orders found
                      </h3>
                      <p className="mt-1 text-sm">
                        Try adjusting your search or filter to find what you're
                        looking for.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Pagination */}
      {filteredOrders.length > 0 && (
        <div className="flex items-center justify-between mt-6">
          <div className="text-sm text-gray-700">
            Showing <span className="font-medium">{indexOfFirstOrder + 1}</span>{" "}
            to{" "}
            <span className="font-medium">
              {Math.min(indexOfLastOrder, filteredOrders.length)}
            </span>{" "}
            of <span className="font-medium">{filteredOrders.length}</span>{" "}
            orders
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 hover:bg-gray-50 transition"
            >
              Previous
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              // Show pages around current page
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`px-3 py-1 border rounded-md text-sm ${
                    currentPage === pageNum
                      ? "bg-green-600 text-white border-green-600"
                      : "border-gray-300 hover:bg-gray-50"
                  } transition`}
                >
                  {pageNum}
                </button>
              );
            })}
            {totalPages > 5 && currentPage < totalPages - 2 && (
              <span className="px-3 py-1 text-sm">...</span>
            )}
            {totalPages > 5 && currentPage < totalPages - 2 && (
              <button
                onClick={() => setCurrentPage(totalPages)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-50 transition"
              >
                {totalPages}
              </button>
            )}
            <button
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 hover:bg-gray-50 transition"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Order Details Modal */}
      <AnimatePresence>
        {showOrderDetails && selectedOrder && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-40">
            <div className="flex items-center justify-center min-h-screen px-4 py-8 text-center sm:block sm:p-0">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: "spring", damping: 25 }}
                className="inline-block bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:align-middle sm:max-w-4xl sm:w-full"
                role="dialog"
                aria-modal="true"
              >
                <div className="px-6 py-4 sm:px-8 sm:py-6">
                  {/* Header with Gradient */}
                  <div className="flex justify-between items-start border-b-2 border-gray-200 pb-4 mb-6">
                    <div>
                      <h3 className="text-2xl font-bold text-gray-800 mb-1">
                        Order Details
                      </h3>
                      <p className="text-sm text-gray-500 font-mono">
                        #{selectedOrder._id?.slice(-12).toUpperCase()}
                      </p>
                    </div>
                    <button
                      onClick={() => setShowOrderDetails(false)}
                      className="text-gray-500 hover:text-red-600 focus:outline-none p-2 rounded-lg hover:bg-gray-100 transition-all"
                    >
                      <FiX className="h-6 w-6" />
                    </button>
                  </div>

                  {/* Grid Content */}
                  <div className="grid gap-6 sm:grid-cols-2">
                    {/* Order Info */}
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-5 rounded-xl border border-blue-200 shadow-sm">
                      <h4 className="text-sm font-bold text-blue-800 mb-4 flex items-center gap-2 uppercase tracking-wide">
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
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        ORDER INFORMATION
                      </h4>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Date</span>
                          <span className="font-medium text-gray-800">
                            {formatDate(selectedOrder.createdAt)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500">Order Status</span>
                          <span
                            className={`px-2 py-1 inline-flex text-xs font-semibold rounded-full ${
                              getStatusInfo(
                                selectedOrder.status ||
                                  selectedOrder.orderStatus
                              ).color
                            }`}
                          >
                            {
                              getStatusInfo(
                                selectedOrder.status ||
                                  selectedOrder.orderStatus
                              ).text
                            }
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Payment Method</span>
                          <span className="font-medium capitalize text-gray-800">
                            {selectedOrder.paymentInfo.method || "N/A"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Payment Status</span>
                          <span
                            className={`px-2 py-0.5 inline-flex text-xs font-semibold rounded-full ${
                              selectedOrder.paymentInfo.status === "completed"
                                ? "bg-green-100 text-green-700"
                                : "bg-yellow-100 text-yellow-700"
                            }`}
                          >
                            {selectedOrder.paymentInfo.status}
                          </span>
                        </div>
                      </div>
                    </div>

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
                          // Prioritize customer field, then buyerId (per API spec)
                          // Handle both populated objects and string IDs
                          const customerObj =
                            selectedOrder.customer ||
                            (selectedOrder.buyerId &&
                            typeof selectedOrder.buyerId === "object"
                              ? selectedOrder.buyerId
                              : null);

                          // If buyerId is a string, we can't use it directly
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
                                    selectedOrder.shippingAddress
                                      ?.phoneNumber ||
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
                                      : "N/A")}
                                </span>
                              </div>
                            </>
                          );
                        })()}
                        {selectedOrder.notes && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Order Notes</span>
                            <span className="text-right font-medium text-gray-800">
                              {selectedOrder.notes}
                            </span>
                          </div>
                        )}
                        {selectedOrder.deliveryInfo?.notes && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">
                              Delivery Notes
                            </span>
                            <span className="text-right font-medium text-gray-800">
                              {selectedOrder.deliveryInfo.notes}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="mt-6">
                    <h4 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
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
                          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                        />
                      </svg>
                      ORDER ITEMS
                    </h4>
                    <div className="border-2 border-gray-200 rounded-xl overflow-hidden shadow-sm">
                      <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 uppercase font-bold">
                          <tr>
                            <th className="px-4 py-3 text-left font-medium">
                              Product
                            </th>
                            <th className="px-4 py-3 text-left font-medium">
                              Quantity
                            </th>
                            <th className="px-4 py-3 text-right font-medium">
                              Price
                            </th>
                            <th className="px-4 py-3 text-left font-medium">
                              Status
                            </th>
                            <th className="px-4 py-3 text-left font-medium">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {selectedOrder.products.map((item, index) => {
                            const product = item.productId || item;
                            const productStatus = item.status || "processing";
                            const vendorName =
                              item.farmerId?.name ||
                              item.supplierId?.name ||
                              product.upLoadedBy?.uploaderName ||
                              "N/A";
                            const isCancelled =
                              productStatus === "cancelled" ||
                              productStatus === "canceled";

                            // Get the product item ID - this should be the _id of the item in products array
                            const productItemId = item._id;

                            if (!productItemId) {
                              console.warn("Product item missing _id:", item);
                            }

                            return (
                              <tr key={productItemId || index}>
                                <td className="px-4 py-4">
                                  <div className="flex items-center space-x-3">
                                    {product.images?.[0] && (
                                      <img
                                        src={product.images[0]}
                                        alt={product.name}
                                        className="h-14 w-14 rounded-lg object-cover border-2 border-gray-200 shadow-sm"
                                      />
                                    )}
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <div
                                          className={`font-medium ${
                                            product.isDeleted ||
                                            product.isActive === false
                                              ? "text-gray-400 line-through"
                                              : "text-gray-800"
                                          }`}
                                        >
                                          {product.name || "Unknown Product"}
                                        </div>
                                        {(product.isDeleted ||
                                          product.isActive === false) && (
                                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-semibold rounded-full">
                                            Deleted
                                          </span>
                                        )}
                                      </div>
                                      <div
                                        className={`text-xs ${
                                          product.isDeleted ||
                                          product.isActive === false
                                            ? "text-gray-400"
                                            : "text-gray-500"
                                        }`}
                                      >
                                        Vendor: {vendorName}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-4 text-gray-600">
                                  {item.quantity}{" "}
                                  {product.unit ? product.unit : ""}
                                </td>
                                <td className="px-4 py-4 text-right font-medium text-gray-800">
                                  {formatCurrency(product.price || item.price)}{" "}
                                  / {product.unit || ""}
                                </td>
                                <td className="px-4 py-4">
                                  <span
                                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                      getStatusInfo(productStatus).color
                                    }`}
                                  >
                                    {getStatusInfo(productStatus).text}
                                  </span>
                                </td>
                                <td className="px-4 py-4">
                                  {(() => {
                                    // Check if order itself is cancelled - if so, no status updates allowed
                                    const orderStatus = (selectedOrder.orderStatus || selectedOrder.status || "").toLowerCase();
                                    const isOrderCancelled = orderStatus === "cancelled" || orderStatus === "canceled";
                                    
                                    // Get valid next statuses based on current status
                                    // Must match backend allowedTransitions in controllers/order.js
                                    const getValidNextStatuses = (
                                      currentStatus
                                    ) => {
                                      const statusLower = (
                                        currentStatus || ""
                                      ).toLowerCase();

                                      // Backend allowedTransitions:
                                      // pending → processing (via accept), cancelled (via reject)
                                      // processing → shipped, cancelled
                                      // shipped → out_for_delivery (use "Mark Out for Delivery" button, not dropdown)
                                      // out_for_delivery → [] (buyer must confirm delivery)
                                      // delivered → [] (cannot be changed by seller)
                                      // received → [] (final status)
                                      // cancelled → [] (final status)
                                      
                                      if (statusLower === "pending") {
                                        // Pending orders should be accepted/rejected first, not status changed via dropdown
                                        return [];
                                      }
                                      if (statusLower === "processing") {
                                        return ["shipped", "cancelled"];
                                      }
                                      if (statusLower === "shipped") {
                                        // Seller must use "Mark Out for Delivery" button instead of dropdown
                                        return [];
                                      }
                                      if (statusLower === "out_for_delivery") {
                                        // Cannot be changed by seller - buyer must confirm delivery
                                        return [];
                                      }
                                      if (statusLower === "delivered") {
                                        // Cannot be changed by seller
                                        return [];
                                      }
                                      if (statusLower === "received") {
                                        // Final status - cannot be changed
                                        return [];
                                      }
                                      if (statusLower === "cancelled" || statusLower === "canceled") {
                                        // Final status - cannot be changed
                                        return [];
                                      }
                                      // Unknown status - no transitions allowed
                                      return [];
                                    };

                                    const validStatuses =
                                      getValidNextStatuses(productStatus);
                                    const canChangeStatus =
                                      validStatuses.length > 0 && !isCancelled && !isOrderCancelled;
                                    const isDeliveredOrReceived =
                                      productStatus === "delivered" ||
                                      productStatus === "received";
                                    const isOutForDelivery =
                                      productStatus === "out_for_delivery";

                                    // If order is cancelled, show status only (no dropdown)
                                    if (isOrderCancelled) {
                                      return (
                                        <span
                                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                            getStatusInfo(productStatus).color
                                          }`}
                                        >
                                          {getStatusInfo(productStatus).text}
                                        </span>
                                      );
                                    }

                                    if (
                                      !canChangeStatus &&
                                      !isDeliveredOrReceived &&
                                      !isCancelled &&
                                      !isOutForDelivery
                                    ) {
                                      return (
                                        <span className="text-xs text-gray-500 italic">
                                          Cannot change status
                                        </span>
                                      );
                                    }

                                    if (isDeliveredOrReceived || isCancelled || isOutForDelivery) {
                                      return (
                                        <span
                                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                            getStatusInfo(productStatus).color
                                          }`}
                                        >
                                          {getStatusInfo(productStatus).text}
                                        </span>
                                      );
                                    }

                                    return (
                                      <select
                                        value={productStatus}
                                        onChange={(e) => {
                                          // Use the product item ID already extracted above
                                          if (!productItemId) {
                                            toast.error(
                                              "Product item ID not found. Please refresh the order details."
                                            );
                                            return;
                                          }
                                          if (!selectedOrder._id) {
                                            toast.error("Order ID not found.");
                                            return;
                                          }
                                          handleProductStatusChange(
                                            selectedOrder._id,
                                            productItemId,
                                            e.target.value
                                          );
                                        }}
                                        className="border rounded px-2 py-1 text-xs focus:ring-green-500 focus:border-green-500"
                                      >
                                        <option value={productStatus} disabled>
                                          {getStatusInfo(productStatus).text}
                                        </option>
                                        {validStatuses.map((status) => (
                                          <option key={status} value={status}>
                                            {getStatusInfo(status).text}
                                          </option>
                                        ))}
                                      </select>
                                    );
                                  })()}
                                </td>
                              </tr>
                            );
                          })}
                          <tr className="bg-gray-50">
                            <td
                              colSpan="2"
                              className="px-4 py-4 text-right text-gray-500"
                            >
                              Subtotal
                            </td>
                            <td className="px-4 py-4 text-right font-medium text-gray-800">
                              {formatCurrency(
                                calculateOrderTotal(selectedOrder)
                              )}
                            </td>
                          </tr>
                          <tr className="bg-gray-50">
                            <td
                              colSpan="2"
                              className="px-4 py-4 text-right text-gray-500"
                            >
                              Delivery Fee
                            </td>
                            <td className="px-4 py-4 text-right font-medium text-gray-800">
                              {formatCurrency(0)}
                            </td>
                          </tr>
                          <tr className="bg-gray-100">
                            <td
                              colSpan="2"
                              className="px-4 py-4 text-right font-bold text-gray-800"
                            >
                              Total
                            </td>
                            <td className="px-4 py-4 text-right font-bold text-gray-800">
                              {formatCurrency(
                                calculateOrderTotal(selectedOrder)
                              )}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Tracking ID and Delivery Info Display */}
                {(selectedOrder.trackingId || selectedOrder.deliveryInfo?.vehicle) && (
                  <div className="mt-6 border-t-2 border-gray-200 pt-6">
                    <h4 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <svg
                        className="w-5 h-5 text-blue-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      Tracking & Delivery Information
                    </h4>
                    <div className="bg-gradient-to-br from-blue-50 to-white p-5 rounded-xl border border-blue-200">
                      {selectedOrder.trackingId && (
                        <div className="mb-4">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                            Tracking ID
                          </p>
                          <p className="text-lg font-mono font-bold text-blue-700">
                            {selectedOrder.trackingId}
                          </p>
                        </div>
                      )}
                      {selectedOrder.deliveryInfo?.vehicle && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-white p-3 rounded-lg border border-gray-200">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                              Vehicle Information
                            </p>
                            <div className="space-y-1 text-sm">
                              <p><span className="font-medium">Name:</span> {selectedOrder.deliveryInfo.vehicle.name}</p>
                              <p><span className="font-medium">Registration:</span> {selectedOrder.deliveryInfo.vehicle.registrationNumber}</p>
                              <p><span className="font-medium">Type:</span> {selectedOrder.deliveryInfo.vehicle.vehicleType}</p>
                              <p><span className="font-medium">Contact:</span> {selectedOrder.deliveryInfo.vehicle.contactInfo}</p>
                            </div>
                          </div>
                          <div className="bg-white p-3 rounded-lg border border-gray-200">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                              Rider Information
                            </p>
                            <div className="space-y-1 text-sm">
                              <p><span className="font-medium">Name:</span> {selectedOrder.deliveryInfo.rider?.name || "N/A"}</p>
                              <p><span className="font-medium">Contact:</span> {selectedOrder.deliveryInfo.rider?.contactInfo || "N/A"}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Mark Out for Delivery Button */}
                {(() => {
                  const orderStatus = (selectedOrder.orderStatus || selectedOrder.status || "").toLowerCase();
                  const allProductsShipped = selectedOrder.products?.every(
                    (p) => p.status === "shipped"
                  );
                  
                  if (orderStatus === "shipped" && allProductsShipped) {
                    return (
                      <div className="mt-6 border-t-2 border-gray-200 pt-6">
                        <button
                          type="button"
                          onClick={() => {
                            setOrderToMarkOutForDelivery(selectedOrder);
                            setShowOutForDeliveryModal(true);
                          }}
                          className="w-full px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg shadow transition font-medium flex items-center justify-center gap-2"
                        >
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
                              d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                            />
                          </svg>
                          Mark Order as Out for Delivery
                        </button>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Footer Buttons */}
                <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => downloadInvoicePDF(selectedOrder)}
                    disabled={downloadingInvoice}
                    className="inline-flex items-center px-4 py-2 rounded-md bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {downloadingInvoice ? (
                      <>
                        <FiRefreshCw className="mr-2 h-5 w-5 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <FiDownload className="mr-2 h-5 w-5" />
                        Download Invoice PDF
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowOrderDetails(false)}
                    className="inline-flex items-center px-4 py-2 rounded-md bg-white text-sm font-medium text-gray-700 border border-gray-300 hover:bg-gray-100"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Accept Order Modal */}
      <AnimatePresence>
        {showAcceptModal && orderToAccept && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Accept Order
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Please provide an estimated delivery date for this order. The
                buyer will be notified of the acceptance.
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estimated Delivery Date{" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={estimatedDeliveryDate}
                  onChange={(e) => setEstimatedDeliveryDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  The estimated delivery date must be in the future.
                </p>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowAcceptModal(false);
                    setEstimatedDeliveryDate("");
                    setOrderToAccept(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() =>
                    handleAcceptOrder(orderToAccept._id, estimatedDeliveryDate)
                  }
                  disabled={!estimatedDeliveryDate.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Accept Order
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reject Order Modal */}
      <AnimatePresence>
        {showRejectModal && orderToReject && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Reject Order
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Please provide a reason for rejecting this order. The buyer will
                be notified of the rejection.
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rejection Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g., Product out of stock, Unable to fulfill order..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  rows="4"
                  required
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectReason("");
                    setOrderToReject(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() =>
                    handleRejectOrder(orderToReject._id, rejectReason)
                  }
                  disabled={!rejectReason.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Reject Order
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mark Out for Delivery Modal */}
      <AnimatePresence>
        {showOutForDeliveryModal && orderToMarkOutForDelivery && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Mark Order as Out for Delivery
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                Please provide vehicle and rider information for delivery. The buyer will receive a tracking ID and delivery details.
              </p>

              <div className="space-y-4">
                {/* Vehicle Information */}
                <div className="border-b border-gray-200 pb-4">
                  <h4 className="text-md font-semibold text-gray-800 mb-3">Vehicle Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Vehicle Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={deliveryForm.vehicleName}
                        onChange={(e) => setDeliveryForm({...deliveryForm, vehicleName: e.target.value})}
                        placeholder="e.g., Honda CD-70"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Registration Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={deliveryForm.vehicleRegistrationNumber}
                        onChange={(e) => setDeliveryForm({...deliveryForm, vehicleRegistrationNumber: e.target.value})}
                        placeholder="e.g., ABC-1234"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Vehicle Type <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={deliveryForm.vehicleType}
                        onChange={(e) => setDeliveryForm({...deliveryForm, vehicleType: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        required
                      >
                        <option value="Motorcycle">Motorcycle</option>
                        <option value="Car">Car</option>
                        <option value="Van">Van</option>
                        <option value="Truck">Truck</option>
                        <option value="Rickshaw">Rickshaw</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Vehicle Contact <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={deliveryForm.vehicleContactInfo}
                        onChange={(e) => setDeliveryForm({...deliveryForm, vehicleContactInfo: e.target.value})}
                        placeholder="e.g., 0300-1234567"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Rider Information */}
                <div className="border-b border-gray-200 pb-4">
                  <h4 className="text-md font-semibold text-gray-800 mb-3">Rider/Delivery Person Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Rider Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={deliveryForm.riderName}
                        onChange={(e) => setDeliveryForm({...deliveryForm, riderName: e.target.value})}
                        placeholder="e.g., Ahmed Ali"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Rider Contact <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={deliveryForm.riderContactInfo}
                        onChange={(e) => setDeliveryForm({...deliveryForm, riderContactInfo: e.target.value})}
                        placeholder="e.g., 0300-1234567"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowOutForDeliveryModal(false);
                    setOrderToMarkOutForDelivery(null);
                    setDeliveryForm({
                      vehicleName: "",
                      vehicleRegistrationNumber: "",
                      vehicleType: "Motorcycle",
                      vehicleContactInfo: "",
                      riderName: "",
                      riderContactInfo: ""
                    });
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!deliveryForm.vehicleName || !deliveryForm.vehicleRegistrationNumber || 
                        !deliveryForm.vehicleContactInfo || !deliveryForm.riderName || 
                        !deliveryForm.riderContactInfo) {
                      toast.error("Please fill all required fields");
                      return;
                    }
                    handleMarkOutForDelivery(orderToMarkOutForDelivery._id, deliveryForm);
                  }}
                  disabled={!deliveryForm.vehicleName || !deliveryForm.vehicleRegistrationNumber || 
                           !deliveryForm.vehicleContactInfo || !deliveryForm.riderName || 
                           !deliveryForm.riderContactInfo}
                  className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-md hover:bg-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Mark Out for Delivery
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default OrderManagement;
