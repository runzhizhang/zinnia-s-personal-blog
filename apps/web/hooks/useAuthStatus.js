"use client";

import { useState, useEffect, useCallback } from "react";

/** 与登录页、退出处约定：写入/删除 token 后派发该事件以便同页更新导航 */
export const AUTH_CHANGE_EVENT = "personal-blog-auth-change";

function readStoredUser() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** 无验签，仅用于前端展示「是否本人文章」；权限以服务端为准 */
function userFromToken(token) {
  if (!token) return null;
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const json = atob(part.replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(json);
    if (payload?.userId) {
      return { id: payload.userId, username: payload.username };
    }
  } catch {
    // ignore
  }
  return null;
}

/** 供非 Hook 场景（如 compose 页加载）读取当前用户 */
export function getClientUser() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("user");
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return userFromToken(localStorage.getItem("token"));
}

export function useAuthStatus() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [user, setUser] = useState(null);

  const sync = useCallback(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("token");
    setLoggedIn(Boolean(token));
    setUser(readStoredUser() || userFromToken(token));
  }, []);

  useEffect(() => {
    sync();
    const onStorage = (e) => {
      if (e.key === "token" || e.key === "user" || e.key === null) sync();
    };
    const onAuthChange = () => sync();
    window.addEventListener("storage", onStorage);
    window.addEventListener(AUTH_CHANGE_EVENT, onAuthChange);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(AUTH_CHANGE_EVENT, onAuthChange);
    };
  }, [sync]);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
  }, []);

  return { loggedIn, user, logout };
}
