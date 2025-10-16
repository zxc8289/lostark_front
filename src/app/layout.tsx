// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import Nav from "./components/Nav";
import AuthSessionProvider from "./components/AuthSessionProvider"; // ✨ 프로바이더 import
import { pretendard } from "./fonts";

export const metadata: Metadata = { title: "로스트아크 도우미" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className={`${pretendard.variable} font-pretendard min-h-screen flex flex-col bg-[#1B1D22] text-gray-300`}>
        <AuthSessionProvider>
          <header>
            <Nav />
          </header>
          <main
            className="w-full max-w-7xl mx-auto flex-1 px-4 sm:px-6 py-2
                       grid min-h-[calc(100vh-5rem)]"
          >
            {children}
          </main>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
