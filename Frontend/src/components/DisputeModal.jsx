import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import axios from "axios";

const API_BASE = "https://agrofarm-vd8i.onrender.com/api/v1";
const CLOUDINARY_UPLOAD_PRESET = "FarmConnect";
const CLOUDINARY_CLOUD_NAME = "dn5edjpzg";

function DisputeModal({ isOpen, onClose, order }) {
  const [disputeType, setDisputeType] = useState("product_fault");
  const [reason, setReason] = useState("");
  const [proofImages, setProofImages] = useState([]);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
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
      setProofImages([...proofImages, ...uploadedUrls]);
      toast.success(`${uploadedUrls.length} image(s) uploaded successfully`);
    } catch (error) {
      toast.error("Failed to upload images. Please try again.");
    } finally {
      setUploadingImages(false);
    }
  };

  const removeImage = (index) => {
    setProofImages(proofImages.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast.error("Please provide a reason for the dispute");
      return;
    }

    if (
      (disputeType === "product_fault" || disputeType === "wrong_item") &&
      proofImages.length === 0
    ) {
      toast.error(
        `Please provide proof images for ${
          disputeType === "product_fault" ? "product fault" : "wrong item"
        } disputes`
      );
      return;
    }

    setSubmitting(true);
    try {
      const disputeData = {
        disputeType,
        reason,
        proofOfFault: {
          images: proofImages,
          description: description || undefined,
        },
      };

      const response = await axios.post(
        `${API_BASE}/order/dispute/${order._id}`,
        disputeData,
        { withCredentials: true }
      );

      if (response.data.success) {
        toast.success("Dispute created successfully");
        onClose();
        // Reset form
        setDisputeType("product_fault");
        setReason("");
        setProofImages([]);
        setDescription("");
      } else {
        toast.error(response.data.message || "Failed to create dispute");
      }
    } catch (error) {
      console.error("Error creating dispute:", error);
      toast.error(
        error.response?.data?.message ||
          "Failed to create dispute. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !order) return null;

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
            <h2 className="text-2xl font-bold text-gray-800">Create Dispute</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
              disabled={submitting}
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dispute Type <span className="text-red-500">*</span>
              </label>
              <select
                value={disputeType}
                onChange={(e) => setDisputeType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                required
              >
                <option value="non_delivery">Non-Delivery</option>
                <option value="product_fault">Product Fault</option>
                <option value="wrong_item">Wrong Item</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Describe the issue..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                rows="4"
                required
              />
            </div>

            {(disputeType === "product_fault" ||
              disputeType === "wrong_item") && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Proof Images <span className="text-red-500">*</span>
                    <span className="text-xs text-gray-500 ml-2">
                      (Required for{" "}
                      {disputeType === "product_fault"
                        ? "product fault"
                        : "wrong item"}
                      )
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
                            <label className="relative cursor-pointer bg-white rounded-md font-medium text-red-600 hover:text-red-500">
                              <span>Upload images</span>
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
                  {proofImages.length > 0 && (
                    <div className="mt-4 grid grid-cols-3 gap-4">
                      {proofImages.map((image, index) => (
                        <div key={index} className="relative">
                          <img
                            src={image}
                            alt={`Proof ${index + 1}`}
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
                    Detailed Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={
                      disputeType === "product_fault"
                        ? "Provide detailed description of the product fault..."
                        : "Describe the wrong item received and what was expected..."
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    rows="3"
                  />
                </div>
              </>
            )}

            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium mb-1">Important Information</p>
                <p>
                  Creating a dispute will pause payment processing. The seller
                  will be notified and can respond. If unresolved, the dispute
                  will be escalated to admin review.
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
                disabled={submitting || !reason.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Submitting..." : "Create Dispute"}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default DisputeModal;
