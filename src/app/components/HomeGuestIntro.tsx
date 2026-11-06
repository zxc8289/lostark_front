import Link from "next/link";

export default function HomeGuestIntro() {
  return <section className="flex flex-col gap-4 rounded-none border-y border-[var(--overlay-ink)]/5 bg-[var(--surface-16181d)] p-4 md:flex-row md:items-center md:justify-between md:rounded-2xl md:border md:p-6">
    <div>
      <h1 className="text-lg font-bold text-white md:text-xl">숙제 관리부터 골드 계산까지</h1>
      <p className="mt-2 text-sm leading-6 text-gray-400">로그인 없이 샘플 원정대로 숙제 관리와 파티 공유를 체험하세요.</p>
    </div>
    <div className="flex shrink-0 flex-wrap gap-2">
      <Link href="/my-tasks" className="rounded-lg bg-[#5B69FF] px-3 py-2 text-xs font-semibold text-white hover:bg-[#4957ed]">내 숙제 체험하기</Link>
      <Link href="/party-tasks" className="rounded-lg border border-[var(--overlay-ink)]/10 px-3 py-2 text-xs font-semibold text-gray-200 hover:bg-[var(--overlay-ink)]/5">파티 숙제 체험하기</Link>
    </div>
  </section>;
}
