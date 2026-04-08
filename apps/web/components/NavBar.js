"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStatus } from "../hooks/useAuthStatus";
import { IconEnter, IconHome, IconLogout, IconPencil } from "./icons";

function linkActive(href, pathname) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { loggedIn, logout } = useAuthStatus();

  function handleLogout() {
    logout();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="site-header">
      <div className="nav-inner">
        <Link href="/" className="nav-brand">
          我的博客
        </Link>
        <nav className="nav-menu" aria-label="主导航">
          <Link
            href="/"
            className={linkActive("/", pathname) ? "nav-item nav-item-active nav-item-with-icon" : "nav-item nav-item-with-icon"}
          >
            <IconHome />
            首页
          </Link>
          {loggedIn ? (
            <Link
              href="/compose"
              className={
                linkActive("/compose", pathname) ? "nav-item nav-item-active nav-item-with-icon" : "nav-item nav-item-with-icon"
              }
            >
              <IconPencil />
              发布
            </Link>
          ) : null}
          {loggedIn ? (
            <button type="button" className="nav-item nav-item-button nav-item-with-icon" onClick={handleLogout}>
              <IconLogout />
              退出
            </button>
          ) : (
            <Link
              href="/login"
              className={linkActive("/login", pathname) ? "nav-item nav-item-active nav-item-with-icon" : "nav-item nav-item-with-icon"}
            >
              <IconEnter />
              登录
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
