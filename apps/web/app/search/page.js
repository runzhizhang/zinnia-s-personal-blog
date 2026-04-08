"use client";

import { useState } from "react";
import { apiFetch } from "../../components/api";

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");

  async function doSearch() {
    try {
      setError("");
      const result = await apiFetch(`/api/posts/search?q=${encodeURIComponent(q)}`);
      setItems(result);
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <main>
      <section className="card">
        <h2 style={{ marginTop: 0 }}>搜索</h2>
        <p>支持语法：`tag:读书 before:2026-01-01T00:00:00.000Z`</p>
        <div className="toolbar">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="输入关键词或高级语法" style={{ minWidth: 360 }} />
          <button onClick={doSearch}>搜索</button>
        </div>
      </section>
      {error ? <p>{error}</p> : null}
      {items.map((item) => (
        <article className="card" key={item.id}>
          <h3 style={{ marginTop: 0 }}>{item.title || "无标题"}</h3>
          <p>{item.content.slice(0, 180)}</p>
        </article>
      ))}
    </main>
  );
}
