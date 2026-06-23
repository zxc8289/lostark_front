import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "레이드 더보기 효율 판단 기준",
  description:
    "로스트아크 레이드 더보기 비용과 보상 재료 가치를 비교해 효율을 판단하는 방법을 정리했습니다.",
  openGraph: {
    title: "레이드 더보기 효율 판단 기준 - 로아체크",
    description:
      "더보기 비용, 재료 가치, 거래소 시세를 함께 봐야 하는 이유와 계산기 활용 방법을 안내합니다.",
    url: "https://loacheck.com/articles/more-reward-efficiency",
  },
};

export default function MoreRewardEfficiencyArticlePage() {
  return (
    <article className="w-full max-w-7xl mx-auto px-4 md:px-0 pt-10 md:pt-16 pb-16 text-gray-300">
      <header className="space-y-4 border-b border-white/5 pb-8 mb-8">
        <p className="text-xs font-bold text-blue-400">MORE REWARD</p>
        <h1 className="text-3xl md:text-4xl font-black text-gray-100 tracking-tight">
          레이드 더보기 효율을 판단하는 기준
        </h1>
        <p className="text-sm text-gray-500">비용과 보상 가치를 함께 비교하는 더보기 계산법</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 text-sm md:text-base text-gray-400 leading-8">
        <section className="space-y-3 bg-[#16181D] border border-white/5 rounded-lg p-5 md:p-6">
          <h2 className="text-xl font-bold text-gray-100">더보기는 단순히 재료가 많다고 좋은 것이 아닙니다</h2>
          <p>
            레이드 더보기는 추가 보상을 얻는 대신 골드를 지불하는 구조입니다. 따라서 더보기를
            할지 말지는 받는 재료의 현재 가치와 지불하는 골드를 함께 비교해야 합니다.
          </p>
          <p>
            같은 관문이라도 거래소 시세가 변하면 결과가 달라질 수 있고, 캐릭터 성장 단계에
            따라 특정 재료의 체감 가치도 달라집니다.
          </p>
        </section>

        <section className="space-y-3 bg-[#16181D] border border-white/5 rounded-lg p-5 md:p-6">
          <h2 className="text-xl font-bold text-gray-100">계산할 때 보는 핵심 항목</h2>
          <p>
            첫 번째는 더보기 비용입니다. 비용이 높을수록 추가 보상이 충분히 비싸게 평가되어야
            이득으로 볼 수 있습니다. 두 번째는 명예 파편, 돌파석, 수호석, 파괴석처럼 실제로
            성장에 쓰이는 재료의 시세입니다.
          </p>
          <p>
            세 번째는 귀속 재료의 개인 가치입니다. 거래 가능한 재료와 달리 귀속 재료는 바로
            판매할 수 없기 때문에, 현재 캐릭터 성장에 필요한지 여부에 따라 해석이 달라집니다.
          </p>
        </section>

        <section className="space-y-3 bg-[#16181D] border border-white/5 rounded-lg p-5 md:p-6">
          <h2 className="text-xl font-bold text-gray-100">이득이어도 무조건 해야 할까?</h2>
          <p>
            계산상 이득으로 나오더라도 모든 캐릭터에 더보기를 하는 것이 항상 정답은 아닙니다.
            성장 계획이 없는 부캐라면 귀속 재료 가치가 낮게 느껴질 수 있고, 반대로 바로 강화할
            캐릭터라면 작은 이득도 충분히 의미가 있습니다.
          </p>
          <p>
            더보기 계산기는 결론을 강제하는 도구가 아니라, 현재 시세와 캐릭터 목적을 비교할 수
            있도록 돕는 참고 자료로 보는 것이 좋습니다.
          </p>
        </section>

        <section className="space-y-3 bg-[#16181D] border border-white/5 rounded-lg p-5 md:p-6">
          <h2 className="text-xl font-bold text-gray-100">로아체크 계산기 활용법</h2>
          <p>
            로아체크의 더보기 계산기는 레이드와 관문별 보상 정보를 기준으로 현재 가치와 비용을
            비교합니다. 계산 결과가 이득으로 표시되더라도 실제 게임 내 거래소 가격을 한 번 더
            확인하면 더 안정적으로 판단할 수 있습니다.
          </p>
          <Link href="/calculator/more-reward" className="inline-flex text-sm font-bold text-blue-400 hover:text-blue-300">
            더보기 계산기로 이동하기
          </Link>
        </section>
      </div>
    </article>
  );
}
