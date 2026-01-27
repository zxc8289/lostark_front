// app/party-tasks/join/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import { Loader2, AlertCircle, ArrowLeft, Ticket } from "lucide-react";

export default function PartyJoinPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { status } = useSession();

    const [error, setError] = useState<string | null>(null);

    // 🔹 code 또는 invite 둘 다 허용
    const rawCode =
        searchParams.get("code") ?? searchParams.get("invite");
    const code = rawCode?.trim() || null;

    useEffect(() => {
        if (!code) {
            setError("유효하지 않은 초대 링크입니다.");
            return;
        }

        if (status === "loading") return;

        if (status === "unauthenticated") {
            signIn("discord", {
                callbackUrl: `/party-tasks/join?code=${encodeURIComponent(code)}`,
            });
            return;
        }

        const join = async () => {
            try {
                // 약간의 인위적인 딜레이(0.5초)를 줘서 "처리 중" 애니메이션을 보여줌 (선택사항)
                await new Promise((r) => setTimeout(r, 600));

                const res = await fetch("/api/party-tasks/join", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ code }),
                });

                const data = await res.json().catch(() => null);

                if (!res.ok) {
                    throw new Error(data?.error ?? "파티 참가에 실패했습니다.");
                }

                const partyId = data?.partyId ?? data?.id;
                if (!partyId) {
                    throw new Error("파티 ID를 찾을 수 없습니다.");
                }

                router.replace(`/party-tasks/${partyId}`);
            } catch (e: any) {
                setError(e?.message ?? "파티 참가에 실패했습니다.");
            }
        };

        void join();
    }, [code, status, router]);

    // ───────── UI 렌더링 부분 ─────────

    // 공통 배경 및 카드 래퍼
    const PageLayout = ({ children }: { children: React.ReactNode }) => (
        <div className="relative w-full min-h-[80vh] flex items-center justify-center overflow-hidden px-4">
            {/* 배경 글로우 효과 */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#5B69FF]/20 blur-[100px] rounded-full pointer-events-none opacity-50" />

            {/* 카드 컨테이너 */}
            <div className="relative z-10 w-full max-w-sm bg-[#16181D]/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-8 text-center animate-in fade-in zoom-in-95 duration-300">
                {children}
            </div>
        </div>
    );

    // 1. 코드가 없거나 에러가 발생했을 때
    if (!code || error) {
        return (
            <PageLayout>
                <div className="flex flex-col items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 text-red-500 border border-red-500/20 mb-2">
                        <AlertCircle className="h-7 w-7" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-xl font-bold text-white">참가 실패</h2>
                        <p className="text-sm text-gray-400 leading-relaxed break-keep">
                            {error || "초대 코드를 찾을 수 없습니다."}
                        </p>
                    </div>
                    <button
                        onClick={() => router.push("/party-tasks")}
                        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-white/5 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-all border border-white/5"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        파티 목록으로 돌아가기
                    </button>
                </div>
            </PageLayout>
        );
    }

    // 2. 로딩 중 (정상 처리 중)
    return (
        <PageLayout>
            <div className="flex flex-col items-center gap-6 py-4">
                <div className="relative">
                    {/* 빙글빙글 도는 로더 */}
                    <div className="absolute inset-0 rounded-full border-4 border-[#5B69FF]/30" />
                    <div className="absolute inset-0 rounded-full border-4 border-t-[#5B69FF] animate-spin" />

                    {/* 가운데 아이콘 */}
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#16181D]">
                        <Ticket className="h-7 w-7 text-[#5B69FF] animate-pulse" />
                    </div>
                </div>

                <div className="space-y-1">
                    <h2 className="text-lg font-bold text-white">파티 확인 중...</h2>
                    <p className="text-xs text-gray-500 font-mono tracking-wider">
                        CODE: {code}
                    </p>
                </div>

                <p className="text-sm text-gray-400">
                    멤버십을 확인하고 입장하고 있습니다.
                </p>
            </div>
        </PageLayout>
    );
}