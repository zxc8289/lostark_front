import type { Metadata } from "next";
import "./globals.css";
import Nav from "./components/Nav";
import AuthSessionProvider from "./components/AuthSessionProvider";
import { pretendard } from "./fonts";
import Footer from "./components/Footer";
import Script from "next/script"; // [필수] Script 컴포넌트 불러오기

// 1. 메타데이터 설정
export const metadata: Metadata = {
  title: {
    template: "%s | 로아체크",
    default: "로아체크 - 로스트아크 레이드 체크",
  },
  description: "로스트아크 숙제 관리, 레이드 딜 지분 분석, 젬 세팅 계산",
  keywords: ["로스트아크", "로아", "숙제", "계산기", "딜지분", "로아체크", "loacheck", "레이드", "수익"],
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "로아체크 - 로스트아크의 모든 계산",
    description: "오늘의 숙제와 레이드 수익을 확인해보세요.",
    url: "https://loacheck.com",
    siteName: "로아체크",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "로아체크 미리보기",
      },
    ],
    locale: "ko_KR",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
  verification: {
    other: {
      "naver-site-verification": "2783d50ef6bcf04640158574207fa1306d3a022a",
    },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className={`${pretendard.variable} font-pretendard min-h-screen flex flex-col bg-[#1B1D22] text-gray-300`}>

        {/* Next.js 최적화를 위해 next/script를 사용합니다 */}
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1712313315461589"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />

        {/* 구조화된 데이터 */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "로아체크",
              "url": "https://loacheck.com",
              "description": "로스트아크 숙제 및 딜 지분 계산 도구",
            }),
          }}
        />

        <AuthSessionProvider>
          <header>
            <Nav />
          </header>

          <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 pt-22 pb-8">
            {children}
          </main>

          <Footer />
        </AuthSessionProvider>
      </body>
    </html>
  );
}