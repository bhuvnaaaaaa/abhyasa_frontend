import jwt from "jsonwebtoken";

export const adminProtect = (req, res, next) => {
  let token = req.headers.authorization?.split(" ")[1];

  if (!token) return res.status(401).json({ message: "Admin token missing" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== "admin") {
      return res.status(403).json({ message: "Access denied: not admin" });
    }

    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid admin token" });
  }
};
