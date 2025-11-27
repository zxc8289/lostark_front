// app/party-tasks/page.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
    Users,
    UsersRound,
    Plus,
    LogIn,
    RefreshCcw,
    Loader2,
    Clock,
    ChevronRight,
    User,
    Sparkles,
    ArrowRight,
} from "lucide-react";
import { signIn, useSession } from "next-auth/react";

/* ───────── 타입 ───────── */
type PartyMember = {
    id: string;
    name: string | null;
    image: string | null;
};

type PartySummary = {
    id: string;
    name: string;
    memberCount: number;
    raidCount: number;
    nextResetAt?: string | null;
    members?: PartyMember[];
};

type MyPartiesResponse = {
    parties: PartySummary[];
};

/* ───────── 메인 페이지 ───────── */

export default function PartyTasksPage() {
    const router = useRouter();
    const { data: session, status } = useSession();

    // 입력창 포커싱을 위한 ref
    const createInputRef = useRef<HTMLInputElement>(null);

    const [parties, setParties] = useState<PartySummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);

    const [createName, setCreateName] = useState("");
    const [createMemo, setCreateMemo] = useState("");

    const [joinCode, setJoinCode] = useState("");
    const [joining, setJoining] = useState(false);
    const [creating, setCreating] = useState(false);

    /* 내 파티 목록 불러오기 */
    useEffect(() => {
        let cancelled = false;

        if (status === "loading") return;

        if (status !== "authenticated") {
            setLoading(false);
            setParties([]);
            return;
        }

        async function loadParties() {
            setLoading(true);
            setErr(null);
            try {
                const res = await fetch("/api/party-tasks/my-parties", {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                    cache: "no-store",
                });

                if (!res.ok) {
                    throw new Error(`파티 목록을 불러오지 못했어요. (${res.status})`);
                }

                const data = (await res.json()) as MyPartiesResponse;
                if (!cancelled) {
                    setParties(data.parties ?? []);
                }
            } catch (e: any) {
                if (!cancelled) {
                    setErr(e?.message ?? "알 수 없는 오류가 발생했습니다.");
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        loadParties();
        return () => {
            cancelled = true;
        };
    }, [status]);

    const hasParties = parties.length > 0;

    /* 새 파티 만들기 */
    const handleCreateParty = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!createName.trim()) return;

        try {
            setCreating(true);
            setErr(null);

            const res = await fetch("/api/party-tasks/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: createName.trim(),
                    memo: createMemo.trim() || null,
                }),
            });

            if (!res.ok) {
                throw new Error("파티 생성에 실패했습니다.");
            }

            const data = await res.json();
            const partyId: string = data.id;

            router.push(`/party-tasks/${partyId}`);
        } catch (e: any) {
            setErr(e?.message ?? "파티 생성 중 오류가 발생했습니다.");
        } finally {
            setCreating(false);
        }
    };

    /* 초대 코드로 참가 */
    const handleJoinParty = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!joinCode.trim()) return;

        try {
            setJoining(true);
            setErr(null);

            const res = await fetch("/api/party-tasks/join", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: joinCode.trim() }),
            });

            if (!res.ok) {
                throw new Error("초대 코드로 파티에 참가하지 못했습니다.");
            }

            const data = await res.json();
            const partyId: string = data.id;

            router.push(`/party-tasks/${partyId}`);
        } catch (e: any) {
            setErr(e?.message ?? "파티 참가 중 오류가 발생했습니다.");
        } finally {
            setJoining(false);
        }
    };

    /* 헬퍼 함수: 입력창으로 포커스 이동 */
    const focusCreateInput = () => {
        createInputRef.current?.focus();
        // 부드러운 스크롤 이동
        createInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    };

    /* ───────── 렌더링 ───────── */

    if (status === "unauthenticated") {
        return (
            <div className="relative w-full min-h-[60vh] flex flex-col items-center justify-center text-gray-300 py-12 px-4 overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#5B69FF]/10 blur-[100px] rounded-full pointer-events-none" />

                <div className="relative z-10 mx-auto max-w-lg w-full space-y-8 text-center">
                    <div className="space-y-3">
                        <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-1.5 text-xs font-medium text-[#5B69FF] border border-[#5B69FF]/20">
                            <UsersRound className="h-3.5 w-3.5" />
                            <span>파티 숙제 관리</span>
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl text-white">
                            파티원들과 숙제를 <br />
                            <span className="text-[#5B69FF]">한눈에 공유하세요</span>
                        </h1>
                        <p className="text-sm text-gray-400 leading-relaxed">
                            매번 레이드 현황을 물어볼 필요 없이, <br />
                            실시간으로 파티원들의 레이드 진행 상황을 확인해보세요.
                        </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-[#16181D]/80 backdrop-blur-md p-8 shadow-2xl">
                        <button
                            onClick={() => signIn("discord")}
                            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#5865F2] px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#5865F2]/25 hover:bg-[#4752C4] hover:scale-[1.02] transition-all duration-200"
                        >
                            <LogIn className="h-5 w-5" />
                            Discord로 시작하기
                        </button>
                        <p className="mt-4 text-xs text-gray-500">
                            로그인하면 파티를 생성하고 관리할 수 있습니다.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full text-gray-300 py-8 sm:py-12 px-4 sm:px-6">
            <div className="mx-auto max-w-7xl space-y-8">
                {/* 헤더 영역 */}
                <div className="relative">
                    <div className="absolute -top-10 -left-10 w-64 h-64 rounded-full pointer-events-none" />

                    <div className="relative flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                        <div className="space-y-2">
                            <div className="inline-flex items-center gap-2 text-xs font-medium text-[#5B69FF]">
                                <UsersRound className="h-4 w-4" />
                                <span>파티 숙제 관리할</span>
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                                파티 숙제
                            </h1>
                            <p className="text-sm text-gray-400 max-w-lg">
                                내 설정을 불러와 파티원들과 공유합니다. 파티를 선택해 상세 현황을
                                확인하세요.
                            </p>
                        </div>
                    </div>
                </div>

                {err && (
                    <div className="flex items-center gap-3 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                        <RefreshCcw className="h-4 w-4 shrink-0" />
                        <span className="flex-1">{err}</span>
                        <button
                            onClick={() => window.location.reload()}
                            className="underline hover:text-white"
                        >
                            새로고침
                        </button>
                    </div>
                )}

                {/* 메인 컨텐츠 영역 */}
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
                    {/* 왼쪽: 파티 목록 */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                                참여 중인 파티
                                {!loading && (
                                    <span className="inline-flex items-center justify-center rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium text-gray-400">
                                        {parties.length}
                                    </span>
                                )}
                            </h2>
                        </div>

                        {loading ? (
                            // ───────── 로딩 스켈레톤 ─────────
                            <div className="grid gap-4 sm:grid-cols-2">
                                {[1, 2, 3, 4].map((i) => (
                                    <div
                                        key={i}
                                        className="h-[180px] rounded-xl border border-white/5 bg-[#16181D] p-5 animate-pulse"
                                    >
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="h-10 w-10 rounded-full bg-white/5" />
                                            <div className="space-y-2 flex-1">
                                                <div className="h-4 w-1/2 rounded bg-white/5" />
                                                <div className="h-3 w-1/3 rounded bg-white/5" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="h-8 w-full rounded bg-white/5" />
                                            <div className="h-3 w-1/4 rounded bg-white/5" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : hasParties ? (
                            // ───────── 파티 목록 ─────────
                            <div className="grid gap-4 sm:grid-cols-2">
                                {parties.map((p) => (
                                    <PartyCard
                                        key={p.id}
                                        party={p}
                                        onClick={() => router.push(`/party-tasks/${p.id}`)}
                                    />
                                ))}

                                {/* ★ 추가: 파티가 적을 때 보여주는 프로모션 카드 (4개 미만일 때 노출) */}
                                {parties.length < 4 && (
                                    <AddPartyPromoCard onClick={focusCreateInput} />
                                )}
                            </div>
                        ) : (
                            // ───────── 파티 없음 (Empty State) ─────────
                            <div className="rounded-2xl border border-dashed border-white/10 bg-[#16181D]/50 p-10 text-center">
                                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
                                    <Users className="h-8 w-8 text-gray-600" />
                                </div>
                                <h3 className="text-lg font-semibold text-white">
                                    참여 중인 파티가 없어요
                                </h3>
                                <p className="mt-1 text-sm text-gray-400">
                                    오른쪽 메뉴에서 새 파티를 만들거나 코드로 참여해보세요.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* 오른쪽: 사이드바 (생성/참여) */}
                    <div className="flex flex-col gap-6">
                        {/* 새 파티 만들기 위젯 */}
                        <div className="rounded-xl border border-white/10 bg-[#16181D] p-5 shadow-lg">
                            <div className="mb-4 flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#5B69FF]/10 text-[#5B69FF]">
                                    <Plus className="h-5 w-5" />
                                </div>
                                <h3 className="font-semibold text-white">새 파티 만들기</h3>
                            </div>

                            <form onSubmit={handleCreateParty} className="space-y-3">
                                <input
                                    ref={createInputRef} /* 포커싱을 위한 ref 연결 */
                                    type="text"
                                    placeholder="파티 이름 (예: 수요일 고정팟)"
                                    value={createName}
                                    onChange={(e) => setCreateName(e.target.value)}
                                    className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white placeholder:text-gray-600 focus:border-[#5B69FF] focus:outline-none focus:ring-1 focus:ring-[#5B69FF] transition-all"
                                />
                                <textarea
                                    placeholder="메모 (선택 사항)"
                                    value={createMemo}
                                    onChange={(e) => setCreateMemo(e.target.value)}
                                    rows={2}
                                    className="w-full resize-none rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white placeholder:text-gray-600 focus:border-[#5B69FF] focus:outline-none focus:ring-1 focus:ring-[#5B69FF] transition-all"
                                />
                                <button
                                    type="submit"
                                    disabled={!createName.trim() || creating}
                                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#5B69FF] py-2.5 text-sm font-semibold text-white hover:bg-[#4A57E6] hover:shadow-lg hover:shadow-[#5B69FF]/20 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:shadow-none transition-all"
                                >
                                    {creating ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        "파티 생성하기"
                                    )}
                                </button>
                            </form>
                        </div>

                        {/* 코드 참여 위젯 */}
                        <div className="rounded-xl border border-white/10 bg-[#16181D] p-5 shadow-lg">
                            <div className="mb-4 flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-gray-300">
                                    <LogIn className="h-4 w-4" />
                                </div>
                                <h3 className="font-semibold text-white">초대 코드로 참여</h3>
                            </div>

                            <form onSubmit={handleJoinParty} className="space-y-3">
                                <div>
                                    <input
                                        type="text"
                                        placeholder="초대 코드 (예: X8K2-99A1)"
                                        value={joinCode}
                                        onChange={(e) => setJoinCode(e.target.value)}
                                        className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white placeholder:text-gray-600 focus:border-[#5B69FF] focus:outline-none focus:ring-1 focus:ring-[#5B69FF] transition-all"
                                    />
                                    <p className="mt-1.5 text-[11px] text-gray-500">
                                        파티장에게 공유받은 코드를 입력하세요.
                                    </p>
                                </div>
                                <button
                                    type="submit"
                                    disabled={!joinCode.trim() || joining}
                                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-white/10 py-2.5 text-sm font-semibold text-gray-200 hover:bg-white/15 disabled:cursor-not-allowed disabled:bg-gray-800 transition-all"
                                >
                                    {joining ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        "참여하기"
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ───────── 서브 컴포넌트: 파티 카드 & 아바타 ───────── */

function PartyCard({
    party,
    onClick,
}: {
    party: PartySummary;
    onClick: () => void;
}) {
    const [showNames, setShowNames] = useState(false);
    const members = party.members || [];
    const displayMembers = showNames ? members : members.slice(0, 6);
    const remainingCount = Math.max(0, party.memberCount - displayMembers.length);

    return (
        <div
            onClick={onClick}
            className="group relative flex flex-col justify-between rounded-xl border border-white/10 bg-[#16181D] p-5 text-left transition-all duration-300 hover:border-[#5B69FF]/50 hover:shadow-[0_0_30px_-10px_rgba(91,105,255,0.15)] hover:-translate-y-1 cursor-pointer overflow-hidden"
        >
            <div className="absolute inset-0 bg-gradient-to-br from-[#5B69FF]/0 via-[#5B69FF]/0 to-[#5B69FF]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

            <div className="relative z-10 flex-1 flex flex-col">
                {/* 상단 헤더 */}
                <div className="mb-4 flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1F222B] border border-white/5 text-[#5B69FF] group-hover:bg-[#5B69FF] group-hover:text-white transition-colors">
                                <Users className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                                <h3 className="font-bold text-gray-100 group-hover:text-white transition-colors truncate">
                                    {party.name}
                                </h3>
                                <span className="text-xs text-gray-500">
                                    멤버 {party.memberCount}명 · 레이드 {party.raidCount}개
                                </span>
                            </div>
                        </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-600 group-hover:text-[#5B69FF] transition-colors shrink-0 ml-2" />
                </div>

                <div className="h-px w-full bg-white/5 my-3" />

                {/* 멤버 섹션 */}
                <div className="flex-1 flex flex-col">
                    <div
                        className="flex items-center justify-between mb-3"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-gray-500" />
                            <span className="text-xs font-medium text-gray-400">
                                참여 멤버
                            </span>
                        </div>
                        <button
                            onClick={() => setShowNames(!showNames)}
                            className="group/toggle flex items-center gap-2 focus:outline-none"
                        >
                            <span
                                className={`text-[10px] font-medium transition-colors ${showNames ? "text-[#5B69FF]" : "text-gray-500"
                                    }`}
                            >
                                닉네임 {showNames ? "숨기기" : "보기"}
                            </span>
                            <div
                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 border border-transparent ${showNames
                                    ? "bg-[#5B69FF]"
                                    : "bg-gray-700 group-hover/toggle:bg-gray-600"
                                    }`}
                            >
                                <span
                                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${showNames ? "translate-x-4.5" : "translate-x-1"
                                        }`}
                                />
                            </div>
                        </button>
                    </div>

                    <div className="min-h-[36px]">
                        {showNames ? (
                            // 1. 펼침 상태
                            <div className="flex flex-wrap gap-2 animate-in fade-in zoom-in-95 duration-200">
                                {members.map((m) => (
                                    <div
                                        key={m.id}
                                        className="flex items-center gap-2 rounded-full border border-white/10 bg-black/20 pl-1 pr-3 py-1 hover:bg-white/5 transition-colors"
                                    >
                                        <MemberAvatar
                                            member={m}
                                            className="h-6 w-6 rounded-full"
                                        />
                                        <span className="text-xs text-gray-300 max-w-[80px] truncate">
                                            {m.name || "이름없음"}
                                        </span>
                                    </div>
                                ))}
                                {remainingCount > 0 && (
                                    <span className="flex items-center text-xs text-gray-500 px-1">
                                        +{remainingCount}명
                                    </span>
                                )}
                            </div>
                        ) : (
                            // 2. 닫힘 상태
                            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-200">
                                <div className="flex -space-x-2.5 hover:space-x-1 transition-all duration-300">
                                    {displayMembers.map((m) => (
                                        <MemberAvatar
                                            key={m.id}
                                            member={m}
                                            className="relative h-8 w-8 rounded-full ring-2 ring-[#16181D] transition-transform hover:scale-110 hover:z-10 bg-[#16181D]"
                                        />
                                    ))}
                                </div>
                                {remainingCount > 0 && (
                                    <span className="text-xs font-medium text-gray-500">
                                        +{remainingCount}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {party.nextResetAt && (
                    <div className="mt-4 pt-3 border-t border-dashed border-white/5 flex items-center justify-end">
                        <div className="inline-flex items-center gap-1.5 rounded-md bg-black/20 px-2 py-1 text-[11px] text-gray-500">
                            <Clock className="h-3 w-3" />
                            <span>초기화: {party.nextResetAt}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// 툴팁이 포함된 아바타
function MemberAvatar({
    member,
    className,
}: {
    member: PartyMember;
    className?: string;
}) {
    return (
        <div
            className={`group/avatar flex items-center justify-center cursor-help ${className}`}
        >
            <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900/95 px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-xl backdrop-blur-sm opacity-0 transition-all duration-200 group-hover/avatar:opacity-100 group-hover/avatar:-translate-y-1 z-50 border border-white/10">
                {member.name || "이름 없음"}
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900/95" />
            </div>

            {member.image ? (
                <img
                    src={member.image}
                    alt={member.name || ""}
                    className="h-full w-full rounded-full object-cover bg-gray-800"
                />
            ) : (
                <div className="flex h-full w-full items-center justify-center rounded-full bg-gray-700 text-[10px] text-gray-300">
                    {(member.name || "?").slice(0, 2)}
                </div>
            )}
        </div>
    );
}

function AddPartyPromoCard({ onClick }: { onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className="group relative flex h-full min-h-[180px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-center transition-all duration-300 hover:border-[#5B69FF]/40 hover:bg-white/[0.04] hover:scale-[1.01]"
        >
            {/* 반짝이는 효과 아이콘 */}
            <div className="relative mb-1">
                <div className="absolute -inset-2 bg-[#5B69FF]/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-gray-400 group-hover:bg-[#5B69FF] group-hover:text-white transition-all duration-300">
                    <Sparkles className="h-5 w-5" />
                </div>
            </div>

            <div className="space-y-1">
                <h3 className="text-sm font-semibold text-gray-300 group-hover:text-white transition-colors">
                    새로운 파티가 있나요?
                </h3>
                <p className="text-xs text-gray-500 max-w-[200px] leading-relaxed">
                    배럭 파티나 다른 고정 파티를 추가하고,<br /> 친구를 초대해 보세요.
                </p>
            </div>

            <div className="mt-2 flex items-center gap-1 text-[11px] font-medium text-[#5B69FF] opacity-70 group-hover:opacity-100 transition-opacity">
                파티 만들기 <ArrowRight className="h-3 w-3" />
            </div>
        </button>
    );
}