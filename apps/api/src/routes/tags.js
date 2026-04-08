import { Router } from "express";
import { prisma } from "@personal-blog/db/src/client.js";

const router = Router();

router.get("/", async (_req, res) => {
  const tags = await prisma.tag.findMany({ orderBy: { name: "asc" } });
  return res.json(tags);
});

export default router;
