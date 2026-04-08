import { Router } from "express";
import { prisma } from "@personal-blog/db/src/client.js";
import { parseSearchSyntax } from "@personal-blog/shared/src/index.js";

const router = Router();

router.get("/", async (req, res) => {
  const raw = String(req.query.q || "");
  const parsed = parseSearchSyntax(raw);
  const where = {
    deletedAt: null,
    ...(parsed.q
      ? {
          OR: [{ content: { contains: parsed.q, mode: "insensitive" } }, { title: { contains: parsed.q, mode: "insensitive" } }]
        }
      : {}),
    ...(parsed.tag ? { tags: { some: { tag: { name: parsed.tag } } } } : {}),
    ...(parsed.before || parsed.after
      ? {
          createdAt: {
            ...(parsed.before ? { lt: new Date(parsed.before) } : {}),
            ...(parsed.after ? { gt: new Date(parsed.after) } : {})
          }
        }
      : {})
  };
  const posts = await prisma.post.findMany({
    where,
    include: { tags: { include: { tag: true } } },
    orderBy: { createdAt: "desc" },
    take: 50
  });
  return res.json(posts);
});

export default router;
