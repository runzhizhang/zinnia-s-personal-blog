"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { apiFetch } from "./api";
import { useAuthStatus } from "../hooks/useAuthStatus";
import { IconPencil, IconTrash } from "./icons";
import { useModal } from "./ModalProvider";

function useDebouncedValue(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

function plainExcerpt(value = "") {
  return String(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export default function HomeTimeline({ initialPosts, tags }) {
  const { loggedIn, user } = useAuthStatus();
  const { alert, confirm } = useModal();
  const [q, setQ] = useState("");
  const [tag, setTag] = useState("");
  const debouncedQ = useDebouncedValue(q, 350);
  const [posts, setPosts] = useState(initialPosts);
  const [loading, setLoading] = useState(false);
  const hasInitialData = Array.isArray(initialPosts) && initialPosts.length > 0;
  const skipInitialFetch = useRef(hasInitialData);

  useEffect(() => {
    const dq = debouncedQ.trim();
    const tg = tag.trim();

    if (skipInitialFetch.current) {
      skipInitialFetch.current = false;
      if (!dq && !tg) return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        let data;
        if (!dq && !tg) {
          data = await apiFetch("/api/posts?page=1&pageSize=20");
        } else {
          const parts = [];
          if (dq) parts.push(dq);
          if (tg) parts.push(`tag:${tg}`);
          data = await apiFetch(
            `/api/posts/search?q=${encodeURIComponent(parts.join(" "))}`,
          );
        }
        if (!cancelled) setPosts(data);
      } catch {
        if (!cancelled) setPosts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debouncedQ, tag]);

  const hasFilter = Boolean(q.trim() || tag.trim());
  const showEmpty = posts.length === 0 && !loading;

  function isOwner(post) {
    return loggedIn && user?.id && post.userId === user.id;
  }

  async function deletePost(postId) {
    if (!(await confirm({ message: "确定删除这篇文章？" }))) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      await apiFetch(`/api/posts/${postId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (e) {
      await alert({ message: e.message || "删除失败" });
    }
  }

  return (
    <>
      <header className="home-hero">
        <h1 className="home-hero-title">欢迎来到我的博客</h1>
        <p className="home-hero-subtitle">分享想法，记录生活</p>
      </header>

      <section style={{ marginBottom: 20 }}>
        <div
          className="home-filter"
          role="search"
          aria-label="博客搜索与标签筛选"
        >
          <input
            type="search"
            placeholder="搜索标题或正文…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoComplete="off"
            aria-label="搜索关键词"
          />
          <select
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            aria-label="按标签筛选"
          >
            <option value="">全部标签</option>
            {tags.map((t) => (
              <option key={t.id} value={t.name}>
                {t.name}
              </option>
            ))}
          </select>
          {loading ? <span className="home-filter-status">加载中…</span> : null}
        </div>

        {hasFilter ? (
          <p className="home-filter-meta">
            当前筛选
            {q.trim() ? ` · 关键词「${q.trim()}」` : ""}
            {tag.trim() ? ` · 标签「${tag.trim()}」` : ""}
          </p>
        ) : null}
      </section>

      {showEmpty ? (
        <div className="home-empty" role="status">
          <p className="home-empty-text">
            {hasFilter
              ? "暂无符合条件的内容，试试调整关键词或标签。"
              : "还没有发布任何文章"}
          </p>
          {!hasFilter && loggedIn ? (
            <Link href="/compose" className="home-empty-cta">
              写第一篇文章
            </Link>
          ) : null}
          {!hasFilter && !loggedIn ? (
            <Link
              href="/login"
              className="home-empty-cta home-empty-cta-secondary"
            >
              登录后发布
            </Link>
          ) : null}
        </div>
      ) : (
        <ul className="home-post-list">
          {posts.map((post) => (
            <li key={post.id}>
              <article className="card post-card">
                <div className="post-card-row">
                  <Link
                    href={`/posts/${post.id}`}
                    className="post-card-content-link"
                    aria-label={`查看全文：${post.title || "无标题"}`}
                  >
                    <h3 className="post-card-title">
                      {post.title || "无标题"}
                    </h3>
                    <p className="post-card-excerpt">
                      {plainExcerpt(post.content).slice(0, 160)}
                    </p>
                    <div className="post-card-meta">
                      <time dateTime={post.createdAt}>
                        {new Date(post.createdAt).toLocaleString("zh-CN")}
                      </time>
                    </div>
                  </Link>
                  {isOwner(post) ? (
                    <div className="post-card-icon-actions">
                      <Link
                        href={`/compose?edit=${post.id}`}
                        className="post-card-icon-btn"
                        aria-label="编辑"
                        title="编辑"
                      >
                        <IconPencil />
                      </Link>
                      <button
                        type="button"
                        className="post-card-icon-btn post-card-icon-btn-danger"
                        aria-label="删除"
                        title="删除"
                        onClick={() => deletePost(post.id)}
                      >
                        <IconTrash />
                      </button>
                    </div>
                  ) : null}
                </div>
                <PostTags post={post} onPickTag={setTag} />
              </article>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function PostTags({ post, onPickTag }) {
  if (!post.tags?.length) return null;
  return (
    <p className="post-tags">
      {post.tags.map((t) => (
        <button
          key={t.tag.id}
          type="button"
          className="tag-link"
          onClick={() => onPickTag(t.tag.name)}
        >
          #{t.tag.name}
        </button>
      ))}
    </p>
  );
}
