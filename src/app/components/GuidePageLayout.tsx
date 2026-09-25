import type { ReactNode } from "react";
import Link from "next/link";
import { BookOpenText } from "lucide-react";

const tabs = [
  { key: "articles", label: "정보 글", href: "/articles" },
  { key: "guide", label: "이용 가이드", href: "/guide" },
  { key: "data", label: "데이터 기준", href: "/guide/data" },
] as const;

export default function GuidePageLayout({ title, description, active, children }: {
  title: string;
  description: string;
  active: "articles" | "guide" | "data";
  children: ReactNode;
}) {
  return <div className="w-full py-8 text-gray-300 sm:py-12">
    <header className="px-4 pb-6 sm:px-0">
      <div className="mb-3 inline-flex items-center gap-2 text-xs font-medium text-[#5B69FF]"><BookOpenText size={16} />로아체크 가이드</div>
      <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{title}</h1>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-gray-400">{description}</p>
    </header>
    <nav aria-label="가이드 메뉴" className="mx-4 mb-6 flex gap-1 rounded-xl border border-white/5 bg-[#16181D] p-1 sm:mx-0 sm:w-fit">
      {tabs.map((tab) => <Link key={tab.key} href={tab.href} aria-current={active === tab.key ? "page" : undefined} className={`flex-1 whitespace-nowrap rounded-lg px-4 py-2.5 text-center text-sm font-medium transition-colors sm:flex-none ${active === tab.key ? "bg-[#5B69FF]/15 text-[#A6AEFF]" : "text-gray-400 hover:bg-white/5 hover:text-white"}`}>{tab.label}</Link>)}
    </nav>
    {children}
  </div>;
}

export function GuidePanel({ title, id, children }: { title: string; id?: string; children: ReactNode }) {
  return <section id={id} className="min-w-0 scroll-mt-28 overflow-hidden rounded-none border-y border-white/5 bg-[#16181D] sm:rounded-xl sm:border">
    <div className="border-b border-white/5 px-5 py-4"><h2 className="flex items-start gap-2.5 text-base font-semibold text-white"><span aria-hidden="true" className="mt-1 h-4 w-1 shrink-0 rounded-full bg-[#5B69FF]" />{title}</h2></div>
    <div className="space-y-4 p-5 text-sm leading-7 text-gray-400">{children}</div>
  </section>;
}

export function GuideContents({ items }: { items: { id: string; label: string }[] }) {
  return <nav aria-label="페이지 목차" className="min-w-0 rounded-none border-y border-white/5 bg-[#16181D] lg:sticky lg:top-28 sm:rounded-xl sm:border">
    <p className="border-b border-white/5 px-5 py-4 text-sm font-semibold text-white">목차</p>
    <ol className="flex gap-1 overflow-x-auto p-2 lg:flex-col">
      {items.map((item, index) => <li key={item.id} className="shrink-0 lg:shrink"><a href={`#${item.id}`} className="flex items-start gap-3 whitespace-nowrap rounded-lg px-3 py-2.5 text-[13px] leading-6 text-gray-400 transition-colors hover:bg-white/5 hover:text-white lg:whitespace-normal lg:break-keep"><span className="text-[#A6AEFF]">{String(index + 1).padStart(2, "0")}</span>{item.label}</a></li>)}
    </ol>
  </nav>;
}
