import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { motion } from "framer-motion";
import {
  Settings,
  Save,
  RefreshCw,
  Thermometer,
  Clock,
  HelpCircle,
} from "lucide-react";

const API_BASE = "https://agrofarm-vd8i.onrender.com/api/v1/admin";

function AdminSystemConfig() {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingConfig, setEditingConfig] = useState(null);
  const [formValue, setFormValue] = useState("");

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/config`, {
        withCredentials: true,
      });
      setConfigs(response.data.configs || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch configs");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateConfig = async (configKey) => {
    try {
      // Validate based on config type
      let value;
      if (configKey.includes("TEMP") || configKey.includes("MINUTES")) {
        value = Number(formValue);
        if (isNaN(value)) {
          toast.error("Please enter a valid number");
          return;
        }
        if (configKey.includes("MINUTES") && value < 0) {
          toast.error("Minutes must be >= 0");
          return;
        }
      } else if (configKey === "FAQ_CONTENT") {
        // Try to parse as JSON if it looks like an array, otherwise use as string
        try {
          value = JSON.parse(formValue);
        } catch {
          value = formValue;
        }
      } else {
        value = formValue;
      }

      const response = await axios.put(
        `${API_BASE}/config`,
        { configKey, configValue: value },
        { withCredentials: true }
      );
      toast.success(
        response.data.message || "Configuration updated successfully"
      );
      setEditingConfig(null);
      setFormValue("");
      fetchConfigs();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to update configuration"
      );
    }
  };

  const getConfigIcon = (key) => {
    if (key.includes("TEMP")) return Thermometer;
    if (key.includes("MINUTES") || key.includes("DAYS")) return Clock;
    return Settings;
  };

  const getConfigType = (key) => {
    if (key.includes("TEMP") || key.includes("MINUTES") || key.includes("DAYS"))
      return "number";
    return "text";
  };

  const startEditing = (config) => {
    setEditingConfig(config);
    setFormValue(
      Array.isArray(config.configValue)
        ? JSON.stringify(config.configValue)
        : String(config.configValue)
    );
  };

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-white min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-800 mb-2">
              System Configuration
            </h1>
            <p className="text-gray-600">
              Manage system-wide settings and time-based configurations
            </p>
          </div>
          <button
            onClick={fetchConfigs}
            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition shadow-lg font-semibold"
          >
            <RefreshCw className="w-5 h-5" />
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mx-auto"></div>
            </div>
          ) : (
            configs.map((config) => {
              const Icon = getConfigIcon(config.configKey);
              const isEditing = editingConfig?._id === config._id;
              const inputType = getConfigType(config.configKey);

              return (
                <motion.div
                  key={config._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all border border-gray-200"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3 flex-grow">
                      <div className="p-3 bg-gradient-to-br from-green-100 to-green-200 rounded-xl shadow-sm">
                        <Icon className="w-6 h-6 text-green-700" />
                      </div>
                      <div className="flex-grow">
                        <h3 className="text-lg font-bold text-gray-900 mb-1">
                          {config.configKey.replace(/_/g, " ")}
                        </h3>
                        {config.description && (
                          <p className="text-sm text-gray-600 leading-relaxed">
                            {config.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {isEditing ? (
                      <>
                        <div className="bg-gradient-to-br from-gray-50 to-white p-4 rounded-lg border-2 border-gray-200">
                          <label className="block text-sm font-bold text-gray-700 mb-2">
                            New Value
                          </label>
                          {inputType === "number" ? (
                            <input
                              type="number"
                              min={
                                config.configKey.includes("MINUTES")
                                  ? "0"
                                  : undefined
                              }
                              value={formValue}
                              onChange={(e) => setFormValue(e.target.value)}
                              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 font-semibold text-gray-900"
                              placeholder={
                                config.configKey.includes("MINUTES")
                                  ? "Enter minutes (>= 0)"
                                  : "Enter value"
                              }
                            />
                          ) : (
                            <textarea
                              value={formValue}
                              onChange={(e) => setFormValue(e.target.value)}
                              rows="4"
                              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                              placeholder="Enter value..."
                            />
                          )}
                          {config.configKey.includes("MINUTES") && (
                            <p className="text-xs text-gray-500 mt-2">
                              ⚠️ Must be &gt;= 0
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleUpdateConfig(config.configKey)}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition shadow-lg font-semibold"
                          >
                            <Save className="w-4 h-4" />
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setEditingConfig(null);
                              setFormValue("");
                            }}
                            className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-semibold"
                          >
                            Cancel
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border-2 border-green-200">
                          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                            Current Value
                          </p>
                          <p className="text-2xl font-bold text-gray-900 break-all">
                            {Array.isArray(config.configValue)
                              ? JSON.stringify(config.configValue)
                              : String(config.configValue)}
                            {config.configKey.includes("MINUTES") && (
                              <span className="text-sm text-gray-600 ml-2">
                                minutes
                              </span>
                            )}
                            {config.configKey.includes("TEMP") && (
                              <span className="text-sm text-gray-600 ml-2">
                                °C
                              </span>
                            )}
                          </p>
                        </div>
                        <button
                          onClick={() => startEditing(config)}
                          className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition shadow-md font-semibold"
                        >
                          Edit Configuration
                        </button>
                      </>
                    )}
                  </div>

                  {config.updatedBy && (
                    <div className="mt-4 pt-4 border-t-2 border-gray-200">
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                        Last Updated
                      </p>
                      <p className="text-xs text-gray-700 font-medium">
                        {new Date(config.updatedAt).toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        By:{" "}
                        <span className="font-semibold">
                          {config.updatedBy.name || "Admin"}
                        </span>
                      </p>
                    </div>
                  )}
                </motion.div>
              );
            })
          )}
        </div>

        {configs.length === 0 && !loading && (
          <div className="p-12 text-center text-gray-500 bg-white rounded-lg shadow-md">
            <Settings className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p>No configurations found</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminSystemConfig;
