"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { API_BASE, apiFetch } from "../../../components/api";
import { useAuthStatus } from "../../../hooks/useAuthStatus";
import { useModal } from "../../../components/ModalProvider";
import { IconCalendar, IconPencil, IconTrash, IconUser } from "../../../components/icons";

function formatPostDate(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

function normalizeMediaUrl(html = "") {
  return String(html).replace(
    /https?:\/\/localhost:9000\/media\/([^"'()\s<]+)/g,
    (_m, objectPath) => `${API_BASE}/api/media/file/${objectPath}`
  );
}

export default function PostDetailPage({ params }) {
  const router = useRouter();
  const { alert, confirm } = useModal();
  const { loggedIn, user } = useAuthStatus();
  const [post, setPost] = useState(null);
  const [reactions, setReactions] = useState([]);
  const reactionTestId = "reaction-up";

  async function load() {
    const postData = await apiFetch(`/api/posts/${params.id}`);
    const interactionData = await apiFetch(`/api/interactions/posts/${params.id}`);
    setPost(postData);
    setReactions(interactionData.reactions || []);
  }

  useEffect(() => {
    load().catch(async (error) => {
      await alert({ message: error.message });
      router.push("/");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  useEffect(() => {
    if (!post) return;
    const html = post.htmlRendered || post.content || "";
    const imageCount = (String(html).match(/<img[\s\S]*?>/g) || []).length;
    console.info("[post-detail] content diagnostics", {
      postId: post.id,
      hasHtmlRendered: Boolean(post.htmlRendered),
      htmlLength: String(html).length,
      imageCount
    });
  }, [post]);

  async function sendLike() {
    try {
      await apiFetch(`/api/interactions/posts/${params.id}/reactions`, {
        method: "POST",
        body: JSON.stringify({ emoji: "👍" }),
      });
      await load();
    } catch (error) {
      await alert({ message: error.message });
    }
  }

  const isOwner =
    loggedIn && user?.id && post?.userId && post.userId === user.id;

  async function deletePost() {
    if (!(await confirm({ message: "确定删除这篇文章？" }))) return;
    try {
      const token = localStorage.getItem("token");
      await apiFetch(`/api/posts/${params.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      router.push("/");
    } catch (error) {
      await alert({ message: error.message });
    }
  }

  if (!post) {
    return (
      <main className="post-detail-page">
        <div className="card post-detail-article">
          <p className="post-detail-loading">加载中…</p>
        </div>
      </main>
    );
  }

  const authorLabel = post.user?.username || "博主";
  const likeCount =
    (reactions || []).find((r) => r.emoji === "👍")?.count ?? 0;

  return (
    <main className="post-detail-page">
      <article className="card post-detail-article">
        <header className="post-detail-head">
          <div className="post-detail-title-row">
            <h1 className="post-detail-title">{post.title || "无标题"}</h1>
            {isOwner ? (
              <div className="post-detail-icon-actions">
                <Link
                  href={`/compose?edit=${post.id}`}
                  className="post-detail-icon-btn"
                  aria-label="编辑"
                  title="编辑"
                >
                  <IconPencil />
                </Link>
                <button
                  type="button"
                  className="post-detail-icon-btn post-detail-icon-btn-danger"
                  aria-label="删除"
                  title="删除"
                  onClick={deletePost}
                >
                  <IconTrash />
                </button>
              </div>
            ) : null}
          </div>
          <div className="post-detail-meta">
            <span className="post-detail-meta-item">
              <IconUser className="post-detail-meta-icon" />
              {authorLabel}
            </span>
            <span className="post-detail-meta-item">
              <IconCalendar className="post-detail-meta-icon" />
              <time dateTime={post.createdAt}>{formatPostDate(post.createdAt)}</time>
            </span>
          </div>
          {post.tags?.length ? (
            <div className="post-detail-tags">
              {post.tags.map((t) => (
                <span key={t.tag.id} className="post-detail-tag-pill">
                  {t.tag.name}
                </span>
              ))}
            </div>
          ) : null}
        </header>
        {post.htmlRendered ? (
          <div
            className="post-detail-body"
            dangerouslySetInnerHTML={{ __html: normalizeMediaUrl(post.htmlRendered) }}
          />
        ) : (
          <div className="post-detail-body post-detail-body-plain">{post.content}</div>
        )}
      </article>
      <section className="card">
        <h3 style={{ marginTop: 0 }}>点赞</h3>
        <div className="toolbar">
          <button
            data-testid={reactionTestId}
            type="button"
            onClick={sendLike}
            aria-label="点赞"
          >
            👍
          </button>
        </div>
        <p className="post-like-count" data-testid="like-count">
          👍 {likeCount}
        </p>
      </section>
    </main>
  );
}
