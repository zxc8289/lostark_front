import type { Metadata } from "next";
import "./globals.css";

import Nav from "./components/Nav";
import AuthSessionProvider from "./components/AuthSessionProvider";
import WebSocketProvider from "./components/WebSocketProvider";
import Footer from "./components/Footer";
import AppAlertModal from "./components/AppAlertModal";

import { pretendard } from "./fonts";
import Script from "next/script";
import { GoogleTagManager } from "@next/third-parties/google";

export const metadata: Metadata = {
  title: {
    template: "%s | 로아체크",
    default: "로아체크 - 로스트아크 레이드 체크",
  },
  description:
    "로스트아크 숙제 관리, 레이드 딜 지분 분석, 젬 세팅 계산을 도와주는 로아체크입니다.",
  keywords: [
    "로스트아크",
    "로아",
    "숙제",
    "계산기",
    "딜지분",
    "로아체크",
    "loacheck",
    "레이드",
    "수익",
    "보석",
    "경매",
    "더보기",
  ],
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "로아체크 - 로스트아크 레이드 체크",
    description:
      "로스트아크 숙제 관리, 레이드 수익 계산, 딜 지분 분석, 젬 세팅 계산을 한 번에 확인해보세요.",
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "로아체크",
    alternateName: ["LOACHECK", "loacheck"],
    url: "https://loacheck.com",
    description:
      "로스트아크 숙제 관리, 레이드 수익 계산, 딜 지분 분석, 젬 세팅 계산 도구",
    inLanguage: "ko-KR",
    publisher: {
      "@type": "Organization",
      name: "로아체크",
      url: "https://loacheck.com",
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: "zxc8289@gmail.com",
        availableLanguage: ["ko"],
      },
    },
    potentialAction: {
      "@type": "SearchAction",
      target: "https://loacheck.com/support?q={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <html lang="ko">
      <body
        className={`${pretendard.variable} font-pretendard min-h-screen flex flex-col bg-[#1B1D22] text-gray-300`}
      >
        <GoogleTagManager gtmId="GTM-PF49FQBN" />


        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1712313315461589"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />

        <Script
          id="website-json-ld"
          type="application/ld+json"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteJsonLd),
          }}
        />

        <AuthSessionProvider>
          <WebSocketProvider>
            <AppAlertModal />

            <header>
              <Nav />
            </header>

            <main className="flex-1 w-full max-w-7xl mx-auto sm:px-6 pt-22 pb-8">
              {children}
            </main>

            <Footer />
          </WebSocketProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
