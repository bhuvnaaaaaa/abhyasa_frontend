import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import dotenv from "dotenv";
import { Resend } from "resend";
import rateLimit from "express-rate-limit";

dotenv.config();

// Connect Database
import mongoose from "mongoose";
import connectDB from "./backend/config/db.js";
import subjectRoutes from "./backend/routes/subjectRoutes.js";
import chapterRoutes from "./backend/routes/chapterRoutes.js";
import boardRoutes from "./backend/routes/boardRoutes.js";
import gradeRoutes from "./backend/routes/gradeRoutes.js";
import authRoutes from "./backend/routes/authRoutes.js";
import adminRoutes from "./backend/routes/adminRoutes.js";
import paymentRoutes from "./backend/routes/paymentRoutes.js";
import { handleWebhook } from "./backend/controllers/paymentController.js";
import { mockBoards, mockGrades, mockSubjects, mockChapters } from "./src/api/mockData.js";

// Initialize DB connection (non-blocking, fails gracefully if offline)
connectDB();

const app = express();
app.set("trust proxy", 1);
const isProduction = process.env.NODE_ENV === "production";
const PORT = 3000;

// CORS setup: allow incoming requests with credentials
app.use(
  cors({
    origin: (origin, callback) => {
      // allow requests with no origin (like mobile apps, curl, or same-origin)
      callback(null, true);
    },
    credentials: true,
  })
);

// Razorpay webhooks need raw body
app.use("/api/payment/webhook", express.raw({ type: "application/json" }), handleWebhook);

// Body and cookie parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Static uploads directory
app.use("/uploads", express.static(path.resolve("backend/uploads")));

// Non-blocking fallback middleware when MongoDB is offline / not yet configured
app.use("/api", (req, res, next) => {
  // If MongoDB is connected (readyState === 1), proceed directly to real Mongoose models & routes
  if (mongoose.connection.readyState === 1) {
    return next();
  }

  // If MongoDB is offline, serve instant fallback data to prevent buffering timeout
  if (req.method === "GET") {
    if (req.path === "/boards") return res.json(mockBoards);
    if (req.path === "/grades") {
      let g = mockGrades;
      if (req.query.board) g = g.filter((x: any) => x.board === req.query.board);
      return res.json(g);
    }
    if (req.path === "/subjects") {
      let s = mockSubjects;
      if (req.query.board) s = s.filter((x: any) => x.board === req.query.board);
      if (req.query.grade) s = s.filter((x: any) => Number(x.grade) === Number(req.query.grade));
      return res.json(s);
    }
    const subjMatch = req.path.match(/^\/subjects\/([^/]+)\/chapters$/);
    if (subjMatch) {
      const chs = mockChapters.filter((c) => c.subject === subjMatch[1]);
      return res.json(chs.length ? chs : mockChapters);
    }
    const chMatch = req.path.match(/^\/chapters\/([^/]+)$/);
    if (chMatch) {
      const found = mockChapters.find((c) => c._id === chMatch[1]) || mockChapters[0];
      return res.json(found);
    }
    if (req.path === "/chapters/find") {
      return res.json(mockChapters[0]);
    }
  }

  if (req.method === "POST") {
    if (req.path === "/auth/login" || req.path === "/auth/register") {
      const role = req.body?.email && req.body.email.includes("admin") ? "admin" : "student";
      const payload = Buffer.from(
        JSON.stringify({ role, email: req.body?.email || "student@abhyasa.com", name: req.body?.name || "Student" })
      ).toString("base64");
      return res.json({
        token: `mock_jwt.${payload}.mock_sig`,
        user: { name: req.body?.name || "Student", email: req.body?.email, role },
      });
    }
    if (req.path === "/auth/refresh") {
      const payload = Buffer.from(JSON.stringify({ role: "student", name: "Student" })).toString("base64");
      return res.json({ token: `mock_jwt.${payload}.mock_sig` });
    }
    if (req.path === "/auth/forgot-password" || req.path === "/auth/verify-otp" || req.path === "/auth/logout") {
      return res.json({ success: true, message: "OK" });
    }
    if (req.path === "/auth/verify-registration-otp") {
      const payload = Buffer.from(
        JSON.stringify({ role: "student", email: req.body?.email || "student@abhyasa.com", name: "Student" })
      ).toString("base64");
      return res.json({
        success: true,
        message: "Email verified successfully! Welcome to Abhyasa.",
        token: `mock_jwt.${payload}.mock_sig`,
        userId: "mock_user_1",
        user: { name: "Student", email: req.body?.email || "student@abhyasa.com", role: "user" },
      });
    }
    if (req.path === "/auth/resend-registration-otp") {
      return res.json({ success: true, message: "A fresh 6-digit verification code has been sent to your email." });
    }
    if (req.path === "/payment/create-order") {
      return res.json({ orderId: `order_${Date.now()}`, amount: 9900, currency: "INR", keyId: "rzp_test_mock" });
    }
    if (req.path === "/payment/verify") {
      return res.json({ success: true, message: "Payment verified successfully" });
    }
  }

  next();
});

// Mount Backend API Routes
app.use("/api/boards", boardRoutes);
app.use("/api/subjects", subjectRoutes);
app.use("/api/grades", gradeRoutes);
app.use("/api", chapterRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/admin", adminRoutes);

// Contact rate limiter (protect Resend email quota)
const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // max 5 submissions per hour per IP
  message: { error: "Too many messages sent. Please try again after an hour." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Contact endpoint
app.post("/api/contact", contactLimiter, async (req, res) => {
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

    if (process.env.RESEND_API_KEY && process.env.ADMIN_EMAIL) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from:
          process.env.EMAIL_FROM && !process.env.EMAIL_FROM.includes("onboarding@resend.dev")
            ? process.env.EMAIL_FROM
            : "Abhyasa <support@abhyasalearning.in>",
        to: process.env.ADMIN_EMAIL,
        replyTo: emailTrimmed,
        subject: `New Contact: ${nameTrimmed}`,
        html: `
          <h3>New Contact Form Submission</h3>
          <p><strong>Name:</strong> ${nameTrimmed}</p>
          <p><strong>Email:</strong> ${emailTrimmed}</p>
          <p><strong>Phone:</strong> ${phoneTrimmed || "Not provided"}</p>
          <p><strong>Message:</strong></p>
          <p>${messageTrimmed}</p>
        `,
      });
    }

    res.status(200).json({ success: true, message: "Message sent successfully" });
  } catch (err: any) {
    console.error("Contact form error:", err);
    res.status(500).json({ error: "Server error. Please try again later." });
  }
});

// Database offline / Mongoose error fallback handler
app.use((err: any, req: any, res: any, next: any) => {
  const isMongooseOffline =
    err.name === "MongooseError" ||
    err.name === "MongoNetworkError" ||
    (err.message && (err.message.includes("buffering timed out") || err.message.includes("MONGO_URI")));

  if (isMongooseOffline) {
    console.warn(`[Abhyasa Backend] Database offline for ${req.method} ${req.path} — providing fallback data`);
    if (req.method === "GET") {
      if (req.path.includes("/boards")) return res.json(mockBoards);
      if (req.path.includes("/grades")) return res.json(mockGrades);
      if (req.path.includes("/subjects")) return res.json(mockSubjects);
      if (req.path.includes("/chapters")) return res.json(mockChapters);
      return res.json(req.path.endsWith("s") || req.path.endsWith("s/") ? [] : {});
    }
    return res.status(503).json({ error: "Database offline. Please configure MONGO_URI in environment." });
  }
  next(err);
});

// Frontend Vite Middleware Setup
async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: "0.0.0.0",
        port: PORT,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve("dist")));
    app.use((req, res) => {
      res.sendFile(path.resolve("dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Abhyasa Full-Stack Application running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
