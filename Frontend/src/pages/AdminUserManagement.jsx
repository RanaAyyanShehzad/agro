import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { motion } from "framer-motion";
import {
  Users,
  UserPlus,
  Trash2,
  Lock,
  Unlock,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  RefreshCw,
  Ban,
  Key,
  MoreVertical,
} from "lucide-react";

const API_BASE = "https://agrofarm-vd8i.onrender.com/api/v1/admin";

function AdminUserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showLockModal, setShowLockModal] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [lockDuration, setLockDuration] = useState(30);
  const [suspensionReason, setSuspensionReason] = useState("");
  const [suspensionDuration, setSuspensionDuration] = useState(60);
  const [actionLoading, setActionLoading] = useState(false);
  const [resetPassword, setResetPassword] = useState("");
  const [passwordErrors, setPasswordErrors] = useState([]);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    address: "",
    role: "buyer",
  });

  useEffect(() => {
    fetchUsers();
  }, [roleFilter, includeDeleted]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (roleFilter !== "all") params.append("role", roleFilter);
      if (includeDeleted) params.append("includeDeleted", "true");
      params.append("limit", "100");

      const response = await axios.get(`${API_BASE}/users?${params}`, {
        withCredentials: true,
      });
      setUsers(response.data.users || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API_BASE}/users/add`, newUser, {
        withCredentials: true,
      });
      toast.success(response.data.message || "User created successfully");
      setShowAddModal(false);
      setNewUser({
        name: "",
        email: "",
        password: "",
        phone: "",
        address: "",
        role: "buyer",
      });
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create user");
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser || actionLoading) return;

    try {
      setActionLoading(true);
      const response = await axios.delete(
        `${API_BASE}/users/${selectedUser.role}/${selectedUser._id}`,
        { withCredentials: true }
      );
      toast.success(response.data.message || "User deleted successfully");
      setShowDeleteModal(false);
      setSelectedUser(null);
      await fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete user");
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (user, action, additionalData = {}) => {
    if (actionLoading) return; // Prevent duplicate calls

    try {
      setActionLoading(true);
      const response = await axios.put(
        `${API_BASE}/users/${user.role}/${user._id}/toggle-status`,
        { action, ...additionalData },
        { withCredentials: true }
      );
      toast.success(response.data.message || "User status updated");

      // Only close modals if they're actually open
      if (showLockModal) {
        setShowLockModal(false);
        setLockDuration(30);
      }
      if (showSuspendModal) {
        setShowSuspendModal(false);
        setSuspensionReason("");
        setSuspensionDuration(60);
      }

      setSelectedUser(null);
      await fetchUsers(); // Wait for fetch to complete
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update status");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSuspendUser = async () => {
    if (!selectedUser) {
      toast.error("No user selected");
      return;
    }
    if (actionLoading) return; // Prevent duplicate calls

    if (!suspensionDuration || suspensionDuration <= 0) {
      toast.error(
        "Please provide a valid suspension duration (must be > 0 minutes)"
      );
      return;
    }
    try {
      setActionLoading(true);
      const suspendData = {
        duration: Number(suspensionDuration),
        reason: suspensionReason.trim() || "Policy violation",
      };
      const response = await axios.post(
        `${API_BASE}/users/${selectedUser.role}/${selectedUser._id}/suspend`,
        suspendData,
        { withCredentials: true }
      );
      toast.success(response.data.message || "User suspended successfully");
      setShowSuspendModal(false);
      setSuspensionReason("");
      setSuspensionDuration(60);
      setSelectedUser(null);
      await fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to suspend user");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnsuspendUser = async (user) => {
    if (actionLoading) return; // Prevent duplicate calls

    try {
      setActionLoading(true);
      const response = await axios.post(
        `${API_BASE}/users/${user.role}/${user._id}/unsuspend`,
        {},
        { withCredentials: true }
      );
      toast.success(response.data.message || "User unsuspended successfully");
      await fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to unsuspend user");
    } finally {
      setActionLoading(false);
    }
  };

  const validatePassword = (password) => {
    const errors = [];
    if (password.length < 8) {
      errors.push("At least 8 characters");
    }
    if (!/[A-Z]/.test(password)) {
      errors.push("One uppercase letter");
    }
    if (!/[a-z]/.test(password)) {
      errors.push("One lowercase letter");
    }
    if (!/[0-9]/.test(password)) {
      errors.push("One number");
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push("One special character");
    }
    return errors;
  };

  const handlePasswordChange = (password) => {
    setResetPassword(password);
    if (password) {
      const errors = validatePassword(password);
      setPasswordErrors(errors);
    } else {
      setPasswordErrors([]);
    }
  };

  const handleForcePasswordReset = async () => {
    if (!selectedUser || actionLoading) return;

    // If password is provided, validate it
    if (resetPassword && passwordErrors.length > 0) {
      toast.error("Please fix password validation errors");
      return;
    }

    try {
      setActionLoading(true);
      const requestData = resetPassword ? { newPassword: resetPassword } : {};

      const response = await axios.post(
        `${API_BASE}/users/${selectedUser.role}/${selectedUser._id}/reset-password`,
        requestData,
        { withCredentials: true }
      );

      if (response.data.temporaryPassword) {
        toast.success(
          `Password reset successfully. Temporary password: ${response.data.temporaryPassword}`,
          { autoClose: 10000 }
        );
      } else {
        toast.success(response.data.message || "Password reset successfully");
      }
      setShowPasswordResetModal(false);
      setSelectedUser(null);
      setResetPassword("");
      setPasswordErrors([]);
      await fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to reset password");
    } finally {
      setActionLoading(false);
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const getStatusBadge = (user) => {
    if (user.isAccountDeleted) {
      return (
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
          Deleted
        </span>
      );
    }
    if (user.isSuspended) {
      const suspendedUntil = user.suspendedUntil
        ? new Date(user.suspendedUntil)
        : null;
      const isExpired = suspendedUntil && suspendedUntil < new Date();
      return (
        <div className="flex flex-col gap-1">
          <span
            className={`px-2 py-1 text-xs font-semibold rounded-full ${
              isExpired
                ? "bg-yellow-100 text-yellow-800"
                : "bg-purple-100 text-purple-800"
            }`}
          >
            {isExpired ? "Suspension Expired" : "Suspended"}
          </span>
          {suspendedUntil && !isExpired && (
            <span className="text-xs text-gray-500">
              Until: {suspendedUntil.toLocaleString()}
            </span>
          )}
        </div>
      );
    }
    if (user.lockUntil && new Date(user.lockUntil) > new Date()) {
      return (
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
          Locked
        </span>
      );
    }
    if (!user.isActive) {
      return (
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
          Inactive
        </span>
      );
    }
    return (
      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
        Active
      </span>
    );
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">User Management</h1>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
        >
          <UserPlus className="w-5 h-5" />
          Add User
        </motion.button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="all">All Roles</option>
            <option value="buyer">Buyer</option>
            <option value="farmer">Farmer</option>
            <option value="supplier">Supplier</option>
          </select>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeDeleted}
              onChange={(e) => setIncludeDeleted(e.target.checked)}
              className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
            />
            <span className="text-sm text-gray-700">Include Deleted</span>
          </label>
          <button
            onClick={fetchUsers}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mx-auto"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <motion.tr
                    key={user._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="hover:bg-gray-50 transition"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                            <Users className="w-5 h-5 text-green-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 capitalize">
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(user)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        {!user.isAccountDeleted && (
                          <>
                            {user.isActive ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleStatus(user, "deactivate");
                                }}
                                disabled={actionLoading}
                                className="text-yellow-600 hover:text-yellow-900 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Deactivate"
                              >
                                <XCircle className="w-5 h-5" />
                              </button>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleStatus(user, "activate");
                                }}
                                disabled={actionLoading}
                                className="text-green-600 hover:text-green-900 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Activate"
                              >
                                <CheckCircle className="w-5 h-5" />
                              </button>
                            )}
                            {user.lockUntil &&
                            new Date(user.lockUntil) > new Date() ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleStatus(user, "unlock");
                                }}
                                disabled={actionLoading}
                                className="text-blue-600 hover:text-blue-900 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Unlock"
                              >
                                <Unlock className="w-5 h-5" />
                              </button>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedUser(user);
                                  setShowLockModal(true);
                                }}
                                disabled={actionLoading}
                                className="text-orange-600 hover:text-orange-900 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Lock"
                              >
                                <Lock className="w-5 h-5" />
                              </button>
                            )}
                            {user.isSuspended ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUnsuspendUser(user);
                                }}
                                disabled={actionLoading}
                                className="text-green-600 hover:text-green-900 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Unsuspend"
                              >
                                <Ban className="w-5 h-5" />
                              </button>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedUser(user);
                                  setShowSuspendModal(true);
                                }}
                                disabled={actionLoading}
                                className="text-purple-600 hover:text-purple-900 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Suspend"
                              >
                                <Ban className="w-5 h-5" />
                              </button>
                            )}
                            {/* <button
                              onClick={() => {
                                setSelectedUser(user);
                                setShowPasswordResetModal(true);
                              }}
                              className="text-indigo-600 hover:text-indigo-900"
                              title="Reset Password"
                            >
                              <Key className="w-5 h-5" />
                            </button> */}
                          </>
                        )}
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowDeleteModal(true);
                          }}
                          className="text-red-600 hover:text-red-900"
                          title="Delete"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
            {filteredUsers.length === 0 && (
              <div className="p-12 text-center text-gray-500">
                No users found
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg w-full max-w-md max-h-[90vh] flex flex-col"
          >
            <div className="p-6 pb-4 flex-shrink-0 border-b border-gray-200">
              <h2 className="text-2xl font-bold">Add New User</h2>
            </div>
            <form
              onSubmit={handleAddUser}
              className="flex-1 overflow-y-auto p-6 space-y-4"
            >
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newUser.name}
                  onChange={(e) =>
                    setNewUser({ ...newUser, name: e.target.value })
                  }
                  placeholder="e.g., John Doe"
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter the user's full name
                </p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={newUser.email}
                  onChange={(e) =>
                    setNewUser({ ...newUser, email: e.target.value })
                  }
                  placeholder="e.g., john.doe@example.com"
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Format: user@example.com
                </p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={newUser.password}
                  onChange={(e) =>
                    setNewUser({ ...newUser, password: e.target.value })
                  }
                  placeholder="Enter secure password"
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs font-semibold text-blue-800 mb-1">
                    Password Requirements:
                  </p>
                  <ul className="text-xs text-blue-700 space-y-0.5 list-disc list-inside">
                    <li>At least 8 characters</li>
                    <li>One uppercase letter (A-Z)</li>
                    <li>One lowercase letter (a-z)</li>
                    <li>One number (0-9)</li>
                    <li>One special character (!@#$%^&*...)</li>
                  </ul>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={newUser.phone}
                  onChange={(e) =>
                    setNewUser({ ...newUser, phone: e.target.value })
                  }
                  placeholder="e.g., +92 300 1234567 or 03001234567"
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Format: Country code + number (optional)
                </p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={newUser.address}
                  onChange={(e) =>
                    setNewUser({ ...newUser, address: e.target.value })
                  }
                  placeholder="e.g., 123 Main Street, City, Country"
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Full address including street, city, and country
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  required
                  value={newUser.role}
                  onChange={(e) =>
                    setNewUser({ ...newUser, role: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option value="buyer">Buyer</option>
                  <option value="farmer">Farmer</option>
                  <option value="supplier">Supplier</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4 sticky bottom-0 bg-white border-t border-gray-200 -mx-6 px-6 py-4 mt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  Create User
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg p-6 w-full max-w-md"
          >
            <h2 className="text-2xl font-bold mb-4">Delete User</h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete {selectedUser.name}? This action
              will soft delete the user.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDeleteUser}
                disabled={actionLoading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? "Deleting..." : "Delete"}
              </button>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedUser(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Lock User Modal */}
      {showLockModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg p-6 w-full max-w-md"
          >
            <h2 className="text-2xl font-bold mb-4">Lock User</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lock Duration (minutes)
              </label>
              <input
                type="number"
                min="1"
                value={lockDuration}
                onChange={(e) =>
                  setLockDuration(parseInt(e.target.value) || 30)
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  handleToggleStatus(selectedUser, "lock", { lockDuration });
                }}
                disabled={actionLoading}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? "Locking..." : "Lock User"}
              </button>
              <button
                onClick={() => {
                  setShowLockModal(false);
                  setSelectedUser(null);
                  setLockDuration(30);
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Suspend User Modal */}
      {showSuspendModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md"
          >
            <h2 className="text-2xl font-bold mb-4 text-gray-800">
              Suspend User
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Suspending: <strong>{selectedUser.name}</strong> (
              {selectedUser.email})
            </p>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Duration (Minutes) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={suspensionDuration}
                  onChange={(e) =>
                    setSuspensionDuration(Number(e.target.value))
                  }
                  placeholder="e.g., 60 for 1 hour, 1440 for 1 day"
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Common durations: 60 (1 hour), 1440 (1 day), 10080 (1 week)
                </p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Reason (Optional)
                </label>
                <textarea
                  value={suspensionReason}
                  onChange={(e) => setSuspensionReason(e.target.value)}
                  placeholder="Enter reason for suspension (default: 'Policy violation')..."
                  rows="3"
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSuspendUser}
                disabled={actionLoading}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition shadow-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? "Suspending..." : "Suspend User"}
              </button>
              <button
                onClick={() => {
                  setShowSuspendModal(false);
                  setSelectedUser(null);
                  setSuspensionReason("");
                  setSuspensionDuration(60);
                }}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-semibold"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Password Reset Modal */}
      {showPasswordResetModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg p-6 w-full max-w-md"
          >
            <h2 className="text-2xl font-bold mb-4">Reset Password</h2>
            <p className="text-gray-600 mb-4">
              Reset password for <strong>{selectedUser.name}</strong>
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Password (Optional)
                <span className="text-xs text-gray-500 ml-2">
                  Leave empty to generate temporary password
                </span>
              </label>
              <input
                type="password"
                value={resetPassword}
                onChange={(e) => handlePasswordChange(e.target.value)}
                placeholder="Enter new password (optional)"
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${
                  resetPassword && passwordErrors.length > 0
                    ? "border-red-300 focus:border-red-500"
                    : "border-gray-300"
                }`}
              />

              {resetPassword && (
                <div className="mt-2">
                  <p className="text-xs font-medium text-gray-700 mb-1">
                    Password Requirements:
                  </p>
                  <ul className="text-xs space-y-1">
                    <li
                      className={
                        resetPassword.length >= 8
                          ? "text-green-600"
                          : "text-red-600"
                      }
                    >
                      {resetPassword.length >= 8 ? "✓" : "✗"} At least 8
                      characters
                    </li>
                    <li
                      className={
                        /[A-Z]/.test(resetPassword)
                          ? "text-green-600"
                          : "text-red-600"
                      }
                    >
                      {/[A-Z]/.test(resetPassword) ? "✓" : "✗"} One uppercase
                      letter
                    </li>
                    <li
                      className={
                        /[a-z]/.test(resetPassword)
                          ? "text-green-600"
                          : "text-red-600"
                      }
                    >
                      {/[a-z]/.test(resetPassword) ? "✓" : "✗"} One lowercase
                      letter
                    </li>
                    <li
                      className={
                        /[0-9]/.test(resetPassword)
                          ? "text-green-600"
                          : "text-red-600"
                      }
                    >
                      {/[0-9]/.test(resetPassword) ? "✓" : "✗"} One number
                    </li>
                    <li
                      className={
                        /[!@#$%^&*(),.?":{}|<>]/.test(resetPassword)
                          ? "text-green-600"
                          : "text-red-600"
                      }
                    >
                      {/[!@#$%^&*(),.?":{}|<>]/.test(resetPassword) ? "✓" : "✗"}{" "}
                      One special character
                    </li>
                  </ul>
                </div>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
              <p className="text-xs text-blue-800">
                <strong>Note:</strong> If no password is provided, a temporary
                password will be automatically generated and displayed.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleForcePasswordReset}
                disabled={resetPassword && passwordErrors.length > 0}
                className={`flex-1 px-4 py-2 rounded-lg transition ${
                  resetPassword && passwordErrors.length > 0
                    ? "bg-gray-400 text-gray-600 cursor-not-allowed"
                    : "bg-indigo-600 text-white hover:bg-indigo-700"
                }`}
              >
                Reset Password
              </button>
              <button
                onClick={() => {
                  setShowPasswordResetModal(false);
                  setSelectedUser(null);
                  setResetPassword("");
                  setPasswordErrors([]);
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

export default AdminUserManagement;
