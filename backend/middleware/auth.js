const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer"))
    return res.status(401).json({ message: "Not authorized, no token" });

  try {
    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = User.findById(decoded.id);
    if (!user) return res.status(401).json({ message: "User not found" });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: "Not authorized, token failed" });
  }
};

module.exports = { protect };
