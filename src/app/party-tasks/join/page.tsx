"use client";

import { Suspense, useEffect, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { AlertCircle, ArrowLeft, Loader2, Ticket } from "lucide-react";

const PageLayout = ({ children }: { children: ReactNode }) => (
    <div className="relative flex min-h-[80vh] w-full items-center justify-center overflow-hidden px-4">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#5B69FF]/20 opacity-50 blur-[100px]" />
        <div className="relative z-10 w-full max-w-sm animate-in rounded-2xl border border-white/10 bg-[#16181D]/80 p-8 text-center shadow-2xl backdrop-blur-xl fade-in zoom-in-95 duration-300">
            {children}
        </div>
    </div>
);

function JoinLoadingFallback() {
    return (
        <PageLayout>
            <div className="flex flex-col items-center gap-6 py-4">
                <Loader2 className="h-10 w-10 animate-spin text-[#5B69FF]" />
                <p className="text-sm text-gray-400">초대 링크 확인 중...</p>
            </div>
        </PageLayout>
    );
}

function PartyJoinContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { status } = useSession();
    const [error, setError] = useState<string | null>(null);

    const rawCode = searchParams.get("code") ?? searchParams.get("invite");
    const code = rawCode?.trim() || null;

    useEffect(() => {
        if (!code) {
            setError("유효하지 않은 초대 링크입니다.");
            return;
        }

        if (status === "loading") return;

        if (status === "unauthenticated") {
            void signIn("discord", {
                callbackUrl: `/party-tasks/join?code=${encodeURIComponent(code)}`,
            });
            return;
        }

        const join = async () => {
            try {
                await new Promise((resolve) => setTimeout(resolve, 600));

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
            } catch (e: unknown) {
                setError(e instanceof Error ? e.message : "파티 참가에 실패했습니다.");
            }
        };

        void join();
    }, [code, status, router]);

    if (!code || error) {
        return (
            <PageLayout>
                <div className="flex flex-col items-center gap-4">
                    <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-full border border-red-500/20 bg-red-500/10 text-red-500">
                        <AlertCircle className="h-7 w-7" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-xl font-bold text-white">참가 실패</h2>
                        <p className="break-keep text-sm leading-relaxed text-gray-400">
                            {error || "초대 코드를 찾을 수 없습니다."}
                        </p>
                    </div>
                    <button
                        onClick={() => router.push("/party-tasks")}
                        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-white/5 bg-white/5 py-3 text-sm font-semibold text-white transition-all hover:bg-white/10"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        파티 목록으로 돌아가기
                    </button>
                </div>
            </PageLayout>
        );
    }

    return (
        <PageLayout>
            <div className="flex flex-col items-center gap-6 py-4">
                <div className="relative">
                    <div className="absolute inset-0 rounded-full border-4 border-[#5B69FF]/30" />
                    <div className="absolute inset-0 animate-spin rounded-full border-4 border-t-[#5B69FF]" />
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#16181D]">
                        <Ticket className="h-7 w-7 animate-pulse text-[#5B69FF]" />
                    </div>
                </div>

                <div className="space-y-1">
                    <h2 className="text-lg font-bold text-white">파티 확인 중...</h2>
                    <p className="text-xs tracking-wider text-gray-500">CODE: {code}</p>
                </div>

                <p className="text-sm text-gray-400">
                    멤버 정보를 확인하고 입장하고 있습니다.
                </p>
            </div>
        </PageLayout>
    );
}

export default function PartyJoinPage() {
    return (
        <Suspense fallback={<JoinLoadingFallback />}>
            <PartyJoinContent />
        </Suspense>
    );
}
