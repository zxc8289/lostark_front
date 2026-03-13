import { ChevronRight, ChevronDown, ExternalLink, Megaphone, Diamond, Calculator, ArrowUpRight } from "lucide-react";
import Card from "./components/Card";
import HomeMyTasksSummary, { HomeMyTasksHeader, HomeMyTasksDetails, HomeMyTasksGuard } from "./components/HomeMyTasksSummary";
import HomePartySummaryProvider, { HomePartyGuard, HomePartyHeader, HomePartyDetails } from "./components/HomePartySummary";

import GoogleAd from "./components/GoogleAd";
import TodaySchedule from "./components/TodaySchedule";
import ClientOnly from "./components/ClientOnly";

export default async function HomePage() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

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
  } catch (e) { console.error("[HomePage] fetch error:", e); }

  const AD_SLOT_MAIN_TOP_RIGHT = "4951318932";
  const AD_SLOT_MAIN_LEFT = "6052642414";

  const toggleBtnClass = "order-2 w-full list-none [&::-webkit-details-marker]:hidden cursor-pointer flex items-center justify-center gap-2 py-2.5 md:py-3 rounded-xl bg-[#131519] border border-white/5 hover:bg-[#1A1D24] hover:border-white/10 hover:text-gray-200 transition-all text-xs font-bold text-gray-500 mt-3 md:mt-4";

  return (
    <div className="pt-6 md:pt-17 pb-10 px-0 md:px-4 xl:px-0 text-gray-300 w-full max-w-7xl mx-auto space-y-5 lg:space-y-8">
      <section className="w-full grid grid-cols-1 lg:grid-cols-10 gap-4 lg:gap-6">
        <div className="lg:col-span-7 w-full bg-[#16181D] border border-x-0 md:border-x border-white/5 rounded-none md:rounded-2xl p-4 md:p-6 relative overflow-hidden flex flex-col justify-center">
          <ClientOnly fallback={<div className="w-full h-full bg-white/5 animate-pulse rounded-2xl" />}>
            <TodaySchedule />
          </ClientOnly>
        </div>

        <div className="lg:col-span-3 w-full h-full min-h-[120px] md:min-h-[180px] bg-[#16181D] border border-x-0 md:border-x border-white/5 rounded-none md:rounded-2xl overflow-hidden flex items-center justify-center relative">
          <div className="absolute inset-0 flex items-center justify-center text-gray-700 text-xs z-0">AD Area</div>
          <div className="relative z-10 w-full h-full">
            <ClientOnly fallback={<div className="w-full h-full bg-white/5 animate-pulse" />}>
              <GoogleAd slot={AD_SLOT_MAIN_TOP_RIGHT} className="!my-0 w-full h-full" />
            </ClientOnly>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-10 gap-4 lg:gap-6">
        <div className="lg:col-span-3 flex flex-col gap-4 lg:gap-6 h-full">
          <div className="bg-[#16181D] border border-x-0 md:border-x border-white/5 rounded-none md:rounded-xl overflow-hidden flex flex-col shrink-0">
            <div className="px-4 md:px-5 py-3 md:py-4 border-b border-white/5 flex items-center justify-between bg-[#16181D]">
              <span className="text-sm md:text-base font-bold text-gray-200 flex items-center gap-2">
                <Megaphone size={16} className="text-gray-400 md:w-[18px] md:h-[18px]" />
                공지사항
              </span>
              <a href="https://lostark.game.onstove.com/News/Notice/List" target="_blank" rel="noopener noreferrer" className="text-[11px] md:text-xs font-medium text-gray-500 hover:text-blue-400 flex items-center gap-1 transition-colors px-2 py-1 rounded hover:bg-white/5">
                전체보기 <ExternalLink size={12} />
              </a>
            </div>

            <div className="max-h-[148px] overflow-y-auto custom-scrollbar">
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
                      <p className="text-sm text-gray-300 font-bold leading-snug line-clamp-2 group-hover:text-white transition-colors">
                        {notice.title}
                      </p>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="w-full flex-1 bg-[#16181D] border border-x-0 md:border-x border-white/5 rounded-none md:rounded-xl overflow-hidden flex items-center justify-center relative min-h-[180px] md:min-h-[300px]">
            <div className="absolute inset-0 flex items-center justify-center text-gray-700 text-xs z-0"></div>
            <div className="relative z-10 w-full h-full">
              <ClientOnly fallback={<div className="w-full h-full bg-white/5 animate-pulse" />}>
                <GoogleAd slot={AD_SLOT_MAIN_LEFT} className="!my-0 w-full h-full" />
              </ClientOnly>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 flex flex-col gap-4 lg:gap-6 h-full">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6 w-full items-start">

            {/* 🔥 Card 컴포넌트들에도 모바일 직각 디자인 적용 */}
            <Card className="border border-x-0 md:border-x border-white/5 bg-[#16181D] w-full flex flex-col rounded-none md:rounded-2xl" contentPadding="lg">
              <HomeMyTasksSummary>
                <div className="w-full flex flex-col min-h-[300px] md:min-h-[340px]">
                  <div className="w-full mb-auto">
                    {/* 🔥 a 태그를 바깥으로 빼서 전체 영역을 감싸도록 수정 */}
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
                  {/* 🔥 a 태그를 바깥으로 빼서 전체 영역을 감싸도록 수정 */}
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

      <section className="w-full border-t border-white/5 pt-8 md:pt-12 pb-16 md:pb-20 px-4 md:px-0">
        <h2 className="text-base md:text-lg font-bold text-gray-200 mb-6 md:mb-8 flex items-center gap-2">
          <span className="text-blue-500">GUIDE</span> 로아체크 이용 가이드
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">

          {/* 카드 1: 숙제 관리 (내 숙제 & 파티 숙제) */}
          <div className="bg-[#16181D] border border-white/5 p-5 md:p-6 rounded-2xl flex flex-col h-fit">
            <h3 className="text-sm md:text-base font-bold text-gray-100 mb-2">
              로아체크 숙제 관리 및 파티 동기화 시스템
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed mb-4">
              내 계정 연동부터 파티원과의 실시간 숙제 공유까지, 로아체크의 스마트한 스케줄 관리 기능을 확인해 보세요.
            </p>
            <details className="group mt-auto">
              <summary className="text-xs text-blue-400 hover:text-blue-300 font-bold cursor-pointer list-none [&::-webkit-details-marker]:hidden flex items-center gap-1 transition-colors w-fit">
                <span className="group-open:hidden">가이드 읽기</span>
                <span className="hidden group-open:inline">가이드 접기</span>
                <ChevronDown className="w-3 h-3 group-open:rotate-180 transition-transform" />
              </summary>
              <div className="pt-4 mt-4 border-t border-white/5 text-xs text-gray-500 leading-relaxed space-y-3">
                <p>
                  <strong className="text-gray-300">개인 숙제 연동 및 세팅:</strong> '내 계정 불러오기'를 통해 대표 캐릭터 닉네임만 입력하면 원정대 전체 정보를 한 번에 가져옵니다. 이후 자동 세팅 기능을 통해 주력 캐릭터의 레이드를 구성하고, 클릭 한 번으로 각 관문별 클리어 여부와 획득 골드를 직관적으로 체크할 수 있습니다. 입력된 데이터는 비로그인 시 내 PC(웹) 로컬 환경에 자동 저장되며, 로그인 시에는 클라우드 서버에 안전하게 저장되어 모바일 등 어디서든 연동됩니다.
                </p>
                <p>
                  <strong className="text-gray-300">파티 숙제 실시간 공유:</strong> 파티 숙제 메뉴에서는 생성된 공격대에 친구들을 초대하여 함께 일정을 관리할 수 있습니다. 레이드 관문을 클릭하면 골드와 남은 숙제 수가 파티원 전원에게 실시간으로 반영됩니다. 파티원별 수정 권한(수정 가능 여부 옵션)을 다르게 부여하여 관리의 안정성을 높일 수 있으며, 사이드바의 '모든 계정 통합 보기'나 레이드 필터링 같은 스마트 기능을 통해 다수 인원의 복잡한 스케줄도 한눈에 파악할 수 있습니다.
                </p>
              </div>
            </details>
          </div>

          {/* 카드 2: 딜 지분 (DPS 계산기) */}
          <div className="bg-[#16181D] border border-white/5 p-5 md:p-6 rounded-2xl flex flex-col h-fit">
            <h3 className="text-sm md:text-base font-bold text-gray-100 mb-2">
              로스트아크 딜 지분(DPS) 역산 분석기
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed mb-4">
              게임 내 MVP 화면의 피해량을 바탕으로, 보스의 전체 체력 대비 실질적인 딜 기여도를 디테일하게 점검할 수 있습니다.
            </p>
            <details className="group mt-auto">
              <summary className="text-xs text-[#FF5252] hover:text-[#ff7474] font-bold cursor-pointer list-none [&::-webkit-details-marker]:hidden flex items-center gap-1 transition-colors w-fit">
                <span className="group-open:hidden">가이드 읽기</span>
                <span className="hidden group-open:inline">가이드 접기</span>
                <ChevronDown className="w-3 h-3 group-open:rotate-180 transition-transform" />
              </summary>
              <div className="pt-4 mt-4 border-t border-white/5 text-xs text-gray-500 leading-relaxed space-y-3">
                <p>
                  로아체크의 딜 지분 계산기는 레이드 클리어 후 확인한 내 피해량(억 단위) 수치를 입력하여 퍼센트(%)를 역산하는 정밀 분석 도구입니다. 단순히 시스템이 부여하는 '투사', '강투', '잔혈' 칭호 확인에 그치지 않고, 내 캐릭터가 파티 내에서 정확히 어느 정도의 퍼포먼스를 내고 있는지 구체적인 지표로 확인할 수 있습니다.
                </p>
                <ul className="space-y-2 pl-2">
                  <li>
                    <strong className="text-gray-300">8인 레이드 (딜러 6명 기준):</strong> 1인분 평균 딜 지분은 약 16.6%로 산정됩니다. 15% 이상 달성 시 <span className="text-[#FF8585]">강직한 투사</span>, 20% 이상 달성 시 <span className="text-[#FF5252] font-bold">잔혹한 혈투사</span> 타이틀을 획득할 수 있습니다.
                  </li>
                  <li>
                    <strong className="text-gray-300">4인 레이드 (딜러 3명 기준):</strong> 1인분 평균 딜 지분은 약 33.3%로 크게 상승합니다. 30% 이상 달성 시 <span className="text-[#FF8585]">강직한 투사</span>, 40% 이상 달성 시 <span className="text-[#FF5252] font-bold">잔혹한 혈투사</span> 타이틀을 획득하게 됩니다.
                  </li>
                </ul>
              </div>
            </details>
          </div>

          {/* 카드 3: 젬 세팅 (아크 그리드) */}
          <div className="bg-[#16181D] border border-white/5 p-5 md:p-6 rounded-2xl flex flex-col h-fit">
            <h3 className="text-sm md:text-base font-bold text-gray-100 mb-2">
              아크 그리드 최적화 및 젬 세팅 가이드
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed mb-4">
              한정된 젬과 코어 포인트를 가장 효율적으로 분배하여 아크 그리드 시스템의 스펙업 성능을 극대화합니다.
            </p>
            <details className="group mt-auto">
              <summary className="text-xs text-[#5B69FF] hover:text-[#7f8aff] font-bold cursor-pointer list-none [&::-webkit-details-marker]:hidden flex items-center gap-1 transition-colors w-fit">
                <span className="group-open:hidden">가이드 읽기</span>
                <span className="hidden group-open:inline">가이드 접기</span>
                <ChevronDown className="w-3 h-3 group-open:rotate-180 transition-transform" />
              </summary>
              <div className="pt-4 mt-4 border-t border-white/5 text-xs text-gray-500 leading-relaxed space-y-3">
                <p>
                  아크 그리드 시스템은 로스트아크 캐릭터의 한계를 돌파하는 핵심 스펙업 콘텐츠입니다. 로아체크의 최적화 도구는 유저가 현재 보유하고 있는 젬(질서/혼돈)의 의지력 효율과 옵션을 바탕으로 수만 가지의 배치 조합을 연산하여, 가장 이상적인 코어 포인트와 스탯 세팅을 도출해냅니다.
                </p>
                <p className="font-bold text-gray-400 mt-2">💡 로아체크 최적화 옵션 활용 팁</p>
                <ul className="space-y-1.5 pl-2">
                  <li><strong className="text-gray-300">• 포인트 우선:</strong> 전투 스탯보다는 핵심 코어 활성화에 필요한 '최소 포인트'를 맞추는 데 모든 연산을 집중합니다.</li>
                  <li><strong className="text-gray-300">• 스탯 상위 (최대P):</strong> 현재 도달 가능한 가장 높은 코어 포인트를 유지하는 선에서, 전투 스탯(공격력/서포팅)이 가장 높게 산출되는 최적의 조합을 찾아냅니다.</li>
                  <li><strong className="text-gray-300">• 스탯 우선:</strong> 도달 코어 포인트보다 실질적으로 체감되는 스탯 상승 효율을 최우선 목표로 두고 계산을 수행합니다.</li>
                </ul>
              </div>
            </details>
          </div>

        </div>
      </section>
    </div>
  );
}