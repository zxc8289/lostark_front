import type { Metadata } from "next";
import ToolMethodNote from "@/app/components/ToolMethodNote";

export const metadata: Metadata = {
    title: { absolute: "로아 보석 합성 계산기·겁화와 작열 가격 비교 | 로아체크" },
    description:
        "로스트아크 T4 겁화·작열 보석의 구매 가격과 하위 보석 3개를 사용하는 1회 합성 비용을 비교하세요. 조회한 경매장 가격으로 목표 보석의 구매·합성 비용 차이를 확인할 수 있습니다.",
    openGraph: {
        title: "로아 보석 합성 계산기·겁화와 작열 가격 비교 | 로아체크",
        description:
            "로스트아크 T4 겁화·작열 보석의 구매 가격과 하위 보석 3개를 사용하는 1회 합성 비용을 비교하세요. 조회한 경매장 가격으로 목표 보석의 구매·합성 비용 차이를 확인할 수 있습니다.",
        url: "https://loacheck.com/calculator/gem",
    },
};

export default function GemCalculatorLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}<ToolMethodNote tool="gem" calculatorLayout /></>;
}
