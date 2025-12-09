import { useState } from "react";
import axios from "../api/axios";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    identifier: "",
    password: "",
  });
  const [errors, setErrors] = useState({});
  const [showPopup, setShowPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");
  const [popupType, setPopupType] = useState("success");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: "" });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.identifier.trim()) {
      newErrors.identifier = "Email or phone number is required";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const showNotification = (message, type = "success") => {
    setPopupMessage(message);
    setPopupType(type);
    setShowPopup(true);
    setTimeout(() => setShowPopup(false), 3000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const res = await axios.post("/auth/login", {
        identifier: formData.identifier,
        password: formData.password
      });

      localStorage.setItem("token", res.data.token);
      const { setLastActive } = await import("../utils/auth");
      setLastActive();

      showNotification("Logged in successfully!", "success");

      setTimeout(() => {
        navigate("/");
      }, 1500);

    } catch (err) {
      console.error("Login error:", err);
      const status = err.response?.status;
      const message = err.response?.data?.message || "Login failed. Please check your credentials.";

      if (status === 404 && message.includes("not found")) {
        showNotification(`${message} Redirecting to signup...`, "info");
        setTimeout(() => {
          navigate("/signup");
        }, 3000);
      } else {
        showNotification(message, "error");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-background">
        <div className="auth-bg-gradient"></div>
      </div>

      {showPopup && (
        <div className={`auth-popup ${popupType}`}>
          <div className="auth-popup-content">
            <span className="auth-popup-icon">
              {popupType === "success" ? "✓" : "✕"}
            </span>
            <p>{popupMessage}</p>
          </div>
        </div>
      )}

      <div className="auth-card">
        <h2 className="auth-title">Welcome Back</h2>
        <p className="auth-subtitle">Sign in to continue your learning journey</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <input
              className={`auth-input ${errors.identifier ? 'error' : ''}`}
              name="identifier"
              value={formData.identifier}
              onChange={handleChange}
              placeholder="Email or phone number"
              disabled={isLoading}
            />
            {errors.identifier && <span className="error-message">{errors.identifier}</span>}
          </div>

          <div className="input-group">
            <div className="password-input-wrapper">
              <input
                className={`auth-input ${errors.password ? 'error' : ''}`}
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
            {errors.password && <span className="error-message">{errors.password}</span>}
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

        <div className="auth-footer">
          <p>
            <a href="#" className="auth-link" onClick={(e) => { e.preventDefault(); alert("Forgot password feature coming soon!"); }}>Forgot password?</a>
          </p>
          <p>Don't have an account?
            <a href="/signup" className="auth-link"> Sign up here</a>
          </p>
        </div>
      </div>
    </div>
  );
}
