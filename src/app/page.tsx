import Link from "next/link";
import Card from "./components/Card";
import { headers } from "next/headers";

export default async function HomePage() {

  const host = (await headers()).get("host");
  const origin = host?.startsWith("localhost")
    ? `http://${host}`
    : `https://${host}`;

  const res = await fetch(`${origin}/api/lostark/notice`, { cache: "no-store" }).catch(() => null);

  let latestTitle = "공지 불러오기 실패";
  if (res && res.ok) {
    const json = await res.json();
    latestTitle = json?.latest?.title ?? "데이터 없음";
  }

  return (
    <div className="space-y-8 py-12 text-gray-300 w-full">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        <div className="lg:col-span-6 space-y-8">
          <Card title="내 숙제 현황">
            <div className="h-60 w-full bg-[#22272e] rounded-md" />
          </Card>
          <Card title="파티 숙제">
            <div className="w-full h-36  flex justify-center">
              {/* <button className="bg-[#3882f6] text-white px-6 py-5 rounded-md text-sm font-semibold hover:bg-[#3275dc] transition-colors">
                로그인 후 이용하기
              </button> */}
            </div>
          </Card>
        </div>

        {/* 오른쪽 영역 */}
        <div className="lg:col-span-6 flex flex-col gap-6 h-full">
          <div className="flex items-center justify-between bg-[#2d333b] border border-[#444c56] rounded-lg p-4 text-xs">
            <p className="text-gray-300">
              <span className="font-bold text-white mr-2">로스트아크 공지사항</span>
              {latestTitle}
            </p>
            <button className="text-[#539bf5] hover:underline font-semibold text-sm">
              더보기
            </button>
          </div>

          <Card className="hover:border-gray-500 transition-colors flex-1">
            <div className="flex items-center gap-5 w-full">
              <div className="w-20 h-20 rounded bg-[#22272e] border border-[#444c56] flex-shrink-0" />
              <div className="flex-1">
                <div className="font-semibold text-gray-100 text-base">나는 강투일까 투사일까?</div>
                <div className="text-xs text-gray-400 mt-1">레이드에서 나의 딜 지분을 알아보세요.</div>
              </div>
              <Link href="/dps-share" className="text-sm text-[#539bf5] hover:underline whitespace-nowrap">
                딜지분 계산 &gt;
              </Link>
            </div>
          </Card>

          <Card className="hover:border-gray-500 transition-colors flex-1">
            <div className="flex items-center gap-5 w-full">
              <div className="w-20 h-20 rounded bg-[#22272e] border border-[#444c56] flex-shrink-0" />
              <div className="flex-1">
                <div className="font-semibold text-gray-100 text-base">코어별 젬 세팅 효율 계산기</div>
                <div className="text-xs text-gray-400 mt-1">코어별 효율적인 세팅을 확인해 보세요.</div>
              </div>
              <Link href="/gem-setup" className="text-sm text-[#539bf5] hover:underline whitespace-nowrap">
                젬 세팅하러 가기 &gt;
              </Link>
            </div>
          </Card>

          <Card className="hover:border-gray-500 transition-colors flex-1">
            <div className="flex items-center gap-5 w-full">
              <div className="w-20 h-20 rounded bg-[#22272e] border border-[#444c56] flex-shrink-0" />
              <div className="flex-1">
                <div className="font-semibold text-gray-100 text-base">재료 제작/구매 효율 계산기</div>
                <div className="text-xs text-gray-400 mt-1">재료를 제작과 구매 중 저렴한 방법을 확인해 보세요.</div>
              </div>
              <Link href="/crafting-efficiency" className="text-sm text-[#539bf5] hover:underline whitespace-nowrap">
                제작 효율 계산 &gt;
              </Link>
            </div>
          </Card>
        </div>
      </div>

      <div className="bg-[#2d333b] border border-[#444c56] rounded-lg text-center py-15 text-gray-500">
        광고
      </div>
    </div>
  );
}