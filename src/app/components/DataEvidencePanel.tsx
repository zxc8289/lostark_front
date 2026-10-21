import { raidInformation, type DifficultyKey } from "@/server/data/raids";
import { EVIDENCE_REVIEWED_AT, getRaidEvidence, officialSources } from "../lib/data-evidence";
import { RAID_DATA } from "../lib/calculators/dps-reference";
import { GuidePanel } from "./GuidePageLayout";

export default function DataEvidencePanel() {
  const raids = Object.entries(raidInformation).flatMap(([name, raid]) => Object.entries(raid.difficulty).map(([difficulty, data]) => ({ name, difficulty, data, evidence: getRaidEvidence(name, difficulty as DifficultyKey) })));
  return <GuidePanel id="verification" title="자료 출처와 레이드 보상표">
    <p>확인 기록 작성: <time dateTime={EVIDENCE_REVIEWED_AT}>2026. 10. 18</time>. 공식 가이드, 운영자의 인게임 확인 자료와 자체 계산 기준을 구분해 안내합니다. 이 날짜는 출처 설명을 정리한 날짜입니다.</p>
    <ul className="space-y-3">{Object.values(officialSources).map(source => <li key={source.href} className="rounded-lg border border-white/5 bg-[#121318] p-4"><a href={source.href} className="text-[#A6AEFF] hover:underline">{source.title} ↗</a><p className="mt-1 text-xs leading-6">{source.scope}</p></li>)}</ul>
    <p>카제로스 서막·1~4막·종막의 노말·하드 입장 레벨과 관문 수를 공식 가이드 표와 대조했습니다. 아래 표의 골드·재료·비용은 운영자가 인게임 보상을 직접 확인해 정리한 수치입니다. 정보 글과 계산기는 같은 보상표를 사용합니다.</p>
    <details className="rounded-lg border border-white/5 bg-[#121318]">
      <summary className="cursor-pointer px-4 py-3 text-gray-200">전체 레이드·난이도별 보상과 자료 출처 ({raids.length}개)</summary>
      <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-xs">
        <caption className="p-4 text-left text-gray-500">기본 보상 · 골드 수령 가능 여부, 무료 더보기와 할인은 별도 확인</caption>
        <thead className="bg-white/5 text-gray-200"><tr>{["레이드 / 난이도", "입장·관문", "거래 가능", "귀속", "더보기", "보상 출처"].map(h=><th className="px-4 py-3 font-medium" key={h}>{h}</th>)}</tr></thead>
        <tbody>{raids.map(({name,difficulty,data,evidence})=><tr className="border-t border-white/5" key={`${name}-${difficulty}`}><th scope="row" className="px-4 py-3 font-medium text-gray-300">{name} / {difficulty}</th><td className="px-4 py-3">{data.level} / {data.gates.length}관문<br />{evidence.rulesMatch ? "공식 규칙 대조" : "사이트 저장값"}</td><td className="px-4 py-3">{data.gold.toLocaleString("ko-KR")} G</td><td className="px-4 py-3">{data.boundGold.toLocaleString("ko-KR")} G</td><td className="px-4 py-3">{data.gates.reduce((sum,g)=>sum+g.bonusCost,0).toLocaleString("ko-KR")} G</td><td className="px-4 py-3">{evidence.rewardSource}</td></tr>)}</tbody>
      </table></div>
    </details>
    <details className="rounded-lg border border-white/5 bg-[#121318] p-4">
      <summary className="cursor-pointer text-gray-200">딜 지분 기준값은 어떻게 계산에 쓰이나요?</summary>
      <div className="mt-4 space-y-3"><p>예: 1막 하드 1관문의 저장 잔혈 기준은 {RAID_DATA.카제로스["1막"].하드[0].range[1]}억입니다. 이를 20%로 나눈 비교 총피해량은 {RAID_DATA.카제로스["1막"].하드[0].range[1] / 0.2}억입니다. 저장된 보스 체력 {RAID_DATA.카제로스["1막"].하드[0].hp}억을 분모로 쓰지 않습니다.</p><p>관문별 기준값과 계산 방식은 운영자가 직접 조사해 구성한 로아체크 자체 기준입니다. 입력한 피해량을 같은 기준으로 비교하는 도구이며, 실제 전투 로그를 불러오거나 게임의 MVP 판정을 재현하지는 않습니다.</p></div>
    </details>
    <p>보상 오류 제보에는 레이드·난이도·관문, 골드 지정 여부, 실제 보상 수량, 더보기 비용과 확인 날짜를 함께 남겨 주세요. 게임 업데이트로 달라진 항목은 확인한 내용과 수정 이력을 함께 반영합니다.</p>
  </GuidePanel>;
}
