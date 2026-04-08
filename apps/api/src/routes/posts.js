import { Router } from "express";
import { marked } from "marked";
import { prisma } from "@personal-blog/db/src/client.js";
import { postInputSchema } from "@personal-blog/shared/src/index.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();

function toTagConnect(tags = []) {
  return tags.map((name) => ({
    tag: { connectOrCreate: { where: { name }, create: { name } } }
  }));
}

router.get("/", async (req, res) => {
  const { page = 1, pageSize = 10, tag } = req.query;
  const skip = (Number(page) - 1) * Number(pageSize);
  const where = {
    deletedAt: null,
    ...(tag ? { tags: { some: { tag: { name: tag } } } } : {})
  };
  const posts = await prisma.post.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { tags: { include: { tag: true } }, medias: true },
    skip,
    take: Number(pageSize)
  });
  return res.json(posts);
});

router.post("/", requireAuth, async (req, res) => {
  const parsed = postInputSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const data = parsed.data;
  const post = await prisma.post.create({
    data: {
      userId: req.user.userId,
      title: data.title,
      content: data.content,
      htmlRendered: marked.parse(data.content),
      type: data.type,
      visibility: data.visibility,
      password: data.password,
      location: data.location ? { label: data.location } : undefined,
      isDraft: data.isDraft,
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
      tags: { create: toTagConnect(data.tags) }
    },
    include: { tags: { include: { tag: true } } }
  });
  return res.status(201).json(post);
});

router.get("/:id", async (req, res) => {
  const post = await prisma.post.findUnique({
    where: { id: req.params.id },
    include: { tags: { include: { tag: true } }, medias: true, interactions: true }
  });
  if (!post || post.deletedAt) return res.status(404).json({ message: "Not found" });
  return res.json(post);
});

router.patch("/:id", requireAuth, async (req, res) => {
  const parsed = postInputSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const exists = await prisma.post.findUnique({ where: { id: req.params.id } });
  if (!exists) return res.status(404).json({ message: "Not found" });

  await prisma.postVersion.create({ data: { postId: exists.id, content: exists.content } });
  const data = parsed.data;
  const post = await prisma.post.update({
    where: { id: req.params.id },
    data: {
      ...data,
      htmlRendered: data.content ? marked.parse(data.content) : undefined,
      tags: data.tags ? { deleteMany: {}, create: toTagConnect(data.tags) } : undefined
    },
    include: { tags: { include: { tag: true } } }
  });
  return res.json(post);
});

router.delete("/:id", requireAuth, async (req, res) => {
  await prisma.post.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
  return res.status(204).send();
});

export default router;
