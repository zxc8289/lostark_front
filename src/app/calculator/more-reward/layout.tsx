import type { Metadata } from "next";

export const metadata: Metadata = {
    title: { absolute: "로아 더보기 효율 계산기·관문별 손익 | 로아체크" },
    description:
        "로스트아크 레이드 관문별 더보기 비용과 추가 재료의 가치를 비교하세요. 조회한 거래소 시세와 재료 포함·제외 설정을 기준으로 더보기 효율과 손익을 계산합니다.",
    openGraph: {
        title: "로아 더보기 효율 계산기·관문별 손익 | 로아체크",
        description:
            "로스트아크 레이드 관문별 더보기 비용과 추가 재료의 가치를 비교하세요. 조회한 거래소 시세와 재료 포함·제외 설정을 기준으로 더보기 효율과 손익을 계산합니다.",
        url: "https://loacheck.com/calculator/more-reward",
    },
};

export default function MoreRewardCalculatorLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
