import assert from "node:assert/strict";
import { test } from "node:test";
import { compareGemPrices } from "./gem-comparison";

test("missing and invalid prices never produce a buying recommendation", () => {
  for (const prices of [[0, 0, 0], [100, 0, 0], [0, 30, 40], [NaN, 30, 40], [100, Infinity, -1]]) {
    const result = compareGemPrices(...prices as [number, number, number]);
    assert.equal(result.canCalculate, false);
    assert.equal(result.label, "가격 확인 필요");
  }
});

test("one available lower type can be compared without treating missing prices as free", () => {
  const result = compareGemPrices(100, 0, 30);
  assert.equal(result.synthesisCost, 90);
  assert.equal(result.diff, -10);
  assert.equal(result.profit, 10);
  assert.equal(result.isSynthesisCheaper, true);
});

test("equal prices and losses have distinct outcomes", () => {
  assert.equal(compareGemPrices(90, 30, 40).label, "구매와 1회 합성 비용이 같습니다");
  const result = compareGemPrices(80, 30, 40);
  assert.equal(result.profit, -10);
  assert.equal(result.label, "구매가 더 저렴합니다");
});
