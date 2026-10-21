import { raidInformation, type DifficultyKey } from "@/server/data/raids";

export const EVIDENCE_REVIEWED_AT = "2026-10-18";
export const officialSources = {
  raids: { title: "공식 카제로스 레이드 가이드", href: "https://lostark.game.onstove.com/GameGuide/Pages/카제로스%20레이드", scope: "노말·하드 입장 레벨, 관문 수, 관문 저장 규칙. 관문별 골드·재료 수량의 근거는 아닙니다." },
  gold: { title: "공식 콘텐츠 현황·골드 획득 규칙", href: "https://lostark.game.onstove.com/GameGuide/Pages/콘텐츠%20현황%20확인", scope: "골드 획득 캐릭터 지정, 엔드 콘텐츠 보상 횟수와 관문 진행 규칙. 개별 레이드 보상 금액은 운영자가 인게임에서 직접 확인해 정리합니다." },
  gems: { title: "공식 보석 가이드", href: "https://lostark.game.onstove.com/GameGuide/Pages/보석", scope: "동일 레벨 보석 3개 합성, 무작위 결과와 T4 사용 조건. 경매장 가격이나 타입별 확률을 검증하는 자료는 아닙니다." },
} as const;

// 2026-10-18에 공식 가이드의 표에서 대조한 범위만 기록합니다.
// 골드·재료 수량, 싱글·익스트림은 이 기록으로 검증한 것으로 취급하지 않습니다.
const officialRaidRules: Record<string, { gates: number; levels: Partial<Record<DifficultyKey, number>> }> = {
  "서막-에키드나": { gates: 2, levels: { 노말: 1620, 하드: 1640 } },
  "1막-에기르": { gates: 2, levels: { 노말: 1660, 하드: 1680 } },
  "2막-아브렐슈드": { gates: 2, levels: { 노말: 1670, 하드: 1690 } },
  "3막-모르둠": { gates: 3, levels: { 노말: 1680, 하드: 1700 } },
  "4막-아르모체": { gates: 2, levels: { 노말: 1700, 하드: 1720 } },
  "종막-카제로스": { gates: 2, levels: { 노말: 1710, 하드: 1730 } },
};

export function getRaidEvidence(raid: string, difficulty: DifficultyKey) {
  const data = raidInformation[raid]?.difficulty[difficulty];
  const reference = officialRaidRules[raid];
  const expectedLevel = reference?.levels[difficulty];
  const rulesMatch = !!data && expectedLevel !== undefined && data.level === expectedLevel && data.gates.length === reference.gates;
  return {
    rulesMatch,
    rulesCheckedAt: rulesMatch ? EVIDENCE_REVIEWED_AT : null,
    rewardSource: "운영자 인게임 직접 확인",
    provenanceConfirmedAt: EVIDENCE_REVIEWED_AT,
    ruleSource: expectedLevel !== undefined ? officialSources.raids : null,
  };
}
