import { ChevronRight, ExternalLink, Link } from "lucide-react";
import Card from "./components/Card";
import HomeMyTasksSummary, {
  HomeMyTasksHeader,
  HomeMyTasksDetails,
  HomeMyTasksGuard,
} from "./components/HomeMyTasksSummary";

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
    <div className="space-y-8 pt-20 pb-10 text-gray-300 w-full max-w-7xl mx-auto ">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <div className="space-y-6">
          <Card
            variant="elevated"
            headerBorder={false}
            interactive
            contentPadding="md"
            className="border border-white/5 bg-[#1e2128]/50 hover:border-blue-500/30 transition-all"
          >
            <div className="w-full flex items-center justify-between gap-4">
              <div className="min-w-0 flex items-center gap-3">
                <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
                <h3 className="font-bold text-sm text-gray-100 whitespace-nowrap">
                  로아 공지
                </h3>
                <p
                  className="text-gray-400 truncate text-xs border-l border-white/10 pl-3"
                  title={latestTitle}
                >
                  {latestTitle}
                </p>
              </div>
              <a
                href={latestUrl}
                className="shrink-0 text-[11px] text-gray-500 hover:text-blue-400 transition-colors"
              >
                더보기 ›
              </a>
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-6">
            {[
              {
                id: "A",
                title: "딜 지분 계산기",
                desc: "레이드 정밀 딜 지분 확인",
                href: "/dps-share",
                color: "blue",
              },
              {
                id: "G",
                title: "젬 세팅 효율",
                desc: "최적의 젬 조합 가이드",
                href: "/gem-setup",
                color: "blue",
              },
              {
                id: "M",
                title: "제작/구매 비교",
                desc: "안할듯? 아마도",
                href: "/market",
                color: "blue",
              },
            ].map((item) => (
              <Card
                key={item.id}
                variant="elevated"
                size="lg"
                contentPadding="lg"
                headerBorder={false}
                className="border border-white/5 bg-[#1e2128]/40 hover:bg-[#1e2128]/60 transition-all group"
              >
                <div className="flex items-center gap-5 w-full">
                  <div
                    className={`w-12 h-12 rounded-xl bg-${item.color}-600/10 border border-${item.color}-500/20 flex items-center justify-center group-hover:scale-105 transition-transform`}
                  >
                    <span className={`text-${item.color}-400 text-lg font-bold`}>
                      {item.id}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-100 group-hover:text-white transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-gray-400 text-xs mt-0.5">{item.desc}</p>
                  </div>
                  <a
                    className="bg-white/5 hover:bg-white/10 px-4 py-2 rounded-lg text-gray-300 text-xs font-medium transition-all"
                    href={item.href}
                  >
                    바로가기 ›
                  </a>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* [오른쪽 컬럼] 숙제 현황 및 파티 현황 */}
        <div className="space-y-6">
          <Card className="border border-white/5 bg-[#1e2128]/30 shadow-2xl relative overflow-hidden">
            <HomeMyTasksSummary>
              {/* 제목 + 요약은 항상 노출 */}
              <div className="w-full">
                <div className="w-full flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-4 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                    <span className="font-bold text-lg text-gray-100">내 숙제 현황</span>
                  </div>

                  <a href="/my-tasks" className="text-gray-400 hover:text-gray-200 transition-colors">
                    <ChevronRight size={20} />
                  </a>
                </div>


                <div className="w-full pt-5">
                  <HomeMyTasksHeader />
                </div>


                <HomeMyTasksGuard>
                  <details className="group w-full flex flex-col">
                    <summary className="order-2 mt-5 select-none list-none [&::-webkit-details-marker]:hidden
                      border-t border-white/5 w-full cursor-pointer flex items-center justify-center gap-2
                      px-5 py-3 text-[11px] font-bold text-gray-500 hover:text-gray-300 hover:bg-white/[0.03] transition-colors"
                    >
                      <span className="group-open:hidden">상세 보기</span>
                      <span className="hidden group-open:inline">접기</span>
                      <span className="transition-transform group-open:rotate-180">▾</span>
                    </summary>

                    <div className="order-1 pt-5">
                      <HomeMyTasksDetails />
                    </div>
                  </details>
                </HomeMyTasksGuard>

              </div>
            </HomeMyTasksSummary>
          </Card>



          <Card
            className="border border-white/5 bg-[#1e2128]/30 overflow-hidden"
            title={
              <div className="flex items-center gap-2 ">
                <div className="w-1 h-4 bg-emerald-500 rounded-full" />
                <span className="font-bold text-lg text-gray-100">파티 현황</span>
              </div>
            }
          >
            <div className="flex flex-col items-center justify-center">
              <p className="text-base text-white/30">
                아 <span className="text-[#1e2128]/30">일하기 싫다.</span>
              </p>
            </div>
          </Card>
        </div>
      </div>

      <div className="pt-8 border-t border-white/5 flex flex-col items-center">
        <p className="text-gray-600 text-[10px] tracking-[0.3em] uppercase font-bold">
          Arkrasia Utility System
        </p>
      </div>
    </div>
  );
}
