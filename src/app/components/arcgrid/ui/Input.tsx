// components/ui/Input.tsx
'use client';
import clsx from 'clsx';
import React from 'react';

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
    wrapperClassName?: string;
    left?: React.ReactNode;   // 선택: 왼쪽 아이콘/텍스트
    right?: React.ReactNode;  // 선택: 오른쪽 아이콘/텍스트
};

export default function Input({
    className,
    wrapperClassName,
    left,
    right,
    ...props
}: Props) {
    return (
        <div className={clsx("relative", wrapperClassName)}>
            {left && (
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400">
                    {left}
                </span>
            )}

            <input
                {...props}
                className={clsx(
                    // 드롭다운과 동일 톤
                    "w-full bg-[#22272e] border border-[#444c56] rounded-md px-3 py-1.5 text-sm text-gray-300",
                    // 포커스 라인/링 제거(흰 줄 방지)
                    "outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 focus-visible:ring-0 focus:border-[#444c56]",
                    // 부드러운 트랜지션
                    "transition-all duration-150 placeholder:text-gray-500",
                    // 숫자 인풋 스핀 제거
                    "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                    left && "pl-8",
                    right && "pr-8",
                    className
                )}
            />

            {right && (
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
                    {right}
                </span>
            )}
        </div>
    );
}
