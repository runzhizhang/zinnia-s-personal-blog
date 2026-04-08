"use client";

import { useState } from "react";
import { apiFetch } from "../../components/api";

export default function LoginPage() {
  const [email, setEmail] = useState("admin@personal-blog.local");
  const [password, setPassword] = useState("admin123456");
  const [message, setMessage] = useState("");

  async function login() {
    try {
      const data = await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      localStorage.setItem("token", data.token);
      setMessage("登录成功，已保存 token");
    } catch (error) {
      setMessage(`登录失败: ${error.message}`);
    }
  }

  return (
    <main className="card">
      <h2 style={{ marginTop: 0 }}>登录</h2>
      <div className="toolbar">
        <input data-testid="login-email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input data-testid="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button data-testid="login-submit" onClick={login}>登录</button>
      </div>
      {message ? <p>{message}</p> : null}
    </main>
  );
}
