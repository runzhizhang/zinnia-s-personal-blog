"use client";

import { useState } from "react";
import { apiFetch } from "../../components/api";
import { useModal } from "../../components/ModalProvider";

export default function SearchPage() {
  const { alert } = useModal();
  const [q, setQ] = useState("");
  const [items, setItems] = useState([]);

  async function doSearch() {
    try {
      const result = await apiFetch(`/api/posts/search?q=${encodeURIComponent(q)}`);
      setItems(result);
    } catch (e) {
      await alert({ message: e.message });
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
      {items.map((item) => (
        <article className="card" key={item.id}>
          <h3 style={{ marginTop: 0 }}>{item.title || "无标题"}</h3>
          <p>{item.content.slice(0, 180)}</p>
        </article>
      ))}
    </main>
  );
}
