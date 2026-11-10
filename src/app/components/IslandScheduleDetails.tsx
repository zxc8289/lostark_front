"use client";

import { useId, useState, type ReactNode } from "react";
import Image from "next/image";
import type { IslandItem } from "../lib/calendar";

export default function IslandScheduleDetails({ item, children }: { item: IslandItem; children: ReactNode }) {
    const [open, setOpen] = useState(false);
    const id = useId();

    return <div
        className={`relative min-w-0 ${open ? "z-40" : ""}`}
        onPointerEnter={event => { if (event.pointerType === "mouse") setOpen(true); }}
        onPointerLeave={event => { if (event.pointerType === "mouse") setOpen(false); }}
        onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}
        onKeyDown={event => { if (event.key === "Escape") setOpen(false); }}
    >
        {children}
        <button
            type="button"
            aria-label={`${item.name} 상세 일정과 보상`}
            aria-expanded={open}
            aria-controls={id}
            aria-describedby={open ? id : undefined}
            onFocus={event => { if (event.currentTarget.matches(":focus-visible")) setOpen(true); }}
            onClick={() => setOpen(value => !value)}
            className="absolute inset-0 z-10 cursor-pointer rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5B69FF]"
        />
        {open && <div id={id} role="tooltip" className="absolute left-0 top-full z-20 w-full pt-2">
            <div className="max-h-[min(480px,70dvh)] overflow-y-auto rounded-2xl border border-[var(--overlay-ink)]/10 bg-[var(--surface-1a1d24)] p-4 shadow-xl">
                <div className="flex items-center gap-3 border-b border-[var(--overlay-ink)]/10 pb-3">
                    {item.image && <Image src={item.image} alt="" width={40} height={40} unoptimized className="h-10 w-10 shrink-0 rounded-lg object-cover" />}
                    <div className="min-w-0">
                        {item.isGoldIsland && <span className="mb-1 inline-block rounded bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600">골드</span>}
                        <p className="break-words text-sm font-bold text-gray-100">{item.name}</p>
                    </div>
                </div>
                <ul className="mt-3 space-y-2">
                    {item.rewardItems.map(reward => <li key={`${reward.name}-${reward.icon}`} className="flex items-center gap-2 text-xs text-gray-300">
                        <Image src={reward.icon} alt="" width={24} height={24} unoptimized className="h-6 w-6 shrink-0 rounded border border-[var(--overlay-ink)]/10 object-cover" />
                        <span className="break-words">{reward.name}</span>
                    </li>)}
                </ul>
                {!item.rewardItems.length && <p className="mt-3 text-xs text-gray-500">제공된 보상 정보가 없습니다.</p>}
                <div className="mt-3 border-t border-[var(--overlay-ink)]/10 pt-3 text-xs">
                    <p className="mb-1 font-semibold text-gray-400">입장 시간</p>
                    <p className="break-words font-medium tabular-nums text-gray-200">{item.times.join(" · ")}</p>
                </div>
            </div>
        </div>}
    </div>;
}
