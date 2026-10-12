import express from "express";
import {
  createOrder,
  verifyPayment,
  handleWebhook,
  createQrCode,
  getSubscriptionStatus,
} from "../controllers/paymentController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

// Protected routes
router.post("/create-order", requireAuth, createOrder); // legacy — Checkout modal flow, kept but unused by SubscribeQR
router.post("/verify", requireAuth, verifyPayment); // legacy — pairs with create-order
router.post("/create-qr", requireAuth, createQrCode);
router.get("/subscription-status", requireAuth, getSubscriptionStatus);

// Webhook (public, Razorpay calls this)
router.post("/webhook", express.raw({ type: "application/json" }), handleWebhook);

export default router;