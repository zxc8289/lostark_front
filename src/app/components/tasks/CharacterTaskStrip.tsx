// components/tasks/CharacterTaskStrip.tsx
"use client";

import { useMemo, useRef, useState } from "react";
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

export type RosterCharacter = {
    name: string;
    server: string;
    level?: number;
    className?: string;
    itemLevel?: string;
    itemLevelNum?: number;
};

// ⬇️ 카드 재정렬을 위해 id가 꼭 필요합니다.
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

    const ids = useMemo(() => tasks.map((t) => t.id), [tasks]);
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
    );

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

    // TaskCarousel에 넣어줄 아이템(디자인 그대로). 각 카드만 SortableCard로 감쌈
    const carouselItems = useMemo(
        () =>
            tasks.map((t) => (
                <SortableCard key={t.id} id={t.id}>
                    {t.element}
                </SortableCard>
            )),
        [tasks]
    );

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
                <div className="ml-auto mr-2 flex items-center gap-2">
                    <button
                        onClick={() => carouselRef.current?.prev()}
                        disabled={!hasTasks || cur <= 0}
                        className="h-8 w-8 grid place-items-center rounded-full border border-white/15
                       text-gray-300/90 hover:text-white hover:border-white/30
                       disabled:opacity-30 disabled:pointer-events-none"
                        aria-label="이전"
                    >
                        ‹
                    </button>
                    <button
                        onClick={() => carouselRef.current?.next()}
                        disabled={!hasTasks || cur >= maxIndex}
                        className="h-8 w-8 grid place-items-center rounded-full border border-white/15
                       text-gray-300/90 hover:text-white hover:border-white/30
                       disabled:opacity-30 disabled:pointer-events-none"
                        aria-label="다음"
                    >
                        ›
                    </button>
                </div>

                <button
                    className="inline-flex items-center gap-1 h-8 px-3 rounded-md
                     border border-white/10 text-xs text-gray-300 hover:bg-white/5"
                    onClick={() => onEdit?.(character)}
                >
                    숙제 편집
                    <svg className="h-3.5 w-3.5 opacity-80" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                        <path d="M14.5 2.9a1.4 1.4 0 0 1 2 2L8.5 13.9 5 14.5l.6-3.5L14.5 2.9z" stroke="currentColor" strokeWidth="1.2" />
                        <path d="M3 17h14" stroke="currentColor" strokeWidth="1.2" />
                    </svg>
                </button>
            </div>

            {hasTasks ? (
                <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                    <SortableContext items={ids} strategy={horizontalListSortingStrategy}>
                        <TaskCarousel
                            ref={carouselRef}
                            items={carouselItems}
                            // visibleCount={3}
                            onIndexChange={(i, _count, info) => {
                                setCur(i);
                                if (info) setMaxIndex(info.maxIndex);
                            }}
                        />
                    </SortableContext>
                </DndContext>
            ) : (
                <div className="px-3 py-6 text-sm text-gray-400 border border-dashed border-white/10 rounded">
                    표시할 숙제가 없습니다. 우측 <span className="text-gray-200">‘숙제 편집’</span>을 눌러 레이드를 선택하세요.
                </div>
            )}
        </div>
    );
}
