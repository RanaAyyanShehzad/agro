import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  FiEdit,
  FiCamera,
  FiX,
  FiLogOut,
  FiLock,
  FiTrash2,
} from "react-icons/fi";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useDispatch } from "react-redux";
import { setUser } from "../features/userSlice";

// Password validation helper function
const getPasswordChecklist = (value = "") => ({
  length: value.length >= 8,
  lower: /[a-z]/.test(value),
  upper: /[A-Z]/.test(value),
  digit: /\d/.test(value),
  special: /[@$!%*?&#\-_.+]/.test(value),
});

const SupplierProfile = () => {
  // Cloudinary configuration
  const CLOUD_NAME = "dn5edjpzg";
  const UPLOAD_PRESET = "FarmConnect";
  const dispatch = useDispatch();

  // State management
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    img: "",
  });

  const [tempData, setTempData] = useState({
    ...profileData,
    imgPreview: "",
  });

  const [passwordData, setPasswordData] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState({
    oldPassword: false,
    newPassword: false,
    confirmPassword: false,
  });

  // Refs
  const fileInputRef = useRef(null);
  const formRef = useRef(null);

  // Fetch profile data on mount
  useEffect(() => {
    fetchProfileData();

    return () => {
      if (tempData.imgPreview) {
        URL.revokeObjectURL(tempData.imgPreview);
      }
    };
  }, []);
  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        "https://agrofarm-vd8i.onrender.com/api/suppliers/me",
        { credentials: "include" }
      );

      if (!response.ok) throw new Error("Failed to fetch profile data");

      const data = await response.json();
      const { name, email, phone, address, img } = data.user;

      setProfileData({ name, email, phone, address, img });
      setTempData({ name, email, phone, address, img, imgPreview: "" });
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Cloudinary upload function
  const uploadToCloudinary = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
        { method: "POST", body: formData }
      );

      if (!response.ok) throw new Error("Image upload failed");

      const data = await response.json();
      return data.secure_url;
    } catch (error) {
      toast.error("Image upload failed");
      throw error;
    }
  };

  // Handle image selection
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setTempData((prev) => ({ ...prev, img: file, imgPreview: previewUrl }));
    }
  };

  // Handle profile save
  const handleSave = async () => {
    try {
      setLoading(true);

      let imgUrl = tempData.img;

      // Upload new image if selected
      if (tempData.img instanceof File) {
        imgUrl = await uploadToCloudinary(tempData.img);
      }

      // Update profile
      const response = await fetch(
        "https://agrofarm-vd8i.onrender.com/api/suppliers/update",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: tempData.name,
            email: tempData.email,
            phone: tempData.phone,
            address: tempData.address,
            img: imgUrl,
          }),
          credentials: "include",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Update failed");
      }

      const updatedData = await response.json();
      const { name, email, phone, address, img } =
        updatedData.user || updatedData;

      setProfileData({ name, email, phone, address, img });
      setTempData({ name, email, phone, address, img, imgPreview: "" });
      setIsEditing(false);
      toast.success("Profile updated successfully");
      fetchProfileData();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        "https://agrofarm-vd8i.onrender.com/api/suppliers/logout",
        { method: "GET", credentials: "include" }
      );

      if (!response.ok) throw new Error("Logout failed");

      toast.success("Logged out successfully");
      navigate("/");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle password change
  const handleChangePassword = async () => {
    if (
      !passwordData.oldPassword ||
      !passwordData.newPassword ||
      !passwordData.confirmPassword
    ) {
      toast.error("All fields are required");
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(
        "https://agrofarm-vd8i.onrender.com/api/suppliers/change-password",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            oldPassword: passwordData.oldPassword,
            newPassword: passwordData.newPassword,
          }),
          credentials: "include",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Password change failed");
      }

      toast.success("Password changed successfully");
      setIsChangingPassword(false);
      setPasswordData({
        oldPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setShowPassword({
        oldPassword: false,
        newPassword: false,
        confirmPassword: false,
      });
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle cancel edit
  const handleCancel = () => {
    setTempData({ ...profileData, imgPreview: "" });
    setIsEditing(false);
    setIsChangingPassword(false);
  };

  // Handle field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setTempData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle password field changes
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle account deletion
  const handleDeleteAccount = async () => {
    const confirmMessage =
      "⚠️ WARNING: Account Deletion\n\n" +
      "Are you sure you want to delete your account? This action will:\n\n" +
      "• Mark your account as deleted (soft delete)\n" +
      "• Soft delete all your products (they will be removed from listings)\n" +
      "• Your existing orders will remain intact for record keeping\n\n" +
      "Your data will be preserved but your account will be inactive.\n\n" +
      "This action cannot be undone. Continue?";

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(
        "https://agrofarm-vd8i.onrender.com/api/suppliers/delete",
        { method: "DELETE", credentials: "include" }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Account deletion failed");
      }

      toast.success(
        data.message ||
          "Account deleted successfully. All your products have been removed."
      );
      setTimeout(() => {
        dispatch(setUser(null));
        navigate("/");
      }, 2000);
    } catch (error) {
      toast.error(error.message || "Failed to delete account");
    } finally {
      setLoading(false);
    }
  };

  // Get image URL for display
  const getImageUrl = () => {
    if (tempData.imgPreview) return tempData.imgPreview;
    if (typeof tempData.img === "string") return tempData.img;
    return null;
  };

  // Loading state
  if (loading && !profileData.name) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-8 px-4 sm:px-6 lg:px-8"
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <motion.h1
            initial={{ y: -20 }}
            animate={{ y: 0 }}
            className="text-2xl sm:text-3xl font-bold text-gray-800"
          >
          Supplier Profile
          </motion.h1>

          <div className="flex gap-3 w-full sm:w-auto">
            {!isEditing && !isChangingPassword && (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm hover:shadow-md transition-all flex-1 sm:flex-none justify-center"
                >
                  <FiEdit className="text-green-600" />
                  <span className="text-gray-700">Edit Profile</span>
                </button>

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 bg-red-100 px-4 py-2 rounded-lg shadow-sm hover:shadow-md transition-all flex-1 sm:flex-none justify-center"
                >
                  <FiLogOut className="text-red-600" />
                  <span className="text-gray-700">Logout</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Profile Card */}
        <motion.div
          whileHover={{ y: -5 }}
          className="bg-white rounded-2xl shadow-lg overflow-hidden mb-8"
        >
          <div className="relative">
            {/* Profile Picture */}
            <div className="p-6 flex flex-col sm:flex-row items-center gap-6">
              <div className="relative">
                <div className="h-32 w-32 rounded-full border-4 border-white bg-white overflow-hidden shadow-lg relative">
                  {getImageUrl() ? (
                    <img
                      src={getImageUrl()}
                      alt="Farmer"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full bg-gray-200 flex items-center justify-center">
                      <span className="text-gray-500">No Image</span>
                    </div>
                  )}

                  {isEditing && (
                    <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => fileInputRef.current.click()}
                        className="p-2 bg-white/90 rounded-full hover:bg-white transition-colors mb-1"
                      >
                        <FiCamera className="text-gray-700" />
                      </button>

                      {getImageUrl() && (
                        <button
                          onClick={() =>
                            setTempData((prev) => ({
                              ...prev,
                              img: "",
                              imgPreview: "",
                            }))
                          }
                          className="p-2 bg-white/90 rounded-full hover:bg-white transition-colors"
                        >
                          <FiX className="text-gray-700" />
                        </button>
                      )}

                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageChange}
                        className="hidden"
                        accept="image/*"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Profile Info */}
              <div className="flex-1 w-full">
                {isChangingPassword ? (
                  <div
                    className="space-y-4 max-h-96 overflow-y-auto p-2"
                    ref={formRef}
                  >
                    <h3 className="text-xl font-bold text-gray-800 mb-4">
                      Change Password
                    </h3>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Old Password
                        </label>
                        <div className="relative">
                          <input
                            type={
                              showPassword.oldPassword ? "text" : "password"
                            }
                            name="oldPassword"
                            value={passwordData.oldPassword}
                            onChange={handlePasswordChange}
                            className="w-full p-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowPassword((prev) => ({
                                ...prev,
                                oldPassword: !prev.oldPassword,
                              }))
                            }
                            className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-700 focus:outline-none"
                            aria-label={
                              showPassword.oldPassword
                                ? "Hide password"
                                : "Show password"
                            }
                          >
                            {showPassword.oldPassword ? (
                              <EyeOffIcon />
                            ) : (
                              <EyeIcon />
                            )}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          New Password
                        </label>
                        <div className="relative">
                          <input
                            type={
                              showPassword.newPassword ? "text" : "password"
                            }
                            name="newPassword"
                            value={passwordData.newPassword}
                            onChange={handlePasswordChange}
                            className="w-full p-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowPassword((prev) => ({
                                ...prev,
                                newPassword: !prev.newPassword,
                              }))
                            }
                            className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-700 focus:outline-none"
                            aria-label={
                              showPassword.newPassword
                                ? "Hide password"
                                : "Show password"
                            }
                          >
                            {showPassword.newPassword ? (
                              <EyeOffIcon />
                            ) : (
                              <EyeIcon />
                            )}
                          </button>
                        </div>
                        {/* Password Requirements Checklist */}
                        <PasswordChecklist
                          password={passwordData.newPassword}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Confirm Password
                        </label>
                        <div className="relative">
                          <input
                            type={
                              showPassword.confirmPassword ? "text" : "password"
                            }
                            name="confirmPassword"
                            value={passwordData.confirmPassword}
                            onChange={handlePasswordChange}
                            className="w-full p-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowPassword((prev) => ({
                                ...prev,
                                confirmPassword: !prev.confirmPassword,
                              }))
                            }
                            className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-700 focus:outline-none"
                            aria-label={
                              showPassword.confirmPassword
                                ? "Hide password"
                                : "Show password"
                            }
                          >
                            {showPassword.confirmPassword ? (
                              <EyeOffIcon />
                            ) : (
                              <EyeIcon />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : isEditing ? (
                  <div
                    className="space-y-4 max-h-96 overflow-y-auto p-2"
                    ref={formRef}
                  >
                    <h3 className="text-xl font-bold text-gray-800">
                      Edit Profile
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Full Name
                        </label>
                        <input
                          type="text"
                          name="name"
                          value={tempData.name}
                          onChange={handleChange}
                          className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email
                        </label>
                        <input
                          type="email"
                          name="email"
                          value={tempData.email}
                          onChange={handleChange}
                          className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          name="phone"
                          value={tempData.phone}
                          onChange={handleChange}
                          className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Address
                        </label>
                        <input
                          type="text"
                          name="address"
                          value={tempData.address}
                          onChange={handleChange}
                          className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-start">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-800">
                          {profileData.name}
                        </h2>
                        <div className="flex items-center gap-1 text-gray-500 mt-2">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <span>{profileData.address}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 bg-green-100 px-4 py-2 rounded-full">
                        <div className="h-3 w-3 bg-green-500 rounded-full"></div>
                        <span className="text-green-800 font-medium">
                          Active
                        </span>
                      </div>
                    </div>

                    {/* Contact Info */}
                    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-100 p-3 rounded-full">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-6 w-6 text-blue-600"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                            />
                          </svg>
                        </div>
                        <span>{profileData.email}</span>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="bg-green-100 p-3 rounded-full">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-6 w-6 text-green-600"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                            />
                          </svg>
                        </div>
                        <span>{profileData.phone}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="px-6 pb-6 flex justify-end gap-3">
              {isEditing || isChangingPassword ? (
                <>
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 border border-gray-500 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                    disabled={loading}
                  >
                    Cancel
                  </button>

                  <button
                    onClick={
                      isChangingPassword ? handleChangePassword : handleSave
                    }
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <svg
                          className="animate-spin h-5 w-5 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Processing...
                      </>
                    ) : isChangingPassword ? (
                      "Change Password"
                    ) : (
                      "Save Changes"
                    )}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setIsChangingPassword(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                  >
                    <FiLock />
                    Change Password
                  </button>

                  <button
                    onClick={handleDeleteAccount}
                    className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                  >
                    <FiTrash2 />
                    Delete Account
                  </button>
                </>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      <ToastContainer position="bottom-right" autoClose={5000} />
    </motion.div>
  );
};

// Password Requirements Checklist Component
const PasswordChecklist = ({ password = "" }) => {
  const checklist = getPasswordChecklist(password);
  const items = [
    { key: "length", label: "At least 8 characters" },
    { key: "lower", label: "Includes a lowercase letter" },
    { key: "upper", label: "Includes an uppercase letter" },
    { key: "digit", label: "Includes a number" },
    { key: "special", label: "Includes @$!%*?&#-_.+" },
  ];

  return (
    <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
      <p className="text-xs font-semibold text-gray-700 mb-2">
        Password Requirements:
      </p>
      <ul className="text-xs text-gray-600 space-y-1">
        {items.map(({ key, label }) => (
          <li
            key={key}
            className={`flex items-center ${
              checklist[key] ? "text-green-600" : "text-gray-500"
            }`}
          >
            <span className="mr-2 text-sm font-bold">
              {checklist[key] ? "✓" : "○"}
            </span>
            {label}
          </li>
        ))}
      </ul>
    </div>
  );
};

// Eye icons for password visibility toggle
const EyeIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M2.25 12s3.75-6.75 9.75-6.75S21.75 12 21.75 12s-3.75 6.75-9.75 6.75S2.25 12 2.25 12z" />
    <circle cx="12" cy="12" r="2.25" />
  </svg>
);

const EyeOffIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 3l18 18" />
    <path d="M10.477 10.477a3 3 0 004.243 4.243" />
    <path d="M6.633 6.633C4.507 7.962 3 10 3 10s3.75 6.75 9.75 6.75c1.163 0 2.257-.19 3.262-.53" />
    <path d="M17.253 14.63C19.405 13.252 21 10.999 21 10.999s-3.75-6.75-9.75-6.75a9.054 9.054 0 00-2.835.452" />
    <path d="M14.362 5.182c-2.423-1.14-4.99-1.182-7.362 0" />
    <path d="M12 8.25a3.75 3.75 0 013.75 3.75" />
  </svg>
);

export default SupplierProfile;
