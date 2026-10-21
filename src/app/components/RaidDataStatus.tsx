import Link from "next/link";
import { getRaidEvidence } from "../lib/data-evidence";
import type { DifficultyKey } from "@/server/data/raids";

export default function RaidDataStatus({ raid, difficulty }: { raid: string; difficulty: DifficultyKey }) {
  const evidence = getRaidEvidence(raid, difficulty);
  return <aside aria-label="선택한 레이드 자료 상태" className="rounded-none border-y border-white/5 bg-[#16181D] px-5 py-4 text-xs leading-6 text-gray-400 sm:rounded-xl sm:border">
    <p className="font-medium text-gray-200">{raid} · {difficulty} 자료 기준</p>
    <p>{evidence.rulesMatch ? `입장 레벨·관문 수: 공식 가이드 대조 ${evidence.rulesCheckedAt}` : "입장 레벨·관문 수: 사이트 저장값"}</p>
    <p>골드·재료·더보기 비용: 운영자가 인게임 보상을 직접 확인해 정리한 값</p>
    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[#A6AEFF]">
      {evidence.ruleSource && <a href={evidence.ruleSource.href} className="hover:underline">입장 조건 공식 근거 ↗</a>}
      <Link href="/guide/data#verification" className="hover:underline">데이터 출처와 보상표 →</Link>
    </div>
  </aside>;
}
