import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "보석 합성 계산기 | 로아체크",
    description:
        "로스트아크 보석을 직접 구매할지, 하위 보석 3개를 합성할지 비교해 기대 비용과 차액을 계산합니다.",
    openGraph: {
        title: "보석 합성 계산기 - 로아체크",
        description:
            "보석 레벨과 피해/쿨감 보석 가격을 기준으로 합성 기대 비용, 구매 비용, 손익 차이를 비교합니다.",
        url: "https://loacheck.com/calculator/gem",
    },
};

export default function GemCalculatorLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
