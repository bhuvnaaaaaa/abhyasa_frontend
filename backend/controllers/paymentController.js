import Razorpay from "razorpay";
import crypto from "crypto";
import sharp from "sharp";
import User from "../models/User.js";
import Admin from "../models/adminModel.js";
import {
  sendPaymentReceiptEmail,
  sendAdminPaymentNotificationEmail,
} from "../utils/emailService.js";

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

/**
 * Activates 30-day subscription, updates user model, and triggers receipts
 */
async function activateSubscription(userId, paymentId, paymentMethod = "UPI QR", payerDetails = {}) {
  if (!userId) {
    console.warn(`Payment activation failed: no userId provided`);
    return null;
  }

  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + 30);

  let user = await User.findById(userId);
  let isAdminAccount = false;

  if (!user) {
    user = await Admin.findById(userId);
    isAdminAccount = true;
  }

  if (!user) {
    console.warn(`Payment activation: user with ID ${userId} not found`);
    return null;
  }

  user.subscriptionActive = true;
  user.subscriptionExpiresAt = expiryDate;
  user.payment = true;
  await user.save();

  const amount = Number(process.env.SUBSCRIPTION_PRICE_INR) || 99;

  // Send official receipt email to registered user (and copy to payer email if different)
  if (user.email) {
    sendPaymentReceiptEmail({
      to: user.email,
      payerEmail: payerDetails.email,
      name: user.name || "Student",
      amount,
      paymentId: paymentId || `pay_${Date.now()}`,
      expiresAt: expiryDate,
    }).catch((err) => console.error("Receipt email error:", err));
  }

  // Send detailed notification to Admin email asynchronously
  sendAdminPaymentNotificationEmail({
    user: {
      name: user.name,
      email: user.email,
      role: isAdminAccount ? "admin" : "user",
    },
    payerDetails,
    amount,
    paymentId: paymentId || `pay_${Date.now()}`,
    paymentMethod,
  }).catch((err) => console.error("Admin notification email error:", err));

  console.log(`[Billing] Subscription activated for ${user.email} (${paymentId})`);
  return { user, expiryDate };
}

// Create Razorpay order for subscription (Modal checkout)
export const createOrder = async (req, res) => {
  try {
    const amount = (Number(process.env.SUBSCRIPTION_PRICE_INR) || 99) * 100; // paise

    const options = {
      amount,
      currency: "INR",
      receipt: `s_${Date.now()}`.slice(0, 40),
      notes: {
        userId: req.user?._id?.toString() || "subscriber",
        userEmail: req.user?.email || "",
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

/**
 * Create a UPI QR code for subscription payment with clean square QR extraction
 */
export const createQrCode = async (req, res) => {
  try {
    const amount = (Number(process.env.SUBSCRIPTION_PRICE_INR) || 99) * 100; // paise

    const qrCode = await getRazorpayInstance().qrCode.create({
      type: "upi_qr",
      name: "Abhyasa",
      usage: "single_use",
      fixed_amount: true,
      payment_amount: amount,
      description: "Test Yourself 30-Day Access",
      close_by: Math.floor(Date.now() / 1000) + 15 * 60, // 15 min TTL
      notes: {
        userId: req.user?._id?.toString() || "subscriber",
        userEmail: req.user?.email || "",
        userName: req.user?.name || "",
      },
    });

    // Extract the clean square QR code without poster banners or templates
    let cleanImageUrl = qrCode.image_url;
    try {
      if (qrCode.image_url) {
        const imgRes = await fetch(qrCode.image_url);
        if (imgRes.ok) {
          const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
          const image = sharp(imgBuffer);
          const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
          const w = info.width, h = info.height, ch = info.channels;

          // Locate the square QR code matrix in the middle of the Razorpay poster
          let minX = w, maxX = 0, minY = h, maxY = 0;
          for (let y = Math.floor(h * 0.35); y < Math.floor(h * 0.72); y++) {
            for (let x = 0; x < w; x++) {
              const idx = (y * w + x) * ch;
              if (data[idx] < 30 && data[idx + 1] < 30 && data[idx + 2] < 30) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
              }
            }
          }

          if (maxX > minX && maxY > minY) {
            const quietZone = 24;
            const cropLeft = Math.max(0, minX - quietZone);
            const cropTop = Math.max(0, minY - quietZone);
            const cropWidth = Math.min(w - cropLeft, (maxX - minX) + quietZone * 2);
            const cropHeight = Math.min(h - cropTop, (maxY - minY) + quietZone * 2);

            const croppedBuffer = await sharp(imgBuffer)
              .extract({ left: cropLeft, top: cropTop, width: cropWidth, height: cropHeight })
              .png({ quality: 100 })
              .toBuffer();

            cleanImageUrl = `data:image/png;base64,${croppedBuffer.toString("base64")}`;
          }
        }
      }
    } catch (cropErr) {
      console.warn("Clean QR crop fallback to raw image_url:", cropErr.message);
    }

    res.json({
      qrCodeId: qrCode.id,
      imageUrl: cleanImageUrl,
      amount: qrCode.payment_amount,
    });
  } catch (error) {
    console.error("Error creating Razorpay QR code:", error);
    res.status(500).json({ message: "Failed to create QR code" });
  }
};

// Frontend polls this to know when the payment has been completed and verified
export const getSubscriptionStatus = async (req, res) => {
  try {
    const userId = req.user?._id;
    let user = await User.findById(userId);
    if (!user) {
      user = await Admin.findById(userId);
    }

    const now = new Date();
    const isAlreadyActive = Boolean(
      user?.subscriptionActive && user?.subscriptionExpiresAt && user.subscriptionExpiresAt > now
    );

    if (isAlreadyActive) {
      return res.json({
        active: true,
        expiresAt: user.subscriptionExpiresAt,
        message: "Subscription active",
      });
    }

    // Direct reconciliation with Razorpay if qrCodeId is provided in query
    const { qrCodeId } = req.query;
    if (qrCodeId && process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
      try {
        const payments = await getRazorpayInstance().qrCode.fetchAllPayments(String(qrCodeId));
        if (payments && Array.isArray(payments.items) && payments.items.length > 0) {
          const paidItem = payments.items.find(
            (p) => p.status === "captured" || p.status === "authorized"
          );

          if (paidItem) {
            const payerDetails = {
              email: paidItem.email,
              contact: paidItem.contact,
              vpa: paidItem.vpa,
              method: paidItem.method,
            };
            const activationResult = await activateSubscription(
              userId,
              paidItem.id,
              "UPI QR",
              payerDetails
            );
            return res.json({
              active: true,
              paymentId: paidItem.id,
              expiresAt: activationResult?.expiryDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              message: "Payment verified successfully!",
            });
          }
        }

        // Also check QR code status directly if fetchAllPayments has latency
        const qrEntity = await getRazorpayInstance().qrCode.fetch(String(qrCodeId));
        if (qrEntity && (qrEntity.payments_amount_received > 0 || qrEntity.status === "closed")) {
          const activationResult = await activateSubscription(
            userId,
            `pay_${qrEntity.id}`,
            "UPI QR"
          );
          return res.json({
            active: true,
            paymentId: `pay_${qrEntity.id}`,
            expiresAt: activationResult?.expiryDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            message: "Payment verified successfully!",
          });
        }
      } catch (checkErr) {
        console.warn("Direct Razorpay QR check non-fatal:", checkErr.message);
      }
    }

    res.json({ active: false, expiresAt: user?.subscriptionExpiresAt || null });
  } catch (error) {
    console.error("Error fetching subscription status:", error);
    res.status(500).json({ message: "Failed to fetch subscription status" });
  }
};

// Razorpay checkout modal payment verification
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
      console.error(`Signature mismatch for user ${req.user._id}. Payment ID: ${razorpay_payment_id}`);
      return res.status(400).json({ message: "Invalid payment signature", paymentId: razorpay_payment_id });
    }

    // Fetch payment details from Razorpay to retrieve payer email/contact
    let payerDetails = {};
    try {
      const paymentItem = await getRazorpayInstance().payments.fetch(razorpay_payment_id);
      if (paymentItem) {
        payerDetails = {
          email: paymentItem.email,
          contact: paymentItem.contact,
          vpa: paymentItem.vpa,
          method: paymentItem.method,
        };
      }
    } catch (fetchErr) {
      console.warn("Could not fetch payment details from Razorpay:", fetchErr.message);
    }

    const activationResult = await activateSubscription(
      req.user._id,
      razorpay_payment_id,
      "Razorpay Checkout",
      payerDetails
    );

    res.json({
      success: true,
      message: "Subscription activated successfully",
      paymentId: razorpay_payment_id,
      expiresAt: activationResult?.expiryDate,
    });
  } catch (error) {
    console.error("Error verifying payment:", error);
    res.status(500).json({ message: "Payment verification failed", paymentId: req.body.razorpay_payment_id });
  }
};

// Razorpay webhook handler
export const handleWebhook = async (req, res) => {
  try {
    const signature = req.headers["x-razorpay-signature"];
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (webhookSecret) {
      const hmac = crypto.createHmac("sha256", webhookSecret);
      hmac.update(req.body);
      const expectedSignature = hmac.digest("hex");

      if (expectedSignature !== signature) {
        console.error("Invalid webhook signature received");
        return res.status(400).send("Invalid signature");
      }
    }

    const payload = JSON.parse(req.body.toString("utf8"));
    const event = payload.event;

    if (event === "payment.captured") {
      const payment = payload.payload.payment.entity;
      const userId = payment.notes?.userId;
      const payerDetails = {
        email: payment.email,
        contact: payment.contact,
        vpa: payment.vpa,
        method: payment.method,
      };
      await activateSubscription(userId, payment.id, payment.method || "Card/Netbanking", payerDetails);
    } else if (event === "qr_code.credited") {
      const qrCode = payload.payload.qr_code.entity;
      const payment = payload.payload.payment.entity;
      const userId = qrCode.notes?.userId || payment.notes?.userId;
      const payerDetails = {
        email: payment.email,
        contact: payment.contact,
        vpa: payment.vpa,
        method: "UPI QR",
      };
      await activateSubscription(userId, payment.id, "UPI QR", payerDetails);
    }

    res.status(200).send("OK");
  } catch (error) {
    console.error("Error processing webhook:", error);
    res.status(500).send("Webhook processing failed");
  }
};