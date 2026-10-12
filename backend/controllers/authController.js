import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { Resend } from 'resend';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

// REGISTER USER
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
    if (!/\S+@\S+\.\S+/.test(email)) {
      return res.status(400).json({ message: 'Please enter a valid email address' });
    }

    // Check for existing user
    const existingUser = await User.findOne({ email: emailLower });
    if (existingUser) {
      return res.status(409).json({ message: "User with given email already exists" });
    }

    // Determine role: if email is admin email, set role to admin
    const userRole = (emailLower === 'bhuvanamallesh08@gmail.com') ? 'admin' : 'user';

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const userData = {
      name: normalizedName,
      email: emailLower,
      password: hashedPassword,
      role: userRole,
    };

    const newUser = await User.create(userData);

    // Auto login after signup: create tokens
    const accessToken = jwt.sign({ id: newUser._id, role: newUser.role }, process.env.JWT_SECRET, { expiresIn: '24h' });

    // create refresh token (stored in httpOnly cookie)
    const refreshToken = jwt.sign({ id: newUser._id }, process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET, { expiresIn: process.env.REFRESH_EXPIRES || "7d" });

    // save refresh token in DB
    newUser.refreshToken = refreshToken;
    await newUser.save();

    // set refresh token as httpOnly cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      message: "User registered successfully",
      token: accessToken,
      userId: newUser._id,
      payment: newUser.payment,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// LOGIN USER
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });
    if (!password) return res.status(400).json({ message: "Password is required" });

    const emailLower = email.trim().toLowerCase();
    const user = await User.findOne({ email: emailLower });
    if (!user) {
      return res.status(404).json({ code: "USER_NOT_REGISTERED", message: "User not registered. Please sign up." });
    }

    if (!user.password) return res.status(401).json({ message: "Invalid credentials" });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email/phone or password" });
    }

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

    res.json({ message: "Login successful", token: accessToken, userId: user._id, payment: user.payment });
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
      from: process.env.EMAIL_FROM,
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
});

export const verifyOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each email to 5 attempts
  keyGenerator: (req) => req.body.email?.toLowerCase() || ipKeyGenerator(req),
  message: { message: 'Too many attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit to 10 login attempts per 15 minutes
  keyGenerator: (req) => req.body.email?.toLowerCase() || ipKeyGenerator(req),
  message: { message: 'Too many login attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});
