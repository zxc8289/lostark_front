import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
    title: "레이드 보상 정보",
    description:
        "로스트아크 레이드별 입장 레벨, 일반 골드, 귀속 골드, 관문별 클리어 보상과 더보기 보상을 확인하세요.",
    openGraph: {
        title: "레이드 보상 정보 - 로아체크",
        description:
            "레이드별 골드 보상과 관문별 클리어 보상, 더보기 보상 정보를 한눈에 확인하세요.",
        url: "https://loacheck.com/raid-info",
        siteName: "로아체크",
        locale: "ko_KR",
        type: "website",
    },
};

export default function RaidInfoLayout({
    children,
}: {
    children: ReactNode;
}) {
    return <>{children}</>;
}