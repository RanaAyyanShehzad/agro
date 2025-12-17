import React from "react";
import { Link, useLocation } from "react-router-dom";
import LanguageToggle from "./LanguageToggle";
import { useTranslation } from "../hooks/useTranslation";


function SupplierSidebar({ sidebarOpen, setSidebarOpen }) {
  const location = useLocation();
  const { t } = useTranslation();
  

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={`fixed inset-0 bg-gray-900 bg-opacity-50 z-40 lg:hidden lg:z-auto transition-opacity duration-200 ${
          sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      ></div>

      {/* Sidebar */}
      <div
        className={`fixed z-40 overflow-y-auto scrollbar-hide left-0 top-0 lg:static lg:left-auto lg:top-auto lg:translate-x-0 transform h-screen w-64 flex-shrink-0 transition-transform duration-300 ease-in-out shadow-2xl 
          bg-gradient-to-br from-green-700 via-green-600 to-green-800 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-64"
          }`}
      >
        {/* Sidebar header */}
        <div className="flex justify-between items-center h-14 px-6 bg-gradient-to-r from-green-800 via-green-700 to-green-800 border-b-2 border-yellow-400 shadow-lg">
          <div className="flex items-center space-x-2">
            <div className="bg-yellow-400 p-1.5 rounded-lg shadow-lg transform hover:scale-110 hover:rotate-6 transition-all duration-200">
              <svg
                className="w-5 h-5 text-green-800"
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
            <Link
              to="/"
              className="text-lg font-bold text-white tracking-wider hover:text-yellow-400 transition-colors drop-shadow-md"
            >
              FarmConnect
            </Link>
          </div>
          <button
            className="lg:hidden text-white hover:text-yellow-400 transition-all duration-200 p-1.5 rounded-lg hover:bg-green-600/50 hover:scale-110"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Close sidebar"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* User info */}
        <div className="flex items-center px-6 py-5 border-b-2 border-green-600/50 bg-gradient-to-r from-green-800/60 via-green-700/40 to-transparent backdrop-blur-sm">
          <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 rounded-full flex items-center justify-center shadow-xl border-2 border-white ring-2 ring-yellow-300/50">
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
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-white font-bold text-sm">{t("nav.welcome")}</p>
            <p className="text-yellow-300 text-xs font-semibold">
              {t("nav.account.supplier")}
            </p>
          </div>
        </div>

        <div className="px-6 py-4 border-b-2 border-green-600/50 bg-gradient-to-r from-green-800/40 via-green-700/30 to-transparent backdrop-blur-sm">
          <LanguageToggle direction="row" className="justify-between" />
        </div>

        {/* Navigation */}
        <div className="px-3 py-4 space-y-2">
          <div className="text-xs font-bold text-yellow-300 uppercase tracking-wider px-3 mb-3 flex items-center gap-2">
            <div className="w-1 h-4 bg-yellow-400 rounded-full"></div>
            {t("nav.section.main")}
          </div>
          <NavItem to="" icon="grid" active={location.pathname === "/"}>
            {t("nav.dashboard")}
          </NavItem>
          <NavItem
            to="products"
            icon="plant"
            active={location.pathname === "/products"}
          >
            {t("nav.products")}
          </NavItem>
          <NavItem
            to="orders"
            icon="shopping-cart"
            active={location.pathname === "/orders"}
          >
            {t("nav.orders")}
          </NavItem>
          <NavItem
            to="disputes"
            icon="gavel"
            active={location.pathname.includes("/disputes")}
          >
            Disputes
          </NavItem>
         

          <div className="text-xs font-bold text-yellow-300 uppercase tracking-wider px-3 mt-6 mb-3 flex items-center gap-2">
            <div className="w-1 h-4 bg-yellow-400 rounded-full"></div>
            {t("nav.section.other")}
          </div>

          <NavItem
            to="profile"
            icon="profile"
            active={location.pathname === "/profile"}
          >
            {t("nav.profile")}
          </NavItem>
          <NavItem
            to="/"
            icon="logout"
            active={location.pathname === "/reports"}
          >
            {t("nav.logout")}
          </NavItem>
        </div>
      </div>
    </>
  );
}

// Navigation Item component
function NavItem({ to, icon, active, children }) {
  const icons = {
    grid: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
        />
      </svg>
    ),
    plant: (
      <svg
        className="w-5 h-5"
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
    ),
    "shopping-cart": (
      <svg
        className="w-5 h-5"
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
    ),
    "cloud-rain": (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M19 13.5a7.5 7.5 0 00-7.5-7.5h-1A7 7 0 014 12H3m12 1.5v2m0 4.5v-2m3-2h-1.5m-6 0H9m12 0h-1.5"
        />
      </svg>
    ),
    search: (
      <svg
        className="w-5 h-5"
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
    ),
    heart: (
      <svg
        className="w-5 h-5"
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
    ),
    "trending-up": (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
        />
      </svg>
    ),
    gavel: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
        />
      </svg>
    ),
    "file-text": (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    ),
    profile: (
      <svg
        className="w-5 h-5"
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
    ),
    logout: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
        />
      </svg>
    ),
  };

  return (
    <Link
      to={to}
      className={`flex items-center px-4 py-3 rounded-xl overflow-y-auto scrollbar-hide transition-all duration-300 ease-out group ${
        active
          ? "bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold shadow-lg transform scale-105"
          : "text-green-100 hover:bg-green-600/50 hover:text-white hover:shadow-md"
      }`}
    >
      <div
        className={`flex-shrink-0 mr-3 transition-transform duration-200 ${
          active
            ? "text-yellow-400 transform scale-110"
            : "group-hover:text-yellow-300"
        }`}
      >
        {icons[icon]}
      </div>
      <div className="flex-grow font-medium">{children}</div>
      {active && (
        <div className="w-1.5 h-8 bg-yellow-400 rounded-l-full -mr-3 shadow-lg"></div>
      )}
    </Link>
  );
}

export default SupplierSidebar;
