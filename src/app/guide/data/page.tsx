import type { Metadata } from "next";
import Link from "next/link";
import GuidePageLayout, { GuideContents, GuidePanel } from "../../components/GuidePageLayout";
import { toolMethods } from "../../components/ToolMethodNote";

export const metadata: Metadata = {
  title: "데이터 출처와 계산 기준",
  description: "로아체크의 API 시세, 레이드 보상표, 딜 지분 추정과 계산기별 가정·제외 항목·검증 범위를 확인하세요.",
  alternates: { canonical: "https://loacheck.com/guide/data/" },
};

export default function DataGuidePage() {
  return <GuidePageLayout title="데이터 출처와 계산 기준" description="가격 조회, 사이트 보상표, 사용자가 입력한 기록은 서로 다른 자료입니다. 어떤 값을 사용하며 어디까지 해석할 수 있는지 기능별로 공개합니다." active="data">
    <div className="grid grid-cols-1 items-start gap-4 sm:gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
      <GuideContents items={[{ id: "sources", label: "자료의 종류와 검증 범위" }, ...Object.entries(toolMethods).map(([key, method]) => ({ id: key, label: method.title })), {id: "history", label: "수정 이력과 오류 제보"}]} />
      <article className="min-w-0 space-y-4 sm:space-y-6">
        <p className="px-5 text-xs text-gray-500 sm:px-0">문서 수정: <time dateTime="2026-09-25">2026. 09. 25</time> · 작성: 로아체크</p>
        <GuidePanel id="sources" title="자료의 종류와 검증 범위">
      <p>캐릭터 정보와 시세 조회는 <a className="text-[#A6AEFF] underline" href="https://developer-lostark.game.onstove.com/">로스트아크 Open API</a>를 사용합니다. 공식 API가 제공하는 범위와 조회 시점의 응답을 바탕으로 하며 실시간 체결가를 보장하지 않습니다.</p>
      <p>레이드 보상과 딜 지분 기준은 사이트에 별도로 저장된 값입니다. 현재 개별 수치의 원자료 링크·게임 내 최종 검증일은 기록되어 있지 않습니다. 이 문서의 수정일을 해당 수치의 검증일로 보지 마세요. 변경 여부는 <a className="text-[#A6AEFF] underline" href="https://lostark.game.onstove.com/News/Update/List">공식 업데이트 내역</a>과 게임 화면을 함께 확인해 주세요.</p>
      <p>숙제 완료 여부와 파티 진행도는 사용자가 기록한 상태입니다. 체험 화면의 샘플 데이터는 실제 계정이나 실측 플레이 기록이 아닙니다.</p>
    </GuidePanel>
    {Object.entries(toolMethods).map(([key, method]) => <GuidePanel key={key} id={key} title={method.title}>
      <p>{method.basis}</p><p>{method.limit}</p>
      {key === "dps" && <p className="rounded-lg border border-white/5 bg-[#0F1014] p-4 text-gray-200">설명용 예시: 8인 관문의 잔혈 기준을 600억으로 두면 비교 총피해량은 600 ÷ 0.20 = 3,000억입니다. 내 피해량이 450억이면 15%입니다. 이는 저장한 기준에서 역산한 값이며 실제 총피해량을 측정했다는 뜻은 아닙니다.</p>}
      {key === "gem" && <p>설명용 예시: 목표 가격 100,000 G, 하위 보석 개당 30,000 G이면 1회 합성 비용은 90,000 G입니다. 목표 타입이 나온다는 조건에서 10,000 G 차이가 나며 목표 타입 획득까지의 평균 비용은 아닙니다.</p>}
      {key === "craft" && <p>설명용 예시: 재료비 800 G와 제작 골드 200 G, 생산량 10개, 개당 판매가 120 G, 대성공 0%, 수수료 5%이면 예상 판매액 1,140 G에서 제작비 1,000 G를 뺀 140 G입니다. 직접 사용의 구매 대체 가치는 수수료 차감 전 1,200 G를 기준으로 합니다.</p>}
      {method.href.startsWith("/articles") && <Link className="text-[#A6AEFF] hover:underline" href={method.href}>숫자 예시와 해석 읽기 →</Link>}
    </GuidePanel>)}
    <GuidePanel id="history" title="수정 이력과 오류 제보">
      <p><time dateTime="2026-09-25">2026. 09. 25</time> · 데이터 출처 구분, 계산 가정과 제외 항목을 문서화했습니다. 경매·더보기·주간 골드·귀속 골드·숙제 관리 글의 계산 예시를 보강했습니다. 게임 수치 전체를 재검증한 업데이트는 아닙니다.</p>
      <p>수치가 다르면 레이드 이름, 난이도, 관문, 확인한 날짜와 게임 내 표시값을 <Link className="text-[#A6AEFF] underline" href="/support">문의 게시판</Link>에 남겨 주세요. 시세 관련 오류는 조회 시간과 선택한 재료·보석도 함께 알려주시면 확인에 도움이 됩니다.</p>
    </GuidePanel>
      </article>
    </div>
  </GuidePageLayout>;
}
