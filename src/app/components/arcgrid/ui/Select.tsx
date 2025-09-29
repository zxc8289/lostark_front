'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';

type Opt = { value: string | number; label: string };

export default function Select({
    value,
    onChange,
    options,
    placeholder = '선택',
    className,
    menuClassName,
    disabled = false,
}: {
    value: string | number | undefined | null;
    onChange: (v: string | number) => void;
    options: Opt[];
    placeholder?: string;
    className?: string;
    menuClassName?: string;
    disabled?: boolean;
}) {
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState<number>(-1);
    const wrapRef = useRef<HTMLDivElement>(null);
    const btnRef = useRef<HTMLButtonElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    const selectedIndex = useMemo(
        () => options.findIndex(o => String(o.value) === String(value)),
        [options, value]
    );
    const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined;

    // 외부 클릭 닫기
    useEffect(() => {
        function onDoc(e: MouseEvent) {
            if (!wrapRef.current) return;
            if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
        }
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, []);

    // 열릴 때 활성 항목 sync
    useEffect(() => {
        if (!open) return;
        setActive(selectedIndex >= 0 ? selectedIndex : 0);
        // 살짝 스크롤 위치 맞추기
        requestAnimationFrame(() => {
            const el = listRef.current?.querySelector<HTMLElement>('[data-active="true"]');
            el?.scrollIntoView({ block: 'nearest' });
        });
    }, [open, selectedIndex]);

    function commit(idx: number) {
        const opt = options[idx];
        if (!opt) return;
        onChange(opt.value);
        setOpen(false);
        btnRef.current?.focus();
    }

    function onBtnKey(e: React.KeyboardEvent) {
        if (disabled) return;
        if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            setOpen(true);
        }
    }
    function onListKey(e: React.KeyboardEvent) {
        if (e.key === 'Escape') { e.preventDefault(); setOpen(false); btnRef.current?.focus(); return; }
        if (e.key === 'Enter') { e.preventDefault(); commit(active); return; }
        if (e.key === 'Home') { e.preventDefault(); setActive(0); return; }
        if (e.key === 'End') { e.preventDefault(); setActive(options.length - 1); return; }
        if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => Math.min(options.length - 1, (i < 0 ? 0 : i + 1))); return; }
        if (e.key === 'ArrowUp') { e.preventDefault(); setActive(i => Math.max(0, (i < 0 ? 0 : i - 1))); return; }
    }

    return (
        <div ref={wrapRef} className={clsx('relative', className)}>
            {/* 버튼(콤보박스) */}
            <button
                ref={btnRef}
                type="button"
                className={clsx(
                    'w-full text-left rounded-md px-3 pr-9 py-1.5 text-sm',
                    'bg-[#22272e] border border-[#444c56] text-gray-300',
                    'outline-none focus:outline-none ring-0 focus:ring-0',
                    'disabled:opacity-60 disabled:cursor-not-allowed'
                )}
                aria-haspopup="listbox"
                aria-expanded={open}
                onClick={() => !disabled && setOpen(o => !o)}
                onKeyDown={onBtnKey}
                disabled={disabled}
            >
                {selected ? selected.label : <span className="text-gray-500">{placeholder}</span>}
                {/* 화살표 */}
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.71a.75.75 0 1 1 1.06 1.06l-4.24 4.24a.75.75 0 0 1-1.06 0L5.21 8.29a.75.75 0 0 1 .02-1.08z" />
                    </svg>
                </span>
            </button>

            {/* 목록 */}
            {open && (
                <div
                    ref={listRef}
                    role="listbox"
                    tabIndex={-1}
                    onKeyDown={onListKey}
                    className={clsx(
                        'absolute z-[1000] mt-1 w-full max-h-56 overflow-auto',
                        'rounded-md border border-[#444c56] bg-[#1f242b] shadow-xl',
                        menuClassName
                    )}
                >
                    {options.map((o, i) => {
                        const isSelected = i === selectedIndex;
                        const isActive = i === active;
                        return (
                            <div
                                key={String(o.value)}
                                role="option"
                                aria-selected={isSelected}
                                data-active={isActive || undefined}
                                className={clsx(
                                    'px-3 py-2 text-sm cursor-pointer select-none',
                                    isActive ? 'bg-[#2b6de0] text-white' : 'text-gray-200',
                                    isSelected && !isActive && 'bg-[#2a3139]'
                                )}
                                onMouseEnter={() => setActive(i)}
                                onMouseDown={(e) => { e.preventDefault(); }} // 포커스 유지
                                onClick={() => commit(i)}
                            >
                                {o.label}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
