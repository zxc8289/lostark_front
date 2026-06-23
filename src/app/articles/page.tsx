import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpenText } from "lucide-react";

export const metadata: Metadata = {
  title: "로스트아크 정보 글",
  description:
    "로아체크에서 제공하는 로스트아크 숙제 관리, 더보기 효율, 경매 입찰, 레이드 기록 해석 관련 정보 글 모음입니다.",
  openGraph: {
    title: "로스트아크 정보 글 - 로아체크",
    description:
      "숙제 관리, 레이드 보상, 더보기 효율, 경매 입찰 판단을 더 쉽게 이해할 수 있도록 정리한 로아체크 정보 글입니다.",
    url: "https://loacheck.com/articles",
  },
};

const articles = [
  {
    href: "/articles/raid-checklist",
    title: "로스트아크 주간 숙제 관리 방법",
    description:
      "여러 캐릭터를 운영할 때 레이드, 에포나, 주간 콘텐츠를 어떤 기준으로 정리하면 좋은지 설명합니다.",
  },
  {
    href: "/articles/more-reward-efficiency",
    title: "레이드 더보기 효율을 판단하는 기준",
    description:
      "더보기 비용, 보상 재료 가치, 거래소 시세를 함께 비교해야 하는 이유를 예시와 함께 정리했습니다.",
  },
  {
    href: "/articles/auction-bid-guide",
    title: "경매 입찰 계산을 안전하게 보는 법",
    description:
      "파티 인원, 기대 수익, 분배 구조를 기준으로 적정 입찰가를 계산할 때 주의할 점을 안내합니다.",
  },
];

export default function ArticlesPage() {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-0 pt-10 md:pt-16 pb-16 text-gray-300 space-y-10">
      <section className="space-y-4 border-b border-white/5 pb-10">
        <span className="inline-flex items-center gap-2 text-xs font-bold text-blue-400">
          <BookOpenText size={16} />
          ARTICLES
        </span>
        <h1 className="text-3xl md:text-5xl font-black text-gray-100 tracking-tight">
          로아체크 정보 글
        </h1>
        <p className="text-sm md:text-base text-gray-400 leading-8 max-w-4xl">
          계산기와 숙제 관리 기능을 더 정확히 이해할 수 있도록, 로스트아크 플레이 중 자주
          마주치는 판단 기준을 글로 정리했습니다. 각 글은 실제 기능 화면과 함께 참고하면
          더 쉽게 활용할 수 있습니다.
        </p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {articles.map((article) => (
          <Link
            key={article.href}
            href={article.href}
            className="group bg-[#16181D] border border-white/5 rounded-lg p-5 md:p-6 flex flex-col gap-4 hover:border-blue-500/40 transition-colors"
          >
            <div className="flex-1 space-y-2">
              <h2 className="text-lg font-bold text-gray-100 group-hover:text-white">{article.title}</h2>
              <p className="text-sm text-gray-400 leading-7">{article.description}</p>
            </div>
            <div className="text-blue-400 flex items-center gap-1 text-xs font-bold">
              읽기
              <ArrowRight size={14} />
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}
