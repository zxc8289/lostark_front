import { ChevronRight } from "lucide-react";
import Card from "./components/Card";
import HomeMyTasksSummary, {
  HomeMyTasksHeader,
  HomeMyTasksDetails,
  HomeMyTasksGuard,
} from "./components/HomeMyTasksSummary";
import HomePartySummaryProvider, {
  HomePartyGuard,
  HomePartyHeader,
  HomePartyDetails,
} from "./components/HomePartySummary";
import GoogleAd from "./components/GoogleAd";

export default async function HomePage() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const apiUrl = `${baseUrl}/api/lostark/notice`;

  let latestTitle = "공지 불러오기 실패";
  let latestUrl = "/notice";

  try {
    const res = await fetch(apiUrl, { cache: "no-store" });
    if (res.ok) {
      const json = await res.json();
      latestTitle = json?.latest?.title ?? "데이터 없음";
      latestUrl = json?.latest?.link ?? "/notice";
    }
  } catch (e) {
    console.error("[HomePage] fetch error:", e);
  }

  const AD_SLOT_MAIN_LEFT = "4951318932";
  const AD_SLOT_BOTTOM_BANNER = "7577482274";

  return (
    <div className="pt-10 md:pt-17 pb-10 text-gray-300 w-full max-w-7xl mx-auto space-y-8">

      {/* [상단 섹션] Grid 레이아웃 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 auto-rows-min">

        {/* 1. 로아 공지 (오른쪽 위 / 모바일 1번) */}
        <div className="order-1 lg:col-start-2 lg:row-start-1 h-full">
          <Card
            variant="elevated"
            headerBorder={false}
            interactive
            contentPadding="sm"
            className="border border-white/5 bg-[#1e2128]/50 hover:border-blue-500/30 transition-all w-full h-full"
          >
            <div className="w-full flex items-center justify-between gap-3 h-full">
              <div className="min-w-0 flex items-center gap-2">
                <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-blue-500" />
                <h3 className="font-bold text-sm text-gray-100 whitespace-nowrap">로아 공지</h3>
                <p className="text-gray-400 truncate text-xs border-l border-white/10 pl-3" title={latestTitle}>
                  {latestTitle}
                </p>
              </div>
              <a href={latestUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 text-[11px] text-gray-500 hover:text-blue-400 transition-colors">더보기 ›</a>
            </div>
          </Card>
        </div>

        {/* 2. 대형 광고 (PC: 왼쪽 전체 / 모바일: 공지 아래) */}
        <div className="order-2 lg:order-first lg:col-start-1 lg:row-start-1 lg:row-span-2 w-full relative">

          {/* [모바일용 전용 박스] 높이를 100px로 확실히 고정 */}
          <div className="block lg:hidden w-full h-[100px] bg-[#1e2128]/30 border border-white/5 rounded-lg overflow-hidden flex items-center justify-center">
            <GoogleAd
              slot={AD_SLOT_MAIN_LEFT}
              className="!my-0 w-full h-full"
              responsive={false}
            />
          </div>

          {/* [PC용 전용 박스] absolute inset-0로 우측 높이에 1:1 대응 */}
          <div className="hidden lg:flex absolute inset-0 w-full h-full bg-[#1e2128]/30 border border-white/5 rounded-lg overflow-hidden items-center justify-center">
            <GoogleAd slot={AD_SLOT_MAIN_LEFT} className="!my-0 w-full h-full" />
          </div>
        </div>

        {/* 3. 기능 버튼들 (오른쪽 아래 / 모바일 3번) */}
        <div className="order-3 lg:col-start-2 lg:row-start-2 h-full">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6 h-full">
            {[
              { id: "G", title: "젬 세팅", desc: "젬 조합 가이드", href: "/gem-setup" },
              { id: "A", title: "딜 지분", desc: "레이드 딜 지분 확인", href: "/dps-share" },
            ].map((item) => (
              <Card key={item.id} variant="elevated" size="lg" contentPadding="md" headerBorder={false} className="border border-white/5 bg-[#1e2128]/40 hover:bg-[#1e2128]/60 transition-all group w-full h-full">
                <div className="flex flex-row items-center justify-between gap-3 w-full h-full">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 shrink-0 rounded-lg bg-blue-600/10 border border-blue-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <span className="text-blue-400 text-base font-bold">{item.id}</span>
                    </div>
                    <div className="min-w-0 flex flex-col">
                      <h3 className="font-bold text-gray-100 text-sm group-hover:text-white transition-colors truncate">{item.title}</h3>
                      <p className="text-gray-400 text-[10px] mt-0.5 truncate">{item.desc}</p>
                    </div>
                  </div>
                  <a className="w-auto shrink-0 bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-md text-gray-300 text-[10px] font-medium transition-all" href={item.href}>바로가기</a>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>


      {/* [중단 섹션] 숙제 현황 + 파티 숙제 (기존 높이 유지) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

        {/* 4. 내 숙제 현황 */}
        <Card className="border border-white/5 bg-[#1e2128]/30 relative overflow-hidden w-full" contentPadding="lg">
          <HomeMyTasksSummary>
            <div className="w-full flex flex-col min-h-[340px]">
              <div className="w-full mb-auto">
                <div className="w-full flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-4 bg-blue-500 rounded-full" />
                    <span className="font-bold text-lg text-gray-100">내 숙제 현황</span>
                  </div>
                  <a href="/my-tasks" className="text-gray-400 hover:text-gray-200 transition-colors">
                    <ChevronRight size={20} />
                  </a>
                </div>
                <div className="w-full pt-4"><HomeMyTasksHeader /></div>
              </div>
              <HomeMyTasksGuard>
                <div className="w-full">
                  <details className="group w-full flex flex-col ">
                    <summary className="order-2 w-full select-none list-none [&::-webkit-details-marker]:hidden border-t border-white/5 cursor-pointer flex items-center justify-center gap-2 px-5 py-3 text-[11px] font-bold text-gray-500 hover:text-gray-300 hover:bg-white/[0.03] transition-colors rounded-lg">
                      <span className="group-open:hidden">상세 보기</span>
                      <span className="hidden group-open:inline">접기</span>
                      <span className="transition-transform group-open:rotate-180">▾</span>
                    </summary>
                    <div className="order-1 w-full pt-6 pb-4">
                      <HomeMyTasksDetails />
                    </div>
                  </details>
                </div>
              </HomeMyTasksGuard>
            </div>
          </HomeMyTasksSummary>
        </Card>

        {/* 5. 파티 숙제 */}
        <Card className="border border-white/5 bg-[#1e2128]/30 relative overflow-hidden w-full" contentPadding="lg">
          <HomePartySummaryProvider>
            <div className="w-full flex flex-col min-h-[340px]">
              <div className="w-full flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-4 bg-blue-500 rounded-full" />
                  <span className="font-bold text-lg text-gray-100">내 참여 파티</span>
                </div>
                <a href="/party-tasks" className="text-gray-400 hover:text-gray-200 transition-colors">
                  <ChevronRight size={20} />
                </a>
              </div>
              <HomePartyGuard>
                <div className="w-full mb-auto"><HomePartyHeader /></div>
                <div className="w-full">
                  <details className="group w-full flex flex-col">
                    <summary className="order-2 w-full select-none list-none [&::-webkit-details-marker]:hidden border-t border-white/5 cursor-pointer flex items-center justify-center gap-2 px-5 py-3 text-[11px] font-bold text-gray-500 hover:text-gray-300 hover:bg-white/[0.03] transition-colors rounded-lg">
                      <span className="group-open:hidden">상세 보기</span>
                      <span className="hidden group-open:inline">접기</span>
                      <span className="transition-transform group-open:rotate-180">▾</span>
                    </summary>
                    <div className="order-1 w-full pt-6 pb-4"><HomePartyDetails /></div>
                  </details>
                </div>
              </HomePartyGuard>
            </div>
          </HomePartySummaryProvider>
        </Card>
      </div>

      <div className="w-full">
        <div
          className="w-full bg-[#1e2128]/30 border border-white/5 rounded-lg overflow-hidden flex items-center justify-center"
          style={{ height: '130px', minHeight: '130px', maxHeight: '130px' }}
        >
          <GoogleAd
            slot={AD_SLOT_BOTTOM_BANNER}
            className="!my-0 w-full h-full"
            responsive={false}
          />
        </div>
      </div>
    </div>
  );
}