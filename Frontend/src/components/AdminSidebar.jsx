import React from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import {
  LayoutDashboard,
  Users,
  Package,
  ShoppingCart,
  Settings,
  LogOut,
  FolderTree,
  AlertCircle,
  Gavel,
} from "lucide-react";

function AdminSidebar({ sidebarOpen, setSidebarOpen }) {
  const navigate = useNavigate();
  const location = useLocation();

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

  const navItems = [
    { to: "", icon: LayoutDashboard, label: "Dashboard" },
    { to: "users", icon: Users, label: "User Management" },
    // { to: "categories", icon: FolderTree, label: "Categories" },
    { to: "products", icon: Package, label: "Products" },
    { to: "orders", icon: ShoppingCart, label: "Orders" },
    { to: "disputes", icon: Gavel, label: "Disputes" },
    { to: "config", icon: Settings, label: "System Config" },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={`fixed inset-0 bg-gray-900 bg-opacity-50 z-40 lg:hidden transition-opacity duration-200 ${
          sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      ></div>

      {/* Sidebar */}
      <div
        className={`fixed z-40 overflow-y-auto scrollbar-hide left-0 top-0 lg:static lg:left-auto lg:top-auto lg:translate-x-0 transform h-screen w-64 flex-shrink-0 transition-transform duration-200 ease-in-out shadow-lg bg-gradient-to-b from-purple-700 to-purple-600 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-64"
        }`}
      >
        {/* Sidebar header */}
        <div className="flex justify-between items-center h-14 px-6 bg-gradient-to-b from-purple-800 to-purple-600 border-b border-purple-600">
          <div className="flex items-center space-x-3">
            <div className="bg-yellow-400 p-2 rounded-full">
              <AlertCircle className="w-6 h-6 text-purple-800" />
            </div>
            <div className="text-xl font-bold text-white tracking-wider">
              Admin Panel
            </div>
          </div>
          <button
            className="lg:hidden text-white hover:text-yellow-400 transition-colors duration-150"
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
        <div className="flex items-center px-6 py-4 border-b border-purple-600">
          <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div className="ml-3">
            <p className="text-white font-medium">Admin</p>
            <p className="text-purple-200 text-sm">System Administrator</p>
          </div>
        </div>

        {/* Navigation */}
        <div className="px-3 py-4 space-y-1">
          <p className="text-xs font-semibold text-purple-200 uppercase tracking-wider px-3 mb-2">
            Main Menu
          </p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === `/admin/${item.to}` ||
              (item.to === "" && location.pathname === "/admin");
            return (
              <NavItem
                key={item.to}
                to={item.to}
                icon={<Icon className="w-5 h-5" />}
                active={isActive}
              >
                {item.label}
              </NavItem>
            );
          })}

          <p className="text-xs font-semibold text-purple-200 uppercase tracking-wider px-3 mt-6 mb-2">
            Account
          </p>

          <NavItem
            onClick={handleLogout}
            to="/"
            icon={<LogOut className="w-5 h-5" />}
            active={false}
          >
            Logout
          </NavItem>
        </div>
      </div>
    </>
  );
}

// Navigation Item component
function NavItem({ to, icon, active, children, onClick }) {
  return (
    <Link
      to={onClick ? "#" : `/admin/${to}`}
      onClick={onClick}
      className={`flex items-center px-3 py-3 rounded-lg transition-all duration-200 ease-out hover:-translate-y-0.5 ${
        active
          ? "bg-purple-500 text-white font-medium shadow-md"
          : "text-purple-100 hover:bg-purple-600 hover:text-white"
      }`}
    >
      <div className={`flex-shrink-0 mr-3 ${active ? "text-yellow-400" : ""}`}>
        {icon}
      </div>
      <div className="flex-grow">{children}</div>
      {active && (
        <div className="w-1.5 h-8 bg-yellow-400 rounded-l-full -mr-3"></div>
      )}
    </Link>
  );
}

export default AdminSidebar;
