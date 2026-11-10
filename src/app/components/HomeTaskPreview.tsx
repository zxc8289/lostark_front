import Link from "next/link";
import { ChevronRight, User, Users } from "lucide-react";
import HomeTaskMetrics from "./HomeTaskMetrics";

export default function HomeTaskPreview({ party = false }: { party?: boolean }) {
  return <div className="w-full space-y-4">
    <p className="text-[11px] font-semibold text-gray-500">미리보기 · 예시 데이터</p>
    {party ? <Link href="/party-tasks/demo" className="group block min-h-[225px] rounded-xl border border-[var(--overlay-ink)]/10 bg-[var(--surface-16181d)] p-5 transition-colors hover:border-[#5B69FF]/50">
      <div className="flex items-center gap-3.5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--overlay-ink)]/5 bg-[var(--surface-1f222b)] text-[#5B69FF]"><Users size={22} aria-hidden="true" /></div>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-bold text-gray-100">예시 파티</h3>
          <p className="text-sm font-medium text-gray-500">멤버 4명</p>
        </div>
        <ChevronRight size={20} className="shrink-0 text-gray-500" aria-hidden="true" />
      </div>
      <div className="mt-4 border-t border-[var(--overlay-ink)]/5 pt-3">
        <p className="mb-3 flex items-center gap-1.5 text-xs font-medium text-gray-400"><User size={14} aria-hidden="true" />참여 멤버</p>
        <div className="flex -space-x-2.5" aria-label="예시 파티원 4명">
          {["가", "나", "다", "라"].map(name => <span key={name} aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface-1f222b)] text-xs font-bold text-[#5B69FF] ring-2 ring-[var(--surface-16181d)]">{name}</span>)}
        </div>
      </div>
    </Link> : <>
      <div className="rounded-xl border border-[var(--overlay-ink)]/5 bg-[var(--surface-16181d)] px-4 py-3.5">
        <p className="text-[10px] font-bold text-gray-400">현재 계정 · 예시</p>
        <p className="text-sm font-bold text-gray-100">예시 원정대</p>
      </div>
      <HomeTaskMetrics progress={50} remainingGold={50000} remainingBoundGold={10000} remainingTasks={6} />
    </>}
    <p className="text-[11px] leading-5 text-gray-400">실제 기록이 아닌 예시입니다. 로그인 없이 샘플 데이터로 체험할 수 있어요.</p>
    <Link className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--overlay-ink)]/5 bg-[var(--surface-131519)] px-3 py-3 text-xs font-bold text-gray-500 transition-colors hover:text-[#5B69FF]" href={party ? "/party-tasks/demo" : "/my-tasks"}>
      {party ? "파티 숙제 체험하기" : "내 숙제 체험하기"}<ChevronRight size={14} aria-hidden="true" />
    </Link>
  </div>;
}
