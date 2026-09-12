import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "주간 레이드 골드 계산 기준",
  description:
    "로스트아크 주간 레이드 골드를 캐릭터별 골드 획득 여부와 관문 진행도를 기준으로 정리하는 방법을 안내합니다.",
  openGraph: {
    title: "주간 레이드 골드 계산 기준 - 로아체크",
    description:
      "골드 획득 캐릭터, 레이드 난이도, 관문 진행도를 함께 고려해 주간 수익을 정리하는 기준입니다.",
    url: "https://loacheck.com/articles/weekly-raid-gold-guide",
  },
};

export default function WeeklyRaidGoldGuidePage() {
  return (
    <article className="w-full max-w-7xl mx-auto px-4 md:px-0 pt-10 md:pt-16 pb-16 text-gray-300">
      <header className="space-y-4 border-b border-white/5 pb-8 mb-8">
        <p className="text-xs font-bold text-blue-400">WEEKLY RAID GOLD</p>
        <h1 className="text-3xl md:text-4xl font-black text-gray-100 tracking-tight">
          주간 레이드 골드 계산 기준
        </h1>
        <p className="text-sm text-gray-500">골드 획득 캐릭터와 관문 진행도를 함께 보는 정리 방법</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 text-sm md:text-base text-gray-400 leading-8">
        <section className="space-y-3 bg-[#16181D] border border-white/5 rounded-lg p-5 md:p-6">
          <h2 className="text-xl font-bold text-gray-100">계산 전에 먼저 정할 것</h2>
          <p>
            주간 레이드 골드는 모든 캐릭터의 레이드를 단순히 더하는 방식보다, 골드를 받는
            캐릭터와 실제로 진행할 레이드를 먼저 정한 뒤 계산하는 편이 정확합니다. 같은
            원정대라도 골드 획득 설정 여부에 따라 주간 합계가 달라질 수 있습니다.
          </p>
          <p>
            부 캐릭터는 재료 획득이나 연습 목적으로만 레이드를 진행하는 경우도 있으므로,
            골드 수익 계산에서는 별도로 구분해 두는 것이 좋습니다.
          </p>
        </section>

        <section className="space-y-3 bg-[#16181D] border border-white/5 rounded-lg p-5 md:p-6">
          <h2 className="text-xl font-bold text-gray-100">관문 진행도도 반영하기</h2>
          <p>
            레이드를 시작했더라도 모든 관문을 완료하지 않았다면 남은 골드와 실제 획득한
            골드를 나눠서 봐야 합니다. 특히 주 후반에는 관문별 진행도에 따라 이번 주에
            추가로 얻을 수 있는 금액이 달라집니다.
          </p>
          <p>
            내 숙제에서 관문 완료 상태를 체크해 두면, 남은 레이드와 골드 획득 가능 여부를
            캐릭터별로 빠르게 확인할 수 있습니다.
          </p>
        </section>

        <section className="space-y-3 bg-[#16181D] border border-white/5 rounded-lg p-5 md:p-6">
          <h2 className="text-xl font-bold text-gray-100">난이도와 보상은 따로 확인하기</h2>
          <p>
            같은 레이드라도 일반, 하드, 나메처럼 선택한 난이도에 따라 보상 기준이 달라질 수
            있습니다. 실제 공대 일정과 캐릭터 레벨에 맞는 난이도를 선택하고, 패치 후 보상
            정보가 바뀌었다면 다시 확인하는 습관이 필요합니다.
          </p>
          <p>
            계산 결과는 계획을 세우는 기준으로 활용하고, 최종 보상은 게임 내 화면을 기준으로
            확인해 주세요.
          </p>
        </section>

        <section className="space-y-3 bg-[#16181D] border border-white/5 rounded-lg p-5 md:p-6">
          <h2 className="text-xl font-bold text-gray-100">로아체크에서 계산하는 순서</h2>
          <p>
            주간 레이드 계산기에서 캐릭터 레벨과 진행할 레이드를 선택하면 예상 골드를
            한눈에 비교할 수 있습니다. 계산한 뒤에는 내 숙제에서 실제 진행 상태를 체크해
            남은 일정을 관리하면 계획과 현황이 자연스럽게 이어집니다.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link href="/calculator/weekly-gold" className="inline-flex text-sm font-bold text-blue-400 hover:text-blue-300">
              주간 레이드 계산기 열기
            </Link>
            <Link href="/my-tasks" className="inline-flex text-sm font-bold text-blue-400 hover:text-blue-300">
              내 숙제에서 진행도 보기
            </Link>
          </div>
        </section>
      </div>
    </article>
  );
}
