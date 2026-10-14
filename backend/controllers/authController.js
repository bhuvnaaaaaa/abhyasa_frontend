import User from "../models/User.js";
import Admin from "../models/adminModel.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { Resend } from 'resend';
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { sendRegistrationOtpEmail } from "../utils/emailService.js";

// REGISTER USER - SENDS 6-DIGIT EMAIL VERIFICATION OTP
export const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const normalizedName = name?.trim();

    // Validate required fields
    if (!normalizedName || !password || !email) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    // Normalize email
    const emailLower = email.trim().toLowerCase();

    // Validate email format
    if (!/\S+@\S+\.\S+/.test(emailLower)) {
      return res.status(400).json({ message: 'Please enter a valid email address' });
    }

    // Check for existing verified user
    const existingUser = await User.findOne({ email: emailLower });
    if (existingUser && existingUser.isEmailVerified) {
      return res.status(409).json({ message: "An account with this email already exists. Please log in." });
    }

    // Determine role
    const userRole = (emailLower === 'bhuvanamallesh08@gmail.com') ? 'admin' : 'user';

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpHash = await bcrypt.hash(otp, 10);
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    if (existingUser) {
      existingUser.name = normalizedName;
      existingUser.password = hashedPassword;
      existingUser.role = userRole;
      existingUser.isEmailVerified = false;
      existingUser.verificationOtpHash = otpHash;
      existingUser.verificationOtpExpiry = otpExpiry;
      await existingUser.save();
    } else {
      await User.create({
        name: normalizedName,
        email: emailLower,
        password: hashedPassword,
        role: userRole,
        isEmailVerified: false,
        verificationOtpHash: otpHash,
        verificationOtpExpiry: otpExpiry,
      });
    }

    // Send verification OTP via Resend
    await sendRegistrationOtpEmail({
      to: emailLower,
      name: normalizedName,
      otp,
    });

    res.status(200).json({
      requireOtp: true,
      email: emailLower,
      message: "Verification code sent to your email. Please enter the 6-digit OTP to complete registration.",
    });
  } catch (error) {
    console.error("registerUser error:", error);
    res.status(500).json({ message: error.message });
  }
};

// VERIFY REGISTRATION OTP
export const verifyRegistrationOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ message: "Email and 6-digit verification code are required" });
    }

    const emailLower = email.trim().toLowerCase();
    const user = await User.findOne({ email: emailLower });

    if (!user) {
      return res.status(404).json({ message: "Registration session not found. Please sign up again." });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ message: "Email is already verified. Please log in." });
    }

    if (!user.verificationOtpHash || !user.verificationOtpExpiry) {
      return res.status(400).json({ message: "No active verification code. Please request a new code." });
    }

    if (Date.now() > new Date(user.verificationOtpExpiry).getTime()) {
      return res.status(400).json({ message: "Verification code has expired. Please request a new code." });
    }

    const isMatch = await bcrypt.compare(String(otp).trim(), user.verificationOtpHash);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid verification code. Please check your email and try again." });
    }

    // Mark user as verified
    user.isEmailVerified = true;
    user.verificationOtpHash = undefined;
    user.verificationOtpExpiry = undefined;

    // Create tokens
    const accessToken = jwt.sign(
      { id: user._id, role: user.role || "user", email: user.email, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    const refreshToken = jwt.sign(
      { id: user._id },
      process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET,
      { expiresIn: process.env.REFRESH_EXPIRES || "7d" }
    );

    user.refreshToken = refreshToken;
    await user.save();

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      success: true,
      message: "Email verified successfully! Welcome to Abhyasa.",
      token: accessToken,
      userId: user._id,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("verifyRegistrationOtp error:", err);
    res.status(500).json({ message: "Failed to verify email OTP. Please try again." });
  }
};

// RESEND REGISTRATION OTP
export const resendRegistrationOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const emailLower = email.trim().toLowerCase();
    const user = await User.findOne({ email: emailLower });

    if (!user) {
      return res.status(404).json({ message: "No pending registration found for this email." });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ message: "Email is already verified. Please log in." });
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const otpHash = await bcrypt.hash(otp, 10);
    user.verificationOtpHash = otpHash;
    user.verificationOtpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    await sendRegistrationOtpEmail({
      to: emailLower,
      name: user.name || "Student",
      otp,
    });

    res.json({
      success: true,
      message: "A fresh 6-digit verification code has been sent to your email.",
    });
  } catch (err) {
    console.error("resendRegistrationOtp error:", err);
    res.status(500).json({ message: "Failed to resend code. Please try again." });
  }
};

// LOGIN USER
export const loginUser = async (req, res) => {
  try {
    const rawEmail = req.body.email || req.body.identifier || req.body.username || req.body.emailOrPhone;
    const { password } = req.body;

    if (!rawEmail || !String(rawEmail).trim()) {
      return res.status(400).json({ message: "Email is required" });
    }
    if (!password) {
      return res.status(400).json({ message: "Password is required" });
    }

    const emailLower = String(rawEmail).trim().toLowerCase();

    // Check if credentials match an Admin account
    const admin = await Admin.findOne({ email: emailLower });
    if (admin) {
      const isAdminMatch = await bcrypt.compare(password, admin.password);
      if (!isAdminMatch) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const adminToken = jwt.sign(
        { id: admin._id, role: "admin", email: admin.email, name: "Admin" },
        process.env.JWT_SECRET,
        { expiresIn: "30d" }
      );

      return res.json({
        message: "Admin login successful",
        token: adminToken,
        userId: admin._id,
        role: "admin",
        payment: true,
      });
    }

    // Otherwise check standard User accounts
    const user = await User.findOne({ email: emailLower });
    if (!user) {
      return res.status(404).json({ code: "USER_NOT_REGISTERED", message: "User not registered. Please sign up." });
    }

    if (!user.password) return res.status(401).json({ message: "Invalid credentials" });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email/phone or password" });
    }

    if (user.isEmailVerified === false) {
      return res.status(403).json({
        code: "EMAIL_NOT_VERIFIED",
        message: "Please verify your email address to log in.",
        email: user.email,
        requireOtp: true,
      });
    }

    // create access token
    const accessToken = jwt.sign(
      { id: user._id, role: user.role || "user", email: user.email, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.ACCESS_EXPIRES || "24h" }
    );

    // create refresh token (stored in httpOnly cookie)
    const refreshToken = jwt.sign(
      { id: user._id },
      process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET,
      { expiresIn: process.env.REFRESH_EXPIRES || "7d" }
    );

    // save refresh token in DB
    user.refreshToken = refreshToken;
    await user.save();

    // set refresh token as httpOnly cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      message: "Login successful",
      token: accessToken,
      userId: user._id,
      role: user.role || "user",
      payment: user.payment ?? false,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// refresh access token using refreshToken cookie
export const refreshAccessToken = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) return res.status(401).json({ message: "No refresh token provided" });

    // verify token
    let payload;
    try {
      payload = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const user = await User.findById(payload.id);
    if (!user || user.refreshToken !== token) return res.status(401).json({ message: "Refresh token mismatch" });

    // issue new access token
    const accessToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: process.env.ACCESS_EXPIRES || "15m" });

    // Optionally rotate refresh token
    const newRefresh = jwt.sign({ id: user._id }, process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET, { expiresIn: process.env.REFRESH_EXPIRES || "7d" });
    user.refreshToken = newRefresh;
    await user.save();
    res.cookie("refreshToken", newRefresh, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ token: accessToken });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const logoutUser = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;
    if (token) {
      // find user with this refresh token and remove it
      const payload = jwt.decode(token);
      if (payload?.id) {
        const user = await User.findById(payload.id);
        if (user) {
          user.refreshToken = undefined;
          await user.save();
        }
      }
    }

    res.clearCookie("refreshToken", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" });
    res.json({ message: "Logged out" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Helper used by OAuth callback to set cookies and return an access token
export const createTokensForOAuth = async (user, res) => {
  // create access token (short lived)
  const accessToken = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.ACCESS_EXPIRES || "15m" });

  // create refresh token (stored in httpOnly cookie)
  const refreshToken = jwt.sign({ id: user._id }, process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET, { expiresIn: process.env.REFRESH_EXPIRES || "7d" });

  // save refresh token in DB
  user.refreshToken = refreshToken;
  await user.save();

  // set refresh token as httpOnly cookie
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return accessToken;
};

// UPDATE PAYMENT STATUS
export const updatePaymentStatus = async (req, res) => {
  try {
    const { payment } = req.body;
    if (typeof payment !== 'boolean') {
      return res.status(400).json({ message: "Payment status must be a boolean" });
    }

    const userId = req.user.id; // from requireAuth middleware
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.payment = payment;
    await user.save();

    res.json({ message: "Payment status updated successfully", payment: user.payment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// FORGOT PASSWORD - SEND OTP
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      return res.status(400).json({ message: 'Please enter a valid email address' });
    }

    const emailLower = email.trim().toLowerCase();
    const user = await User.findOne({ email: emailLower });

    // Always return success message to prevent email enumeration
    res.json({ message: 'If an account exists with this email, an OTP has been sent' });

    if (!user) return;

    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    
    // Hash OTP using existing bcrypt
    const otpHash = await bcrypt.hash(otp, 10);
    
    // Save OTP hash and expiry (10 minutes)
    user.resetOtpHash = otpHash;
    user.resetOtpExpiry = Date.now() + 10 * 60 * 1000;
    await user.save();

    // Send OTP via Resend
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: process.env.EMAIL_FROM && !process.env.EMAIL_FROM.includes("onboarding@resend.dev")
        ? process.env.EMAIL_FROM
        : "Abhyasa <support@abhyasalearning.in>",
      to: emailLower,
      subject: 'Abhyasa - Password Reset OTP',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Reset Request</h2>
          <p>You requested to reset your password. Use the OTP below to verify:</p>
          <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 24px 0;">
            ${otp}
          </div>
          <p>This OTP will expire in 10 minutes.</p>
          <p>If you didn't request this, please ignore this email.</p>
          <br>
          <p>Regards,<br>Abhyasa Team</p>
        </div>
      `
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    // Don't leak errors to client
  }
};

// VERIFY OTP AND RESET PASSWORD
export const verifyOtp = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const emailLower = email.trim().toLowerCase();
    const user = await User.findOne({ email: emailLower });

    if (!user || !user.resetOtpHash || !user.resetOtpExpiry) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // Check if OTP is expired
    if (Date.now() > user.resetOtpExpiry) {
      user.resetOtpHash = undefined;
      user.resetOtpExpiry = undefined;
      await user.save();
      return res.status(400).json({ message: 'OTP expired, request a new one' });
    }

    // Verify OTP using existing bcrypt compare
    const isOtpValid = await bcrypt.compare(otp, user.resetOtpHash);
    
    if (!isOtpValid) {
      return res.status(400).json({ message: 'Incorrect OTP' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update password and clear OTP fields
    user.password = hashedPassword;
    user.resetOtpHash = undefined;
    user.resetOtpExpiry = undefined;
    await user.save();

    res.json({ message: 'Password reset successfully' });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Rate limiters
export const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // limit each email to 3 requests
  keyGenerator: (req) => req.body.email?.toLowerCase() || ipKeyGenerator(req),
  message: { message: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
});

export const verifyOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each email to 5 attempts
  keyGenerator: (req) => req.body.email?.toLowerCase() || ipKeyGenerator(req),
  message: { message: 'Too many attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
});

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit to 10 login attempts per 15 minutes
  keyGenerator: (req) => (req.body.email || req.body.identifier || req.body.username || "").toLowerCase() || ipKeyGenerator(req),
  message: { message: 'Too many login attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
});
