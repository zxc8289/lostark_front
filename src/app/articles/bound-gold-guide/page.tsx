import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "귀속 골드와 거래 가능 골드의 차이",
  description:
    "로스트아크에서 귀속 골드와 거래 가능 골드를 구분해 관리해야 하는 이유와 활용 기준을 정리했습니다.",
  openGraph: {
    title: "귀속 골드와 거래 가능 골드의 차이 - 로아체크",
    description:
      "주간 레이드 수익과 제작 비용을 확인할 때 귀속 골드와 거래 가능 골드를 나눠 보는 기준입니다.",
    url: "https://loacheck.com/articles/bound-gold-guide",
  },
};

export default function BoundGoldGuidePage() {
  return (
    <article className="w-full max-w-7xl mx-auto px-4 md:px-0 pt-10 md:pt-16 pb-16 text-gray-300">
      <header className="space-y-4 border-b border-white/5 pb-8 mb-8">
        <p className="text-xs font-bold text-blue-400">GOLD MANAGEMENT</p>
        <h1 className="text-3xl md:text-4xl font-black text-gray-100 tracking-tight">
          귀속 골드와 거래 가능 골드의 차이
        </h1>
        <p className="text-sm text-gray-500">같은 골드라도 사용할 수 있는 범위를 나눠 보는 기준</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 text-sm md:text-base text-gray-400 leading-8">
        <section className="space-y-3 bg-[#16181D] border border-white/5 rounded-lg p-5 md:p-6">
          <h2 className="text-xl font-bold text-gray-100">두 종류의 골드를 구분하는 이유</h2>
          <p>
            거래 가능 골드는 거래소 이용이나 원정대 내 계획에 폭넓게 활용할 수 있는 반면,
            귀속 골드는 정해진 범위 안에서만 사용할 수 있습니다. 화면에 표시되는 총 골드가
            같더라도 실제로 가능한 선택지는 달라질 수 있습니다.
          </p>
          <p>
            그래서 주간 수익을 볼 때는 총액만 보기보다 거래 가능 골드와 귀속 골드를 나눠서
            확인하는 편이 다음 강화나 구매 계획을 세우기 쉽습니다.
          </p>
        </section>

        <section className="space-y-3 bg-[#16181D] border border-white/5 rounded-lg p-5 md:p-6">
          <h2 className="text-xl font-bold text-gray-100">주간 레이드에서는 어떻게 볼까?</h2>
          <p>
            레이드 보상을 정리할 때는 이번 주에 추가로 받을 수 있는 거래 가능 골드와 귀속
            골드를 별도 항목으로 기록하는 것이 좋습니다. 이미 완료한 관문과 남은 관문을
            구분하면 실제로 남은 수익도 더 정확히 판단할 수 있습니다.
          </p>
          <p>
            골드 획득 캐릭터를 정한 뒤에는 캐릭터별 진행 상태를 함께 확인해, 계획과 실제
            보상 사이의 차이를 줄여 보세요.
          </p>
        </section>

        <section className="space-y-3 bg-[#16181D] border border-white/5 rounded-lg p-5 md:p-6">
          <h2 className="text-xl font-bold text-gray-100">제작과 구매 판단에 활용하기</h2>
          <p>
            영지 제작이나 거래소 구매처럼 거래 가능 골드가 필요한 선택은 귀속 골드만으로
            해결할 수 없습니다. 제작 재료 비용, 수수료, 결과물 시세를 비교할 때는 실제로
            지출 가능한 골드인지까지 함께 고려해야 합니다.
          </p>
          <p>
            영지 제작 계산기는 재료 가격과 제작 비용을 입력해 예상 수익을 비교하는 데
            활용할 수 있습니다.
          </p>
        </section>

        <section className="space-y-3 bg-[#16181D] border border-white/5 rounded-lg p-5 md:p-6">
          <h2 className="text-xl font-bold text-gray-100">로아체크에서 나눠 관리하기</h2>
          <p>
            내 숙제와 파티 숙제에서는 남은 거래 가능 골드와 귀속 골드를 분리해 볼 수 있어,
            이번 주에 어떤 캐릭터를 우선 진행할지 판단하기 편합니다. 계산기에서 계획을
            세운 뒤 숙제 화면에서 실제 진행도를 기록해 보세요.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link href="/calculator/weekly-gold" className="inline-flex text-sm font-bold text-blue-400 hover:text-blue-300">
              주간 레이드 계산기 열기
            </Link>
            <Link href="/calculator/craft" className="inline-flex text-sm font-bold text-blue-400 hover:text-blue-300">
              영지 제작 계산기 열기
            </Link>
          </div>
        </section>
      </div>
    </article>
  );
}
