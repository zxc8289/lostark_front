import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "내 숙제 현황",
    description: "오늘 해야 할 로스트아크 숙제(카던, 가디언, 레이드)를 체크하고 예상 골드 수익을 확인하세요.",
    openGraph: {
        title: "내 숙제 현황 - 로아체크",
        description: "매일 숙제와 주간 레이드 수익을 한눈에 관리하고 자동으로 세팅해보세요.",
        url: "https://loacheck.com/my-tasks",
    },
};

export default function MyTasksLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}