import { Router } from "express";
import { prisma } from "@personal-blog/db/src/client.js";

const router = Router();

router.get("/", async (_req, res) => {
  const totalPosts = await prisma.post.count({ where: { deletedAt: null } });
  const tagRows = await prisma.tag.findMany({
    include: { posts: true },
    orderBy: { posts: { _count: "desc" } },
    take: 20
  });
  const yearly = await prisma.$queryRaw`
    SELECT DATE_TRUNC('month', "createdAt") AS month, COUNT(*)::int AS count
    FROM "Post"
    WHERE "deletedAt" IS NULL
    GROUP BY month
    ORDER BY month DESC
    LIMIT 24
  `;
  return res.json({
    totalPosts,
    topTags: tagRows.map((t) => ({ name: t.name, count: t.posts.length })),
    activity: yearly
  });
});

router.get("/heatmap", async (req, res) => {
  const days = Math.max(30, Math.min(730, Number(req.query.days || 365)));
  const rows = await prisma.$queryRaw`
    SELECT DATE("createdAt") AS day, COUNT(*)::int AS count
    FROM "Post"
    WHERE "deletedAt" IS NULL
      AND "createdAt" >= NOW() - (${days} * INTERVAL '1 day')
    GROUP BY day
    ORDER BY day ASC
  `;
  return res.json({ days, points: rows });
});

export default router;
