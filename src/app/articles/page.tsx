import type { Metadata } from "next";
import { articles as articleContents } from "./content";
import Link from "next/link";
import { ArrowRight, BookOpenText } from "lucide-react";
import GuidePageLayout from "../components/GuidePageLayout";

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

const articles = articleContents.map((article) => ({ href: `/articles/${article.slug}`, title: article.title, description: article.summary }));

export default function ArticlesPage() {
  return <GuidePageLayout title="로아체크 정보 글" description="숙제 관리, 레이드 보상과 경매 입찰의 판단 기준을 정리했습니다. 계산 과정과 숫자 예시를 실제 기능 화면과 함께 확인하세요." active="articles">
    <section aria-label="정보 글 목록" className="grid grid-cols-1 gap-4 px-4 sm:grid-cols-2 sm:px-0 xl:grid-cols-3">
      {articles.map((article) => <Link key={article.href} href={article.href} className="group flex flex-col overflow-hidden rounded-xl border border-white/5 bg-[#16181D] transition-colors hover:border-[#5B69FF]/40">
        <div className="flex-1 space-y-3 p-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1F222B] text-[#A6AEFF]"><BookOpenText size={18} /></div>
          <h2 className="text-base font-semibold leading-7 text-white">{article.title}</h2>
          <p className="text-sm leading-7 text-gray-400">{article.description}</p>
        </div>
        <div className="flex items-center justify-between border-t border-white/5 px-5 py-3 text-xs font-medium text-gray-400 group-hover:text-[#A6AEFF]">글 읽기<ArrowRight size={14} /></div>
      </Link>)}
    </section>
  </GuidePageLayout>;
}
