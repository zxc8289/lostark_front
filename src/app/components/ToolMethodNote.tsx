import Link from "next/link";

export const toolMethods = {
  auction: { title: "경매 입찰", basis: "입력한 판매가에 수수료 5%를 적용합니다. N빵 가격은 실수령액 × (인원 − 1) ÷ 인원, 선점 가격은 N빵 가격 ÷ 1.1이며 각 단계에서 소수점을 버립니다.", limit: "재판매 성공과 다음 입찰의 10% 인상을 가정합니다. N빵 초과는 다른 참여자보다 이익이 작아지는 구간이며 실제 적자와는 다릅니다. 시세 하락과 판매 지연은 제외합니다.", href: "/articles/auction-bid-guide" },
  "more-reward": { title: "더보기 효율", basis: "사이트의 관문별 추가 보상표와 조회한 재료 시세를 사용합니다. 포함한 재료의 수량 × 환산 단가를 더하고 더보기 비용을 뺍니다. 제외한 재료와 티어 환산 설정에 따라 결과가 달라집니다.", limit: "귀속 재료는 재판매 수익이 아니라 구매 대체 가치입니다. 가격이 없는 재료, 성장 전용 보상과 실제 교환 잔여 수량은 별도 확인이 필요합니다.", href: "/articles/more-reward-efficiency" },
  "weekly-gold": { title: "주간 골드", basis: "사이트 보상표에서 선택한 레이드의 거래 가능 골드와 귀속 골드를 따로 합산합니다. 캐릭터별 레이드는 최대 3개이며 골드 제한 설정에 따라 획득 대상만 합산합니다.", limit: "계획한 총보상입니다. 이미 받은 보상, 더보기 지출, 입찰, 소모품, 재료 판매와 이벤트 수입은 자동 정산하지 않습니다. 실제 진행도는 내 숙제에서 확인하세요.", href: "/articles/weekly-raid-gold-guide" },
  gem: { title: "보석 가격 비교", basis: "로스트아크 Open API의 T4 경매장 즉시 구매가를 조회합니다. 하위 레벨 겁화·작열 중 확인된 낮은 단가의 3배와 목표 보석 가격을 비교합니다. 시세는 5분 캐시를 사용하며 조회 실패 시 최대 30분의 이전 응답이 제공될 수 있습니다.", limit: "목표 타입이 나온다는 가정의 1회 비용 비교입니다. 타입별 확률을 가중한 기대 수익, 재판매 수수료, 스킬 옵션 가치와 동일 가격 매물 3개의 확보 가능성은 반영하지 않습니다.", href: "/guide/data#gem" },
  craft: { title: "영지 제작", basis: "재료별 필요 수량 × 단가에 할인된 제작 골드를 더합니다. 예상 생산량은 기본 생산량 × (1 + 대성공 확률)로 계산하고 판매 수수료를 차감한 가치와 비교합니다.", limit: "대성공은 입력 확률에 따른 평균값이며 매회 보장되지 않습니다. 활동력의 골드 환산 비용, 제작 시간, 매물 소진과 가격 변동은 별도 판단이 필요합니다.", href: "/guide/data#craft" },
  raid: { title: "레이드 보상표", basis: "로아체크에 저장된 레이드·난이도·관문별 수치를 표시합니다. 보상표는 실시간 공식 API 응답이 아니며 거래 가능 골드와 귀속 골드를 구분합니다.", limit: "개별 수치의 원자료 링크와 게임 내 최종 대조일은 현재 기록되어 있지 않습니다. 패치 직후에는 공식 업데이트 공지와 게임의 보상 화면을 우선 확인하세요.", href: "/guide/data#raid" },
  dps: { title: "딜 지분 추정", basis: "관문별 저장된 잔혈 피해량 기준을 8인 20%·4인 40%로 나눠 비교용 총피해량을 역산합니다. 내 입력 피해량 ÷ 역산 총피해량 × 100으로 지분을 구하며, 전체 값은 피해량을 합산한 비율입니다.", limit: "게임의 전체 전투 로그를 측정한 값이 아닙니다. 기준값의 개별 측정 원자료와 최종 대조일은 기록되어 있지 않으며, 회복·실드·기믹·딜컷에 따른 오차가 있습니다. 실제 MVP 판정을 보장하지 않습니다.", href: "/guide/data#dps" },
  "gem-setup": { title: "젬 세팅", basis: "입력한 보유 젬, 코어와 목표 포인트를 바탕으로 후보 조합을 비교합니다. 역할별 가중치와 선택한 조건에 따라 추천 순서가 달라집니다.", limit: "게임 내 실전 피해량을 직접 측정한 결과가 아닙니다. 입력 누락, 옵션 변경과 역할별 평가 가중치 때문에 실제 선호 세팅과 차이가 있을 수 있습니다.", href: "/guide/data#gem-setup" },
} as const;

export default function ToolMethodNote({ tool, calculatorLayout = false }: { tool: keyof typeof toolMethods; calculatorLayout?: boolean }) {
  const method = toolMethods[tool];
  return <div className={calculatorLayout ? "mt-6 grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-[280px_minmax(0,1fr)]" : "mt-6"}>
    <aside aria-label={`${method.title} 데이터와 계산 기준`} className={`${calculatorLayout ? "lg:col-start-2" : ""} overflow-hidden rounded-none border-y border-white/5 bg-[#16181D] sm:rounded-xl sm:border`}>
    <div className="border-b border-white/5 px-5 py-4"><h2 className="flex items-center gap-2.5 text-sm font-semibold text-white"><span aria-hidden="true" className="h-4 w-1 shrink-0 rounded-full bg-[#5B69FF]" />{method.title} · 데이터와 계산 기준</h2></div>
    <div className="grid gap-5 p-5 text-[13px] leading-7 text-gray-400 md:grid-cols-2">
      <div><h3 className="mb-2 text-xs font-medium text-gray-200">출처와 계산 방식</h3><p>{method.basis}</p></div>
      <div><h3 className="mb-2 text-xs font-medium text-gray-200">결과 해석과 제외 항목</h3><p>{method.limit}</p></div>
    </div>
    <div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-white/5 px-5 py-3 text-xs text-gray-400">
      <Link className="hover:text-[#A6AEFF]" href={method.href}>계산 사례와 상세 기준 →</Link>
      <Link className="hover:text-[#A6AEFF]" href="/guide/data">출처·검증 범위·수정 이력</Link>
      <Link className="hover:text-[#A6AEFF]" href="/support">수치 오류 제보</Link>
    </div>
    </aside>
  </div>;
}
