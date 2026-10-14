import express from "express";
import { 
  registerUser, 
  verifyRegistrationOtp,
  resendRegistrationOtp,
  loginUser, 
  refreshAccessToken, 
  logoutUser, 
  updatePaymentStatus,
  forgotPassword,
  verifyOtp,
  forgotPasswordLimiter,
  verifyOtpLimiter,
  loginLimiter
} from "../controllers/authController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/verify-registration-otp", verifyRegistrationOtp);
router.post("/resend-registration-otp", resendRegistrationOtp);
router.post("/login", loginLimiter, loginUser);
router.post("/refresh", refreshAccessToken);
router.post("/logout", logoutUser);
router.put("/payment", requireAuth, updatePaymentStatus);
router.post("/forgot-password", forgotPasswordLimiter, forgotPassword);
router.post("/verify-otp", verifyOtpLimiter, verifyOtp);

router.get("/protected", requireAuth, (req, res) => {
  res.json({ message: "Authenticated!", user: req.user });
});

export default router;
