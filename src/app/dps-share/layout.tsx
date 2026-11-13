import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "로아 딜 지분 계산기·잔혈과 강투 기준",
  description: "로스트아크 레이드 관문별 피해량을 입력해 딜 지분을 추정하세요. 선택한 레이드와 난이도의 잔혈·강투 기준을 비교하고 계산 방식과 가정을 확인할 수 있습니다.",
  openGraph: {
    title: "로아 딜 지분 계산기·잔혈과 강투 기준 | 로아체크",
    description: "로스트아크 레이드 관문별 피해량을 입력해 딜 지분을 추정하세요. 선택한 레이드와 난이도의 잔혈·강투 기준을 비교하고 계산 방식과 가정을 확인할 수 있습니다.",
    url: "https://loacheck.com/dps-share",
  },
};

export default function DpsShareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
