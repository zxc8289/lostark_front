import Card from "./components/Card";

export default async function HomePage() {
  // dev 기본값은 localhost:3000, 배포 시에는 ENV로 덮어쓰기
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const apiUrl = `${baseUrl}/api/lostark/notice`;

  console.log("[HomePage] fetch to:", apiUrl);

  let latestTitle = "공지 불러오기 실패";
  let latestUrl = "/notice";

  try {
    const res = await fetch(apiUrl, { cache: "no-store" });

    console.log("[HomePage] res.ok:", res.ok, "status:", res.status);

    if (!res.ok) {
      const text = await res.text();
      console.log("[HomePage] error body head:", text.slice(0, 300));
    } else {
      const json = await res.json();
      console.log("[HomePage] json:", json);

      latestTitle = json?.latest?.title ?? "데이터 없음";
      latestUrl = json?.latest?.link ?? "/notice";
    }
  } catch (e) {
    console.error("[HomePage] fetch error:", e);
  }


  return (
    <div className="space-y-8 pt-25 text-gray-300 w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="grid grid-cols-1 gap-6">
          <Card variant="elevated" headerBorder={false} interactive contentPadding="md" align="center">
            <div className="w-full flex items-center gap-2">
              <div className="min-w-0 flex items-baseline gap-2 sm:gap-3">
                <h3 className="font-semibold text-sm sm:text-base md:text-base">
                  로스트아크 공지사항
                </h3>
                <p
                  className="text-gray-400 truncate text-xs sm:text-xs md:text-xs"
                  title={latestTitle}
                >
                  {latestTitle}
                </p>
              </div>


              <a
                href={latestUrl}
                className="ml-auto shrink-0 text-gray-400 hover:text-gray-200 flex items-center gap-1 text-xs sm:text-sm md:text-sm"
              >
                더보기 <span aria-hidden>›</span>
              </a>
            </div>
          </Card>
          <Card
            variant="elevated"
            size="lg"
            contentPadding="lg"
            align="center"
            headerBorder={false}
            className="max-w-3xl"
          >
            <div className="grid grid-cols-[56px_1fr_auto] items-center gap-4 w-full">
              <div className="w-14 h-14 rounded-md bg-white/10 overflow-hidden" />
              <div className="grid grid-cols-1 gap-1">
                <h3 className="font-semibold text-sm sm:text-base md:text-base">나는 강투일까 투사일까?</h3>
                <p className="text-gray-400 text-xs sm:text-xs md:text-xs">
                  레이드에서 나의 딜 지분을 알아보세요.
                </p>
              </div>
              <a className="text-blue-400 hover:underline flex items-center gap-1 text-xs sm:text-sm md:text-sm" href="/dps">
                딜지분 계산기 <span>›</span>
              </a>
            </div>
          </Card>

          <Card
            variant="elevated"
            size="lg"
            contentPadding="lg"
            align="center"
            headerBorder={false}
            className="max-w-3xl"
          >
            <div className="grid grid-cols-[56px_1fr_auto] items-center gap-4 w-full">
              <div className="w-14 h-14 rounded-md bg-white/10 overflow-hidden" />
              <div className="grid grid-cols-1 gap-1">
                <h3 className="font-semibold text-sm sm:text-base md:text-base">코어별 젬 세팅 효율 계산기</h3>
                <p className="text-gray-400 text-xs sm:text-xs md:text-xs">
                  코어와 젬을 입력하고 효율적인 세팅을 확인해 보세요.
                </p>
              </div>
              <a className="text-blue-400 hover:underline flex items-center gap-1 text-xs sm:text-sm md:text-sm" href="/dps">
                젬 세팅하러 가기 <span>›</span>
              </a>
            </div>
          </Card>

          {/* 기능 카드 3 */}
          <Card
            variant="elevated"
            size="lg"
            contentPadding="lg"
            align="center"
            headerBorder={false}
            className="max-w-3xl"
          >
            <div className="grid grid-cols-[56px_1fr_auto] items-center gap-4 w-full">
              <div className="w-14 h-14 rounded-md bg-white/10 overflow-hidden" />
              <div className="grid grid-cols-1 gap-1">
                <h3 className="font-semibold text-sm sm:text-base md:text-base">재료 제작/구매 효율 계산기</h3>
                <p className="text-gray-400 text-xs sm:text-xs md:text-xs">
                  재료별로 제작과 구매 중 저렴한 방법을 확인해 보세요.
                </p>
              </div>
              <a className="text-blue-400 hover:underline flex items-center gap-1 text-xs sm:text-sm md:text-sm" href="/dps">
                제작 효율 계산 <span>›</span>
              </a>
            </div>
          </Card>
        </div>
        <div className="grid grid-cols-1 grid-rows-[1.5fr_1fr] gap-6">
          <Card
            children="" title={<span className="font-semibold text-sm sm:text-base md:text-base" >내 숙제 현황</span>}
            className="min-h-0"
          />
          <Card
            children="" title={<span className="font-semibold text-sm sm:text-base md:text-base">파티 숙제</span>}
            className="min-h-0"
          />
        </div>

        <div className="bg-[#16181D] md:col-span-2 p-5 h-40"></div>
      </div>
    </div>
  );
}