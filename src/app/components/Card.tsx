// Card.tsx
import React, { ElementType, ReactNode } from "react";
import clsx from "clsx";

type Variant = "solid" | "outline" | "elevated" | "ghost";
type Size = "sm" | "md" | "lg";
type Align = "start" | "center" | "end" | "stretch";

export default function Card({
    as: As = "section",
    title,
    description,
    icon,
    actions,
    footer,
    variant = "solid",
    size = "md",
    headerBorder = true,
    interactive = false,
    align = "start",
    contentPadding = "md",
    loading = false,
    className,
    headerClassName,
    contentClassName,
    footerClassName,
    children,

}: {
    as?: ElementType;
    title?: ReactNode;
    description?: ReactNode;
    icon?: ReactNode;
    actions?: ReactNode;          // 오른쪽 상단 CTA 영역
    footer?: ReactNode;           // 하단 푸터 슬롯
    variant?: Variant;            // 스타일 변형
    size?: Size;                  // 내부 패딩 스케일
    headerBorder?: boolean;       // 헤더 하단 보더 on/off
    interactive?: boolean;        // hover/포커스 효과
    align?: Align;                // 콘텐츠 수직 정렬 (items-*)
    contentPadding?: "none" | Size;
    loading?: boolean;            // 스켈레톤 모드
    className?: string;
    headerClassName?: string;
    contentClassName?: string;
    footerClassName?: string;
    children: ReactNode;
}) {
    const variantCls = {
        solid: "bg-[#16181D]",
        outline: "bg-transparent border border-[#444c56]/60",
        elevated: "bg-[#16181D] shadow-lg shadow-black/20",
        ghost: "bg-transparent",
    }[variant];

    const sizePad = {
        sm: "px-3 py-2",
        md: "px-4 py-3",
        lg: "px-5 py-4",
    }[size];

    const contentPad = {
        none: "p-0",
        sm: "p-4",
        md: "p-5",
        lg: "p-6",
    }[contentPadding];

    const alignCls = {
        start: "items-start",
        center: "items-center",
        end: "items-end",
        stretch: "items-stretch",
    }[align];

    const interCls = interactive
        ? "transition hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50"
        : "";

    return (
        <As
            className={clsx(
                "rounded-lg text-gray-200",
                "flex flex-col",
                variantCls,
                interCls,
                className
            )}
        >
            {(title || description || icon || actions) && (
                <header
                    className={clsx(
                        "flex items-center gap-3 ",
                        contentPad,
                        headerClassName
                    )}
                >
                    {icon && <div className="shrink-0">{icon}</div>}
                    {(title || description) && (
                        <div className="min-w-0">
                            {title && (
                                <h2 className="text-lg font-semibold text-gray-300 truncate">
                                    {title}
                                </h2>
                            )}
                            {description && (
                                <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">
                                    {description}
                                </p>
                            )}
                        </div>
                    )}
                    {actions && <div className="ml-auto shrink-0">{actions}</div>}
                </header>
            )}

            <div className={clsx("flex-1 flex", alignCls, contentPad, contentClassName)}>
                {loading ? (
                    <div className="w-full">
                        <div className="h-24 bg-white/5 rounded-md animate-pulse" />
                    </div>
                ) : (
                    children
                )}
            </div>

            {footer && (
                <footer className={clsx(sizePad, "border-t border-[#444c56]/60", footerClassName)}>
                    {footer}
                </footer>
            )}
        </As>
    );
}
