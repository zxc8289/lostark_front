import type { Metadata } from "next";
import ToolMethodNote from "@/app/components/ToolMethodNote";

export const metadata: Metadata = {
    title: { absolute: "로아 주간 골드 계산기·레이드 수익 | 로아체크" },
    description:
        "로스트아크 캐릭터별 레이드를 선택해 원정대 주간 골드 수익을 계산하세요. 거래 가능 골드와 귀속 골드를 구분하고 선택한 레이드의 주간 보상 합계를 확인할 수 있습니다.",
    openGraph: {
        title: "로아 주간 골드 계산기·레이드 수익 | 로아체크",
        description:
            "로스트아크 캐릭터별 레이드를 선택해 원정대 주간 골드 수익을 계산하세요. 거래 가능 골드와 귀속 골드를 구분하고 선택한 레이드의 주간 보상 합계를 확인할 수 있습니다.",
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
