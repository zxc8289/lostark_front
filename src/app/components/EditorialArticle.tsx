import type { Metadata } from "next";
import Link from "next/link";
import GuidePageLayout, { GuideContents, GuidePanel } from "./GuidePageLayout";

export type ArticleContent = {
  slug: string;
  title: string;
  summary: string;
  sections: {
    title: string;
    paragraphs: string[];
    formula?: string;
    table?: { headers: string[]; rows: string[][]; caption: string };
  }[];
  links: { href: string; label: string }[];
};

export const ARTICLE_UPDATED = "2026-09-25";

export function articleMetadata(article: ArticleContent): Metadata {
  return {
    title: article.title,
    description: article.summary,
    alternates: { canonical: `https://loacheck.com/articles/${article.slug}/` },
    openGraph: { title: article.title, description: article.summary, type: "article", modifiedTime: ARTICLE_UPDATED, url: `https://loacheck.com/articles/${article.slug}/` },
  };
}

export default function EditorialArticle({ article }: { article: ArticleContent }) {
  return <GuidePageLayout title={article.title} description={article.summary} active="articles">
    <div className="grid grid-cols-1 items-start gap-4 sm:gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
      <GuideContents items={article.sections.map((section, index) => ({ id: `section-${index + 1}`, label: section.title }))} />
      <article className="min-w-0 space-y-4 sm:space-y-6">
        <div className="px-5 text-xs leading-6 text-gray-500 sm:px-0">
          <p>작성: 로아체크 · 문서 수정 <time dateTime={ARTICLE_UPDATED}>2026. 09. 25</time></p>
          <p className="mt-2 text-gray-400">예시 금액은 계산 방법을 설명하기 위한 가정이며 현재 시세나 특정 레이드의 실제 보상이 아닙니다. 문서 수정일은 게임 데이터의 검증일과 다릅니다.</p>
        </div>
        {article.sections.map((section, index) => <GuidePanel key={section.title} id={`section-${index + 1}`} title={section.title}>
          {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          {section.formula && <p className="whitespace-pre-line rounded-lg border border-white/5 bg-[#0F1014] p-4 leading-7 text-gray-200">{section.formula}</p>}
          {section.table && <div className="overflow-x-auto rounded-lg border border-white/5 bg-[#121318]">
            <table className="w-full min-w-[480px] text-left text-[13px]">
              <caption className="caption-top p-4 text-left text-xs leading-6 text-gray-400">{section.table.caption}</caption>
              <thead className="bg-white/5 text-gray-200"><tr>{section.table.headers.map((header) => <th key={header} scope="col" className="px-4 py-3 font-medium">{header}</th>)}</tr></thead>
              <tbody>{section.table.rows.map((row, rowIndex) => <tr key={rowIndex} className="border-t border-white/5">{row.map((cell, cellIndex) => cellIndex === 0 ? <th key={cellIndex} scope="row" className="px-4 py-3 font-medium text-gray-300">{cell}</th> : <td key={cellIndex} className="px-4 py-3 leading-6">{cell}</td>)}</tr>)}</tbody>
            </table>
          </div>}
        </GuidePanel>)}
        <GuidePanel title="직접 확인하고 계산하기">
          <div className="flex flex-wrap gap-2">{[...article.links, {href: "/guide/data", label: "데이터 출처와 계산 기준"}].map((link) => <Link key={link.href} className="rounded-lg border border-white/5 bg-white/5 px-3 py-2 text-xs font-medium text-gray-200 hover:bg-white/10" href={link.href}>{link.label} →</Link>)}</div>
          <p className="text-xs leading-6 text-gray-500">수정 이력 · 2026. 09. 25: 계산 과정, 예시 표, 결과 해석과 제외 조건을 보강했습니다. 오류는 <Link href="/support" className="text-[#A6AEFF] hover:underline">문의 게시판</Link>으로 알려주세요.</p>
        </GuidePanel>
      </article>
    </div>
  </GuidePageLayout>;
}
