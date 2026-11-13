import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "로아 파티 숙제 공유·고정팟 레이드 관리",
    description:
        "로스트아크 깐부·고정팟과 캐릭터별 레이드 숙제 진행 상황을 공유하세요. 초대 코드로 파티를 만들고 파티원의 레이드 난이도와 관문별 완료 상태를 함께 확인할 수 있습니다.",
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
        },
    },
    openGraph: {
        title: "로아 파티 숙제 공유·고정팟 레이드 관리 | 로아체크",
        description:
            "로스트아크 깐부·고정팟과 캐릭터별 레이드 숙제 진행 상황을 공유하세요. 초대 코드로 파티를 만들고 파티원의 레이드 난이도와 관문별 완료 상태를 함께 확인할 수 있습니다.",
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
