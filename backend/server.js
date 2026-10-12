import express from "express";
import dotenv from "dotenv";
dotenv.config();

import cors from "cors";
import cookieParser from "cookie-parser";
import { Resend } from 'resend';
import connectDB from "./config/db.js";
import subjectRoutes from "./routes/subjectRoutes.js";
import chapterRoutes from "./routes/chapterRoutes.js";
import boardRoutes from "./routes/boardRoutes.js";
import gradeRoutes from "./routes/gradeRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import { handleWebhook } from "./controllers/paymentController.js";

connectDB();

const app = express();

// (Removed Google OAuth/passport setup)

// Allow frontend origins for development. Include common dev ports and
// accept any `localhost` origin to avoid preflight mismatches when using
// different dev ports (5173/5174/5175/etc.). In production set `CLIENT_URL`.
const allowedOrigins = [process.env.CLIENT_URL, "http://localhost:5173", "http://localhost:5174", "http://localhost:5175"].filter(Boolean);
app.use(
  cors({
    origin: (origin, callback) => {
      // allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      // allow any localhost origin during development (flexible for different ports)
      try {
        const url = new URL(origin);
        if (url.hostname === 'localhost') return callback(null, true);
      } catch (err) {
        // fallthrough to deny
      }
      return callback(new Error("CORS policy: Origin not allowed"));
    },
    credentials: true,
  })
);
// Razorpay webhooks need the raw body for HMAC verification — mount before json parser.
app.use("/api/payment/webhook", express.raw({ type: "application/json" }), handleWebhook);
app.use(express.json());
app.use('/uploads', express.static('uploads'));
app.use(cookieParser());
app.use("/api/boards", boardRoutes);
app.use("/api/subjects", subjectRoutes);
app.use("/api/grades", gradeRoutes);
app.use("/api", chapterRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/admin", adminRoutes);
// also accept legacy/admin path without /api prefix
app.use("/admin", adminRoutes);

// Contact Form Endpoint — same Resend setup as password reset
app.post("/api/contact", async (req, res) => {
  try {
    const { name, email, phone, message } = req.body;
    const nameTrimmed = name?.trim();
    const emailTrimmed = email?.trim().toLowerCase();
    const phoneTrimmed = phone?.trim();
    const messageTrimmed = message?.trim();

    if (!nameTrimmed || !emailTrimmed || !messageTrimmed) {
      return res.status(400).json({ error: "Name, email, and message are required fields" });
    }

    if (!/\S+@\S+\.\S+/.test(emailTrimmed)) {
      return res.status(400).json({ error: "Please enter a valid email address" });
    }

    const escapeHtml = (value = "") =>
      String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

    const resend = new Resend(process.env.RESEND_API_KEY);
    const emailResult = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: process.env.ADMIN_EMAIL,
      replyTo: emailTrimmed,
      subject: `New Contact: ${nameTrimmed}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>New Contact Form Submission</h2>
          <p>Someone submitted the homepage contact form:</p>
          <p><strong>Name:</strong> ${escapeHtml(nameTrimmed)}</p>
          <p><strong>Email:</strong> ${escapeHtml(emailTrimmed)}</p>
          <p><strong>Phone:</strong> ${escapeHtml(phoneTrimmed || "Not provided")}</p>
          <p><strong>Message:</strong></p>
          <div style="background: #f3f4f6; padding: 16px; border-radius: 8px;">
            ${escapeHtml(messageTrimmed).replace(/\n/g, "<br>")}
          </div>
          <br>
          <p>Regards,<br>Abhyasa Team</p>
        </div>
      `,
    });

    if (emailResult.error) {
      console.error("Contact form Resend error:", emailResult.error);
      return res.status(500).json({ error: "Failed to send message" });
    }

    res.status(200).json({ success: true, message: "Message sent successfully" });
  } catch (err) {
    console.error("Contact form error:", err);
    res.status(500).json({ error: "Server error. Please try again later." });
  }
});


app.get("/", (req, res) => {
  res.send("Abhyasa API is running...");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));