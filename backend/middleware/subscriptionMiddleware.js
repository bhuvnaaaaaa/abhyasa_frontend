export const requireSubscription = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const now = new Date();

    if (!req.user.subscriptionActive || !req.user.subscriptionExpiresAt || req.user.subscriptionExpiresAt <= now) {
      return res.status(402).json({
        message: "Subscription required",
        requiresUpgrade: true,
      });
    }

    next();
  } catch (error) {
    console.error("Subscription check error:", error);
    return res.status(500).json({ message: "Server error during subscription check" });
  }
};