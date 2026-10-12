import Razorpay from "razorpay";
import crypto from "crypto";
import User from "../models/User.js";

let razorpay = null;

function getRazorpayInstance() {
  if (!razorpay) {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new Error("Razorpay keys not found in environment variables");
    }
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return razorpay;
}

async function activateSubscription(userId, source) {
  if (!userId) {
    console.warn(`Webhook event (${source}) had no userId in notes — cannot activate subscription`);
    return;
  }
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + 30);

  await User.findByIdAndUpdate(userId, {
    subscriptionActive: true,
    subscriptionExpiresAt: expiryDate,
  });

  console.log(`Subscription activated via ${source} for user ${userId}`);
}

// Create Razorpay order for subscription
export const createOrder = async (req, res) => {
  try {
    const amount = (process.env.SUBSCRIPTION_PRICE_INR || 499) * 100; // Convert to paise

    const options = {
      amount: amount,
      currency: "INR",
      receipt: `s_${Date.now()}`, // kept short — Razorpay caps receipt at 40 chars
      notes: {
        userId: req.user._id.toString(), // safer than encoding userId in receipt
      },
    };

    const order = await getRazorpayInstance().orders.create(options);

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    res.status(500).json({ message: "Failed to create payment order" });
  }
};

// Create a UPI QR code for subscription payment
export const createQrCode = async (req, res) => {
  try {
    const amount = (process.env.SUBSCRIPTION_PRICE_INR || 499) * 100; // paise

    const qrCode = await getRazorpayInstance().qrCode.create({
      type: "upi_qr",
      name: "Abhyasa Subscription",
      usage: "single_use",
      fixed_amount: true,
      payment_amount: amount,
      description: "Test Yourself subscription",
      close_by: Math.floor(Date.now() / 1000) + 15 * 60, // auto-expires in 15 min
      notes: {
        userId: req.user._id.toString(),
      },
    });

    res.json({
      qrCodeId: qrCode.id,
      imageUrl: qrCode.image_url,
      amount: qrCode.payment_amount,
    });
  } catch (error) {
    console.error("Error creating Razorpay QR code:", error);
    res.status(500).json({ message: "Failed to create QR code" });
  }
};

// Frontend polls this to know when the webhook has activated the subscription
export const getSubscriptionStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const now = new Date();
    const active = Boolean(
      user.subscriptionActive && user.subscriptionExpiresAt && user.subscriptionExpiresAt > now
    );
    res.json({ active, expiresAt: user.subscriptionExpiresAt || null });
  } catch (error) {
    console.error("Error fetching subscription status:", error);
    res.status(500).json({ message: "Failed to fetch subscription status" });
  }
};


export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: "Missing payment verification fields" });
    }

    // Generate expected signature
    const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET);
    hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const generatedSignature = hmac.digest("hex");

    if (generatedSignature !== razorpay_signature) {
      console.error(`Payment signature mismatch for user ${req.user._id}. Payment ID: ${razorpay_payment_id}`);
      return res.status(400).json({ message: "Invalid payment signature", paymentId: razorpay_payment_id });
    }

    // Activate subscription for 30 days
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);

    await User.findByIdAndUpdate(req.user._id, {
      subscriptionActive: true,
      subscriptionExpiresAt: expiryDate,
    });

    res.json({
      success: true,
      message: "Subscription activated successfully",
      expiresAt: expiryDate,
    });
  } catch (error) {
    console.error("Error verifying payment:", error);
    res.status(500).json({ message: "Payment verification failed", paymentId: req.body.razorpay_payment_id });
  }
};

// Razorpay webhook handler (backup activation path if frontend verify call never fires —
// e.g. user closes tab right after paying)
export const handleWebhook = async (req, res) => {
  try {
    const signature = req.headers["x-razorpay-signature"];
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    // req.body is a raw Buffer here (see server.js — mounted with express.raw()
    // before express.json()). HMAC must be computed over the raw bytes, not JSON.stringify().
    const hmac = crypto.createHmac("sha256", webhookSecret);
    hmac.update(req.body);
    const expectedSignature = hmac.digest("hex");

    if (expectedSignature !== signature) {
      console.error("Invalid webhook signature received");
      return res.status(400).send("Invalid signature");
    }

    const payload = JSON.parse(req.body.toString("utf8"));
    const event = payload.event;

    if (event === "payment.captured") {
      // Order-based payment (Checkout modal flow) — notes live on the payment entity
      const payment = payload.payload.payment.entity;
      const userId = payment.notes?.userId;
      await activateSubscription(userId, `payment.captured (${payment.id})`);
    } else if (event === "qr_code.credited") {
      // QR-based payment — notes live on the qr_code entity, NOT the payment entity
      const qrCode = payload.payload.qr_code.entity;
      const payment = payload.payload.payment.entity;
      const userId = qrCode.notes?.userId;
      await activateSubscription(userId, `qr_code.credited (${payment.id})`);
    }

    res.status(200).send("OK");
  } catch (error) {
    console.error("Error processing webhook:", error);
    res.status(500).send("Webhook processing failed");
  }
};