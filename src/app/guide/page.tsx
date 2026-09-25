import type { Metadata } from "next";
import Link from "next/link";
import GuidePageLayout, { GuideContents, GuidePanel } from "../components/GuidePageLayout";
import { ArrowRight, Calculator, Gem, ListChecks, Search, UsersRound } from "lucide-react";

export const metadata: Metadata = {
  title: "로아체크 이용 가이드",
  description:
    "로아체크의 숙제 관리, 파티 숙제, 레이드 정보, 더보기 효율, 경매 계산기, 젬 세팅 기능을 처음 사용하는 유저를 위한 가이드입니다.",
  openGraph: {
    title: "로아체크 이용 가이드",
    description:
      "로스트아크 숙제 관리와 레이드 계산기를 어떤 순서로 사용하면 좋은지 정리한 로아체크 공식 가이드입니다.",
    url: "https://loacheck.com/guide",
  },
};

const steps = [
  {
    icon: Search,
    title: "캐릭터와 계정 정보를 먼저 확인합니다",
    body: "대표 캐릭터를 기준으로 원정대 정보를 불러오면 여러 캐릭터의 레이드 현황을 한 화면에서 정리하기 쉬워집니다. 처음 사용하는 경우에는 데모 화면으로 흐름을 먼저 확인해도 좋습니다.",
    href: "/my-tasks",
  },
  {
    icon: ListChecks,
    title: "주간 레이드와 일반 숙제를 분리해서 체크합니다",
    body: "레이드는 골드 획득과 관문 진행도가 중요하고, 일일/주간 반복 숙제는 완료 여부가 중요합니다. 로아체크는 이 두 흐름을 분리해 주간 초기화 후 무엇이 남았는지 빠르게 파악할 수 있게 합니다.",
    href: "/my-tasks",
  },
  {
    icon: UsersRound,
    title: "파티가 있다면 공유 화면을 활용합니다",
    body: "고정 공대, 길드팟, 지인팟처럼 같은 구성으로 반복 진행하는 경우 파티 숙제를 만들고 초대 코드를 공유하면 진행도를 함께 관리할 수 있습니다.",
    href: "/party-tasks",
  },
  {
    icon: Calculator,
    title: "레이드 종료 후 계산기로 결과를 검토합니다",
    body: "더보기 효율, 경매 입찰가, 딜 지분 계산기는 레이드 후 판단을 빠르게 돕는 도구입니다. 계산 결과는 참고용이며 실제 거래소 시세와 파티 상황을 함께 봐야 합니다.",
    href: "/calculator/more-reward",
  },
  {
    icon: Gem,
    title: "젬 세팅은 목표에 따라 해석합니다",
    body: "같은 보유 젬이라도 포인트를 먼저 맞출지, 스탯을 우선할지에 따라 적합한 조합이 달라질 수 있습니다. 결과가 여러 개라면 자신의 캐릭터 세팅 목적에 가까운 기준을 선택하는 것이 좋습니다.",
    href: "/gem-setup",
  },
];

export default function GuidePage() {
  return <GuidePageLayout title="로아체크 이용 가이드" description="캐릭터 현황을 확인하고, 남은 숙제를 체크한 뒤, 레이드 결과를 계산기로 검토하세요. 처음 사용하는 분들을 위한 기능별 사용 순서입니다." active="guide">
    <div className="grid grid-cols-1 items-start gap-4 sm:gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
      <GuideContents items={steps.map((step, index) => ({id: `step-${index + 1}`, label: step.title}))} />
      <div className="min-w-0 space-y-4 sm:space-y-6">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return <GuidePanel key={step.title} id={`step-${index + 1}`} title={step.title}>
            <div className="flex items-center gap-2 text-xs font-medium text-[#A6AEFF]"><Icon size={16} />STEP {index + 1}</div>
            <p>{step.body}</p>
            <Link href={step.href} className="inline-flex items-center gap-2 rounded-lg border border-white/5 bg-white/5 px-3 py-2 text-xs font-medium text-gray-200 hover:bg-white/10">기능 바로가기<ArrowRight size={14} /></Link>
          </GuidePanel>;
        })}
        <GuidePanel title="계산 결과를 볼 때 주의할 점">
          <p>로아체크의 계산기는 빠른 판단을 돕는 보조 지표입니다. 시세, 파티 구성, 보스 패턴, 기믹 수행, 캐릭터 세팅에 따라 실제 체감 효율은 달라질 수 있습니다.</p>
          <p>결과가 궁금하다면 <Link className="text-[#A6AEFF] hover:underline" href="/articles">계산 사례가 있는 정보 글</Link>과 <Link className="text-[#A6AEFF] hover:underline" href="/guide/data">데이터 출처·계산 기준</Link>을 함께 확인하세요.</p>
        </GuidePanel>
        <GuidePanel title="공개 콘텐츠와 개인 데이터">
          <p>가이드와 정보 글은 누구나 읽을 수 있는 공개 콘텐츠이며, 개인 숙제와 파티 정보는 사용자가 직접 입력하거나 연동한 내용을 기준으로 표시됩니다.</p>
        </GuidePanel>
      </div>
    </div>
  </GuidePageLayout>;
}
