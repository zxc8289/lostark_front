import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "경매 분배 계산기",
  description: "로스트아크 레이드 경매 적정 입찰가를 확인하세요. 손해보지 않는 N빵 마지노선과 선점 입찰가를 정확하게 계산해 드립니다.",
  openGraph: {
    title: "경매 분배 계산기 - 로아체크",
    description: "4인/8인/16인 레이드별 N빵 입찰가와 최적의 선점 입찰가를 실시간으로 분석해 드립니다.",
    url: "https://loacheck.com/calculator",
  },
};

export default function AuctionCalculatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}