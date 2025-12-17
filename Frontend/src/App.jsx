import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Provider } from "react-redux";
import { store } from "./App/store";

// Layouts
import LandingPage from "./pages/LandingPage";
import AdminLayout from "./components/AdminLayout";
import FarmerLayout from "./components/FarmerLayout";
import BuyerLayout from "./components/BuyerLayout";
import SupplierLayout from "./components/SupplierLayout";

// Farmer Pages
import Dashboard from "./pages/Dashboard";
import WeatherAlerts from "./pages/WeatherAlerts";
import ProductManagement from "./pages/ProductManagement";
import OrderManagement from "./pages/OrderManagement";
import ShoppingCart from "./pages/ShoppingCart";
import FarmerProfile from "./pages/FarmerProfile";
import Whishlist from "./pages/Whishlist";
import MyOrders from "./pages/MyOrders";
import FarmerProducts from "./pages/FarmerProducts";
import FarmerDisputes from "./pages/FarmerDisputes";

// Buyer Pages
import BuyerDashboard from "./pages/BuyerDashboard";
import BuyerProducts from "./pages/BuyerProducts";
import BuyerCart from "./pages/BuyerCart";
import BuyerProfile from "./pages/BuyerProfile";
import BuyerDisputes from "./pages/BuyerDisputes";
import ProductDetail from "./pages/ProductDetail";

// Supplier Pages
import SupplierDashboard from "./pages/SupplierDashboard";
import SupplierProfile from "./pages/SupplierProfile";
import SupplierDisputes from "./pages/SupplierDisputes";

// Admin Pages
import AdminDashboard from "./pages/AdminDashboard";
import AdminUserManagement from "./pages/AdminUserManagement";
import AdminCategoryManagement from "./pages/AdminCategoryManagement";
import AdminProducts from "./pages/AdminProducts";
import AdminOrders from "./pages/AdminOrders";
import AdminDisputeManagement from "./pages/AdminDisputeManagement";
import AdminSystemConfig from "./pages/AdminSystemConfig";

// Toast
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { AuthProvider } from "./context/AuthContext";
import { NotificationProvider } from "./context/NotificationContext";
import ProtectedRoute from "./components/ProtectedRoute";
import ConditionalChatBot from "./components/ConditionalChatBot";
import WeatherBootstrap from "./components/WeatherBootstrap";
import { LanguageProvider } from "./context/LanguageContext";
import NotificationsPage from "./pages/NotificationsPage";

// Auth Context
// import { AuthProvider } from "./context/AuthContext";
// import ProtectedRoute from "./components/ProtectedRoute";

export default function App() {
  return (
    <Provider store={store}>
      <AuthProvider>
        <NotificationProvider>
          <LanguageProvider>
            <BrowserRouter>
              <WeatherBootstrap />
              <ToastContainer
                position="top-right"
                autoClose={4000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                preventDuplicate
                enableMultiContainer={false}
                pauseOnHover
              />
              <ConditionalChatBot />
              <Routes>
                {/* Public Route */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/product/:productId" element={<ProductDetail />} />

                {/* Protected Farmer Routes */}
                <Route
                  path="/farmer"
                  element={
                    <ProtectedRoute allowedRoles={["farmer"]}>
                      <FarmerLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Dashboard />} />
                  <Route path="weather" element={<WeatherAlerts />} />
                  <Route path="farmerProducts" element={<FarmerProducts />} />
                  <Route path="products" element={<ProductManagement />} />
                  <Route path="orders" element={<OrderManagement />} />
                  <Route path="disputes" element={<FarmerDisputes />} />
                  <Route path="wishlist" element={<Whishlist />} />
                  <Route path="cart" element={<ShoppingCart />} />
                  <Route path="myorders" element={<MyOrders />} />
                  <Route path="farmerprofile" element={<FarmerProfile />} />
                </Route>
                {/* Protected Buyer Routes */}
                <Route
                  path="/buyer"
                  element={
                    <ProtectedRoute allowedRoles={["buyer"]}>
                      <BuyerLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<BuyerDashboard />} />
                  <Route path="products" element={<BuyerProducts />} />
                  <Route
                    path="products/:productId"
                    element={<ProductDetail />}
                  />
                  <Route path="cart" element={<BuyerCart />} />
                  <Route path="myorders" element={<MyOrders />} />
                  <Route path="disputes" element={<BuyerDisputes />} />
                  <Route path="wishlist" element={<Whishlist />} />
                  <Route path="buyerprofile" element={<BuyerProfile />} />
                </Route>
                {/* Protected Supplier Routes */}
                <Route
                  path="/supplier"
                  element={
                    <ProtectedRoute>
                      <SupplierLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<SupplierDashboard />} />
                  <Route path="products" element={<ProductManagement />} />
                  <Route path="orders" element={<OrderManagement />} />
                  <Route path="disputes" element={<SupplierDisputes />} />
                  <Route path="weather" element={<WeatherAlerts />} />
                  <Route path="profile" element={<SupplierProfile />} />
                </Route>
                {/* Protected Admin Routes */}
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute allowedRoles={["admin"]}>
                      <AdminLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<AdminDashboard />} />
                  <Route path="users" element={<AdminUserManagement />} />
                  <Route
                    path="categories"
                    element={<AdminCategoryManagement />}
                  />
                  <Route path="products" element={<AdminProducts />} />
                  <Route path="orders" element={<AdminOrders />} />
                  <Route path="disputes" element={<AdminDisputeManagement />} />
                  <Route path="config" element={<AdminSystemConfig />} />
                </Route>
                {/* Notifications Route - Available for all authenticated users */}
                <Route
                  path="/notifications"
                  element={
                    <ProtectedRoute>
                      <NotificationsPage />
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </BrowserRouter>
          </LanguageProvider>
        </NotificationProvider>
      </AuthProvider>
    </Provider>
  );
}
