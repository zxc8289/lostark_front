import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "영지 제작 수익 계산기 | 로아체크",
    description:
        "로스트아크 원정대 영지에서 제작하는 오레하와 아비도스 융화 재료의 제작비, 판매 수익, 직접 사용 효율을 계산합니다.",
    openGraph: {
        title: "영지 제작 수익 계산기 - 로아체크",
        description:
            "융화 재료 시세와 제작비를 기준으로 판매 차익, 직접 사용 차익, 원가 이익률, 활동력당 수익을 비교합니다.",
        url: "https://loacheck.com/calculator/craft",
    },
};

export default function CraftCalculatorLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
