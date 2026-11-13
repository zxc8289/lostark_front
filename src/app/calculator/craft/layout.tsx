import type { Metadata } from "next";
import ToolMethodNote from "@/app/components/ToolMethodNote";

export const metadata: Metadata = {
    title: { absolute: "로아 영지 제작 계산기·오레하와 아비도스 수익 | 로아체크" },
    description:
        "로스트아크 영지에서 만드는 오레하·아비도스 융화 재료의 제작비와 예상 수익을 계산하세요. 재료 시세, 제작 수수료와 대성공 확률을 반영해 판매와 직접 사용 효율을 비교합니다.",
    openGraph: {
        title: "로아 영지 제작 계산기·오레하와 아비도스 수익 | 로아체크",
        description:
            "로스트아크 영지에서 만드는 오레하·아비도스 융화 재료의 제작비와 예상 수익을 계산하세요. 재료 시세, 제작 수수료와 대성공 확률을 반영해 판매와 직접 사용 효율을 비교합니다.",
        url: "https://loacheck.com/calculator/craft",
    },
};

export default function CraftCalculatorLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}<ToolMethodNote tool="craft" calculatorLayout /></>;
}
