import { raidInformation } from "@/server/data/raids";
import type { ArticleContent } from "../components/EditorialArticle";

type Section = ArticleContent["sections"][number];
const gold = (value: number) => `${value.toLocaleString("ko-KR")} G`;
export const exampleRaids = ["1막-에기르", "2막-아브렐슈드", "3막-모르둠"] as const;
const aegir = raidInformation["1막-에기르"].difficulty.노말!;
export const raidExampleNote = "보상과 비용은 운영자가 인게임에서 직접 확인해 정리한 보상표를 사용하며, 로아체크 계산기와 같은 데이터입니다. 예시 단가는 설명을 위한 가정이며 실시간 시세가 아닙니다.";

// 분량을 늘리기 위한 가상 A/B 재료 대신 실제 계산기와 같은 보상표를 읽습니다.
// 단가는 가정값으로 명시하며, 누락된 재료를 0원 시세로 간주하지 않습니다.
export const exampleUnitPrices: Record<string, number> = {
  "운명의 파괴석": 2,
  "운명의 수호석": 0.3,
  "운명의 돌파석": 4,
  "운명의 파편": 0.1,
};
export function parseExampleRewards(text: string) {
  return text.split(",").flatMap((part) => {
    const match = part.trim().match(/^(.+?)\s*(\d+)[개個]$/);
    return match ? [{ name: match[1].trim(), count: Number(match[2]) }] : [];
  });
}
export function exampleValue(text: string, excluded: string[] = []) {
  return parseExampleRewards(text).reduce((sum, item) => sum + (excluded.includes(item.name) ? 0 : (exampleUnitPrices[item.name] ?? 0) * item.count), 0);
}
const firstGate = aegir.gates[0];

export const moreRewardSections: Section[] = [
  { title: "에기르 노말: 무엇을 비교하는가", paragraphs: [raidExampleNote, "에기르 노말을 선택하고 상위 재료 환산을 끈 상태를 기준으로 합니다. 클리어 보상은 더보기를 누르지 않아도 받으므로, 추가 비용과 추가 재료만 비교합니다. 거래 불가능한 성장 재료를 판매 수익으로 더하지 않습니다."], table: { caption: "에기르 노말 관문별 보상 · 운영자 인게임 직접 확인", headers: ["관문", "거래 가능 골드", "귀속 골드", "더보기 비용"], rows: aegir.gates.map(g => [g.name, gold(g.gold), gold(g.boundGold), gold(g.bonusCost)]) } },
  { title: "1관문 재료를 개당 단가로 계산하기", paragraphs: ["계산을 재현하기 위해 파괴석 2 G, 수호석 0.3 G, 돌파석 4 G, 파편 0.1 G를 개당 단가로 가정합니다. 실제 판단에는 계산기의 조회 시각과 최신 단가를 사용하세요. API의 묶음 가격은 묶음 수량으로 나눈 값과 비교해야 합니다.", "업화의 쐐기돌은 가격 평가에서 제외합니다. 필요 없는 재료가 아니라 거래소 구매 대체액을 정하지 않은 재료입니다. 장비 제작이 목표라면 필요한 수량을 따로 판단하세요."], formula: "추가 재료의 구매 대체 가치 = Σ(더보기 수량 × 개당 단가)\n평가 차액 = 구매 대체 가치 − 더보기 비용", table: { caption: "사이트 보상 수량 × 설명용 개당 단가 · 환산 없음", headers: ["재료", "추가 수량", "가정한 개당 단가", "평가 가치"], rows: parseExampleRewards(firstGate.bonusRewards).map(item => [item.name, `${item.count.toLocaleString("ko-KR")}개`, exampleUnitPrices[item.name] !== undefined ? gold(exampleUnitPrices[item.name]) : "가격 평가 제외", exampleUnitPrices[item.name] !== undefined ? gold(item.count * exampleUnitPrices[item.name]) : "별도 판단"]) } },
  { title: "성장 중인 캐릭터와 주차 캐릭터의 선택", paragraphs: ["성장 중이라 모든 일반 재료를 곧 구매할 캐릭터와, 파편이 충분한 캐릭터는 같은 보상도 다르게 평가해야 합니다. 아래는 가격을 바꾸지 않고 필요한 재료만 바꾼 비교입니다.", "모든 일반 재료를 쓰지 않을 주차 캐릭터는 구매를 대신하는 가치가 0입니다. 다만 장비 제작용 쐐기돌이 필요하다면 이 표의 골드 차액만으로 더보기를 결정할 수 없습니다. 플러스 차액은 지갑에 들어오는 골드가 아니며, 실제 지갑에서는 더보기 비용이 빠져나갑니다."], table: { caption: "에기르 노말 1관문 · 같은 가정 단가, 다른 사용 계획", headers: ["사용 계획", "구매 대체 가치", "비용 차감 후"], rows: [["성장 중: 일반 재료 모두 사용", gold(exampleValue(firstGate.bonusRewards)), gold(exampleValue(firstGate.bonusRewards) - firstGate.bonusCost)], ["파편 충분: 파편 제외", gold(exampleValue(firstGate.bonusRewards, ["운명의 파편"])), gold(exampleValue(firstGate.bonusRewards, ["운명의 파편"]) - firstGate.bonusCost)], ["주차: 일반 재료 사용 계획 없음", "0 G", gold(-firstGate.bonusCost)]] } },
  { title: "1관문과 2관문은 따로 결정하기", paragraphs: ["같은 단가에서도 관문마다 재료 수량과 비용이 다릅니다. 1관문의 결과를 보고 2관문까지 같은 선택을 하지 마세요. 아래 결과는 일반 재료를 모두 쓴다는 조건입니다.", "실제 계산 순서는 레이드·난이도 선택 → 보상 수량 대조 → 시세 조회 시각 확인 → 필요 없는 재료 제외 → 관문별 차액 비교입니다. 무료 더보기나 할인 대상이면 게임에 표시된 실제 비용을 우선하세요. 사이트는 기본 비용을 사용합니다."], table: { caption: "동일한 설명용 단가를 적용한 관문별 비교", headers: ["관문", "재료 가치", "기본 비용", "평가 차액"], rows: aegir.gates.map(g => [g.name, gold(exampleValue(g.bonusRewards)), gold(g.bonusCost), gold(exampleValue(g.bonusRewards) - g.bonusCost)]) } },
  { title: "2026년 10월 18일 공개 계산기 조회 사례", paragraphs: ["2026년 10월 18일 로아체크 공개 계산기에서 에기르 노말, 상위 재료 환산 없음, 재료 제외 없음으로 조회한 화면의 표시값을 기록했습니다. 위의 설명용 단가와 다른 실제 사이트 조회 사례이며, 이후 시세를 대표하지 않습니다. 관찰한 화면의 합계이며 현재 단가는 계산기에서 다시 조회하세요.", "1관문은 표시된 일반 재료 가치가 기본 비용보다 컸고 2관문은 작았습니다. 하지만 쐐기돌의 성장 가치는 포함되지 않았으므로 ‘1관문은 무조건 더보기, 2관문은 무조건 건너뛰기’로 해석하면 안 됩니다. 개별 재료 표시값과 합계는 소수점 처리 때문에 더했을 때 차이가 날 수 있습니다."], table: { caption: "2026. 10. 18 공개 화면에서 관찰한 값 · 고정된 과거 사례", headers: ["관문", "표시된 재료 가치", "기본 비용", "차액"], rows: [["에기르 노말 1관문", "1,018 G", "750 G", "+268 G"], ["에기르 노말 2관문", "1,553 G", "1,780 G", "−227 G"]] } },
  { title: "가격이 없거나 환산 옵션을 켰을 때", paragraphs: ["시세가 조회되지 않은 재료는 가치가 0인 재료와 다릅니다. 조회 실패·매물 없음·가격 평가 대상 밖을 구분하고, 가격이 있는 재료만 더한 부분 합계로 보세요. 합계가 비용보다 작아도 누락 재료의 가치까지 포함한 손해를 확정할 수는 없습니다.", "상위 재료 환산은 교환 비율을 적용한 평가입니다. 실제로 교환 가능한 정수 수량, 남는 재료, 성장에 쓸 티어가 모두 맞는지 확인하세요. 이 글의 예시는 환산을 끈 상태이므로 옵션을 켠 결과와 직접 비교하지 않습니다."] },
];

export const weeklyRaidSection: Section = {
  title: "1680 캐릭터의 에기르·아브렐슈드·모르둠 노말 계획",
  paragraphs: [raidExampleNote, "아이템 레벨 1680 캐릭터가 세 레이드의 노말을 모두 클리어한다는 계획입니다. 입장에 필요한 퀘스트·장비·파티 조건은 별도이며, 레벨만으로 클리어 가능성을 판단하지 않습니다. 거래 가능 골드와 귀속 골드를 나누고 더보기는 지출로 따로 기록하세요."],
  table: { caption: "세 레이드 노말 전체 관문 · 골드 획득 대상으로 지정한 캐릭터", headers: ["레이드", "거래 가능", "귀속", "전체 더보기 비용"], rows: [...exampleRaids.map(name => {const d = raidInformation[name].difficulty.노말!;return [name, gold(d.gates.reduce((s,g)=>s+g.gold,0)), gold(d.gates.reduce((s,g)=>s+g.boundGold,0)), gold(d.gates.reduce((s,g)=>s+g.bonusCost,0))];}), ["합계", gold(exampleRaids.reduce((s,n)=>s+raidInformation[n].difficulty.노말!.gates.reduce((v,g)=>v+g.gold,0),0)), gold(exampleRaids.reduce((s,n)=>s+raidInformation[n].difficulty.노말!.gates.reduce((v,g)=>v+g.boundGold,0),0)), gold(exampleRaids.reduce((s,n)=>s+raidInformation[n].difficulty.노말!.gates.reduce((v,g)=>v+g.bonusCost,0),0))]] },
};

export const boundRaidSection: Section = {
  title: "에기르 노말을 끝냈을 때 거래소 예산",
  paragraphs: [raidExampleNote, `에기르 노말 전체 관문을 완료해 사이트 보상표대로 받았다고 가정하면 거래 가능 골드는 ${gold(aegir.gold)}, 귀속 골드는 ${gold(aegir.boundGold)}입니다. 총액 ${gold(aegir.gold + aegir.boundGold)}을 거래소 예산으로 잡으면 안 됩니다.`, `시작 잔액과 다른 수입이 없고 8,000 G짜리 거래소 아이템이 목표라면 거래 가능 골드는 ${gold(Math.max(0,8000-aegir.gold))} 부족합니다. 더보기나 입찰로 거래 가능 골드를 사용했다면 부족액은 더 커집니다. 귀속 골드는 캐릭터별 사용 범위를 게임 화면에서 확인하고 별도로 기록하세요.`],
};
