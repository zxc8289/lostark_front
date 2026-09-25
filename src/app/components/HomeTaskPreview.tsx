import Link from "next/link";

export default function HomeTaskPreview({ party = false }: { party?: boolean }) {
  return <div className="w-full rounded-xl border border-white/5 bg-[#121318] p-4 text-sm">
    <p className="mb-3 text-xs font-bold text-[#A6AEFF]">{party ? "파티 진행도 미리보기" : "숙제 기록 미리보기"} · 예시</p>
    <div className="space-y-2">
      {(party ? [["파티원 A", "1관문 완료"], ["파티원 B", "2관문 준비"]] : [["캐릭터 A", "1관문 완료"], ["캐릭터 B", "레이드 예정"]]).map(([name, status]) => <div key={name} className="flex justify-between gap-3 rounded-lg border border-white/5 bg-[#16181D] p-3"><span className="text-gray-200">{name}</span><span className="text-[#A6AEFF]">{status}</span></div>)}
    </div>
    <p className="mt-3 text-xs leading-6 text-gray-400">{party ? "함께 진행할 캐릭터와 남은 관문을 공유하세요." : "캐릭터별 관문을 체크하고 남은 보상을 확인하세요."} 실제 계정 기록이 아닌 설명용 화면입니다.</p>
    <Link className="mt-3 inline-block rounded-lg bg-[#5B69FF] px-3 py-2 text-xs font-semibold text-white hover:bg-[#4957ed]" href={party ? "/party-tasks" : "/my-tasks"}>숙제 화면 열기 →</Link>
    <p className="mt-2 text-xs text-gray-400">로그인하지 않아도 샘플 데이터로 체험할 수 있습니다.</p>
  </div>;
}
