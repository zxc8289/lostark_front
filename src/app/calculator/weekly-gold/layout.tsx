import type { Metadata } from "next";
import ToolMethodNote from "@/app/components/ToolMethodNote";

export const metadata: Metadata = {
    title: "주간 레이드 수익 계산기 | 로아체크",
    description:
        "로스트아크 캐릭터별 레이드 선택을 기준으로 주간 거래 가능 골드, 귀속 골드, 총 레이드 수익을 계산합니다.",
    openGraph: {
        title: "주간 레이드 수익 계산기 - 로아체크",
        description:
            "캐릭터 레벨과 레이드 3개 선택을 바탕으로 원정대 주간 레이드 수익을 한눈에 계산합니다.",
        url: "https://loacheck.com/calculator/weekly-gold",
    },
};

export default function WeeklyGoldCalculatorLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}<ToolMethodNote tool="weekly-gold" calculatorLayout /></>;
}
