import type { Metadata } from "next";
import Link from "next/link";
import GuidePageLayout, { GuidePanel } from "../components/GuidePageLayout";
import { ArrowRight, Calculator, ListChecks, Search, UsersRound } from "lucide-react";

export const metadata: Metadata = {
  title: "로아체크 이용 가이드",
  description: "캐릭터 등록부터 관문 체크, 파티 공유와 골드 계산까지 로아체크 사용 순서를 안내합니다.",
  alternates: { canonical: "https://loacheck.com/guide/" },
  openGraph: {
    title: "로아체크 이용 가이드",
    description: "숙제 관리와 계산기를 처음 사용하는 분들을 위한 간단한 안내입니다.",
    url: "https://loacheck.com/guide/",
  },
};

const steps = [
  { icon: Search, title: "캐릭터 등록", body: "내 숙제에서 대표 캐릭터로 원정대를 불러오세요. 처음이라면 샘플 원정대로 먼저 체험할 수 있습니다.", href: "/my-tasks", label: "내 숙제" },
  { icon: ListChecks, title: "관문별 완료 체크", body: "캐릭터별 레이드·난이도·골드 획득 여부를 정하고, 클리어한 관문만 체크하세요. 일부 관문만 끝났다면 나머지는 미완료로 남깁니다.", href: "/my-tasks", label: "숙제 기록" },
  { icon: UsersRound, title: "파티 진행도 공유", body: "파티 숙제를 만들고 초대 코드를 공유하세요. 함께 갈 캐릭터와 난이도를 맞추고, 클리어 후 진행도를 갱신합니다.", href: "/party-tasks", label: "파티 숙제" },
  { icon: Calculator, title: "보상과 지출 계산", body: "주간 골드로 수익을 계획하고, 더보기와 경매 계산기로 지출을 비교하세요. 거래 가능 골드와 귀속 골드는 나눠 확인합니다.", href: "/calculator/weekly-gold", label: "주간 골드 계산" },
];

export default function GuidePage() {
  return <GuidePageLayout title="로아체크 이용 가이드" description="캐릭터 등록부터 파티 공유까지, 네 단계로 시작하세요." active="guide">
    <div className="grid gap-4 sm:grid-cols-2">
      {steps.map((step, index) => {
        const Icon = step.icon;
        return <section key={step.title} id={`step-${index + 1}`} className="scroll-mt-28 border-y border-[var(--overlay-ink)]/5 bg-[var(--surface-16181d)] p-5 sm:rounded-xl sm:border">
          <div className="mb-3 flex items-center gap-2 text-xs font-medium text-[#A6AEFF]"><Icon size={16} aria-hidden="true" />STEP {index + 1}</div>
          <h2 className="text-base font-semibold text-white">{step.title}</h2>
          <p className="mt-2 text-sm leading-7 text-gray-400">{step.body}</p>
          <Link href={step.href} className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-[#A6AEFF] hover:underline">{step.label}<ArrowRight size={14} aria-hidden="true" /></Link>
        </section>;
      })}
    </div>
    <div className="mt-6 scroll-mt-28" id="weekly-checklist">
      <GuidePanel title="매주 확인할 세 가지">
        <ul className="space-y-2">
          <li><strong className="font-medium text-gray-200">초기화 후</strong> · 골드 획득 캐릭터와 이번 주 레이드, 파티 일정을 정합니다.</li>
          <li><strong className="font-medium text-gray-200">클리어 직후</strong> · 완료 관문을 체크하고 더보기·입찰 지출을 확인합니다.</li>
          <li><strong className="font-medium text-gray-200">주 후반</strong> · 남은 관문과 취소·변경된 파티 일정을 확인합니다.</li>
        </ul>
        <p className="text-xs">브라우저에 저장한 기록은 다른 기기로 옮겨지지 않으며, 브라우저 데이터를 지우면 사라질 수 있습니다. 샘플 원정대는 실제 계정 기록이 아닙니다.</p>
      </GuidePanel>
    </div>
    <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 px-4 text-xs text-gray-400 sm:px-0">
      <Link href="/gem-setup" className="hover:text-[#A6AEFF]">젬 세팅 찾기 →</Link>
      <Link href="/articles" className="hover:text-[#A6AEFF]">계산 예시 읽기 →</Link>
      <Link href="/guide/data" className="hover:text-[#A6AEFF]">데이터 출처와 계산 기준 →</Link>
    </div>
  </GuidePageLayout>;
}
