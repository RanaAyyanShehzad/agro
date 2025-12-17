import { useState, useEffect } from "react";
import React from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { useWeatherDisplay } from "../hooks/useWeatherDisplay";
import LanguageToggle from "./LanguageToggle";
import { useTranslation } from "../hooks/useTranslation";
import NotificationBell from "./NotificationBell";
import axios from "axios";

function BuyerHeader({ sidebarOpen, setSidebarOpen }) {
  // Get the name from Redux store
  const { name, img } = useSelector((state) => state.user);
  const weather = useWeatherDisplay();
  const weatherLabel =
    weather.status === "loading" ? "..." : weather.temperature;
  const { t } = useTranslation();
  const [cartItemsCount, setCartItemsCount] = useState(0);

  useEffect(() => {
    const fetchCartCount = async () => {
      try {
        const response = await axios.get(
          "https://agrofarm-vd8i.onrender.com/api/v1/cart",
          { withCredentials: true }
        );
        if (response.data.success && response.data.cart) {
          setCartItemsCount(response.data.cart.items?.length || 0);
        }
      } catch (error) {
        // Silently fail if cart endpoint is not available
        console.warn("Could not fetch cart count:", error);
      }
    };
    fetchCartCount();
  }, []);

  return (
    <header className="bg-gradient-to-r from-green-700 via-green-600 to-green-700 shadow-xl sticky top-0 z-30 border-b-2 border-yellow-400 h-14">
      <div className="px-4 sm:px-6 lg:px-8 h-full flex items-center">
        <div className="flex items-center justify-between w-full">
          {/* Hamburger menu */}
          <div className="flex lg:hidden">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-white hover:text-yellow-400 focus:outline-none transition-all duration-200 p-2 rounded-lg hover:bg-green-600/50 hover:scale-110"
              aria-label="Open sidebar"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>

          {/* Logo (mobile) */}
          <div className="lg:hidden flex items-center space-x-2">
            <div className="bg-yellow-400 p-2 rounded-lg shadow-lg transform hover:scale-110 transition-transform">
              <svg
                className="w-6 h-6 text-green-800"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            </div>
            <span className="text-white font-bold text-lg tracking-wide drop-shadow-md">
              {t("app.brand")}
            </span>
          </div>

          {/* Right section */}
          <div className="flex items-center space-x-3 ml-auto">
            <div className="hidden md:flex items-center space-x-2">
              <LanguageToggle />
            </div>

            {/* Notifications */}
            <div className="relative">
              <NotificationBell />
            </div>

            {/* Cart Icon */}
            <Link
              to="/buyer/cart"
              className="relative text-white hover:text-yellow-400 transition-all duration-200 p-2 rounded-lg hover:bg-green-600/50 group"
            >
              <svg
                className="w-6 h-6"
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
              {cartItemsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {cartItemsCount > 9 ? "9+" : cartItemsCount}
                </span>
              )}
            </Link>

            {/* User Avatar + Name */}
            <Link
              to="/buyer/buyerprofile"
              className="flex items-center space-x-2 text-white hover:text-yellow-400 transition-all duration-200 p-2 rounded-lg hover:bg-green-600/50 group"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-green-800 to-green-900 rounded-full flex items-center justify-center border-2 border-yellow-400 shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all">
                {img ? (
                  <img
                    src={img}
                    alt="Profile"
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                )}
              </div>
              <span className="hidden md:inline font-semibold text-sm">
                {name || t("roles.buyer")}
              </span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

export default BuyerHeader;
