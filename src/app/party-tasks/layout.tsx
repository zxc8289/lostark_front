import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "파티 숙제 관리",
    description: "고정 공대나 파티원들의 숙제 현황을 실시간으로 공유하고 관리하세요. 초대 코드로 간편하게 파티를 만들고 레이드 진행 상황을 체크할 수 있습니다.",
    openGraph: {
        title: "파티 숙제 관리 - 로아체크",
        description: "파티원들에게 일일이 숙제 했냐고 물어보지 마세요. 로아체크 파티 관리로 서로의 현황을 한눈에 파악할 수 있습니다.",
        url: "https://loacheck.com/party-tasks",
    },
};

export default function PartyTasksLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}