import { verifyToken } from "../lib/auth.js";

export function requireAuth(req, res, next) {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ message: "Unauthorized" });
    const decoded = verifyToken(token);
    req.user = decoded;
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
}
