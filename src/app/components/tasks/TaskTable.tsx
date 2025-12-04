"use client";

import { useMemo, useState, useEffect } from "react";
import { raidInformation } from "@/server/data/raids";
import { CharacterTaskPrefs } from "@/app/lib/tasks/raid-prefs";
import { RosterCharacter } from "../AddAccount";
import { ChevronLeft, ChevronRight, SquarePen } from "lucide-react";

type Props = {
    roster: RosterCharacter[];
    prefsByChar: Record<string, CharacterTaskPrefs>;
    onToggleGate: (
        charName: string,
        raidName: string,
        gateIndex: number,
        currentGates: number[],
        allGates: number[]
    ) => void;
    onEdit: (character: RosterCharacter) => void;
};

const GATE_BTN_BASE =
    "w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold border transition-all duration-150";


const DIFF_STYLES = {
    하드: {
        check: "bg-[#FF5252] text-white border-[#FF5252] shadow-[0_0_12px_rgba(255,82,82,0.55)]",
        idle: "bg-[#FF5252]/8 text-[#FFB3B3]/80 border-[#FF5252]/40",
        hover: "hover:bg-[#FF5252] hover:text-white",
    },
    노말: {
        check: "bg-[#5B69FF] text-white border-[#5B69FF] shadow-[0_0_12px_rgba(91,105,255,0.55)]",
        idle: "bg-[#5B69FF]/8 text-[#C0C6FF]/85 border-[#5B69FF]/40",
        hover: "hover:bg-[#5B69FF] hover:text-white",
    },
} as const;

const DESKTOP_MAX_VISIBLE = 5;
const MOBILE_MAX_VISIBLE = 2;
const SLIDE_PX = 32;
const CHAR_COL_WIDTH = "w-[120px] sm:w-[170px]"

function getRaidBaseLevel(raidId: string): number {
    const info = raidInformation[raidId];
    if (!info) return Number.MAX_SAFE_INTEGER;

    const levels = Object.values(info.difficulty).map(
        (d) => d?.level ?? Number.MAX_SAFE_INTEGER
    );
    if (!levels.length) return Number.MAX_SAFE_INTEGER;

    return Math.min(...levels);
}

function formatHeaderTitle(kind: string, name: string) {
    if (!name) return "";
    if (kind === "카제로스" && name.includes("-")) {
        const [stage, boss] = name.split("-");
        return `${stage} ${boss}`;
    }
    return name;
}

export default function TaskTable({
    roster,
    prefsByChar,
    onToggleGate,
    onEdit,
}: Props) {
    const [maxVisible, setMaxVisible] = useState(DESKTOP_MAX_VISIBLE);
    const sortedRoster = useMemo(
        () => [...roster].sort((a, b) => (b.itemLevelNum ?? 0) - (a.itemLevelNum ?? 0)),
        [roster]
    );

    const activeRaidColumns = useMemo(() => {
        const raidSet = new Set<string>();

        sortedRoster.forEach((char) => {
            const prefs = prefsByChar[char.name];
            if (!prefs) return;

            const orderedRaidNames =
                prefs.order?.filter((r) => prefs.raids[r]?.enabled) ??
                Object.keys(prefs.raids).filter((r) => prefs.raids[r].enabled);

            orderedRaidNames.forEach((raidName) => raidSet.add(raidName));
        });

        return Array.from(raidSet).sort((a, b) => getRaidBaseLevel(a) - getRaidBaseLevel(b));
    }, [sortedRoster, prefsByChar]);

    const [startIndex, setStartIndex] = useState(0);
    const [slide, setSlide] = useState(0);

    useEffect(() => {
        if (typeof window === "undefined") return;

        const updateMaxVisible = () => {
            const isMobile = window.matchMedia("(max-width: 640px)").matches;
            setMaxVisible(isMobile ? MOBILE_MAX_VISIBLE : DESKTOP_MAX_VISIBLE);
        };

        updateMaxVisible();
        window.addEventListener("resize", updateMaxVisible);
        return () => window.removeEventListener("resize", updateMaxVisible);
    }, []);

    useEffect(() => {
        const maxStart = Math.max(0, activeRaidColumns.length - maxVisible);
        if (startIndex > maxStart) {
            setStartIndex(maxStart);
        }
    }, [activeRaidColumns.length, maxVisible, startIndex]);

    useEffect(() => {
        if (slide === 0) return;
        const id = requestAnimationFrame(() => setSlide(0));
        return () => cancelAnimationFrame(id);
    }, [startIndex, slide]);

    const visibleRaidColumns = useMemo(
        () => activeRaidColumns.slice(startIndex, startIndex + maxVisible),
        [activeRaidColumns, startIndex, maxVisible]
    );

    const canScrollLeft = startIndex > 0;
    const canScrollRight = startIndex + maxVisible < activeRaidColumns.length;

    if (!sortedRoster.length) return null;

    const first = sortedRoster[0];

    return (
        <div className="bg-[#16181D] rounded-md space-y-3">
            {/* 헤더 */}
            <div className="flex items-center px-5  py-[0.8px]">
                <div className="min-w-0 pb-1 pt-4">
                    <div className="flex items-center gap-2">
                        <span
                            className="
                                    block
                                    truncate
                                    max-w-[100px] sm:max-w-[300px]
                                    font-semibold text-sm sm:text-xl
                                "
                            title={first.name}
                        >
                            {first.name}
                        </span>

                        <span className="text-gray-400 text-[11px] sm:text-sm ">
                            {first.itemLevel ? `Lv. ${first.itemLevel}` : "Lv. -"}
                            {first.className ? ` / ${first.className}` : ""}
                        </span>
                    </div>
                </div>

                {activeRaidColumns.length > maxVisible && (
                    <div className="ml-auto flex items-center gap-2 text-[10px] sm:text-[11px] text-gray-400">
                        <span className="pr-2">
                            {startIndex + 1} –{" "}
                            {Math.min(activeRaidColumns.length, startIndex + maxVisible)} /{" "}
                            {activeRaidColumns.length}
                        </span>
                        <button
                            disabled={!canScrollLeft}
                            onClick={() => {
                                if (!canScrollLeft) return;
                                setSlide(-1);
                                setStartIndex((v) => Math.max(0, v - 1));
                            }}
                            className="h-6 w-6 sm:h-8 sm:w-8 inline-flex items-center justify-center rounded-full border border-white/15
                                text-gray-300/90 hover:text-white hover:border-white/30
                                disabled:opacity-30 disabled:pointer-events-none"
                            aria-label="이전"
                        >
                            <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" strokeWidth={2} />
                        </button>

                        <button
                            disabled={!canScrollRight}
                            onClick={() => {
                                if (!canScrollRight) return;
                                setSlide(1);
                                setStartIndex((v) =>
                                    Math.min(v + 1, Math.max(0, activeRaidColumns.length - maxVisible))
                                );
                            }}
                            className="h-6 w-6 sm:h-8 sm:w-8 inline-flex items-center justify-center rounded-full border border-white/15
                                text-gray-300/90 hover:text-white hover:border-white/30
                                disabled:opacity-30 disabled:pointer-events-none"
                            aria-label="다음"
                        >
                            <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" strokeWidth={2} />
                        </button>
                    </div>
                )}
            </div>

            {/* 테이블 */}
            <div className="w-full overflow-hidden rounded-b-md border border-t-0 border-white/10 bg-[#111217]">
                <div className="overflow-x-auto">
                    <table className="w-full text-center text-[11px] sm:text-sm text-gray-400 border-collapse">
                        <thead className="bg-[#1E222B] text-gray-200 uppercase text-[10px] sm:text-xs font-semibold">
                            <tr>
                                <th
                                    className={`
                                        px-3 py-3 sm:py-4 text-center
                                        sticky left-0 z-20
                                        bg-[#1E222B] border-r border-white/5
                                        shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)]
                                        ${CHAR_COL_WIDTH}
                                    `}
                                >
                                    <span className="pl-1">캐릭터</span>
                                </th>

                                {visibleRaidColumns.map((raidId) => {
                                    const info = raidInformation[raidId];
                                    const displayName = info
                                        ? formatHeaderTitle(info.kind, raidId)
                                        : raidId;

                                    return (
                                        <th
                                            key={raidId}
                                            className="px-3 py-3 sm:py-4 min-w-[90px] sm:min-w-[100px] whitespace-nowrap"
                                        >
                                            {displayName}
                                        </th>
                                    );
                                })}

                                {visibleRaidColumns.length === 0 && (
                                    <th
                                        className="
                                            px-3 py-3 sm:py-4 min-w-[100px] sm:min-w-[110px] text-center
                                            sticky left-0 z-20
                                            bg-[#1E222B] border-r border-white/5
                                            shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)]
                                        "
                                    >
                                        <span>레이드</span>

                                    </th>
                                )}
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-white/5">
                            {sortedRoster.map((char) => {
                                const prefs = prefsByChar[char.name];
                                const hasAnyRaid =
                                    !!prefs && Object.values(prefs.raids ?? {}).some((r) => r?.enabled);

                                return (
                                    <tr
                                        key={char.name}
                                        className="hover:bg-white/[0.02] transition-colors group"
                                    >
                                        {/* 캐릭터 셀 */}
                                        <td
                                            className="
                                                px-3 sm:px-0 py-2 sm:py-3
                                                text-center align-middle
                                                sticky left-0 z-10
                                                border-r border-white/5
                                                shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)]
                                            "
                                        >
                                            <div className="flex flex-col items-center justify-center h-full">
                                                <div className="flex items-center gap-1.5 mb-0.5">
                                                    <span
                                                        className="
                                                                block                   
                                                                max-w-[80px] sm:max-w-[110px] 
                                                                truncate
                                                                text-white font-medium text-[10px] sm:text-sm
                                                            "
                                                        title={char.name}
                                                    >
                                                        {char.name}
                                                    </span>

                                                    <button
                                                        onClick={() => onEdit(char)}
                                                        className="text-gray-600 hover:text-white transition-colors p-0.5 rounded hover:bg-white/10"
                                                        title="숙제 설정 편집"
                                                    >
                                                        <SquarePen size={12} className="sm:w-[13px] sm:h-[13px]" strokeWidth={2} />
                                                    </button>
                                                </div>
                                                <div className="text-[9px] sm:text-[11px] text-gray-500 flex gap-1.5 mt-0.5 justify-center">
                                                    <span>{char.className}</span>
                                                    <span className="text-[#5B69FF]">
                                                        {char.itemLevel}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>

                                        {/* 레이드 설정 있는 경우 */}
                                        {hasAnyRaid ? (
                                            visibleRaidColumns.map((raidId) => {
                                                const p = prefs?.raids?.[raidId];
                                                const info = raidInformation[raidId];

                                                if (!p?.enabled || !info) {
                                                    return <td key={raidId} className="px-2 py-2 sm:py-3" />;
                                                }

                                                const diffKey = p.difficulty;
                                                const diffInfo = info.difficulty[diffKey];
                                                if (!diffInfo) return <td key={raidId} />;

                                                const checkedSet = new Set(p.gates ?? []);
                                                const allGates = diffInfo.gates.map((g) => g.index);

                                                const diffStyle =
                                                    DIFF_STYLES[diffKey as keyof typeof DIFF_STYLES] ??
                                                    DIFF_STYLES["노말"];

                                                const disabled = false;

                                                return (
                                                    <td key={raidId} className="px-2 py-2 sm:py-3 align-middle">
                                                        <div className="flex items-center justify-center gap-[4px] sm:gap-[5px]">
                                                            {allGates.map((g) => {
                                                                const isChecked = checkedSet.has(g);

                                                                return (
                                                                    <button
                                                                        key={g}
                                                                        type="button"
                                                                        title={`관문 ${g}`}
                                                                        aria-pressed={isChecked}
                                                                        disabled={disabled}
                                                                        onClick={() =>
                                                                            onToggleGate(
                                                                                char.name,
                                                                                raidId,
                                                                                g,
                                                                                Array.from(checkedSet),
                                                                                allGates
                                                                            )
                                                                        }
                                                                        className={[
                                                                            GATE_BTN_BASE,
                                                                            disabled
                                                                                ? "opacity-50 cursor-default"
                                                                                : "hover:scale-[1.1]",
                                                                            isChecked
                                                                                ? `${diffStyle.check} border-transparent`
                                                                                : [
                                                                                    diffStyle.idle,
                                                                                    "hover:border-white/30",
                                                                                    diffStyle.hover,
                                                                                ].join(" "),
                                                                            "scale-[1.0]",
                                                                        ].join(" ")}
                                                                    >
                                                                        {isChecked ? (
                                                                            <svg
                                                                                viewBox="0 0 20 20"
                                                                                className="h-3 w-3 sm:h-4 sm:w-4"
                                                                                fill="none"
                                                                                stroke="currentColor"
                                                                                strokeWidth={2}
                                                                            >
                                                                                <path
                                                                                    d="M5 10l3 3 7-7"
                                                                                    strokeLinecap="round"
                                                                                    strokeLinejoin="round"
                                                                                />
                                                                            </svg>
                                                                        ) : (
                                                                            g
                                                                        )}

                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </td>
                                                );
                                            })
                                        ) : (
                                            // 레이드 설정이 하나도 없는 캐릭터 안내
                                            <td
                                                colSpan={Math.max(1, visibleRaidColumns.length)}
                                                className="px-3 py-3 align-middle"
                                            >
                                                <div className="px-3 py-2 text-[10px] sm:text-[11px] md:text-sm text-gray-500 text-center">
                                                    <span className="text-[#FFFFFF]/70">캐릭터 이름</span>
                                                    <SquarePen
                                                        className="inline-block align-middle w-3 h-3 sm:w-4 sm:h-4 mx-1 text-[#FFFFFF]/70"
                                                    />
                                                    <span>에서 캐릭터의 레이드 숙제를 설정하고 관리해 보세요.</span>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
