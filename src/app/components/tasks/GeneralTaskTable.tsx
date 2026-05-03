"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import { RosterCharacter } from "../AddAccount";
import {
    ChevronLeft,
    ChevronRight,
    SquarePen,
    GripVertical,
    ChevronDown,
    ChevronUp,
    Plus,
    MessageSquareText,
} from "lucide-react";
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
// 🔥 유틸 함수 임포트
import { GeneralTaskStatus, GeneralTasksData, getVisualRestGauge } from "@/app/lib/tasks/general-task-utils";

type Props = {
    roster: RosterCharacter[];
    taskColumns: string[];
    tasksByChar: GeneralTasksData;
    onToggleTask: (charName: string, taskName: string, runIndex: number) => void;
    onOpenMemo: (charName: string, currentMemo: string) => void;
    onEdit: (character: RosterCharacter) => void;
    isDragEnabled?: boolean;
    rosterOrder?: string[];
    onReorderRoster?: (newOrder: string[]) => void;
    onReorderTasks?: (newOrder: string[]) => void;
};

const TASK_BTN_BASE = "w-6.5 h-6.5 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold border transition-all duration-150 relative hover:scale-[1.1]";
const CHAR_COL_WIDTH = "w-[140px] sm:w-[210px] min-w-[120px] sm:min-w-[180px]";
const TASK_COL_CLASS = "px-2 py-3 sm:py-4 whitespace-nowrap text-center";
const CHAR_ID_PREFIX = "char:";
const DESKTOP_MAX_VISIBLE = 7;
const EDGE_THRESHOLD_PX = 64;
const EDGE_FLIP_COOLDOWN_MS = 380;

function getNextEmptySeed(arr: string[]) {
    let max = -1;
    for (const id of arr) {
        if (!id.startsWith("__empty_")) continue;
        const n = Number(id.replace("__empty_", ""));
        if (Number.isFinite(n)) max = Math.max(max, n);
    }
    return max + 1;
}

function SortableHeader({ id, displayName, isBlank, isDragEnabled }: { id: string; displayName: string; isBlank?: boolean; isDragEnabled: boolean }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    const dragListeners = isDragEnabled && !isBlank ? listeners : {};
    const dragAttributes = isDragEnabled && !isBlank ? attributes : {};

    const style: CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
        cursor: isBlank ? "default" : (isDragEnabled ? (isDragging ? "grabbing" : "grab") : "default"),
    };

    return (
        <th ref={setNodeRef} style={style} {...dragAttributes} {...dragListeners} className={`${TASK_COL_CLASS} relative touch-none ${isBlank ? "border-dashed border-white/5" : ""}`}>
            {isDragging && <div className="absolute inset-[2px] border-[2px] border-solid border-[#5B69FF] bg-[#5B69FF]/10 rounded-md pointer-events-none" />}
            <span className={isDragging ? "opacity-0" : "opacity-100"}>{isBlank ? "" : displayName}</span>
        </th>
    );
}

function getClientPoint(e: any): { x: number; y: number } | null {
    if (!e) return null;
    if (typeof e.clientX === "number" && typeof e.clientY === "number") return { x: e.clientX, y: e.clientY };
    const t = e.touches?.[0] ?? e.changedTouches?.[0];
    if (t && typeof t.clientX === "number" && typeof t.clientY === "number") return { x: t.clientX, y: t.clientY };
    return null;
}

function SortableCharacterRow({
    char, tasks, visibleTaskColumns, maxVisible, onEdit, onToggleTask, isDragEnabled, onOpenMemo
}: {
    char: RosterCharacter; tasks: Record<string, GeneralTaskStatus> | undefined; visibleTaskColumns: string[];
    maxVisible: number; onEdit: (character: RosterCharacter) => void; onToggleTask: Props["onToggleTask"];
    isDragEnabled: boolean; onOpenMemo: Props["onOpenMemo"];
}) {
    const rowId = `${CHAR_ID_PREFIX}${char.name}`;
    const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } = useSortable({ id: rowId });

    const overStyle = isOver && !isDragging ? "bg-white/10 ring-2 ring-inset ring-[#5B69FF]" : "";
    const style: CSSProperties = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.35 : 1 };
    const dragListeners = isDragEnabled ? listeners : {};
    const dragAttributes = isDragEnabled ? attributes : {};

    return (
        <tr ref={setNodeRef} style={style} className={`hover:bg-white/[0.02] transition-colors group ${overStyle}`}>
            <td {...dragAttributes} {...dragListeners} className={`h-[56px] sm:h-[67px] px-1 sm:px-0 py-1.5 sm:py-2 align-middle sticky left-0 z-10 border-r border-white/5 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)] bg-[#111217] group-hover:bg-[#16181D] ${isDragEnabled ? 'cursor-grab active:cursor-grabbing touch-none' : ''} ${CHAR_COL_WIDTH}`}>
                <div className="flex items-center justify-center w-full h-full pointer-events-none gap-1 sm:gap-1.5">
                    <div className="flex flex-col items-end justify-center gap-[8px] w-1/2 overflow-hidden">
                        <span className="block truncate max-w-[55px] sm:max-w-[85px] text-white font-medium text-[10px] sm:text-[14px] leading-none" title={char.name}>{char.name}</span>
                        <span className="text-gray-400 font-normal text-[9px] sm:text-[12px] leading-none whitespace-nowrap">Lv. {char.itemLevel}</span>
                    </div>

                    <div className="flex flex-col items-start justify-center gap-[8px] w-1/2 overflow-hidden">
                        <div className="flex items-center gap-1 leading-none w-full">
                            <span className="hidden sm:block text-[#8A95A5] font-normal text-[13px] whitespace-nowrap overflow-hidden max-w-[65px]">{char.className}</span>
                            <div className="flex items-center gap-0.5 flex-shrink-0">
                                <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onEdit(char); }} className="text-[#64748B] hover:text-white transition-colors p-[2px] rounded hover:bg-white/10 pointer-events-auto cursor-pointer" title="캐릭터 설정">
                                    <SquarePen size={12} className="sm:w-[13px] sm:h-[13px] w-[11px] h-[11px]" strokeWidth={2} />
                                </button>
                                <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onOpenMemo(char.name, ""); }} className="p-[2px] rounded transition-colors pointer-events-auto cursor-pointer hover:bg-white/10 flex-shrink-0" title="메모 작성/보기">
                                    <MessageSquareText size={12} className="sm:w-[13px] sm:h-[13px] w-[11px] h-[11px] text-[#64748B] hover:text-white" strokeWidth={2} />
                                </button>
                            </div>
                        </div>

                        {(char as any).combatPower && (char as any).combatPower !== "0" ? (
                            (() => {
                                const supporterEngravings = ["절실한 구원", "축복의 오라", "만개", "해방자"];
                                const isSupporter = supporterEngravings.includes((char as any).jobEngraving ?? "");
                                return (
                                    <div className="flex items-center gap-0.5 leading-none flex-shrink-0">
                                        {isSupporter ? (
                                            <><Plus size={12} className="text-emerald-400 opacity-90 translate-y-[-0.5px]" strokeWidth={5} /><span className="text-emerald-400 font-medium text-[9px] sm:text-[12px] whitespace-nowrap">{(char as any).combatPower}</span></>
                                        ) : (
                                            <><span className="text-[9px] sm:text-[11px] grayscale opacity-50 translate-y-[-1px]">⚔️</span><span className="text-[#E57373] font-medium text-[9px] sm:text-[12px] whitespace-nowrap translate-y-[-1.5px]">{(char as any).combatPower}</span></>
                                        )}
                                    </div>
                                );
                            })()
                        ) : (
                            <div className="flex items-center gap-0.5 leading-none flex-shrink-0"><span className="text-[#E57373] text-[9px] sm:text-[12px]">전투력 없음</span></div>
                        )}
                    </div>
                </div>
            </td>

            {visibleTaskColumns.map((taskName) => {
                if (taskName.startsWith("__empty_")) return <td key={taskName} className={TASK_COL_CLASS} />;

                const defaultMax = taskName === "에포나 의뢰" ? 3 : 1;
                const status = tasks?.[taskName] || { completedRuns: 0, maxRuns: defaultMax, restGauge: 0 };

                const hasRestGauge = ["혼돈의 균열", "카오스 던전", "가디언 토벌"].includes(taskName);

                // 🔥 현재 보여줄 게이지를 실시간으로 계산 (파생 상태)
                const displayRestGauge = getVisualRestGauge(status.restGauge, status.completedRuns);

                return (
                    <td key={taskName} className={`${TASK_COL_CLASS} align-middle`}>
                        <div className="flex flex-col items-center justify-center gap-[5px]">
                            <div className="flex items-center justify-center gap-1 sm:gap-1.5">
                                {Array.from({ length: status.maxRuns }).map((_, idx) => {
                                    const isChecked = idx < status.completedRuns;
                                    return (
                                        <button
                                            key={idx}
                                            type="button"
                                            aria-pressed={isChecked}
                                            onClick={() => onToggleTask(char.name, taskName, idx)}
                                            className={[
                                                TASK_BTN_BASE,
                                                isChecked ? "bg-[#5B69FF] text-white border-transparent" : "bg-white/5 text-white/30 border-white/20 hover:border-white/40 hover:bg-white/10"
                                            ].join(" ")}
                                        >
                                            {isChecked && (
                                                <svg viewBox="0 0 20 20" className="h-3 w-3 sm:h-4 sm:w-4" fill="none" stroke="currentColor" strokeWidth={2}>
                                                    <path d="M5 10l3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* 표시할 게이지가 있는 숙제만 텍스트 렌더링 */}
                            {hasRestGauge && (
                                <span className={`text-[10px] sm:text-[11px] font-medium leading-none tracking-tight mt-1 text-gray-500`}>
                                    {displayRestGauge}
                                </span>
                            )}
                        </div>
                    </td>
                );
            })}
        </tr>
    );
}

export default function GeneralTaskTable({
    roster, taskColumns, tasksByChar, onToggleTask, onOpenMemo, onEdit, isDragEnabled = false, rosterOrder, onReorderRoster, onReorderTasks
}: Props) {
    const rootRef = useRef<HTMLDivElement | null>(null);
    const [maxVisible, setMaxVisible] = useState(DESKTOP_MAX_VISIBLE);
    const [startIndex, setStartIndex] = useState(0);
    const [isSortDesc, setIsSortDesc] = useState(true);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [dragKind, setDragKind] = useState<"task" | "char" | null>(null);
    const [localRosterOrder, setLocalRosterOrder] = useState<string[]>([]);

    const pointerSensor = useSensor(PointerSensor, { activationConstraint: { distance: 5 } });
    const touchSensor = useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } });
    const sensors = useSensors(pointerSensor, touchSensor);
    const lastFlipRef = useRef(0);
    const pointerRef = useRef<{ x: number; y: number } | null>(null);

    const defaultSortedRoster = useMemo(() => [...roster].sort((a, b) => (b.itemLevelNum ?? 0) - (a.itemLevelNum ?? 0)), [roster]);

    useEffect(() => {
        if (rosterOrder && rosterOrder.length > 0) return;
        const allNames = new Set(roster.map((c) => c.name));
        const defaultNames = defaultSortedRoster.map((c) => c.name);
        setLocalRosterOrder((prev) => {
            const base = prev.length > 0 ? prev : defaultNames;
            const filtered = base.filter((n) => allNames.has(n));
            const missing = defaultNames.filter((n) => !filtered.includes(n));
            return [...filtered, ...missing];
        });
    }, [roster, rosterOrder, defaultSortedRoster]);

    const rosterByName = useMemo(() => {
        const m = new Map<string, RosterCharacter>();
        for (const c of roster) m.set(c.name, c);
        return m;
    }, [roster]);

    const rosterOrderToUse = useMemo(() => {
        const allNames = new Set(roster.map((c) => c.name));
        const defaultNames = defaultSortedRoster.map((c) => c.name);
        const base = rosterOrder && rosterOrder.length > 0 ? rosterOrder : localRosterOrder.length > 0 ? localRosterOrder : defaultNames;
        const filtered = base.filter((n) => allNames.has(n));
        const missing = defaultNames.filter((n) => !filtered.includes(n));
        return [...filtered, ...missing];
    }, [roster, rosterOrder, localRosterOrder, defaultSortedRoster]);

    const orderedRoster = useMemo(() => rosterOrderToUse.map((name) => rosterByName.get(name)).filter(Boolean) as RosterCharacter[], [rosterOrderToUse, rosterByName]);
    const rowIds = useMemo(() => rosterOrderToUse.map((name) => `${CHAR_ID_PREFIX}${name}`), [rosterOrderToUse]);

    const handleSortCharacters = () => {
        const nextDesc = !isSortDesc;
        setIsSortDesc(nextDesc);
        const sorted = [...orderedRoster].sort((a, b) => {
            const aLevel = a.itemLevelNum ?? 0, bLevel = b.itemLevelNum ?? 0;
            return nextDesc ? bLevel - aLevel : aLevel - bLevel;
        });
        const newOrder = sorted.map(c => c.name);
        setLocalRosterOrder(newOrder);
        if (onReorderRoster) onReorderRoster(newOrder);
    };

    useEffect(() => {
        const updateMaxVisible = () => {
            const width = window.innerWidth;
            if (width < 640) setMaxVisible(2);
            else if (width < 1024) setMaxVisible(3);
            else if (width < 1760) setMaxVisible(5);
            else setMaxVisible(7);
        };
        updateMaxVisible();
        window.addEventListener("resize", updateMaxVisible);
        return () => window.removeEventListener("resize", updateMaxVisible);
    }, []);

    const displayColumns = useMemo(() => {
        let cols = [...taskColumns];
        const remainder = cols.length % maxVisible;
        if (cols.length === 0 || remainder !== 0) {
            const needed = cols.length === 0 ? maxVisible : maxVisible - remainder;
            let seed = getNextEmptySeed(cols);
            for (let i = 0; i < needed; i++) cols.push(`__empty_${seed++}`);
        }
        return cols;
    }, [taskColumns, maxVisible]);

    useEffect(() => {
        if (startIndex >= displayColumns.length) setStartIndex(0);
    }, [displayColumns.length, startIndex]);

    const visibleTaskColumns = useMemo(() => displayColumns.slice(startIndex, startIndex + maxVisible), [displayColumns, startIndex, maxVisible]);
    const canScrollLeft = startIndex > 0;
    const canScrollRight = startIndex + maxVisible < displayColumns.length;

    useEffect(() => {
        if (dragKind !== "task") return;
        const onMove = (e: PointerEvent) => { pointerRef.current = { x: e.clientX, y: e.clientY }; };
        window.addEventListener("pointermove", onMove, { passive: true });
        return () => { window.removeEventListener("pointermove", onMove); pointerRef.current = null; };
    }, [dragKind]);

    useEffect(() => {
        if (dragKind !== "task") return;
        const tick = () => {
            const p = pointerRef.current; const el = rootRef.current;
            if (!p || !el) return;
            const rect = el.getBoundingClientRect();
            if (p.y < rect.top || p.y > rect.bottom) return;
            const now = Date.now();
            if (now - lastFlipRef.current < EDGE_FLIP_COOLDOWN_MS) return;

            const leftDist = p.x - rect.left;
            const rightDist = rect.right - p.x;
            if (leftDist <= EDGE_THRESHOLD_PX) {
                setStartIndex((v) => { const next = v > 0 ? Math.max(0, v - maxVisible) : v; if (next !== v) lastFlipRef.current = now; return next; });
                return;
            }
            if (rightDist <= EDGE_THRESHOLD_PX) {
                setStartIndex((v) => { const next = v + maxVisible < displayColumns.length ? v + maxVisible : v; if (next !== v) lastFlipRef.current = now; return next; });
            }
        };
        tick();
        const t = window.setInterval(tick, 120);
        return () => window.clearInterval(t);
    }, [dragKind, maxVisible, displayColumns.length]);

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setDragKind(null); setActiveId(null);
        if (!over) return;
        const activeKey = String(active.id); const overKey = String(over.id);
        if (activeKey === overKey) return;

        if (activeKey.startsWith(CHAR_ID_PREFIX) && overKey.startsWith(CHAR_ID_PREFIX)) {
            const activeName = activeKey.slice(CHAR_ID_PREFIX.length);
            const overName = overKey.slice(CHAR_ID_PREFIX.length);
            const oldIndex = rosterOrderToUse.indexOf(activeName);
            const newIndex = rosterOrderToUse.indexOf(overName);
            if (oldIndex === -1 || newIndex === -1) return;
            const newOrder = [...rosterOrderToUse];
            newOrder[oldIndex] = overName; newOrder[newIndex] = activeName;
            if (!(rosterOrder && rosterOrder.length > 0)) setLocalRosterOrder(newOrder);
            onReorderRoster?.(newOrder);
            return;
        }

        if (!activeKey.startsWith(CHAR_ID_PREFIX) && !overKey.startsWith(CHAR_ID_PREFIX)) {
            const oldIndex = taskColumns.indexOf(activeKey);
            const newIndex = taskColumns.indexOf(overKey);
            if (oldIndex !== -1 && newIndex !== -1 && onReorderTasks) {
                onReorderTasks(arrayMove(taskColumns, oldIndex, newIndex));
            }
        }
    };

    if (!orderedRoster.length) return null;
    const first = orderedRoster[0];
    const activeIsTask = !!activeId && !activeId.startsWith(CHAR_ID_PREFIX) && !activeId.startsWith("__empty_");
    const activeIsChar = !!activeId && activeId.startsWith(CHAR_ID_PREFIX);
    const activeChar = useMemo(() => activeId && activeId.startsWith(CHAR_ID_PREFIX) ? rosterByName.get(activeId.slice(CHAR_ID_PREFIX.length)) ?? null : null, [activeId, rosterByName]);

    return (
        <div ref={rootRef} className="bg-[#16181D] rounded-sm relative">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={(e) => {
                const id = String(e.active.id);
                setActiveId(id);
                if (id.startsWith(CHAR_ID_PREFIX)) setDragKind("char");
                else { setDragKind("task"); const pt = getClientPoint((e as any).activatorEvent); if (pt) pointerRef.current = pt; }
            }} onDragEnd={handleDragEnd} onDragCancel={() => { setDragKind(null); setActiveId(null); }}>

                <div className="flex items-center px-5 py-[17px]">
                    <div className="min-w-0 py-[2px]">
                        <div className="flex items-center gap-2">
                            <span className="block truncate max-w-[100px] sm:max-w-[300px] font-semibold text-sm sm:text-xl" title={first.name}>{first.name}</span>
                            <span className="text-gray-400 text-[11px] sm:text-sm">
                                {first.itemLevel ? `Lv. ${first.itemLevel}` : "Lv. -"}
                                {first.className && <span className="hidden sm:inline"> / {first.className}</span>}
                            </span>
                        </div>
                    </div>
                    <div className="ml-auto flex items-center gap-3 sm:gap-4 text-[10px] sm:text-[11px] text-gray-400">
                        {displayColumns.length > maxVisible && (
                            <div className="flex items-center gap-2 relative pl-3 sm:pl-4 before:content-[''] before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-[1px] before:h-5 sm:before:h-6 before:bg-white/10">
                                <span className="pr-1.5 font-medium tracking-wider tabular-nums">
                                    <span className="text-gray-300">{startIndex + 1}</span> – <span className="text-gray-300">{Math.min(displayColumns.length, startIndex + maxVisible)}</span> / {displayColumns.length}
                                </span>
                                <div className="flex items-center gap-1.5">
                                    <button disabled={!canScrollLeft} onClick={() => setStartIndex((v) => Math.max(0, v - maxVisible))} className="h-6 w-6 sm:h-8 sm:w-8 inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 text-gray-300/90 hover:bg-white/10 hover:text-white hover:border-white/30 disabled:opacity-30 disabled:pointer-events-none transition-all duration-200"><ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" strokeWidth={2.5} /></button>
                                    <button disabled={!canScrollRight} onClick={() => setStartIndex((v) => v + maxVisible)} className="h-6 w-6 sm:h-8 sm:w-8 inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 text-gray-300/90 hover:bg-white/10 hover:text-white hover:border-white/30 disabled:opacity-30 disabled:pointer-events-none transition-all duration-200"><ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" strokeWidth={2.5} /></button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="w-full overflow-hidden rounded-b-md border border-t-0 border-white/10 bg-[#111217]">
                    <div className="overflow-x-auto">
                        <table className="w-full text-center text-[11px] sm:text-sm text-gray-400 border-collapse table-fixed">
                            <thead className="bg-[#1E222B] text-gray-200 uppercase text-[10px] sm:text-[13px] font-semibold select-none">
                                <tr>
                                    <th onClick={handleSortCharacters} className={`px-3 py-3 sm:py-4 text-center sticky left-0 bg-[#1E222B] border-r border-white/5 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)] ${CHAR_COL_WIDTH} cursor-pointer hover:bg-[#252a36] transition-colors group`} title="클릭하여 아이템 레벨순 정렬">
                                        <div className="flex items-center justify-center gap-1.5 pl-1">
                                            <span>캐릭터</span>
                                            <div className="text-gray-500 group-hover:text-gray-300 transition-colors">{isSortDesc ? <ChevronDown className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> : <ChevronUp className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}</div>
                                        </div>
                                    </th>
                                    <SortableContext items={visibleTaskColumns} strategy={horizontalListSortingStrategy}>
                                        {visibleTaskColumns.map((col) => <SortableHeader key={col} id={col} displayName={col} isBlank={col.startsWith("__empty_")} isDragEnabled={isDragEnabled} />)}
                                    </SortableContext>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                <SortableContext items={rowIds} strategy={verticalListSortingStrategy}>
                                    {orderedRoster.map((char) => (
                                        <SortableCharacterRow
                                            key={char.name} char={char} tasks={tasksByChar[char.name]}
                                            visibleTaskColumns={visibleTaskColumns} maxVisible={maxVisible}
                                            onEdit={onEdit} onToggleTask={onToggleTask} isDragEnabled={isDragEnabled} onOpenMemo={onOpenMemo}
                                        />
                                    ))}
                                </SortableContext>
                            </tbody>
                        </table>
                    </div>

                    <DragOverlay>
                        {activeIsTask ? (
                            <div className={`${TASK_COL_CLASS} flex items-center justify-center bg-[#1E222B] text-gray-200 uppercase text-[10px] sm:text-xs font-semibold border-[2px] border-solid border-[#5B69FF] shadow-2xl rounded-md cursor-grabbing m-0 box-border`}>
                                {activeId as string}
                            </div>
                        ) : activeIsChar && activeChar ? (
                            <div className="px-3 py-2 bg-[#1E222B] text-gray-200 border-[2px] border-solid border-[#5B69FF] shadow-2xl rounded-md cursor-grabbing">
                                <div className="flex items-center gap-2">
                                    <GripVertical className="w-4 h-4 text-gray-300/80" />
                                    <span className="font-semibold text-sm">{activeChar.name}</span>
                                    <span className="text-gray-400 text-[11px]">{activeChar.itemLevel ? `Lv. ${activeChar.itemLevel}` : "Lv. -"}{activeChar.className ? ` / ${activeChar.className}` : ""}</span>
                                </div>
                            </div>
                        ) : null}
                    </DragOverlay>
                </div>
            </DndContext>
        </div>
    );
}