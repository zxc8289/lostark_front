import test from "node:test";
import assert from "node:assert/strict";
import { summarizeRewardValue } from "./reward-value";

test("조회되지 않은 가격으로 손해를 확정하지 않는다", () => {
  const result = summarizeRewardValue([{ unitPrice: 0, itemTotalValue: 0, isExcluded: false }], 750);
  assert.equal(result.canCalculate, false);
  assert.equal(result.label, "가격 확인 필요");
});
test("일부 가격만 있으면 부분 합계로 표시한다", () => {
  const result = summarizeRewardValue([{ unitPrice: 2, itemTotalValue: 620, isExcluded: false }, { unitPrice: 0, itemTotalValue: 0, isExcluded: false }], 750);
  assert.equal(result.difference, -130);
  assert.equal(result.missingCount, 1);
  assert.equal(result.label, "일부 재료만 평가");
});
test("사용자가 제외한 재료는 누락으로 취급하지 않는다", () => {
  const result = summarizeRewardValue([{ unitPrice: 2, itemTotalValue: 620, isExcluded: false }, { unitPrice: 0, itemTotalValue: 0, isExcluded: true }], 620);
  assert.equal(result.missingCount, 0);
  assert.equal(result.label, "가치와 비용 같음");
});
test("잘못된 시세는 합계를 오염시키지 않는다", () => {
  const result = summarizeRewardValue([{ unitPrice: NaN, itemTotalValue: NaN, isExcluded: false }, { unitPrice: -1, itemTotalValue: -10, isExcluded: false }], 750);
  assert.equal(result.canCalculate, false);
  assert.equal(result.totalValue, 0);
});
