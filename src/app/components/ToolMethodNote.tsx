import Link from "next/link";
import HelpDisclosure from "./HelpDisclosure";

export const toolMethods = {
  auction: { summary: "예상 판매가에서 수수료 5%를 뺀 재판매 이익을 기준으로 계산합니다.", title: "경매 입찰", basis: "입력한 판매가에 수수료 5%를 적용합니다. N빵 가격은 실수령액 × (인원 − 1) ÷ 인원, 선점 가격은 N빵 가격 ÷ 1.1이며 각 단계에서 소수점을 버립니다.", limit: "재판매 성공과 다음 입찰의 10% 인상을 가정합니다. N빵 초과는 다른 참여자보다 이익이 작아지는 구간이며 실제 적자와는 다릅니다. 시세 하락과 판매 지연은 제외합니다.", href: "/articles/auction-bid-guide" },
  "more-reward": { summary: "귀속 재료의 구매 대체 가치이며, 실제 판매 수익은 아닙니다.", title: "더보기 효율", basis: "사이트의 관문별 추가 보상표와 조회한 재료 시세를 사용합니다. 포함한 재료의 수량 × 환산 단가를 더하고 더보기 비용을 뺍니다. 제외한 재료와 티어 환산 설정에 따라 결과가 달라집니다.", limit: "귀속 재료는 재판매 수익이 아니라 구매 대체 가치입니다. 가격이 없는 재료는 부분 평가로 표시하며 거래불가로 단정하지 않습니다. 성장 보상·무료 더보기·교환 잔여 수량은 별도 확인이 필요합니다.", href: "/articles/more-reward-efficiency" },
  "weekly-gold": { summary: "계획한 보상 합계입니다. 이미 받은 골드와 더보기·입찰 지출은 별도로 확인하세요.", title: "주간 골드", basis: "사이트 보상표에서 선택한 레이드의 거래 가능 골드와 귀속 골드를 따로 합산합니다. 캐릭터별 레이드는 최대 3개이며 골드 제한 설정에 따라 획득 대상만 합산합니다.", limit: "계획한 총보상입니다. 이미 받은 보상, 더보기 지출, 입찰, 소모품, 재료 판매와 이벤트 수입은 자동 정산하지 않습니다. 실제 진행도는 내 숙제에서 확인하세요.", href: "/articles/weekly-raid-gold-guide" },
  gem: { summary: "목표 타입이 나온 경우의 1회 합성 비용이며, 확정 이익은 아닙니다.", title: "보석 가격 비교", basis: "로스트아크 Open API의 T4 경매장 즉시 구매가를 조회합니다. 하위 레벨 겁화·작열 중 확인된 낮은 단가의 3배와 목표 보석 가격을 비교합니다. 시세는 5분 캐시를 사용하며 조회 실패 시 최대 30분의 이전 응답이 제공될 수 있습니다.", limit: "목표 타입이 나온다는 가정의 1회 비용 비교입니다. 타입별 확률을 가중한 기대 수익, 재판매 수수료, 스킬 옵션 가치와 동일 가격 매물 3개의 확보 가능성은 반영하지 않습니다.", href: "/guide/data#gem" },
  craft: { summary: "대성공 확률에 따른 평균값이며, 매회 같은 수익을 보장하지 않습니다.", title: "영지 제작", basis: "재료별 필요 수량 × 단가에 할인된 제작 골드를 더합니다. 예상 생산량은 기본 생산량 × (1 + 대성공 확률)로 계산하고 판매 수수료를 차감한 가치와 비교합니다.", limit: "대성공은 입력 확률에 따른 평균값이며 매회 보장되지 않습니다. 활동력의 골드 환산 비용, 제작 시간, 매물 소진과 가격 변동은 별도 판단이 필요합니다.", href: "/guide/data#craft" },
  raid: { summary: "기본 보상표입니다. 골드 획득 제한과 더보기 할인은 별도로 확인하세요.", title: "레이드 보상표", basis: "운영자가 인게임에서 직접 확인해 정리한 레이드·난이도·관문별 수치를 표시합니다. 보상표는 실시간 공식 API 응답이 아니며 거래 가능 골드와 귀속 골드를 구분합니다.", limit: "기본 보상을 기준으로 합니다. 골드 획득 지정·입장 제한과 무료·할인 더보기 적용에 따라 실제 수령액과 비용이 달라질 수 있습니다.", href: "/guide/data#raid" },
  dps: { summary: "저장된 기준으로 추정한 지분이며, 실제 전투 로그나 MVP 판정과 다를 수 있습니다.", title: "딜 지분", basis: "관문별 저장된 잔혈 피해량 기준을 8인 20%·4인 40%로 나눠 비교용 총피해량을 역산합니다. 내 입력 피해량 ÷ 역산 총피해량 × 100으로 지분을 구하며, 전체 값은 피해량을 합산한 비율입니다.", limit: "게임의 전체 전투 로그를 측정한 값이 아닙니다. 운영자가 조사해 구성한 자체 기준을 사용하며, 회복·실드·기믹·딜컷 등 전투 조건에 따라 실제 기록과 차이가 있을 수 있습니다. 실제 MVP 판정을 보장하지 않습니다.", href: "/guide/data#dps" },
  "gem-setup": { summary: "보유 젬과 목표 조건에 따른 추천이며, 실전 피해량을 측정한 결과는 아닙니다.", title: "젬 세팅", basis: "입력한 보유 젬, 코어와 목표 포인트를 바탕으로 후보 조합을 비교합니다. 역할별 가중치와 선택한 조건에 따라 추천 순서가 달라집니다.", limit: "게임 내 실전 피해량을 직접 측정한 결과가 아닙니다. 입력 누락, 옵션 변경과 역할별 평가 가중치 때문에 실제 선호 세팅과 차이가 있을 수 있습니다.", href: "/guide/data#gem-setup" },
} as const;

export default function ToolMethodNote({ tool, calculatorLayout = false, className = "mt-6" }: { tool: keyof typeof toolMethods; calculatorLayout?: boolean; className?: string }) {
  const method = toolMethods[tool];
  return <div className={`${className} ${calculatorLayout ? "grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-[280px_minmax(0,1fr)]" : ""}`}>
    <aside aria-label={`${method.title} 데이터와 계산 기준`} className={calculatorLayout ? "lg:col-start-2" : undefined}>
      <HelpDisclosure title={`${method.title} · 계산 기준`} description={method.summary}>
        <div className="grid gap-4 md:grid-cols-2">
          <div><h3 className="mb-1 text-xs font-medium text-gray-200">계산 방식</h3><p>{method.basis}</p></div>
          <div><h3 className="mb-1 text-xs font-medium text-gray-200">참고할 점</h3><p>{method.limit}</p></div>
        </div>
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs">
          <Link className="text-[#A6AEFF] hover:underline" href={method.href}>계산 사례와 상세 기준 →</Link>
          <Link className="hover:text-[#A6AEFF]" href="/support">수치 오류 제보</Link>
        </div>
      </HelpDisclosure>
    </aside>
  </div>;
}
