import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { motion } from "framer-motion";
import {
  Gavel,
  Search,
  RefreshCw,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
} from "lucide-react";

const API_BASE = "https://agrofarm-vd8i.onrender.com/api/v1/admin";

function AdminDisputeManagement() {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [showRulingModal, setShowRulingModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [ruling, setRuling] = useState({ decision: "", notes: "" });
  const [fullDisputeDetails, setFullDisputeDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [submittingRuling, setSubmittingRuling] = useState(false);

  useEffect(() => {
    fetchDisputes();
  }, [statusFilter]);

  const fetchDisputes = async () => {
    try {
      setLoading(true);
      // Use correct admin disputes endpoint from API docs: /api/v1/admin/disputes
      const params = new URLSearchParams();
      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }
      params.append("page", "1");
      params.append("limit", "50");

      const response = await axios.get(
        `${API_BASE}/disputes?${params.toString()}`,
        { withCredentials: true }
      );

      // Handle response according to API docs structure
      if (response.data.success && response.data.disputes) {
        setDisputes(response.data.disputes);
      } else {
        // Fallback for different response structure
        setDisputes(response.data.disputes || response.data || []);
      }
    } catch (error) {
      console.error("Error fetching disputes:", error);
      if (error.response?.status === 404) {
        toast.info(
          "Admin disputes endpoint not found. This feature may not be implemented yet."
        );
      } else if (error.response?.status === 500) {
        toast.error(
          "Server error while fetching disputes. Please try again later."
        );
      } else {
        toast.error(
          error.response?.data?.message || "Failed to fetch disputes"
        );
      }
      setDisputes([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDisputeDetails = async (disputeId) => {
    try {
      setLoadingDetails(true);
      const response = await axios.get(`${API_BASE}/disputes/${disputeId}`, {
        withCredentials: true,
      });
      if (response.data.success && response.data.dispute) {
        setFullDisputeDetails(response.data.dispute);
        return response.data.dispute;
      }
      return null;
    } catch (error) {
      console.error("Error fetching dispute details:", error);
      toast.error(
        error.response?.data?.message || "Failed to fetch dispute details"
      );
      return null;
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleAdminRuling = async (e) => {
    e.preventDefault();
    if (!selectedDispute || submittingRuling) return;

    setSubmittingRuling(true);
    try {
      // Admin ruling endpoint: /api/v1/order/dispute/:disputeId/admin-ruling
      const response = await axios.put(
        `https://agrofarm-vd8i.onrender.com/api/v1/order/dispute/${selectedDispute._id}/admin-ruling`,
        ruling,
        { withCredentials: true }
      );
      toast.success(response.data.message || "Dispute resolved successfully");
      setShowRulingModal(false);
      setSelectedDispute(null);
      setRuling({ decision: "", notes: "" });
      fetchDisputes();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to resolve dispute");
    } finally {
      setSubmittingRuling(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      open: { bg: "bg-yellow-100", text: "text-yellow-800", icon: Clock },
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
        className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${config.bg} ${config.text}`}
      >
        <Icon className="w-3 h-3" />
        {status.replace("_", " ")}
      </span>
    );
  };

  const filteredDisputes = disputes.filter((dispute) => {
    const orderIdString =
      typeof dispute.orderId === "string"
        ? dispute.orderId
        : dispute.orderId?._id || "";
    const matchesSearch =
      dispute._id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      orderIdString.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Dispute Management</h1>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search disputes..."
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
            <option value="open">Open</option>
            <option value="pending_admin_review">Pending Review</option>
            <option value="closed">Closed</option>
          </select>
          <button
            onClick={fetchDisputes}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Disputes List */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mx-auto"></div>
          </div>
        ) : filteredDisputes.length > 0 ? (
          filteredDisputes.map((dispute) => (
            <motion.div
              key={dispute._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Gavel className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Dispute #{dispute._id.slice(-8)}
                      </h3>
                      <p className="text-sm text-gray-500">
                        Order:{" "}
                        {(() => {
                          if (typeof dispute.orderId === "string") {
                            return dispute.orderId.slice(-8);
                          } else if (dispute.orderId?._id) {
                            return dispute.orderId._id.slice(-8);
                          }
                          return "N/A";
                        })()}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Type</p>
                      <p className="text-sm font-medium text-gray-900 capitalize">
                        {dispute.disputeType?.replace("_", " ") || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Buyer</p>
                      <p className="text-sm font-medium text-gray-900">
                        {dispute.orderId?.customerId?.name ||
                          (typeof dispute.buyerId === "object"
                            ? dispute.buyerId?.name
                            : "Loading...")}
                      </p>
                      {dispute.orderId?.customerId?.email && (
                        <p className="text-xs text-gray-400">
                          {dispute.orderId.customerId.email}
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Seller</p>
                      <p className="text-sm font-medium text-gray-900 capitalize">
                        {dispute.sellerRole || "Unknown"}
                      </p>
                      {(() => {
                        // First try sellerId from dispute (should be populated in API response)
                        if (
                          typeof dispute.sellerId === "object" &&
                          dispute.sellerId?.name
                        ) {
                          return (
                            <>
                              <p className="text-xs text-gray-400">
                                {dispute.sellerId.name}
                              </p>
                              {dispute.sellerId.email && (
                                <p className="text-xs text-gray-400">
                                  {dispute.sellerId.email}
                                </p>
                              )}
                              {dispute.sellerId.phone && (
                                <p className="text-xs text-gray-400">
                                  {dispute.sellerId.phone}
                                </p>
                              )}
                            </>
                          );
                        }

                        // Try to get seller info from order products
                        const order = dispute.orderId;
                        if (order?.products && order.products.length > 0) {
                          const product = order.products[0];
                          if (
                            product.farmerId &&
                            typeof product.farmerId === "object"
                          ) {
                            return (
                              <>
                                <p className="text-xs text-gray-400">
                                  {product.farmerId.name || "Farmer"}
                                </p>
                                {product.farmerId.email && (
                                  <p className="text-xs text-gray-400">
                                    {product.farmerId.email}
                                  </p>
                                )}
                              </>
                            );
                          } else if (
                            product.supplierId &&
                            typeof product.supplierId === "object"
                          ) {
                            return (
                              <>
                                <p className="text-xs text-gray-400">
                                  {product.supplierId.name || "Supplier"}
                                </p>
                                {product.supplierId.email && (
                                  <p className="text-xs text-gray-400">
                                    {product.supplierId.email}
                                  </p>
                                )}
                              </>
                            );
                          }
                        }

                        // Fallback: show ID
                        return (
                          <p className="text-xs text-gray-400">
                            ID:{" "}
                            {typeof dispute.sellerId === "string"
                              ? dispute.sellerId.slice(-8)
                              : "N/A"}
                          </p>
                        );
                      })()}
                    </div>
                  </div>
                  {dispute.reason && (
                    <div className="mb-4">
                      <p className="text-xs text-gray-500 mb-1">Reason</p>
                      <p className="text-sm text-gray-700">{dispute.reason}</p>
                    </div>
                  )}
                  <div className="flex items-center gap-4">
                    {getStatusBadge(dispute.status)}
                    <span className="text-xs text-gray-500">
                      Created:{" "}
                      {new Date(dispute.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="ml-4 flex gap-2">
                  <button
                    onClick={async () => {
                      setSelectedDispute(dispute);
                      // Fetch full details with populated seller info
                      const fullDetails = await fetchDisputeDetails(
                        dispute._id
                      );
                      if (fullDetails) {
                        setSelectedDispute(fullDetails);
                      }
                      setShowDetailsModal(true);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    View Details
                  </button>
                  {dispute.status === "pending_admin_review" && (
                    <button
                      onClick={async () => {
                        setSelectedDispute(dispute);
                        // Fetch full details before making ruling
                        const fullDetails = await fetchDisputeDetails(
                          dispute._id
                        );
                        if (fullDetails) {
                          setSelectedDispute(fullDetails);
                        }
                        setShowRulingModal(true);
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
                    >
                      <Gavel className="w-4 h-4" />
                      Make Ruling
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="p-12 text-center text-gray-500 bg-white rounded-lg shadow-md">
            <Gavel className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p>No disputes found</p>
            <p className="text-sm mt-2">
              Note: Admin disputes endpoint may need to be implemented
            </p>
          </div>
        )}
      </div>

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
                Dispute Details #{selectedDispute._id.slice(-8)}
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
              {loadingDetails && (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500 mx-auto"></div>
                  <p className="text-sm text-gray-500 mt-2">
                    Loading full dispute details...
                  </p>
                </div>
              )}
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
                  {getStatusBadge(selectedDispute.status)}
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Buyer</p>
                  <p className="text-base font-medium text-gray-900">
                    {selectedDispute.orderId?.customerId?.name ||
                      (typeof selectedDispute.buyerId === "object"
                        ? selectedDispute.buyerId?.name
                        : "Unknown")}
                  </p>
                  <p className="text-sm text-gray-600">
                    {selectedDispute.orderId?.customerId?.email ||
                      (typeof selectedDispute.buyerId === "object"
                        ? selectedDispute.buyerId?.email
                        : "")}
                  </p>
                  {selectedDispute.orderId?.customerId?.phone && (
                    <p className="text-xs text-gray-400">
                      {selectedDispute.orderId.customerId.phone}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Seller</p>
                  <p className="text-base font-medium text-gray-900 capitalize">
                    {selectedDispute.sellerRole || "Unknown"}
                  </p>
                  {(() => {
                    // Use full dispute details if available (has populated sellerId)
                    const dispute = fullDisputeDetails || selectedDispute;

                    // First try sellerId from dispute (should be populated in full details)
                    if (
                      typeof dispute.sellerId === "object" &&
                      dispute.sellerId?.name
                    ) {
                      return (
                        <>
                          <p className="text-sm text-gray-600">
                            {dispute.sellerId.name}
                          </p>
                          {dispute.sellerId.email && (
                            <p className="text-xs text-gray-400">
                              {dispute.sellerId.email}
                            </p>
                          )}
                          {dispute.sellerId.phone && (
                            <p className="text-xs text-gray-400">
                              {dispute.sellerId.phone}
                            </p>
                          )}
                        </>
                      );
                    }

                    // Try to get seller info from order products
                    const order = dispute.orderId;
                    if (order?.products && order.products.length > 0) {
                      const product = order.products[0];
                      if (
                        product.farmerId &&
                        typeof product.farmerId === "object"
                      ) {
                        return (
                          <>
                            <p className="text-sm text-gray-600">
                              {product.farmerId.name || "Farmer"}
                            </p>
                            {product.farmerId.email && (
                              <p className="text-xs text-gray-400">
                                {product.farmerId.email}
                              </p>
                            )}
                          </>
                        );
                      } else if (
                        product.supplierId &&
                        typeof product.supplierId === "object"
                      ) {
                        return (
                          <>
                            <p className="text-sm text-gray-600">
                              {product.supplierId.name || "Supplier"}
                            </p>
                            {product.supplierId.email && (
                              <p className="text-xs text-gray-400">
                                {product.supplierId.email}
                              </p>
                            )}
                          </>
                        );
                      }
                    }

                    // Fallback: show ID
                    return (
                      <p className="text-xs text-gray-400">
                        ID:{" "}
                        {typeof dispute.sellerId === "string"
                          ? dispute.sellerId.slice(-8)
                          : "N/A"}
                      </p>
                    );
                  })()}
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
                  <p className="text-sm text-gray-500 mb-2">Buyer Proof</p>
                  {selectedDispute.buyerProof.images &&
                  selectedDispute.buyerProof.images.length > 0 ? (
                    <>
                      {selectedDispute.buyerProof.images.some((img) =>
                        img?.startsWith("blob:")
                      ) && (
                        <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                          ⚠️ Note: Some images are temporary blob URLs and may
                          not display after page reload.
                        </div>
                      )}
                      <div className="grid grid-cols-3 gap-4 mb-3">
                        {selectedDispute.buyerProof.images.map(
                          (image, index) => (
                            <div key={index} className="relative">
                              <img
                                src={image}
                                alt={`Proof ${index + 1}`}
                                className="w-full h-32 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-80"
                                onError={(e) => {
                                  e.target.style.display = "none";
                                  if (e.target.nextSibling) {
                                    e.target.nextSibling.style.display = "flex";
                                  }
                                }}
                                onClick={() => window.open(image, "_blank")}
                              />
                              <div className="hidden w-full h-32 items-center justify-center bg-gray-100 rounded-lg border border-gray-200">
                                <div className="text-xs text-gray-500 text-center px-2">
                                  <p>Image unavailable</p>
                                  {image?.startsWith("blob:") && (
                                    <p className="text-red-500">
                                      (Blob URL expired)
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
                      No images provided
                    </p>
                  )}
                  {selectedDispute.buyerProof.description && (
                    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                      {selectedDispute.buyerProof.description}
                    </p>
                  )}
                </div>
              )}

              {/* Seller Response */}
              {selectedDispute.sellerResponse ? (
                <div>
                  <p className="text-sm text-gray-500 mb-2">Seller Response</p>
                  {selectedDispute.sellerResponse.evidence &&
                  selectedDispute.sellerResponse.evidence.length > 0 ? (
                    <>
                      {selectedDispute.sellerResponse.evidence.some((ev) =>
                        ev?.startsWith("blob:")
                      ) && (
                        <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                          ⚠️ Note: Some images are temporary blob URLs and may
                          not display after page reload.
                        </div>
                      )}
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
                                  if (e.target.nextSibling) {
                                    e.target.nextSibling.style.display = "flex";
                                  }
                                }}
                                onClick={() => window.open(evidence, "_blank")}
                              />
                              <div className="hidden w-full h-32 items-center justify-center bg-gray-100 rounded-lg border border-gray-200">
                                <p className="text-xs text-gray-500 text-center px-2">
                                  Image unavailable
                                  {evidence?.startsWith("blob:") && (
                                    <>
                                      <br />
                                      <span className="text-red-500">
                                        (Blob URL expired)
                                      </span>
                                    </>
                                  )}
                                </p>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg mb-3">
                      No evidence images provided
                    </p>
                  )}
                  {selectedDispute.sellerResponse.proposal ? (
                    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                      <span className="font-medium">Proposal: </span>
                      {selectedDispute.sellerResponse.proposal}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-500 bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                      Seller has not provided a proposal yet.
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <p className="text-sm text-gray-500 mb-2">Seller Response</p>
                  <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg border border-gray-200">
                    Seller has not responded yet.
                  </p>
                </div>
              )}

              {/* Order Info */}
              {selectedDispute.orderId && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">
                    Order Information
                  </p>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-700">
                      Order ID:{" "}
                      {selectedDispute.orderId._id || selectedDispute.orderId}
                    </p>
                    <p className="text-sm text-gray-700">
                      Total Price: ₨
                      {selectedDispute.orderId.totalPrice?.toLocaleString() ||
                        "N/A"}
                    </p>
                    <p className="text-sm text-gray-700">
                      Status:{" "}
                      {selectedDispute.orderId.status ||
                        selectedDispute.orderId.orderStatus ||
                        "N/A"}
                    </p>
                  </div>
                </div>
              )}

              {/* Admin Ruling (if exists) */}
              {selectedDispute.adminRuling && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">
                    Previous Admin Ruling
                  </p>
                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                    <p className="text-sm font-medium text-purple-900 mb-1">
                      Decision:{" "}
                      {selectedDispute.adminRuling.decision
                        ?.replace("_", " ")
                        .toUpperCase() || "N/A"}
                    </p>
                    {selectedDispute.adminRuling.notes && (
                      <p className="text-sm text-purple-800">
                        {selectedDispute.adminRuling.notes}
                      </p>
                    )}
                    {selectedDispute.adminRuling.ruledAt && (
                      <p className="text-xs text-purple-600 mt-2">
                        Ruled on:{" "}
                        {new Date(
                          selectedDispute.adminRuling.ruledAt
                        ).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                {selectedDispute.status === "pending_admin_review" && (
                  <button
                    onClick={() => {
                      setShowDetailsModal(false);
                      setShowRulingModal(true);
                    }}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
                  >
                    <Gavel className="w-4 h-4" />
                    Make Admin Ruling
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedDispute(null);
                    setFullDisputeDetails(null);
                  }}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Admin Ruling Modal */}
      {showRulingModal && selectedDispute && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6"
          >
            <h2 className="text-2xl font-bold mb-4">Admin Ruling</h2>
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Important:</strong> Your decision is final and binding.
                If buyer wins, payment will be refunded. If seller wins, payment
                will be completed.
              </p>
            </div>
            <form onSubmit={handleAdminRuling} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Decision <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={ruling.decision}
                  onChange={(e) =>
                    setRuling({ ...ruling, decision: e.target.value })
                  }
                  disabled={submittingRuling}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">Select decision</option>
                  <option value="buyer_win">Buyer Wins (Refund)</option>
                  <option value="seller_win">
                    Seller Wins (Complete Payment)
                  </option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ruling Notes
                </label>
                <textarea
                  value={ruling.notes}
                  onChange={(e) =>
                    setRuling({ ...ruling, notes: e.target.value })
                  }
                  rows="5"
                  disabled={submittingRuling}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="Enter detailed explanation of your ruling decision..."
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    if (!submittingRuling) {
                      setShowRulingModal(false);
                      setSelectedDispute(null);
                      setRuling({ decision: "", notes: "" });
                    }
                  }}
                  disabled={submittingRuling}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!ruling.decision || submittingRuling}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submittingRuling ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                      Submitting...
                    </>
                  ) : (
                    "Submit Ruling"
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}

export default AdminDisputeManagement;
