import { useState } from "react";

const API_BASE = import.meta.env.VITE_API || "http://localhost:5000/api";

// Loads the Razorpay checkout script once, reuses it on repeat clicks
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

export default function SubscribeButton({ onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubscribe = async () => {
    setError("");
    setLoading(true);

    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        setError("Failed to load payment gateway. Check your connection.");
        setLoading(false);
        return;
      }

      // Step 1: ask backend to create the order
      const orderRes = await fetch(`${API_BASE}/payment/create-order`, {
        method: "POST",
        credentials: "include", // sends the auth cookie your requireAuth middleware expects
        headers: { "Content-Type": "application/json" },
      });

      if (!orderRes.ok) {
        const data = await orderRes.json().catch(() => ({}));
        throw new Error(data.message || "Failed to create payment order");
      }

      const { orderId, amount, currency, keyId } = await orderRes.json();

      // Step 2: open the Razorpay Checkout modal
      const options = {
        key: keyId,
        amount,
        currency,
        order_id: orderId,
        name: "Abhyasa",
        description: "Subscription — Test Yourself access",
        theme: { color: "#0f766e" }, // teal, matches the site
        handler: async (response) => {
          // Step 3: this fires ONLY after a successful payment.
          // response contains razorpay_payment_id, razorpay_order_id, razorpay_signature.
          try {
            const verifyRes = await fetch(`${API_BASE}/payment/verify`, {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(response),
            });

            const verifyData = await verifyRes.json();

            if (!verifyRes.ok || !verifyData.success) {
              setError(verifyData.message || "Payment verification failed. Contact support if money was deducted.");
              return;
            }

            onSuccess?.(verifyData);
          } catch {
            setError("Verification request failed. Contact support if money was deducted.");
          }
        },
        modal: {
          ondismiss: () => setLoading(false), // user closed the modal without paying
        },
      };

      const rzp = new window.Razorpay(options);

      rzp.on("payment.failed", (response) => {
        setError(response.error?.description || "Payment failed. Please try again.");
        setLoading(false);
      });

      rzp.open();
      setLoading(false); // modal is now Razorpay's UI; our button loading state ends here
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={handleSubscribe} disabled={loading}>
        {loading ? "Loading..." : "Subscribe"}
      </button>
      {error && <p style={{ color: "#dc2626", marginTop: "8px" }}>{error}</p>}
    </div>
  );
}
