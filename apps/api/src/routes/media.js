import { Router } from "express";
import crypto from "node:crypto";
import { Client } from "minio";
import { prisma } from "@personal-blog/db/src/client.js";
import { env } from "../lib/env.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();

const minio = new Client({
  endPoint: env.minioEndPoint,
  port: env.minioPort,
  useSSL: env.minioUseSSL,
  accessKey: env.minioAccessKey,
  secretKey: env.minioSecretKey
});

router.post("/presign", requireAuth, async (req, res) => {
  const { postId, filename, type } = req.body;
  const objectName = `${postId}/${Date.now()}-${crypto.randomUUID()}-${filename}`;
  const url = await minio.presignedPutObject(env.minioBucket, objectName, 60 * 15);
  return res.json({ uploadUrl: url, objectName, type });
});

router.post("/callback", requireAuth, async (req, res) => {
  const { postId, type, url, storagePath, metadata } = req.body;
  const media = await prisma.media.create({ data: { postId, type, url, storagePath, metadata } });
  return res.status(201).json(media);
});

export default router;
