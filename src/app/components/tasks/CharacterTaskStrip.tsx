"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import TaskCarousel, { TaskCarouselHandle } from "./TaskCarousel";

import {
    DndContext,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from "@dnd-kit/core";
import {
    SortableContext,
    horizontalListSortingStrategy,
    useSortable,
    arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronLeft, ChevronRight, GripVertical, SquarePen, Plus, Check } from "lucide-react"; // 🔥 Plus 추가

export type RosterCharacter = {
    name: string;
    server: string;
    level?: number;
    className?: string;
    itemLevel?: string;
    itemLevelNum?: number;
    combatPower?: string;
    jobEngraving?: string; // 🔥 추가
};

export type TaskItem = { id: string; element: React.ReactNode };

export type Props = {
    character: RosterCharacter;
    tasks: TaskItem[];
    onEdit?: (c: RosterCharacter) => void;
    onReorder?: (c: RosterCharacter, newOrderIds: string[]) => void;
    onAllClear?: (c: RosterCharacter) => void;
    dragHandleProps?: Record<string, any>;
    isDragEnabled?: boolean;
};

function SortableCard({
    id,
    children,
    isDragEnabled,
}: {
    id: string;
    children: React.ReactNode;
    isDragEnabled?: boolean;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
        useSortable({ id });
    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.9 : 1,
        cursor: isDragEnabled ? "grab" : "default",
    };
    return (
        <div
            ref={setNodeRef}
            style={style}
            {...(isDragEnabled ? attributes : {})}
            {...(isDragEnabled ? listeners : {})}
        >
            {children}
        </div>
    );
}

export default function CharacterTaskStrip({
    character,
    tasks,
    onEdit,
    onReorder,
    onAllClear,
    dragHandleProps,
    isDragEnabled,
}: Props) {
    const carouselRef = useRef<TaskCarouselHandle>(null);
    const [cur, setCur] = useState(0);
    const [maxIndex, setMaxIndex] = useState(0);
    const itemsCount = tasks.length;
    const [visibleCount, setVisibleCount] = useState(3);

    const ids = useMemo(() => tasks.map((t) => t.id), [tasks]);
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
    );

    const carouselItems = useMemo(
        () => tasks.map(t => (
            <SortableCard key={t.id} id={t.id} isDragEnabled={isDragEnabled}>
                {t.element}
            </SortableCard>
        )),
        [tasks, isDragEnabled]
    );

    useEffect(() => {
        const max = Math.max(0, itemsCount - visibleCount);
        setMaxIndex(max);
        if (cur > max) {
            carouselRef.current?.goTo?.(max);
        }
    }, [itemsCount, visibleCount]);

    const handleDragEnd = (e: DragEndEvent) => {
        const { active, over } = e;
        if (!over || active.id === over.id) return;
        const oldIndex = ids.indexOf(String(active.id));
        const newIndex = ids.indexOf(String(over.id));
        if (oldIndex === -1 || newIndex === -1) return;
        const newIds = arrayMove(ids, oldIndex, newIndex);
        onReorder?.(character, newIds);
    };

    const hasTasks = tasks.length > 0;
    const levelText = character.itemLevel ? `Lv. ${character.itemLevel}` : "Lv. -";

    const supporterEngravings = ["절실한 구원", "축복의 오라", "만개", "해방자"];
    const isSupporter = supporterEngravings.includes(character.jobEngraving ?? "");

    return (
        <div className="bg-[#16181D] rounded-md px-5 py-4 space-y-2">
            {/* 헤더 */}
            <div className="flex items-center">
                <div
                    className="min-w-0"
                    {...(isDragEnabled ? dragHandleProps : {})}
                    style={isDragEnabled ? { touchAction: "none", cursor: "grab" } : {}}
                >
                    <div className="flex items-center gap-2">
                        <span
                            className={`
                                block truncate max-w-[120px] sm:max-w-[220px]
                                font-semibold text-base sm:text-xl
                                ${isDragEnabled ? "hover:text-[#5B69FF] transition-colors" : ""}
                            `}
                            title={character.name}
                        >
                            {character.name}
                        </span>

                        {/* 모바일 뷰: 레벨 / 전투력 */}
                        <div className="flex sm:hidden items-center gap-1 text-gray-400 text-[11px] whitespace-nowrap">
                            <span>{levelText}</span>
                            {character.combatPower && character.combatPower !== "0" && (
                                <>
                                    <span className="text-gray-600 text-[10px]">/</span>
                                    <div className="flex items-center gap-[2px]">
                                        {isSupporter ? (
                                            <>
                                                <Plus size={10} className="text-emerald-400 opacity-90 translate-y-[-1px]" strokeWidth={5} />
                                                <span className="text-emerald-400 font-medium">{character.combatPower}</span>
                                            </>
                                        ) : (
                                            <>
                                                <span className="text-[9px] grayscale opacity-50 translate-y-[-0.5px]">⚔️</span>
                                                <span className="text-[#E57373] font-medium">{character.combatPower}</span>
                                            </>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* 데스크탑 뷰: 레벨 / 직업(각인) / 전투력 */}
                        <div className="hidden sm:flex items-center text-gray-400 text-sm font-medium whitespace-nowrap">
                            <span>{levelText}</span>
                            {character.className && (
                                <>
                                    <span className="text-gray-600 text-[14px] mx-1.5">/</span>
                                    <span>{character.className}</span>
                                </>
                            )}
                            {character.combatPower && character.combatPower !== "0" && (
                                <>
                                    <span className="text-gray-600 text-[14px] mx-1.5">/</span>
                                    <div className="flex items-center gap-1">
                                        {isSupporter ? (
                                            <>
                                                <Plus size={14} className="text-emerald-400 opacity-90" strokeWidth={5} />
                                                <span className="text-emerald-400 font-bold">{character.combatPower}</span>
                                            </>
                                        ) : (
                                            <>
                                                <span className="text-[12px] grayscale opacity-50 translate-y-[1.5px]">⚔️</span>
                                                <span className="text-[#E57373] font-bold">{character.combatPower}</span>
                                            </>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="ml-auto mr-2 flex items-center gap-1.5 sm:gap-3">
                    <button
                        onClick={() => carouselRef.current?.prev()}
                        disabled={!hasTasks || cur <= 0}
                        className="h-6 w-6 sm:h-8 sm:w-8 inline-flex items-center justify-center rounded-full border border-white/15
                            text-gray-300/90 hover:text-white hover:border-white/30
                            disabled:opacity-30 disabled:pointer-events-none"
                        aria-label="이전"
                    >
                        <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" strokeWidth={2} />
                    </button>

                    <button
                        onClick={() => carouselRef.current?.next()}
                        disabled={!hasTasks || cur >= maxIndex}
                        className="h-6 w-6 sm:h-8 sm:w-8 inline-flex items-center justify-center rounded-full border border-white/15
                            text-gray-300/90 hover:text-white hover:border-white/30
                            disabled:opacity-30 disabled:pointer-events-none"
                        aria-label="다음"
                    >
                        <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" strokeWidth={2} />
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    {hasTasks && (
                        <button
                            className="inline-flex items-center gap-1.5 py-[5px] px-[10px] sm:py-2 sm:px-3 rounded-md
                         bg-white/[.04] border border-white/10  text-xs text-white hover:bg-white/5 transition-colors"
                            onClick={() => onAllClear?.(character)}
                        >
                            <span className="hidden sm:inline">일괄 완료</span>
                        </button>
                    )}

                    <button
                        className="inline-flex items-center gap-1.5 py-[5px] px-[10px] sm:py-2 sm:px-3 rounded-md
                         bg-white/[.04] border border-white/10  text-xs text-white hover:bg-white/5 transition-colors"
                        onClick={() => onEdit?.(character)}
                    >
                        숙제 편집
                        <SquarePen
                            className="inline-block align-middle w-3 h-3 sm:w-4 sm:h-4  text-[#FFFFFF]/50"
                            strokeWidth={1.75}
                        />
                    </button>
                </div>
            </div>

            {hasTasks ? (
                <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                    <SortableContext items={ids} strategy={horizontalListSortingStrategy}>
                        <div className="relative">
                            <TaskCarousel
                                ref={carouselRef}
                                items={carouselItems}
                                itemKeys={ids}
                                onIndexChange={(i, _count, info) => {
                                    setCur(i);
                                    if (info) {
                                        setMaxIndex(info.maxIndex);
                                        setVisibleCount(info.visibleCount);
                                    }
                                }}

                            />
                            {itemsCount > 0 && (
                                <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
                                    {Array.from({ length: itemsCount }).map((_, i) => {
                                        const active = i >= cur && i < Math.min(itemsCount, cur + visibleCount);
                                        return (
                                            <button
                                                key={i}
                                                onClick={() => carouselRef.current?.goTo?.(i)}
                                                className={`rounded-full transition-all ${active ? "w-1.5 h-1.5 bg-white/90" : "w-1.5 h-1.5 bg-white/15 hover:bg-white/30"
                                                    }`}
                                            />
                                        );
                                    })}
                                </div>
                            )}

                        </div>
                    </SortableContext>
                </DndContext>
            ) : (
                <div className="py-2">
                    <div className="px-3 py-6 text-[11px] sm:text-sm text-gray-500 border border-[#FFFFFF]/15 rounded text-center">
                        <span className="text-[#FFFFFF]/70">숙제 편집</span>
                        <SquarePen
                            className="inline-block align-middle w-3 h-3 sm:w-4 sm:h-4 mx-1 text-[#FFFFFF]/70"
                        />
                        <span>에서 캐릭터의 레이드 숙제를 설정하고 관리해 보세요.</span>
                    </div>
                </div>

            )}
        </div>
    );
}