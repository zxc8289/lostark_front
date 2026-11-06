import Link from "next/link";
import { ChevronRight, ChevronDown, ExternalLink, Megaphone, Gem, Calculator, ArrowUpRight } from "lucide-react";
import Card from "./components/Card";
import HomeMyTasksSummary, { HomeMyTasksHeader, HomeMyTasksDetails, HomeMyTasksGuard } from "./components/HomeMyTasksSummary";
import HomePartySummaryProvider, { HomePartyGuard, HomePartyHeader, HomePartyDetails } from "./components/HomePartySummary";
import TodaySchedule from "./components/TodaySchedule";
import ClientOnly from "./components/ClientOnly";
import HomeGuestIntro from "./components/HomeGuestIntro";
import { getServerSession } from "next-auth";
import { authOptions } from "./api/auth/[...nextauth]/route";

// --- 유틸리티 함수 ---
function fmtDate(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function categoryBadgeClass(category: string) {
  if (category === "New") return "bg-emerald-500/20 border-emerald-500/30 text-emerald-400";
  if (category === "Fix") return "bg-red-500/20 border-red-500/30 text-red-400";
  if (category === "Update") return "bg-blue-500/20 border-blue-500/30 text-blue-400";
  return "bg-[#5B69FF]/20 border-[#5B69FF]/30 text-[#5B69FF]"; // 공지
}

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  // 1. 로스트아크 공식 공지사항 가져오기
  let notices = [
    { title: "로스트아크 공식 공지 확인하기", category: "공식", date: "", link: "https://lostark.game.onstove.com/News/Notice/List", isNew: false },
  ];

  try {
    const res = await fetch(`${baseUrl}/api/lostark/notice`, { cache: "no-store" });
    if (res.ok) {
      const json = await res.json();
      if (json?.list && Array.isArray(json.list) && json.list.length > 0) {
        notices = json.list;
      }
    }
  } catch (e) { console.error("[HomePage] lostark notice fetch error:", e); }

  // 2. 로아체크 자체 공지사항 가져오기
  let loacheckNotices: any[] = [];
  try {
    const res = await fetch(`${baseUrl}/api/notice`, { cache: "no-store" });
    if (res.ok) {
      const json = await res.json();
      if (json?.notices && Array.isArray(json.notices)) {
        loacheckNotices = json.notices; // 스크롤을 위해 전체를 가져옵니다.
      }
    }
  } catch (e) { console.error("[HomePage] loacheck notice fetch error:", e); }

  const toggleBtnClass = "order-2 w-full list-none [&::-webkit-details-marker]:hidden cursor-pointer flex items-center justify-center gap-2 py-2.5 md:py-3 rounded-xl bg-[var(--surface-131519)] border border-[var(--overlay-ink)]/5 hover:bg-[var(--surface-1a1d24)] hover:border-[var(--overlay-ink)]/10 hover:text-gray-200 transition-all text-xs font-bold text-gray-500 mt-3 md:mt-4";

  return (
    <div className="pt-6 md:pt-17 pb-10 px-0 md:px-4 xl:px-0 text-gray-300 w-full max-w-7xl mx-auto space-y-5 lg:space-y-8">
      {!session?.user && <HomeGuestIntro />}

      {/* 상단 섹션: 스케줄 + 우측 로아체크 공지사항 */}
      <section className="w-full grid grid-cols-1 lg:grid-cols-10 gap-4 lg:gap-6 items-stretch">

        {/* 상단 좌측 스케줄 */}
        <div className="lg:col-span-7 w-full bg-[var(--surface-16181d)] border border-x-0 md:border-x border-[var(--overlay-ink)]/5 rounded-none md:rounded-2xl p-4 md:p-6 relative overflow-hidden flex flex-col justify-center">
          <ClientOnly fallback={<div className="w-full h-[200px] bg-[var(--overlay-ink)]/5 animate-pulse rounded-2xl" />}>
            <TodaySchedule />
          </ClientOnly>
        </div>

        {/* 상단 우측 로아체크 공지사항 래퍼 (Wrapper) */}
        <div className="lg:col-span-3 relative h-[290px] lg:h-auto">

          {/* 실제 카드 (lg 화면 이상에서만 absolute로 띄워서 그리드 높이 영향 차단) */}
          <div className="w-full h-full lg:absolute lg:inset-0 bg-[var(--surface-16181d)] border border-x-0 md:border-x border-[var(--overlay-ink)]/5 rounded-none md:rounded-2xl overflow-hidden flex flex-col">

            <div className="px-4 md:px-5 py-3 md:py-4 border-b border-[var(--overlay-ink)]/5 flex items-center justify-between bg-[var(--surface-16181d)] shrink-0">
              <span className="text-sm md:text-base font-bold text-gray-200 flex items-center gap-2">
                <Megaphone size={16} className="md:w-[18px] md:h-[18px]" />
                로아체크 공지사항
              </span>
              <a href="/support" className="text-[11px] md:text-xs font-medium text-gray-500 hover:text-[#5B69FF] flex items-center gap-1 transition-colors px-2 py-1 rounded hover:bg-[#5B69FF]/10">
                전체보기 <ExternalLink size={12} />
              </a>
            </div>

            {/* 스크롤 영역 */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <ul className="divide-y divide-[var(--overlay-ink)]/5">
                {loacheckNotices.length > 0 ? (
                  loacheckNotices.map((notice, idx) => (
                    <li key={idx}>
                      <a href={`/support?noticeId=${notice.id}`} className="block px-4 md:px-5 py-3 md:py-[15.6px] hover:bg-[var(--overlay-ink)]/5 transition-colors group">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium bg-[var(--overlay-ink)]/5 text-gray-400 border-[var(--overlay-ink)]/10 group-hover:border-[var(--overlay-ink)]/20 group-hover:text-gray-300 transition-colors`}>
                            {notice.category}
                          </span>
                          <span className="text-[11px] font-medium text-gray-600">
                            {fmtDate(notice.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-300 font-bold leading-snug line-clamp-1 sm:line-clamp-2 group-hover:text-white transition-colors">
                          {notice.title}
                        </p>
                      </a>
                    </li>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center h-full min-h-[100px] text-gray-500 text-sm">
                    등록된 소식이 없습니다.
                  </div>
                )}
              </ul>
            </div>
          </div>
        </div>
      </section>
      {/* 중단 섹션: 좌측 배너 + 우측 숙제/계산기 배너 (펼치기 시 독립적 동작) */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-4 lg:gap-6 items-start">

        {/* 중단 좌측: 로스트아크 공지 + 레이드 정보 배너 */}
        <div className="lg:col-span-3 flex flex-col gap-4 lg:gap-6">

          {/* 1. 로스트아크 공지사항 (모바일은 h-auto, PC는 고정 높이) */}
          <div className="bg-[var(--surface-16181d)] border border-x-0 md:border-x border-[var(--overlay-ink)]/5 rounded-none md:rounded-xl overflow-hidden flex flex-col h-auto md:h-[390px]">
            <div className="px-4 md:px-5 py-3 md:py-4 border-b border-[var(--overlay-ink)]/5 flex items-center justify-between bg-[var(--surface-16181d)] shrink-0">
              <span className="text-sm md:text-base font-bold text-gray-200 flex items-center gap-2">
                <Megaphone size={16} className="text-gray-400 md:w-[18px] md:h-[18px]" />
                로스트아크 공지사항
              </span>
              <a href="https://lostark.game.onstove.com/News/Notice/List" target="_blank" rel="noopener noreferrer" className="text-[11px] md:text-xs font-medium text-gray-500 hover:text-blue-400 flex items-center gap-1 transition-colors px-2 py-1 rounded hover:bg-[var(--overlay-ink)]/5">
                전체보기 <ExternalLink size={12} />
              </a>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <ul className="divide-y divide-[var(--overlay-ink)]/5">
                {notices.map((notice, idx) => (
                  <li key={idx} className={idx >= 3 ? "hidden md:block" : ""}>
                    <a href={notice.link} target="_blank" rel="noopener noreferrer" className="block px-4 md:px-5 py-3 md:py-[16px] hover:bg-[var(--overlay-ink)]/5 transition-colors group">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium bg-[var(--overlay-ink)]/5 text-gray-400 border-[var(--overlay-ink)]/10 group-hover:border-[var(--overlay-ink)]/20 group-hover:text-gray-300 transition-colors`}>
                          {notice.category}
                        </span>
                        <span className={`text-[11px] font-medium ${notice.isNew ? "text-blue-400 font-bold" : "text-gray-600"}`}>
                          {notice.date}
                        </span>
                      </div>
                      <p className="text-sm text-gray-300 font-bold leading-snug line-clamp-1 sm:line-clamp-2 group-hover:text-white transition-colors">
                        {notice.title}
                      </p>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* 2. 레이드 정보 바로가기 (단일 링크형 배너) */}
          <a href="/raid-info" className="group relative w-full bg-[var(--surface-16181d)] border border-x-0 md:border-x border-[var(--overlay-ink)]/5 rounded-none md:rounded-xl p-4 md:p-5 flex items-center justify-between hover:border-[#5B69FF]/50 transition-all duration-300 overflow-hidden">
            <div className="flex items-center gap-3 md:gap-4 z-10">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-[var(--surface-1f222b)] flex items-center justify-center text-[#5B69FF] group-hover:bg-[#5B69FF] group-hover:text-white transition-colors border border-[var(--overlay-ink)]/5">
                <ArrowUpRight size={20} className="md:w-[24px] md:h-[24px]" />
              </div>
              <div className="flex flex-col">
                <h3 className="text-base md:text-lg font-bold text-gray-100 group-hover:text-white transition-colors">레이드 보상 정보</h3>
                <p className="text-xs md:text-sm text-gray-500 group-hover:text-gray-400 transition-colors">레이드 보상 정보 확인</p>
              </div>
            </div>
            <div className="text-gray-400 hover:text-gray-200 transition-colors z-10">
              <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <div className="absolute top-0 right-0 w-32 h-full bg-gradient-to-l from-[#5B69FF]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </a>

        </div>

        {/* 중단 우측: 숙제 현황 및 파티 영역 (세로 열 기준으로 변경) */}
        <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6 items-start">

          {/* 좌측 열: 내 숙제 현황 + 젬 세팅 최적화 배너 */}
          <div className="flex flex-col gap-4 lg:gap-6 w-full">
            <Card className="border border-x-0 md:border-x border-[var(--overlay-ink)]/5 bg-[var(--surface-16181d)] w-full flex flex-col rounded-none md:rounded-2xl" contentPadding="lg">
              <HomeMyTasksSummary>
                <div className="w-full flex flex-col min-h-[300px] md:min-h-[340px]">
                  <div className="w-full mb-auto">
                    <a href="/my-tasks" className="group w-full flex items-center justify-between gap-3 mb-3 md:mb-4 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <div className="w-1 md:w-1.5 h-5 md:h-6 bg-blue-500 rounded-r-md transition-colors group-hover:bg-blue-400" />
                        <span className="font-bold text-lg md:text-xl text-gray-100 transition-colors group-hover:text-white">내 숙제 현황</span>
                      </div>
                      <div className="text-gray-400 transition-colors group-hover:text-white">
                        <ChevronRight className="w-5 h-5 md:w-6 md:h-6 transition-transform group-hover:translate-x-1" />
                      </div>
                    </a>
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

            <a href="/calculator/gem" className="group relative w-full bg-[var(--surface-16181d)] border border-x-0 md:border-x border-[var(--overlay-ink)]/5 rounded-none md:rounded-xl p-4 md:p-5 flex items-center justify-between hover:border-[#5B69FF]/50 transition-all duration-300 overflow-hidden">
              <div className="flex items-center gap-3 md:gap-4 z-10">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-[var(--surface-1f222b)] flex items-center justify-center text-[#5B69FF] group-hover:bg-[#5B69FF] group-hover:text-white transition-colors border border-[var(--overlay-ink)]/5">
                  <Gem size={20} className="md:w-[24px] md:h-[24px]" />
                </div>
                <div className="flex flex-col">
                  <h3 className="text-base md:text-lg font-bold text-gray-100 group-hover:text-white transition-colors">보석 합성 계산기</h3>
                  <p className="text-xs md:text-sm text-gray-500 group-hover:text-gray-400 transition-colors">T4 보석 구매와 합성 비용 비교</p>
                </div>
              </div>
              <div className="text-gray-400 hover:text-gray-200 transition-colors">
                <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <div className="absolute top-0 right-0 w-32 h-full bg-gradient-to-l from-[#5B69FF]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
          </div>

          {/* 우측 열: 내 참여 파티 + 딜 지분 계산기 배너 */}
          <div className="flex flex-col gap-4 lg:gap-6 w-full">
            <Card className="border border-x-0 md:border-x border-[var(--overlay-ink)]/5 bg-[var(--surface-16181d)] w-full flex flex-col rounded-none md:rounded-2xl" contentPadding="lg">
              <HomePartySummaryProvider>
                <div className="w-full flex flex-col min-h-[300px] md:min-h-[340px]">
                  <a href="/party-tasks" className="group w-full flex items-center justify-between gap-3 mb-3 md:mb-4 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <div className="w-1 md:w-1.5 h-5 md:h-6 bg-blue-500 rounded-r-md transition-colors group-hover:bg-blue-400" />
                      <span className="font-bold text-lg md:text-xl text-gray-100 transition-colors group-hover:text-white">내 참여 파티</span>
                    </div>
                    <div className="text-gray-400 transition-colors group-hover:text-white">
                      <ChevronRight className="w-5 h-5 md:w-6 md:h-6 transition-transform group-hover:translate-x-1" />
                    </div>
                  </a>
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

            <a href="/dps-share" className="group relative w-full bg-[var(--surface-16181d)] border border-x-0 md:border-x border-[var(--overlay-ink)]/5 rounded-none md:rounded-xl p-4 md:p-5 flex items-center justify-between hover:border-[#FF5252]/50 transition-all duration-300 overflow-hidden">
              <div className="flex items-center gap-3 md:gap-4 z-10">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-[var(--surface-1f222b)] flex items-center justify-center text-[#FF5252] group-hover:bg-[#FF5252] group-hover:text-white transition-colors border border-[var(--overlay-ink)]/5">
                  <Calculator size={20} className="md:w-[24px] md:h-[24px]" />
                </div>
                <div className="flex flex-col">
                  <h3 className="text-base md:text-lg font-bold text-gray-100 group-hover:text-white transition-colors">딜 지분 계산기</h3>
                  <p className="text-xs md:text-sm text-gray-500 group-hover:text-gray-400 transition-colors">저장된 기준 대비 딜 지분 추정</p>
                </div>
              </div>
              <div className="text-gray-400 hover:text-gray-200 transition-colors">
                <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <div className="absolute top-0 right-0 w-32 h-full bg-gradient-to-l from-[#FF5252]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
          </div>

        </div>
      </div>

      <nav aria-label="도움말" className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-[var(--overlay-ink)]/5 px-4 pt-5 text-xs text-gray-400 md:px-0">
        <Link href="/guide" className="hover:text-[#A6AEFF]">처음 이용하시나요? →</Link>
        <Link href="/articles" className="hover:text-[#A6AEFF]">계산 예시 →</Link>
        <Link href="/guide/data" className="hover:text-[#A6AEFF]">데이터 출처 →</Link>
      </nav>
    </div>
  );
}
