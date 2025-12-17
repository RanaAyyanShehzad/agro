import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { motion } from "framer-motion";
import {
  Package,
  Eye,
  EyeOff,
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { Link } from "react-router-dom";

const API_BASE = "https://agrofarm-vd8i.onrender.com/api/v1/admin";

function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchProducts();
  }, [statusFilter, page]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append("status", statusFilter);
      params.append("page", page);
      params.append("limit", "20");

      const response = await axios.get(`${API_BASE}/products?${params}`, {
        withCredentials: true,
      });
      setProducts(response.data.products || []);
      setTotalPages(response.data.totalPages || 1);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch products");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleVisibility = async (productId, currentStatus) => {
    try {
      const response = await axios.put(
        `${API_BASE}/products/${productId}/visibility`,
        { isActive: !currentStatus },
        { withCredentials: true }
      );
      toast.success(response.data.message || "Product visibility updated");
      fetchProducts();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to update product visibility"
      );
    }
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Product Management</h1>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="all">All Products</option>
            <option value="zero_stock">Zero Stock</option>
            <option value="inactive">Inactive</option>
          </select>
          <button
            onClick={fetchProducts}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mx-auto"></div>
          </div>
        ) : filteredProducts.length > 0 ? (
          filteredProducts.map((product) => (
            <motion.div
              key={product._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition"
            >
              <div className="relative">
                {product.images && product.images[0] ? (
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className="w-full h-48 object-cover"
                  />
                ) : (
                  <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
                    <Package className="w-16 h-16 text-gray-400" />
                  </div>
                )}
                {product.quantity === 0 && (
                  <div className="absolute top-2 right-2 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                    Out of Stock
                  </div>
                )}
                {!product.isActive && (
                  <div className="absolute top-2 left-2 bg-gray-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                    Inactive
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {product.name}
                </h3>
                <p className="text-sm text-gray-500 mb-2 capitalize">
                  {product.category}
                </p>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xl font-bold text-green-600">
                    ₨ {Number(product.price).toLocaleString()}
                  </span>
                  <span className="text-sm text-gray-500">
                    Qty: {product.quantity}
                  </span>
                </div>
                {product.upLoadedBy && (
                  <p className="text-xs text-gray-500 mb-3">
                    By: {product.upLoadedBy.uploaderName || "Unknown"}
                  </p>
                )}
                <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                  <button
                    onClick={() =>
                      handleToggleVisibility(product._id, product.isActive)
                    }
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition ${
                      product.isActive
                        ? "bg-green-100 text-green-700 hover:bg-green-200"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {product.isActive ? (
                      <>
                        <Eye className="w-4 h-4" />
                        Hide
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-4 h-4" />
                        Show
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      // Open product in new tab for admin view
                      window.open(`/product/${product._id}`, "_blank");
                    }}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    View Details
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="col-span-full p-12 text-center text-gray-500">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            No products found
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-gray-700">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

export default AdminProducts;
