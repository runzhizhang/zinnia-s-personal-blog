import { Router } from "express";
import { prisma } from "@personal-blog/db/src/client.js";
import { comparePassword, hashPassword, signToken } from "../lib/auth.js";

const router = Router();

router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.status(400).json({ message: "Missing required fields" });
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { username, email, passwordHash, settings: { theme: "light", interactionsEnabled: true } }
    });
    const token = signToken({ userId: user.id, username: user.username });
    return res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
  } catch (error) {
    return res.status(503).json({ message: "Service unavailable: database not ready" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password, username } = req.body;
    const identifier = String(email ?? username ?? "").trim();
    if (!identifier || !password) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { username: identifier }]
      }
    });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });
    const ok = await comparePassword(password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });
    const token = signToken({ userId: user.id, username: user.username });
    return res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
  } catch (error) {
    return res.status(503).json({ message: "Service unavailable: database not ready" });
  }
});

export default router;
