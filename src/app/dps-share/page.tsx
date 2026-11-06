"use client";

import ToolMethodNote from "@/app/components/ToolMethodNote";
import HelpDisclosure from "@/app/components/HelpDisclosure";
import { RAID_DATA, type RaidCategory, type DiffKey } from "@/app/lib/calculators/dps-reference";

import { useMemo, useState } from "react";
import { Check, BarChart3 } from "lucide-react";

const DIFF = {
    나메: {
        badge: "bg-[#6D28D9]/10 text-[#D6BCFA]",
        check: "bg-[#6D28D9] text-white border-[#6D28D9]",
        hover: "hover:bg-[#6D28D9] hover:text-white",
    },
    하드: {
        badge: "bg-[#FF5252]/10 text-[#FF5252]",
        check: "bg-[#ff5a5a] text-white border-[#ff5a5a]",
        hover: "hover:bg-[#FF5252] hover:text-white",
    },
    노말: {
        badge: "bg-[#5B69FF]/10 text-[#5B69FF]",
        check: "bg-[#5B69FF] text-white border-[#5B69FF]",
        hover: "hover:bg-[#5B69FF] hover:text-white",
    },
} as const;

const isNightmareAvailableFor = (category: RaidCategory, act: string) =>
    category !== "카제로스" || act === "종막 익스트림";

export default function DpsSharePage() {
    const [category, setCategory] = useState<RaidCategory>("카제로스");
    const [act, setAct] = useState<string>("1막");
    const [diff, setDiff] = useState<DiffKey>("노말");
    const [dmgInput, setDmgInput] = useState<Record<string, string>>({});

    const handleCategoryChange = (cat: RaidCategory) => {
        setCategory(cat);

        const firstAct = Object.keys(RAID_DATA[cat])[0];
        setAct(firstAct);

        if (!isNightmareAvailableFor(cat, firstAct) && diff === "나메") {
            setDiff("노말");
        }
    };

    const handleActChange = (nextAct: string) => {
        setAct(nextAct);

        const isNightmareAvailable = isNightmareAvailableFor(category, nextAct);

        if (!isNightmareAvailable && diff === "나메") {
            setDiff("노말");
        }
    };

    const is4PlayerRaid =
        category === "어비스 던전" ||
        (category === "그림자" && act === "세르카");

    const strongCut = is4PlayerRaid ? 30 : 15;
    const bleedCut = is4PlayerRaid ? 40 : 20;

    const getDiffLabel = (cat: RaidCategory, d: DiffKey) => {
        if (cat === "어비스 던전") {
            if (d === "노말") return "1단계";
            if (d === "하드") return "2단계";
            if (d === "나메") return "3단계";
        }

        return d;
    };

    const { totalHp, totalShare } = useMemo(() => {
        const rows = RAID_DATA[category][act][diff] || [];

        let hpSum = 0;
        let effectiveTotalDmg = 0;
        let myDmgSum = 0;

        for (const row of rows) {
            const key = `${category}-${act}-${diff}-${row.gate}`;
            const dmg = Number(dmgInput[key] ?? "0") || 0;

            hpSum += row.hp;
            myDmgSum += dmg;

            const bleedDmg = row.range[1];
            effectiveTotalDmg += bleedDmg / (bleedCut / 100);
        }

        const share = effectiveTotalDmg > 0 ? (myDmgSum / effectiveTotalDmg) * 100 : 0;

        return {
            totalHp: hpSum,
            totalShare: share,
        };
    }, [category, act, diff, dmgInput, bleedCut]);

    const rows = RAID_DATA[category][act][diff] || [];
    const isNightmareAvailable = isNightmareAvailableFor(category, act);

    return (
        <>
            <style jsx global>{`
                input[type="number"]::-webkit-outer-spin-button,
                input[type="number"]::-webkit-inner-spin-button {
                    -webkit-appearance: none;
                    margin: 0;
                }
                input[type="number"] {
                    -moz-appearance: textfield;
                    appearance: textfield;
                }
            `}</style>

            <div className="w-full text-white py-8 sm:py-12">
                <div className="mx-auto max-w-[1400px] space-y-4">
                    <div className="relative pb-7 px-4 sm:px-0">
                        <div className="relative flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                            <div className="space-y-2">
                                <div className="inline-flex items-center gap-2 text-xs font-medium text-[#5B69FF]">
                                    <BarChart3 className="h-4 w-4" strokeWidth={2.5} />
                                    <span>딜 지분 분석</span>
                                </div>

                                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                                    딜 지분
                                </h1>

                                <p className="text-sm text-gray-400 max-w-2xl leading-relaxed break-keep">
                                    관문별 내 피해량을 입력하여 공격대 내의 지분율을 실시간으로 분석하고 확인하세요.
                                </p>
                            </div>
                        </div>
                    </div>



                    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 sm:gap-6 items-start">
                        <div className="space-y-4">
                            <section className="rounded-none sm:rounded-xl bg-[var(--surface-16181d)] border-y sm:border border-[var(--overlay-ink)]/5 overflow-hidden">
                                <div className="px-5 py-4 border-b border-[var(--overlay-ink)]/5">
                                    <h2 className="font-semibold text-white flex items-center gap-2">
                                        <span className="w-1 h-4 bg-indigo-500 rounded-full" />
                                        레이드 설정
                                    </h2>
                                </div>

                                <div className="p-5 space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                            카테고리
                                        </label>

                                        <div className="flex flex-col border border-[var(--overlay-ink)]/5 rounded-lg overflow-hidden">
                                            {(["카제로스", "그림자", "어비스 던전"] as RaidCategory[]).map((cat) => (
                                                <button
                                                    key={cat}
                                                    onClick={() => handleCategoryChange(cat)}
                                                    className={`flex w-full items-center gap-3 px-4 py-3 transition-colors border-b border-[var(--overlay-ink)]/5 last:border-b-0 ${category === cat
                                                        ? "bg-[#5B69FF]/15 text-white"
                                                        : "text-gray-400 hover:bg-[var(--overlay-ink)]/5 hover:text-gray-200"
                                                        }`}
                                                >
                                                    <div
                                                        className={`flex items-center justify-center w-4 h-4 ${category === cat ? "text-[#5B69FF]" : "text-transparent"
                                                            }`}
                                                    >
                                                        <Check className="h-4 w-4" strokeWidth={3} />
                                                    </div>

                                                    <span className="text-sm font-bold">{cat}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                            난이도
                                        </label>

                                        <div
                                            className={`grid ${isNightmareAvailable ? "grid-cols-3" : "grid-cols-2"
                                                } gap-2 p-1 bg-[var(--surface-121318)] rounded-lg border border-[var(--overlay-ink)]/5`}
                                        >
                                            {(["노말", "하드", "나메"] as DiffKey[])
                                                .filter((d) => d !== "나메" || isNightmareAvailable)
                                                .map((d) => (
                                                    <button
                                                        key={d}
                                                        onClick={() => setDiff(d)}
                                                        className={`py-2 rounded-md text-sm font-bold transition-all border ${diff === d
                                                            ? DIFF[d].check
                                                            : `bg-[var(--surface-1b222d)] text-gray-400 border-transparent ${DIFF[d].hover}`
                                                            }`}
                                                    >
                                                        {getDiffLabel(category, d)}
                                                    </button>
                                                ))}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                            레이드 선택
                                        </label>

                                        <div className="grid grid-cols-2 gap-2">
                                            {Object.keys(RAID_DATA[category]).map((a) => {
                                                const isActive = act === a;

                                                return (
                                                    <button
                                                        key={a}
                                                        onClick={() => handleActChange(a)}
                                                        className={`relative flex items-center justify-center py-2 px-3 text-sm font-bold rounded-lg border transition-all ${isActive
                                                            ? "bg-[#5B69FF]/15 border-[#5B69FF]/30 text-white"
                                                            : "bg-transparent border-[var(--overlay-ink)]/5 text-gray-500 hover:bg-[var(--overlay-ink)]/5 hover:text-gray-300"
                                                            }`}
                                                    >
                                                        <span className="truncate">{a}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <HelpDisclosure title="사용법">
                                <ol className="space-y-2 text-[13px] leading-relaxed text-gray-400 break-keep">
                                    <li>1. 카테고리, 레이드, 난이도를 선택합니다.</li>
                                    <li>2. 각 관문 카드에 내 피해량을 억 단위로 입력합니다.</li>
                                    <li>3. 관문별 현재 딜 지분과 강투/잔혈 컷을 비교합니다.</li>
                                    <li>4. 상단의 평균 지분으로 전체적인 기여도를 확인합니다.</li>
                                </ol>
                            </HelpDisclosure>
                        </div>

                        <div className="space-y-5">
                            <section className="bg-[var(--surface-16181d)] rounded-none sm:rounded-xl border-y sm:border border-[var(--overlay-ink)]/5 px-5 py-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div
                                        className={`px-3 py-2 rounded-lg flex items-center justify-center text-sm font-bold ${DIFF[diff].badge}`}
                                    >
                                        {getDiffLabel(category, diff)}
                                    </div>

                                    <div>
                                        <div className="text-sm text-gray-400">{act} 종합 분석</div>

                                        <div className="text-white font-bold text-lg">
                                            {totalShare.toFixed(1)}%
                                            <span className="text-xs text-gray-500 font-normal ml-1">
                                                평균 지분
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6 text-right ml-auto sm:ml-0 self-end sm:self-auto">
                                    <div>
                                        <div className="text-xs text-gray-500">보스 총 체력</div>
                                        <div className="text-gray-200 font-medium">
                                            {totalHp.toLocaleString()} <span className="text-xs">억</span>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {rows.length > 0 ? (
                                <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
                                    {rows.map((row) => {
                                        const [strong, bleed] = row.range;
                                        const key = `${category}-${act}-${diff}-${row.gate}`;
                                        const input = dmgInput[key] ?? "";

                                        const effectiveHp = bleed / (bleedCut / 100);
                                        const sharePercent =
                                            effectiveHp > 0
                                                ? ((Number(input) / effectiveHp) * 100).toFixed(1)
                                                : "0.0";

                                        const shareNumber = Number(sharePercent);

                                        return (
                                            <section
                                                key={key}
                                                className="relative group flex flex-col gap-4 rounded-none sm:rounded-xl border-y sm:border border-[var(--overlay-ink)]/5 bg-[var(--surface-16181d)] p-5 transition-all hover:border-[var(--overlay-ink)]/10 shadow-sm"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <h2 className="font-semibold text-gray-200">{row.gate} 관문</h2>
                                                    <span className="text-xs text-gray-500">
                                                        체력: {row.hp.toLocaleString()}억
                                                    </span>
                                                </div>

                                                <div className="relative mt-2">
                                                    <label className="absolute -top-2 left-2 bg-[var(--surface-16181d)] px-1 text-[10px] text-indigo-400 font-medium z-10">
                                                        나의 피해량
                                                    </label>

                                                    <div className="flex items-center rounded-lg bg-[var(--surface-0f1014)] border border-[var(--overlay-ink)]/10 focus-within:border-indigo-500/50 transition-all">
                                                        <input
                                                            type="number"
                                                            inputMode="numeric"
                                                            placeholder="0"
                                                            value={input}
                                                            onChange={(e) =>
                                                                setDmgInput((prev) => ({
                                                                    ...prev,
                                                                    [key]: e.target.value,
                                                                }))
                                                            }
                                                            className="w-full bg-transparent px-4 py-3 text-white outline-none text-xl font-medium"
                                                            aria-label={`${row.gate}관문 나의 피해량 입력`}
                                                        />

                                                        <span className="pr-4 text-sm text-gray-600 font-bold">억</span>
                                                    </div>
                                                </div>

                                                <div className="mt-auto space-y-4">
                                                    <div className="flex items-end justify-between border-b border-[var(--overlay-ink)]/5 pb-3">
                                                        <span className="text-[11px] text-gray-500 font-medium">
                                                            현재 딜 지분
                                                        </span>

                                                        <span
                                                            className={`text-2xl font-bold ${shareNumber >= bleedCut
                                                                ? "text-[#FF8585]"
                                                                : shareNumber >= strongCut
                                                                    ? "text-[#7C88FF]"
                                                                    : "text-white"
                                                                }`}
                                                        >
                                                            {sharePercent}%
                                                        </span>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="flex flex-col items-center justify-center rounded-lg bg-[#5B69FF]/5 border border-[#5B69FF]/10 py-2.5">
                                                            <span className="text-[14px] text-[#7C88FF] font-bold mb-0.5">
                                                                강투 ({strongCut}%)
                                                            </span>
                                                            <span className="text-lg font-medium text-gray-300">
                                                                {strong.toLocaleString()}억
                                                            </span>
                                                        </div>

                                                        <div className="flex flex-col items-center justify-center rounded-lg bg-[#FF5252]/5 border border-[#FF5252]/10 py-2.5">
                                                            <span className="text-[14px] text-[#FF8585] font-bold mb-0.5">
                                                                잔혈 ({bleedCut}%)
                                                            </span>
                                                            <span className="text-lg font-medium text-gray-300">
                                                                {bleed.toLocaleString()}억
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </section>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="py-20 text-center text-gray-500 bg-[var(--surface-16181d)] rounded-none sm:rounded-xl border-y sm:border border-dashed border-[var(--overlay-ink)]/10">
                                    해당 난이도의 데이터가 없습니다.
                                </div>
                            )}

                            <div className="mt-6 space-y-4">
                                <HelpDisclosure title="입력과 결과 해석">
                                    <div className="space-y-3">
                                        <p>피해량은 억 단위로 입력하세요. 예를 들어 125억 5천만은 125.5로 입력합니다.</p>
                                        <p>사이트 비교 기준은 8인 레이드 강투 15%·잔혈 20%, 4인 레이드 강투 30%·잔혈 40%입니다.</p>
                                        <p>전체 지분은 입력한 관문들의 피해량을 합산한 비율입니다. 관문별 결과와 함께 확인하고, 파티 구성과 기믹 수행에 따른 차이를 고려하세요.</p>
                                    </div>
                                </HelpDisclosure>
                                <ToolMethodNote tool="dps" className="" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
