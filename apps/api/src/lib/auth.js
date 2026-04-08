import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { env } from "./env.js";

export function signToken(payload) {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: "7d" });
}

export function verifyToken(token) {
  return jwt.verify(token, env.jwtSecret);
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}
