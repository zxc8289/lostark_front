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

  return (
    <div className="space-y-8 pt-17 pb-10 text-gray-300 w-full max-w-7xl mx-auto px-4 md:px-0">

      {/* [첫 번째 줄] 로아 공지 - 가로 꽉 채움 */}
      <div className="w-full">
        <Card
          variant="elevated"
          headerBorder={false}
          interactive
          contentPadding="md"
          className="border border-white/5 bg-[#1e2128]/50 hover:border-blue-500/30 transition-all w-full"
        >
          <div className="w-full flex items-center justify-between gap-4">
            <div className="min-w-0 flex items-center gap-3">
              <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
              <h3 className="font-bold text-sm text-gray-100 whitespace-nowrap">로아 공지</h3>
              <p className="text-gray-400 truncate text-xs border-l border-white/10 pl-3" title={latestTitle}>
                {latestTitle}
              </p>
            </div>
            <a href={latestUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 text-[11px] text-gray-500 hover:text-blue-400 transition-colors">더보기 ›</a>
          </div>
        </Card>
      </div>

      {/* [두 번째 줄] 기능 카드 3개 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
        {[
          { id: "A", title: "딜 지분 계산기", desc: "레이드 정밀 딜 지분 확인", href: "/dps-share" },
          { id: "G", title: "젬 세팅 효율", desc: "최적의 젬 조합 가이드", href: "/gem-setup" },
          { id: "M", title: "제작/구매 비교", desc: "시장 데이터 비교 분석", href: "/market" },
        ].map((item) => (
          <Card key={item.id} variant="elevated" size="lg" contentPadding="lg" headerBorder={false} className="border border-white/5 bg-[#1e2128]/40 hover:bg-[#1e2128]/60 transition-all group w-full">
            <div className="flex items-center justify-between gap-4 w-full">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-12 h-12 shrink-0 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <span className="text-blue-400 text-lg font-bold">{item.id}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-100 group-hover:text-white transition-colors truncate">{item.title}</h3>
                  <p className="text-gray-400 text-xs mt-0.5 truncate">{item.desc}</p>
                </div>
              </div>
              <a className="shrink-0 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-lg text-gray-300 text-xs font-medium transition-all" href={item.href}>바로가기 ›</a>
            </div>
          </Card>
        ))}
      </div>

      {/* [세 번째 줄] 하단 현황 카드 - 세로 높이 축소 버전 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start w-full">

        {/* 내 숙제 현황 */}
        <Card className="border border-white/5 bg-[#1e2128]/30 shadow-2xl relative overflow-hidden w-full" contentPadding="lg">
          <HomeMyTasksSummary>
            {/* min-h를 383px에서 320px로 축소 */}
            <div className="w-full flex flex-col min-h-[340px]">
              <div className="w-full mb-auto">
                <div className="w-full flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-4 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                    <span className="font-bold text-lg text-gray-100">내 숙제 현황</span>
                  </div>
                  <a href="/my-tasks" className="text-gray-400 hover:text-gray-200 transition-colors">
                    <ChevronRight size={20} />
                  </a>
                </div>
                {/* 상단 여백을 pt-5에서 pt-4로 살짝 줄임 */}
                <div className="w-full pt-4"><HomeMyTasksHeader /></div>
              </div>

              <HomeMyTasksGuard>
                <div className="w-full mt-2"> {/* mt-4에서 mt-2로 줄여 간격 밀착 */}
                  <details className="group w-full flex flex-col">
                    <summary className="order-2 w-full select-none list-none [&::-webkit-details-marker]:hidden border-t border-white/5 cursor-pointer flex items-center justify-center gap-2 px-5 py-3 text-[11px] font-bold text-gray-500 hover:text-gray-300 hover:bg-white/[0.03] transition-colors rounded-lg">
                      <span className="group-open:hidden">상세 보기</span>
                      <span className="hidden group-open:inline">접기</span>
                      <span className="transition-transform group-open:rotate-180">▾</span>
                    </summary>
                    <div className="order-1 w-full pt-4"><HomeMyTasksDetails /></div>
                  </details>
                </div>
              </HomeMyTasksGuard>
            </div>
          </HomeMyTasksSummary>
        </Card>

        {/* 내 참여 파티 */}
        <Card className="border border-white/5 bg-[#1e2128]/30 shadow-2xl relative overflow-hidden w-full" contentPadding="lg">
          <HomePartySummaryProvider>
            {/* min-h를 383px에서 320px로 축소 */}
            <div className="w-full flex flex-col min-h-[340px]">
              <div className="w-full mb-auto">
                <div className="w-full flex items-center justify-between gap-3 mb-4"> {/* mb-6에서 mb-4로 축소 */}
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-4 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                    <span className="font-bold text-lg text-gray-100">내 참여 파티</span>
                  </div>
                  <a href="/party-tasks" className="text-gray-400 hover:text-gray-200 transition-colors">
                    <ChevronRight size={20} />
                  </a>
                </div>
                <HomePartyGuard><HomePartyHeader /></HomePartyGuard>
              </div>

              <HomePartyGuard>
                <div className="w-full mt-2"> {/* mt-4에서 mt-2로 줄여 간격 밀착 */}
                  <details className="group w-full flex flex-col">
                    <summary className="order-2 w-full select-none list-none [&::-webkit-details-marker]:hidden border-t border-white/5 cursor-pointer flex items-center justify-center gap-2 px-5 py-3 text-[11px] font-bold text-gray-500 hover:text-gray-300 hover:bg-white/[0.03] transition-colors rounded-lg">
                      <span className="group-open:hidden">상세 보기</span>
                      <span className="hidden group-open:inline">접기</span>
                      <span className="transition-transform group-open:rotate-180">▾</span>
                    </summary>
                    <div className="order-1 w-full pt-4"><HomePartyDetails /></div>
                  </details>
                </div>
              </HomePartyGuard>
            </div>
          </HomePartySummaryProvider>
        </Card>
      </div>

      <div className="pt-8 border-t border-white/5 flex flex-col items-center w-full">
        <p className="text-gray-600 text-[10px] tracking-[0.3em] uppercase font-bold">Arkrasia Utility System</p>
      </div>
    </div>
  );
}