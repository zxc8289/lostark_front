"use client";

import Link from "next/link";
import { ArrowUpRight, ChevronRight, Megaphone } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";

type Notice = { title: string; category: string; date: string; link: string };
type NoticeState = { items: Notice[]; loading: boolean; error: boolean };
type SiteNotice = { id: string; title: string; category: string; createdAt: string };
type OfficialNotice = { title: string; category: string; date: string; link: string };
const tabs = ["로아체크", "로스트아크"];
const officialUrl = "https://lostark.game.onstove.com/News/Notice/List";

function noticeDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit", timeZone: "Asia/Seoul" });
}

export default function HomeNotices() {
  const [activeTab, setActiveTab] = useState(0);
  const [retry, setRetry] = useState(0);
  const [feeds, setFeeds] = useState<NoticeState[]>([
    { items: [], loading: true, error: false },
    { items: [], loading: true, error: false },
  ]);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    async function loadFeed(index: number) {
      setFeeds(current => current.map((feed, i) => i === index ? { ...feed, loading: true, error: false } : feed));
      try {
        const response = await fetch(index === 0 ? "/api/notice" : "/api/lostark/notice", { signal: controller.signal });
        if (!response.ok) throw new Error("Unable to load notices");
        const data = await response.json();
        const items: Notice[] = index === 0
          ? (data.notices ?? []).slice(0, 4).map((item: SiteNotice) => ({
            title: item.title, category: item.category || "공지", date: noticeDate(item.createdAt), link: `/support?noticeId=${encodeURIComponent(item.id)}`,
          }))
          : (data.list ?? []).slice(0, 4).map((item: OfficialNotice) => ({
            title: item.title, category: item.category || "공지", date: item.date, link: item.link,
          }));
        if (!controller.signal.aborted) setFeeds(current => current.map((feed, i) => i === index ? { items, loading: false, error: false } : feed));
      } catch {
        if (!controller.signal.aborted) setFeeds(current => current.map((feed, i) => i === index ? { items: [], loading: false, error: true } : feed));
      }
    }
    void loadFeed(0);
    void loadFeed(1);
    return () => controller.abort();
  }, [retry]);

  function onTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    let next: number;
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") next = (index + 1) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    else return;
    event.preventDefault();
    setActiveTab(next);
    tabRefs.current[next]?.focus();
  }

  const feed = feeds[activeTab];
  return <aside aria-labelledby="home-notices-title" className="min-w-0 flex h-full flex-col overflow-hidden rounded-none border border-x-0 border-[var(--overlay-ink)]/5 bg-[var(--surface-16181d)] md:col-span-2 md:rounded-2xl md:border-x lg:col-span-1 lg:col-start-3 lg:row-start-1">
    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--overlay-ink)]/5 px-4 py-3 md:px-5 md:py-4">
      <h2 id="home-notices-title" className="flex items-center gap-2 text-sm font-bold text-gray-200 md:text-base"><Megaphone size={18} aria-hidden="true" />공지사항</h2>
      <a href={activeTab === 0 ? "/support" : officialUrl} target={activeTab === 1 ? "_blank" : undefined} rel={activeTab === 1 ? "noopener noreferrer" : undefined} className="flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium text-gray-500 transition-colors hover:bg-[#5B69FF]/10 hover:text-[#5B69FF] md:text-xs">
        전체보기{activeTab === 0 ? <ChevronRight size={13} /> : <ArrowUpRight size={13} />}
      </a>
    </div>
    <div role="tablist" aria-label="공지 출처" className="flex shrink-0 gap-5 border-b border-[var(--overlay-ink)]/5 px-4 pt-3 md:px-5">
      {tabs.map((label, index) => <button
        key={label} ref={element => { tabRefs.current[index] = element; }}
        type="button" role="tab" id={`home-notice-tab-${index}`} aria-selected={activeTab === index}
        aria-controls="home-notice-panel" tabIndex={activeTab === index ? 0 : -1}
        onClick={() => setActiveTab(index)} onKeyDown={event => onTabKeyDown(event, index)}
        className={`-mb-px border-b-2 pb-3 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-[#5B69FF] ${activeTab === index ? "border-[#5B69FF] text-[#A6AEFF]" : "border-transparent text-gray-400 hover:text-gray-200"}`}
      >{label}</button>)}
    </div>
    <div role="tabpanel" id="home-notice-panel" aria-labelledby={`home-notice-tab-${activeTab}`} aria-busy={feed.loading} tabIndex={0} className="flex-1 focus-visible:outline-2 focus-visible:outline-[#5B69FF]">
      {feed.loading ? <div role="status" aria-label="소식 불러오는 중" className="space-y-5 px-4 py-5 animate-pulse md:px-5">
        {[0, 1, 2, 3].map(item => <div key={item} className="space-y-2"><div className="h-2 w-20 rounded bg-[var(--overlay-ink)]/5" /><div className="h-4 w-full rounded bg-[var(--overlay-ink)]/5" /></div>)}
      </div> : feed.error ? <div className="py-8 text-center text-xs text-gray-400">
        <p>소식을 불러오지 못했어요.</p>
        <button type="button" onClick={() => setRetry(value => value + 1)} className="mt-3 text-[#A6AEFF] hover:underline">다시 불러오기</button>
      </div> : feed.items.length === 0 ? <p className="py-8 text-center text-xs text-gray-400">등록된 소식이 없어요.</p> : <ul className="divide-y divide-[var(--overlay-ink)]/5">
        {feed.items.map(item => <li key={item.link}>
          <Link href={item.link} target={activeTab === 1 ? "_blank" : undefined} rel={activeTab === 1 ? "noopener noreferrer" : undefined} className="group block px-4 py-3 transition-colors hover:bg-[var(--overlay-ink)]/5 md:px-5 md:py-4">
            <div className="mb-1.5 flex items-center gap-2">
              <span className="rounded border border-[var(--overlay-ink)]/10 bg-[var(--overlay-ink)]/5 px-1.5 py-0.5 text-[10px] font-medium text-gray-400 transition-colors group-hover:border-[var(--overlay-ink)]/20 group-hover:text-gray-300">{item.category}</span>
              <span className="text-[11px] font-medium text-gray-600">{item.date}</span>
            </div>
            <p className="whitespace-normal break-words text-sm font-bold leading-relaxed text-gray-300 transition-colors group-hover:text-white">{item.title}</p>
          </Link>
        </li>)}
      </ul>}
    </div>
  </aside>;
}
