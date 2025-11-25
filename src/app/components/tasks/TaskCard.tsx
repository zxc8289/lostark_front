// components/tasks/TaskCard.tsx
"use client";

import React, { useMemo } from "react";
import { raidInformation, type DifficultyKey, type RaidKind } from "@/server/data/raids";

type Props = {
    kind: RaidKind;
    raidName: string;          // 예: "카멘" | "1막-에기르" | "서막-에키드나"
    difficulty: DifficultyKey; // "노말" | "하드"
    gates: number[];           // 현재 체크된 관문들 (ex. [1,2])
    allGates?: number[];       // 전체 관문들(선택). 없으면 데이터 파일에서 자동 추론
    right?: React.ReactNode;   // 우측 추가 요소
    onToggleGate?: (gate: number, nextChecked: boolean) => void; // 관문 토글 콜백
    disabled?: boolean;        // 읽기전용 모드
};

const DIFF = {
    하드: {
        badge: "bg-[#FF5252]/10 text-[#FF5252] border border-none",
        check: "bg-[#ff5a5a] text-white",
        // 🔹 하드일 때 hover 색
        hover: "hover:bg-[#FF5252] hover:text-white",
    },
    노말: {
        badge: "bg-[#5B69FF]/10 text-[#5B69FF] border border-none",
        check: "bg-[#5B69FF] text-white",
        // 🔹 노말일 때 hover 색
        hover: "hover:bg-[#5B69FF] hover:text-white",
    },
} as const;

function formatTitle(kind: RaidKind, name: string) {
    if (kind === "카제로스" && name.includes("-")) {
        const [stage, boss] = name.split("-");
        return `${stage}: ${boss}`; // "1막-에기르" → "1막: 에기르"
    }
    return name;
}

export default function TaskCard({
    kind,
    raidName,
    difficulty,
    gates,
    allGates,
    right,
    onToggleGate,
    disabled,
}: Props) {
    const diffStyle = DIFF[difficulty];
    const title = formatTitle(kind, raidName);

    // 전체 관문 목록 추론 (props 우선 → 데이터 파일 → 체크 목록)
    const all = useMemo(() => {
        if (allGates?.length) return [...allGates].sort((a, b) => a - b);
        const info = raidInformation[raidName]?.difficulty?.[difficulty];
        if (info?.gates?.length) return info.gates.map((g) => g.index);
        return [...new Set(gates)].sort((a, b) => a - b);
    }, [allGates, raidName, difficulty, gates]);

    const checked = useMemo(() => new Set(gates), [gates]);

    return (
        <div className="grid grid-cols-[1fr_auto] px-5 py-5 bg-[#222429] rounded-sm">
            {/* left */}
            <div className="min-w-0">
                <div className="text-gray-500 text-[11px]">{kind} 레이드</div>
                <div className="mt-1 flex items-center gap-2 min-w-0">
                    <div className="text-base truncate">{title}</div>
                    <span className={`text-[11px] px-2 py-0.5 rounded-sm ${diffStyle.badge}`}>
                        {difficulty}
                    </span>
                </div>
            </div>

            {/* right: 관문칩/체크아이콘 + 추가요소 */}
            <div className="ml-auto row-span-2 flex items-center gap-1">
                {all.map((g) => {
                    const isChecked = checked.has(g);
                    const base =
                        "inline-grid h-7 w-7 place-items-center rounded-full border text-xs transition";
                    return (
                        <button
                            key={g}
                            type="button"
                            title={`관문 ${g}`}
                            aria-pressed={isChecked}
                            disabled={disabled || !onToggleGate}
                            onClick={() => onToggleGate?.(g, !isChecked)}
                            className={[
                                base,
                                disabled
                                    ? "opacity-50 cursor-default"
                                    : "hover:scale-[1.1]",
                                isChecked
                                    ? `${diffStyle.check} border-transparent`
                                    : [
                                        "bg-[#FFFFFF]/5 text-[#FFFFFF]/20 border-none hover:border-white/20",
                                        diffStyle.hover,
                                    ].join(" "),
                                "scale-[1.0]",
                            ].join(" ")}
                        >
                            {isChecked ? (
                                <svg
                                    viewBox="0 0 20 20"
                                    className="h-4 w-4"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                >
                                    <path d="M5 10l3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            ) : (
                                g
                            )}
                        </button>
                    );
                })}

            </div>
        </div>
    );
}
