import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true, lowercase: true, trim: true },
  password: String,
  role: { type: String, enum: ["user", "admin"], default: "user" },
  refreshToken: { type: String },
  payment: { type: Boolean, default: false },
  resetOtpHash: { type: String },
  resetOtpExpiry: { type: Date },
  isEmailVerified: { type: Boolean, default: false },
  verificationOtpHash: { type: String },
  verificationOtpExpiry: { type: Date },
  subscriptionActive: { type: Boolean, default: false },
  subscriptionExpiresAt: { type: Date }
});

const User = mongoose.model("User", userSchema);

export default User;
