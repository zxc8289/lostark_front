import type { Metadata } from "next";
import ToolMethodNote from "@/app/components/ToolMethodNote";

export const metadata: Metadata = {
  title: "딜 지분 계산기",
  description: "내 캐릭터의 레이드 딜 지분율(잔혈, 강투)을 추정하고 계산 기준을 확인해보세요.",
  openGraph: {
    title: "딜 지분 계산기 - 로아체크",
    description: "잔혈, 강투 컷을 확인하고 공대 내 기여도를 실시간으로 분석하세요.",
    url: "https://loacheck.com/dps-share",
  },
};

export default function DpsShareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}<ToolMethodNote tool="dps" /></>;
}