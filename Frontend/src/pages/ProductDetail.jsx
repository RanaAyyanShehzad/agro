import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "react-toastify";
import {
  ShoppingCart,
  Heart,
  Star,
  ChevronLeft,
  ChevronRight,
  Package,
  Truck,
  Shield,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Share2,
  ZoomIn,
} from "lucide-react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

const ProductDetail = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const [imageZoomed, setImageZoomed] = useState(false);

  const API_URL = "https://agrofarm-vd8i.onrender.com/api/products/all";
  const CART_API = "https://agrofarm-vd8i.onrender.com/api/cart/add";
  const WISHLIST_API = "https://agrofarm-vd8i.onrender.com/api/wishlist/add";
  const WISHLIST_CHECK_API =
    "https://agrofarm-vd8i.onrender.com/api/wishlist/my-wishlist";

  useEffect(() => {
    fetchProduct();
    checkWishlist();
  }, [productId]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const response = await fetch(API_URL, {
        method: "GET",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) throw new Error("Failed to fetch products");

      const data = await response.json();
      const foundProduct = data.products?.find((p) => p._id === productId);

      if (!foundProduct) {
        setError("Product not found");
        return;
      }

      setProduct(foundProduct);
      fetchReviews(foundProduct._id);
    } catch (err) {
      setError(err.message || "Error loading product");
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async (prodId) => {
    try {
      const response = await fetch(
        `https://agrofarm-vd8i.onrender.com/api/review/get-review/${prodId}`,
        {
          method: "GET",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setReviews(data.reviews || []);
        setAverageRating(Number(data.averageRating) || 0);
      }
    } catch (err) {
      console.error("Error fetching reviews:", err);
    }
  };

  const checkWishlist = async () => {
    try {
      const response = await fetch(WISHLIST_CHECK_API, {
        method: "GET",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        const data = await response.json();
        const wishlistProducts = data.wishlist?.products || [];
        setIsInWishlist(wishlistProducts.some((p) => p._id === productId));
      }
    } catch (err) {
      console.error("Error checking wishlist:", err);
    }
  };

  const addToCart = async () => {
    if (!product || !product.isAvailable) {
      toast.error("Product is not available");
      return;
    }

    if (quantity > product.quantity) {
      toast.error(`Only ${product.quantity} items available`);
      return;
    }

    setAddingToCart(true);
    try {
      const response = await fetch(CART_API, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product._id, quantity }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to add to cart");
      }

      const data = await response.json();
      toast.success(data.message || "Product added to cart successfully!");
    } catch (err) {
      toast.error(err.message || "Error adding to cart");
    } finally {
      setAddingToCart(false);
    }
  };

  const toggleWishlist = async () => {
    try {
      const response = await fetch(WISHLIST_API, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product._id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update wishlist");
      }

      setIsInWishlist(!isInWishlist);
      toast.success(
        isInWishlist
          ? "Removed from wishlist"
          : "Added to wishlist successfully"
      );
    } catch (err) {
      toast.error(err.message || "Error updating wishlist");
    }
  };

  const renderStars = (rating) => {
    const stars = [];
    const numericRating = Number(rating) || 0;
    const fullStars = Math.floor(numericRating);
    const hasHalfStar = numericRating % 1 >= 0.5;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Star
          key={`full-${i}`}
          className="w-5 h-5 text-yellow-400 fill-current"
        />
      );
    }

    if (hasHalfStar) {
      stars.push(
        <Star
          key="half"
          className="w-5 h-5 text-yellow-400 fill-current opacity-50"
        />
      );
    }

    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Star
          key={`empty-${i}`}
          className="w-5 h-5 text-gray-300 fill-current"
        />
      );
    }

    return stars;
  };

  const images = product?.images || (product?.image ? [product.image] : []);
  const maxQuantity = product?.quantity || 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-green-500"></div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            {error || "Product not found"}
          </h2>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 py-4 sm:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <motion.button
          onClick={() => {
            if (isAdmin) {
              navigate("/admin/products");
            } else {
              navigate(-1);
            }
          }}
          whileHover={{ x: -5 }}
          className="mb-4 sm:mb-6 flex items-center text-gray-600 hover:text-gray-900 transition-colors group"
        >
          <ArrowLeft className="w-5 h-5 mr-1 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm sm:text-base">
            {isAdmin ? "Back to Admin Products" : "Back to Products"}
          </span>
        </motion.button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 p-4 sm:p-6 lg:p-12">
            {/* Image Gallery */}
            <div className="space-y-4">
              {/* Main Image */}
              <div className="relative aspect-square bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl sm:rounded-2xl overflow-hidden group shadow-lg">
                {images[selectedImageIndex] ? (
                  <>
                    <img
                      src={images[selectedImageIndex]}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <Package className="w-24 h-24 sm:w-32 sm:h-32" />
                  </div>
                )}
                {!product.isAvailable && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-4 right-4 bg-red-500 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold shadow-lg"
                  >
                    Out of Stock
                  </motion.div>
                )}
                {product.quantity > 0 && product.quantity < 10 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-4 left-4 bg-orange-500 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold shadow-lg"
                  >
                    Only {product.quantity} left!
                  </motion.div>
                )}
              </div>

              {/* Thumbnail Images */}
              {images.length > 1 && (
                <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2 scrollbar-hide">
                  {images.map((img, index) => (
                    <motion.button
                      key={index}
                      onClick={() => setSelectedImageIndex(index)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={`flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-lg sm:rounded-xl overflow-hidden border-2 transition-all shadow-md ${
                        selectedImageIndex === index
                          ? "border-green-500 ring-2 ring-green-300 ring-offset-2"
                          : "border-gray-200 hover:border-green-300"
                      }`}
                    >
                      <img
                        src={img}
                        alt={`${product.name} ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </motion.button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="space-y-6">
              {/* Title and Rating */}
              <div>
                <motion.h1
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-3 leading-tight"
                >
                  {product.name}
                </motion.h1>
                <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    {renderStars(averageRating)}
                    <span className="text-base sm:text-lg font-semibold text-gray-700">
                      {typeof averageRating === 'number' ? averageRating.toFixed(1) : '0.0'}
                    </span>
                    <span className="text-sm sm:text-base text-gray-500">
                      ({reviews.length}{" "}
                      {reviews.length === 1 ? "review" : "reviews"})
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <motion.span
                    whileHover={{ scale: 1.05 }}
                    className="px-3 py-1.5 bg-gradient-to-r from-green-100 to-green-50 text-green-800 rounded-full text-xs sm:text-sm font-medium capitalize shadow-sm"
                  >
                    {product.category}
                  </motion.span>
                  {product.isActive && (
                    <motion.span
                      whileHover={{ scale: 1.05 }}
                      className="px-3 py-1.5 bg-gradient-to-r from-blue-100 to-blue-50 text-blue-800 rounded-full text-xs sm:text-sm font-medium shadow-sm"
                    >
                      Active
                    </motion.span>
                  )}
                </div>
              </div>

              {/* Price */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="border-t border-b border-gray-200 py-4 sm:py-6 bg-gradient-to-r from-green-50 to-transparent -mx-4 sm:-mx-6 px-4 sm:px-6"
              >
                <div className="flex flex-wrap items-baseline gap-2 sm:gap-3">
                  <span className="text-4xl sm:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-green-600 to-green-500 bg-clip-text text-transparent">
                    ₨ {Number(product.price).toLocaleString()}
                  </span>
                  {product.unit && (
                    <span className="text-lg sm:text-xl text-gray-500">
                      / {product.unit}
                    </span>
                  )}
                </div>
                <p className="text-sm sm:text-base text-gray-600 mt-2 font-medium">
                  {product.quantity > 0 ? (
                    <span className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      {product.quantity} {product.unit || "units"} available
                    </span>
                  ) : (
                    <span className="flex items-center gap-2 text-red-600">
                      <XCircle className="w-4 h-4" />
                      Out of stock
                    </span>
                  )}
                </p>
              </motion.div>

              {/* Description */}
              {product.description && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Description
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {product.description}
                  </p>
                </div>
              )}

              {/* Seller Info */}
              {product.upLoadedBy && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 sm:p-6 border border-blue-200"
                >
                  <p className="text-sm text-blue-600 font-medium mb-2">
                    Sold by
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                      {product.upLoadedBy.uploaderName?.charAt(0) || "U"}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-lg">
                        {product.upLoadedBy.uploaderName || "Unknown Seller"}
                      </p>
                      {product.upLoadedBy.role && (
                        <p className="text-sm text-blue-600 capitalize font-medium">
                          {product.upLoadedBy.role}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Quantity Selector - Only show for non-admin users */}
              {!isAdmin && product.isAvailable && (
                <div className="bg-gradient-to-br from-gray-50 to-white p-4 sm:p-5 rounded-xl border-2 border-gray-200">
                  <label className="block text-sm font-bold text-gray-700 mb-3">
                    Quantity:
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="1"
                      max={maxQuantity}
                      value={quantity}
                      onChange={(e) => {
                        const newQuantity = parseInt(e.target.value) || 1;
                        const finalQuantity = Math.min(
                          Math.max(1, newQuantity),
                          maxQuantity
                        );
                        setQuantity(finalQuantity);
                      }}
                      onBlur={(e) => {
                        const newQuantity = parseInt(e.target.value) || 1;
                        const finalQuantity = Math.min(
                          Math.max(1, newQuantity),
                          maxQuantity
                        );
                        setQuantity(finalQuantity);
                      }}
                      className="w-24 px-4 py-3 border-2 border-gray-300 rounded-lg text-center font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                    {maxQuantity > 0 && (
                      <span className="text-sm text-gray-600 font-medium">
                        Max: {maxQuantity} {product.unit || "units"}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons - Hide for admin */}
              {!isAdmin && (
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4">
                  <motion.button
                    onClick={addToCart}
                    disabled={!product.isAvailable || addingToCart}
                    className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 sm:py-5 rounded-xl sm:rounded-2xl font-bold text-white text-base sm:text-lg shadow-lg transition-all ${
                      product.isAvailable && !addingToCart
                        ? "bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 hover:shadow-xl"
                        : "bg-gray-400 cursor-not-allowed"
                    }`}
                    whileHover={
                      product.isAvailable && !addingToCart
                        ? { scale: 1.02, y: -2 }
                        : {}
                    }
                    whileTap={
                      product.isAvailable && !addingToCart
                        ? { scale: 0.98 }
                        : {}
                    }
                  >
                    <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6" />
                    {addingToCart ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Adding...
                      </span>
                    ) : (
                      "Add to Cart"
                    )}
                  </motion.button>

                  <motion.button
                    onClick={toggleWishlist}
                    className={`p-4 sm:p-5 rounded-xl sm:rounded-2xl border-2 transition-all shadow-md ${
                      isInWishlist
                        ? "border-red-500 bg-red-50 text-red-600 shadow-red-200"
                        : "border-gray-300 hover:border-red-500 text-gray-600 hover:bg-red-50"
                    }`}
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Heart
                      className={`w-5 h-5 sm:w-6 sm:h-6 transition-transform ${
                        isInWishlist ? "fill-current scale-110" : ""
                      }`}
                    />
                  </motion.button>
                </div>
              )}

              {/* Admin View - Show product management info */}
              {isAdmin && (
                <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4 sm:p-6 mt-4">
                  <h3 className="text-lg font-semibold text-purple-900 mb-3 flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Admin View
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-purple-600 font-medium">
                        Status:
                      </span>
                      <span
                        className={`ml-2 px-2 py-1 rounded-full text-xs font-semibold ${
                          product.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {product.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div>
                      <span className="text-purple-600 font-medium">
                        Stock:
                      </span>
                      <span className="ml-2 font-semibold text-gray-900">
                        {product.quantity} {product.unit || "units"}
                      </span>
                    </div>
                    <div>
                      <span className="text-purple-600 font-medium">
                        Uploaded By:
                      </span>
                      <span className="ml-2 text-gray-900">
                        {product.upLoadedBy?.uploaderName || "Unknown"}
                      </span>
                    </div>
                    <div>
                      <span className="text-purple-600 font-medium">Role:</span>
                      <span className="ml-2 text-gray-900 capitalize">
                        {product.upLoadedBy?.role || "N/A"}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Features */}
              {/* <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-gray-200">
                <div className="flex items-center gap-3">
                  <Truck className="w-6 h-6 text-green-600" />
                  <div>
                    <p className="font-semibold text-sm">Free Delivery</p>
                    <p className="text-xs text-gray-500">
                      On orders over ₨5000
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Shield className="w-6 h-6 text-green-600" />
                  <div>
                    <p className="font-semibold text-sm">Secure Payment</p>
                    <p className="text-xs text-gray-500">100% secure</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <div>
                    <p className="font-semibold text-sm">Quality Assured</p>
                    <p className="text-xs text-gray-500">Fresh products</p>
                  </div>
                </div>
              </div> */}
            </div>
          </div>

          {/* Reviews Section */}
          {reviews.length > 0 && (
            <div className="border-t border-gray-200 p-6 lg:p-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Customer Reviews
              </h2>
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div
                    key={review._id}
                    className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-semibold">
                          {review.user?.name?.charAt(0) || "A"}
                        </div>
                        <span className="font-semibold text-gray-900">
                          {review.user?.name || "Anonymous"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {renderStars(review.rating)}
                      </div>
                    </div>
                    {review.comment && (
                      <p className="text-gray-600 mt-2">{review.comment}</p>
                    )}
                    {review.createdAt && (
                      <p className="text-xs text-gray-400 mt-2">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default ProductDetail;
