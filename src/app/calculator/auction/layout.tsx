import type { Metadata } from "next";
import ToolMethodNote from "@/app/components/ToolMethodNote";

export const metadata: Metadata = {
  title: { absolute: "경매 분배 계산기 | 로아체크" },
  description: "판매가와 파티 인원으로 N빵·선점 입찰가를 계산하고 재판매 이익과 분배금을 비교하세요.",
  alternates: { canonical: "https://loacheck.com/calculator/auction/" },
  openGraph: {
    title: "경매 분배 계산기 | 로아체크",
    description: "판매가와 파티 인원으로 N빵·선점 입찰가와 분배금을 비교하세요.",
    url: "https://loacheck.com/calculator/auction/",
  },
};

export default function AuctionLayout({ children }: { children: React.ReactNode }) {
  return <>{children}<ToolMethodNote tool="auction" calculatorLayout /></>;
}
