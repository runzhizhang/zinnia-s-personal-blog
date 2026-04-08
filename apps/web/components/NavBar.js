"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "首页" },
  { href: "/compose", label: "发布" },
  { href: "/login", label: "登录" }
];

function linkActive(href, pathname) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function NavBar() {
  const pathname = usePathname();

  return (
    <header className="site-header">
      <div className="nav-inner">
        <Link href="/" className="nav-brand">
          个人博客
        </Link>
        <nav className="nav-menu" aria-label="主导航">
          {LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={linkActive(href, pathname) ? "nav-item nav-item-active" : "nav-item"}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
