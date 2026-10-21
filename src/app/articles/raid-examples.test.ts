import test from "node:test";
import assert from "node:assert/strict";
import { raidInformation } from "@/server/data/raids";
import { getRaidEvidence } from "../lib/data-evidence";
import { exampleValue, parseExampleRewards } from "./raid-examples";

test("에기르 예시는 보상표와 일치하고 파편 제외 결과가 구분된다", () => {
  const gate = raidInformation["1막-에기르"].difficulty.노말!.gates[0];
  assert.equal(exampleValue(gate.bonusRewards), 1118);
  assert.equal(exampleValue(gate.bonusRewards, ["운명의 파편"]), 838);
  assert.equal(exampleValue(gate.bonusRewards) - gate.bonusCost, 368);
  assert.ok(parseExampleRewards(gate.bonusRewards).some(item=>item.name === "업화의 쐐기돌"));
});
test("공식 입장 규칙과 운영자 보상 출처를 구분한다", () => {
  const result = getRaidEvidence("1막-에기르", "노말");
  assert.equal(result.rulesMatch, true);
  assert.equal(result.rewardSource, "운영자 인게임 직접 확인");
  assert.equal(getRaidEvidence("1막-에기르", "싱글").rulesMatch, false);
});
test("예시에 쓰는 보상표의 관문 합계는 레이드 합계와 일치한다", () => {
  for (const name of ["1막-에기르", "2막-아브렐슈드", "3막-모르둠"]) {
    const raid = raidInformation[name].difficulty.노말!;
    assert.equal(raid.gates.reduce((sum,g)=>sum+g.gold,0), raid.gold, name);
    assert.equal(raid.gates.reduce((sum,g)=>sum+g.boundGold,0), raid.boundGold, name);
  }
});
