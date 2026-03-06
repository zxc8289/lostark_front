// components/tasks/TaskTable.tsx
"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import { raidInformation } from "@/server/data/raids";
import { CharacterTaskPrefs } from "@/app/lib/tasks/raid-prefs";
import { RosterCharacter } from "../AddAccount";
import {
    ChevronLeft,
    ChevronRight,
    SquarePen,
    GripVertical,
    ChevronDown,
    ChevronUp,
} from "lucide-react";
import { getRaidColumnSortKeyForRoster } from "@/app/lib/tasks/raid-utils";
import {
    DndContext,
    type DragEndEvent,
    PointerSensor,
    TouchSensor,
    useSensor,
    useSensors,
    DragOverlay,
    closestCenter,
} from "@dnd-kit/core";
import {
    SortableContext,
    horizontalListSortingStrategy,
    verticalListSortingStrategy,
    useSortable,
    arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type Props = {
    roster: RosterCharacter[];
    prefsByChar: Record<string, CharacterTaskPrefs>;

    // ✅ 레이드(컬럼) 순서
    tableOrder?: string[];
    onReorderTable?: (newOrder: string[]) => void;

    // ✅ 캐릭터(행) 순서 (옵션: 부모에서 저장/복원하려면 사용)
    rosterOrder?: string[];
    onReorderRoster?: (newOrder: string[]) => void;

    onToggleGate: (
        charName: string,
        raidName: string,
        gateIndex: number,
        currentGates: number[],
        allGates: number[]
    ) => void;
    onEdit: (character: RosterCharacter) => void;
    isDragEnabled?: boolean; // 드래그 활성화 여부
};

const GATE_BTN_BASE =
    "w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold border transition-all duration-150";

const DIFF_STYLES = {
    하드: {
        check: "bg-[#FF5252] text-white border-[#FF5252]",
        idle: "bg-[#FF5252]/8 text-[#FFB3B3]/80 border-[#FF5252]/40",
        hover: "hover:bg-[#FF5252] hover:text-white",
    },
    노말: {
        check: "bg-[#5B69FF] text-white border-[#5B69FF]",
        idle: "bg-[#5B69FF]/8 text-[#C0C6FF]/85 border-[#5B69FF]/40",
        hover: "hover:bg-[#5B69FF] hover:text-white",
    },
    나메: {
        check: "bg-[#6D28D9] text-white border-[#6D28D9]",
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

// ✅ row id prefix (컬럼 id와 충돌 방지)
const CHAR_ID_PREFIX = "char:";

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
    isDragEnabled, // 🔥 추가
}: {
    id: string;
    displayName: string;
    isBlank?: boolean;
    isDragEnabled: boolean; // 🔥 추가
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id });

    // 🔥 isDragEnabled가 false면 드래그 이벤트 차단
    const dragListeners = isDragEnabled && !isBlank ? listeners : {};
    const dragAttributes = isDragEnabled && !isBlank ? attributes : {};

    const style: CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
        cursor: isBlank ? "default" : (isDragEnabled ? (isDragging ? "grabbing" : "grab") : "default"),
    };

    return (
        <th
            ref={setNodeRef}
            style={style}
            {...dragAttributes}
            {...dragListeners}
            className={`${RAID_COL_CLASS} relative touch-none ${isBlank ? "border-dashed border-white/5" : ""}`}
        >
            {isDragging && (
                <div className="absolute inset-[2px] border-[2px] border-solid border-[#5B69FF] bg-[#5B69FF]/10 rounded-md pointer-events-none" />
            )}

            <span className={isDragging ? "opacity-0" : "opacity-100"}>
                {isBlank ? "" : displayName}
            </span>
        </th>
    );
}

function getClientPoint(e: any): { x: number; y: number } | null {
    if (!e) return null;
    if (typeof e.clientX === "number" && typeof e.clientY === "number") {
        return { x: e.clientX, y: e.clientY };
    }
    const t = e.touches?.[0] ?? e.changedTouches?.[0];
    if (t && typeof t.clientX === "number" && typeof t.clientY === "number") {
        return { x: t.clientX, y: t.clientY };
    }
    return null;
}

function SortableCharacterRow({
    char,
    prefs,
    visibleRaidColumns,
    maxVisible,
    onEdit,
    onToggleGate,
    isDragEnabled, // 🔥 추가
}: {
    char: RosterCharacter;
    prefs: CharacterTaskPrefs | undefined;
    visibleRaidColumns: string[];
    maxVisible: number;
    onEdit: (character: RosterCharacter) => void;
    onToggleGate: Props["onToggleGate"];
    isDragEnabled: boolean; // 🔥 추가
}) {
    const rowId = `${CHAR_ID_PREFIX}${char.name}`;
    const sortable = useSortable({ id: rowId });

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
        isOver, // 🔥 현재 내가 드래그 오버(덮어써진)된 상태인지 확인
    } = sortable;

    // 🔥 스왑(Swap) UI: 드래그 중인 아이템이 내 위에 올라오면 하이라이트 표시
    const overStyle = isOver && !isDragging ? "bg-white/10 ring-2 ring-inset ring-[#5B69FF]" : "";

    const style: CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.35 : 1,
    };

    const hasAnyRaid =
        !!prefs && Object.values(prefs.raids ?? {}).some((r) => r?.enabled);

    const dragListeners = isDragEnabled ? listeners : {};
    const dragAttributes = isDragEnabled ? attributes : {};

    return (
        <tr
            ref={setNodeRef}
            style={style}
            className={`hover:bg-white/[0.02] transition-colors group ${overStyle}`}
        >
            <td
                {...dragAttributes}
                {...dragListeners}
                className={`px-1 sm:px-0 py-1.5 sm:py-2 align-middle sticky left-0 z-10 border-r border-white/5 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)] bg-[#111217] group-hover:bg-[#16181D] ${isDragEnabled ? 'cursor-grab active:cursor-grabbing touch-none' : ''} ${CHAR_COL_WIDTH}`}
            >
                {/* 가상의 중앙선을 기준으로 양쪽 배치 */}
                <div className="flex items-center justify-center w-full h-full pointer-events-none gap-1 sm:gap-1.5">

                    {/* 좌측 영역 (우측 정렬): 닉네임, 레벨 */}
                    <div className="flex flex-col items-end justify-center gap-[9px] w-1/2 overflow-hidden">
                        <span
                            className="block truncate max-w-[55px] sm:max-w-[80px] text-white font-medium text-[11px] sm:text-[13px] leading-none"
                            title={char.name}
                        >
                            {char.name}
                        </span>
                        <span className="text-gray-400 font-normal text-[9px] sm:text-[10px] leading-none whitespace-nowrap">
                            Lv. {char.itemLevel}
                        </span>
                    </div>

                    {/* 우측 영역 (좌측 정렬): 직업+버튼, 전투력 */}
                    <div className="flex flex-col items-start justify-center gap-[9px] w-1/2 overflow-hidden">
                        <div className="flex items-center gap-0.5 leading-none w-full">
                            <span className="text-[#8A95A5] font-normal text-[9px] sm:text-[10px] whitespace-nowrap overflow-hidden max-w-[40px] sm:max-w-[55px]">
                                {char.className}
                            </span>
                            <button
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onEdit(char);
                                }}
                                className="text-[#64748B] hover:text-white transition-colors p-[0.2px] rounded hover:bg-white/10 pointer-events-auto cursor-pointer flex-shrink-0"
                                title="캐릭터 설정"
                            >
                                <SquarePen size={9} className="sm:w-[10px] sm:h-[10px]" strokeWidth={2} />
                            </button>
                        </div>

                        {/* 전투력 */}
                        {char.combatPower && char.combatPower !== "0" ? (
                            <div className="flex items-center gap-0.5 leading-none flex-shrink-0">
                                <span className="text-[8px] sm:text-[9px] grayscale opacity-50 translate-y-[-0.5px]">⚔️</span>
                                <span className="text-[#E57373] font-medium text-[9px] sm:text-[10px] whitespace-nowrap">{char.combatPower}</span>
                            </div>
                        ) : (
                            <span className="text-transparent text-[9px] sm:text-[10px] leading-none select-none">-</span>
                        )}
                    </div>

                </div>
            </td>
            {/* 레이드 관문 부분 유지 */}
            {hasAnyRaid ? (
                <>
                    {visibleRaidColumns.map((raidId) => {
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
                            info && p
                                ? (info.difficulty as any)[p.difficulty]
                                : undefined;

                        if (!p?.enabled || !info || !diffInfo) {
                            return (
                                <td
                                    key={raidId}
                                    className={RAID_COL_CLASS}
                                />
                            );
                        }

                        const checkedSet = new Set(p.gates ?? []);
                        const allGates: number[] = diffInfo.gates.map(
                            (g: any) => g.index
                        );

                        const diffStyle =
                            DIFF_STYLES[
                            p.difficulty as keyof typeof DIFF_STYLES
                            ] ?? DIFF_STYLES["노말"];

                        return (
                            <td
                                key={raidId}
                                className={`${RAID_COL_CLASS} align-middle`}
                            >
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
}

export default function TaskTable({
    roster,
    prefsByChar,
    tableOrder,
    onReorderTable,
    rosterOrder,
    onReorderRoster,
    onToggleGate,
    onEdit,
    isDragEnabled = false,
}: Props) {
    const rootRef = useRef<HTMLDivElement | null>(null);

    const [maxVisible, setMaxVisible] = useState(DESKTOP_MAX_VISIBLE);
    const [startIndex, setStartIndex] = useState(0);
    const [localOrder, setLocalOrder] = useState<string[]>([]);

    const [localRosterOrder, setLocalRosterOrder] = useState<string[]>([]);

    const [isSortDesc, setIsSortDesc] = useState(true);

    const [activeId, setActiveId] = useState<string | null>(null);
    const [dragKind, setDragKind] = useState<"raid" | "char" | null>(null);

    // ⭕ TO-BE (수정된 코드)
    const pointerSensor = useSensor(PointerSensor, { activationConstraint: { distance: 5 } });
    const touchSensor = useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } });

    // 조건부 전개 연산자를 빼고 항상 두 센서를 전달합니다.
    const sensors = useSensors(pointerSensor, touchSensor);
    // const sensors = useSensors(
    //     useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    //     useSensor(TouchSensor, {
    //         activationConstraint: {
    //             delay: 250,
    //             tolerance: 5,
    //         },
    //     })
    // );

    const lastFlipRef = useRef(0);
    const pointerRef = useRef<{ x: number; y: number } | null>(null);

    const defaultSortedRoster = useMemo(
        () => [...roster].sort((a, b) => (b.itemLevelNum ?? 0) - (a.itemLevelNum ?? 0)),
        [roster]
    );

    useEffect(() => {
        if (rosterOrder && rosterOrder.length > 0) return; // controlled면 로컬 보정 불필요

        const allNames = new Set(roster.map((c) => c.name));
        const defaultNames = defaultSortedRoster.map((c) => c.name);

        setLocalRosterOrder((prev) => {
            const base = prev.length > 0 ? prev : defaultNames;
            const filtered = base.filter((n) => allNames.has(n));
            const missing = defaultNames.filter((n) => !filtered.includes(n));
            const next = [...filtered, ...missing];

            if (
                next.length === prev.length &&
                next.every((v, i) => v === prev[i])
            ) {
                return prev;
            }
            return next;
        });
    }, [roster, rosterOrder, defaultSortedRoster]);

    const rosterByName = useMemo(() => {
        const m = new Map<string, RosterCharacter>();
        for (const c of roster) m.set(c.name, c);
        return m;
    }, [roster]);

    // ✅ 실제 렌더/드래그에 사용할 캐릭터 순서
    const rosterOrderToUse = useMemo(() => {
        const allNames = new Set(roster.map((c) => c.name));
        const defaultNames = defaultSortedRoster.map((c) => c.name);

        const base =
            rosterOrder && rosterOrder.length > 0
                ? rosterOrder
                : localRosterOrder.length > 0
                    ? localRosterOrder
                    : defaultNames;

        const filtered = base.filter((n) => allNames.has(n));
        const missing = defaultNames.filter((n) => !filtered.includes(n));
        return [...filtered, ...missing];
    }, [roster, rosterOrder, localRosterOrder, defaultSortedRoster]);

    const orderedRoster = useMemo(() => {
        return rosterOrderToUse
            .map((name) => rosterByName.get(name))
            .filter(Boolean) as RosterCharacter[];
    }, [rosterOrderToUse, rosterByName]);

    const rowIds = useMemo(
        () => rosterOrderToUse.map((name) => `${CHAR_ID_PREFIX}${name}`),
        [rosterOrderToUse]
    );

    const handleSortCharacters = () => {
        const nextDesc = !isSortDesc;
        setIsSortDesc(nextDesc);

        // 현재 표시 중인 캐릭터 목록을 아이템 레벨 기준으로 정렬
        const sorted = [...orderedRoster].sort((a, b) => {
            const aLevel = a.itemLevelNum ?? 0;
            const bLevel = b.itemLevelNum ?? 0;
            if (nextDesc) {
                return bLevel - aLevel; // 내림차순 (높은 레벨이 위로)
            } else {
                return aLevel - bLevel; // 오름차순 (낮은 레벨이 위로)
            }
        });

        // 정렬된 캐릭터들의 이름 배열 추출
        const newOrder = sorted.map(c => c.name);

        // 빠른 화면 렌더링을 위해 로컬 상태 먼저 업데이트
        setLocalRosterOrder(newOrder);

        // 부모 컴포넌트로 변경된 순서 전달 (DB 및 로컬스토리지 자동 저장됨)
        if (onReorderRoster) {
            onReorderRoster(newOrder);
        }
    };

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

    const displayColumns = useMemo(() => {
        const activeRaidSet = new Set<string>();

        orderedRoster.forEach((char) => {
            const prefs = prefsByChar[char.name];
            if (!prefs) return;
            Object.keys(prefs.raids).forEach((r) => {
                if (prefs.raids[r].enabled) activeRaidSet.add(r);
            });
        });

        const defaultSortedRaids = Array.from(activeRaidSet).sort((a, b) => {
            const dateA = raidInformation[a]?.releaseDate || "2000-01-01";
            const dateB = raidInformation[b]?.releaseDate || "2000-01-01";
            return dateA.localeCompare(dateB); // 오래된 것이 왼쪽
        });

        const currentOrder =
            tableOrder && tableOrder.length > 0 ? tableOrder : localOrder;

        let cols: string[] = [];

        if (currentOrder.length > 0) {
            cols = [...currentOrder].filter((id) => {
                if (id.startsWith("__empty_")) return true;

                if (activeRaidSet.has(id)) {
                    activeRaidSet.delete(id);
                    return true;
                }
                return false;
            });

            defaultSortedRaids.forEach((raidId) => {
                if (activeRaidSet.has(raidId)) {
                    const emptyIdx = cols.findIndex((id) =>
                        id.startsWith("__empty_")
                    );
                    if (emptyIdx !== -1) cols[emptyIdx] = raidId;
                    else cols.push(raidId);
                }
            });
        } else {
            cols = [...defaultSortedRaids];
        }

        const remainder = cols.length % maxVisible;
        if (cols.length === 0 || remainder !== 0) {
            const needed = cols.length === 0 ? maxVisible : maxVisible - remainder;
            let seed = getNextEmptySeed(cols);
            for (let i = 0; i < needed; i++) cols.push(`__empty_${seed++}`);
        }

        return cols;
    }, [orderedRoster, prefsByChar, tableOrder, localOrder, maxVisible]);

    useEffect(() => {
        if (startIndex >= displayColumns.length) setStartIndex(0);
    }, [displayColumns.length, startIndex]);

    const visibleRaidColumns = useMemo(
        () => displayColumns.slice(startIndex, startIndex + maxVisible),
        [displayColumns, startIndex, maxVisible]
    );

    const canScrollLeft = startIndex > 0;
    const canScrollRight = startIndex + maxVisible < displayColumns.length;

    // ✅ “레이드 컬럼 드래그” 중에만 포인터 추적 + edge flip 동작
    useEffect(() => {
        if (dragKind !== "raid") return;

        const onMove = (e: PointerEvent) => {
            pointerRef.current = { x: e.clientX, y: e.clientY };
        };

        window.addEventListener("pointermove", onMove, { passive: true });

        return () => {
            window.removeEventListener("pointermove", onMove);
            pointerRef.current = null;
        };
    }, [dragKind]);

    useEffect(() => {
        if (dragKind !== "raid") return;

        const tick = () => {
            const p = pointerRef.current;
            const el = rootRef.current;
            if (!p || !el) return;

            const rect = el.getBoundingClientRect();
            if (p.y < rect.top || p.y > rect.bottom) return;

            const now = Date.now();
            if (now - lastFlipRef.current < EDGE_FLIP_COOLDOWN_MS) return;

            const leftDist = p.x - rect.left;
            const rightDist = rect.right - p.x;

            if (leftDist <= EDGE_THRESHOLD_PX) {
                setStartIndex((v) => {
                    const next = v > 0 ? Math.max(0, v - maxVisible) : v;
                    if (next !== v) lastFlipRef.current = now;
                    return next;
                });
                return;
            }

            if (rightDist <= EDGE_THRESHOLD_PX) {
                setStartIndex((v) => {
                    const next =
                        v + maxVisible < displayColumns.length ? v + maxVisible : v;
                    if (next !== v) lastFlipRef.current = now;
                    return next;
                });
            }
        };

        tick();
        const t = window.setInterval(tick, 120);
        return () => window.clearInterval(t);
    }, [dragKind, maxVisible, displayColumns.length]);

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        setDragKind(null);
        setActiveId(null);

        if (!over) return;

        const activeKey = String(active.id);
        const overKey = String(over.id);
        if (activeKey === overKey) return;

        const isCharDrag =
            activeKey.startsWith(CHAR_ID_PREFIX) &&
            overKey.startsWith(CHAR_ID_PREFIX);

        // ✅ 캐릭터(행) 정렬
        if (isCharDrag) {
            const activeName = activeKey.slice(CHAR_ID_PREFIX.length);
            const overName = overKey.slice(CHAR_ID_PREFIX.length);

            const oldIndex = rosterOrderToUse.indexOf(activeName);
            const newIndex = rosterOrderToUse.indexOf(overName);
            if (oldIndex === -1 || newIndex === -1) return;

            const newOrder = [...rosterOrderToUse];
            newOrder[oldIndex] = overName;
            newOrder[newIndex] = activeName;

            // controlled(부모 order 제공)면 로컬 저장은 하지 않고 콜백만 호출
            if (!(rosterOrder && rosterOrder.length > 0)) {
                setLocalRosterOrder(newOrder);
            }
            onReorderRoster?.(newOrder);
            return;
        }

        // ✅ 레이드(컬럼) 정렬 (기존 로직 유지: swap)
        const isRaidDrag =
            !activeKey.startsWith(CHAR_ID_PREFIX) &&
            !overKey.startsWith(CHAR_ID_PREFIX);

        if (!isRaidDrag) return;

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

    if (!orderedRoster.length) return null;
    const first = orderedRoster[0];

    const activeIsRaid =
        !!activeId &&
        !activeId.startsWith(CHAR_ID_PREFIX) &&
        !activeId.startsWith("__empty_");
    const activeIsChar = !!activeId && activeId.startsWith(CHAR_ID_PREFIX);

    const activeChar = useMemo(() => {
        if (!activeId || !activeId.startsWith(CHAR_ID_PREFIX)) return null;
        const name = activeId.slice(CHAR_ID_PREFIX.length);
        return rosterByName.get(name) ?? null;
    }, [activeId, rosterByName]);

    return (
        <div ref={rootRef} className="bg-[#16181D] rounded-md relative">
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={(e) => {
                    const id = String(e.active.id);
                    setActiveId(id);

                    if (id.startsWith(CHAR_ID_PREFIX)) {
                        setDragKind("char");
                        return;
                    }

                    setDragKind("raid");

                    // 레이드 드래그 시작 시 포인터 위치 초기화
                    const pt = getClientPoint((e as any).activatorEvent);
                    if (pt) pointerRef.current = pt;
                }}
                onDragEnd={handleDragEnd}
                onDragCancel={() => {
                    setDragKind(null);
                    setActiveId(null);
                }}
            >
                {/* 헤더 */}
                <div className="flex items-center px-5 py-[17px]">
                    <div className="min-w-0 py-[2px]">
                        <div className="flex items-center gap-2">
                            {/* 닉네임 */}
                            <span
                                className="block truncate max-w-[100px] sm:max-w-[300px] font-semibold text-sm sm:text-xl "
                                title={first.name}
                            >
                                {first.name}
                            </span>

                            {/* 모바일 뷰: 레벨만 */}
                            <span className="text-gray-400 text-[11px] sm:hidden">
                                {first.itemLevel ? `Lv. ${first.itemLevel}` : "Lv. -"}
                            </span>

                            {/* 데스크탑 뷰: 레벨 / 직업 / 전투력 (🔥 수정됨) */}
                            <div className="hidden sm:flex items-center gap-1.5 text-gray-400 text-sm font-medium">
                                <span >
                                    {first.itemLevel ? `Lv. ${first.itemLevel}` : "Lv. -"}
                                </span>

                                {first.className && (
                                    <>
                                        <span className="text-gray-600 text-[15px] mx-0.5">/</span>
                                        <span>{first.className}</span>
                                    </>
                                )}

                                {(first as any).combatPower && (first as any).combatPower !== "0" && (
                                    <>
                                        <span className="text-gray-600 text-[15px] mx-0.5">/</span>
                                        <div className="flex items-center gap-0.5 text-[#8A95A5]">
                                            <span className="text-[12px] translate-y-[-1px]">⚔️</span>
                                            <span>{(first as any).combatPower}</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {displayColumns.length > maxVisible && (
                        <div className="ml-auto flex items-center gap-2 text-[10px] sm:text-[11px] text-gray-400">
                            <span className="pr-2">
                                {startIndex + 1} –{" "}
                                {Math.min(displayColumns.length, startIndex + maxVisible)} /{" "}
                                {displayColumns.length}
                            </span>

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
                                        onClick={handleSortCharacters}
                                        className={`px-3 py-3 sm:py-4 text-center sticky left-0 z-20 bg-[#1E222B] border-r border-white/5 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)] ${CHAR_COL_WIDTH} cursor-pointer hover:bg-[#252a36] transition-colors group`}
                                        title="클릭하여 아이템 레벨순 정렬"
                                    >
                                        <div className="flex items-center justify-center gap-1.5 pl-1">
                                            <span>캐릭터</span>
                                            <div className="text-gray-500 group-hover:text-gray-300 transition-colors">
                                                {isSortDesc ? (
                                                    <ChevronDown className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                                ) : (
                                                    <ChevronUp className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                                )}
                                            </div>
                                        </div>
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
                                                    isDragEnabled={isDragEnabled}
                                                />
                                            );
                                        })}
                                    </SortableContext>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-white/5">
                                {/* ✅ 캐릭터(행)도 SortableContext로 감싸기 */}
                                <SortableContext
                                    items={rowIds}
                                    strategy={verticalListSortingStrategy}
                                >
                                    {orderedRoster.map((char) => {
                                        const prefs = prefsByChar[char.name];
                                        return (
                                            <SortableCharacterRow
                                                key={char.name}
                                                char={char}
                                                prefs={prefs}
                                                visibleRaidColumns={visibleRaidColumns}
                                                maxVisible={maxVisible}
                                                onEdit={onEdit}
                                                onToggleGate={onToggleGate}
                                                isDragEnabled={isDragEnabled}
                                            />
                                        );
                                    })}
                                </SortableContext>
                            </tbody>
                        </table>
                    </div>

                    <DragOverlay>
                        {/* ✅ 레이드(컬럼) 오버레이 */}
                        {activeIsRaid ? (
                            <div
                                className={`
                                    ${RAID_COL_CLASS} 
                                    flex items-center justify-center 
                                    bg-[#1E222B] text-gray-200 uppercase text-[10px] sm:text-xs font-semibold
                                    border-[2px] border-solid border-[#5B69FF] shadow-2xl rounded-md cursor-grabbing
                                    m-0 box-border
                                `}
                            >
                                {(() => {
                                    const info = raidInformation[activeId as string];
                                    return info
                                        ? formatHeaderTitle(info.kind, activeId as string)
                                        : (activeId as string);
                                })()}
                            </div>
                        ) : null}

                        {/* ✅ 캐릭터(행) 오버레이 */}
                        {activeIsChar && activeChar ? (
                            <div className="px-3 py-2 bg-[#1E222B] text-gray-200 border-[2px] border-solid border-[#5B69FF] shadow-2xl rounded-md cursor-grabbing">
                                <div className="flex items-center gap-2">
                                    <GripVertical className="w-4 h-4 text-gray-300/80" />
                                    <span className="font-semibold text-sm">
                                        {activeChar.name}
                                    </span>
                                    <span className="text-gray-400 text-[11px]">
                                        {activeChar.itemLevel
                                            ? `Lv. ${activeChar.itemLevel}`
                                            : "Lv. -"}
                                        {activeChar.className ? ` / ${activeChar.className}` : ""}
                                    </span>
                                </div>
                            </div>
                        ) : null}
                    </DragOverlay>
                </div>
            </DndContext>
        </div>
    );
}