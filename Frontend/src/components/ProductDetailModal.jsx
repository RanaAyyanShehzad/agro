import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";

const initialSentiment = {
  positive: 0,
  neutral: 0,
  negative: 0,
};

const sentimentLabels = {
  positive: "Positive",
  neutral: "Neutral",
  negative: "Negative",
};

const ratingLabels = ["Terrible", "Poor", "Average", "Good", "Excellent"];

const renderStars = (rating = 0, size = "text-yellow-400") => {
  const rounded = Math.round(rating * 2) / 2;
  return Array.from({ length: 5 }).map((_, index) => {
    const value = index + 1;
    let icon = "☆";
    if (rounded >= value) icon = "★";
    else if (rounded + 0.5 === value) icon = "⯨";
    return (
      <span
        key={value}
        className={`${size} ${
          icon === "☆" ? "text-gray-300" : "text-yellow-400"
        }`}
      >
        {icon}
      </span>
    );
  });
};

function ProductDetailModal({ product, isOpen, onClose }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [sentimentStats, setSentimentStats] = useState(initialSentiment);

  const productId = product?._id || product?.productId;

  useEffect(() => {
    if (!isOpen || !productId) return;

    const controller = new AbortController();
    const fetchReviews = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `https://agrofarm-vd8i.onrender.com/api/review/get-review/${productId}`,
          {
            method: "GET",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
          }
        );
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(
            payload.message || "Unable to load reviews right now."
          );
        }
        const data = await response.json();
        setReviews(data.reviews || []);
        setAverageRating(data.averageRating || 0);
        setSentimentStats(data.sentimentStats || initialSentiment);
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err.message || "Failed to fetch reviews.");
        setReviews([]);
        setAverageRating(0);
        setSentimentStats(initialSentiment);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchReviews();

    return () => controller.abort();
  }, [isOpen, productId]);

  const normalizedRating =
    typeof averageRating === "number"
      ? averageRating
      : Number.parseFloat(averageRating) || 0;

  const displayImage = useMemo(() => {
    if (!product) return null;
    if (product.images?.length) return product.images[0];
    if (product.image) return product.image;
    if (product.img) return product.img;
    return null;
  }, [product]);

  const close = () => {
    if (loading) return;
    onClose?.();
  };

  return (
    <AnimatePresence>
      {isOpen && product ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md px-4 py-6"
          onClick={close}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-3xl bg-gradient-to-br from-white via-green-50/40 to-white shadow-[0_30px_80px_-40px_rgba(34,197,94,0.8)] border border-white/60"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-wrap items-center justify-between border-b border-white/60 bg-white/60 px-6 py-4 backdrop-blur">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-green-500">
                  Product preview
                </p>
                <h2 className="text-3xl font-semibold text-gray-900 mt-1">
                  {product.name || "Unnamed product"}
                </h2>
              </div>
              <button
                onClick={close}
                className="rounded-full bg-gray-100 p-2 text-gray-600 hover:bg-gray-200"
                aria-label="Close product details"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>

            <div className="grid gap-6 px-6 py-6 md:grid-cols-2">
              <div className="space-y-4">
                <motion.div
                  className="overflow-hidden rounded-2xl bg-gray-50 shadow-inner"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  {displayImage ? (
                    <img
                      src={displayImage}
                      alt={product.name}
                      className="h-64 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-64 items-center justify-center text-gray-400">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-16 w-16"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1"
                          d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"
                        />
                      </svg>
                    </div>
                  )}
                </motion.div>

                <motion.div
                  className="rounded-2xl bg-white p-4 shadow-lg border border-green-50"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                >
                  <h3 className="text-lg font-semibold text-gray-800">
                    Details
                  </h3>
                  <dl className="mt-3 grid grid-cols-2 gap-4 text-sm text-gray-600">
                    <div>
                      <dt className="font-medium text-gray-500">Category</dt>
                      <dd className="capitalize">{product.category || "—"}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-gray-500">Price</dt>
                      <dd className="font-semibold text-green-700">
                        {product.price
                          ? `₨ ${Number(product.price).toLocaleString()} ${
                              product.unit ? ` / ${product.unit}` : ""
                            }`
                          : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-medium text-gray-500">Quantity</dt>
                      <dd>
                        {product.quantity
                          ? `${product.quantity} ${product.unit || ""}`
                          : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-medium text-gray-500">
                        Availability
                      </dt>
                      <dd className="capitalize">
                        {product.isAvailable === false
                          ? "Unavailable"
                          : "In stock"}
                      </dd>
                    </div>
                    {product.upLoadedBy?.uploaderName && (
                      <div className="col-span-2">
                        <dt className="font-medium text-gray-500">Seller</dt>
                        <dd>{product.upLoadedBy.uploaderName}</dd>
                      </div>
                    )}
                  </dl>
                  {product.description && (
                    <p className="mt-4 text-sm text-gray-600">
                      {product.description}
                    </p>
                  )}
                </motion.div>
              </div>

              <div className="space-y-4">
                <motion.div
                  className="rounded-2xl border border-gray-100 bg-white/80 p-4 shadow-lg"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="flex items-end gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Average rating</p>
                      <p className="text-4xl font-bold text-gray-900">
                        {normalizedRating.toFixed(1)}
                      </p>
                      <p className="text-xs text-gray-400">
                        {ratingLabels[Math.round(normalizedRating) - 1] || "—"}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1 text-lg">
                        {renderStars(normalizedRating)}
                      </div>
                      <p className="text-xs text-gray-500">
                        {reviews.length} review{reviews.length === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    {Object.entries(sentimentLabels).map(([key, label]) => (
                      <div key={key}>
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>{label}</span>
                          <span>{sentimentStats[key] || 0}</span>
                        </div>
                        <div className="mt-1 h-2 rounded-full bg-gray-200">
                          <div
                            className={`h-full rounded-full ${
                              key === "positive"
                                ? "bg-green-500"
                                : key === "neutral"
                                ? "bg-yellow-400"
                                : "bg-red-400"
                            }`}
                            style={{
                              width: `${
                                reviews.length
                                  ? (sentimentStats[key] / reviews.length) * 100
                                  : 0
                              }%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>

                <motion.div
                  className="rounded-2xl border border-gray-100 bg-white/80 p-4 shadow-lg"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Reviews
                    </h3>
                    {loading && (
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Loading…
                      </span>
                    )}
                  </div>

                  {error && (
                    <p className="mt-2 text-sm text-red-500">{error}</p>
                  )}

                  {!loading && reviews.length === 0 && !error && (
                    <p className="mt-2 text-sm text-gray-500">
                      No reviews yet. Be the first to review this product.
                    </p>
                  )}

                  <div className="mt-4 space-y-3 max-h-72 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-green-200">
                    {reviews.map((review) => (
                      <motion.div
                        key={review._id || review.id}
                        className="rounded-lg border border-gray-100 p-3 bg-white shadow-sm"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-gray-800">
                            {review.user?.name || "Anonymous"}
                          </p>
                          <div className="flex items-center gap-1 text-sm">
                            {renderStars(review.rating, "text-xs")}
                            <span className="text-gray-500">
                              {review.rating?.toFixed(1) || "—"}
                            </span>
                          </div>
                        </div>
                        {review.comment && (
                          <p className="mt-2 text-sm text-gray-600">
                            {review.comment}
                          </p>
                        )}
                        {review.createdAt && (
                          <p className="mt-1 text-xs text-gray-400">
                            {new Date(review.createdAt).toLocaleDateString()}
                          </p>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export default ProductDetailModal;
