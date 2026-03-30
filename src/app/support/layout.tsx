import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "문의 게시판",
    description:
        "로아체크 이용 중 발생하는 불편한 점이나 추가되었으면 하는 건의사항, 문의사항을 자유롭게 남겨주세요.",
    robots: {
        index: false,
        follow: false,
        googleBot: {
            index: false,
            follow: false,
        },
    },
    openGraph: {
        title: "문의 게시판 - 로아체크",
        description:
            "로아체크 이용 중 발생하는 불편한 점이나 추가되었으면 하는 건의사항, 문의사항을 자유롭게 남겨주세요.",
        url: "https://loacheck.com/support",
    },
};

export default function SupportLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}