// calculator/more-reward/page.tsx
import { Metadata } from "next";
import MoreRewardCalculatorPage from "./page";

export const metadata: Metadata = {
    title: "더보기 효율 계산기 | 로아체크",
    description: "레이드 관문별 더보기 보상의 가치를 계산하고 이득인지 손해인지 확인하세요.",
    openGraph: {
        title: "더보기 효율 계산기 - 로아체크",
        description: "현재 거래소 시세를 반영하여 더보기 효율을 자동으로 계산해 드립니다.",
        url: "https://loacheck.com/calculator/more-reward",
    },
};

export default function Page() {
    return <MoreRewardCalculatorPage />;
}