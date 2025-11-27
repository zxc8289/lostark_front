// src/app/party-tasks/[partyId]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import {
    UsersRound,
    Users,
    Loader2,
    ArrowLeft,
    AlertTriangle,
    Clock,
    User as UserIcon,
    LogIn,
} from "lucide-react";

type PartyMember = {
    id: string;
    name: string | null;
    image: string | null;
    role: string;
};

type PartyDetail = {
    id: number;
    name: string;
    memo: string | null;
    ownerId: string;
    createdAt: string;
    myRole: string;
    members: PartyMember[];
    raidCount: number;
    nextResetAt: string | null;
};

export default function PartyDetailPage() {
    const router = useRouter();
    const params = useParams<{ partyId: string }>();

    // useParams가 string | string[] 줄 수 있어서 한 번 문자열로 정리
    const partyId = Array.isArray(params.partyId)
        ? params.partyId[0]
        : params.partyId;

    const { data: session, status } = useSession();
    const [party, setParty] = useState<PartyDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);


    useEffect(() => {
        if (status === "loading") return;

        if (status === "unauthenticated") {
            setLoading(false);
            setErr("로그인이 필요합니다.");
            return;
        }

        let cancelled = false;

        async function loadDetail() {
            setLoading(true);
            setErr(null);
            try {
                const res = await fetch(`/api/party-tasks/${partyId}`, {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                    cache: "no-store",
                });

                if (!res.ok) {
                    if (res.status === 401) {
                        throw new Error("로그인이 필요합니다.");
                    }
                    if (res.status === 403) {
                        throw new Error("이 파티에 참여 중인 멤버만 볼 수 있습니다.");
                    }
                    if (res.status === 404) {
                        throw new Error("존재하지 않는 파티입니다.");
                    }
                    throw new Error(`파티 정보를 불러오지 못했습니다. (${res.status})`);
                }

                const data = (await res.json()) as PartyDetail;
                if (!cancelled) {
                    setParty(data);
                }
            } catch (e: any) {
                if (!cancelled) {
                    setErr(e?.message ?? "알 수 없는 오류가 발생했습니다.");
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        loadDetail();
        return () => {
            cancelled = true;
        };
    }, [status, partyId]);

    // 1) 세션도 없고 에러 메시지가 로그인 관련일 때
    if (status === "unauthenticated") {
        return (
            <div className="w-full min-h-[60vh] flex flex-col items-center justify-center text-gray-300 px-4">
                <div className="max-w-md w-full text-center space-y-6">
                    <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-1.5 text-xs font-medium text-[#5B69FF] border border-[#5B69FF]/20">
                        <UsersRound className="h-3.5 w-3.5" />
                        <span>파티 숙제</span>
                    </div>
                    <h1 className="text-2xl font-bold text-white">
                        파티 숙제를 보려면<br />
                        먼저 로그인해주세요
                    </h1>
                    <button
                        onClick={() => signIn("discord")}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#5865F2] px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#5865F2]/25 hover:bg-[#4752C4] transition-all"
                    >
                        <LogIn className="h-5 w-5" />
                        Discord로 로그인
                    </button>
                </div>
            </div>
        );
    }

    // 2) 로딩 중
    if (loading) {
        return (
            <div className="w-full min-h-[60vh] flex flex-col items-center justify-center text-gray-300">
                <Loader2 className="h-6 w-6 animate-spin mb-3" />
                <p className="text-sm text-gray-400">파티 정보를 불러오는 중입니다...</p>
            </div>
        );
    }

    // 3) 에러
    if (err && !party) {
        return (
            <div className="w-full min-h-[60vh] flex flex-col items-center justify-center text-gray-300 px-4">
                <div className="max-w-md w-full space-y-4 text-center">
                    <div className="flex justify-center">
                        <AlertTriangle className="h-8 w-8 text-red-400" />
                    </div>
                    <p className="text-sm text-red-200 whitespace-pre-line">{err}</p>
                    <div className="flex flex-col sm:flex-row gap-2 justify-center mt-2">
                        <button
                            onClick={() => router.push("/party-tasks")}
                            className="inline-flex items-center justify-center gap-2 rounded-md bg-white/10 px-4 py-2 text-xs sm:text-sm text-gray-200 hover:bg-white/15"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            파티 목록으로 돌아가기
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!party) return null;

    const isOwner = party.myRole === "owner";

    return (
        <div className="w-full text-gray-300 py-8 sm:py-12 px-4 sm:px-6">
            <div className="mx-auto max-w-5xl space-y-8">
                {/* 상단 헤더 */}
                <div className="flex items-center justify-between gap-4">
                    <button
                        onClick={() => router.push("/party-tasks")}
                        className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1 text-[11px] text-gray-300 hover:bg-white/10"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        목록으로
                    </button>

                    {party.nextResetAt && (
                        <div className="inline-flex items-center gap-1.5 rounded-full bg-black/30 px-3 py-1 text-[11px] text-gray-400">
                            <Clock className="h-3 w-3" />
                            <span>다음 초기화: {party.nextResetAt}</span>
                        </div>
                    )}
                </div>

                <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 text-xs font-medium text-[#5B69FF]">
                        <UsersRound className="h-4 w-4" />
                        <span>파티 숙제</span>
                        {isOwner && (
                            <span className="rounded-full bg-[#5B69FF]/10 px-2 py-0.5 text-[10px] text-[#BFC6FF]">
                                파티장
                            </span>
                        )}
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                        {party.name}
                    </h1>
                    {party.memo && (
                        <p className="text-sm text-gray-400 whitespace-pre-line">{party.memo}</p>
                    )}
                </div>

                {/* 멤버 섹션 */}
                <section className="rounded-xl border border-white/10 bg-[#16181D] p-5 space-y-4">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-gray-300" />
                            <h2 className="text-sm font-semibold text-white">
                                파티 멤버 ({party.members.length}명)
                            </h2>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        {party.members.map((m) => (
                            <div
                                key={m.id}
                                className="flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-2.5 py-1.5"
                            >
                                <MemberAvatar
                                    member={m}
                                    className="h-7 w-7 rounded-full border border-black/60"
                                />
                                <div className="flex flex-col">
                                    <span className="text-xs font-medium text-gray-100 max-w-[120px] truncate">
                                        {m.name || "이름 없음"}
                                    </span>
                                    <span className="text-[10px] text-gray-500">
                                        {m.role === "owner" ? "파티장" : "멤버"}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ★ 여기부터가 앞으로 "파티 숙제 테이블"이 들어갈 자리 */}
                <section className="rounded-xl border border-dashed border-white/15 bg-[#16181D]/70 p-6 text-sm text-gray-400">
                    <p className="mb-2 font-semibold text-gray-200">
                        파티 숙제 현황 (추후 구현 예정)
                    </p>
                    <p className="text-xs text-gray-500">
                        여기에는 각 멤버의 캐릭터/레이드 설정을 불러와서,
                        <br className="hidden sm:block" />
                        어떤 레이드가 남았는지 한눈에 보이는 테이블이 들어갈 예정이에요.
                    </p>
                </section>
            </div>
        </div>
    );
}

/* ── 아바타 컴포넌트 (리스트 페이지와 거의 동일하게 재사용 가능) ── */
function MemberAvatar({
    member,
    className,
}: {
    member: PartyMember;
    className?: string;
}) {
    return (
        <div
            className={`group/avatar relative flex items-center justify-center overflow-hidden ${className}`}
        >
            {member.image ? (
                <img
                    src={member.image}
                    alt={member.name || ""}
                    className="h-full w-full rounded-full object-cover bg-gray-800"
                />
            ) : (
                <div className="flex h-full w-full items-center justify-center rounded-full bg-gray-700 text-[10px] text-gray-200">
                    {(member.name || "?").slice(0, 2)}
                </div>
            )}
        </div>
    );
}
