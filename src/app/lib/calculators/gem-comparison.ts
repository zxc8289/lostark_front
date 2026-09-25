export function compareGemPrices(targetPrice: number, lowerDamagePrice: number, lowerCooldownPrice: number) {
  const valid = (price: number) => Number.isFinite(price) && price > 0;
  const lowerPrices = [lowerDamagePrice, lowerCooldownPrice].filter(valid);
  const lowerUnitPrice = lowerPrices.length ? Math.min(...lowerPrices) : 0;
  const synthesisCost = lowerUnitPrice * 3;
  const canCalculate = valid(targetPrice) && valid(synthesisCost);
  const diff = canCalculate ? synthesisCost - targetPrice : 0;
  return {
    targetPrice: valid(targetPrice) ? targetPrice : 0,
    lowerUnitPrice,
    synthesisCost,
    canCalculate,
    diff,
    profit: -diff,
    profitRate: canCalculate ? (-diff / synthesisCost) * 100 : 0,
    isSynthesisCheaper: canCalculate && diff < 0,
    label: !canCalculate ? "가격 확인 필요" : diff === 0 ? "구매와 1회 합성 비용이 같습니다" : diff > 0 ? "구매가 더 저렴합니다" : "1회 합성 비용이 더 저렴합니다",
  };
}
