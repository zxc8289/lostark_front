import Link from "next/link";
import { ChevronRight, ChevronDown, BookOpen, Gem, ChartNoAxesCombined, Gavel, Gift, Coins, Hammer } from "lucide-react";
import Card from "./components/Card";
import HomeMyTasksSummary, { HomeMyTasksHeader, HomeMyTasksDetails, HomeMyTasksGuard } from "./components/HomeMyTasksSummary";
import HomePartySummaryProvider, { HomePartyGuard, HomePartyHeader, HomePartyDetails } from "./components/HomePartySummary";
import TodaySchedule from "./components/TodaySchedule";
import ClientOnly from "./components/ClientOnly";
import HomeGuestIntro from "./components/HomeGuestIntro";
import HomeNotices from "./components/HomeNotices";
import { getServerSession } from "next-auth";
import { authOptions } from "./api/auth/[...nextauth]/route";

const shortcuts = [
  { href: "/raid-info", title: "레이드 보상", description: "관문별 보상 확인", icon: BookOpen },
  { href: "/calculator/gem", title: "보석 합성", description: "구매·합성 비교", icon: Gem },
  { href: "/dps-share", title: "딜 지분", description: "기준 대비 지분 추정", icon: ChartNoAxesCombined },
  { href: "/calculator/auction", title: "경매 계산기", description: "적정 입찰가 계산", icon: Gavel },
  { href: "/calculator/more-reward", title: "더보기 계산기", description: "추가 보상 효율 비교", icon: Gift },
  { href: "/calculator/weekly-gold", title: "주간 레이드 계산기", description: "주간 골드 수익 계산", icon: Coins },
  { href: "/calculator/craft", title: "영지 제작 계산기", description: "제작 비용·수익 비교", icon: Hammer },
];

const toggleBtnClass = "order-2 w-full list-none [&::-webkit-details-marker]:hidden cursor-pointer flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[var(--surface-131519)] border border-[var(--overlay-ink)]/5 hover:bg-[var(--surface-1a1d24)] hover:border-[var(--overlay-ink)]/10 hover:text-gray-200 transition-all text-xs font-bold text-gray-500 mt-3";

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  return (
    <div className="pt-6 md:pt-17 pb-10 px-0 md:px-4 xl:px-0 text-gray-300 w-full max-w-7xl mx-auto space-y-5 lg:space-y-8">
      {!session?.user && <HomeGuestIntro />}

      <section aria-label="게임 일정" className="w-full bg-[var(--surface-16181d)] border border-x-0 md:border-x border-[var(--overlay-ink)]/5 rounded-none md:rounded-2xl p-4 md:p-6 relative flex flex-col justify-center">
        <ClientOnly fallback={<div className="w-full h-[200px] bg-[var(--overlay-ink)]/5 animate-pulse rounded-2xl" />}>
          <TodaySchedule />
        </ClientOnly>
      </section>

      <div className="grid items-stretch has-[details[open]]:items-start gap-4 md:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_280px] lg:gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_320px]">
        <Card className="min-w-0 border border-x-0 md:border-x border-[var(--overlay-ink)]/5 bg-[var(--surface-16181d)] w-full flex flex-col rounded-none md:rounded-2xl" contentPadding="lg" align="stretch">
          <HomeMyTasksSummary>
            <div className="w-full flex flex-col min-h-[300px]">
              <div className="w-full mb-auto">
                <Link href="/my-tasks" className="group w-full flex items-center justify-between gap-3 mb-3 md:mb-4 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <div className="w-1 md:w-1.5 h-5 md:h-6 bg-blue-500 rounded-r-md transition-colors group-hover:bg-blue-400" />
                    <span className="font-bold text-lg md:text-xl text-gray-100 transition-colors group-hover:text-white">내 숙제 현황</span>
                  </div>
                  <div className="text-gray-400 transition-colors group-hover:text-white">
                    <ChevronRight className="w-5 h-5 md:w-6 md:h-6 transition-transform group-hover:translate-x-1" />
                  </div>
                </Link>
                <HomeMyTasksHeader />
              </div>
              <HomeMyTasksGuard>
                <div className="w-full mt-2 md:mt-0">
                  <details className="group w-full flex flex-col">
                    <summary className={toggleBtnClass}>
                      <span className="group-open:hidden">상세 내용 펼치기</span>
                      <span className="hidden group-open:inline">접기</span>
                      <ChevronDown className="w-3 h-3 transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="order-1 w-full pt-3 md:pt-4 pb-2"><HomeMyTasksDetails /></div>
                  </details>
                </div>
              </HomeMyTasksGuard>
            </div>
          </HomeMyTasksSummary>
        </Card>
        <Card className="min-w-0 border border-x-0 md:border-x border-[var(--overlay-ink)]/5 bg-[var(--surface-16181d)] w-full flex flex-col rounded-none md:rounded-2xl" contentPadding="lg" align="stretch">
          <HomePartySummaryProvider>
            <div className="w-full flex flex-col min-h-[300px]">
              <Link href="/party-tasks" className="group w-full flex items-center justify-between gap-3 mb-3 md:mb-4 cursor-pointer">
                <div className="flex items-center gap-2">
                  <div className="w-1 md:w-1.5 h-5 md:h-6 bg-blue-500 rounded-r-md transition-colors group-hover:bg-blue-400" />
                  <span className="font-bold text-lg md:text-xl text-gray-100 transition-colors group-hover:text-white">내 참여 파티</span>
                </div>
                <div className="text-gray-400 transition-colors group-hover:text-white">
                  <ChevronRight className="w-5 h-5 md:w-6 md:h-6 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
              <HomePartyGuard>
                <div className="w-full mb-auto pt-1"><HomePartyHeader /></div>
                <div className="w-full mt-2 md:mt-0">
                  <details className="group w-full flex flex-col">
                    <summary className={toggleBtnClass}>
                      <span className="group-open:hidden">상세 내용 펼치기</span>
                      <span className="hidden group-open:inline">접기</span>
                      <ChevronDown className="w-3 h-3 transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="order-1 w-full pt-3 md:pt-4 pb-2"><HomePartyDetails /></div>
                  </details>
                </div>
              </HomePartyGuard>
            </div>
          </HomePartySummaryProvider>
        </Card>

        <section aria-labelledby="home-tools-title" className="min-w-0 border-y border-[var(--overlay-ink)]/5 bg-[var(--surface-16181d)] p-6 md:col-span-2 md:border-0 md:bg-transparent md:p-0 lg:col-span-3 lg:col-start-1 lg:row-start-2">
          <h2 id="home-tools-title" className="mb-3 text-sm font-semibold text-gray-300">자주 쓰는 도구</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4 xl:grid-cols-7">
            {shortcuts.map(({ href, title, description, icon: Icon }) => (
              <Link key={href} href={href} className="group flex min-w-0 items-center gap-3.5 rounded-xl border border-[var(--overlay-ink)]/10 bg-[var(--surface-16181d)] p-4 transition-colors hover:border-[#5B69FF]/35 hover:bg-[#5B69FF]/5 md:flex-col md:items-start md:gap-3 md:border-[var(--overlay-ink)]/5 md:px-3 md:py-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--overlay-ink)]/5 bg-[var(--surface-1f222b)] text-[#5B69FF] md:h-auto md:w-auto md:rounded-none md:border-0 md:bg-transparent md:text-[#A6AEFF]">
                  <Icon size={19} className="transition-transform group-hover:-translate-y-0.5" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-[13px] font-semibold text-gray-200">{title}</h3>
                  <p className="mt-1 text-[11px] text-gray-400">{description}</p>
                </div>
                <ChevronRight size={18} className="shrink-0 text-gray-500 transition-colors group-hover:text-[#5B69FF] md:hidden" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>
        <HomeNotices />
      </div>

      <nav aria-label="도움말" className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-[var(--overlay-ink)]/5 px-4 pt-5 text-xs text-gray-400 md:px-0">
        <Link href="/guide" className="hover:text-[#A6AEFF]">처음 이용하시나요? →</Link>
        <Link href="/articles" className="hover:text-[#A6AEFF]">계산 예시 →</Link>
        <Link href="/guide/data" className="hover:text-[#A6AEFF]">데이터 출처 →</Link>
      </nav>
    </div>
  );
}
