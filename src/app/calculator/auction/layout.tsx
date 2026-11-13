import type { Metadata } from "next";
import ToolMethodNote from "@/app/components/ToolMethodNote";

export const metadata: Metadata = {
  title: { absolute: "로아 경매 계산기·입찰가와 N빵 분배 | 로아체크" },
  description: "로스트아크 레이드 경매 아이템의 예상 판매가와 파티 인원을 입력해 N빵·선점 입찰가를 계산하세요. 판매 수수료를 반영한 재판매 이익과 분배금을 비교할 수 있습니다.",
  alternates: { canonical: "https://loacheck.com/calculator/auction/" },
  openGraph: {
    title: "로아 경매 계산기·입찰가와 N빵 분배 | 로아체크",
    description: "로스트아크 레이드 경매 아이템의 예상 판매가와 파티 인원을 입력해 N빵·선점 입찰가를 계산하세요. 판매 수수료를 반영한 재판매 이익과 분배금을 비교할 수 있습니다.",
    url: "https://loacheck.com/calculator/auction/",
  },
};

export default function AuctionLayout({ children }: { children: React.ReactNode }) {
  return <>{children}<ToolMethodNote tool="auction" calculatorLayout /></>;
}
