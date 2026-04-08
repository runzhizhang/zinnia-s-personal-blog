import { Router } from "express";
import crypto from "node:crypto";
import Redis from "ioredis";
import { prisma } from "@personal-blog/db/src/client.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { env } from "../lib/env.js";

const router = Router();
const memoryRate = new Map();
const redis = process.env.NODE_ENV === "test" ? null : new Redis(env.redisUrl, { maxRetriesPerRequest: 1, lazyConnect: true });
if (redis) {
  // Fallback to in-memory rate limiting when Redis is down.
  redis.on("error", () => {});
  redis.connect().catch(() => {});
}

function hashIp(ip = "") {
  return crypto.createHash("sha256").update(ip).digest("hex");
}

function getReactionKey({ postId, emoji, ipHash }) {
  return `reaction:${postId}:${emoji}:${ipHash}`;
}

function buildCommentTree(flatComments) {
  const nodes = flatComments.map((c) => ({ ...c, children: [] }));
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const roots = [];
  for (const node of nodes) {
    if (node.parentId && byId.has(node.parentId)) byId.get(node.parentId).children.push(node);
    else roots.push(node);
  }
  return roots;
}

async function consumeRateLimit(key, limit, windowSec) {
  if (!redis) {
    const now = Date.now();
    const item = memoryRate.get(key) || { count: 0, resetAt: now + windowSec * 1000 };
    if (now > item.resetAt) {
      item.count = 0;
      item.resetAt = now + windowSec * 1000;
    }
    item.count += 1;
    memoryRate.set(key, item);
    return item.count <= limit;
  }
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, windowSec);
  return count <= limit;
}

router.get("/posts/:postId", async (req, res) => {
  const post = await prisma.post.findUnique({
    where: { id: req.params.postId },
    select: { id: true, userId: true }
  });
  if (!post) return res.status(404).json({ message: "Post not found" });

  const comments = await prisma.interaction.findMany({
    where: { postId: post.id, type: "comment" },
    orderBy: { createdAt: "asc" }
  });
  const reactions = await prisma.interaction.groupBy({
    by: ["content"],
    where: { postId: post.id, type: "reaction" },
    _count: { _all: true }
  });

  return res.json({
    comments,
    commentTree: buildCommentTree(comments),
    reactions: reactions.map((r) => ({ emoji: r.content || "👍", count: r._count._all }))
  });
});

router.post("/posts/:postId/comments", async (req, res) => {
  const { content, parentId } = req.body;
  if (!content || String(content).trim().length === 0) {
    return res.status(400).json({ message: "Comment content is required" });
  }
  const post = await prisma.post.findUnique({
    where: { id: req.params.postId },
    include: { user: { select: { settings: true } } }
  });
  if (!post || post.deletedAt) return res.status(404).json({ message: "Post not found" });
  if (post.user?.settings?.interactionsEnabled === false) {
    return res.status(403).json({ message: "Interactions disabled by author" });
  }
  const ipHash = hashIp(req.ip);
  const ok = await consumeRateLimit(`rl:comment:${ipHash}:${post.id}`, 10, 60);
  if (!ok) return res.status(429).json({ message: "评论过于频繁，请稍后再试" });

  const item = await prisma.interaction.create({
    data: {
      postId: post.id,
      type: "comment",
      content: String(content).slice(0, 2000),
      parentId: parentId || null,
      ipHash
    }
  });
  return res.status(201).json(item);
});

router.post("/posts/:postId/reactions", async (req, res) => {
  const emoji = String(req.body.emoji || "👍").slice(0, 16);
  const post = await prisma.post.findUnique({
    where: { id: req.params.postId },
    include: { user: { select: { settings: true } } }
  });
  if (!post || post.deletedAt) return res.status(404).json({ message: "Post not found" });
  if (post.user?.settings?.interactionsEnabled === false) {
    return res.status(403).json({ message: "Interactions disabled by author" });
  }
  const ipHash = hashIp(req.ip);
  const ok = await consumeRateLimit(`rl:reaction:${ipHash}:${post.id}`, 20, 60);
  if (!ok) return res.status(429).json({ message: "操作过于频繁，请稍后再试" });
  const reactionKey = getReactionKey({ postId: post.id, emoji, ipHash });

  try {
    const item = await prisma.interaction.create({
      data: {
        postId: post.id,
        type: "reaction",
        content: emoji,
        ipHash,
        reactionKey
      }
    });
    return res.status(201).json(item);
  } catch (error) {
    if (error?.code === "P2002") {
      const existed = await prisma.interaction.findUnique({ where: { reactionKey } });
      if (existed) return res.status(200).json({ ...existed, deduplicated: true });
    }
    throw error;
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  const item = await prisma.interaction.findUnique({ where: { id: req.params.id } });
  if (!item) return res.status(404).json({ message: "Not found" });
  const post = await prisma.post.findUnique({ where: { id: item.postId } });
  if (!post || post.userId !== req.user.userId) return res.status(403).json({ message: "Forbidden" });
  await prisma.interaction.delete({ where: { id: item.id } });
  return res.status(204).send();
});

export default router;
