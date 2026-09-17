import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";
const POLL_INTERVAL_MS = 3000;
const QR_EXPIRY_MS = 15 * 60 * 1000; // matches close_by on the backend

function authHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export default function SubscribeQR({ onSuccess }) {
  const navigate = useNavigate();
  const [status, setStatus] = useState("idle"); // idle | loading | showing-qr | success | error | needs-auth
  const [qrImageUrl, setQrImageUrl] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const pollTimerRef = useRef(null);
  const expiryTimerRef = useRef(null);

  useEffect(() => {
    // cleanup on unmount so we don't poll after navigating away
    return () => {
      clearInterval(pollTimerRef.current);
      clearTimeout(expiryTimerRef.current);
    };
  }, []);

  const startPolling = () => {
    pollTimerRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/payment/subscription-status`, {
          headers: authHeaders(),
        });
        if (!res.ok) return; // transient network hiccup — try again next tick
        const data = await res.json();
        if (data.active) {
          clearInterval(pollTimerRef.current);
          clearTimeout(expiryTimerRef.current);
          setStatus("success");
          onSuccess?.(data);
        }
      } catch {
        // ignore single failed poll, next interval will retry
      }
    }, POLL_INTERVAL_MS);
  };

  const handleSubscribe = async () => {
    setErrorMsg("");
    setStatus("loading");

    try {
      const res = await fetch(`${API_BASE}/api/payment/create-qr`, {
        method: "POST",
        headers: authHeaders(),
      });

      if (res.status === 401) {
        setStatus("needs-auth");
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to create QR code");
      }

      const { imageUrl } = await res.json();
      setQrImageUrl(imageUrl);
      setStatus("showing-qr");
      startPolling();

      // stop polling if the QR expires unpaid, matching backend close_by
      expiryTimerRef.current = setTimeout(() => {
        clearInterval(pollTimerRef.current);
        setStatus("error");
        setErrorMsg("QR code expired. Please try again.");
      }, QR_EXPIRY_MS);
    } catch (err) {
      setStatus("error");
      setErrorMsg(err.message || "Something went wrong. Please try again.");
    }
  };

  if (status === "needs-auth") {
    return (
      <div style={styles.wrapper}>
        <p style={styles.message}>Sign in to subscribe and unlock this section.</p>
        <button onClick={() => navigate("/login")} style={styles.button}>
          Sign In
        </button>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div style={styles.wrapper}>
        <div style={styles.successBadge}>✓</div>
        <p style={styles.successText}>Payment successful! Your subscription is now active.</p>
      </div>
    );
  }

  if (status === "showing-qr") {
    return (
      <div style={styles.wrapper}>
        <img src={qrImageUrl} alt="Scan to pay with any UPI app" style={styles.qrImage} />
        <p style={styles.message}>Scan with any UPI app (GPay, PhonePe, Paytm...)</p>
        <p style={styles.waitingText}>Waiting for payment...</p>
      </div>
    );
  }

  return (
    <div style={styles.wrapper}>
      <button
        onClick={handleSubscribe}
        disabled={status === "loading"}
        style={{ ...styles.button, opacity: status === "loading" ? 0.6 : 1 }}
      >
        {status === "loading" ? "Generating QR..." : "Subscribe"}
      </button>
      {status === "error" && <p style={styles.error}>{errorMsg}</p>}
    </div>
  );
}

const styles = {
  wrapper: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "10px",
    padding: "16px",
  },
  button: {
    display: "inline-block",
    padding: "10px 28px",
    fontSize: "15px",
    fontWeight: 600,
    color: "#ffffff",
    backgroundColor: "#0f766e",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    textDecoration: "none",
  },
  qrImage: {
    width: "220px",
    height: "220px",
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    padding: "8px",
  },
  message: {
    color: "#374151",
    fontSize: "14px",
    textAlign: "center",
  },
  waitingText: {
    color: "#0f766e",
    fontSize: "13px",
    fontStyle: "italic",
  },
  successBadge: {
    width: "48px",
    height: "48px",
    borderRadius: "50%",
    backgroundColor: "#0f766e",
    color: "#ffffff",
    fontSize: "24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  successText: {
    color: "#0f766e",
    fontSize: "15px",
    fontWeight: 600,
    textAlign: "center",
  },
  error: {
    color: "#dc2626",
    fontSize: "14px",
    textAlign: "center",
  },
};