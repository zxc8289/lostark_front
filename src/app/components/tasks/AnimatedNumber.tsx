"use client";

import { useEffect, useRef, useState } from "react";

type AnimatedNumberProps = {
    value: number;
    className?: string;
};

export default function AnimatedNumber({ value, className }: AnimatedNumberProps) {
    const [display, setDisplay] = useState(value);
    const prevValueRef = useRef(value);

    useEffect(() => {
        const from = prevValueRef.current;
        const to = value;

        // 값이 안 바뀌면 애니메이션 없음
        if (from === to) return;

        prevValueRef.current = to;

        const duration = 400; // ms
        const frameRate = 1000 / 60;
        const totalFrames = Math.round(duration / frameRate);

        let frame = 0;

        const timer = setInterval(() => {
            frame += 1;
            const progress = frame / totalFrames;

            // 살짝 부드러운 easing
            const ease = 1 - Math.pow(1 - progress, 3);

            const nextValue = Math.round(from + (to - from) * ease);
            setDisplay(nextValue);

            if (frame >= totalFrames) {
                clearInterval(timer);
                setDisplay(to);
            }
        }, frameRate);

        return () => {
            clearInterval(timer);
        };
    }, [value]);

    return (
        <span
            className={[
                "inline-flex justify-end font-mono tabular-nums",
                className ?? "",
            ].join(" ")}
        >
            {display.toLocaleString()}
        </span>
    );
}
