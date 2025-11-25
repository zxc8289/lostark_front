// components/TaskCarousel.tsx
"use client";
import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import useEmblaCarousel from "embla-carousel-react";
import type { EmblaCarouselType } from "embla-carousel";

export type TaskCarouselHandle = {
    prev: () => void;
    next: () => void;
    idx: number;
    count: number;
    goTo: (i: number, opts?: { behavior?: ScrollBehavior }) => void;
};

export type TaskCarouselProps = {
    items: React.ReactNode[];
    itemKeys?: (string | number)[];
    onIndexChange?: (
        i: number,
        count: number,
        info?: { maxIndex: number; visibleCount: number }
    ) => void;
};

function TaskCarouselBase(
    { items, itemKeys, onIndexChange }: TaskCarouselProps,
    ref: React.Ref<TaskCarouselHandle>
) {
    const count = items.length;
    const [emblaRef, emblaApi] = useEmblaCarousel({
        loop: false,
        align: "start",
        containScroll: "trimSnaps",
        slidesToScroll: 1,
        watchDrag: false,
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
    const goTo = (i: number, opts?: { behavior?: ScrollBehavior }) => {
        if (!emblaApi) return;
        const snapsLen = emblaApi.scrollSnapList().length;
        if (snapsLen === 0) return;
        const target = Math.max(0, Math.min(i, snapsLen - 1));
        const jump = opts?.behavior === "auto";
        emblaApi.scrollTo(target, jump);
    };

    useImperativeHandle(ref, () => ({ prev, next, goTo, idx, count }), [idx, count, emblaApi]);

    return (
        <div className="relative group mb-1">
            <div ref={emblaRef} className="overflow-hidden touch-pan-y">
                <div className="flex gap-4 py-2 will-change-transform transform-gpu [backface-visibility:hidden]">
                    {items.map((node, i) => (
                        <div
                            key={itemKeys?.[i] ?? i}
                            className="
                                shrink-0
                                basis-full
                                sm:basis-[calc((100%-1rem)/2)]
                                md:basis-[calc((100%-2rem)/2)]
                                lg:basis-[calc((100%-2rem)/3)]
                            "
                        >
                            {node}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

const TaskCarousel = forwardRef<TaskCarouselHandle, TaskCarouselProps>(TaskCarouselBase);
TaskCarousel.displayName = "TaskCarousel";
export default TaskCarousel;
