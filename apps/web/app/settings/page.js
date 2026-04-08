"use client";

import { useState } from "react";
import { apiFetch } from "../../components/api";
import { useModal } from "../../components/ModalProvider";

export default function SettingsPage() {
  const { alert } = useModal();
  const [format, setFormat] = useState("json");

  async function triggerExport() {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        await alert({ message: "请先登录后再操作" });
        return;
      }
      const job = await apiFetch("/api/export", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ format })
      });
      await alert({ message: `导出任务已创建: ${job.id}` });
    } catch (error) {
      await alert({ message: `创建失败: ${error.message}` });
    }
  }

  return (
    <main>
      <section className="card">
        <h2 style={{ marginTop: 0 }}>设置</h2>
        <p>隐私与备份配置（基础版）。</p>
        <div className="toolbar">
          <select value={format} onChange={(e) => setFormat(e.target.value)}>
            <option value="json">JSON</option>
            <option value="markdown">Markdown</option>
            <option value="pdf">PDF</option>
          </select>
          <button onClick={triggerExport}>手动导出</button>
        </div>
      </section>
    </main>
  );
}
