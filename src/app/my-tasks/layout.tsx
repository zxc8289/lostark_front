import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "로아 주간 숙제 체크·원정대 레이드 관리",
    description: "로스트아크 원정대 캐릭터별 주간 레이드 숙제를 한눈에 관리하세요. 레이드 난이도와 골드 획득 여부를 설정하고 관문별 완료 상태와 남은 숙제를 확인할 수 있습니다.",
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
        },
    },
    openGraph: {
        title: "로아 주간 숙제 체크·원정대 레이드 관리 | 로아체크",
        description: "로스트아크 원정대 캐릭터별 주간 레이드 숙제를 한눈에 관리하세요. 레이드 난이도와 골드 획득 여부를 설정하고 관문별 완료 상태와 남은 숙제를 확인할 수 있습니다.",
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
