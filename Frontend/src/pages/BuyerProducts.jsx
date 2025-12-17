import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import "react-toastify/dist/ReactToastify.css";
import { useProductPreview } from "../hooks/useProductPreview.jsx";

const BuyerProducts = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [wishlistItems, setWishlistItems] = useState([]);

  const API_URL = "https://agrofarm-vd8i.onrender.com/api/products/all";
  const CART_API = "https://agrofarm-vd8i.onrender.com/api/cart/add";
  const WISHLIST_API = "https://agrofarm-vd8i.onrender.com/api/wishlist/add";

  const categories = [
    { id: "all", name: "All Products" },
    { id: "fruits", name: "Fruits" },
    { id: "vegetables", name: "Vegetables" },
    { id: "crops", name: "Crops" },
    { id: "pesticides", name: "Pesticides" },
    { id: "fertilizer", name: "Fertilizer" },
  ];

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: "easeOut" },
    },
  };

  const { openPreview, ProductPreviewModal } = useProductPreview();

  // Function to render star ratings
  const renderStarRating = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    // Full stars
    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <svg
          key={`full-${i}`}
          className="w-4 h-4 text-yellow-400 fill-current"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      );
    }

    // Half star
    if (hasHalfStar) {
      stars.push(
        <svg
          key="half"
          className="w-4 h-4 text-yellow-400 fill-current"
          viewBox="0 0 20 20"
        >
          <defs>
            <linearGradient id="half-star">
              <stop offset="50%" stopColor="currentColor" />
              <stop offset="50%" stopColor="transparent" />
            </linearGradient>
          </defs>
          <path
            fill="url(#half-star)"
            d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
          />
        </svg>
      );
    }

    // Empty stars
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <svg
          key={`empty-${i}`}
          className="w-4 h-4 text-gray-300 fill-current"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      );
    }

    return stars;
  };

  // Function to format rating display
  const formatRating = (rating) => {
    if (rating === 0) return "No ratings";
    return `${rating.toFixed(1)}/5.0`;
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(API_URL, {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch products");
      }

      const data = await response.json();
      setProducts(data.products || []);
    } catch (err) {
      setError(err.message || "Error loading products");
    } finally {
      setLoading(false);
    }
  };

  const addToCart = async (productId, quantity = 1) => {
    try {
      const response = await fetch(CART_API, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ productId, quantity }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to add to cart");
      }

      const data = await response.json();
      toast.success(data.message || "Product added to cart successfully");
    } catch (err) {
      toast.error(err.message || "Error adding to cart");
    }
  };

  const addToWishlist = async (productId) => {
    try {
      const response = await fetch(WISHLIST_API, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ productId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to add to wishlist");
      }

      const data = await response.json();
      setWishlistItems([...wishlistItems, productId]);
      toast.success(data.message || "Product added to wishlist successfully");
    } catch (err) {
      toast.error(err.message || "Error adding to wishlist");
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const filteredProducts = products.filter((product) => {
    const name = product.name?.toLowerCase() || "";
    const description = product.description?.toLowerCase() || "";
    const category = product.category?.toLowerCase() || "";
    const matchesSearch =
      name.includes(searchTerm.toLowerCase()) ||
      description.includes(searchTerm.toLowerCase()) ||
      category.includes(searchTerm.toLowerCase());

    const matchesCategory =
      activeTab === "all" || category.includes(activeTab.toLowerCase());

    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-lg max-w-4xl mx-auto">
        <p className="font-semibold">Error</p>
        <p>{error}</p>
        <button
          onClick={fetchProducts}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <h1 className="text-3xl font-bold text-gray-800">
              Browse Products
            </h1>

            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <div className="relative flex-grow">
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
                />
                <svg
                  className="absolute right-3 top-3 h-5 w-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="mb-8 overflow-x-auto">
            <div className="flex space-x-1 md:space-x-2 pb-2">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setActiveTab(category.id)}
                  className={`px-4 py-2 text-sm md:text-base rounded-full whitespace-nowrap transition ${
                    activeTab === category.id
                      ? "bg-green-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-8 text-center max-w-3xl mx-auto">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-16 w-16 mx-auto text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1"
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                No products found
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {products.length === 0
                  ? "There are currently no products available."
                  : "No products match your search criteria."}
              </p>
            </div>
          ) : (
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
            >
              {filteredProducts.map((product) => (
                <motion.div
                  key={product._id}
                  className="bg-white rounded-xl shadow-md overflow-hidden flex flex-col"
                  variants={cardVariants}
                  whileHover={{
                    y: -8,
                    scale: 1.01,
                    boxShadow: "0 20px 35px rgba(34,197,94,0.15)",
                  }}
                >
                  <div className="relative h-48 bg-gray-100 overflow-hidden">
                    {product.images?.[0] ? (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-full h-full cursor-pointer object-cover hover:scale-105 transition-transform duration-300"
                        onClick={() => navigate(`/product/${product._id}`)}
                      />
                    ) : (
                      <div
                        className="absolute inset-0 flex cursor-pointer items-center justify-center text-gray-400"
                        onClick={() => navigate(`/product/${product._id}`)}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-12 w-12"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="1"
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                    )}
                    {!product.isAvailable && (
                      <div className="absolute top-0 right-0 bg-red-500 text-white px-2 py-1 text-xs font-bold">
                        Out of Stock
                      </div>
                    )}
                    <button
                      onClick={() => addToWishlist(product._id)}
                      className="absolute top-0 left-0 p-2 transition"
                      aria-label="Add to wishlist"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6"
                        fill={
                          wishlistItems.includes(product._id) ? "red" : "none"
                        }
                        viewBox="0 0 24 24"
                        stroke={
                          wishlistItems.includes(product._id)
                            ? "red"
                            : "currentColor"
                        }
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                        />
                      </svg>
                    </button>
                  </div>
                  <div className="p-5 flex-grow flex flex-col">
                    <div className="flex justify-between items-start mb-2">
                      <h3
                        className="text-xl font-semibold text-gray-800 cursor-pointer hover:text-green-600 transition"
                        onClick={() => navigate(`/product/${product._id}`)}
                      >
                        {product.name}
                      </h3>
                      <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded-full">
                        {product.quantity} {product.unit}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mb-2">
                      <span className="text-lg font-bold text-green-700">
                        Rs. {product.price.toLocaleString()}
                      </span>
                      <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full capitalize">
                        {product.category}
                      </span>
                    </div>

                    <p className="text-gray-600 text-sm mb-4 line-clamp-2 flex-grow">
                      {product.description}
                    </p>

                    {/* Rating Section */}
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex items-center space-x-1">
                        {renderStarRating(product.averageRating || 0)}
                      </div>
                      <span className="text-sm text-gray-500 ml-2">
                        {formatRating(product.averageRating || 0)}
                      </span>
                    </div>

                    {/* Seller Info */}
                    <div className="text-xs text-gray-500 mb-4">
                      Sold by:{" "}
                      {product.upLoadedBy?.uploaderName || "Unknown Seller"}
                    </div>

                    <div className="mt-auto flex gap-2 justify-center items-center">
                      <button
                        onClick={() => navigate(`/product/${product._id}`)}
                        className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition flex-1"
                      >
                        View Details
                      </button>
                      <button
                        disabled={!product.isAvailable}
                        onClick={() => addToCart(product._id)}
                        className={`px-4 py-2 rounded-lg ${
                          product.isAvailable
                            ? "bg-green-600 hover:bg-green-700 text-white"
                            : "bg-gray-300 text-gray-500 cursor-not-allowed"
                        } transition flex-1`}
                      >
                        {product.isAvailable ? "Add to Cart" : "Unavailable"}
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </div>
      <ProductPreviewModal />
    </>
  );
};

export default BuyerProducts;
