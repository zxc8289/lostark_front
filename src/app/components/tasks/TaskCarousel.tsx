// components/TaskCarousel.tsx
"use client";

import {
    useEffect, useRef, useState, forwardRef, useImperativeHandle
} from "react";
import useEmblaCarousel from "embla-carousel-react";
import type { EmblaCarouselType } from "embla-carousel";

export type TaskCarouselHandle = {
    prev: () => void;
    next: () => void;
    idx: number;
    count: number;
};

export type TaskCarouselProps = {
    items: React.ReactNode[];
    onIndexChange?: (
        i: number,
        count: number,
        info?: { maxIndex: number; visibleCount: number }
    ) => void;
};

function TaskCarouselBase(
    { items, onIndexChange }: TaskCarouselProps,
    ref: React.Ref<TaskCarouselHandle>
) {
    const count = items.length;
    const [emblaRef, emblaApi] = useEmblaCarousel({
        loop: false,
        align: "start",
        containScroll: "trimSnaps",
        slidesToScroll: 1,
        // draggable: false,   // ❌ (구버전 방식, 최신 타입에는 없음)
        watchDrag: false,      // ✅ 드래그/스와이프 비활성화
        // (선택) watchFocus: false, // 포커스 이동으로 인한 자동 스크롤도 막고 싶다면 추가
    });



    const [idx, setIdx] = useState(0);

    const emit = (api: EmblaCarouselType | undefined) => {
        if (!api) return;
        const i = api.selectedScrollSnap();
        const maxIndex = Math.max(0, api.scrollSnapList().length - 1);
        const visibleCount = Math.max(1, count - maxIndex);
        setIdx(i);
        onIndexChange?.(i, count, { maxIndex, visibleCount });
    };

    useEffect(() => {
        if (!emblaApi) return;
        const onSelect = () => emit(emblaApi);
        onSelect();
        emblaApi.on("select", onSelect);
        emblaApi.on("reInit", onSelect);
        return () => {
            emblaApi.off("select", onSelect);
            emblaApi.off("reInit", onSelect);
        };
    }, [emblaApi, count]);

    const prev = () => emblaApi?.scrollPrev();
    const next = () => emblaApi?.scrollNext();

    useImperativeHandle(ref, () => ({ prev, next, idx, count }), [idx, count, emblaApi]);

    return (
        <div className="relative group">
            <div ref={emblaRef} className="overflow-hidden touch-pan-y">
                <div className="flex gap-4 py-2">
                    {items.map((node, i) => (
                        <div
                            key={i}
                            className="
                                shrink-0
                                basis-full                                /* 모바일: 1개 */
                                sm:basis-[calc((100%-1rem)/2)]            /* sm: gap-4 => 1rem, 2개 */
                                md:basis-[calc((100%-2rem)/3)]            /* md: 3개, 간격 2개=2rem */
                                "
                        >
                            {node}
                        </div>
                    ))}
                </div>
            </div>

            {/* 양끝 그라데이션 */}
            <div className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-[#16181D] to-transparent opacity-0  transition" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-[#16181D] to-transparent opacity-0  transition" />
        </div>
    );
}

const TaskCarousel = forwardRef<TaskCarouselHandle, TaskCarouselProps>(TaskCarouselBase);
TaskCarousel.displayName = "TaskCarousel";
export default TaskCarousel;
