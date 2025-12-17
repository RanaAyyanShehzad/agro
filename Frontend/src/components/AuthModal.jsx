// AuthModal.jsx
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { setUser } from "../features/userSlice";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import { fetchProfileForRole } from "../services/profileService";

const API_MAP = {
  Farmer: "https://agrofarm-vd8i.onrender.com/api/farmers",
  Buyer: "https://agrofarm-vd8i.onrender.com/api/buyers",
  Supplier: "https://agrofarm-vd8i.onrender.com/api/suppliers",
  Admin: "https://agrofarm-vd8i.onrender.com/api/v1/admin",
};

const roleVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

const inputVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
};

const INITIAL_FORM_DATA = Object.freeze({
  email: "",
  password: "",
  name: "",
  phone: "",
  address: "",
});

const NAME_REGEX = /^[a-zA-Z\s]+$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#\-_.+])[A-Za-z\d@$!%*?&#\-_.+]{8,}$/;
const PHONE_REGEX = /^\+92\d{10}$/;
const OTP_REGEX = /^\d{6}$/;
const getPasswordChecklist = (value = "") => ({
  length: value.length >= 8,
  lower: /[a-z]/.test(value),
  upper: /[A-Z]/.test(value),
  digit: /\d/.test(value),
  special: /[@$!%*?&#\-_.+]/.test(value),
});

const AuthModal = ({ isOpen, onClose }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [isSignup, setIsSignup] = useState(false);
  const [role, setRole] = useState("Farmer");
  const [formData, setFormData] = useState(() => ({ ...INITIAL_FORM_DATA }));
  const [showAdminOption, setShowAdminOption] = useState(false);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [step, setStep] = useState("auth"); // auth | otp | forgot | reset
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [showPassword, setShowPassword] = useState({
    auth: false,
    reset: false,
  });
  const [lockoutMessage, setLockoutMessage] = useState("");

  const clearFormFeedback = () => {
    setErrorMessage("");
    setSuccessMessage("");
    setLockoutMessage("");
  };

  const moveToStep = (nextStep) => {
    setStep(nextStep);
    setFieldErrors({});
    clearFormFeedback();
    if (nextStep === "auth") {
      setOtp("");
      setNewPassword("");
    }
  };

  const validateField = (field, value, options = {}) => {
    const targetField = options.aliasFor || field;
    const rawValue = typeof value === "string" ? value : value ?? "";
    const trimmedValue =
      typeof rawValue === "string" ? rawValue.trim() : rawValue;

    switch (targetField) {
      case "name":
        if (!trimmedValue) return "Name is required";
        if (!NAME_REGEX.test(trimmedValue))
          return "Name can only include letters and spaces";
        return "";
      case "email":
        if (!trimmedValue) return "Email is required";
        if (!EMAIL_REGEX.test(trimmedValue))
          return "Enter a valid email address";
        return "";
      case "password":
        if (!rawValue) return "Password is required";
        if (options.enforceComplexity && !PASSWORD_REGEX.test(rawValue))
          return "Password must be 8+ chars with upper, lower, digit, and @$!%*?&#-_.+";
        return "";
      case "phone":
        if (!trimmedValue) return "Phone number is required";
        if (!PHONE_REGEX.test(trimmedValue))
          return "Phone must match +92XXXXXXXXXX";
        return "";
      case "address":
        if (!trimmedValue) return "Address is required";
        return "";
      case "otp":
        if (!trimmedValue) return "OTP is required";
        if (!OTP_REGEX.test(trimmedValue))
          return "Enter the 6-digit OTP sent to your email";
        return "";
      default:
        return "";
    }
  };

  const runValidationForField = (field, value, options = {}) => {
    const message = validateField(field, value, options);
    setFieldErrors((prev) => ({ ...prev, [field]: message }));
    return !message;
  };

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    clearFormFeedback();
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Auto-detect admin email pattern
    if (name === "email" && value) {
      const emailLower = value.toLowerCase().trim();
      // Check for specific admin email or admin-related patterns
      const isAdminEmail =
        emailLower === "nadeem.rana0257@gmail.com" ||
        emailLower.includes("admin") ||
        emailLower.endsWith("@admin.farmconnect.com") ||
        emailLower.endsWith("@farmconnect.admin");

      if (isAdminEmail) {
        if (!showAdminOption) {
          setShowAdminOption(true);
        }
        // Automatically set role to Admin when admin email is detected
        if (role !== "Admin") {
          setRole("Admin");
          setIsSignup(false); // Admin can only login, not signup
        }
      } else if (!isAdminEmail && showAdminOption) {
        // Hide admin option if user changes to non-admin email
        setShowAdminOption(false);
        // Reset role if currently on Admin
        if (role === "Admin") {
          setRole("Farmer"); // Reset to default role
        }
      }
    }

    const validationOptions =
      name === "password" ? { enforceComplexity: isSignup } : undefined;
    setFieldErrors((prev) => ({
      ...prev,
      [name]: validateField(name, value, validationOptions),
    }));
  };

  const handleOtpInput = (value) => {
    clearFormFeedback();
    setOtp(value);
    setFieldErrors((prev) => ({
      ...prev,
      otp: validateField("otp", value),
    }));
  };

  const handleNewPasswordInput = (value) => {
    clearFormFeedback();
    setNewPassword(value);
    setFieldErrors((prev) => ({
      ...prev,
      newPassword: validateField("newPassword", value, {
        enforceComplexity: true,
        aliasFor: "password",
      }),
    }));
  };

  const handleCloseModal = () => {
    moveToStep("auth");
    setFormData({ ...INITIAL_FORM_DATA });
    setIsSignup(false);
    setShowPassword({ auth: false, reset: false });
    setShowAdminOption(false);
    setRole("Farmer");
    onClose();
  };

  const validateForm = () => {
    if (step === "forgot") {
      if (!runValidationForField("email", formData.email)) {
        setErrorMessage(
          validateField("email", formData.email) || "Enter a valid email"
        );
        return false;
      }

      return true;
    }

    if (step === "reset") {
      if (
        !runValidationForField("otp", otp, {
          aliasFor: "otp",
        })
      ) {
        setErrorMessage(
          validateField("otp", otp) || "Please enter the 6-digit OTP"
        );
        return false;
      }

      if (
        !runValidationForField("newPassword", newPassword, {
          enforceComplexity: true,
          aliasFor: "password",
        })
      ) {
        setErrorMessage(
          validateField("password", newPassword, {
            enforceComplexity: true,
          }) || "Password does not meet the requirements"
        );
        return false;
      }

      return true;
    }

    if (step === "auth") {
      if (!formData.email.trim()) {
        const message = "Please provide email";
        setFieldErrors((prev) => ({ ...prev, email: message }));
        setErrorMessage(message);
        return false;
      }

      if (!formData.password) {
        const message = "Please provide password";
        setFieldErrors((prev) => ({ ...prev, password: message }));
        setErrorMessage(message);
        return false;
      }

      if (!runValidationForField("email", formData.email)) {
        setErrorMessage(
          validateField("email", formData.email) || "Invalid email format"
        );
        return false;
      }

      if (isSignup) {
        const signupFields = ["name", "phone", "address"];
        for (const field of signupFields) {
          if (!runValidationForField(field, formData[field])) {
            setErrorMessage(
              validateField(field, formData[field]) || "Invalid input"
            );
            return false;
          }
        }

        if (
          !runValidationForField("password", formData.password, {
            enforceComplexity: true,
          })
        ) {
          setErrorMessage(
            validateField("password", formData.password, {
              enforceComplexity: true,
            }) || "Password does not meet the requirements"
          );
          return false;
        }
      }

      return true;
    }

    return true;
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    clearFormFeedback();
    setLoading(true);

    try {
      const apiBase = API_MAP[role];
      if (!apiBase) throw new Error("Invalid role selected");

      // Admin only supports login, not signup
      if (role === "Admin" && isSignup) {
        throw new Error(
          "Admin accounts cannot be created through this interface"
        );
      }

      // Admin uses different endpoint structure - try multiple possible endpoints
      let response;
      let data;
      const loginBody = {
        email: formData.email,
        password: formData.password,
      };

      if (role === "Admin") {
        // Admin login endpoint: /api/v1/admin/login (NOT /api/v1/auth/login)
        const adminLoginEndpoint = `${apiBase}/login`;

        try {
          response = await fetch(adminLoginEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(loginBody),
            credentials: "include",
          });

          const contentType = response.headers.get("content-type");
          if (!contentType || !contentType.includes("application/json")) {
            const text = await response.text();
            throw new Error(
              response.status === 404
                ? "Admin login endpoint not found. Please check the API endpoint."
                : response.status === 500
                ? "Server error. Please try again later."
                : `Unexpected response. Status: ${response.status}`
            );
          }

          data = await response.json();
          if (!response.ok) {
            throw new Error(data.message || "Authentication failed");
          }
        } catch (err) {
          throw err instanceof Error
            ? err
            : new Error(
                "Admin login failed. Please check your credentials or contact administrator."
              );
        }
      } else {
        // Regular user login (Farmer, Buyer, Supplier)
        const endpoint = isSignup ? `${apiBase}/new` : `${apiBase}/login`;
        const body = isSignup
          ? {
              name: formData.name,
              email: formData.email,
              password: formData.password,
              phone: formData.phone,
              address: formData.address,
            }
          : loginBody;

        response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          credentials: "include",
        });

        // Check if response is JSON before parsing
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          const text = await response.text();
          throw new Error(
            response.status === 404
              ? "Endpoint not found. Please check the API endpoint."
              : response.status === 500
              ? "Server error. Please try again later."
              : `Unexpected response. Status: ${response.status}`
          );
        }

        data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || "Authentication failed");
        }
      }

      if (isSignup) {
        setSuccessMessage(
          "✅ Registered! Check your email for a 6-digit OTP (valid for 30 minutes)."
        );
        moveToStep("otp");
      } else {
        const normalizedRole = role.toLowerCase();
        try {
          const profile = await fetchProfileForRole(normalizedRole);
          dispatch(
            setUser({
              name: profile.name,
              img: profile.img,
              email: profile.email,
              phone: profile.phone,
              address: profile.address,
            })
          );
        } catch (profileError) {
          // Don't show toast for admin or unsupported roles - they don't have profile endpoints
          if (
            normalizedRole !== "admin" &&
            !profileError.message?.includes("Unsupported")
          ) {
            toast.error(profileError.message);
          }
        }
        login(normalizedRole);

        setSuccessMessage("✅ Logged in successfully!");
        setLockoutMessage("");
        setTimeout(() => {
          onClose();
          if (normalizedRole === "farmer") navigate("/farmer");
          else if (normalizedRole === "buyer") navigate("/buyer");
          else if (normalizedRole === "admin") navigate("/admin");
          else navigate("/supplier");
        }, 1500);
      }
    } catch (err) {
      const serverMessage = err.message || "Server error";
      setErrorMessage(serverMessage);
      if (serverMessage.toLowerCase().includes("lock")) {
        setLockoutMessage(
          "Account locked due to repeated failed attempts. Try again in 30 minutes."
        );
      } else {
        setLockoutMessage("");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    clearFormFeedback();
    setLoading(true);

    try {
      const apiBase = API_MAP[role];
      const response = await fetch(`${apiBase}/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
        }),
      });

      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "Failed to send reset instructions");

      setSuccessMessage("📨 Reset instructions sent! Check your email/phone.");
      moveToStep("reset");
    } catch (err) {
      setErrorMessage(err.message || "Failed to process request");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    clearFormFeedback();
    setLoading(true);

    try {
      const apiBase = API_MAP[role];
      const response = await fetch(`${apiBase}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          otp,
          newPassword,
        }),
      });

      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "Password reset failed");

      setSuccessMessage("✅ Password reset successfully! You can now login.");
      setTimeout(() => {
        moveToStep("auth");
        setIsSignup(false);
      }, 2000);
    } catch (err) {
      setErrorMessage(err.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (
      !runValidationForField("otp", otp, {
        aliasFor: "otp",
      })
    ) {
      setErrorMessage(
        validateField("otp", otp) || "Enter the 6-digit OTP sent to your email"
      );
      return;
    }

    clearFormFeedback();
    setLoading(true);

    try {
      const res = await fetch(`${API_MAP[role]}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email, otp }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "OTP verification failed");

      setSuccessMessage("✅ Email verified! Please log in.");
      setTimeout(() => {
        moveToStep("auth");
        setIsSignup(false);
      }, 1500);
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!runValidationForField("email", formData.email)) {
      setErrorMessage(
        validateField("email", formData.email) ||
          "Enter the email used during signup"
      );
      return;
    }

    clearFormFeedback();
    setLoading(true);

    try {
      const res = await fetch(`${API_MAP[role]}/resendOTP`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to resend OTP");

      setSuccessMessage("📨 OTP resent to your email.");
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderAuthForm = () => (
    <AnimatePresence mode="wait">
      <motion.form
        key={isSignup ? "signup" : "login"}
        onSubmit={handleAuth}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.4 }}
        className="space-y-4"
      >
        {isSignup && (
          <AnimatePresence>
            {["name", "phone", "address"].map((field, i) => (
              <motion.div
                key={field}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * i }}
                className="space-y-1"
              >
                <input
                  type={field === "phone" ? "tel" : "text"}
                  name={field}
                  placeholder={
                    field === "name"
                      ? "Full Name"
                      : field === "phone"
                      ? "Phone Number (+92XXXXXXXXXX)"
                      : "Address"
                  }
                  value={formData[field]}
                  onChange={handleChange}
                  className="w-full p-2.5 sm:p-3 rounded-lg bg-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-green-400 border border-white/20 text-sm sm:text-base"
                  aria-invalid={Boolean(fieldErrors[field])}
                />
                <InlineError message={fieldErrors[field]} />
              </motion.div>
            ))}
          </AnimatePresence>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: isSignup ? 0.4 : 0.1 }}
          className="space-y-1"
        >
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            className="w-full p-2.5 sm:p-3 rounded-lg bg-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-green-400 border border-white/20 text-sm sm:text-base"
            aria-invalid={Boolean(fieldErrors.email)}
            required
          />
          <InlineError message={fieldErrors.email} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: isSignup ? 0.5 : 0.2 }}
          className="space-y-2"
        >
          <div className="relative">
            <input
              type={showPassword.auth ? "text" : "password"}
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              className="w-full p-3 pr-12 rounded-lg bg-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-green-400 border border-white/20"
              aria-invalid={Boolean(fieldErrors.password)}
              required
            />
            <button
              type="button"
              onClick={() =>
                setShowPassword((prev) => ({ ...prev, auth: !prev.auth }))
              }
              className="absolute inset-y-0 right-3 flex items-center text-white/70 hover:text-white focus:outline-none"
              aria-label={`${showPassword.auth ? "Hide" : "Show"} password`}
            >
              {showPassword.auth ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
          <InlineError message={fieldErrors.password} />
          {isSignup && <PasswordChecklist password={formData.password} />}
        </motion.div>

        {!isSignup && step === "auth" && lockoutMessage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="text-xs text-amber-100/90 bg-amber-900/30 border border-amber-500/30 rounded-lg p-3"
          >
            {lockoutMessage}
          </motion.div>
        )}

        {!isSignup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-right"
          >
            <button
              type="button"
              onClick={() => {
                moveToStep("forgot");
              }}
              className="text-sm text-green-300 hover:text-green-200 underline focus:outline-none"
            >
              Forgot Password?
            </button>
          </motion.div>
        )}

        <FormMessages error={errorMessage} success={successMessage} />

        <motion.button
          type="submit"
          disabled={loading}
          className={`w-full py-2.5 sm:py-3 rounded-lg flex items-center justify-center font-medium text-sm sm:text-base ${
            loading
              ? "bg-gray-500 cursor-not-allowed"
              : "bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600"
          } text-white transition-all shadow-lg`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: isSignup ? 0.6 : 0.4 }}
          whileHover={!loading ? { scale: 1.02 } : {}}
          whileTap={!loading ? { scale: 0.98 } : {}}
        >
          {loading ? (
            <span className="flex items-center">
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="inline-block h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2"
              />
              Processing...
            </span>
          ) : isSignup ? (
            "Create Account"
          ) : (
            "Sign In"
          )}
        </motion.button>
      </motion.form>
    </AnimatePresence>
  );

  const renderForgotPasswordForm = () => (
    <motion.form
      onSubmit={handleForgotPassword}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-white/80 text-center mb-4"
      >
        Enter your email to receive password reset instructions
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="space-y-1"
      >
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          className="w-full p-2.5 sm:p-3 rounded-lg bg-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-green-400 border border-white/20 text-sm sm:text-base"
          aria-invalid={Boolean(fieldErrors.email)}
        />
        <InlineError message={fieldErrors.email} />
      </motion.div>

      <FormMessages error={errorMessage} success={successMessage} />

      <motion.div
        className="flex space-x-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <motion.button
          type="submit"
          disabled={loading}
          className="flex-1 py-3 rounded-lg bg-green-500 hover:bg-green-600 text-white font-medium transition-all"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="inline-block h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2"
              />
              Sending...
            </span>
          ) : (
            "Send Reset Link"
          )}
        </motion.button>

        <motion.button
          type="button"
          onClick={() => {
            moveToStep("auth");
          }}
          className="flex-1 py-3 rounded-lg bg-gray-500 hover:bg-gray-600 text-white font-medium transition-all"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Cancel
        </motion.button>
      </motion.div>
    </motion.form>
  );

  const renderResetPasswordForm = () => (
    <motion.form
      onSubmit={handleResetPassword}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-white/80 text-center mb-4"
      >
        Enter the OTP you received and your new password
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="space-y-1"
      >
        <input
          type="text"
          value={otp}
          onChange={(e) => handleOtpInput(e.target.value)}
          placeholder="Enter OTP"
          className="w-full p-2.5 sm:p-3 rounded-lg bg-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-green-400 border border-white/20 text-sm sm:text-base"
          aria-invalid={Boolean(fieldErrors.otp)}
        />
        <InlineError message={fieldErrors.otp} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="space-y-2"
      >
        <div className="relative">
          <input
            type={showPassword.reset ? "text" : "password"}
            value={newPassword}
            onChange={(e) => handleNewPasswordInput(e.target.value)}
            placeholder="New Password"
            className="w-full p-3 pr-12 rounded-lg bg-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-green-400 border border-white/20"
            aria-invalid={Boolean(fieldErrors.newPassword)}
          />
          <button
            type="button"
            onClick={() =>
              setShowPassword((prev) => ({ ...prev, reset: !prev.reset }))
            }
            className="absolute inset-y-0 right-3 flex items-center text-white/70 hover:text-white focus:outline-none"
            aria-label={`${showPassword.reset ? "Hide" : "Show"} password`}
          >
            {showPassword.reset ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
        <InlineError message={fieldErrors.newPassword} />
        <PasswordChecklist password={newPassword} />
      </motion.div>

      <FormMessages error={errorMessage} success={successMessage} />

      <motion.div
        className="flex space-x-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <motion.button
          type="submit"
          disabled={loading}
          className="flex-1 py-3 rounded-lg bg-green-500 hover:bg-green-600 text-white font-medium transition-all"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="inline-block h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2"
              />
              Resetting...
            </span>
          ) : (
            "Reset Password"
          )}
        </motion.button>

        <motion.button
          type="button"
          onClick={() => {
            moveToStep("auth");
          }}
          className="flex-1 py-3 rounded-lg bg-gray-500 hover:bg-gray-600 text-white font-medium transition-all"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Cancel
        </motion.button>
      </motion.div>
    </motion.form>
  );

  const renderOTPForm = () => (
    <motion.div
      className="space-y-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-center text-white/80 mb-4"
      >
        We've sent a 6-digit code to {formData.email}
      </motion.div>

      <motion.div
        className="space-y-1"
        initial="hidden"
        animate="visible"
        variants={inputVariants}
        transition={{ delay: 0.5 }}
      >
        <input
          type="text"
          value={otp}
          onChange={(e) => handleOtpInput(e.target.value)}
          placeholder="Enter OTP"
          className="w-full p-2.5 sm:p-3 rounded-lg bg-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-green-400 border border-white/20 text-sm sm:text-base"
          aria-invalid={Boolean(fieldErrors.otp)}
        />
        <InlineError message={fieldErrors.otp} />
      </motion.div>

      <motion.p
        className="text-xs text-white/70"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.55 }}
      >
        OTP codes expire 30 minutes after they are issued.
      </motion.p>

      <FormMessages error={errorMessage} success={successMessage} />

      <motion.div
        className="flex space-x-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <motion.button
          onClick={handleVerifyOTP}
          disabled={loading}
          className="flex-1 py-3 rounded-lg bg-green-500 hover:bg-green-600 text-white font-medium transition-all"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="inline-block h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2"
              />
              Verifying...
            </span>
          ) : (
            "Verify OTP"
          )}
        </motion.button>

        <motion.button
          onClick={handleResendOTP}
          disabled={loading}
          className="flex-1 py-3 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium transition-all"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {loading ? "Resending..." : "Resend OTP"}
        </motion.button>
      </motion.div>
    </motion.div>
  );

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-start sm:items-center z-50 p-2 sm:p-4 overflow-y-auto"
        onClick={(e) => {
          // Close modal when clicking outside
          if (e.target === e.currentTarget) {
            handleCloseModal();
          }
        }}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 50 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 50 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          className="bg-gradient-to-br from-green-900/30 to-blue-900/30 border border-white/20 backdrop-blur-lg p-4 sm:p-6 md:p-8 rounded-2xl shadow-2xl w-full max-w-md max-h-[95vh] relative overflow-y-auto scrollbar-hide"
          style={{ margin: "1rem" }}
        >
          <button
            type="button"
            onClick={handleCloseModal}
            className="fixed top-4 right-4 sm:absolute sm:top-4 sm:right-4 bg-white/25 hover:bg-white/35 text-white p-2 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white/50 z-[60] flex items-center justify-center min-w-[36px] min-h-[36px] shadow-xl backdrop-blur-sm"
            aria-label="Close authentication modal"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          {/* Decorative elements */}
          <motion.div
            className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-green-500/20 blur-xl"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.2, 0.3, 0.2],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <motion.div
            className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-blue-500/20 blur-xl"
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.2, 0.4, 0.2],
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1,
            }}
          />

          <div className="relative z-10 pt-8 sm:pt-0">
            <motion.h2
              className="text-2xl sm:text-3xl font-bold text-center text-white mb-4 sm:mb-6"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {step === "otp"
                ? "Verify Your Email"
                : step === "forgot"
                ? "Reset Password"
                : step === "reset"
                ? "Create New Password"
                : isSignup
                ? `Join as ${role}`
                : `Welcome Back ${role}`}
            </motion.h2>

            {step === "auth" && (
              <motion.div
                className="flex justify-center flex-wrap gap-3 mb-6"
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={{
                  visible: {
                    transition: {
                      staggerChildren: 0.1,
                    },
                  },
                }}
              >
                {showAdminOption ? (
                  // Show only Admin button when admin email is detected
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    onClick={() => {
                      setRole("Admin");
                      setIsSignup(false); // Admin can only login, not signup
                      setFieldErrors({});
                      clearFormFeedback();
                    }}
                    className="px-4 py-2 rounded-full text-sm font-medium transition-all bg-purple-500/90 text-white shadow-lg shadow-purple-500/20"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Admin
                  </motion.button>
                ) : (
                  // Show regular role selection tabs (Farmer, Buyer, Supplier)
                  <>
                    {["Farmer", "Buyer", "Supplier"].map((r) => (
                      <motion.button
                        key={r}
                        onClick={() => {
                          setRole(r);
                          setFieldErrors({});
                          clearFormFeedback();
                        }}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                          role === r
                            ? "bg-green-500/90 text-white shadow-lg shadow-green-500/20"
                            : "bg-white/10 text-white hover:bg-white/20"
                        }`}
                        variants={roleVariants}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {r}
                      </motion.button>
                    ))}
                    {/* Hidden Admin Option - appears when logo clicked 5 times or other trigger */}
                    {role === "Admin" && (
                      <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        onClick={() => {
                          setRole("Admin");
                          setIsSignup(false); // Admin can only login, not signup
                          setFieldErrors({});
                          clearFormFeedback();
                        }}
                        className="px-4 py-2 rounded-full text-sm font-medium transition-all bg-purple-500/90 text-white shadow-lg shadow-purple-500/20"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        Admin
                      </motion.button>
                    )}
                  </>
                )}
              </motion.div>
            )}

            {step === "otp"
              ? renderOTPForm()
              : step === "forgot"
              ? renderForgotPasswordForm()
              : step === "reset"
              ? renderResetPasswordForm()
              : renderAuthForm()}

            {step === "auth" && (
              <motion.p
                className="text-center text-white/70 mt-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
              >
                {role === "Admin" ? (
                  <span className="text-xs text-purple-200">
                    Admin accounts can only login. Contact system administrator
                    for access.
                  </span>
                ) : (
                  <>
                    {isSignup
                      ? "Already have an account?"
                      : "New to FarmConnect?"}
                    <motion.button
                      onClick={() => {
                        setIsSignup((prev) => !prev);
                        setFieldErrors({});
                        clearFormFeedback();
                        setShowPassword((prev) => ({ ...prev, auth: false }));
                      }}
                      className="ml-2 text-green-300 hover:text-green-200 font-medium focus:outline-none"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {isSignup ? "Sign In" : "Create Account"}
                    </motion.button>
                  </>
                )}
              </motion.p>
            )}

            {(step === "reset" || step === "otp") && (
              <motion.button
                onClick={() => {
                  moveToStep("auth");
                }}
                className="mt-4 w-full py-2 rounded-lg bg-gray-500/80 hover:bg-gray-600 text-white font-medium transition-all flex items-center justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-1"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z"
                    clipRule="evenodd"
                  />
                </svg>
                Back to {isSignup ? "Sign Up" : "Login"}
              </motion.button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

const FormMessages = ({ error, success }) => (
  <AnimatePresence>
    {error && (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="text-red-300 text-sm p-3 bg-red-900/30 rounded-lg border border-red-500/30 flex items-center"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 mr-2"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
        {error}
      </motion.div>
    )}

    {success && (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="text-green-300 text-sm p-3 bg-green-900/30 rounded-lg border border-green-500/30 flex items-center"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 mr-2"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
        {success}
      </motion.div>
    )}
  </AnimatePresence>
);

const InlineError = ({ message }) =>
  message ? <p className="text-xs text-red-200">{message}</p> : null;

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
    <ul className="text-xs text-white/80 space-y-1">
      {items.map(({ key, label }) => (
        <li
          key={key}
          className={`flex items-center ${
            checklist[key] ? "text-green-300" : "text-white/50"
          }`}
        >
          <span className="mr-2 text-sm">{checklist[key] ? "✔" : "•"}</span>
          {label}
        </li>
      ))}
    </ul>
  );
};

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
  </svg>
);

export default AuthModal;
