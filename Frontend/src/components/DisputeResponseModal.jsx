import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import axios from "axios";

const API_BASE = "https://agrofarm-vd8i.onrender.com/api/v1";
const CLOUDINARY_UPLOAD_PRESET = "FarmConnect";
const CLOUDINARY_CLOUD_NAME = "dn5edjpzg";

function DisputeResponseModal({ isOpen, onClose, dispute, onSuccess }) {
  const [evidence, setEvidence] = useState([]);
  const [proposal, setProposal] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [disputeId, setDisputeId] = useState(null);
  const [loadingDispute, setLoadingDispute] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);

  const uploadToCloudinary = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();
      return data.secure_url;
    } catch (error) {
      console.error("Cloudinary upload error:", error);
      throw error;
    }
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploadingImages(true);
    try {
      const uploadPromises = files.map((file) => uploadToCloudinary(file));
      const uploadedUrls = await Promise.all(uploadPromises);
      setEvidence([...evidence, ...uploadedUrls]);
      toast.success(`${uploadedUrls.length} image(s) uploaded successfully`);
    } catch (error) {
      toast.error("Failed to upload images. Please try again.");
    } finally {
      setUploadingImages(false);
    }
  };

  const removeImage = (index) => {
    setEvidence(evidence.filter((_, i) => i !== index));
  };

  // Fetch dispute ID - simplified approach using disputes endpoint
  useEffect(() => {
    const fetchDisputeId = async () => {
      if (!isOpen || !dispute) return;

      // Check if we have a valid dispute ID (24-character MongoDB ObjectId)
      const isValidObjectId = (id) => {
        return (
          id &&
          typeof id === "string" &&
          id.length === 24 &&
          /^[0-9a-fA-F]{24}$/.test(id)
        );
      };

      // dispute._id is already the disputeId - use it directly if valid
      if (dispute._id && isValidObjectId(dispute._id)) {
        setDisputeId(dispute._id);
        return;
      }

      // If no valid _id, fetch disputes list and find by orderId
      if (dispute.orderId) {
        setLoadingDispute(true);
        try {
          const orderId =
            typeof dispute.orderId === "object"
              ? dispute.orderId._id
              : dispute.orderId;

          // Use seller disputes endpoint: GET /api/v1/order/disputes
          const response = await axios.get(`${API_BASE}/order/disputes`, {
            withCredentials: true,
          });

          if (response.data.success && response.data.disputes?.length > 0) {
            // Find the dispute that matches the orderId
            const foundDispute = response.data.disputes.find(
              (d) =>
                (d.orderId?._id || d.orderId) === orderId ||
                d.orderId?._id === orderId
            );

            if (foundDispute?._id && isValidObjectId(foundDispute._id)) {
              setDisputeId(foundDispute._id);
            } else {
              toast.error(
                "Dispute not found for this order. Please refresh the page."
              );
            }
          } else {
            toast.error("No disputes found. Please refresh the disputes page.");
          }
        } catch (error) {
          console.error("Error fetching disputes:", error);
          toast.error("Failed to fetch disputes. Please try again.");
        } finally {
          setLoadingDispute(false);
        }
      } else {
        toast.error("Dispute ID or Order ID is required.");
      }
    };

    fetchDisputeId();
  }, [isOpen, dispute]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!proposal.trim()) {
      toast.error("Please provide a resolution proposal");
      return;
    }
    if (proposal.length > 2000) {
      toast.error("Proposal must be 2000 characters or less");
      return;
    }
    if (evidence.length === 0) {
      toast.error("Please provide at least one piece of evidence");
      return;
    }

    if (!disputeId) {
      toast.error("Dispute ID not found. Please try again.");
      return;
    }

    setSubmitting(true);
    try {
      // Use disputeId - if it's an order ID, backend should handle finding the dispute
      const response = await axios.put(
        `${API_BASE}/order/dispute/${disputeId}/respond`,
        {
          evidence,
          proposal,
        },
        { withCredentials: true }
      );

      if (response.data.success) {
        toast.success("Dispute response submitted successfully");
        onClose();
        setEvidence([]);
        setProposal("");
        if (onSuccess) onSuccess();
      } else {
        toast.error(response.data.message || "Failed to submit response");
      }
    } catch (error) {
      console.error("Error responding to dispute:", error);
      toast.error(
        error.response?.data?.message ||
          "Failed to submit response. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !dispute) return null;

  // Show loading state while fetching dispute ID
  if (loadingDispute) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="flex items-center gap-4">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <p className="text-gray-700">Loading dispute details...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        >
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-800">
              Respond to Dispute
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
              disabled={submitting}
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">
                <strong>Dispute Type:</strong>{" "}
                {dispute.disputeType?.replace("_", " ")}
              </p>
              <p className="text-sm text-gray-600 mb-2">
                <strong>Reason:</strong> {dispute.reason}
              </p>
              {dispute.buyerProof?.description && (
                <p className="text-sm text-gray-600">
                  <strong>Buyer's Description:</strong>{" "}
                  {dispute.buyerProof.description}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Evidence <span className="text-red-500">*</span>
                <span className="text-xs text-gray-500 ml-2">
                  (Upload images or documents as proof)
                </span>
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                <div className="space-y-1 text-center">
                  {uploadingImages ? (
                    <>
                      <Loader2 className="mx-auto h-12 w-12 text-gray-400 animate-spin" />
                      <p className="text-sm text-gray-600">
                        Uploading images...
                      </p>
                    </>
                  ) : (
                    <>
                      <Upload className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="flex text-sm text-gray-600">
                        <label className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500">
                          <span>Upload evidence</span>
                          <input
                            type="file"
                            className="sr-only"
                            multiple
                            accept="image/*"
                            onChange={handleImageUpload}
                            disabled={uploadingImages}
                          />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-gray-500">
                        PNG, JPG, GIF up to 10MB
                      </p>
                    </>
                  )}
                </div>
              </div>
              {evidence.length > 0 && (
                <div className="mt-4 grid grid-cols-3 gap-4">
                  {evidence.map((image, index) => (
                    <div key={index} className="relative">
                      <img
                        src={image}
                        alt={`Evidence ${index + 1}`}
                        className="w-full h-24 object-cover rounded-md"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Resolution Proposal <span className="text-red-500">*</span>
              </label>
              <textarea
                value={proposal}
                onChange={(e) => setProposal(e.target.value)}
                placeholder="Describe your proposed resolution (e.g., replacement, refund, partial refund)..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows="4"
                maxLength={2000}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                {proposal.length}/2000 characters
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Important</p>
                <p>
                  Your response will be sent to the buyer. They can accept your
                  proposal or reject it (which will escalate to admin review).
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
                disabled={
                  submitting || !proposal.trim() || evidence.length === 0
                }
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Submitting..." : "Submit Response"}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default DisputeResponseModal;
