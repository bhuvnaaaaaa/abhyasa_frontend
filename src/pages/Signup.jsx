import { useState, useEffect, useCallback, useRef } from "react";
import axios from "../api/axios";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { isActiveWithinHours, setLastActive, getToken } from "../utils/auth";
import { useAuth } from "../auth/AuthContext";
import "../assets/css/UnifiedAuth.css";

export default function Signup({ isModal = false, onSuccess, initialIsLogin = false }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();
  const redirectTo = location.state?.from || "/dashboard";
  const firstInputRef = useRef(null);
  const abortControllerRef = useRef(null);

  const [isLogin, setIsLogin] = useState(initialIsLogin);
  const [registrationType, setRegistrationType] = useState("email");

  const [formData, setFormData] = useState({
    name: "",
    email: location.state?.email || "",
    phone: "",
    identifier: location.state?.email || "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState(() => location.state?.message || "");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState({});
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [verifyingEmail, setVerifyingEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  useEffect(() => {
    const token = getToken();
    if ((token && isActiveWithinHours(48)) || isAuthenticated) {
      if (isModal && onSuccess) {
        onSuccess();
      } else {
        navigate(redirectTo, { replace: true });
      }
    } else {
      setTimeout(() => firstInputRef.current?.focus(), 100);
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [isAuthenticated, isModal, navigate, onSuccess, redirectTo]);

  const setRegistrationTypeWithClear = (type) => {
    setRegistrationType(type);
    setFormData(prev => ({
      ...prev,
      email: type === "email" ? prev.email : "",
      phone: type === "phone" ? prev.phone : ""
    }));
    setErrors(prev => ({ ...prev, email: "", phone: "" }));
    setTouched(prev => ({ ...prev, email: false, phone: false }));
  };

  const validateField = useCallback((name, value) => {
    const error = {};

    switch (name) {
      case "name":
        if (!value.trim()) {
          error.name = "Full name is required";
        } else if (value.trim().length < 2) {
          error.name = "Name must be at least 2 characters";
        }
        break;

      case "email":
        if (!value.trim()) {
          error.email = "Email address is required";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
          error.email = "Please enter a valid email address";
        }
        break;

      case "phone":
        if (!value.trim()) {
          error.phone = "Mobile number is required";
        } else if (!/^[6-9]\d{9}$/.test(value.trim())) {
          error.phone = "Please enter a valid 10-digit mobile number";
        }
        break;

      case "identifier":
        if (!value.trim()) {
          error.identifier = "Email or phone number is required";
        }
        break;

      case "password":
        if (!value) {
          error.password = "Password is required";
        } else if (value.length < 8) {
          error.password = "Password must be at least 8 characters";
        } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) {
          error.password = "Password must contain uppercase, lowercase and number";
        }
        break;

      case "confirmPassword":
        if (!value) {
          error.confirmPassword = "Please confirm your password";
        } else if (value !== formData.password) {
          error.confirmPassword = "Passwords do not match";
        }
        break;
    }

    return error;
  }, [formData.password]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setGeneralError("");
    setSuccessMessage("");

    if (touched[name]) {
      const fieldError = validateField(name, value);
      setErrors(prev => ({ ...prev, ...fieldError }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    const fieldError = validateField(name, value);
    setErrors(prev => ({ ...prev, ...fieldError }));
  };

  const validateSignupForm = useCallback(() => {
    const nameError = validateField("name", formData.name);
    const contactError = registrationType === "email"
      ? validateField("email", formData.email)
      : validateField("phone", formData.phone);
    const passwordError = validateField("password", formData.password);
    const confirmError = validateField("confirmPassword", formData.confirmPassword);

    const allErrors = { ...nameError, ...contactError, ...passwordError, ...confirmError };
    setErrors(allErrors);

    const allTouched = {
      name: true,
      [registrationType]: true,
      password: true,
      confirmPassword: true
    };
    setTouched(prev => ({ ...prev, ...allTouched }));

    return Object.keys(allErrors).length === 0;
  }, [formData, registrationType, validateField]);

  const validateLoginForm = useCallback(() => {
    const identifierError = validateField("identifier", formData.identifier);
    const passwordError = validateField("password", formData.password);

    const allErrors = { ...identifierError, ...passwordError };
    setErrors(allErrors);
    setTouched({ identifier: true, password: true });

    return Object.keys(allErrors).length === 0;
  }, [formData, validateField]);

  const handleSignup = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (isLoading) return;
    setGeneralError("");

    if (!validateSignupForm()) return;

    setIsLoading(true);
    abortControllerRef.current = new AbortController();

    try {
      const signupData = {
        name: formData.name.trim(),
        password: formData.password,
        ...(registrationType === "email"
          ? { email: formData.email.trim().toLowerCase() }
          : { phone: formData.phone.trim() }
        )
      };

      const response = await axios.post("/auth/register", signupData, {
        signal: abortControllerRef.current.signal,
        timeout: 20000
      });

      if (response.data?.requireOtp) {
        setVerifyingEmail(response.data.email || signupData.email);
        setIsVerifyingOtp(true);
        setResendCooldown(30);
        setSuccessMessage("Verification code sent! Please check your email inbox and enter the 6-digit OTP below.");
        return;
      }

      if (response.data?.token) {
        login(response.data.token);
        localStorage.setItem("hasPaid", String(response.data.payment ?? false));
        setLastActive();
        setSuccessMessage("Account created successfully! Redirecting...");
        setTimeout(() => {
          if (isModal && onSuccess) {
            onSuccess();
          } else {
            navigate(redirectTo, { replace: true });
          }
        }, 1200);
      }
    } catch (err) {
      if (err.name === 'CanceledError') return;

      console.error("Signup error:", err);

      if (!navigator.onLine) {
        setGeneralError("No internet connection. Please check your network.");
      } else if (err.code === 'ECONNABORTED') {
        setGeneralError("Request timed out. Please try again.");
      } else if (err.response) {
        const status = err.response.status;
        const message = err.response.data?.message || "Registration failed";

        if (status === 409) {
          setGeneralError("An account with this email/phone already exists. Please log in.");
          setTimeout(() => setIsLogin(true), 2000);
        } else if (status === 400) {
          setGeneralError(message);
        } else if (status === 429) {
          setGeneralError("Too many attempts. Please try again later.");
        } else {
          setGeneralError(message);
        }
      } else {
        setGeneralError("Server is unavailable. Please try again later.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (isLoading) return;
    if (!otp.trim() || otp.trim().length !== 6) {
      setGeneralError("Please enter the complete 6-digit verification code");
      return;
    }

    setIsLoading(true);
    setGeneralError("");
    setSuccessMessage("");

    try {
      const res = await axios.post("/auth/verify-registration-otp", {
        email: verifyingEmail,
        otp: otp.trim()
      });

      if (res.data?.token) {
        login(res.data.token);
        localStorage.setItem("hasPaid", String(res.data.user?.payment ?? false));
        setLastActive();
        setSuccessMessage("Email verified successfully! Welcome to Abhyasa.");
        setTimeout(() => {
          if (isModal && onSuccess) {
            onSuccess();
          } else {
            navigate(redirectTo, { replace: true });
          }
        }, 1000);
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Invalid or expired verification code. Please try again.";
      setGeneralError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isLoading) return;
    setIsLoading(true);
    setGeneralError("");
    try {
      await axios.post("/auth/resend-registration-otp", { email: verifyingEmail });
      setResendCooldown(30);
      setSuccessMessage("A fresh verification code has been sent to your email.");
    } catch (err) {
      setGeneralError(err.response?.data?.message || "Failed to resend code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (isLoading) return;
    setGeneralError("");

    if (!validateLoginForm()) return;

    setIsLoading(true);
    abortControllerRef.current = new AbortController();

    try {
      const idVal = formData.identifier.trim();
      const res = await axios.post("/auth/login", {
        email: idVal,
        identifier: idVal,
        password: formData.password
      }, {
        signal: abortControllerRef.current.signal,
        timeout: 15000
      });

      login(res.data.token);
      localStorage.setItem("hasPaid", String(res.data.payment ?? false));
      setLastActive();

      setSuccessMessage("Logged in successfully! Redirecting...");

      const targetRoute = res.data.role === "admin" ? "/admin" : redirectTo;

      setTimeout(() => {
        if (isModal && onSuccess) {
          onSuccess();
        } else {
          navigate(targetRoute, { replace: true });
        }
      }, 800);

    } catch (err) {
      if (err.name === 'CanceledError') return;

      if (!navigator.onLine) {
        setGeneralError("No internet connection. Please check your network.");
      } else if (err.code === 'ECONNABORTED') {
        setGeneralError("Request timed out. Please try again.");
      } else if (err.response) {
        const status = err.response.status;
        const message = err.response.data?.message || "Login failed";

        if (status === 403 && err.response.data?.code === "EMAIL_NOT_VERIFIED") {
          const unverifiedEmail = err.response.data?.email || formData.identifier.trim();
          setVerifyingEmail(unverifiedEmail);
          setIsVerifyingOtp(true);
          setResendCooldown(30);
          setGeneralError("Please verify your email address to log in. We've sent a code to your email.");
          return;
        }

        if (status === 401) {
          setGeneralError("Invalid credentials. Please check your password.");
        } else if (status === 404) {
          const notFoundMsg = err.response.data?.message || "User not registered. Please sign up.";
          setIsLogin(false);
          setFormData(prev => ({
            ...prev,
            email: prev.identifier || prev.email,
            identifier: prev.identifier || prev.email,
          }));
          setGeneralError(notFoundMsg);
        } else {
          setGeneralError(message);
        }
      } else {
        setGeneralError("Server is unavailable. Please try again later.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAuthMode = () => {
    setIsVerifyingOtp(false);
    setIsLogin(!isLogin);
    setErrors({});
    setGeneralError("");
    setSuccessMessage("");
    setTouched({});
    setFormData({
      name: "",
      email: "",
      phone: "",
      identifier: "",
      password: "",
      confirmPassword: "",
    });
    setTimeout(() => firstInputRef.current?.focus(), 100);
  };

  return (
    <div className="unified-auth">
      <div className="auth-card">
        <div className="auth-header">
          <h2>
            {isVerifyingOtp
              ? "Verify Your Email"
              : isLogin
              ? "Welcome Back"
              : "Create Your Account"}
          </h2>
          <p>
            {isVerifyingOtp
              ? "Enter the 6-digit verification code sent to your inbox"
              : isLogin
              ? "Sign in to continue your learning journey"
              : "Join Abhyasa and start your learning journey today"
            }
          </p>
        </div>

        {generalError && (
          <div className="auth-message error" role="alert" style={{background: '#ffebee', borderLeftColor: '#f44336', color: '#c62828'}}>
            <span>⚠</span> {generalError}
          </div>
        )}

        {successMessage && (
          <div className="auth-message" role="alert">
            <span>✓</span> {successMessage}
          </div>
        )}

        {isVerifyingOtp ? (
          <form className="auth-form" onSubmit={handleVerifyOtp} noValidate>
            <div style={{ textAlign: "center", marginBottom: "18px" }}>
              <div style={{ fontSize: "36px", marginBottom: "6px" }}>📩</div>
              <p style={{ fontSize: "14px", color: "#475569", margin: "0 0 4px" }}>
                We sent a 6-digit verification code to
              </p>
              <strong style={{ fontSize: "15px", color: "#0f766e", wordBreak: "break-all" }}>
                {verifyingEmail}
              </strong>
            </div>

            <div className="input-group">
              <input
                id="otp"
                name="otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={otp}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setOtp(val);
                  setGeneralError("");
                }}
                disabled={isLoading}
                placeholder="• • • • • •"
                autoFocus
                style={{
                  fontSize: "24px",
                  fontWeight: "700",
                  letterSpacing: "12px",
                  textAlign: "center",
                  padding: "14px",
                  borderRadius: "8px",
                  border: "2px solid #0f766e",
                  background: "#f0fdfa",
                }}
              />
            </div>

            <button
              className="auth-button"
              type="submit"
              disabled={isLoading || otp.length !== 6}
              aria-busy={isLoading}
              style={{
                marginTop: "10px",
                opacity: isLoading || otp.length !== 6 ? 0.6 : 1,
              }}
            >
              {isLoading ? (
                <>
                  <span className="loading-spinner"></span>
                  Verifying Code...
                </>
              ) : (
                "Verify & Complete Registration"
              )}
            </button>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px", fontSize: "13px" }}>
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resendCooldown > 0 || isLoading}
                style={{
                  background: "none",
                  border: "none",
                  color: resendCooldown > 0 ? "#94a3b8" : "#0f766e",
                  cursor: resendCooldown > 0 ? "default" : "pointer",
                  fontWeight: 600,
                  padding: 0,
                  fontSize: "13px",
                }}
              >
                {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend Code"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsVerifyingOtp(false);
                  setOtp("");
                  setGeneralError("");
                  setSuccessMessage("");
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "#64748b",
                  cursor: "pointer",
                  padding: 0,
                  fontSize: "13px",
                  textDecoration: "underline",
                }}
              >
                Change Email
              </button>
            </div>
          </form>
        ) : isLogin ? (
          <form className="auth-form" onSubmit={handleLogin} noValidate>
          <div className="input-group">
            <input
              ref={firstInputRef}
              id="identifier"
              className={`${errors.identifier && touched.identifier ? 'error' : ''}`}
                name="identifier"
                type="text"
                autoComplete="username"
                value={formData.identifier}
                onChange={handleChange}
                onBlur={handleBlur}
                disabled={isLoading}
                placeholder="Enter your email or phone"
              />
            {errors.identifier && touched.identifier && (
              <span className="error-text" role="alert">{errors.identifier}</span>
            )}
            </div>

          <div className="input-group">
            <div className="password-input-wrapper">
              <input
                id="login-password"
                className={`${errors.password && touched.password ? 'error' : ''}`}
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={formData.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  disabled={isLoading}
                  placeholder="Enter your password"
                />
              <button
                type="button"
                className="password-toggle"
                  onClick={() => setShowPassword(prev => !prev)}
                  disabled={isLoading}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "👁️" : "👁️‍🗨️"}
                </button>
              </div>
            {errors.password && touched.password && (
              <span className="error-text" role="alert">{errors.password}</span>
            )}
          </div>

          <div style={{ textAlign: "right", margin: "-6px 0 12px 0" }}>
            <Link to="/forgot-password" className="auth-link" style={{ color: "#0f766e", fontWeight: 500, fontSize: "14px", textDecoration: "none" }}>
              Forgot password?
            </Link>
          </div>

          <button
            className="auth-button"
              type="submit"
              disabled={isLoading}
              aria-busy={isLoading}
            >
            {isLoading ? (
              <>
                <span className="loading-spinner"></span>
                Signing In...
              </>
            ) : (
              "Login"
            )}
            </button>
          </form>
        ) : (
          <>
            <div className="registration-options">
              <button
                type="button"
                className={`registration-button ${registrationType === "email" ? 'active' : ''}`}
                onClick={() => setRegistrationTypeWithClear("email")}
                disabled={isLoading}
              >
                📧 Email
              </button>
              <button
                type="button"
                className={`registration-button ${registrationType === "phone" ? 'active' : ''}`}
                onClick={() => setRegistrationTypeWithClear("phone")}
                disabled={isLoading}
              >
                📱 Mobile
              </button>
            </div>

            <form className="auth-form" onSubmit={handleSignup} noValidate>
              <div className="input-group">
                <input
                  ref={firstInputRef}
                  id="name"
                  className={`${errors.name && touched.name ? 'error' : ''}`}
                  name="name"
                  type="text"
                  autoComplete="name"
                  value={formData.name}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  disabled={isLoading}
                  placeholder="Enter your full name"
                />
                {errors.name && touched.name && (
                  <span className="error-text" role="alert">{errors.name}</span>
                )}
              </div>

              {registrationType === "email" ? (
                <div className="input-group">
                  <input
                    id="email"
                    className={`${errors.email && touched.email ? 'error' : ''}`}
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={formData.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    disabled={isLoading}
                    placeholder="Enter your email address"
                  />
                  {errors.email && touched.email && (
                    <span className="error-text" role="alert">{errors.email}</span>
                  )}
                </div>
              ) : (
                <div className="input-group">
                  <input
                    id="phone"
                    className={`${errors.phone && touched.phone ? 'error' : ''}`}
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    disabled={isLoading}
                    placeholder="Enter 10-digit mobile number"
                  />
                  {errors.phone && touched.phone && (
                    <span className="error-text" role="alert">{errors.phone}</span>
                  )}
                </div>
              )}

              <div className="input-group">
                <div className="password-input-wrapper">
                  <input
                    id="password"
                    className={`${errors.password && touched.password ? 'error' : ''}`}
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={formData.password}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    disabled={isLoading}
                    placeholder="Create a strong password"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(prev => !prev)}
                    disabled={isLoading}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? "👁️" : "👁️‍🗨️"}
                  </button>
                </div>
                {errors.password && touched.password && (
                  <span className="error-text" role="alert">{errors.password}</span>
                )}
              </div>

              <div className="input-group">
                <input
                  id="confirmPassword"
                  className={`${errors.confirmPassword && touched.confirmPassword ? 'error' : ''}`}
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  disabled={isLoading}
                  placeholder="Confirm your password"
                />
                {errors.confirmPassword && touched.confirmPassword && (
                  <span className="error-text" role="alert">{errors.confirmPassword}</span>
                )}
              </div>

              <button
                className="auth-button"
                type="submit"
                disabled={isLoading}
                aria-busy={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="loading-spinner"></span>
                    Creating Account...
                  </>
                ) : (
                  "Create Account"
                )}
              </button>
            </form>
          </>
        )}

        {!isVerifyingOtp && (
          <div className="auth-toggle">
            <p>
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button type="button" className="toggle-button" onClick={toggleAuthMode}>
                {isLogin ? "Sign up now" : "Log in instead"}
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
