import { Router } from "express";
import { prisma } from "@personal-blog/db/src/client.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { backupQueue } from "../services/backupQueue.js";

const router = Router();

router.post("/", requireAuth, async (req, res) => {
  const format = req.body.format || "json";
  const backup = await prisma.backupJob.create({
    data: { userId: req.user.userId, type: "manual", format, status: "queued" }
  });
  await backupQueue.add("export", { userId: req.user.userId, format, backupJobId: backup.id });
  return res.status(202).json(backup);
});

router.get("/jobs", requireAuth, async (req, res) => {
  const jobs = await prisma.backupJob.findMany({
    where: { userId: req.user.userId },
    orderBy: { createdAt: "desc" }
  });
  return res.json(jobs);
});

export default router;
