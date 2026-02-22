// components/tasks/TaskTable.tsx
"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import { raidInformation } from "@/server/data/raids";
import { CharacterTaskPrefs } from "@/app/lib/tasks/raid-prefs";
import { RosterCharacter } from "../AddAccount";
import { ChevronLeft, ChevronRight, SquarePen } from "lucide-react";
import { getRaidColumnSortKeyForRoster } from "@/app/lib/tasks/raid-utils";
import {
    DndContext,
    type DragEndEvent,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
} from "@dnd-kit/core";
import {
    SortableContext,
    horizontalListSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type Props = {
    roster: RosterCharacter[];
    prefsByChar: Record<string, CharacterTaskPrefs>;
    tableOrder?: string[];
    onReorderTable?: (newOrder: string[]) => void;
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
        check:
            "bg-[#FF5252] text-white border-[#FF5252] shadow-[0_0_12px_rgba(255,82,82,0.55)]",
        idle: "bg-[#FF5252]/8 text-[#FFB3B3]/80 border-[#FF5252]/40",
        hover: "hover:bg-[#FF5252] hover:text-white",
    },
    노말: {
        check:
            "bg-[#5B69FF] text-white border-[#5B69FF] shadow-[0_0_12px_rgba(91,105,255,0.55)]",
        idle: "bg-[#5B69FF]/8 text-[#C0C6FF]/85 border-[#5B69FF]/40",
        hover: "hover:bg-[#5B69FF] hover:text-white",
    },
    나메: {
        check:
            "bg-[#6D28D9] text-white border-[#6D28D9] shadow-[0_0_12px_rgba(109,40,217,0.55)]",
        idle: "bg-[#6D28D9]/8 text-[#D6BCFA]/85 border-[#6D28D9]/75",
        hover: "hover:bg-[#6D28D9] hover:text-white",
    },
} as const;

const DESKTOP_MAX_VISIBLE = 5;
const CHAR_COL_WIDTH = "w-[120px] sm:w-[180px] min-w-[120px] sm:min-w-[180px]";
const RAID_COL_CLASS = "px-2 py-3 sm:py-4 whitespace-nowrap text-center";

// ✅ 드래그 중 “좌/우 가장자리” 감지 폭
const EDGE_THRESHOLD_PX = 64;
// ✅ 연속 flip 방지 (ms)
const EDGE_FLIP_COOLDOWN_MS = 380;

function formatHeaderTitle(kind: string, name: string) {
    if (!name) return "";
    if (kind === "카제로스" && name.includes("-")) {
        const [stage, boss] = name.split("-");
        return `${stage} ${boss}`;
    }
    return name;
}

// empty id를 안정적으로 만들기 위한 유틸
function getNextEmptySeed(arr: string[]) {
    let max = -1;
    for (const id of arr) {
        if (!id.startsWith("__empty_")) continue;
        const n = Number(id.replace("__empty_", ""));
        if (Number.isFinite(n)) max = Math.max(max, n);
    }
    return max + 1;
}

function SortableHeader({
    id,
    displayName,
    isBlank,
}: {
    id: string;
    displayName: string;
    isBlank?: boolean;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
        useSortable({ id });

    const style: CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1, // 원래 자리가 너무 투명해지지 않게 조정
        cursor: isBlank ? "default" : (isDragging ? "grabbing" : "grab"),
    };

    return (
        <th
            ref={setNodeRef}
            style={style}
            {...(isBlank ? {} : attributes)}
            {...(isBlank ? {} : listeners)}
            // isDragging일 때 border-solid 적용
            className={`${RAID_COL_CLASS} ${isBlank ? " border-dashed border-white/5 rou" : ""
                } ${isDragging ? "border-2 border-solid border-[#5B69FF] bg-[#5B69FF]/10 rounded-sm" : ""
                }`}
        >
            <span className={isDragging ? "opacity-0" : "opacity-100"}>
                {isBlank ? "" : displayName}
            </span>
        </th>
    );
}

function getClientPoint(e: any): { x: number; y: number } | null {
    if (!e) return null;
    // PointerEvent / MouseEvent
    if (typeof e.clientX === "number" && typeof e.clientY === "number") {
        return { x: e.clientX, y: e.clientY };
    }
    // TouchEvent
    const t = e.touches?.[0] ?? e.changedTouches?.[0];
    if (t && typeof t.clientX === "number" && typeof t.clientY === "number") {
        return { x: t.clientX, y: t.clientY };
    }
    return null;
}

export default function TaskTable({
    roster,
    prefsByChar,
    tableOrder,
    onReorderTable,
    onToggleGate,
    onEdit,
}: Props) {
    const rootRef = useRef<HTMLDivElement | null>(null);

    const [maxVisible, setMaxVisible] = useState(DESKTOP_MAX_VISIBLE);
    const [startIndex, setStartIndex] = useState(0);
    const [localOrder, setLocalOrder] = useState<string[]>([]);

    const [isDragging, setIsDragging] = useState(false);
    const [activeId, setActiveId] = useState<string | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
    );

    const lastFlipRef = useRef(0);
    const pointerRef = useRef<{ x: number; y: number } | null>(null);

    const sortedRoster = useMemo(
        () => [...roster].sort((a, b) => (b.itemLevelNum ?? 0) - (a.itemLevelNum ?? 0)),
        [roster]
    );

    useEffect(() => {
        if (typeof window === "undefined") return;

        const updateMaxVisible = () => {
            const width = window.innerWidth;
            if (width < 640) setMaxVisible(2);
            else if (width < 1024) setMaxVisible(3);
            else if (width < 1280) setMaxVisible(4);
            else setMaxVisible(5);
        };

        updateMaxVisible();
        window.addEventListener("resize", updateMaxVisible);
        return () => window.removeEventListener("resize", updateMaxVisible);
    }, []);

    // 원본 정렬 방식 복구 및 공백 유지 (+ empty 안정화)
    const displayColumns = useMemo(() => {
        const activeRaidSet = new Set<string>();

        sortedRoster.forEach((char) => {
            const prefs = prefsByChar[char.name];
            if (!prefs) return;
            Object.keys(prefs.raids).forEach((r) => {
                if (prefs.raids[r].enabled) activeRaidSet.add(r);
            });
        });

        // 기본 정렬: 레벨 낮은 순
        const defaultSortedRaids = Array.from(activeRaidSet).sort((a, b) => {
            const ka = getRaidColumnSortKeyForRoster(a, sortedRoster, prefsByChar);
            const kb = getRaidColumnSortKeyForRoster(b, sortedRoster, prefsByChar);
            return ka.level - kb.level;
        });

        const currentOrder = tableOrder && tableOrder.length > 0 ? tableOrder : localOrder;

        let cols: string[] = [];

        if (currentOrder.length > 0) {
            // 저장된 순서가 있을 때: 사용중인 레이드 + 빈공간 유지
            cols = [...currentOrder].filter((id) => {
                if (id.startsWith("__empty_")) return true;

                if (activeRaidSet.has(id)) {
                    activeRaidSet.delete(id);
                    return true;
                }
                return false;
            });

            // 새로 켜진 레이드가 있다면 빈공간에 채우거나 맨 뒤에 추가
            defaultSortedRaids.forEach((raidId) => {
                if (activeRaidSet.has(raidId)) {
                    const emptyIdx = cols.findIndex((id) => id.startsWith("__empty_"));
                    if (emptyIdx !== -1) cols[emptyIdx] = raidId;
                    else cols.push(raidId);
                }
            });
        } else {
            cols = [...defaultSortedRaids];
        }

        // maxVisible 배수 맞추기
        const remainder = cols.length % maxVisible;
        if (cols.length === 0 || remainder !== 0) {
            const needed = cols.length === 0 ? maxVisible : maxVisible - remainder;
            let seed = getNextEmptySeed(cols);
            for (let i = 0; i < needed; i++) cols.push(`__empty_${seed++}`);
        }

        return cols;
    }, [sortedRoster, prefsByChar, tableOrder, localOrder, maxVisible]);

    // startIndex가 displayColumns 길이 변화로 튀는거 방지
    useEffect(() => {
        if (startIndex >= displayColumns.length) setStartIndex(0);
    }, [displayColumns.length, startIndex]);

    const visibleRaidColumns = useMemo(
        () => displayColumns.slice(startIndex, startIndex + maxVisible),
        [displayColumns, startIndex, maxVisible]
    );

    const canScrollLeft = startIndex > 0;
    const canScrollRight = startIndex + maxVisible < displayColumns.length;

    // ✅ 드래그 중 포인터 좌표 추적 (버튼 droppable 필요 없음)
    useEffect(() => {
        if (!isDragging) return;

        const onMove = (e: PointerEvent) => {
            pointerRef.current = { x: e.clientX, y: e.clientY };
        };

        window.addEventListener("pointermove", onMove, { passive: true });

        return () => {
            window.removeEventListener("pointermove", onMove);
            pointerRef.current = null;
        };
    }, [isDragging]);

    // ✅ 드래그 중 “좌/우 가장자리”에 들어오면 자동 페이지 flip
    useEffect(() => {
        if (!isDragging) return;

        const tick = () => {
            const p = pointerRef.current;
            const el = rootRef.current;
            if (!p || !el) return;

            const rect = el.getBoundingClientRect();
            // 컴포넌트 위에 있을 때만 동작 (원하면 이 조건 제거 가능)
            if (p.y < rect.top || p.y > rect.bottom) return;

            const now = Date.now();
            if (now - lastFlipRef.current < EDGE_FLIP_COOLDOWN_MS) return;

            const leftDist = p.x - rect.left;
            const rightDist = rect.right - p.x;

            if (leftDist <= EDGE_THRESHOLD_PX) {
                // prev
                setStartIndex((v) => {
                    const next = v > 0 ? Math.max(0, v - maxVisible) : v;
                    if (next !== v) lastFlipRef.current = now;
                    return next;
                });
                return;
            }

            if (rightDist <= EDGE_THRESHOLD_PX) {
                // next
                setStartIndex((v) => {
                    const next =
                        v + maxVisible < displayColumns.length ? v + maxVisible : v;
                    if (next !== v) lastFlipRef.current = now;
                    return next;
                });
            }
        };

        // 바로 1번 실행 + 주기 실행
        tick();
        const t = window.setInterval(tick, 120);
        return () => window.clearInterval(t);
    }, [isDragging, maxVisible, displayColumns.length]);

    const handleDragEnd = (event: DragEndEvent) => {
        setIsDragging(false);
        setActiveId(null);

        const { active, over } = event;
        if (!over) return;

        const activeKey = String(active.id);
        const overKey = String(over.id);
        if (activeKey === overKey) return;

        const oldIndex = displayColumns.indexOf(activeKey);
        const newIndex = displayColumns.indexOf(overKey);

        if (oldIndex !== -1 && newIndex !== -1) {
            const newOrder = [...displayColumns];
            const temp = newOrder[oldIndex];
            newOrder[oldIndex] = newOrder[newIndex];
            newOrder[newIndex] = temp;

            setLocalOrder(newOrder);
            onReorderTable?.(newOrder);
        }
    };

    if (!sortedRoster.length) return null;
    const first = sortedRoster[0];

    return (
        <div ref={rootRef} className="bg-[#16181D] rounded-md relative">
            <DndContext
                sensors={sensors}
                onDragStart={(e) => {
                    setIsDragging(true);
                    setActiveId(e.active.id as string);

                    // 시작 시 포인터 위치 초기화 (드래그 시작 직후 flip이 더 자연스러움)
                    const pt = getClientPoint((e as any).activatorEvent);
                    if (pt) pointerRef.current = pt;
                }}
                onDragEnd={handleDragEnd}
                onDragCancel={() => {
                    setIsDragging(false);
                    setActiveId(null);
                }}
            >
                {/* 헤더 */}
                <div className="flex items-center px-5 py-[17px]">
                    <div className="min-w-0 ">
                        <div className="flex items-center gap-2">
                            <span
                                className="block truncate max-w-[100px] sm:max-w-[300px] font-semibold text-sm sm:text-xl"
                                title={first.name}
                            >
                                {first.name}
                            </span>
                            <span className="text-gray-400 text-[11px] sm:text-sm ">
                                {first.itemLevel ? `Lv. ${first.itemLevel}` : "Lv. -"}{" "}
                                {first.className ? `/ ${first.className}` : ""}
                            </span>
                        </div>
                    </div>

                    {displayColumns.length > maxVisible && (
                        <div className="ml-auto flex items-center gap-2 text-[10px] sm:text-[11px] text-gray-400">
                            <span className="pr-2">
                                {startIndex + 1} –{" "}
                                {Math.min(displayColumns.length, startIndex + maxVisible)} /{" "}
                                {displayColumns.length}
                            </span>

                            {/* 버튼은 “클릭용”으로만 유지 */}
                            <button
                                disabled={!canScrollLeft}
                                onClick={() => setStartIndex((v) => Math.max(0, v - maxVisible))}
                                className="h-6 w-6 sm:h-8 sm:w-8 inline-flex items-center justify-center rounded-full border border-white/15 text-gray-300/90 hover:text-white hover:border-white/30 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                            >
                                <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" strokeWidth={2} />
                            </button>

                            <button
                                disabled={!canScrollRight}
                                onClick={() => setStartIndex((v) => v + maxVisible)}
                                className="h-6 w-6 sm:h-8 sm:w-8 inline-flex items-center justify-center rounded-full border border-white/15 text-gray-300/90 hover:text-white hover:border-white/30 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                            >
                                <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" strokeWidth={2} />
                            </button>
                        </div>
                    )}
                </div>

                {/* 테이블 래퍼 */}
                <div className="w-full overflow-hidden rounded-b-md border border-t-0 border-white/10 bg-[#111217]">
                    <div className="overflow-x-auto">
                        <table className="w-full text-center text-[11px] sm:text-sm text-gray-400 border-collapse table-fixed">
                            <thead className="bg-[#1E222B] text-gray-200 uppercase text-[10px] sm:text-xs font-semibold select-none">
                                <tr>
                                    <th
                                        className={`px-3 py-3 sm:py-4 text-center sticky left-0 z-20 bg-[#1E222B] border-r border-white/5 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)] ${CHAR_COL_WIDTH}`}
                                    >
                                        <span className="pl-1">캐릭터</span>
                                    </th>

                                    <SortableContext
                                        items={visibleRaidColumns}
                                        strategy={horizontalListSortingStrategy}
                                    >
                                        {visibleRaidColumns.map((raidId) => {
                                            const isBlank = raidId.startsWith("__empty_");
                                            const info = raidInformation[raidId];
                                            const displayName = isBlank
                                                ? ""
                                                : info
                                                    ? formatHeaderTitle(info.kind, raidId)
                                                    : raidId;

                                            return (
                                                <SortableHeader
                                                    key={raidId}
                                                    id={raidId}
                                                    displayName={displayName}
                                                    isBlank={isBlank}
                                                />
                                            );
                                        })}
                                    </SortableContext>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-white/5">
                                {sortedRoster.map((char) => {
                                    const prefs = prefsByChar[char.name];
                                    const hasAnyRaid =
                                        !!prefs &&
                                        Object.values(prefs.raids ?? {}).some((r) => r?.enabled);

                                    return (
                                        <tr
                                            key={char.name}
                                            className="hover:bg-white/[0.02] transition-colors group"
                                        >
                                            <td
                                                className={`px-3 sm:px-0 py-2 sm:py-3 text-center align-middle sticky left-0 z-10 border-r border-white/5 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)] bg-[#111217] group-hover:bg-[#16181D] ${CHAR_COL_WIDTH}`}
                                            >
                                                <div className="flex flex-col items-center justify-center h-full">
                                                    <div className="flex items-center gap-1.5 mb-0.5">
                                                        <span
                                                            className="block max-w-[80px] sm:max-w-[110px] truncate text-white font-medium text-[10px] sm:text-sm"
                                                            title={char.name}
                                                        >
                                                            {char.name}
                                                        </span>
                                                        <button
                                                            onClick={() => onEdit(char)}
                                                            className="text-gray-600 hover:text-white transition-colors p-0.5 rounded hover:bg-white/10"
                                                        >
                                                            <SquarePen
                                                                size={12}
                                                                className="sm:w-[13px] sm:h-[13px]"
                                                                strokeWidth={2}
                                                            />
                                                        </button>
                                                    </div>
                                                    <div className="text-[9px] sm:text-[11px] text-gray-500 flex gap-1.5 mt-0.5 justify-center">
                                                        <span>{char.className}</span>
                                                        <span className="text-[#5B69FF]">{char.itemLevel}</span>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* ✅ 여기부터가 핵심: 레이드 세팅이 없으면 안내 문구 1칸(colSpan)으로 */}
                                            {hasAnyRaid ? (
                                                <>
                                                    {visibleRaidColumns.map((raidId) => {
                                                        // 빈 컬럼(패딩)
                                                        if (raidId.startsWith("__empty_")) {
                                                            return (
                                                                <td
                                                                    key={raidId}
                                                                    className={`${RAID_COL_CLASS} `}
                                                                />
                                                            );
                                                        }

                                                        const p = prefs?.raids?.[raidId];
                                                        const info = raidInformation[raidId];
                                                        const diffInfo =
                                                            info && p ? (info.difficulty as any)[p.difficulty] : undefined;

                                                        if (!p?.enabled || !info || !diffInfo) {
                                                            return <td key={raidId} className={RAID_COL_CLASS} />;
                                                        }

                                                        const checkedSet = new Set(p.gates ?? []);
                                                        const allGates: number[] = diffInfo.gates.map((g: any) => g.index);

                                                        const diffStyle =
                                                            DIFF_STYLES[p.difficulty as keyof typeof DIFF_STYLES] ??
                                                            DIFF_STYLES["노말"];

                                                        return (
                                                            <td key={raidId} className={`${RAID_COL_CLASS} align-middle`}>
                                                                <div className="flex items-center justify-center gap-[4px] sm:gap-[5px]">
                                                                    {allGates.map((g: number) => {
                                                                        const isChecked = checkedSet.has(g);
                                                                        return (
                                                                            <button
                                                                                key={g}
                                                                                type="button"
                                                                                title={`관문 ${g}`}
                                                                                aria-pressed={isChecked}
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
                                                                                    "hover:scale-[1.1]",
                                                                                    isChecked
                                                                                        ? `${diffStyle.check} border-transparent`
                                                                                        : [
                                                                                            diffStyle.idle,
                                                                                            "hover:border-white/30",
                                                                                            diffStyle.hover,
                                                                                        ].join(" "),
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
                                                    })}
                                                </>
                                            ) : (
                                                <td colSpan={maxVisible} className="px-3 py-3 sm:py-4 align-middle">
                                                    <div className="px-3 py-2 text-[10px] sm:text-[11px] md:text-sm text-gray-500 text-center">
                                                        <span className="text-[#FFFFFF]/70">{char.name}</span>
                                                        <SquarePen className="inline-block align-middle w-3 h-3 sm:w-4 sm:h-4 mx-1 text-[#FFFFFF]/70" />
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

                    <DragOverlay>
                        {activeId && !activeId.startsWith("__empty_") ? (
                            <div
                                className={`
                                    ${RAID_COL_CLASS} 
                                    flex items-center justify-center 
                                    bg-[#1E222B] text-gray-200 uppercase text-[10px] sm:text-xs font-semibold
                                    border-2 border-solid border-[#5B69FF] shadow-2xl rounded-sm cursor-grabbing
                                    min-w-[80px] sm:min-w-[120px] m-0 box-border
                                `}
                            >
                                {(() => {
                                    const info = raidInformation[activeId];
                                    return info ? formatHeaderTitle(info.kind, activeId) : activeId;
                                })()}
                            </div>
                        ) : null}
                    </DragOverlay>
                </div>
            </DndContext>
        </div>
    );
}