type RewardValue = { unitPrice: number; itemTotalValue: number; isExcluded: boolean };

export function summarizeRewardValue(items: RewardValue[], cost: number) {
  const included = items.filter(item => !item.isExcluded);
  const priced = included.filter(item => Number.isFinite(item.unitPrice) && item.unitPrice > 0 && Number.isFinite(item.itemTotalValue));
  const missingCount = included.length - priced.length;
  const totalValue = priced.reduce((sum, item) => sum + item.itemTotalValue, 0);
  const canCalculate = included.length === 0 || priced.length > 0;
  const difference = totalValue - cost;
  return {
    totalValue, missingCount, canCalculate, difference,
    label: !canCalculate ? "가격 확인 필요" : missingCount > 0 ? "일부 재료만 평가" : difference === 0 ? "가치와 비용 같음" : difference > 0 ? "구매 대체 가치가 더 큼" : "비용이 더 큼",
  };
}
