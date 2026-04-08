import Link from "next/link";
import { apiFetch } from "../components/api";

function renderTags(post) {
  return (post.tags || []).map((t) => `#${t.tag.name}`).join(" ");
}

export default async function HomePage() {
  let posts = [];
  try {
    posts = await apiFetch("/api/posts?page=1&pageSize=20");
  } catch (_error) {
    posts = [];
  }

  return (
    <main>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>时间线</h2>
        <p>严格按时间倒序展示，支持标签筛选与搜索。</p>
        <Link href="/compose">+ 发布新内容</Link>
      </div>
      {posts.map((post) => (
        <article className="card" key={post.id}>
          <h3 style={{ marginTop: 0 }}>
            <Link href={`/posts/${post.id}`}>{post.title || "无标题"}</Link>
          </h3>
          <p>{post.content.slice(0, 160)}</p>
          <small>{new Date(post.createdAt).toLocaleString("zh-CN")}</small>
          <p>{renderTags(post)}</p>
        </article>
      ))}
    </main>
  );
}
