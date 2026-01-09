import React, { useState, useEffect } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import {
  Gavel,
  AlertCircle,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
} from "lucide-react";
import DisputeResponseModal from "../components/DisputeResponseModal";
import { toast } from "react-toastify";

const API_BASE = "https://agrofarm-vd8i.onrender.com/api/v1/order";

function FarmerDisputes() {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchDisputes();
  }, [statusFilter]);

  const fetchDisputes = async () => {
    try {
      setLoading(true);
      // Use seller disputes endpoint: GET /api/v1/order/disputes
      const params = new URLSearchParams();
      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }
      params.append("page", "1");
      params.append("limit", "50");

      const response = await axios.get(
        `${API_BASE}/disputes${
          params.toString() ? `?${params.toString()}` : ""
        }`,
        { withCredentials: true }
      );

      if (response.data.success && response.data.disputes) {
        // Apply status filter if needed (API might already filter)
        let filteredDisputes = response.data.disputes;
        if (statusFilter !== "all") {
          filteredDisputes = response.data.disputes.filter(
            (d) => d.status === statusFilter
          );
        }
        setDisputes(filteredDisputes);
      } else {
        setDisputes([]);
      }
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
            Manage and respond to disputes on your orders
          </p>
        </div>
        <button
          onClick={async () => {
            await fetchDisputes();
            toast.success("Disputes refreshed");
          }}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition shadow-md"
          title="Refresh Disputes"
        >
          <RefreshCw className="w-5 h-5" />
          Refresh
        </button>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex items-center gap-4">
          <label className="text-gray-700 font-medium">Filter by Status:</label>
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
                      <p className="text-xs text-gray-500 mb-1">Buyer</p>
                      <p className="text-sm font-medium text-gray-900">
                        {dispute.orderId?.customerId?.name || "Unknown Buyer"}
                      </p>
                      {dispute.orderId?.customerId?.email && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {dispute.orderId.customerId.email}
                        </p>
                      )}
                    </div>
                  </div>

                  {dispute.reason && (
                    <div className="mb-4">
                      <p className="text-xs text-gray-500 mb-1">Reason</p>
                      <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                        {dispute.reason}
                      </p>
                    </div>
                  )}

                  {dispute.buyerProof?.images?.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs text-gray-500 mb-2">
                        Buyer Proof Images
                      </p>
                      <div className="flex gap-2 flex-wrap">
                        {dispute.buyerProof.images
                          .slice(0, 3)
                          .map((img, idx) => (
                            <img
                              key={idx}
                              src={img}
                              alt={`Proof ${idx + 1}`}
                              className="w-20 h-20 object-cover rounded border border-gray-200"
                              onError={(e) => {
                                e.target.style.display = "none";
                              }}
                            />
                          ))}
                      </div>
                    </div>
                  )}

                  {dispute.sellerResponse?.proposal &&
                    dispute.sellerResponse?.respondedAt && (
                      <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-xs text-green-600 font-medium mb-1">
                          Your Response
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
                  {dispute.status === "open" &&
                    (!dispute.sellerResponse ||
                      !dispute.sellerResponse.proposal ||
                      !dispute.sellerResponse.respondedAt) && (
                      <button
                        onClick={() => {
                          setSelectedDispute(dispute);
                          setShowResponseModal(true);
                        }}
                        className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition flex items-center gap-2 whitespace-nowrap"
                      >
                        <Gavel className="w-4 h-4" />
                        Respond
                      </button>
                    )}
                  {dispute.status === "open" &&
                    dispute.sellerResponse?.proposal &&
                    dispute.sellerResponse?.respondedAt && (
                      <span className="px-4 py-2 bg-green-100 text-green-800 rounded-lg text-sm font-medium">
                        Response Submitted
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
                  {getStatusBadge(selectedDispute.status)}
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
                                }}
                                onClick={() => window.open(image, "_blank")}
                              />
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
                  <p className="text-sm text-gray-500 mb-2">Your Response</p>
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
                  <p className="text-sm text-gray-700 bg-green-50 p-3 rounded-lg">
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
                  <p className="text-sm text-gray-500 mb-2">Your Response</p>
                  <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg border border-gray-200">
                    You have not responded yet.
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
            </div>
          </motion.div>
        </div>
      )}

      {/* Dispute Response Modal */}
      {showResponseModal && selectedDispute && (
        <DisputeResponseModal
          isOpen={showResponseModal}
          onClose={() => {
            setShowResponseModal(false);
            setSelectedDispute(null);
          }}
          dispute={selectedDispute}
          onSuccess={() => {
            fetchDisputes();
            // Toast is already shown in DisputeResponseModal
          }}
        />
      )}
    </div>
  );
}

export default FarmerDisputes;
