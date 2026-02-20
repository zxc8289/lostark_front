"use client";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
    Users,
    UsersRound,
    RefreshCcw,
    Loader2,
    Clock,
    ChevronRight,
    User,
    Sparkles,
    ArrowRight,
    Swords,
    Ticket,
    X,
    Crown,
    PenLine,
    FileText,
    Gamepad2,
} from "lucide-react";
import { signIn, useSession } from "next-auth/react";
import GoogleAd from "../components/GoogleAd";

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
    const { status } = useSession();

    const [parties, setParties] = useState<PartySummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);

    const [createName, setCreateName] = useState("");
    const [createMemo, setCreateMemo] = useState("");
    const [joinCode, setJoinCode] = useState<string[]>(Array(8).fill(""));
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    const [joining, setJoining] = useState(false);
    const [creating, setCreating] = useState(false);

    // 모달 상태
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [joinModalOpen, setJoinModalOpen] = useState(false);

    const AD_SLOT_MAIN_BANNER = "9374629732";

    // 한 글자 정규화: 영문/숫자만, 대문자로
    const normalizeChar = (v: string) =>
        v.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 1);

    // 각 칸 입력 변경
    const handleInputChange = (index: number, raw: string) => {
        const ch = normalizeChar(raw);

        setJoinCode((prev) => {
            const next = [...prev];
            next[index] = ch;
            return next;
        });

        if (ch && index < 7) {
            const nextInput = inputRefs.current[index + 1];
            if (nextInput) {
                nextInput.focus();
                nextInput.select();
            }
        }
    };

    // 백스페이스/화살표 처리
    const handleKeyDown = (
        index: number,
        e: React.KeyboardEvent<HTMLInputElement>
    ) => {
        if (e.key === "Backspace") {
            e.preventDefault();
            setJoinCode((prev) => {
                const next = [...prev];
                if (next[index]) {
                    next[index] = "";
                } else if (index > 0) {
                    next[index - 1] = "";
                    const prevInput = inputRefs.current[index - 1];
                    if (prevInput) {
                        prevInput.focus();
                        prevInput.select();
                    }
                }
                return next;
            });
        }

        if (e.key === "ArrowLeft" && index > 0) {
            e.preventDefault();
            const prev = inputRefs.current[index - 1];
            if (prev) {
                prev.focus();
                prev.select();
            }
        }

        if (e.key === "ArrowRight" && index < 7) {
            e.preventDefault();
            const next = inputRefs.current[index + 1];
            if (next) {
                next.focus();
                next.select();
            }
        }
    };

    // 붙여넣기(맨 앞 칸에서만)
    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        const text = e.clipboardData.getData("text") || "";
        const cleaned = text.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 8);
        if (!cleaned) return;

        const chars = cleaned.split("");

        setJoinCode(() => {
            const next = Array(8)
                .fill("")
                .map((_, i) => chars[i] ?? "");
            return next;
        });

        const lastIndex = Math.min(chars.length - 1, 7);
        const target = inputRefs.current[lastIndex >= 0 ? lastIndex : 0];

        if (target) {
            requestAnimationFrame(() => {
                target.focus();
                target.select();
            });
        }
    };

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

            setCreateModalOpen(false);
            setCreateName("");
            setCreateMemo("");
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
        const code = joinCode.join("");
        if (code.length < 8) return;

        try {
            setJoining(true);
            setErr(null);

            const res = await fetch("/api/party-tasks/join", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code }),
            });

            if (!res.ok) {
                throw new Error("초대 코드로 파티에 참가하지 못했습니다.");
            }

            const data = await res.json();
            const partyId: string = data.id;

            setJoinModalOpen(false);
            setJoinCode(Array(8).fill(""));
            router.push(`/party-tasks/${partyId}`);
        } catch (e: any) {
            setErr(e?.message ?? "파티 참가 중 오류가 발생했습니다.");
        } finally {
            setJoining(false);
        }
    };

    if (status === "unauthenticated") {
        return (
            <div className="relative w-full min-h-[60vh] flex flex-col items-center justify-center text-gray-300 py-12 px-4 overflow-hidden">
                <div className="absolute top-4/7 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#5B69FF]/10 blur-[100px] rounded-full pointer-events-none" />
                <div className="relative z-10 mx-auto max-w-lg w-full space-y-8 text-center mt-32">
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
                            <Gamepad2 className="h-5 w-5" />
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
        <div className="w-full text-white py-8 sm:py-12">
            <div className="mx-auto max-w-7xl space-y-4 ">
                {/* 헤더 */}
                <div className="relative pb-7">
                    <div className="absolute -top-10 -left-10 w-64 h-64 rounded-full pointer-events-none" />
                    <div className="relative px-4 sm:px-0 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                        <div className="space-y-2">
                            <div className="inline-flex items-center gap-2 text-xs font-medium text-[#5B69FF]">
                                <UsersRound className="h-4 w-4" />
                                <span>파티 숙제 관리</span>
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                                파티 숙제
                            </h1>
                            <p className="text-sm text-gray-400 max-w-lg">
                                내 설정을 불러와 파티원들과 공유합니다. 파티를 선택해 상세 현황을 확인하세요.
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

                {/* 참여 중인 파티 요약 카드 & 액션 버튼 */}
                <div className="bg-[#16181D] rounded-none sm:rounded-md px-4 sm:px-5 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 border border-white/5">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <h2 className="text-base sm:text-xl font-semibold text-white">
                                    참여 중인 파티
                                </h2>
                                {!loading && (
                                    <span className="inline-flex items-center justify-center rounded-full bg-white/10 px-2 py-0.5 text-[12px] font-medium text-gray-400">
                                        총 {parties.length}개
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="sm:ml-auto flex flex-wrap items-center gap-3">
                        <button
                            onClick={() => setCreateModalOpen(true)}
                            className="group inline-flex items-center justify-center py-2.5 px-4 rounded-lg bg-[#5B69FF] text-white hover:bg-[#4A57E6] hover:shadow-lg hover:shadow-[#5B69FF]/25 hover:-translate-y-0.5 transition-all duration-200 text-sm font-semibold gap-2"
                        >
                            <Swords className="h-4 w-4" />
                            <span>파티 만들기</span>
                        </button>
                        <button
                            onClick={() => setJoinModalOpen(true)}
                            className="group inline-flex items-center justify-center py-2.5 px-4 rounded-lg bg-[#2B2D36] text-gray-200 border border-white/10 hover:bg-[#343741] hover:text-white hover:border-white/20 transition-all duration-200 text-sm font-medium gap-2"
                        >
                            <Ticket className="h-4 w-4" />
                            <span>코드로 참여</span>
                        </button>
                    </div>
                </div>

                {/* 메인 컨텐츠: 파티 카드들 */}
                <div className="space-y-6">
                    {loading ? (
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 sm:px-0">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <div key={i} className="h-[240px] rounded-xl border border-white/5 bg-[#16181D] p-5 animate-pulse" />
                            ))}
                        </div>
                    ) : hasParties ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 items-stretch sm:px-0">
                            {parties.map((p) => (
                                <PartyCard
                                    key={p.id}
                                    party={p}
                                    onClick={() => router.push(`/party-tasks/${p.id}`)}
                                />
                            ))}

                            <AddPartyPromoCard onCreateClick={() => setCreateModalOpen(true)} />

                            <div className="w-full h-[240px] rounded-xl border border-white/10 bg-[#16181D] overflow-hidden flex items-center justify-center relative">
                                <GoogleAd
                                    slot={AD_SLOT_MAIN_BANNER}
                                    className="!my-0 w-full h-full"
                                    responsive={true}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-dashed border-white/10 bg-[#16181D]/50 p-16 text-center">
                            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
                                <Users className="h-8 w-8 text-gray-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-white">참여 중인 파티가 없어요</h3>
                            <p className="mt-1 text-sm text-gray-400">
                                상단의 <span className="text-[#5B69FF]">파티 만들기</span> 버튼을 눌러 파티를
                                생성하거나,
                                <br />
                                초대 코드를 받아 참여해보세요.
                            </p>
                        </div>
                    )}
                </div>

                {/* ───────── 모달들 (생성, 참가) ───────── */}
                {createModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4 animate-in fade-in duration-200">
                        <div className="w-full max-w-md overflow-hidden rounded-2xl bg-[#1E2028] border border-white/10 shadow-2xl animate-in zoom-in-95 duration-200">
                            <div className="relative bg-[#252832] px-6 py-6 border-b border-white/5">
                                <button
                                    onClick={() => setCreateModalOpen(false)}
                                    className="absolute top-4 right-4 p-1 text-gray-500 hover:text-white transition-colors"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                                <div className="flex flex-col items-center text-center gap-3">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#5B69FF] to-[#3B49DF] text-white shadow-lg shadow-[#5B69FF]/30">
                                        <Crown className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white">새 파티 생성</h3>
                                        <p className="text-xs text-gray-400 mt-1">
                                            파티를 만들어 레이드 현황을 관리하세요.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6">
                                <form onSubmit={handleCreateParty} className="space-y-4">
                                    <div className="space-y-3">
                                        <div className="relative group">
                                            <div className="pointer-events-none absolute left-3 top-3 text-gray-500 group-focus-within:text-[#5B69FF] transition-colors">
                                                <PenLine className="h-5 w-5" />
                                            </div>
                                            <input
                                                type="text"
                                                placeholder="파티 이름 (예: 수요일 고정팟)"
                                                value={createName}
                                                onChange={(e) => setCreateName(e.target.value)}
                                                className="w-full rounded-xl border border-white/10 bg-black/20 pl-10 pr-4 py-3 text-sm text-white placeholder:text-gray-600 focus:border-[#5B69FF] focus:outline-none focus:ring-1 focus:ring-[#5B69FF] transition-all"
                                            />
                                        </div>
                                        <div className="relative group">
                                            <div className="pointer-events-none absolute left-3 top-3 text-gray-500 group-focus-within:text-[#5B69FF] transition-colors">
                                                <FileText className="h-5 w-5" />
                                            </div>
                                            <textarea
                                                placeholder="메모 (선택 사항 - 파티 목표 등)"
                                                value={createMemo}
                                                onChange={(e) => setCreateMemo(e.target.value)}
                                                rows={3}
                                                className="w-full resize-none rounded-xl border border-white/10 bg-black/20 pl-10 pr-4 py-3 text-sm text-white placeholder:text-gray-600 focus:border-[#5B69FF] focus:outline-none focus:ring-1 focus:ring-[#5B69FF] transition-all"
                                            />
                                        </div>
                                    </div>
                                    <div className="pt-2 flex gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setCreateModalOpen(false)}
                                            className="flex-1 rounded-xl bg-white/5 py-3 text-sm font-semibold text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
                                        >
                                            취소
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={!createName.trim() || creating}
                                            className="flex-[2] flex items-center justify-center gap-2 rounded-xl bg-[#5B69FF] py-3 text-sm font-semibold text-white hover:bg-[#4A57E6] hover:shadow-lg hover:shadow-[#5B69FF]/20 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:shadow-none disabled:text-gray-400 transition-all"
                                        >
                                            {creating ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <>
                                                    <span>파티 만들기</span>
                                                    <ArrowRight className="h-4 w-4" />
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}
                {joinModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4 animate-in fade-in duration-200">
                        <div className="w-full max-w-[600px] overflow-hidden rounded-2xl bg-[#1E2028] border border-white/10 shadow-2xl animate-in zoom-in-95 duration-200">
                            <div className="relative bg-[#252832] px-6 py-6 border-b border-white/5">
                                <button
                                    onClick={() => setJoinModalOpen(false)}
                                    className="absolute top-4 right-4 p-1 text-gray-500 hover:text-white transition-colors"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                                <div className="flex flex-col items-center text-center gap-3">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#10B981] to-[#059669] text-white shadow-lg shadow-[#10B981]/30">
                                        <Ticket className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white">초대 코드로 참여</h3>
                                        <p className="text-xs text-gray-400 mt-1">
                                            공유받은 8자리 코드를 입력해 파티에 합류하세요.
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="p-8">
                                <form onSubmit={handleJoinParty} className="space-y-8">
                                    <div className="flex justify-center gap-1 sm:gap-3">
                                        {[...Array(8)].map((_, index) => (
                                            <input
                                                key={index}
                                                ref={(el) => { inputRefs.current[index] = el; }}
                                                type="text"
                                                maxLength={1}
                                                value={joinCode[index] || ""}
                                                onChange={(e) => handleInputChange(index, e.target.value)}
                                                onKeyDown={(e) => handleKeyDown(index, e)}
                                                onPaste={index === 0 ? handlePaste : undefined}
                                                className={`w-9.5 h-9.5 sm:w-14 sm:h-14 text-center text-xl sm:text-2xl font-bold rounded-lg border bg-black/20 text-white transition-all caret-[#10B981] ${joinCode[index] ? 'border-[#10B981] shadow-[0_0_15px_rgba(16,185,129,0.25)]' : 'border-white/10 hover:border-white/30'} focus:border-[#10B981] focus:outline-none focus:ring-1 focus:ring-[#10B981]`}
                                            />
                                        ))}
                                    </div>
                                    <div className="flex gap-3">
                                        <button type="button" onClick={() => setJoinModalOpen(false)} className="flex-1 rounded-xl bg-white/5 py-3 text-sm font-semibold text-gray-400 hover:bg-white/10 hover:text-white transition-colors">취소</button>
                                        <button type="submit" className="flex-[2] flex items-center justify-center gap-2 rounded-xl bg-[#5B69FF] py-3 text-sm font-semibold text-white hover:bg-[#4A57E6] hover:shadow-lg hover:shadow-[#5B69FF]/20 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:shadow-none disabled:text-gray-400 transition-all"
                                            disabled={joinCode.join("").length < 8 || joining}>
                                            {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : <><span>입장하기</span><ArrowRight className="h-4 w-4" /></>}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ───────── 수정된 PartyCard 컴포넌트 ───────── */

function PartyCard({
    party,
    onClick,
}: {
    party: PartySummary;
    onClick: () => void;
}) {
    const [showNames, setShowNames] = useState(false);

    // API에서 받은 전체 멤버 리스트 사용 (자르는 로직 없음)
    const members = party.members || [];

    return (
        <div
            onClick={onClick}
            className="group relative flex flex-col min-h-[230px] justify-between rounded-none sm:rounded-xl border border-white/10 bg-[#16181D] p-5 text-left transition-all duration-300 hover:border-[#5B69FF]/50 hover:shadow-[0_0_30px_-10px_rgba(91,105,255,0.15)] hover:-translate-y-1 cursor-pointer overflow-hidden"
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
                                    멤버 {party.memberCount}명
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
                            <span className="text-xs font-medium text-gray-400">참여 멤버</span>
                        </div>
                        <button
                            onClick={() => setShowNames(!showNames)}
                            className="group/toggle flex items-center gap-2 focus:outline-none"
                        >
                            <span
                                className={`text-[10px] font-medium transition-colors ${showNames ? "text-[#5B69FF]" : "text-gray-500"}`}
                            >
                                닉네임 {showNames ? "숨기기" : "보기"}
                            </span>
                        </button>
                    </div>

                    <div className="min-h-[40px]">
                        {showNames ? (
                            // 펼침 상태 (이름 보이기)
                            <div className="flex flex-wrap gap-2 animate-in fade-in zoom-in-95 duration-200">
                                {members.map((m) => (
                                    <div
                                        key={m.id}
                                        className="flex items-center gap-2 rounded-full border border-white/10 bg-black/20 pl-1 pr-3 py-1.5 hover:bg-white/5 transition-colors"
                                    >
                                        <MemberAvatar member={m} className="h-8 w-8 rounded-full" />
                                        <span className="text-xs text-gray-300 max-w-[80px] truncate">
                                            {m.name || "이름없음"}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            // 닫힘 상태 (아바타만 겹쳐 보이기)
                            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-200">
                                {/* [변경] gap-y-2 추가: 줄바꿈 시 윗줄과 아랫줄 간격 확보 */}
                                {/* [변경] flex-wrap: 인원이 많으면 다음 줄로 넘김 */}
                                <div className="flex flex-wrap -space-x-3 gap-y-2 hover:space-x-1 transition-all duration-300">
                                    {members.map((m) => (
                                        <MemberAvatar
                                            key={m.id}
                                            member={m}
                                            className="relative h-10 w-10 rounded-full ring-2 ring-[#16181D] transition-transform hover:scale-110 hover:z-10 bg-[#16181D]"
                                        />
                                    ))}
                                </div>
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

function AddPartyPromoCard({ onCreateClick }: { onCreateClick: () => void }) {
    return (
        <button
            onClick={onCreateClick}
            className="group relative flex h-full min-h-[240px] flex-col items-center justify-center gap-3 sm:rounded-xl rounded-none border border-dashed border-white/10 bg-white/[0.02]  text-center transition-all duration-300 hover:border-[#5B69FF]/40 hover:bg-white/[0.04] hover:scale-[1.01]"
        >
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
                    배럭 파티나 다른 고정 파티를 추가하고,
                    <br /> 친구를 초대해 보세요.
                </p>
            </div>

            <div className="mt-2 flex items-center gap-1 text-[11px] font-medium text-[#5B69FF] opacity-70 group-hover:opacity-100 transition-opacity">
                파티 만들기 <ArrowRight className="h-3 w-3" />
            </div>
        </button>
    );
}