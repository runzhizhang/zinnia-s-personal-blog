import "./globals.css";
import NavBar from "../components/NavBar";
import { Providers } from "./providers";

export const metadata = {
  title: "我的博客",
  description: "个人博客"
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>
        <Providers>
          <NavBar />
          <div className="container page-main">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
