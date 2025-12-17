import { useState } from "react";
import React from "react";
import { useAuth } from "../context/AuthContext";
import { Settings, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

function AdminHeader({ sidebarOpen, setSidebarOpen }) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      const response = await fetch(
        "https://agrofarm-vd8i.onrender.com/api/v1/admin/logout",
        { method: "GET", credentials: "include" }
      );

      if (!response.ok) throw new Error("Logout failed");
      toast.success("Logged out successfully");
      navigate("/");
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <header className="bg-purple-700 shadow-md sticky top-0 z-30">
      <div className="px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between">
          {/* Hamburger menu */}
          <div className="flex lg:hidden">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-white hover:text-yellow-400 focus:outline-none"
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
            <div className="bg-yellow-400 p-1.5 rounded-full">
              <Settings className="w-5 h-5 text-purple-800" />
            </div>
            <span className="text-white font-semibold text-lg">
              Admin Panel
            </span>
          </div>

          {/* Right section */}
          <div className="flex items-center space-x-3 ml-auto">
            {/* Admin Profile Logo + Label */}
            <div className="flex items-center space-x-2 text-white">
              <div className="w-10 h-10 bg-purple-800 rounded-full flex items-center justify-center border-2 border-yellow-400">
                <Settings className="w-6 h-6 text-yellow-400" />
              </div>
              <span className="hidden md:inline font-semibold text-lg">
                Admin
              </span>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-purple-800 hover:bg-purple-900 rounded-lg transition text-white text-sm font-medium"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

export default AdminHeader;
