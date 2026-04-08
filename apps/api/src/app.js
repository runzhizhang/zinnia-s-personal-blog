import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import authRoutes from "./routes/auth.js";
import postsRoutes from "./routes/posts.js";
import searchRoutes from "./routes/search.js";
import tagsRoutes from "./routes/tags.js";
import statsRoutes from "./routes/stats.js";
import exportRoutes from "./routes/export.js";
import mediaRoutes from "./routes/media.js";
import interactionsRoutes from "./routes/interactions.js";
import { prisma } from "@personal-blog/db/src/client.js";

export const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());
app.use(morgan("dev"));

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", authRoutes);
// 必须先于 /api/posts，否则 GET /api/posts/search 会被 /:id 当成 id=search
app.use("/api/posts/search", searchRoutes);
app.use("/api/posts", postsRoutes);
app.use("/api/tags", tagsRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/export", exportRoutes);
app.use("/api/media", mediaRoutes);
app.use("/api/interactions", interactionsRoutes);

function xmlEscape(value = "") {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

app.get("/rss.xml", async (_req, res) => {
  res.type("application/xml");
  let posts = [];
  try {
    posts = await prisma.post.findMany({
      where: { deletedAt: null, visibility: "public" },
      orderBy: { createdAt: "desc" },
      take: 30
    });
  } catch (_error) {
    posts = [];
  }
  const items = posts
    .map((post) => {
      const title = xmlEscape(post.title || "无标题");
      const description = xmlEscape(post.content.slice(0, 300));
      const html = post.htmlRendered || `<p>${xmlEscape(post.content).replace(/\n/g, "<br/>")}</p>`;
      const link = `http://localhost:3000/posts/${post.id}`;
      return `<item><title>${title}</title><link>${link}</link><guid>${post.id}</guid><pubDate>${new Date(post.createdAt).toUTCString()}</pubDate><description>${description}</description><content:encoded><![CDATA[${html}]]></content:encoded></item>`;
    })
    .join("");
  res.send(
    `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/"><channel><title>Personal Blog</title><link>http://localhost:3000</link><description>个人博客 RSS</description>${items}</channel></rss>`
  );
});
