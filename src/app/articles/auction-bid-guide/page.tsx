import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "로스트아크 경매 입찰 계산 가이드",
  description:
    "로스트아크 레이드 경매에서 파티 인원과 기대 수익을 기준으로 적정 입찰가를 계산하는 방법을 설명합니다.",
  openGraph: {
    title: "로스트아크 경매 입찰 계산 가이드 - 로아체크",
    description:
      "레이드 경매 입찰가를 정할 때 분배금과 기대 수익을 함께 보는 방법을 안내합니다.",
    url: "https://loacheck.com/articles/auction-bid-guide",
  },
};

export default function AuctionBidGuideArticlePage() {
  return (
    <article className="w-full max-w-7xl mx-auto px-4 md:px-0 pt-10 md:pt-16 pb-16 text-gray-300">
      <header className="space-y-4 border-b border-white/5 pb-8 mb-8">
        <p className="text-xs font-bold text-blue-400">AUCTION BID</p>
        <h1 className="text-3xl md:text-4xl font-black text-gray-100 tracking-tight">
          경매 입찰 계산을 안전하게 보는 법
        </h1>
        <p className="text-sm text-gray-500">파티 분배 구조와 기대 수익을 함께 고려하는 입찰 기준</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 text-sm md:text-base text-gray-400 leading-8">
        <section className="space-y-3 bg-[#16181D] border border-white/5 rounded-lg p-5 md:p-6">
          <h2 className="text-xl font-bold text-gray-100">경매 입찰은 낙찰가만 보면 부족합니다</h2>
          <p>
            레이드 경매에서 아이템을 입찰할 때는 낙찰가뿐 아니라 파티원에게 돌아가는 분배금도
            함께 계산해야 합니다. 입찰자가 지불한 금액은 파티원에게 나눠지기 때문에, 실제 손익은
            단순 구매가와 다르게 느껴질 수 있습니다.
          </p>
          <p>
            특히 4인과 8인은 분배 구조가 다르므로 같은 입찰가라도 체감 비용이 달라집니다.
          </p>
        </section>

        <section className="space-y-3 bg-[#16181D] border border-white/5 rounded-lg p-5 md:p-6">
          <h2 className="text-xl font-bold text-gray-100">적정 입찰가를 볼 때 필요한 정보</h2>
          <p>
            가장 먼저 현재 거래소 시세를 확인해야 합니다. 그다음 파티 인원, 예상 판매가,
            수수료, 내가 얻는 분배금을 함께 고려하면 어느 정도까지 입찰해도 되는지 판단하기
            쉬워집니다.
          </p>
          <p>
            실제 입찰에서는 경쟁자가 있거나 시세가 빠르게 바뀔 수 있으므로 계산된 가격보다
            무리해서 올리는 것은 위험할 수 있습니다.
          </p>
        </section>

        <section className="space-y-3 bg-[#16181D] border border-white/5 rounded-lg p-5 md:p-6">
          <h2 className="text-xl font-bold text-gray-100">수익보다 중요한 것은 기준을 정하는 것입니다</h2>
          <p>
            경매 계산기는 최대 입찰가를 알려주는 도구에 가깝지만, 모든 상황에서 그 가격까지
            입찰해야 한다는 뜻은 아닙니다. 재판매 목적이라면 안정 마진을 남겨야 하고, 직접 사용할
            장비나 재료라면 체감 가치가 더 높을 수 있습니다.
          </p>
          <p>
            그래서 입찰 전에는 판매 목적, 직접 사용, 파티 분위기, 현재 골드 여유를
            함께 고려하는 것이 좋습니다.
          </p>
        </section>

        <section className="space-y-3 bg-[#16181D] border border-white/5 rounded-lg p-5 md:p-6">
          <h2 className="text-xl font-bold text-gray-100">로아체크 계산기 활용법</h2>
          <p>
            로아체크 경매 계산기는 입력한 판매가와 파티 인원을 바탕으로 입찰 기준을 빠르게
            확인하도록 돕습니다. 결과는 참고용으로 활용하고, 실제 입찰 전에는 게임 내 최신
            시세와 거래 가능성을 함께 확인하세요.
          </p>
          <Link href="/calculator/auction" className="inline-flex text-sm font-bold text-blue-400 hover:text-blue-300">
            경매 계산기로 이동하기
          </Link>
        </section>
      </div>
    </article>
  );
}
