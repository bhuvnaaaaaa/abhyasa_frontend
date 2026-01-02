import { useState, useEffect } from "react";
import axios from "../api/axios";
import { useNavigate } from "react-router-dom";
import { setToken, setLastActive, getToken } from "../utils/auth";
import "../assets/css/UnifiedAuth.css";

export default function Signup({ isModal = false, onSuccess }) {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(false); // toggle between signup and login
  const [registrationType, setRegistrationType] = useState("email"); // "email" or "phone"
  const setRegistrationTypeWithClear = (type) => {
    setRegistrationType(type);
    setFormData({ ...formData, [type === "email" ? "phone" : "email"]: "" });
  };
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    identifier: "", // for login
    password: "",
  });
  const [errors, setErrors] = useState({});
  const [showPopup, setShowPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");
  const [popupType, setPopupType] = useState("success");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (token) {
      // Already signed in, show alert
      alert("You're already logged in");
      navigate("/");
    }
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    if (errors[name]) {
      setErrors({ ...errors, [name]: "" });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (registrationType === "email") {
      if (!formData.email.trim()) {
        newErrors.email = "Email is required";
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = "Please enter a valid email address";
      }
    } else {
      if (!formData.phone.trim()) {
        newErrors.phone = "Mobile number is required";
      } else if (!/^[6-9]\d{9}$/.test(formData.phone)) {
        newErrors.phone = "Please enter a valid 10-digit mobile number";
      }
    }

    if (!formData.password.trim()) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const showNotification = (message, type = "success") => {
    setPopupMessage(message);
    setPopupType(type);
    setShowPopup(true);
    setTimeout(() => setShowPopup(false), 4000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const signupData = {
        name: formData.name,
        ...(formData.email && { email: formData.email }),
        ...(formData.phone && { phone: formData.phone }),
        password: formData.password,
      };

      const response = await axios.post("/auth/register", signupData);

      // Backend already auto-logs in, just handle the response
      setToken(response.data.token);
      localStorage.setItem("hasPaid", response.data.payment.toString());
      setLastActive();

      showNotification("Registration successful! Welcome!", "success");

      setTimeout(() => {
        if (isModal && onSuccess) {
          onSuccess();
        } else {
          navigate("/");
        }
      }, 2000);

    } catch (err) {
      console.error("Signup error:", err);
      const serverMsg = err.response?.data?.message;
      const status = err.response?.status;

      if (status === 409 && serverMsg?.toLowerCase().includes('already exists')) {
        showNotification("You are already registered, please log in instead!", "error");
      } else if (serverMsg) {
        showNotification(`Registration failed: ${serverMsg}`, "error");
      } else {
        showNotification("Registration failed. Please check your information and try again.", "error");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    setErrors({});
    setFormData({
      name: "",
      email: "",
      phone: "",
      identifier: "",
      password: "",
    });
  };

  return (
    <div className="unified-auth">
      <div className="auth-bg-gradient"></div>

      {showPopup && (
        <div className="auth-message">
          <span className="popup-icon">{popupType === "success" ? "✓" : "✕"}</span>
          {popupMessage}
        </div>
      )}
      <div className="auth-card">
        <div className="auth-header">
          <h2>{isLogin ? "Welcome Back" : "Create Account"}</h2>
          <p>{isLogin ? "Sign in to continue your learning journey" : "Join Abhyasa and start your learning journey"}</p>
        </div>

        {isLogin ? (
          <form className="auth-form" onSubmit={async (e) => {
            e.preventDefault();
            setIsLoading(true);
            try {
              const res = await axios.post("/auth/login", {
                identifier: formData.identifier,
                password: formData.password
              });
              localStorage.setItem("token", res.data.token);
              localStorage.setItem("hasPaid", res.data.payment.toString());
              setLastActive();
              showNotification("Logged in successfully!", "success");
              setTimeout(() => {
                if (isModal && onSuccess) {
                  onSuccess();
                } else {
                  navigate("/");
                }
              }, 1500);
            } catch (err) {
              const status = err.response?.status;
              const message = err.response?.data?.message || "Login failed. Please check your credentials.";
              if (status === 404 && message.includes("not found")) {
                showNotification(`${message} Redirecting to signup...`, "info");
                setTimeout(() => {
                  setIsLogin(false);
                }, 3000);
              } else {
                showNotification(message, "error");
              }
            } finally {
              setIsLoading(false);
            }
          }}>
            <div className="input-group">
              <input
                className={`input ${errors.identifier ? 'error' : ''}`}
                name="identifier"
                value={formData.identifier}
                onChange={handleChange}
                placeholder="Email or phone number"
                disabled={isLoading}
              />
              {errors.identifier && <span className="error-text">{errors.identifier}</span>}
            </div>

            <div className="input-group">
              <div className="password-input-wrapper">
                <input
                  className={`input ${errors.password ? 'error' : ''}`}
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? "👁" : "⌣"}
                </button>
              </div>
              {errors.password && <span className="error-text">{errors.password}</span>}
            </div>

            <button
              className="auth-button"
              type="submit"
              disabled={isLoading}
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
                Register with Email
              </button>
              <button
                type="button"
                className={`registration-button ${registrationType === "phone" ? 'active' : ''}`}
                onClick={() => setRegistrationTypeWithClear("phone")}
                disabled={isLoading}
              >
                Register with Mobile Number
              </button>
            </div>

            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="input-group">
                <input
                  className={`input ${errors.name ? 'error' : ''}`}
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Full Name"
                  disabled={isLoading}
                />
                {errors.name && <span className="error-text">{errors.name}</span>}
              </div>

              {registrationType === "email" ? (
                <div className="input-group">
                  <input
                    className={`input ${errors.email ? 'error' : ''}`}
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Email"
                    disabled={isLoading}
                  />
                  {errors.email && <span className="error-text">{errors.email}</span>}
                </div>
              ) : (
                <div className="input-group">
                  <input
                    className={`input ${errors.phone ? 'error' : ''}`}
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="Mobile Number"
                    disabled={isLoading}
                  />
                  {errors.phone && <span className="error-text">{errors.phone}</span>}
                </div>
              )}

              <div className="input-group">
                <div className="password-input-wrapper">
                  <input
                    className={`input ${errors.password ? 'error' : ''}`}
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Password"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? "👁" : "⌣"}
                  </button>
                </div>
                {errors.password && <span className="error-text">{errors.password}</span>}
              </div>

              <button
                className="auth-button"
                type="submit"
                disabled={isLoading}
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

        <div className="auth-toggle">
          <p>
            {isLogin ? "Don't have an account?" : "Already have an account?"}
            <button type="button" className="toggle-button" onClick={toggleAuthMode}>
              {isLogin ? "Sign up" : "Log in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
