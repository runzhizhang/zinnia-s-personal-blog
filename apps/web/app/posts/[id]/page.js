"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../../components/api";

export default function PostDetailPage({ params }) {
  const [post, setPost] = useState(null);
  const [interactions, setInteractions] = useState({ comments: [], commentTree: [], reactions: [] });
  const [comment, setComment] = useState("");
  const [replyParentId, setReplyParentId] = useState(null);
  const [collapsed, setCollapsed] = useState({});
  const [message, setMessage] = useState("");
  const reactionTestIds = { "👍": "reaction-up", "❤️": "reaction-love", "💡": "reaction-idea", "🤔": "reaction-think" };

  async function load() {
    const postData = await apiFetch(`/api/posts/${params.id}`);
    const interactionData = await apiFetch(`/api/interactions/posts/${params.id}`);
    setPost(postData);
    setInteractions(interactionData);
  }

  useEffect(() => {
    load().catch((error) => setMessage(error.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function sendReaction(emoji) {
    try {
      await apiFetch(`/api/interactions/posts/${params.id}/reactions`, {
        method: "POST",
        body: JSON.stringify({ emoji })
      });
      await load();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function sendComment() {
    try {
      await apiFetch(`/api/interactions/posts/${params.id}/comments`, {
        method: "POST",
        body: JSON.stringify({ content: comment, parentId: replyParentId || undefined })
      });
      setComment("");
      setReplyParentId(null);
      await load();
    } catch (error) {
      setMessage(error.message);
    }
  }

  function countNestedReplies(node) {
    const children = node.children || [];
    return children.reduce((sum, child) => sum + 1 + countNestedReplies(child), 0);
  }

  function CommentNode({ node, depth = 0 }) {
    const childCount = countNestedReplies(node);
    const isCollapsed = !!collapsed[node.id];
    return (
      <div style={{ marginLeft: depth * 16, borderLeft: depth ? "2px solid #ece8df" : "none", paddingLeft: depth ? 8 : 0 }}>
        <p>
          <small>{new Date(node.createdAt).toLocaleString("zh-CN")}</small> - {node.content}
        </p>
        <div className="toolbar">
          <button
            type="button"
            onClick={() => {
              setReplyParentId(node.id);
              setComment(`@回复: `);
            }}
          >
            回复
          </button>
          {childCount > 0 ? (
            <button
              type="button"
              onClick={() => setCollapsed((prev) => ({ ...prev, [node.id]: !prev[node.id] }))}
            >
              {isCollapsed ? `展开回复 (${childCount})` : `折叠回复 (${childCount})`}
            </button>
          ) : null}
        </div>
        {!isCollapsed
          ? (node.children || []).map((child) => <CommentNode key={child.id} node={child} depth={depth + 1} />)
          : null}
      </div>
    );
  }

  if (!post) return <main className="card">加载中...</main>;

  return (
    <main>
      <article className="card">
        <h2 style={{ marginTop: 0 }}>{post.title || "无标题"}</h2>
        <p>{post.content}</p>
        <small>{new Date(post.createdAt).toLocaleString("zh-CN")}</small>
      </article>
      <section className="card">
        <h3 style={{ marginTop: 0 }}>反应</h3>
        <div className="toolbar">
          {["👍", "❤️", "💡", "🤔"].map((emoji) => (
            <button data-testid={reactionTestIds[emoji]} key={emoji} type="button" onClick={() => sendReaction(emoji)}>
              {emoji}
            </button>
          ))}
        </div>
        <p>
          {(interactions.reactions || []).map((r) => `${r.emoji} ${r.count}`).join("  ")}
        </p>
      </section>
      <section className="card">
        <h3 style={{ marginTop: 0 }}>评论</h3>
        <div className="toolbar">
          <input
            data-testid="comment-input"
            style={{ minWidth: 320 }}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="输入评论"
          />
          <button data-testid="comment-submit" type="button" onClick={sendComment}>
            发送
          </button>
          {replyParentId ? (
            <button type="button" onClick={() => setReplyParentId(null)}>
              取消回复
            </button>
          ) : null}
        </div>
        {(interactions.commentTree || []).map((node) => <CommentNode key={node.id} node={node} />)}
        {message ? <p>{message}</p> : null}
      </section>
    </main>
  );
}
