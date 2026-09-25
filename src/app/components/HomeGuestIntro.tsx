import Link from "next/link";

export default function HomeGuestIntro() {
  return <section className="rounded-none border-y border-white/5 bg-[#16181D] p-4 md:rounded-2xl md:border md:p-6">
    <div className="grid items-start gap-5 lg:grid-cols-[1.3fr_1fr]">
      <div className="space-y-4">
        <p className="text-xs font-medium text-[#A6AEFF]">로스트아크 숙제와 골드 계획</p>
        <h1 className="text-lg font-bold leading-snug text-white md:text-xl">숙제 관리부터 골드 계산까지</h1>
        <p className="max-w-xl text-sm leading-7 text-gray-400">캐릭터별 숙제와 파티 진행도를 관리하고, 경매·더보기·주간 보상을 계산하세요. 로그인 없이 샘플 원정대로 사용 흐름을 확인할 수 있습니다.</p>
        <div className="flex flex-wrap gap-3">
          <Link href="/my-tasks" className="rounded-lg bg-[#5B69FF] px-3 py-2 text-xs font-semibold text-white hover:bg-[#4957ed]">내 숙제 체험하기</Link>
          <Link href="/party-tasks" className="rounded-lg border border-white/5 px-3 py-2 text-xs font-semibold text-gray-200 hover:bg-white/5">파티 숙제 체험하기</Link>
        </div>
      </div>
      <div className="rounded-xl border border-white/5 bg-[#121318] p-4 text-[13px] text-gray-400">
        <h2 className="font-bold text-white">8인 경매, 얼마까지 입찰할까?</h2>
        <p className="mt-2 text-xs leading-6 text-gray-400">판매가 10,000 G · 수수료 5%의 계산 예시</p>
        <dl className="my-3 space-y-2">
          <div className="flex justify-between gap-3"><dt>판매 후 실수령액</dt><dd className="text-white">9,500 G</dd></div>
          <div className="flex justify-between gap-3"><dt>N빵 입찰가</dt><dd className="font-bold text-[#A6AEFF]">8,312 G</dd></div>
          <div className="flex justify-between gap-3"><dt>선점 입찰가</dt><dd className="text-white">7,556 G</dd></div>
        </dl>
        <Link href="/articles/auction-bid-guide" className="text-[#A6AEFF] hover:underline">왜 이 금액인지 계산 과정 읽기 →</Link>
      </div>
    </div>
    <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-white/5 pt-4 text-xs text-gray-400">
      <Link className="hover:underline" href="/articles/more-reward-efficiency">더보기, 귀속 재료도 이득일까?</Link>
      <Link className="hover:underline" href="/articles/weekly-raid-gold-guide">총보상과 실제 남는 골드의 차이</Link>
      <Link className="hover:underline" href="/articles">정보 글 전체 보기 →</Link>
    </div>
  </section>;
}
