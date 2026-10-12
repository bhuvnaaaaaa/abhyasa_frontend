import Admin from "../models/adminModel.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

export const adminLogin = async (req, res) => {
  const { email, password } = req.body;

  const admin = await Admin.findOne({ email });
  if (!admin)
    return res.status(401).json({ message: "Invalid email or password" });

  const isMatch = await bcrypt.compare(password, admin.password);
  if (!isMatch)
    return res.status(401).json({ message: "Invalid email or password" });

  const token = jwt.sign({ id: admin._id, role: "admin" }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });

  res.json({ token });
};
