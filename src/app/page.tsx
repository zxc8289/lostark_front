import { ChevronRight, ChevronDown, ExternalLink, Megaphone, Diamond, Calculator, ArrowUpRight } from "lucide-react";
import Card from "./components/Card";
import HomeMyTasksSummary, { HomeMyTasksHeader, HomeMyTasksDetails, HomeMyTasksGuard } from "./components/HomeMyTasksSummary";
import HomePartySummaryProvider, { HomePartyGuard, HomePartyHeader, HomePartyDetails } from "./components/HomePartySummary";
import GoogleAd from "./components/GoogleAd";
import TodaySchedule from "./components/TodaySchedule";

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
  const AD_SLOT_BOTTOM_BANNER = "7577482274";
  const AD_SLOT_MAIN_LEFT = "6052642414";

  // ✨ 스타일 공통화: 펼치기/접기 버튼 스타일
  const toggleBtnClass = "order-2 w-full list-none [&::-webkit-details-marker]:hidden cursor-pointer flex items-center justify-center gap-2 py-3 rounded-xl bg-[#131519] border border-white/5 hover:bg-[#1A1D24] hover:border-white/10 hover:text-gray-200 transition-all text-xs font-bold text-gray-500 mt-4";

  return (
    <div className="pt-10 md:pt-17 pb-10 text-gray-300 w-full max-w-7xl mx-auto space-y-8">

      {/* 🟦 [1. 최상단 섹션] 캘린더 (70%) + 광고 (30%) */}
      <section className="w-full grid grid-cols-1 lg:grid-cols-10 gap-6">
        <div className="lg:col-span-7 w-full bg-[#16181D] border border-white/5 rounded-2xl p-6 relative overflow-hidden flex flex-col justify-center">
          <TodaySchedule />
        </div>

        <div className="lg:col-span-3 w-full h-full min-h-[180px] bg-[#16181D] border border-white/5 rounded-2xl overflow-hidden flex items-center justify-center relative">
          <div className="absolute inset-0 flex items-center justify-center text-gray-700 text-xs z-0">AD Area</div>
          <div className="relative z-10 w-full h-full">
            <GoogleAd slot={AD_SLOT_MAIN_TOP_RIGHT} className="!my-0 w-full h-full" />
          </div>
        </div>
      </section>


      {/* 🟦 [2. 메인 컨텐츠] */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">

        {/* 👈 왼쪽 컬럼 (공지사항 & 사이드 광고) */}
        <div className="lg:col-span-3 flex flex-col gap-6 h-full">

          {/* 1. 공지사항 */}
          <div className="bg-[#16181D] border border-white/5 rounded-xl overflow-hidden flex flex-col shrink-0">
            <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between bg-[#16181D]">
              <span className="text-base font-bold text-gray-200 flex items-center gap-2">
                <Megaphone size={18} className="text-gray-400" />
                공지사항
              </span>
              <a href="https://lostark.game.onstove.com/News/Notice/List" target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-gray-500 hover:text-blue-400 flex items-center gap-1 transition-colors px-2 py-1 rounded hover:bg-white/5">
                전체보기 <ExternalLink size={12} />
              </a>
            </div>

            <div className="max-h-[148px] overflow-y-auto custom-scrollbar">
              <ul className="divide-y divide-white/5">
                {notices.map((notice, idx) => (
                  <li key={idx}>
                    <a href={notice.link} target="_blank" rel="noopener noreferrer" className="block px-5 py-3.5 hover:bg-white/5 transition-colors group">
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

          {/* 2. 사이드 광고 */}
          <div className="w-full flex-1 bg-[#16181D] border border-white/5 rounded-xl overflow-hidden flex items-center justify-center relative min-h-[300px]">
            <div className="absolute inset-0 flex items-center justify-center text-gray-700 text-xs z-0">AD Area</div>
            <div className="relative z-10 w-full h-full">
              <GoogleAd slot={AD_SLOT_MAIN_LEFT} className="!my-0 w-full h-full" />
            </div>
          </div>

        </div>

        {/* 👉 오른쪽 컬럼 (내 숙제 / 파티 숙제 / 추가 컨텐츠) */}
        <div className="lg:col-span-7 flex flex-col gap-6 h-full">

          {/* 🟧 1행: 숙제 & 파티 (가로 2단 배치) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full items-start">

            {/* 내 숙제 현황 */}
            <Card className="border border-white/5 bg-[#16181D] w-full flex flex-col" contentPadding="lg">
              <HomeMyTasksSummary>
                <div className="w-full flex flex-col min-h-[340px]">
                  <div className="w-full mb-auto">
                    <div className="w-full flex items-center justify-between gap-3 mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-6 bg-blue-500 rounded-r-md" />
                        <span className="font-bold text-xl text-gray-100">내 숙제 현황</span>
                      </div>
                      <a href="/my-tasks" className="text-gray-400 hover:text-gray-200 transition-colors">
                        <ChevronRight size={20} />
                      </a>
                    </div>
                    <div className="w-full pt-2"><HomeMyTasksHeader /></div>
                  </div>
                  <HomeMyTasksGuard>
                    <div className="w-full">
                      <details className="group w-full flex flex-col">
                        <summary className={toggleBtnClass}>
                          <span className="group-open:hidden">상세 내용 펼치기</span>
                          <span className="hidden group-open:inline">접기</span>
                          <ChevronDown className="w-3 h-3 transition-transform group-open:rotate-180" />
                        </summary>
                        <div className="order-1 w-full pt-4 pb-2"><HomeMyTasksDetails /></div>
                      </details>
                    </div>
                  </HomeMyTasksGuard>
                </div>
              </HomeMyTasksSummary>
            </Card>

            {/* 파티 숙제 */}
            <Card className="border border-white/5 bg-[#16181D] w-full flex flex-col" contentPadding="lg">
              <HomePartySummaryProvider>
                <div className="w-full flex flex-col min-h-[340px]">
                  <div className="w-full flex items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-6 bg-blue-500 rounded-r-md" />
                      <span className="font-bold text-xl text-gray-100">내 참여 파티</span>
                    </div>
                    <a href="/party-tasks" className="text-gray-400 hover:text-gray-200 transition-colors">
                      <ChevronRight size={20} />
                    </a>
                  </div>
                  <HomePartyGuard>
                    <div className="w-full mb-auto pt-2"><HomePartyHeader /></div>
                    <div className="w-full">
                      <details className="group w-full flex flex-col">
                        <summary className={toggleBtnClass}>
                          <span className="group-open:hidden ">상세 내용 펼치기</span>
                          <span className="hidden group-open:inline">접기</span>
                          <ChevronDown className="w-3 h-3 transition-transform group-open:rotate-180" />
                        </summary>
                        <div className="order-1 w-full pt-4 pb-2"><HomePartyDetails /></div>
                      </details>
                    </div>
                  </HomePartyGuard>
                </div>
              </HomePartySummaryProvider>
            </Card>
          </div>

          {/* 🟧 2행: 도구 모음 (젬 세팅 / 딜 지분) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">

            {/* 1. 젬 세팅 도구 */}
            <a href="/gem-setup" className="group relative w-full bg-[#16181D] border border-white/5 rounded-xl p-5 flex items-center justify-between hover:border-[#5B69FF]/50 transition-all duration-300 overflow-hidden">
              <div className="flex items-center gap-4 z-10">
                <div className="w-12 h-12 rounded-lg bg-[#1F222B] flex items-center justify-center text-[#5B69FF] group-hover:bg-[#5B69FF] group-hover:text-white transition-colors border border-white/5">
                  <Diamond size={24} />
                </div>
                <div className="flex flex-col">
                  <h3 className="text-lg font-bold text-gray-100 group-hover:text-white transition-colors">젬 세팅 최적화</h3>
                  <p className="text-sm text-gray-500 group-hover:text-gray-400 transition-colors">보유한 젬으로 최적의 효율 찾기</p>
                </div>
              </div>
              <div className="text-gray-400 hover:text-gray-200 transition-colors">
                <ChevronRight size={20} />
              </div>
              {/* 배경 효과 */}
              <div className="absolute top-0 right-0 w-32 h-full bg-gradient-to-l from-[#5B69FF]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>

            {/* 2. 딜 지분 계산기 */}
            <a href="/dps-share" className="group relative w-full bg-[#16181D] border border-white/5 rounded-xl p-5 flex items-center justify-between hover:border-[#FF5252]/50 transition-all duration-300 overflow-hidden">
              <div className="flex items-center gap-4 z-10">
                <div className="w-12 h-12 rounded-lg bg-[#1F222B] flex items-center justify-center text-[#FF5252] group-hover:bg-[#FF5252] group-hover:text-white transition-colors border border-white/5">
                  <Calculator size={24} />
                </div>
                <div className="flex flex-col">
                  <h3 className="text-lg font-bold text-gray-100 group-hover:text-white transition-colors">딜 지분 계산기</h3>
                  <p className="text-sm text-gray-500 group-hover:text-gray-400 transition-colors">강투/잔혈 달성 여부 확인하기</p>
                </div>
              </div>
              <div className="text-gray-400 hover:text-gray-200 transition-colors">
                <ChevronRight size={20} />
              </div>
              {/* 배경 효과 */}
              <div className="absolute top-0 right-0 w-32 h-full bg-gradient-to-l from-[#FF5252]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>

          </div>

        </div>

      </div>

      {/* 하단 배너 광고 */}
      <div className="w-full bg-[#16181D] border border-white/5 rounded-xl overflow-hidden flex items-center justify-center h-[140px]">
        <GoogleAd slot={AD_SLOT_BOTTOM_BANNER} className="!my-0 w-full h-full" responsive={false} />
      </div>

      <section className="w-full border-t border-white/5 pt-12 px-4 pb-20">
        <h2 className="text-lg font-bold text-gray-200 mb-8 flex items-center gap-2">
          <span className="text-blue-500">GUIDE</span> 로아체크 이용 가이드
        </h2>

        {/* 3단 그리드 레이아웃 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-bold text-gray-100">
              로아체크의 숙제 관리 기능은 어떻게 사용하나요?
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              로아체크(Loacheck)에 접속하여 캐릭터 닉네임을 등록하면, 로스트아크 공식 API를 통해 자동으로 캐릭터 정보를 불러옵니다.
              매일 오전 6시에 초기화되는 주간 숙제(군단장 레이드, 카제로스 레이드, 어비스 던전, 그림자 레이드)를 선택하여,
              '내 숙제' 메뉴에서 체크박스를 클릭하여 완료 여부를 저장할 수 있습니다.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-bold text-gray-100">
              공격대 파티원들과 숙제를 공유할 수 있나요?
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              네, 가능합니다. '파티 숙제' 메뉴에서 공격대를 생성하고 친구들을 초대해보세요.
              그다음 파티원들의 캐릭터 정보를 불러와 목표 레이드를 설정하면,
              이번 주 주요 레이드(카멘, 에키드나, 카제로스 등)의 숙제 완료 여부를 표나 카드 형태로 한눈에 비교하고 관리할 수 있습니다.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-bold text-gray-100">
              딜 지분 분석과 젬 세팅은 무엇인가요?
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              레이드 딜 지분 기능은 딜러 유저들이 자신의 데미지 비중을 확인하여,
              <span className="text-gray-300 font-bold"> 강직한 투사(강투)</span> 혹은 <span className="text-gray-300 font-bold">잔혹한 혈투사(잔혈)</span> 달성 여부를 간편하게 판별할 수 있는 도구입니다.
              또한 젬 세팅 기능은 보유 중인 젬을 기반으로 의지력을 정밀하게 계산하여 최적의 코어 포인트 구간을 찾아내며, 효율적인 스펙업을 돕습니다.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}