"use client";

import { useState } from "react";

export type RosterCharacter = {
    name: string;
    server: string;
    level?: number;
    className?: string;
    image?: string;
    profileUrl?: string;
    itemLevel?: string;
    itemLevelNum?: number;
    combatPower?: string;
};

export type CharacterSummary = {
    name: string;
    server?: string;
    itemLevel?: string;
    itemLevelNum?: number;
    combatPower?: string;
    roster: RosterCharacter[];
    source: string;
};

export default function AddAccount({
    onSuccess,
}: {
    onSuccess?: (data: CharacterSummary) => void;
}) {
    const [open, setOpen] = useState(false);
    const [nickname, setNickname] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setResult(null);
        try {
            const res = await fetch("/api/character", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nickname }),
            });
            const payload = await res.json();
            if (!res.ok || !payload?.ok) throw new Error(payload?.error || `HTTP ${res.status}`);
            setResult(payload.data);
            onSuccess?.(payload.data);
            setOpen(false);
            setNickname("");
        } catch (err: any) {
            setError(err.message ?? "실패");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
            >
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-md border">+</span>
                계정 추가
            </button>

            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
                    <div className="w-full max-w-md rounded-xl bg-white p-4 shadow">
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-semibold">캐릭터 가져오기</h3>
                            <button onClick={() => setOpen(false)} className="px-2 py-1 text-gray-500">✕</button>
                        </div>

                        <form onSubmit={onSubmit} className="mt-4 space-y-3">
                            <label className="block text-sm text-gray-700">
                                닉네임
                                <input
                                    value={nickname}
                                    onChange={(e) => setNickname(e.target.value)}
                                    className="mt-1 w-full rounded border px-3 py-2"
                                    placeholder="예) 끼러꾸"
                                    required
                                />
                            </label>

                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setOpen(false)}
                                    className="rounded border px-3 py-2 text-sm"
                                >
                                    취소
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="rounded bg-gray-900 px-3 py-2 text-sm text-white disabled:opacity-60"
                                >
                                    {loading ? "가져오는 중..." : "가져오기"}
                                </button>
                            </div>
                        </form>

                        {error && <p className="mt-3 text-sm text-red-600">에러: {error}</p>}
                        {result && (
                            <pre className="mt-3 max-h-48 overflow-auto rounded bg-gray-50 p-3 text-xs">
                                {JSON.stringify(result, null, 2)}
                            </pre>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
