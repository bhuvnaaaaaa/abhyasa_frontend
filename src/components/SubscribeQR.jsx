import { useState, useRef, useEffect } from "react";
import Signup from "../pages/Signup";

const rawApiUrl = import.meta.env.VITE_API_URL || "";
const API_BASE = rawApiUrl.includes("abhyasa-backend.onrender.com") ? "" : rawApiUrl;
const POLL_INTERVAL_MS = 2500;
const QR_EXPIRY_SECONDS = 15 * 60; // 15 minutes

function authHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function SubscribeQR({ onSuccess }) {
  const [status, setStatus] = useState("idle");
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [qrImageUrl, setQrImageUrl] = useState("");
  const [activeQrCodeId, setActiveQrCodeId] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [secondsRemaining, setSecondsRemaining] = useState(QR_EXPIRY_SECONDS);
  const [verifiedPaymentId, setVerifiedPaymentId] = useState("");
  const pollTimerRef = useRef(null);
  const countdownTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, []);

  const formatTimer = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const startPolling = (qrId) => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);

    pollTimerRef.current = setInterval(async () => {
      try {
        const queryParam = qrId ? `?qrCodeId=${encodeURIComponent(qrId)}` : "";
        const res = await fetch(`${API_BASE}/api/payment/subscription-status${queryParam}`, {
          headers: authHeaders(),
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.active) {
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
          setVerifiedPaymentId(data.paymentId || "");
          setStatus("success");
          localStorage.setItem("hasPaid", "true");
        }
      } catch {
        // network retry
      }
    }, POLL_INTERVAL_MS);
  };

  const startCountdown = () => {
    setSecondsRemaining(QR_EXPIRY_SECONDS);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);

    countdownTimerRef.current = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(countdownTimerRef.current);
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          setStatus("error");
          setErrorMsg("QR code expired. Please generate a fresh code to complete payment.");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSubscribe = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      setShowAuthModal(true);
      return;
    }

    setErrorMsg("");
    setStatus("loading");

    try {
      const res = await fetch(`${API_BASE}/api/payment/create-qr`, {
        method: "POST",
        headers: authHeaders(),
      });

      if (res.status === 401) {
        localStorage.removeItem("token");
        setShowAuthModal(true);
        setStatus("idle");
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to create QR code");
      }

      const { imageUrl, qrCodeId } = await res.json();
      setQrImageUrl(imageUrl);
      setActiveQrCodeId(qrCodeId || "");
      setStatus("showing-qr");
      startCountdown();
      startPolling(qrCodeId);
    } catch (err) {
      setStatus("error");
      setErrorMsg(err.message || "Could not generate UPI QR. You can also pay directly via Razorpay modal.");
    }
  };

  const handleRazorpayCheckout = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setShowAuthModal(true);
      return;
    }

    setErrorMsg("");
    setStatus("checkout-loading");

    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error("Failed to load Razorpay payment gateway.");
      }

      const orderRes = await fetch(`${API_BASE}/api/payment/create-order`, {
        method: "POST",
        headers: authHeaders(),
      });

      if (orderRes.status === 401) {
        localStorage.removeItem("token");
        setShowAuthModal(true);
        setStatus("idle");
        return;
      }

      if (!orderRes.ok) {
        const data = await orderRes.json().catch(() => ({}));
        throw new Error(data.message || "Failed to create payment order");
      }

      const { orderId, amount, currency, keyId } = await orderRes.json();

      const options = {
        key: keyId,
        amount,
        currency,
        order_id: orderId,
        name: "Abhyasa",
        description: "Test Yourself 30-Day Subscription",
        theme: { color: "#0f766e" },
        handler: async (response) => {
          try {
            const verifyRes = await fetch(`${API_BASE}/api/payment/verify`, {
              method: "POST",
              headers: authHeaders(),
              body: JSON.stringify(response),
            });
            const verifyData = await verifyRes.json();
            if (!verifyRes.ok || !verifyData.success) {
              setErrorMsg(verifyData.message || "Verification failed. Please contact support.");
              setStatus("error");
              return;
            }
            if (pollTimerRef.current) clearInterval(pollTimerRef.current);
            if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
            setVerifiedPaymentId(verifyData.paymentId || "");
            setStatus("success");
            localStorage.setItem("hasPaid", "true");
          } catch {
            setErrorMsg("Verification request failed. Please check your connection.");
            setStatus("error");
          }
        },
        modal: {
          ondismiss: () => setStatus("idle"),
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (response) => {
        setErrorMsg(response.error?.description || "Payment failed.");
        setStatus("error");
      });
      rzp.open();
      setStatus("idle");
    } catch (err) {
      setErrorMsg(err.message || "Payment initiation failed.");
      setStatus("error");
    }
  };

  return (
    <>
      {showAuthModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(4px)",
            zIndex: 99999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div style={{ position: "relative", maxWidth: "460px", width: "100%" }}>
            <button
              onClick={() => setShowAuthModal(false)}
              style={{
                position: "absolute",
                top: "14px",
                right: "14px",
                zIndex: 100000,
                background: "#f1f5f9",
                border: "none",
                borderRadius: "50%",
                width: "32px",
                height: "32px",
                fontSize: "16px",
                fontWeight: "bold",
                cursor: "pointer",
                color: "#475569",
              }}
              aria-label="Close"
            >
              ✕
            </button>
            <Signup
              isModal={true}
              initialIsLogin={true}
              onSuccess={() => {
                setShowAuthModal(false);
                handleSubscribe();
              }}
            />
          </div>
        </div>
      )}

      <div style={styles.wrapper}>
        {status === "success" && (
          <div style={styles.successCard}>
            <div style={styles.successIcon}>✓</div>
            <h3 style={{ margin: "12px 0 6px", color: "#065f46", fontSize: "18px", fontWeight: 700 }}>
              Payment Received & Verified!
            </h3>
            <p style={{ margin: "0 0 12px", fontSize: "14px", color: "#047857", lineHeight: 1.5 }}>
              Your 30-day access to all questions and solutions is now active.
            </p>
            <div style={styles.receiptNote}>
              <span>📧</span> A payment receipt has been sent to your registered email address.
            </div>
            {verifiedPaymentId && (
              <p style={{ fontSize: "11px", color: "#64748b", margin: "10px 0 0", fontFamily: "monospace" }}>
                Payment Ref: {verifiedPaymentId}
              </p>
            )}
            <button
              onClick={() => {
                localStorage.setItem("hasPaid", "true");
                onSuccess?.();
              }}
              style={styles.continueButton}
            >
              Continue to Questions →
            </button>
          </div>
        )}

        {status === "showing-qr" && (
          <div style={styles.qrCard}>
            <div style={styles.qrHeader}>
              <h4 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>
                Scan with any UPI App
              </h4>
              <span style={styles.amountBadge}>₹99</span>
            </div>

            <p style={{ margin: "0 0 12px", fontSize: "13px", color: "#64748b", textAlign: "center" }}>
              Open Google Pay, PhonePe, Paytm, or any UPI app to scan
            </p>

            {/* High-Resolution Clean White QR Container (Quiet Zone) */}
            <div style={styles.qrContainer}>
              <img
                src={qrImageUrl}
                alt="UPI Payment QR Code"
                style={styles.qrImage}
              />
            </div>

            {/* Live Countdown & Status */}
            <div style={styles.statusBox}>
              <div style={styles.livePulse}>
                <span style={styles.pulseDot}></span>
                <span style={{ fontSize: "12px", fontWeight: 600, color: "#0f766e" }}>
                  Awaiting payment confirmation...
                </span>
              </div>
              <div style={{ fontSize: "12px", color: "#dc2626", fontWeight: 600, marginTop: "4px" }}>
                Valid for: {formatTimer(secondsRemaining)}
              </div>
              {activeQrCodeId && (
                <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px", fontFamily: "monospace" }}>
                  Ref: {activeQrCodeId}
                </div>
              )}
            </div>

            {/* Fallback button for Cards / Netbanking */}
            <div style={styles.fallbackBox}>
              <button onClick={handleRazorpayCheckout} style={styles.linkButton}>
                Having trouble scanning? Click to pay via Cards / Netbanking
              </button>
            </div>
          </div>
        )}

        {status !== "showing-qr" && status !== "success" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", width: "100%" }}>
            <button
              onClick={handleSubscribe}
              disabled={status === "loading" || status === "checkout-loading"}
              style={{
                ...styles.primaryButton,
                opacity: status === "loading" || status === "checkout-loading" ? 0.6 : 1,
              }}
            >
              {status === "loading" ? "Generating UPI QR..." : "Pay ₹99 via UPI QR Code"}
            </button>

            <button
              onClick={handleRazorpayCheckout}
              disabled={status === "loading" || status === "checkout-loading"}
              style={styles.secondaryButton}
            >
              {status === "checkout-loading" ? "Opening Razorpay..." : "Pay via Cards / Netbanking / UPI"}
            </button>

            {errorMsg && <p style={styles.error}>{errorMsg}</p>}
          </div>
        )}
      </div>
    </>
  );
}

const styles = {
  wrapper: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "8px",
    width: "100%",
  },
  primaryButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "12px 28px",
    fontSize: "15px",
    fontWeight: 600,
    color: "#ffffff",
    backgroundColor: "#0f766e",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(15, 118, 110, 0.2)",
    transition: "all 0.2s ease",
    width: "100%",
    maxWidth: "320px",
  },
  secondaryButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    padding: "10px 20px",
    fontSize: "13px",
    fontWeight: 500,
    color: "#0f766e",
    backgroundColor: "#f0fdfa",
    border: "1px solid #99f6e4",
    borderRadius: "8px",
    cursor: "pointer",
    width: "100%",
    maxWidth: "320px",
  },
  linkButton: {
    background: "none",
    border: "none",
    color: "#0f766e",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
    textDecoration: "underline",
    padding: "4px 8px",
  },
  qrCard: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.08)",
    padding: "20px 24px",
    maxWidth: "340px",
    width: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  qrHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: "8px",
  },
  amountBadge: {
    background: "#f0fdfa",
    color: "#0f766e",
    fontWeight: 700,
    fontSize: "16px",
    padding: "3px 10px",
    borderRadius: "6px",
    border: "1px solid #ccfbf1",
  },
  qrContainer: {
    background: "#ffffff",
    padding: "16px",
    border: "2px solid #e2e8f0",
    borderRadius: "12px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    width: "256px",
    height: "256px",
    boxSizing: "border-box",
  },
  qrImage: {
    width: "224px",
    height: "224px",
    objectFit: "contain",
    display: "block",
    imageRendering: "pixelated",
  },
  statusBox: {
    marginTop: "14px",
    textAlign: "center",
    width: "100%",
  },
  livePulse: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
  },
  pulseDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    backgroundColor: "#10b981",
    display: "inline-block",
  },
  fallbackBox: {
    marginTop: "14px",
    borderTop: "1px solid #f1f5f9",
    paddingTop: "10px",
    width: "100%",
    textAlign: "center",
  },
  successCard: {
    background: "#ffffff",
    border: "1px solid #a7f3d0",
    borderRadius: "14px",
    padding: "24px 20px",
    textAlign: "center",
    maxWidth: "360px",
    width: "100%",
    boxShadow: "0 10px 25px -5px rgba(16, 185, 129, 0.15)",
  },
  successIcon: {
    width: "48px",
    height: "48px",
    borderRadius: "50%",
    backgroundColor: "#dcfce7",
    color: "#16a34a",
    fontSize: "24px",
    fontWeight: 700,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "4px",
  },
  receiptNote: {
    background: "#f0fdfa",
    border: "1px solid #ccfbf1",
    borderRadius: "8px",
    padding: "10px 12px",
    fontSize: "12px",
    color: "#0f766e",
    lineHeight: 1.4,
    margin: "12px 0 16px",
    textAlign: "left",
  },
  continueButton: {
    background: "#0f766e",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    padding: "10px 24px",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(15, 118, 110, 0.2)",
  },
  error: {
    color: "#dc2626",
    fontSize: "13px",
    textAlign: "center",
    maxWidth: "320px",
    margin: "6px 0 0",
  },
};