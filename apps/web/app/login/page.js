"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../../components/api";
import { AUTH_CHANGE_EVENT } from "../../hooks/useAuthStatus";
import { IconEnter } from "../../components/icons";
import { message } from "antd";

export default function LoginPage() {
  const router = useRouter();
  const [account, setAccount] = useState("admin@personal-blog.local");
  const [password, setPassword] = useState("admin123456");
  const [messageApi, contextHolder] = message.useMessage();

  async function login() {
    try {
      const trimmed = account.trim();
      const body = trimmed.includes("@")
        ? { email: trimmed, password }
        : { username: trimmed, password };

      const data = await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(body),
      });
      localStorage.setItem("token", data.token);
      if (data.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
      }
      window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
      messageApi.success("登录成功");
      setTimeout(() => {
        router.push("/");
      }, 1000);
    } catch (error) {
      messageApi.error(`登录失败: ${error.message}`);
    }
  }

  return (
    <main className="login-page">
      {contextHolder}
      <div className="login-panel">
        <h1 className="login-title">欢迎回来</h1>
        <p className="login-subtitle">登录以发布和管理你的文章</p>

        <form
          className="login-form"
          autoComplete="off"
          onSubmit={(e) => {
            e.preventDefault();
            login();
          }}
        >
          <div className="login-field">
            <label htmlFor="login-account">用户名</label>
            <input
              id="login-account"
              data-testid="login-email"
              type="text"
              name="blog-login-account"
              autoComplete="off"
              placeholder="请输入用户名"
              value={account}
              onChange={(e) => setAccount(e.target.value)}
            />
          </div>
          <div className="login-field">
            <label htmlFor="login-password">密码</label>
            <input
              id="login-password"
              data-testid="login-password"
              type="password"
              name="blog-login-password"
              autoComplete="off"
              placeholder="请输入密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="login-submit"
            data-testid="login-submit"
          >
            <IconEnter width={20} height={20} />
            登录
          </button>
        </form>
      </div>
    </main>
  );
}
