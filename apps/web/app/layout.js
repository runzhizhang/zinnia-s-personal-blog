import "./globals.css";
import NavBar from "../components/NavBar";

export const metadata = {
  title: "Personal Blog",
  description: "Self-hosted personal microblog"
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>
        <NavBar />
        <div className="container page-main">{children}</div>
      </body>
    </html>
  );
}
