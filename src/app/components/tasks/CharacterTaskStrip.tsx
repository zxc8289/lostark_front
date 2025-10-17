// components/tasks/CharacterTaskStrip.tsx
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
import { ChevronLeft, ChevronRight, SquarePen } from "lucide-react";

export type RosterCharacter = {
    name: string;
    server: string;
    level?: number;
    className?: string;
    itemLevel?: string;
    itemLevelNum?: number;
};

export type TaskItem = { id: string; element: React.ReactNode };

export type Props = {
    character: RosterCharacter;
    tasks: TaskItem[]; // ← TaskCarousel에 그대로 넘길 ReactNode 배열로 변환해서 사용
    onEdit?: (c: RosterCharacter) => void;
    onReorder?: (c: RosterCharacter, newOrderIds: string[]) => void; // ← 드랍 후 순서 반영
};

function SortableCard({
    id,
    children,
}: {
    id: string;
    children: React.ReactNode;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
        useSortable({ id });
    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.9 : 1,
        cursor: "grab",
    };
    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
            {children}
        </div>
    );
}

export default function CharacterTaskStrip({
    character,
    tasks,
    onEdit,
    onReorder,
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
            <SortableCard key={t.id} id={t.id}>
                {t.element}
            </SortableCard>
        )),
        [tasks]
    );

    useEffect(() => {
        const max = Math.max(0, itemsCount - visibleCount);
        setMaxIndex(max);
        if (cur > max) {
            // 현재 인덱스가 범위를 넘었으면 마지막 합법 위치로 이동
            carouselRef.current?.goTo?.(max);
        }
    }, [itemsCount, visibleCount]); // ❗ cur를 의존성에 넣지 마 (루프 방지)

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




    return (
        <div className="bg-[#16181D] rounded-md px-5 py-4 space-y-2">
            {/* 헤더 */}
            <div className="flex items-center">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-xl">{character.name}</span>
                        <span className="text-gray-500 text-sm">
                            {character.itemLevel ? `Lv. ${character.itemLevel}` : "Lv. -"}
                            {character.className ? ` / ${character.className}` : ""}
                        </span>
                    </div>
                </div>

                {/* 좌/우 버튼은 TaskCarousel의 ref로 제어 */}
                <div className="ml-auto mr-2 flex items-center gap-3">
                    <button
                        onClick={() => carouselRef.current?.prev()}
                        disabled={!hasTasks || cur <= 0}
                        className="h-8 w-8 inline-flex items-center justify-center rounded-full border border-white/15
               text-gray-300/90 hover:text-white hover:border-white/30
               disabled:opacity-30 disabled:pointer-events-none"
                        aria-label="이전"
                    >
                        <ChevronLeft className="w-4 h-4" strokeWidth={2} />
                    </button>

                    <button
                        onClick={() => carouselRef.current?.next()}
                        disabled={!hasTasks || cur >= maxIndex}
                        className="h-8 w-8 inline-flex items-center justify-center rounded-full border border-white/15
               text-gray-300/90 hover:text-white hover:border-white/30
               disabled:opacity-30 disabled:pointer-events-none"
                        aria-label="다음"
                    >
                        <ChevronRight className="w-4 h-4" strokeWidth={2} />
                    </button>
                </div>

                <button
                    className="inline-flex items-center gap-1 py-2 px-3 rounded-md
                     bg-white/[.04] border border-white/10  text-xs text-white hover:bg-white/5"
                    onClick={() => onEdit?.(character)}
                >
                    숙제 편집
                    <SquarePen
                        className="inline-block align-middle w-4 h-4  text-[#FFFFFF]/50"
                        strokeWidth={1.75}
                    />
                </button>
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
                                    if (info) setMaxIndex(info.maxIndex);
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
                <div className="px-3 py-6 text-sm text-gray-500 border border-[#FFFFFF]/15 rounded text-center">
                    <span className="text-[#FFFFFF]/70">숙제 편집</span>
                    <SquarePen
                        className="inline-block align-middle w-4 h-4 mx-1 text-[#FFFFFF]/70"
                        strokeWidth={1.75}
                    />
                    <span>에서 캐릭터의 레이드 숙제를 설정하고 관리해 보세요.</span>
                </div>

            )}
        </div>
    );
}
