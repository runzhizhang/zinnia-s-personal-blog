import { Queue, Worker } from "bullmq";
import Redis from "ioredis";
import fs from "node:fs/promises";
import path from "node:path";
import PDFDocument from "pdfkit";
import { prisma } from "@personal-blog/db/src/client.js";
import { env } from "../lib/env.js";

const disabled = process.env.NODE_ENV === "test";  
const connection = disabled ? null : new Redis(env.redisUrl, { maxRetriesPerRequest: null });
if (connection) {
  // Redis unavailable should not crash API boot.
  connection.on("error", () => {});
}
export const backupQueue = disabled
  ? { add: async () => ({ id: "test-job" }) }
  : new Queue("backup-jobs", { connection });

async function exportAsJson(userId) {
  const posts = await prisma.post.findMany({ where: { userId, deletedAt: null }, include: { tags: { include: { tag: true } } } });
  const payload = JSON.stringify(posts, null, 2);
  return Buffer.from(payload);
}

async function exportAsMarkdown(userId) {
  const posts = await prisma.post.findMany({ where: { userId, deletedAt: null }, orderBy: { createdAt: "desc" } });
  const md = posts.map((p) => `# ${p.title || "无标题"}\n\n${p.content}\n`).join("\n---\n");
  return Buffer.from(md);
}

async function exportAsPdf(userId) {
  const posts = await prisma.post.findMany({ where: { userId, deletedAt: null }, orderBy: { createdAt: "desc" } });
  const doc = new PDFDocument();
  const chunks = [];
  doc.on("data", (chunk) => chunks.push(chunk));
  const completed = new Promise((resolve) => doc.on("end", resolve));
  posts.forEach((p) => {
    doc.fontSize(18).text(p.title || "无标题");
    doc.moveDown();
    doc.fontSize(12).text(p.content);
    doc.addPage();
  });
  doc.end();
  await completed;
  return Buffer.concat(chunks);
}

if (!disabled) {
  new Worker(
    "backup-jobs",
    async (job) => {
    const { userId, format, backupJobId } = job.data;
    await prisma.backupJob.update({ where: { id: backupJobId }, data: { status: "running" } });
    try {
      let fileBuffer;
      if (format === "markdown") fileBuffer = await exportAsMarkdown(userId);
      else if (format === "pdf") fileBuffer = await exportAsPdf(userId);
      else fileBuffer = await exportAsJson(userId);

      const outDir = path.resolve(process.cwd(), "backups");
      await fs.mkdir(outDir, { recursive: true });
      const filePath = path.join(outDir, `${backupJobId}.${format === "markdown" ? "md" : format}`);
      await fs.writeFile(filePath, fileBuffer);
      await prisma.backupJob.update({
        where: { id: backupJobId },
        data: {
          status: "success",
          storageLocation: filePath,
          fileSize: fileBuffer.length
        }
      });
    } catch (error) {
      await prisma.backupJob.update({
        where: { id: backupJobId },
        data: { status: "failed", errorLog: String(error) }
      });
      throw error;
    }
    },
    { connection }
  );
}
