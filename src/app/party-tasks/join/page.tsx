// app/party-tasks/join/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import { Loader2 } from "lucide-react";

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
            setError("초대 코드가 없습니다.");
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

    if (!code) {
        return (
            <div className="w-full min-h-[60vh] flex items-center justify-center text-sm text-red-300">
                잘못된 초대 링크입니다.
            </div>
        );
    }

    if (error) {
        return (
            <div className="w-full min-h-[60vh] flex flex-col items-center justify-center text-sm text-red-300 px-4">
                <p className="mb-3">{error}</p>
                <button
                    onClick={() => router.push("/party-tasks")}
                    className="text-xs text-gray-300 underline"
                >
                    파티 목록으로 돌아가기
                </button>
            </div>
        );
    }

    return (
        <div className="w-full min-h-[60vh] flex flex-col items-center justify-center text-gray-300">
            <Loader2 className="h-6 w-6 animate-spin mb-3" />
            <p className="text-sm text-gray-400">파티에 참가하는 중입니다...</p>
        </div>
    );
}
