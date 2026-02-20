"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import Link from "next/link";
import { UsersRound, ChevronRight, User, Users, Clock, UserCheck } from "lucide-react";

/* ───────── 타입 및 컨텍스트 ───────── */
type PartyMember = { id: string; name: string | null; image: string | null; };
export type PartySummaryItem = { id: string; name: string; memberCount: number; members?: PartyMember[]; nextResetAt?: string | null; };
type PartyCtx = { loading: boolean; parties: PartySummaryItem[]; };
const HomePartyCtx = createContext<PartyCtx | null>(null);

function useHomeParty() {
    const v = useContext(HomePartyCtx);
    if (!v) throw new Error("HomePartySummaryProvider is missing");
    return v;
}

export default function HomePartySummaryProvider({ children }: { children: React.ReactNode }) {
    const [loading, setLoading] = useState(true);
    const [parties, setParties] = useState<PartySummaryItem[]>([]);

    useEffect(() => {
        let cancelled = false;
        async function fetchParties() {
            setLoading(true);
            try {
                const res = await fetch("/api/party-tasks/my-parties", { cache: "no-store" });
                if (!res.ok) { if (!cancelled) setParties([]); return; }
                const data = await res.json();
                const list = Array.isArray(data) ? data : (data?.parties ?? []);
                if (cancelled) return;
                setParties(list.map((p: any) => ({
                    id: String(p.id),
                    name: p.name,
                    memberCount: p.memberCount ?? p.members?.length ?? 0,
                    members: p.members ?? [],
                    nextResetAt: p.nextResetAt ?? null,
                })));
            } catch (e) {
                if (!cancelled) setParties([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        fetchParties();
        return () => { cancelled = true; };
    }, []);

    return <HomePartyCtx.Provider value={{ loading, parties }}>{children}</HomePartyCtx.Provider>;
}

export function HomePartyGuard({ children }: { children: React.ReactNode }) {
    const { loading, parties } = useHomeParty();

    if (loading) return <HomePartySkeleton />;

    if (parties.length === 0) return (
        <div className="flex-1 w-full flex flex-col items-center justify-center text-center rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-6">
            <UserCheck size={32} className="mx-auto mb-2 text-gray-600" />
            <p className="text-sm font-medium text-gray-400">참여 중인 파티가 없습니다.</p>
            <a
                href="/party-tasks"
                className="text-[11px] text-[#5B69FF] hover:underline mt-2 inline-block"
            >
                파티 숙제에서 등록하기 ›
            </a>
        </div>
    );

    return <>{children}</>;
}

/* ───────── [상단 요약] (🔥 수정됨: 최상단 1개만 표시) ───────── */
export function HomePartyHeader() {
    const { parties } = useHomeParty();
    // 🔹 [변경] slice(0, 2) -> slice(0, 1) : 맨 위 1개만 노출
    const head = parties.slice(0, 1);

    return (
        <div className="flex flex-col gap-4 w-full">
            {head.map((party) => <HomePartyRow key={party.id} party={party} />)}
        </div>
    );
}

/* ───────── [상세 내용] (🔥 수정됨: 2번째부터 나머지 표시) ───────── */
export function HomePartyDetails() {
    const { parties } = useHomeParty();
    // 🔹 [변경] slice(2) -> slice(1) : 2번째 데이터부터 끝까지 노출
    const rest = parties.slice(1);

    if (rest.length === 0) return (
        <div className="h-full flex items-center justify-center py-8 text-center text-[11px] text-gray-600 border border-dashed border-white/5 rounded-xl bg-white/[0.01]">
            추가 참여 파티가 없습니다.
        </div>
    );

    return (
        <div className="h-full min-h-0 overflow-y-auto custom-scrollbar pr-1 flex flex-col gap-4">
            {rest.map((party) => <HomePartyRow key={party.id} party={party} />)}
        </div>
    );
}

/* ───────── 개별 파티 카드 (기존 디자인 유지) ───────── */
function HomePartyRow({ party }: { party: PartySummaryItem }) {
    const [showNames, setShowNames] = useState(false);
    const members = party.members ?? [];
    const displayMembers = showNames ? members : members.slice(0, 6);
    const remainingCount = Math.max(0, party.memberCount - displayMembers.length);

    return (
        <Link href={`/party-tasks/${party.id}`} className="group relative flex flex-col justify-between rounded-xl border border-white/10 bg-[#16181D] p-5 text-left transition-all duration-300 min-h-[225px] hover:border-[#5B69FF]/50 overflow-visible h-full w-full">
            <div className="relative z-10 flex-1 flex flex-col">
                <div className="mb-2 flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3.5">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#1F222B] border border-white/5 text-[#5B69FF] group-hover:bg-[#5B69FF] group-hover:text-white transition-colors">
                                <Users size={22} />
                            </div>
                            <div className="min-w-0">
                                <h3 className="font-bold text-lg text-gray-100 group-hover:text-white transition-colors truncate">{party.name}</h3>
                                <span className="text-sm text-gray-500 font-medium">멤버 {party.memberCount}명</span>
                            </div>
                        </div>
                    </div>
                    <ChevronRight size={20} className="text-gray-600 group-hover:text-[#5B69FF] transition-colors shrink-0 ml-2 mt-1" />
                </div>
                <div className="h-px w-full bg-white/5 mt-1 mb-3" />
                <div className="flex-1 flex flex-col">
                    <div className="flex items-center justify-between mb-3" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                        <div className="flex items-center gap-1.5 text-gray-500">
                            <User size={14} /><span className="text-xs font-medium text-gray-400">참여 멤버</span>
                        </div>
                        <button type="button" onClick={() => setShowNames((v) => !v)} className={`text-[11px] font-medium transition-colors ${showNames ? "text-[#5B69FF]" : "text-gray-500 hover:text-gray-300"}`}>
                            닉네임 {showNames ? "숨기기" : "보기"}
                        </button>
                    </div>
                    <div className="min-h-[40px]">
                        {members.length === 0 ? <div className="text-xs text-gray-600 italic px-1">멤버 정보 없음</div> : showNames ? (
                            <div className="flex flex-wrap gap-2 animate-in fade-in zoom-in-95 duration-300">
                                {members.map((m) => (
                                    <div key={m.id} className="flex items-center gap-2 rounded-full border border-white/10 bg-black/40 pl-1 pr-3 py-1 hover:border-[#5B69FF]/30 transition-colors">
                                        <MemberAvatar member={m} className="h-7 w-7 rounded-full" />
                                        <span className="text-[11px] text-gray-300 font-medium truncate max-w-[90px]">{m.name || "이름없음"}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-2 duration-300">
                                <div className="flex -space-x-2.5 transition-all duration-300 hover:space-x-0.5">
                                    {displayMembers.map((m, idx) => (
                                        <MemberAvatar key={m.id} member={m} className="relative h-10 w-10 rounded-full ring-2 ring-[#16181D] group-hover:ring-[#1a1c20] transition-transform hover:scale-110 hover:z-10 bg-[#1F222B]" style={{ zIndex: 10 - idx }} />
                                    ))}
                                    {remainingCount > 0 && <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-800 text-[11px] font-bold text-gray-400 ring-2 ring-[#16181D]" style={{ zIndex: 0 }}>+{remainingCount}</div>}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                {party.nextResetAt && (
                    <div className="mt-4 pt-3 border-t border-dashed border-white/5 flex items-center justify-end">
                        <div className="inline-flex items-center gap-1.5 rounded-md bg-black/20 px-2 py-1 text-[10px] font-bold text-blue-400/70">
                            <Clock size={12} /><span>{party.nextResetAt} 초기화</span>
                        </div>
                    </div>
                )}
            </div>
        </Link>
    );
}

function MemberAvatar({ member, className, style }: { member: PartyMember; className?: string; style?: React.CSSProperties; }) {
    return (
        <div className={`group/avatar relative flex items-center justify-center cursor-help overflow-hidden ${className ?? ""}`} style={style}>
            <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900/95 px-2.5 py-1.5 text-[11px] font-semibold text-white backdrop-blur-sm opacity-0 transition-all duration-200 group-hover/avatar:opacity-100 group-hover/avatar:-translate-y-1 z-50 border border-white/10">
                {member.name || "이름 없음"}
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900/95" />
            </div>
            {member.image ? <img src={member.image} alt={member.name || ""} className="h-full w-full rounded-full object-cover bg-gray-800" /> : <div className="flex h-full w-full items-center justify-center rounded-full bg-gray-700 text-[10px] text-gray-300 font-bold uppercase">{(member.name || "?").slice(0, 1)}</div>}
        </div>
    );
}

/* ───────── [스켈레톤] (🔥 수정됨: 1개만 표시) ───────── */
function HomePartySkeleton() {
    return (
        <div className="flex-1 w-full animate-pulse flex flex-col gap-4">
            {/* 기본 1개만 로딩 보여줌 (헤더에 1개니까) */}
            {[0].map((i) => (
                <div key={i} className="flex-1 rounded-xl border border-white/10 bg-[#16181D] p-5 min-h-[200px]">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3"><div className="h-10 w-10 rounded-full bg-white/5" /><div className="space-y-2"><div className="h-3 w-36 bg-white/5 rounded" /><div className="h-2 w-20 bg-white/5 rounded" /></div></div>
                    </div>
                </div>
            ))}
        </div>
    );
}