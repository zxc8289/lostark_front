import type { Metadata } from "next";
import ToolMethodNote from "@/app/components/ToolMethodNote";

export const metadata: Metadata = {
    title: "로아 아크그리드 젬 세팅 계산기·코어 포인트 최적화",
    description: "로스트아크 보유 질서·혼돈 젬의 의지력 효율, 코어 포인트와 옵션을 입력해 젬 세팅을 비교하세요. 목표 조건에 맞는 조합을 계산하고 세팅을 저장·불러올 수 있습니다.",
    openGraph: {
        title: "로아 아크그리드 젬 세팅 계산기·코어 포인트 최적화 | 로아체크",
        description: "로스트아크 보유 질서·혼돈 젬의 의지력 효율, 코어 포인트와 옵션을 입력해 젬 세팅을 비교하세요. 목표 조건에 맞는 조합을 계산하고 세팅을 저장·불러올 수 있습니다.",
        url: "https://loacheck.com/gem-setup",
    },
};

export default function GemSetupLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}<ToolMethodNote tool="gem-setup" /></>;
}
