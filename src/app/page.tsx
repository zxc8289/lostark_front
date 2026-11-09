import Link from "next/link";
import { ChevronRight, ChevronDown, BookOpen, Gem, ChartNoAxesCombined } from "lucide-react";
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
];

const toggleBtnClass = "order-2 w-full list-none [&::-webkit-details-marker]:hidden cursor-pointer flex items-center justify-center gap-2 py-2.5 md:py-3 rounded-xl bg-[var(--surface-131519)] border border-[var(--overlay-ink)]/5 hover:bg-[var(--surface-1a1d24)] hover:border-[var(--overlay-ink)]/10 hover:text-gray-200 transition-all text-xs font-bold text-gray-500 mt-3 md:mt-4";

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  return (
    <div className="pt-6 md:pt-17 pb-10 px-0 md:px-4 xl:px-0 text-gray-300 w-full max-w-7xl mx-auto space-y-5 lg:space-y-8">
      {!session?.user && <HomeGuestIntro />}

      <section aria-label="게임 일정" className="w-full bg-[var(--surface-16181d)] border border-x-0 md:border-x border-[var(--overlay-ink)]/5 rounded-none md:rounded-2xl p-4 md:p-6 relative overflow-hidden flex flex-col justify-center">
        <ClientOnly fallback={<div className="w-full h-[200px] bg-[var(--overlay-ink)]/5 animate-pulse rounded-2xl" />}>
          <TodaySchedule />
        </ClientOnly>
      </section>

      <div className="grid items-stretch gap-4 md:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_280px] lg:gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_320px]">
        <Card className="min-w-0 border border-x-0 md:border-x border-[var(--overlay-ink)]/5 bg-[var(--surface-16181d)] w-full flex flex-col rounded-none md:rounded-2xl" contentPadding="lg" align="stretch">
          <HomeMyTasksSummary>
            <div className="w-full flex flex-col min-h-[300px] md:min-h-[340px]">
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
            <div className="w-full flex flex-col min-h-[300px] md:min-h-[340px]">
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
                <div className="w-full mb-auto pt-1 md:pt-2"><HomePartyHeader /></div>
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

        <section aria-labelledby="home-tools-title" className="px-4 md:col-span-2 md:px-0 lg:col-start-1 lg:row-start-2">
          <h2 id="home-tools-title" className="mb-3 text-sm font-semibold text-gray-300">자주 쓰는 도구</h2>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {shortcuts.map(({ href, title, description, icon: Icon }) => (
              <Link key={href} href={href} className="group flex min-w-0 flex-col items-start gap-3 rounded-xl border border-[var(--overlay-ink)]/5 bg-[var(--surface-16181d)] px-3 py-4 transition-colors hover:border-[#5B69FF]/35 hover:bg-[#5B69FF]/5 sm:p-4">
                <Icon size={19} className="shrink-0 text-[#A6AEFF] transition-transform group-hover:-translate-y-0.5" aria-hidden="true" />
                <div>
                  <h3 className="text-[13px] font-semibold text-gray-200">{title}</h3>
                  <p className="mt-1 hidden text-[11px] text-gray-400 sm:block">{description}</p>
                </div>
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
