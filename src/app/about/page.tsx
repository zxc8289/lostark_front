import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, CalendarCheck, Calculator, Gem, ShieldCheck, UsersRound } from "lucide-react";

export const metadata: Metadata = {
  title: "로아체크 소개",
  description:
    "로아체크가 제공하는 로스트아크 숙제 관리, 파티 공유, 레이드 보상 정보, 계산기 기능과 운영 원칙을 소개합니다.",
  openGraph: {
    title: "로아체크 소개 - 로스트아크 플레이 보조 도구",
    description:
      "로아체크는 로스트아크 유저가 주간 숙제, 파티 진행도, 레이드 보상, 더보기 효율, 경매 입찰 판단을 쉽게 정리하도록 돕는 독립 도구입니다.",
    url: "https://loacheck.com/about",
  },
};

const featureGroups = [
  {
    icon: CalendarCheck,
    title: "주간 숙제 관리",
    body: "여러 캐릭터를 운영할 때 가장 자주 놓치는 부분은 어떤 캐릭터가 어느 레이드를 완료했는지입니다. 로아체크는 캐릭터별 레이드 진행 상태와 골드 획득 여부를 정리해, 주간 초기화 후 남은 일정을 빠르게 확인할 수 있도록 설계했습니다.",
  },
  {
    icon: UsersRound,
    title: "파티 진행도 공유",
    body: "고정 공대나 지인 파티처럼 여러 명이 같은 레이드를 반복해서 진행하는 경우, 파티 숙제 기능으로 진행 상태를 함께 볼 수 있습니다. 개별 메신저에 매번 체크 현황을 적는 과정을 줄이고, 한 화면에서 누가 어떤 관문을 남겼는지 확인하는 데 초점을 맞췄습니다.",
  },
  {
    icon: Calculator,
    title: "레이드 판단 계산기",
    body: "더보기 효율, 경매 입찰, 딜 지분처럼 플레이 중 반복적으로 계산하게 되는 값을 한곳에서 비교할 수 있습니다. 계산 결과는 게임 내 상황과 시세 변동을 함께 고려해야 하는 참고 지표로 제공됩니다.",
  },
  {
    icon: Gem,
    title: "젬 세팅 보조",
    body: "보유한 젬과 목표 포인트를 기준으로 가능한 조합을 찾아보는 기능입니다. 포인트 우선, 스탯 우선, 균형형처럼 목적에 따라 결과를 다르게 해석할 수 있도록 구성했습니다.",
  },
];

export default function AboutPage() {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-0 pt-10 md:pt-16 pb-16 text-gray-300 space-y-12">
      <section className="space-y-5 border-b border-white/5 pb-10">
        <span className="inline-flex items-center gap-2 text-xs font-bold text-blue-400">
          <BookOpen size={16} />
          ABOUT LOACHECK
        </span>
        <div className="space-y-4">
          <h1 className="text-3xl md:text-5xl font-black text-gray-100 tracking-tight">
            로아체크는 로스트아크 유저를 위한 플레이 기록 정리 도구입니다.
          </h1>
          <p className="text-sm md:text-base text-gray-400 leading-8 max-w-4xl">
            로아체크는 로스트아크를 플레이하면서 반복적으로 확인하게 되는 숙제 진행도,
            레이드 보상, 더보기 효율, 경매 입찰, 딜 지분 계산을 한곳에서 다루기 위해 만든
            독립 웹 서비스입니다. 단순히 외부 링크를 모아두는 것이 아니라, 실제 플레이
            흐름에서 필요한 판단 과정을 줄이는 데 목적을 두고 있습니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link href="/guide" className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-bold hover:bg-blue-500 transition-colors">
            이용 가이드
          </Link>
          <Link href="/articles" className="px-4 py-2 rounded-md bg-white/5 text-gray-200 text-sm font-bold hover:bg-white/10 transition-colors">
            정보 글 보기
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
        {featureGroups.map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.title} className="bg-[#16181D] border border-white/5 rounded-lg p-5 md:p-6 space-y-4">
              <div className="w-10 h-10 rounded-md bg-blue-600/10 text-blue-400 flex items-center justify-center">
                <Icon size={20} />
              </div>
              <div className="space-y-2">
                <h2 className="text-lg font-bold text-gray-100">{item.title}</h2>
                <p className="text-sm text-gray-400 leading-7">{item.body}</p>
              </div>
            </article>
          );
        })}
      </section>

      <section className="space-y-5">
        <div className="flex items-center gap-2 text-blue-400">
          <ShieldCheck size={20} />
          <h2 className="text-xl md:text-2xl font-black text-gray-100">운영 원칙</h2>
        </div>
        <div className="space-y-4 text-sm text-gray-400 leading-8">
          <p>
            로아체크는 스마일게이트 RPG와 제휴하거나 공식 인증을 받은 서비스가 아닙니다.
            게임 데이터와 이미지는 각 권리자에게 귀속되며, 서비스는 공개 API와 사용자가
            입력한 정보를 바탕으로 편의 기능을 제공합니다.
          </p>
          <p>
            계산 결과는 빠른 판단을 돕기 위한 참고 자료입니다. 실제 레이드 환경에서는
            시너지, 숙련도, 관문 패턴, 파티 구성, 거래소 시세 변동에 따라 결과 해석이
            달라질 수 있습니다. 중요한 재화 사용이나 입찰 판단을 할 때는 게임 내 현재
            가격과 함께 확인하는 것을 권장합니다.
          </p>
          <p>
            개인정보와 계정 정보는 서비스 제공에 필요한 범위에서만 다루며, 자세한 기준은
            개인정보 처리방침과 이용약관에 정리되어 있습니다.
          </p>
        </div>
      </section>
    </div>
  );
}
