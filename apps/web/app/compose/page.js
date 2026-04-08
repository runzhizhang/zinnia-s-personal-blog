"use client";

import { useState } from "react";
import { apiFetch } from "../../components/api";

export default function ComposePage() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [visibility, setVisibility] = useState("public");
  const [result, setResult] = useState("");

  async function onSubmit(event) {
    event.preventDefault();
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setResult("请先登录后再发布");
        return;
      }
      await apiFetch("/api/posts", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title,
          content,
          visibility,
          tags: tags.split(",").map((t) => t.trim()).filter(Boolean)
        })
      });
      setResult("发布成功");
      setContent("");
      setTitle("");
      setTags("");
    } catch (error) {
      setResult(`发布失败: ${error.message}`);
    }
  }

  return (
    <main>
      <form className="card" onSubmit={onSubmit}>
        <h2 style={{ marginTop: 0 }}>发布内容</h2>
        <div className="toolbar">
          <input data-testid="compose-title" placeholder="标题（可选）" value={title} onChange={(e) => setTitle(e.target.value)} />
          <select data-testid="compose-visibility" value={visibility} onChange={(e) => setVisibility(e.target.value)}>
            <option value="public">公开</option>
            <option value="password">密码保护</option>
            <option value="private">私密</option>
          </select>
        </div>
        <textarea
          data-testid="compose-content"
          placeholder="记录此刻..."
          style={{ width: "100%", minHeight: 180, marginTop: 10 }}
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <input
          data-testid="compose-tags"
          style={{ width: "100%", marginTop: 10 }}
          placeholder="标签，逗号分隔"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
        />
        <div className="toolbar" style={{ marginTop: 12 }}>
          <button data-testid="compose-submit" type="submit">发布</button>
          <small>快捷键可扩展为 Cmd/Ctrl + Enter</small>
        </div>
        {result ? <p>{result}</p> : null}
      </form>
    </main>
  );
}
