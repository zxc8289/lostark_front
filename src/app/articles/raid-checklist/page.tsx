import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "로스트아크 주간 숙제 관리 방법",
  description:
    "여러 캐릭터를 운영하는 로스트아크 유저를 위한 주간 숙제, 레이드, 골드 획득 관리 기준을 정리했습니다.",
  openGraph: {
    title: "로스트아크 주간 숙제 관리 방법 - 로아체크",
    description:
      "레이드 완료 여부와 골드 획득 현황을 캐릭터별로 정리하는 기준을 안내합니다.",
    url: "https://loacheck.com/articles/raid-checklist",
  },
};

export default function RaidChecklistArticlePage() {
  return (
    <article className="w-full max-w-7xl mx-auto px-4 md:px-0 pt-10 md:pt-16 pb-16 text-gray-300">
      <header className="space-y-4 border-b border-white/5 pb-8 mb-8">
        <p className="text-xs font-bold text-blue-400">RAID CHECKLIST</p>
        <h1 className="text-3xl md:text-4xl font-black text-gray-100 tracking-tight">
          로스트아크 주간 숙제 관리 방법
        </h1>
        <p className="text-sm text-gray-500">여러 캐릭터를 운영할 때 누락을 줄이는 정리 기준</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 text-sm md:text-base text-gray-400 leading-8">
        <section className="space-y-3 bg-[#16181D] border border-white/5 rounded-lg p-5 md:p-6">
          <h2 className="text-xl font-bold text-gray-100">왜 숙제 관리가 어려워질까?</h2>
          <p>
            로스트아크는 캐릭터가 늘어날수록 확인해야 할 주간 콘텐츠도 함께 늘어납니다.
            레이드 완료 여부, 골드 획득 가능 여부, 관문 진행도, 일일 콘텐츠, 주간 콘텐츠를
            모두 기억으로 관리하면 빠뜨리는 일이 생기기 쉽습니다.
          </p>
          <p>
            특히 주간 초기화 직후에는 무엇을 먼저 해야 할지 판단해야 하고, 주말에는 남은
            콘텐츠를 빠르게 정리해야 합니다. 그래서 숙제 관리는 단순 체크리스트가 아니라
            어떤 캐릭터가 어떤 보상을 아직 받을 수 있는지를 보는 방식이어야 합니다.
          </p>
        </section>

        <section className="space-y-3 bg-[#16181D] border border-white/5 rounded-lg p-5 md:p-6">
          <h2 className="text-xl font-bold text-gray-100">캐릭터별로 나눠서 봐야 하는 항목</h2>
          <p>
            첫 번째 기준은 캐릭터별 레이드 완료 여부입니다. 같은 레이드라도 난이도와 관문에
            따라 보상 구조가 다르기 때문에, 레이드 이름만 체크하는 것보다 관문 단위로 남은
            진행도를 확인하는 편이 정확합니다.
          </p>
          <p>
            두 번째 기준은 골드 획득 여부입니다. 골드 획득 캐릭터를 정해두면 주간 수익을
            예상하기 쉽고, 골드를 받지 않는 캐릭터는 재료 파밍이나 연습 목적의 콘텐츠로
            구분해서 볼 수 있습니다.
          </p>
        </section>

        <section className="space-y-3 bg-[#16181D] border border-white/5 rounded-lg p-5 md:p-6">
          <h2 className="text-xl font-bold text-gray-100">파티 단위 관리는 언제 필요할까?</h2>
          <p>
            고정 공대나 지인 파티처럼 같은 인원이 반복해서 플레이한다면 개인 체크리스트만으로는
            부족할 수 있습니다. 한 명이 어느 관문까지 진행했는지, 다음 일정에서 어떤 캐릭터를
            꺼내야 하는지 함께 봐야 하기 때문입니다.
          </p>
          <p>
            이럴 때는 파티 숙제 화면으로 진행도를 공유하면, 메신저에 매번 현황을 적는 수고를
            줄이고 파티 전체의 남은 일정을 빠르게 확인할 수 있습니다.
          </p>
        </section>

        <section className="space-y-3 bg-[#16181D] border border-white/5 rounded-lg p-5 md:p-6">
          <h2 className="text-xl font-bold text-gray-100">로아체크에서 활용하는 방법</h2>
          <p>
            로아체크에서는 내 숙제 화면에서 개인 캐릭터별 현황을 보고, 파티 숙제 화면에서
            공유 진행도를 관리할 수 있습니다. 레이드가 끝난 뒤에는 더보기 효율이나 경매 계산,
            딜 지분 계산까지 이어서 확인하면 기록 정리 흐름이 자연스럽게 이어집니다.
          </p>
          <Link href="/my-tasks" className="inline-flex text-sm font-bold text-blue-400 hover:text-blue-300">
            내 숙제 기능으로 이동하기
          </Link>
        </section>
      </div>
    </article>
  );
}
