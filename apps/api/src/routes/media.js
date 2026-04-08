import { Router } from "express";
import crypto from "node:crypto";
import { Client } from "minio";
import multer from "multer";
import { prisma } from "@personal-blog/db/src/client.js";
import { env } from "../lib/env.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const minio = new Client({
  endPoint: env.minioEndPoint,
  port: env.minioPort,
  useSSL: env.minioUseSSL,
  accessKey: env.minioAccessKey,
  secretKey: env.minioSecretKey
});

let bucketReadyPromise = null;
function safeFilename(name = "file") {
  const trimmed = String(name).trim() || "file";
  const dot = trimmed.lastIndexOf(".");
  const ext = dot > 0 ? trimmed.slice(dot).toLowerCase() : "";
  const base = dot > 0 ? trimmed.slice(0, dot) : trimmed;
  const normalized = base
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "file";
  const cleanExt = ext.replace(/[^\w.]/g, "").slice(0, 10);
  return `${normalized}${cleanExt || ""}`;
}

async function ensureBucket() {
  if (!bucketReadyPromise) {
    bucketReadyPromise = (async () => {
      const exists = await minio.bucketExists(env.minioBucket);
      if (!exists) {
        await minio.makeBucket(env.minioBucket);
      }
      return true;
    })().catch((e) => {
      bucketReadyPromise = null;
      throw e;
    });
  }
  return bucketReadyPromise;
}

router.post("/presign", requireAuth, async (req, res) => {
  try {
    await ensureBucket();
  } catch (e) {
    return res.status(503).json({ message: `对象存储未就绪: ${e.message}` });
  }
  const { postId, filename, type } = req.body;
  const objectName = `${postId}/${Date.now()}-${crypto.randomUUID()}-${safeFilename(filename)}`;
  const url = await minio.presignedPutObject(env.minioBucket, objectName, 60 * 15);
  const protocol = env.minioUseSSL ? "https" : "http";
  const defaultPort = env.minioUseSSL ? 443 : 80;
  const host =
    env.minioPort === defaultPort
      ? env.minioEndPoint
      : `${env.minioEndPoint}:${env.minioPort}`;
  const encodedObject = objectName
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
  const publicUrl = `${protocol}://${host}/${env.minioBucket}/${encodedObject}`;
  return res.json({ uploadUrl: url, objectName, type, publicUrl });
});

router.post("/callback", requireAuth, async (req, res) => {
  try {
    await ensureBucket();
  } catch (e) {
    return res.status(503).json({ message: `对象存储未就绪: ${e.message}` });
  }
  const { postId, type, url, storagePath, metadata } = req.body;
  const media = await prisma.media.create({ data: { postId, type, url, storagePath, metadata } });
  return res.status(201).json(media);
});

router.post("/upload", requireAuth, upload.single("file"), async (req, res) => {
  console.info("[media/upload] incoming", {
    userId: req.user?.userId,
    postId: req.body?.postId || null,
    filename: req.body?.filename || req.file?.originalname || null
  });
  try {
    await ensureBucket();
  } catch (e) {
    console.error("[media/upload] ensureBucket failed", e);
    return res.status(503).json({ message: `对象存储未就绪: ${e.message}` });
  }
  const file = req.file;
  if (!file) return res.status(400).json({ message: "Missing file" });

  const postId = String(req.body.postId || "draft");
  const type = "image";
  const filename = safeFilename(req.body.filename || file.originalname || "image");
  const objectName = `${postId}/${Date.now()}-${crypto.randomUUID()}-${filename}`;

  try {
    await minio.putObject(env.minioBucket, objectName, file.buffer, file.size, {
      "Content-Type": file.mimetype || "application/octet-stream"
    });
  } catch (e) {
    console.error("[media/upload] putObject failed", e);
    return res.status(503).json({ message: `上传失败: ${e.message}` });
  }

  const encodedObject = objectName
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
  const proxyUrl = `/api/media/file/${encodedObject}`;

  // 若为已存在文章的编辑页，顺便落库 media 记录
  if (req.body.postId) {
    await prisma.media.create({
      data: {
        postId: String(req.body.postId),
        type,
        url: proxyUrl,
        storagePath: objectName,
        metadata: {
          filename: file.originalname,
          mime: file.mimetype,
          size: file.size
        }
      }
    });
  }

  console.info("[media/upload] success", {
    objectName,
    proxyUrl
  });
  return res.status(201).json({ url: proxyUrl, objectName, type });
});

router.get("/file/*", async (req, res) => {
  try {
    await ensureBucket();
  } catch (e) {
    return res.status(503).json({ message: `对象存储未就绪: ${e.message}` });
  }
  const encodedPath = req.params[0];
  if (!encodedPath) return res.status(400).json({ message: "Missing object path" });
  const objectName = encodedPath
    .split("/")
    .map((part) => decodeURIComponent(part))
    .join("/");
  try {
    const stat = await minio.statObject(env.minioBucket, objectName);
    if (stat.metaData?.["content-type"]) {
      res.setHeader("Content-Type", stat.metaData["content-type"]);
    }
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    const stream = await minio.getObject(env.minioBucket, objectName);
    stream.on("error", () => {
      if (!res.headersSent) res.status(404).end();
      else res.end();
    });
    return stream.pipe(res);
  } catch {
    return res.status(404).json({ message: "File not found" });
  }
});

export default router;
