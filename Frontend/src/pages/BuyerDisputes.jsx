import React, { useState, useEffect } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Gavel,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  Plus,
  Eye,
  RefreshCw,
} from "lucide-react";
import DisputeModal from "../components/DisputeModal";
import DisputeResolveModal from "../components/DisputeResolveModal";
import { toast } from "react-toastify";

const API_BASE = "https://agrofarm-vd8i.onrender.com/api/v1/order";

function BuyerDisputes() {
  const navigate = useNavigate();
  const [disputes, setDisputes] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch buyer's disputes using buyer disputes endpoint: GET /api/v1/order/disputes/buyer
      const params = new URLSearchParams();
      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }
      params.append("page", "1");
      params.append("limit", "50");

      const disputesResponse = await axios.get(
        `${API_BASE}/disputes/buyer${
          params.toString() ? `?${params.toString()}` : ""
        }`,
        { withCredentials: true }
      );

      if (disputesResponse.data.success && disputesResponse.data.disputes) {
        // Apply status filter if needed (API might already filter)
        let filteredDisputes = disputesResponse.data.disputes;
        if (statusFilter !== "all") {
          filteredDisputes = disputesResponse.data.disputes.filter(
            (d) => d.status === statusFilter
          );
        }
        setDisputes(filteredDisputes);
      } else {
        setDisputes([]);
      }

      // Also fetch orders for creating new disputes
      const ordersResponse = await axios.get(`${API_BASE}/user-orders`, {
        withCredentials: true,
      });
      const allOrders = ordersResponse.data.orders || [];
      setOrders(allOrders);
    } catch (error) {
      console.error("Error fetching disputes:", error);
      toast.error(error.response?.data?.message || "Failed to fetch disputes");
      setDisputes([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      open: { bg: "bg-yellow-100", text: "text-yellow-800", icon: Clock },
      seller_responded: { bg: "bg-blue-100", text: "text-blue-800", icon: CheckCircle },
      pending_admin_review: {
        bg: "bg-orange-100",
        text: "text-orange-800",
        icon: AlertCircle,
      },
      closed: { bg: "bg-green-100", text: "text-green-800", icon: CheckCircle },
    };

    const config = statusConfig[status] || statusConfig.open;
    const Icon = config.icon;

    return (
      <span
        className={`${config.bg} ${config.text} px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1`}
      >
        <Icon className="w-3 h-3" />
        {status.replace(/_/g, " ").toUpperCase()}
      </span>
    );
  };

  const getDisputeTypeLabel = (type) => {
    const types = {
      non_delivery: "Non-Delivery",
      product_fault: "Product Fault",
      wrong_item: "Wrong Item",
      other: "Other",
    };
    return types[type] || type;
  };

  const canCreateDispute = (order) => {
    const status = order.orderStatus || order.status;
    // If shipped, only allow if expected delivery date has passed (allow 1 day buffer)
    if (status === "shipped") {
      if (!order.expected_delivery_date) return false;
      const now = new Date();
      const expected = new Date(order.expected_delivery_date);
      const oneDay = 24 * 60 * 60 * 1000;
      if (now < new Date(expected.getTime() + oneDay)) return false;
    }

    return (
      (status === "shipped" || status === "delivered" || status === "received") &&
      (!order.dispute_status || order.dispute_status === "none")
    );
  };

  const getOrdersForDispute = () => {
    return orders.filter(canCreateDispute);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <Gavel className="w-8 h-8 text-orange-600" />
            My Disputes
          </h1>
          <p className="text-gray-600 mt-2">
            Manage disputes on your orders and create new disputes if needed
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <label className="text-gray-700 font-medium">
              Filter by Status:
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="all">All Disputes</option>
              <option value="open">Open</option>
              <option value="pending_admin_review">Pending Admin Review</option>
              <option value="seller_responded">Seller Responded</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          <button
            onClick={async () => {
              await fetchData();
              toast.success("Disputes refreshed");
            }}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition shadow-md"
            title="Refresh Disputes"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Disputes List */}
      {disputes.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <Gavel className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600 text-lg">No disputes found</p>
          <p className="text-gray-500 text-sm mt-2">
            {statusFilter !== "all"
              ? `No disputes with status "${statusFilter}"`
              : "You don't have any active disputes"}
          </p>
          {getOrdersForDispute().length > 0 && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="mt-4 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
            >
              Create Your First Dispute
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {disputes.map((dispute) => (
            <motion.div
              key={dispute._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <Gavel className="w-5 h-5 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Dispute #{dispute._id?.slice(-8) || "N/A"}
                      </h3>
                      <div className="flex items-center gap-4 mt-1">
                        <p className="text-sm font-medium text-gray-700">
                          Order ID:{" "}
                          <span className="text-orange-600 font-semibold">
                            {typeof dispute.orderId === "string"
                              ? dispute.orderId.slice(-8)
                              : dispute.orderId?._id?.slice(-8) || "N/A"}
                          </span>
                        </p>
                        {dispute.orderId?.totalPrice && (
                          <p className="text-sm text-gray-600">
                            Total: ₨{" "}
                            {dispute.orderId.totalPrice.toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Dispute Type</p>
                      <p className="text-sm font-medium text-gray-900">
                        {getDisputeTypeLabel(dispute.disputeType)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">
                        Dispute Status
                      </p>
                      {getStatusBadge(dispute.status)}
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Order Status</p>
                      <p className="text-sm font-medium text-gray-900 capitalize">
                        {dispute.orderId?.orderStatus ||
                          dispute.orderId?.status ||
                          "N/A"}
                      </p>
                      {dispute.orderId?.payment_status && (
                        <p className="text-xs text-gray-500 mt-1">
                          Payment:{" "}
                          <span className="font-medium capitalize">
                            {dispute.orderId.payment_status}
                          </span>
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Seller</p>
                      <p className="text-sm font-medium text-gray-900 capitalize">
                        {typeof dispute.sellerId === "object" &&
                        dispute.sellerId?.name
                          ? dispute.sellerId.name
                          : `${dispute.sellerRole || "Unknown"}`}
                      </p>
                      {typeof dispute.sellerId === "object" &&
                        dispute.sellerId?.email && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            {dispute.sellerId.email}
                          </p>
                        )}
                    </div>
                  </div>

                  {dispute.reason && (
                    <div className="mb-4">
                      <p className="text-xs text-gray-500 mb-1 font-medium">
                        Dispute Reason
                      </p>
                      <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                        {dispute.reason}
                      </p>
                    </div>
                  )}

                  {/* Seller Response */}
                  {dispute.sellerResponse?.proposal &&
                  dispute.sellerResponse?.respondedAt ? (
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-xs text-blue-600 font-medium mb-2">
                        Seller's Response
                      </p>
                      {dispute.sellerResponse.evidence &&
                      dispute.sellerResponse.evidence.length > 0 ? (
                        <div className="grid grid-cols-3 gap-2 mb-2">
                          {dispute.sellerResponse.evidence
                            .slice(0, 3)
                            .map((evidence, index) => (
                              <img
                                key={index}
                                src={evidence}
                                alt={`Evidence ${index + 1}`}
                                className="w-full h-20 object-cover rounded-lg border border-blue-200 cursor-pointer hover:opacity-80"
                                onError={(e) => {
                                  e.target.style.display = "none";
                                }}
                                onClick={() => window.open(evidence, "_blank")}
                              />
                            ))}
                          {dispute.sellerResponse.evidence.length > 3 && (
                            <div className="w-full h-20 bg-blue-100 rounded-lg border border-blue-200 flex items-center justify-center text-xs text-blue-600">
                              +{dispute.sellerResponse.evidence.length - 3} more
                            </div>
                          )}
                        </div>
                      ) : null}
                      <p className="text-sm text-gray-700 font-medium mb-1">
                        Proposal:
                      </p>
                      <p className="text-sm text-gray-700">
                        {dispute.sellerResponse.proposal}
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        Responded:{" "}
                        {new Date(
                          dispute.sellerResponse.respondedAt
                        ).toLocaleString()}
                      </p>
                    </div>
                  ) : (
                    <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <p className="text-xs text-gray-500 font-medium mb-1">
                        Seller's Response
                      </p>
                      <p className="text-xs text-gray-500">
                        Seller has not responded yet.
                      </p>
                    </div>
                  )}

                  {/* Admin Ruling */}
                  {dispute.adminRuling?.decision && (
                    <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                      <p className="text-xs text-purple-600 font-medium mb-2">
                        Admin Ruling
                      </p>
                      <p className="text-sm font-semibold text-gray-900 mb-1">
                        Decision:{" "}
                        <span className="capitalize">
                          {dispute.adminRuling.decision.replace("_", " ")}
                        </span>
                      </p>
                      {dispute.adminRuling.notes && (
                        <p className="text-sm text-gray-700 mt-1">
                          {dispute.adminRuling.notes}
                        </p>
                      )}
                      {dispute.adminRuling.ruledAt && (
                        <p className="text-xs text-gray-500 mt-2">
                          Ruled:{" "}
                          {new Date(
                            dispute.adminRuling.ruledAt
                          ).toLocaleString()}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Clock className="w-4 h-4" />
                    Created:{" "}
                    {new Date(
                      dispute.createdAt || dispute.order?.createdAt
                    ).toLocaleString()}
                  </div>
                </div>

                <div className="ml-4 flex flex-col gap-2">
                  <button
                    onClick={async () => {
                      setSelectedDispute(dispute);
                      // Fetch full dispute details if needed
                      try {
                        const response = await axios.get(
                          `${API_BASE}/dispute/${dispute._id}`,
                          { withCredentials: true }
                        );
                        if (response.data.success && response.data.dispute) {
                          setSelectedDispute(response.data.dispute);
                        }
                      } catch (error) {
                        console.error("Error fetching dispute details:", error);
                      }
                      setShowDetailsModal(true);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2 whitespace-nowrap"
                  >
                    <Eye className="w-4 h-4" />
                    View Details
                  </button>
                  {(["open","seller_responded"].includes(dispute.status)) &&
                    dispute.sellerResponse?.proposal &&
                    dispute.sellerResponse?.respondedAt && (
                      <button
                        onClick={() => {
                          setSelectedDispute(dispute);
                          setShowResolveModal(true);
                        }}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2 whitespace-nowrap"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Resolve
                      </button>
                    )}
                  {dispute.status === "open" &&
                    (!dispute.sellerResponse?.proposal ||
                      !dispute.sellerResponse?.respondedAt) && (
                      <span className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg text-sm font-medium">
                        Awaiting Seller Response
                      </span>
                    )}
                  {dispute.status === "pending_admin_review" && (
                    <span className="px-4 py-2 bg-orange-100 text-orange-800 rounded-lg text-sm font-medium">
                      Awaiting Admin Review
                    </span>
                  )}
                  {dispute.status === "closed" && (
                    <span className="px-4 py-2 bg-green-100 text-green-800 rounded-lg text-sm font-medium">
                      Resolved
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Dispute Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-800">
                Select Order to Create Dispute
              </h2>
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setSelectedOrder(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {getOrdersForDispute().map((order) => (
                  <div
                    key={order._id}
                    className="p-4 border border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition cursor-pointer"
                    onClick={() => {
                      setSelectedOrder(order);
                      setShowCreateForm(false);
                      setShowDisputeModal(true);
                    }}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-gray-900">
                          Order #{order._id.slice(-8)}
                        </p>
                        <p className="text-sm text-gray-600">
                          {order.products?.length || 0} item(s) • ₨{" "}
                          {order.totalPrice?.toLocaleString() || 0}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Status: {order.orderStatus || order.status}
                        </p>
                      </div>
                      <Eye className="w-5 h-5 text-green-600" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Dispute Create Modal */}
      {showDisputeModal && selectedOrder && (
        <DisputeModal
          isOpen={showDisputeModal}
          onClose={() => {
            setShowDisputeModal(false);
            setSelectedOrder(null);
          }}
          order={selectedOrder}
          onSuccess={() => {
            fetchData();
            // Toast is already shown in DisputeModal
          }}
        />
      )}

      {/* Dispute Details Modal */}
      {showDetailsModal && selectedDispute && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-800">
                Dispute Details #{selectedDispute._id?.slice(-8) || "N/A"}
              </h2>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedDispute(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Dispute Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Dispute Type</p>
                  <p className="text-base font-medium text-gray-900 capitalize">
                    {selectedDispute.disputeType?.replace("_", " ") || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Status</p>
                  {(() => {
                    const status = selectedDispute.status;
                    if (status === "open")
                      return (
                        <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-lg text-sm font-medium">
                          Open
                        </span>
                      );
                    if (status === "seller_responded")
                      return (
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-lg text-sm font-medium">
                          Seller Responded
                        </span>
                      );
                    if (status === "pending_admin_review")
                      return (
                        <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-lg text-sm font-medium">
                          Pending Admin Review
                        </span>
                      );
                    if (status === "closed")
                      return (
                        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-lg text-sm font-medium">
                          Closed
                        </span>
                      );
                    return (
                      <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-lg text-sm font-medium">
                        {status}
                      </span>
                    );
                  })()}
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Order ID</p>
                  <p className="text-base font-medium text-gray-900">
                    {typeof selectedDispute.orderId === "string"
                      ? selectedDispute.orderId.slice(-8)
                      : selectedDispute.orderId?._id?.slice(-8) || "N/A"}
                  </p>
                  {selectedDispute.orderId?.totalPrice && (
                    <p className="text-sm text-gray-600 mt-1">
                      Total: ₨{" "}
                      {selectedDispute.orderId.totalPrice.toLocaleString()}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Seller</p>
                  <p className="text-base font-medium text-gray-900 capitalize">
                    {typeof selectedDispute.sellerId === "object" &&
                    selectedDispute.sellerId?.name
                      ? selectedDispute.sellerId.name
                      : `${selectedDispute.sellerRole || "Unknown"} Seller`}
                  </p>
                  {typeof selectedDispute.sellerId === "object" &&
                    selectedDispute.sellerId?.name && (
                      <>
                        <p className="text-sm text-gray-600 capitalize mt-0.5">
                          {selectedDispute.sellerRole || "Seller"}
                        </p>
                        {selectedDispute.sellerId.email && (
                          <p className="text-xs text-gray-500 mt-1">
                            {selectedDispute.sellerId.email}
                          </p>
                        )}
                        {selectedDispute.sellerId.phone && (
                          <p className="text-xs text-gray-500">
                            {selectedDispute.sellerId.phone}
                          </p>
                        )}
                      </>
                    )}
                </div>
              </div>

              {/* Buyer Info - NEW SECTION */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Your Info (Buyer)</p>
                  <p className="text-base font-medium text-gray-900">
                    {typeof selectedDispute.buyerId === "object" &&
                    selectedDispute.buyerId?.name
                      ? selectedDispute.buyerId.name
                      : "You"}
                  </p>
                  {typeof selectedDispute.buyerId === "object" &&
                    selectedDispute.buyerId?.email && (
                      <p className="text-xs text-gray-600 mt-1">
                        {selectedDispute.buyerId.email}
                      </p>
                    )}
                  {selectedDispute.buyerRole && (
                    <p className="text-xs text-gray-600 mt-1 capitalize">
                      Role: {selectedDispute.buyerRole}
                    </p>
                  )}
                </div>
              </div>

              {/* Reason */}
              <div>
                <p className="text-sm text-gray-500 mb-2">Dispute Reason</p>
                <p className="text-base text-gray-900 bg-gray-50 p-4 rounded-lg">
                  {selectedDispute.reason || "N/A"}
                </p>
              </div>

              {/* Buyer Proof */}
              {selectedDispute.buyerProof && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">Your Proof</p>
                  {selectedDispute.buyerProof.images &&
                  selectedDispute.buyerProof.images.length > 0 ? (
                    <div className="grid grid-cols-3 gap-4 mb-3">
                      {selectedDispute.buyerProof.images.map((image, index) => (
                        <div key={index} className="relative">
                          <img
                            src={image}
                            alt={`Proof ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-80"
                            onError={(e) => {
                              e.target.style.display = "none";
                            }}
                            onClick={() => window.open(image, "_blank")}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
                      No images provided
                    </p>
                  )}
                  {selectedDispute.buyerProof.description && (
                    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg mt-2">
                      {selectedDispute.buyerProof.description}
                    </p>
                  )}
                </div>
              )}

              {/* Seller Response */}
              {selectedDispute.sellerResponse?.proposal &&
              selectedDispute.sellerResponse?.respondedAt ? (
                <div>
                  <p className="text-sm text-gray-500 mb-2">Seller Response</p>
                  {selectedDispute.sellerResponse.evidence &&
                  selectedDispute.sellerResponse.evidence.length > 0 ? (
                    <div className="grid grid-cols-3 gap-4 mb-3">
                      {selectedDispute.sellerResponse.evidence.map(
                        (evidence, index) => (
                          <div key={index} className="relative">
                            <img
                              src={evidence}
                              alt={`Evidence ${index + 1}`}
                              className="w-full h-32 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-80"
                              onError={(e) => {
                                e.target.style.display = "none";
                              }}
                              onClick={() => window.open(evidence, "_blank")}
                            />
                          </div>
                        )
                      )}
                    </div>
                  ) : null}
                  <p className="text-sm text-gray-700 bg-blue-50 p-3 rounded-lg">
                    <span className="font-medium">Proposal: </span>
                    {selectedDispute.sellerResponse.proposal}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Responded:{" "}
                    {new Date(
                      selectedDispute.sellerResponse.respondedAt
                    ).toLocaleString()}
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-gray-500 mb-2">Seller Response</p>
                  <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg border border-gray-200">
                    Seller has not responded yet.
                  </p>
                </div>
              )}

              {/* Order Products */}
              {selectedDispute.orderId?.products &&
                selectedDispute.orderId.products.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-500 mb-2">Order Products</p>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      {selectedDispute.orderId.products.map((product, idx) => (
                        <div
                          key={idx}
                          className="mb-3 pb-3 border-b border-gray-200 last:border-0"
                        >
                          <p className="text-sm font-medium text-gray-900">
                            {product.productId?.name || "Product"}
                          </p>
                          <p className="text-xs text-gray-600">
                            Quantity: {product.quantity} × ₨{" "}
                            {product.price?.toLocaleString() || "0"}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Timestamps */}
              <div className="flex items-center gap-4 text-xs text-gray-500 pt-4 border-t border-gray-200">
                <div>
                  <span className="font-medium">Created: </span>
                  {new Date(selectedDispute.createdAt).toLocaleString()}
                </div>
                {selectedDispute.updatedAt && (
                  <div>
                    <span className="font-medium">Updated: </span>
                    {new Date(selectedDispute.updatedAt).toLocaleString()}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              {(["open", "seller_responded"].includes(selectedDispute.status)) &&
                selectedDispute.sellerResponse?.proposal &&
                selectedDispute.sellerResponse?.respondedAt && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-green-800 mb-3">
                      ✓ Seller has responded with a proposal. What would you like to do?
                    </p>
                    <button
                      onClick={() => {
                        setSelectedDispute(selectedDispute);
                        setShowDetailsModal(false);
                        setShowResolveModal(true);
                      }}
                      className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-5 h-5" />
                      Accept or Reject Proposal
                    </button>
                  </div>
                )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Dispute Resolve Modal */}
      {showResolveModal && selectedDispute && (
        <DisputeResolveModal
          isOpen={showResolveModal}
          onClose={() => {
            setShowResolveModal(false);
            setSelectedDispute(null);
          }}
          dispute={selectedDispute}
          onSuccess={() => {
            fetchData();
            // Toast is already shown in DisputeResolveModal
          }}
        />
      )}
    </div>
  );
}

export default BuyerDisputes;
