type Props = {
    progress: number;
    remainingGold: number;
    remainingBoundGold: number;
    remainingTasks: number;
};

export default function HomeTaskMetrics({ progress, remainingGold, remainingBoundGold, remainingTasks }: Props) {
    return <div className="space-y-4">
        <div className="space-y-4 px-1">
            <div className="flex items-end justify-between gap-3">
                <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Weekly Progress</div>
                    <div className="text-sm font-medium text-gray-400">이번 주 진행도</div>
                </div>
                <div className="text-2xl font-black leading-none tracking-tighter text-[#5B69FF]">{progress}%</div>
            </div>
            <div role="progressbar" aria-label="이번 주 골드 보상 진행도" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} className="h-2 w-full overflow-hidden rounded-full border border-[var(--overlay-ink)]/5 bg-[var(--overlay-ink)]/5">
                <div className="h-full bg-[#5B69FF] transition-all duration-1000 ease-out" style={{ width: `${progress}%` }} />
            </div>
        </div>
        <dl aria-label="남은 보상과 숙제" className="grid grid-cols-3 gap-2">
            {[
                { label: "골드", value: remainingGold, unit: "G" },
                { label: "귀속", value: remainingBoundGold, unit: "G" },
                { label: "남은 숙제", value: remainingTasks, unit: "개" },
            ].map(({ label, value, unit }) => <div key={label} className="flex min-w-0 items-center justify-between gap-1 rounded-xl border border-[var(--overlay-ink)]/5 bg-[var(--surface-16181d)] px-2 py-4">
                <dt className="shrink-0 whitespace-nowrap text-[10px] font-bold text-gray-500 sm:text-[11px]">{label}</dt>
                <dd className="min-w-0 break-all text-right text-xs font-bold tabular-nums text-gray-100 sm:text-sm">
                    {value.toLocaleString("ko-KR")} <span className="inline-block text-[10px] font-medium text-gray-500">{unit}</span>
                </dd>
            </div>)}
        </dl>
    </div>;
}
