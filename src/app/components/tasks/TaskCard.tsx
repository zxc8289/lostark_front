"use client";

import React, { useMemo } from "react";
import { raidInformation, type DifficultyKey, type RaidKind } from "@/server/data/raids";

type Props = {
    kind: RaidKind;
    raidName: string;
    difficulty: DifficultyKey;
    gates: number[];
    allGates?: number[];
    isBonus?: boolean;
    right?: React.ReactNode;
    onToggleGate?: (gate: number, nextChecked: boolean) => void;
    disabled?: boolean;
};

const DIFF = {
    하드: {
        badge: "bg-[#FF5252]/10 text-[#FF5252] border border-none",
        check: "bg-[#ff5a5a] text-white",
        hover: "hover:bg-[#FF5252] hover:text-white",
    },
    노말: {
        badge: "bg-[#5B69FF]/10 text-[#5B69FF] border border-none",
        check: "bg-[#5B69FF] text-white",
        hover: "hover:bg-[#5B69FF] hover:text-white",
    },
    나메: {
        badge: "bg-[#6D28D9]/20 text-[#D6BCFA] border border-none",
        check: "bg-[#6D28D9] text-white",
        hover: "hover:bg-[#6D28D9] hover:text-white",
    },
    싱글: {
        badge: "bg-[#F1F5F9]/10 text-[#F1F5F9] border border-none",
        check: "bg-[#F1F5F9] text-[#111217] font-bold",
        hover: "hover:bg-[#F1F5F9] hover:text-[#111217]",
    },
} as const;

function formatTitle(kind: RaidKind, name: string) {
    if (kind === "카제로스" && name.includes("-")) {
        const [stage, boss] = name.split("-");
        return `${stage}: ${boss}`;
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
    isBonus,
    onToggleGate,
    disabled,
}: Props) {
    const diffStyle = DIFF[difficulty];
    const title = formatTitle(kind, raidName);

    const displayDifficulty = useMemo(() => {
        if (raidName === "지평의 성당") {
            if (difficulty === "노말") return "1단계";
            if (difficulty === "하드") return "2단계";
            if (difficulty === "나메") return "3단계";
        }
        return difficulty;
    }, [raidName, difficulty]);

    const maxGold = useMemo(() => {
        const info = raidInformation[raidName]?.difficulty?.[difficulty];
        if (!info?.gates) return 0;

        return info.gates.reduce((sum, g) => {
            const normalGold = g.gold ?? 0;
            const boundGold = (g as any).boundGold ?? 0;
            let cost = isBonus ? (g.bonusCost ?? 0) : 0;

            const netBoundGold = Math.max(0, boundGold - cost);
            cost = Math.max(0, cost - boundGold);
            const netGold = Math.max(0, normalGold - cost);

            return sum + netGold + netBoundGold;
        }, 0);
    }, [raidName, difficulty, isBonus]);

    const all = useMemo(() => {
        if (allGates?.length) return [...allGates].sort((a, b) => a - b);
        const info = raidInformation[raidName]?.difficulty?.[difficulty];
        if (info?.gates?.length) return info.gates.map((g) => g.index);
        return [...new Set(gates)].sort((a, b) => a - b);
    }, [allGates, raidName, difficulty, gates]);

    const checked = useMemo(() => new Set(gates), [gates]);

    return (
        <div className="grid grid-cols-[1fr_auto] px-5 py-5.5 bg-[#222429] rounded-sm items-center">
            {/* 좌측: 레이드 정보 */}
            <div className="min-w-0 flex flex-col justify-center">
                <div className="flex items-center gap-2 text-[11px] h-[18px]">
                    <span className="text-gray-400">
                        {kind === "어비스" ? "어비스 던전" : `${kind} 레이드`}
                    </span>
                </div>

                <div className="mt-1 flex items-center gap-2 min-w-0 h-[24px]">
                    <div className="text-base truncate">{title}</div>
                    <span className={`shrink-0 whitespace-nowrap text-[11px] px-2 py-0.5 rounded-sm ${diffStyle.badge}`}>
                        {displayDifficulty}
                    </span>
                </div>
            </div>

            {/* 우측: 관문 버튼(세로 중앙) + 골드(공간 차지 안 함) */}
            <div className="ml-auto relative flex justify-end pl-3">
                {/* 1. 관문 버튼 (기준점이 되어 무조건 카드 세로 중앙에 위치함) */}
                {/* 1. 관문 버튼 (기준점이 되어 무조건 카드 세로 중앙에 위치함) */}
                <div className="flex items-center gap-1">
                    {all.map((g) => {
                        const isChecked = checked.has(g);
                        // ✨ 뱃지의 기준점이 되도록 base 속성에 "relative"를 추가합니다.
                        const base =
                            "relative inline-grid h-7 w-7 place-items-center rounded-full border text-xs transition";
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

                                {isBonus && (
                                    <span
                                        className="absolute -top-[3px] -right-[3px] sm:-top-1 sm:-right-1 
                                            flex items-center justify-center 
                                            w-[12px] h-[12px] sm:w-[14px] sm:h-[14px] 
                                            bg-[#222429] text-gray-300 
                                            text-[10px] sm:text-[12px] font-medium leading-none
                                            rounded-full border border-gray-500/60 z-10"
                                    >
                                        <span className="relative bottom-[0.5px]">+</span>
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {maxGold > 0 && (
                    <div className="absolute top-full right-0 mt-[-2px] pointer-events-none">
                        <span className="text-yellow-500/90 text-[10px] whitespace-nowrap">
                            {maxGold.toLocaleString()}g
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}