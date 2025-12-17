import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { toast } from "react-toastify";
import axios from "axios";

const API_BASE = "https://agrofarm-vd8i.onrender.com/api/v1";

function DisputeResolveModal({ isOpen, onClose, dispute, onSuccess }) {
  const [action, setAction] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [disputeId, setDisputeId] = useState(null);

  // Fetch dispute ID - try to get from dispute object or order
  useEffect(() => {
    if (isOpen && dispute) {
      // If we have a real dispute ID (not a temporary one), use it
      if (dispute._id && !dispute._id.toString().includes("_dispute")) {
        setDisputeId(dispute._id);
      } else if (dispute.orderId) {
        // If we only have order ID, we need the actual dispute ID
        setDisputeId(null);
        toast.warning(
          "Please handle this dispute from the Orders page for full functionality"
        );
      }
    }
  }, [isOpen, dispute]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!action) {
      toast.error("Please select an action");
      return;
    }

    if (!disputeId) {
      toast.error("Dispute ID not found. Please try again.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await axios.put(
        `${API_BASE}/order/dispute/${disputeId}/resolve`,
        { action },
        { withCredentials: true }
      );

      if (response.data.success) {
        toast.success(response.data.message || "Dispute resolved successfully");
        onClose();
        setAction("");
        if (onSuccess) onSuccess();
      } else {
        toast.error(response.data.message || "Failed to resolve dispute");
      }
    } catch (error) {
      console.error("Error resolving dispute:", error);
      toast.error(
        error.response?.data?.message ||
          "Failed to resolve dispute. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !dispute) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-800">
              Resolve Dispute
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
              disabled={submitting}
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {dispute.sellerResponse && (
            <div className="mb-6 bg-gray-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-2">
                Seller's Proposal:
              </p>
              <p className="text-sm text-gray-600">
                {dispute.sellerResponse.proposal}
              </p>
              {dispute.sellerResponse.evidence &&
                dispute.sellerResponse.evidence.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-gray-500 mb-2">Evidence:</p>
                    <div className="grid grid-cols-3 gap-2">
                      {dispute.sellerResponse.evidence.map((img, idx) => (
                        <img
                          key={idx}
                          src={img}
                          alt={`Evidence ${idx + 1}`}
                          className="w-full h-16 object-cover rounded"
                        />
                      ))}
                    </div>
                  </div>
                )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Decision <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                <label className="flex items-center p-3 border-2 border-gray-200 rounded-lg cursor-pointer hover:bg-green-50 hover:border-green-300 transition">
                  <input
                    type="radio"
                    name="action"
                    value="accept"
                    checked={action === "accept"}
                    onChange={(e) => setAction(e.target.value)}
                    className="mr-3"
                  />
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="font-medium text-gray-900">
                        Accept Proposal
                      </p>
                      <p className="text-xs text-gray-500">
                        Dispute will be closed, payment completed
                      </p>
                    </div>
                  </div>
                </label>
                <label className="flex items-center p-3 border-2 border-gray-200 rounded-lg cursor-pointer hover:bg-orange-50 hover:border-orange-300 transition">
                  <input
                    type="radio"
                    name="action"
                    value="reject"
                    checked={action === "reject"}
                    onChange={(e) => setAction(e.target.value)}
                    className="mr-3"
                  />
                  <div className="flex items-center gap-2">
                    <XCircle className="w-5 h-5 text-orange-600" />
                    <div>
                      <p className="font-medium text-gray-900">
                        Reject Proposal
                      </p>
                      <p className="text-xs text-gray-500">
                        Dispute will be escalated to admin for review
                      </p>
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium mb-1">Note</p>
                <p>
                  {action === "accept"
                    ? "Accepting will close the dispute and complete payment."
                    : "Rejecting will escalate the dispute to admin for final decision."}
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !action}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Processing..." : "Confirm"}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default DisputeResolveModal;
