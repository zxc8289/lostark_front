import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "로아 계산기",
  description: "로스트아크 주간 레이드 골드, 더보기 효율, 경매 입찰가, 보석 합성과 영지 제작 수익을 계산하세요.",
  openGraph: {
    title: "로아 계산기 | 로아체크",
    description: "로스트아크 주간 레이드 골드, 더보기 효율, 경매 입찰가, 보석 합성과 영지 제작 수익을 계산하세요.",
    url: "https://loacheck.com/calculator",
  },
};

export default function CalculatorRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="w-full text-white py-8 sm:py-12">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-0">
        {children}
      </div>
    </div>
  );
}
