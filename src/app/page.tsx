import { ChevronRight, ChevronDown, ExternalLink, Megaphone, Diamond, Calculator, ArrowUpRight } from "lucide-react";
import Card from "./components/Card";
import HomeMyTasksSummary, { HomeMyTasksHeader, HomeMyTasksDetails, HomeMyTasksGuard } from "./components/HomeMyTasksSummary";
import HomePartySummaryProvider, { HomePartyGuard, HomePartyHeader, HomePartyDetails } from "./components/HomePartySummary";
import TodaySchedule from "./components/TodaySchedule";
import ClientOnly from "./components/ClientOnly";

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
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  // 1. 로스트아크 공식 공지사항 가져오기
  let notices = [
    { title: "로스트아크 정기 점검 안내", category: "공지", date: "NEW", link: "#", isNew: true },
    { title: "2월 14일(수) 로스트아크 샵 상품 안내", category: "상점", date: "2024.02.10", link: "https://lostark.game.onstove.com/News/Notice/List", isNew: false },
    { title: "[이벤트] 달콤한 발렌타인 데이 이벤트", category: "이벤트", date: "2024.02.09", link: "https://lostark.game.onstove.com/News/Notice/List", isNew: false },
    { title: "알려진 버그 수정 사항 안내", category: "수정", date: "2024.02.08", link: "https://lostark.game.onstove.com/News/Notice/List", isNew: false },
    { title: "클라이언트 패치 노트 (Ver 2.5.1)", category: "패치", date: "2024.02.07", link: "https://lostark.game.onstove.com/News/Notice/List", isNew: false },
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

  // 2. 로아체크 자체 공지사항 가져오기 (최대 5개)
  let loacheckNotices: any[] = [];
  try {
    const res = await fetch(`${baseUrl}/api/notice`, { cache: "no-store" });
    if (res.ok) {
      const json = await res.json();
      if (json?.notices && Array.isArray(json.notices)) {
        loacheckNotices = json.notices.slice(0, 5);
      }
    }
  } catch (e) { console.error("[HomePage] loacheck notice fetch error:", e); }

  const toggleBtnClass = "order-2 w-full list-none [&::-webkit-details-marker]:hidden cursor-pointer flex items-center justify-center gap-2 py-2.5 md:py-3 rounded-xl bg-[#131519] border border-white/5 hover:bg-[#1A1D24] hover:border-white/10 hover:text-gray-200 transition-all text-xs font-bold text-gray-500 mt-3 md:mt-4";

  const faqList = [
    {
      q: "로아체크는 어떤 데이터를 기준으로 동작하나요?",
      a: "캐릭터와 기본 정보는 로스트아크 오픈 API를 참고하고, 숙제 체크/파티 진행 상태/일부 계산 입력값은 사용자가 직접 관리하는 구조입니다.",
    },
    {
      q: "비로그인 상태에서도 사용할 수 있나요?",
      a: "일부 기능은 웹 브라우저 로컬 저장을 통해 사용할 수 있고, 로그인하면 여러 기기에서 같은 데이터를 더 안정적으로 이어서 볼 수 있습니다.",
    },
    {
      q: "딜 지분 계산 결과는 100% 정확한가요?",
      a: "실전에서 시너지, 기믹 수행, 서포터 구성, 관문 편차 같은 요소가 있기 때문에 참고용 분석 지표로 보는 것이 가장 적절합니다.",
    },
    {
      q: "젬 세팅 결과가 여러 개 나오면 무엇을 기준으로 고르면 되나요?",
      a: "최소 포인트 충족이 목적이면 포인트 우선, 도달 가능한 최고 포인트를 유지하면서 스탯을 챙기고 싶다면 스탯 상위, 체감 성능을 우선하면 스탯 우선 기준으로 보면 됩니다.",
    },
    {
      q: "파티 숙제는 어떻게 활용하면 좋나요?",
      a: "고정 파티나 지인 파티처럼 매주 반복되는 레이드 일정에서 관문 진행 상황과 남은 숙제를 한 번에 공유하는 용도로 가장 편합니다.",
    },
    {
      q: "로아체크의 계산 결과는 어떤 사람에게 도움이 되나요?",
      a: "여러 캐릭터를 동시에 관리하는 유저, 파티 일정을 자주 맞추는 유저, 딜 분석이나 경매 손익을 빠르게 판단하고 싶은 유저에게 특히 유용합니다.",
    },
  ];

  return (
    <div className="pt-6 md:pt-17 pb-10 px-0 md:px-4 xl:px-0 text-gray-300 w-full max-w-7xl mx-auto space-y-5 lg:space-y-8">

      {/* 상단 섹션: 스케줄 + 우측 광고 자리 */}
      <section className="w-full grid grid-cols-1 lg:grid-cols-10 gap-4 lg:gap-6">
        <div className="lg:col-span-7 w-full bg-[#16181D] border border-x-0 md:border-x border-white/5 rounded-none md:rounded-2xl p-4 md:p-6 relative overflow-hidden flex flex-col justify-center">
          <ClientOnly fallback={<div className="w-full h-full bg-white/5 animate-pulse rounded-2xl" />}>
            <TodaySchedule />
          </ClientOnly>
        </div>

        {/* 상단 우측 광고 자리 빈칸 */}
        <div className="lg:col-span-3 w-full h-full min-h-[120px] md:min-h-[180px] bg-[#16181D] border border-x-0 md:border-x border-white/5 rounded-none md:rounded-2xl overflow-hidden flex items-center justify-center relative">
          <div className="absolute inset-0 flex items-center justify-center text-gray-700 text-xs z-0 select-none"></div>
          <div className="relative z-10 w-full h-full">
            {/* 나중에 이곳에 구글 애드센스 컴포넌트를 다시 넣으시면 됩니다 */}
          </div>
        </div>
      </section>

      {/* 중단 섹션: 공지사항과 주요 기능 카드 */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-4 lg:gap-6">
        <div className="lg:col-span-3 flex flex-col gap-4 lg:gap-6 h-full">

          {/* 1. 로스트아크 공지사항 (고정 높이 지정) */}
          <div className="bg-[#16181D] border border-x-0 md:border-x border-white/5 rounded-none md:rounded-xl overflow-hidden flex flex-col shrink-0 h-[280px] sm:h-[320px] lg:h-[280px]">
            <div className="px-4 md:px-5 py-3 md:py-4 border-b border-white/5 flex items-center justify-between bg-[#16181D]">
              <span className="text-sm md:text-base font-bold text-gray-200 flex items-center gap-2">
                <Megaphone size={16} className="text-gray-400 md:w-[18px] md:h-[18px]" />
                로스트아크 공지사항
              </span>
              <a href="https://lostark.game.onstove.com/News/Notice/List" target="_blank" rel="noopener noreferrer" className="text-[11px] md:text-xs font-medium text-gray-500 hover:text-blue-400 flex items-center gap-1 transition-colors px-2 py-1 rounded hover:bg-white/5">
                전체보기 <ExternalLink size={12} />
              </a>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <ul className="divide-y divide-white/5">
                {notices.map((notice, idx) => (
                  <li key={idx}>
                    <a href={notice.link} target="_blank" rel="noopener noreferrer" className="block px-4 md:px-5 py-3 md:py-3.5 hover:bg-white/5 transition-colors group">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium bg-white/5 text-gray-400 border-white/10 group-hover:border-white/20 group-hover:text-gray-300 transition-colors`}>
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

          {/* 2. 로아체크 소식 (고정 높이 지정) */}
          <div className="bg-[#16181D] border border-x-0 md:border-x border-white/5 rounded-none md:rounded-xl overflow-hidden flex flex-col shrink-0 h-[280px] sm:h-[320px] lg:h-[210px]">
            <div className="px-4 md:px-5 py-3 md:py-4 border-b border-white/5 flex items-center justify-between bg-[#16181D]">
              <span className="text-sm md:text-base font-bold text-gray-200 flex items-center gap-2">
                <Megaphone size={16} className="md:w-[18px] md:h-[18px]" />
                로아체크 공지사항
              </span>
              <a href="/support" className="text-[11px] md:text-xs font-medium text-gray-500 hover:text-[#5B69FF] flex items-center gap-1 transition-colors px-2 py-1 rounded hover:bg-[#5B69FF]/10">
                전체보기 <ExternalLink size={12} />
              </a>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <ul className="divide-y divide-white/5">
                {loacheckNotices.length > 0 ? (
                  loacheckNotices.map((notice, idx) => (
                    <li key={idx}>
                      <a href={`/support?noticeId=${notice.id}`} className="block px-4 md:px-5 py-3 md:py-3.5 hover:bg-white/5 transition-colors group">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium bg-white/5 text-gray-400 border-white/10 group-hover:border-white/20 group-hover:text-gray-300 transition-colors`}>
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

        <div className="lg:col-span-7 flex flex-col gap-4 lg:gap-6 h-full">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6 w-full items-start">
            <Card className="border border-x-0 md:border-x border-white/5 bg-[#16181D] w-full flex flex-col rounded-none md:rounded-2xl" contentPadding="lg">
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
                    <div className="w-full pt-1 md:pt-2"><HomeMyTasksHeader /></div>
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

            <Card className="border border-x-0 md:border-x border-white/5 bg-[#16181D] w-full flex flex-col rounded-none md:rounded-2xl" contentPadding="lg">
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6 w-full">
            <a href="/gem-setup" className="group relative w-full bg-[#16181D] border border-x-0 md:border-x border-white/5 rounded-none md:rounded-xl p-4 md:p-5 flex items-center justify-between hover:border-[#5B69FF]/50 transition-all duration-300 overflow-hidden">
              <div className="flex items-center gap-3 md:gap-4 z-10">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-[#1F222B] flex items-center justify-center text-[#5B69FF] group-hover:bg-[#5B69FF] group-hover:text-white transition-colors border border-white/5">
                  <Diamond size={20} className="md:w-[24px] md:h-[24px]" />
                </div>
                <div className="flex flex-col">
                  <h3 className="text-base md:text-lg font-bold text-gray-100 group-hover:text-white transition-colors">젬 세팅 최적화</h3>
                  <p className="text-xs md:text-sm text-gray-500 group-hover:text-gray-400 transition-colors">보유한 젬으로 최적의 효율 찾기</p>
                </div>
              </div>
              <div className="text-gray-400 hover:text-gray-200 transition-colors">
                <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <div className="absolute top-0 right-0 w-32 h-full bg-gradient-to-l from-[#5B69FF]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>

            <a href="/dps-share" className="group relative w-full bg-[#16181D] border border-x-0 md:border-x border-white/5 rounded-none md:rounded-xl p-4 md:p-5 flex items-center justify-between hover:border-[#FF5252]/50 transition-all duration-300 overflow-hidden">
              <div className="flex items-center gap-3 md:gap-4 z-10">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-[#1F222B] flex items-center justify-center text-[#FF5252] group-hover:bg-[#FF5252] group-hover:text-white transition-colors border border-white/5">
                  <Calculator size={20} className="md:w-[24px] md:h-[24px]" />
                </div>
                <div className="flex flex-col">
                  <h3 className="text-base md:text-lg font-bold text-gray-100 group-hover:text-white transition-colors">딜 지분 계산기</h3>
                  <p className="text-xs md:text-sm text-gray-500 group-hover:text-gray-400 transition-colors">강투/잔혈 달성 여부 확인하기</p>
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

      {/* 하단 섹션: 가이드 */}
      <section id="home-guide" className="w-full border-t border-white/5 pt-8 md:pt-12 pb-4 px-4 md:px-0 mt-8 md:mt-12">
        <div className="mb-6 md:mb-8">
          <h2 className="text-base md:text-lg font-bold text-gray-200 mb-2 flex items-center gap-2">
            <span className="text-blue-500">GUIDE</span> 로아체크 이용 가이드
          </h2>
          <p className="text-sm text-gray-500 leading-relaxed max-w-3xl">
            로아체크는 단순 링크 모음이 아니라, 숙제 관리와 파티 공유, 딜 분석, 젬 세팅, 경매 판단처럼 실제 플레이 도중 반복되는 계산과 확인 과정을 줄이기 위해 만든 보조 도구입니다. 아래 설명에서 각 기능이 어떤 상황에서 도움이 되는지 확인할 수 있습니다.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          <div className="bg-[#16181D] border border-white/5 p-5 md:p-6 rounded-2xl flex flex-col h-fit">
            <h3 className="text-sm md:text-base font-bold text-gray-100 mb-2">로아체크 숙제 관리 및 파티 동기화 시스템</h3>
            <p className="text-xs text-gray-400 leading-relaxed mb-4">내 계정 연동부터 파티원과의 실시간 숙제 공유까지, 매주 반복되는 레이드 일정을 더 편하게 정리할 수 있도록 구성했습니다.</p>
            <details className="group mt-auto">
              <summary className="text-xs text-blue-400 hover:text-blue-300 font-bold cursor-pointer list-none [&::-webkit-details-marker]:hidden flex items-center gap-1 transition-colors w-fit">
                <span className="group-open:hidden">가이드 읽기</span>
                <span className="hidden group-open:inline">가이드 접기</span>
                <ChevronDown className="w-3 h-3 group-open:rotate-180 transition-transform" />
              </summary>
              <div className="pt-4 mt-4 border-t border-white/5 text-xs text-gray-500 leading-relaxed space-y-3">
                <p><strong className="text-gray-300">개인 숙제 정리:</strong> 대표 캐릭터 기준으로 원정대 정보를 가져오고, 캐릭터별 레이드와 골드 획득 현황을 빠르게 체크할 수 있습니다. 숙제 누락을 줄이고, 어떤 캐릭터가 이번 주에 무엇을 남겨뒀는지 한눈에 보기 쉽게 정리하는 데 적합합니다.</p>
                <p><strong className="text-gray-300">파티 동기화:</strong> 파티 숙제 메뉴에서는 여러 명이 같은 진행 상태를 공유할 수 있어, 고정 공대나 지인팟처럼 매주 비슷한 구성을 유지하는 경우 특히 편리합니다.</p>
              </div>
            </details>
          </div>

          <div className="bg-[#16181D] border border-white/5 p-5 md:p-6 rounded-2xl flex flex-col h-fit">
            <h3 className="text-sm md:text-base font-bold text-gray-100 mb-2">로스트아크 딜 지분(DPS) 역산 분석기</h3>
            <p className="text-xs text-gray-400 leading-relaxed mb-4">게임 내 MVP 화면의 피해량을 기반으로 보스 전체 체력 대비 내 기여도를 역산해, 퍼포먼스를 수치로 확인할 수 있습니다.</p>
            <details className="group mt-auto">
              <summary className="text-xs text-[#FF5252] hover:text-[#ff7474] font-bold cursor-pointer list-none [&::-webkit-details-marker]:hidden flex items-center gap-1 transition-colors w-fit">
                <span className="group-open:hidden">가이드 읽기</span>
                <span className="hidden group-open:inline">가이드 접기</span>
                <ChevronDown className="w-3 h-3 group-open:rotate-180 transition-transform" />
              </summary>
              <div className="pt-4 mt-4 border-t border-white/5 text-xs text-gray-500 leading-relaxed space-y-3">
                <p>딜 지분 계산기는 단순히 MVP 화면의 피해량을 다시 보여주는 것이 아니라, 레이드와 관문별 체력을 기준으로 내 딜 기여도를 퍼센트로 환산해 줍니다. 같은 피해량이라도 레이드에 따라 체감 의미가 달라질 수 있어, 비교 기준을 정리하는 데 도움이 됩니다.</p>
                <ul className="space-y-2 pl-2">
                  <li><strong className="text-gray-300">8인 레이드:</strong> 평균 1인분 기준을 참고해 강투/잔혈 여부를 보다 직관적으로 판단할 수 있습니다.</li>
                  <li><strong className="text-gray-300">4인 레이드:</strong> 딜러 수가 적기 때문에 한 명의 기여도 차이가 크게 나타나며, 실전 해석 시 관문별 편차도 함께 보는 기 좋습니.</li>
                </ul>
              </div>
            </details>
          </div>

          <div className="bg-[#16181D] border border-white/5 p-5 md:p-6 rounded-2xl flex flex-col h-fit">
            <h3 className="text-sm md:text-base font-bold text-gray-100 mb-2">아크 그리드 최적화 및 젬 세팅 가이드</h3>
            <p className="text-xs text-gray-400 leading-relaxed mb-4">한정된 젬과 코어 포인트를 효율적으로 배치해 도달 가능한 포인트와 스탯 효율을 함께 살피는 데 초점을 맞췄습니다.</p>
            <details className="group mt-auto">
              <summary className="text-xs text-[#5B69FF] hover:text-[#7f8aff] font-bold cursor-pointer list-none [&::-webkit-details-marker]:hidden flex items-center gap-1 transition-colors w-fit">
                <span className="group-open:hidden">가이드 읽기</span>
                <span className="hidden group-open:inline">가이드 접기</span>
                <ChevronDown className="w-3 h-3 group-open:rotate-180 transition-transform" />
              </summary>
              <div className="pt-4 mt-4 border-t border-white/5 text-xs text-gray-500 leading-relaxed space-y-3">
                <p>로아체크의 젬 세팅 최적화는 현재 보유 중인 젬 상태를 바탕으로, 어떤 방식으로 배치해야 원하는 포인트와 스탯을 가장 효율적으로 맞출 수 있는지 계산하는 도구입니다.</p>
                <ul className="space-y-1.5 pl-2">
                  <li><strong className="text-gray-300">• 포인트 우선:</strong> 핵심 코어 활성화에 필요한 최소 조건 충족에 집중합니다.</li>
                  <li><strong className="text-gray-300">• 스탯 상위:</strong> 도달 가능한 높은 포인트를 유지하면서 전투 스탯 효율을 함께 끌어올리는 방식입니다.</li>
                  <li><strong className="text-gray-300">• 스탯 우선:</strong> 실제 체감 성능과 수치 효율을 더 중시하는 방향입니다.</li>
                </ul>
              </div>
            </details>
          </div>
        </div>
      </section>

      {/* 하단 섹션: 추가 설명 */}
      <section className="px-4 md:px-0 grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
        <div className="bg-[#16181D] border border-white/5 rounded-2xl p-5 md:p-6">
          <h2 className="text-base md:text-lg font-bold text-gray-100 mb-3">로아체크를 이렇게 활용하면 좋습니다</h2>
          <div className="space-y-3 text-sm text-gray-400 leading-relaxed">
            <p>여러 캐릭터를 운영하는 유저라면 주간 초기화 후 내 숙제 메뉴에서 빠르게 전체 현황을 확인하고, 파티 플레이가 잦다면 파티 숙제 메뉴를 통해 공대 진행 상태를 함께 보는 식으로 활용할 수 있습니다.</p>
            <p>여기에 딜 지분 계산기와 경매 계산기를 더하면 레이드 종료 후 결과 해석까지 한 번에 이어서 볼 수 있어, 단순 체크용을 넘어 플레이 기록 정리 도구로도 활용하기 좋습니다.</p>
          </div>
        </div>

        <div className="bg-[#16181D] border border-white/5 rounded-2xl p-5 md:p-6">
          <h2 className="text-base md:text-lg font-bold text-gray-100 mb-3">결과 해석 시 참고할 점</h2>
          <div className="space-y-3 text-sm text-gray-400 leading-relaxed">
            <p>계산 도구는 빠른 판단을 돕기 위한 참고용 지표입니다. 시너지 조합, 서포터 숙련도, 기믹 수행, 관문 구조, 패턴 운 같은 실전 요소까지 완전히 고정된 형태로 반영되지는 않습니다.</p>
            <p>따라서 로아체크의 수치는 절대적인 정답이라기보다, 여러 플레이 기록과 비교하며 반복적으로 참고할 때 가장 가치가 큽니다.</p>
          </div>
        </div>
      </section>

      {/* 하단 섹션: FAQ */}
      <section id="home-faq" className="px-4 md:px-0 pb-10">
        <div className="mb-5">
          <h2 className="text-base md:text-lg font-bold text-gray-200 mb-2 flex items-center gap-2">
            <span className="text-blue-500">FAQ</span> 자주 묻는 질문
          </h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            로아체크를 처음 사용하는 유저가 가장 많이 궁금해하는 내용을 홈에서 바로 확인할 수 있게 정리했습니다.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6 items-start">
          {faqList.map((item, idx) => (
            <details key={idx} className="group bg-[#16181D] border border-white/5 rounded-2xl p-5 md:p-6">
              <summary className="list-none [&::-webkit-details-marker]:hidden cursor-pointer flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-gray-100 leading-relaxed">{item.q}</p>
                </div>
                <ChevronDown className="w-4 h-4 mt-0.5 text-gray-500 transition-transform group-open:rotate-180" />
              </summary>
              <div className="pt-4 mt-4 border-t border-white/5">
                <p className="text-sm text-gray-400 leading-relaxed">{item.a}</p>
              </div>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}