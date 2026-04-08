import "./globals.css";
import Link from "next/link";

export const metadata = {
  title: "Personal Blog",
  description: "Self-hosted personal microblog"
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>
        <div className="container">
          <nav className="toolbar" style={{ justifyContent: "space-between", marginBottom: 16 }}>
            <strong>个人博客</strong>
            <div className="toolbar">
              <Link href="/">首页</Link>
              <Link href="/compose">发布</Link>
              <Link href="/search">搜索</Link>
              <Link href="/archive">归档</Link>
              <Link href="/settings">设置</Link>
              <Link href="/login">登录</Link>
            </div>
          </nav>
          {children}
        </div>
      </body>
    </html>
  );
}
