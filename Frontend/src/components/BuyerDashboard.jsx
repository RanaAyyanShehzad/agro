import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

function BuyerDashboard() {
  const [ordersCount, setOrdersCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [cartItemsCount, setCartItemsCount] = useState(0);
  const [recentOrders, setRecentOrders] = useState([]);
  const [recommendedProducts, setRecommendedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch buyer's orders
        const ordersResponse = await axios.get(
          "https://agrofarm-vd8i.onrender.com/api/v1/order/my-orders",
          { withCredentials: true }
        );
        setOrdersCount(ordersResponse.data.orders?.length || 0);
        setRecentOrders(ordersResponse.data.orders?.slice(0, 3) || []);

        // Fetch wishlist count
        const wishlistResponse = await axios.get(
          "https://agrofarm-vd8i.onrender.com/api/v1/wishlist",
          { withCredentials: true }
        );
        setWishlistCount(wishlistResponse.data.wishlist?.items?.length || 0);

        // Fetch cart items count
        const cartResponse = await axios.get(
          "https://agrofarm-vd8i.onrender.com/api/v1/cart",
          { withCredentials: true }
        );
        setCartItemsCount(cartResponse.data.cart?.items?.length || 0);

        // Fetch recommended products
        const productsResponse = await axios.get(
          "https://agrofarm-vd8i.onrender.com/api/products"
        );
        setRecommendedProducts(
          productsResponse.data.products?.slice(0, 4) || []
        );

        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
        console.error("Error fetching dashboard data:", err);
      }
    };

    fetchData();
  }, []);

  function DashboardCard({
    title,
    value,
    subtitle,
    icon,
    bgColor,
    textColor,
    link,
  }) {
    return (
      <Link to={link || "#"}>
        <div
          className={`${bgColor} ${textColor} rounded-lg shadow-xl transform transition duration-300 ease-in-out hover:shadow-2xl hover:scale-105 p-6 cursor-pointer`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium opacity-80">{title}</p>
              <p className="text-2xl font-bold mt-1">
                {loading ? "Loading..." : value}
              </p>
              {subtitle && (
                <p className="text-xs mt-1 opacity-70">{subtitle}</p>
              )}
            </div>
            <div className="ml-4">{icon}</div>
          </div>
        </div>
      </Link>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-500">Error loading dashboard: {error}</div>
    );
  }

  return (
    <div className="m-0 p-0">
      <h1 className="text-2xl font-semibold text-green-700 mb-6">
        Buyer Dashboard
      </h1>

      {/* Dashboard Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {/* My Orders */}
        <DashboardCard
          title="My Orders"
          value={ordersCount}
          icon={
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          }
          bgColor="bg-green-50"
          textColor="text-green-700"
          link="/orders"
        />

        {/* My Wishlist */}
        <DashboardCard
          title="Wishlist"
          value={wishlistCount}
          icon={
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          }
          bgColor="bg-red-50"
          textColor="text-red-700"
          link="/wishlist"
        />

        {/* My Cart */}
        <DashboardCard
          title="Cart Items"
          value={cartItemsCount}
          subtitle={
            cartItemsCount > 0 ? "Ready to checkout" : "Your cart is empty"
          }
          icon={
            <svg
              className="w-8 h-8 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          }
          bgColor="bg-blue-50"
          textColor="text-blue-700"
          link="/cart"
        />

        {/* Quick Actions */}
        <DashboardCard
          title="Quick Actions"
          value="Browse"
          subtitle="Shop fresh products"
          icon={
            <svg
              className="w-8 h-8 text-purple-600"
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
          }
          bgColor="bg-purple-50"
          textColor="text-purple-700"
          link="/products"
        />
      </div>

      {/* Main Content Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800">
              Recent Orders
            </h2>
            <Link
              to="/orders"
              className="text-green-600 hover:text-green-800 text-sm font-semibold"
            >
              View All
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs font-semibold tracking-wide text-gray-500 uppercase border-b-2 border-b-gray-300">
                  <th className="px-4 py-3">Order ID</th>
                  <th className="px-4 py-3">Items</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="px-4 py-3 text-center">
                      Loading orders...
                    </td>
                  </tr>
                ) : recentOrders.length > 0 ? (
                  recentOrders.map((order) => (
                    <tr
                      key={order._id}
                      className="text-gray-700 border-b-2 border-b-gray-300"
                    >
                      <td className="px-4 py-3">#{order._id.slice(-6)}</td>
                      <td className="px-4 py-3">
                        {order.products.length} item
                        {order.products.length !== 1 ? "s" : ""}
                      </td>
                      <td className="px-4 py-3">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 text-xs font-semibold leading-tight rounded-full ${
                            order.status === "delivered"
                              ? "text-green-700 bg-green-100"
                              : order.status === "shipped"
                              ? "text-blue-700 bg-blue-100"
                              : "text-yellow-700 bg-yellow-100"
                          }`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold">
                        ₨ {order.totalPrice.toLocaleString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="px-4 py-3 text-center">
                      No recent orders found.{" "}
                      {/* <Link to="/products" className="text-green-600">
                        Start shopping
                      </Link> */}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recommended Products */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800">
              Recommended Products
            </h2>
            <Link
              to="/products"
              className="text-sm text-green-600 hover:text-green-800"
            >
              View All
            </Link>
          </div>
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-4">Loading products...</div>
            ) : recommendedProducts.length > 0 ? (
              recommendedProducts.map((product) => (
                <Link
                  to={`/product/${product._id}`}
                  key={product._id}
                  className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <div className="flex-shrink-0">
                    <img
                      src={
                        product.images[0]?.url ||
                        "https://via.placeholder.com/50"
                      }
                      alt={product.name}
                      className="w-12 h-12 object-cover rounded"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {product.name}
                    </p>
                    <p className="text-sm text-gray-500">{product.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-green-600">
                      ₨ {product.price.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500">
                      {product.stock > 0 ? "In stock" : "Out of stock"}
                    </p>
                  </div>
                </Link>
              ))
            ) : (
              <div className="text-center py-4 text-gray-500">
                No recommended products found
              </div>
            )}
          </div>

          {/* Special Offers */}
          <div className="mt-6">
            <h3 className="text-md font-semibold text-gray-800 mb-3">
              Special Offers
            </h3>
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-yellow-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5 5a3 3 0 015-2.236A3 3 0 0114.83 6H16a2 2 0 110 4h-5V9a1 1 0 10-2 0v1H4a2 2 0 110-4h1.17C5.06 5.687 5 5.35 5 5zm4 1V5a1 1 0 10-1 1h1zm3 0a1 1 0 10-1-1v1h1z"
                      clipRule="evenodd"
                    />
                    <path d="M9 11H3v5a2 2 0 002 2h4v-7zM11 18h4a2 2 0 002-2v-5h-6v7z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    Get 10% off on your first order! Use code{" "}
                    <span className="font-bold">WELCOME10</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BuyerDashboard;
