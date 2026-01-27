import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "젬 세팅 효율 계산기",
    description: "9멸 7홍, 10멸 섞어 쓰기 등 보유한 젬을 입력하면 의지력 기반으로 최적의 아크 패시브 효율을 계산해 드립니다.",
    openGraph: {
        title: "젬 세팅 효율 계산기 - 로아체크",
        description: "내 젬으로 뽑을 수 있는 최대 효율을 계산하고 저장해보세요.",
        url: "https://loacheck.com/gem-setup",
    },
};

export default function GemSetupLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}