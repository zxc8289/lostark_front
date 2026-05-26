"use client";

import { useMemo, useState } from "react";
import { Check, Info, HelpCircle, BarChart3, Target, Users, AlertTriangle } from "lucide-react";

type RaidCategory = "카제로스" | "그림자" | "어비스 던전";
type DiffKey = "노말" | "하드" | "나메";

type GateRow = {
    gate: number;
    hp: number;
    range: [number, number]; // [강투 컷, 잔혈 컷]
};

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

// 8인 레이드: 잔혈 20% / 강투 15%
// 4인 레이드(세르카, 지평의 성당): 잔혈 40% / 강투 30%
const RAID_DATA: Record<RaidCategory, Record<string, Record<DiffKey, GateRow[]>>> = {
    카제로스: {
        "1막": {
            노말: [
                { gate: 1, hp: 1615, range: [270, 365] },
                { gate: 2, hp: 2132, range: [335, 450] },
            ],
            하드: [
                { gate: 1, hp: 2698, range: [450, 600] },
                { gate: 2, hp: 3985, range: [600, 800] },
            ],
            나메: [],
        },
        "2막": {
            노말: [
                { gate: 1, hp: 2754, range: [450, 600] },
                { gate: 2, hp: 3994, range: [610, 810] },
            ],
            하드: [
                { gate: 1, hp: 5163, range: [900, 1200] },
                { gate: 2, hp: 8253, range: [1200, 1600] },
            ],
            나메: [],
        },
        "3막": {
            노말: [
                { gate: 1, hp: 3687, range: [525, 700] },
                { gate: 2, hp: 3346, range: [460, 620] },
                { gate: 3, hp: 7319, range: [1000, 1360] },
            ],
            하드: [
                { gate: 1, hp: 5872, range: [846, 1125] },
                { gate: 2, hp: 5968, range: [873, 1170] },
                { gate: 3, hp: 12527, range: [1828, 2508] },
            ],
            나메: [],
        },
        "4막": {
            노말: [
                { gate: 1, hp: 4750, range: [740, 990] },
                { gate: 2, hp: 5250, range: [950, 1270] },
            ],
            하드: [
                { gate: 1, hp: 9500, range: [1425, 1900] },
                { gate: 2, hp: 10500, range: [1575, 2250] },
            ],
            나메: [],
        },
        종막: {
            노말: [
                { gate: 1, hp: 8041, range: [1190, 1590] },
                { gate: 2, hp: 7629, range: [1050, 1400] },
            ],
            하드: [
                { gate: 1, hp: 16222, range: [2400, 3200] },
                { gate: 2, hp: 24431, range: [4275, 5700] },
            ],
            나메: [],
        },
        "2막-EX": {
            노말: [{ gate: 1, hp: 11966, range: [1542, 2056] }],
            하드: [{ gate: 1, hp: 32449, range: [4174, 5565] }],
            나메: [{ gate: 1, hp: 73669, range: [9477, 12635] }],
        },
    },
    그림자: {
        세르카: {
            노말: [
                { gate: 1, hp: 3699, range: [1100, 1480] },
                { gate: 2, hp: 4768, range: [1430, 1900] },
            ],
            하드: [
                { gate: 1, hp: 7695, range: [2300, 3070] },
                { gate: 2, hp: 9919, range: [2980, 3970] },
            ],
            나메: [
                { gate: 1, hp: 11941, range: [3580, 4770] },
                { gate: 2, hp: 15392, range: [4620, 6160] },
            ],
        },
    },
    "어비스 던전": {
        "지평의 성당": {
            노말: [
                { gate: 1, hp: 3112, range: [990, 1330] },
                { gate: 2, hp: 3125, range: [938, 1250] },
            ],
            하드: [
                { gate: 1, hp: 6765, range: [2157, 2876] },
                { gate: 2, hp: 6964, range: [2089, 2785] },
            ],
            나메: [
                { gate: 1, hp: 11400, range: [3602, 4854] },
                { gate: 2, hp: 11900, range: [3570, 4760] },
            ],
        },
    },
};

export default function DpsSharePage() {
    const [category, setCategory] = useState<RaidCategory>("카제로스");
    const [act, setAct] = useState<string>("1막");
    const [diff, setDiff] = useState<DiffKey>("노말");
    const [dmgInput, setDmgInput] = useState<Record<string, string>>({});

    const handleCategoryChange = (cat: RaidCategory) => {
        setCategory(cat);

        const firstAct = Object.keys(RAID_DATA[cat])[0];
        setAct(firstAct);

        if (cat === "카제로스" && diff === "나메") {
            setDiff("노말");
        }
    };

    const handleActChange = (nextAct: string) => {
        setAct(nextAct);

        const isNightmareAvailable = category !== "카제로스" || nextAct === "2막-EX";

        if (!isNightmareAvailable && diff === "나메") {
            setDiff("노말");
        }
    };

    const is4PlayerRaid = category === "그림자" || category === "어비스 던전";

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
    const isNightmareAvailable = category !== "카제로스" || act === "2막-EX";

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
                            <section className="rounded-none sm:rounded-xl bg-[#16181D] border-y sm:border border-white/5 overflow-hidden">
                                <div className="px-5 py-4 border-b border-white/5">
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

                                        <div className="flex flex-col border border-white/5 rounded-lg overflow-hidden">
                                            {(["카제로스", "그림자", "어비스 던전"] as RaidCategory[]).map((cat) => (
                                                <button
                                                    key={cat}
                                                    onClick={() => handleCategoryChange(cat)}
                                                    className={`flex w-full items-center gap-3 px-4 py-3 transition-colors border-b border-white/5 last:border-b-0 ${category === cat
                                                        ? "bg-[#5B69FF]/15 text-white"
                                                        : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
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
                                                } gap-2 p-1 bg-[#121318] rounded-lg border border-white/5`}
                                        >
                                            {(["노말", "하드", "나메"] as DiffKey[])
                                                .filter((d) => d !== "나메" || isNightmareAvailable)
                                                .map((d) => (
                                                    <button
                                                        key={d}
                                                        onClick={() => setDiff(d)}
                                                        className={`py-2 rounded-md text-sm font-bold transition-all border ${diff === d
                                                            ? DIFF[d].check
                                                            : `bg-[#1B222D] text-gray-400 border-transparent ${DIFF[d].hover}`
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
                                                            : "bg-transparent border-white/5 text-gray-500 hover:bg-white/5 hover:text-gray-300"
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

                            <section className="rounded-none sm:rounded-xl bg-[#16181D] border-y sm:border border-white/5 p-5">
                                <h2 className="text-sm font-bold text-gray-200 mb-3">빠른 사용법</h2>

                                <ol className="space-y-2 text-[13px] leading-relaxed text-gray-400 break-keep">
                                    <li>1. 카테고리, 레이드, 난이도를 선택합니다.</li>
                                    <li>2. 각 관문 카드에 내 피해량을 억 단위로 입력합니다.</li>
                                    <li>3. 관문별 현재 딜 지분과 강투/잔혈 컷을 비교합니다.</li>
                                    <li>4. 상단의 평균 지분으로 전체적인 기여도를 확인합니다.</li>
                                </ol>
                            </section>
                        </div>

                        <div className="space-y-5">
                            <section className="bg-[#16181D] rounded-none sm:rounded-xl border-y sm:border border-white/5 px-5 py-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
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
                                                className="relative group flex flex-col gap-4 rounded-none sm:rounded-xl border-y sm:border border-white/5 bg-[#16181D] p-5 transition-all hover:border-white/10 shadow-sm"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <h2 className="font-semibold text-gray-200">{row.gate} 관문</h2>
                                                    <span className="text-xs text-gray-500">
                                                        체력: {row.hp.toLocaleString()}억
                                                    </span>
                                                </div>

                                                <div className="relative mt-2">
                                                    <label className="absolute -top-2 left-2 bg-[#16181D] px-1 text-[10px] text-indigo-400 font-medium z-10">
                                                        나의 피해량
                                                    </label>

                                                    <div className="flex items-center rounded-lg bg-[#0F1014] border border-white/10 focus-within:border-indigo-500/50 transition-all">
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
                                                    <div className="flex items-end justify-between border-b border-white/5 pb-3">
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
                                <div className="py-20 text-center text-gray-500 bg-[#16181D] rounded-none sm:rounded-xl border-y sm:border border-dashed border-white/10">
                                    해당 난이도의 데이터가 없습니다.
                                </div>
                            )}

                            <div className="space-y-4 mt-6">
                                <section className="rounded-none sm:rounded-xl bg-gradient-to-b from-[#16181D] to-[#121318] border-y sm:border border-white/5 p-5">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Info className="w-4 h-4 text-indigo-400" />
                                        <h2 className="text-sm font-bold text-gray-200">딜 지분 계산기란?</h2>
                                    </div>

                                    <div className="space-y-3 text-[13px] leading-relaxed text-gray-400 break-keep">
                                        <p>
                                            <strong className="text-gray-300">로스트아크 딜 지분 계산기</strong>는
                                            게임 내 MVP 화면이나 전투 기록에서 확인한 내 피해량을 바탕으로,
                                            선택한 레이드와 관문에서 내가 어느 정도의 딜 기여도를 냈는지 계산하는 도구입니다.
                                        </p>

                                        <p>
                                            단순히 총 피해량만 보는 것이 아니라, 레이드 인원 수와 관문별 기준값을 함께 고려해
                                            <strong className="text-gray-300"> 강투, 잔혈 컷에 얼마나 가까운지</strong>를
                                            확인할 수 있습니다. 같은 피해량이라도 8인 레이드인지 4인 레이드인지에 따라
                                            의미가 달라지기 때문에 지분율로 보는 것이 더 직관적입니다.
                                        </p>

                                        <p>
                                            이 페이지는 자신의 플레이 기록을 정리하거나, 관문별로 어느 구간에서 딜 기여도가
                                            높았는지 비교할 때 사용할 수 있습니다.
                                        </p>
                                    </div>
                                </section>

                                <section className="rounded-none sm:rounded-xl bg-[#16181D] border-y sm:border border-white/5 p-5">
                                    <h2 className="text-sm font-bold text-gray-200 mb-3">강투, 잔혈 기준</h2>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[13px] leading-relaxed text-gray-400 break-keep">
                                        <div className="rounded-lg bg-[#0F1014] border border-white/5 p-4">
                                            <strong className="text-gray-300 font-medium block mb-1">
                                                8인 레이드 기준
                                            </strong>
                                            <p>• 1인분 평균: 약 16.6%</p>
                                            <p>
                                                • <span className="text-[#7C88FF]">강직한 투사</span>: 15% 이상
                                            </p>
                                            <p>
                                                • <span className="text-[#FF8585]">잔혹한 혈투사</span>: 20% 이상
                                            </p>
                                        </div>

                                        <div className="rounded-lg bg-[#0F1014] border border-white/5 p-4">
                                            <strong className="text-gray-300 font-medium block mb-1">
                                                4인 레이드 기준
                                            </strong>
                                            <p>• 1인분 평균: 약 33.3%</p>
                                            <p>
                                                • <span className="text-[#7C88FF]">강직한 투사</span>: 30% 이상
                                            </p>
                                            <p>
                                                • <span className="text-[#FF8585]">잔혹한 혈투사</span>: 40% 이상
                                            </p>
                                        </div>
                                    </div>
                                </section>

                                <section className="rounded-none sm:rounded-xl bg-[#16181D] border-y sm:border border-white/5 p-5">
                                    <h2 className="text-sm font-bold text-gray-200 mb-3">계산 원리</h2>

                                    <div className="space-y-3 text-[13px] leading-relaxed text-gray-400 break-keep">
                                        <p>
                                            이 페이지는 입력한 피해량을 단순히 보스 체력으로 나누는 방식이 아니라,
                                            관문별 강투/잔혈 컷 수치를 기준으로 실질적인 전체 딜량을 역산한 뒤
                                            내 피해량이 차지하는 비율을 계산합니다.
                                        </p>

                                        <p>
                                            예를 들어 잔혈 기준이 20%인 8인 레이드에서 특정 관문의 잔혈 컷이 1,000억이라면,
                                            해당 관문의 실질 총 딜량은 약 5,000억으로 볼 수 있습니다. 여기에 내 피해량을
                                            대입해 현재 지분율을 계산하는 구조입니다.
                                        </p>

                                        <div className="rounded-lg bg-[#0F1014] border border-white/5 p-4 space-y-2">
                                            <p className="text-gray-300 font-semibold">간단 계산 흐름</p>
                                            <p>1. 선택한 레이드와 난이도의 관문별 기준값을 불러옵니다.</p>
                                            <p>2. 잔혈 컷과 잔혈 기준 퍼센트로 관문별 실질 총 딜량을 추정합니다.</p>
                                            <p>3. 입력한 내 피해량을 실질 총 딜량으로 나누어 지분율을 계산합니다.</p>
                                            <p>4. 강투/잔혈 기준을 넘었는지 색상과 수치로 표시합니다.</p>
                                        </div>
                                    </div>
                                </section>

                                <section className="rounded-none sm:rounded-xl bg-[#16181D] border-y sm:border border-white/5 p-5">
                                    <h2 className="text-sm font-bold text-gray-200 mb-3">예시 입력 방법</h2>

                                    <div className="space-y-3 text-[13px] leading-relaxed text-gray-400 break-keep">
                                        <p>
                                            예를 들어 2관문 레이드에서 1관문 피해량이 320억, 2관문 피해량이 410억으로
                                            표시됐다면 각 관문 입력칸에 320, 410을 그대로 입력하면 됩니다.
                                        </p>

                                        <p>
                                            입력 후 각 관문 카드에서는 관문별 지분율을 확인할 수 있고, 상단 종합 분석에서는
                                            입력한 관문 전체를 합산한 평균 지분을 확인할 수 있습니다.
                                        </p>

                                        <div className="rounded-lg bg-indigo-500/10 border border-indigo-500/20 p-4">
                                            <p className="text-indigo-200 font-medium">
                                                입력 단위는 “억”입니다. 1,200억을 기록했다면 1200처럼 숫자만 입력하면 됩니다.
                                            </p>
                                        </div>
                                    </div>
                                </section>

                                <section className="rounded-none sm:rounded-xl bg-[#16181D] border-y sm:border border-white/5 p-5">
                                    <h2 className="text-sm font-bold text-gray-200 mb-3">결과 해석 방법</h2>

                                    <div className="space-y-3 text-[13px] leading-relaxed text-gray-400 break-keep">
                                        <p>
                                            현재 선택한 레이드는 <strong className="text-white">{category} {act}</strong>,
                                            난이도는 <strong className="text-white">{getDiffLabel(category, diff)}</strong>입니다.
                                            이 기준에서는 강투 컷이 <span className="text-[#7C88FF] font-semibold">{strongCut}%</span>,
                                            잔혈 컷이 <span className="text-[#FF8585] font-semibold"> {bleedCut}%</span>로 적용됩니다.
                                        </p>

                                        <p>
                                            지분율이 강투 기준 이상이면 파란색 계열로, 잔혈 기준 이상이면 붉은색 계열로 표시됩니다.
                                            기준 아래라도 평균 1인분에 가까운 경우에는 충분히 안정적인 딜 기여를 했다고 볼 수 있습니다.
                                        </p>

                                        <p>
                                            다만 특정 관문은 패턴, 기믹, 딜 타이밍, 파티 조합에 따라 딜 기회가 달라질 수 있습니다.
                                            그래서 단일 관문 수치만 보기보다 여러 관문과 여러 기록을 비교하는 편이 더 정확합니다.
                                        </p>
                                    </div>
                                </section>

                                <section className="rounded-none sm:rounded-xl bg-[#16181D] border-y sm:border border-white/5 p-5">
                                    <h2 className="text-sm font-bold text-gray-200 mb-3">활용하면 좋은 상황</h2>

                                    <div className="grid gap-3 md:grid-cols-2 text-[13px] leading-relaxed text-gray-400 break-keep">
                                        <div className="rounded-lg bg-[#0F1014] border border-white/5 p-4">
                                            <h3 className="text-gray-200 font-semibold mb-2">레이드 복기</h3>
                                            <p>
                                                클리어 후 관문별 내 피해량을 넣어 어느 관문에서 강했고 어느 관문에서 낮았는지 확인할 수 있습니다.
                                            </p>
                                        </div>

                                        <div className="rounded-lg bg-[#0F1014] border border-white/5 p-4">
                                            <h3 className="text-gray-200 font-semibold mb-2">세팅 비교</h3>
                                            <p>
                                                보석, 엘릭서, 초월, 각인, 스킬트리 변경 전후의 딜 지분을 비교하는 참고 자료로 사용할 수 있습니다.
                                            </p>
                                        </div>

                                        <div className="rounded-lg bg-[#0F1014] border border-white/5 p-4">
                                            <h3 className="text-gray-200 font-semibold mb-2">관문별 약점 확인</h3>
                                            <p>
                                                특정 관문에서만 지분이 낮다면 딜 타이밍, 포지션, 패턴 이해도를 점검하는 데 도움이 됩니다.
                                            </p>
                                        </div>

                                        <div className="rounded-lg bg-[#0F1014] border border-white/5 p-4">
                                            <h3 className="text-gray-200 font-semibold mb-2">성장 체감 확인</h3>
                                            <p>
                                                장비 성장 후 같은 레이드에서 지분이 어떻게 변했는지 비교해 성장 체감을 수치로 볼 수 있습니다.
                                            </p>
                                        </div>
                                    </div>
                                </section>

                                <section className="rounded-none sm:rounded-xl bg-[#16181D] border-y sm:border border-white/5 p-5">
                                    <div className="flex items-center gap-2 mb-3">
                                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                                        <h2 className="text-sm font-bold text-gray-200">주의사항</h2>
                                    </div>

                                    <div className="space-y-3 text-[13px] leading-relaxed text-gray-400 break-keep">
                                        <p>
                                            딜 지분은 실전 퍼포먼스를 정리하는 데 유용한 참고 지표지만, 모든 공략 기여도를
                                            완전히 반영하는 절대값은 아닙니다.
                                        </p>

                                        <ul className="space-y-2">
                                            <li>• 시너지 조합, 서포터 숙련도, 기믹 수행 비중은 숫자만으로 완전히 드러나지 않을 수 있습니다.</li>
                                            <li>• 무력화, 카운터, 패턴 처리, 생존 안정성은 딜 지분과 별개로 중요한 공략 기여도입니다.</li>
                                            <li>• 관문 구조나 파티 딜 편차가 큰 레이드는 단순 평균보다 관문별 수치를 함께 보는 것이 좋습니다.</li>
                                            <li>• 입력값은 사용자가 직접 넣은 피해량 기준이므로, 잘못 입력하면 결과도 달라집니다.</li>
                                            <li>• 이 계산 결과는 실전 기록을 정리하고 비교하는 참고 자료로 활용하는 것이 가장 적절합니다.</li>
                                        </ul>
                                    </div>
                                </section>

                                <section className="rounded-none sm:rounded-xl bg-[#16181D] border-y sm:border border-white/5 p-5">
                                    <div className="flex items-center gap-2 mb-4">
                                        <HelpCircle className="w-4 h-4 text-indigo-400" />
                                        <h2 className="text-sm font-bold text-gray-200">자주 묻는 질문</h2>
                                    </div>

                                    <div className="space-y-3">
                                        {[
                                            {
                                                q: "피해량은 어디에서 확인하나요?",
                                                a: "레이드 종료 후 MVP 화면이나 전투 기록에서 확인한 내 피해량을 기준으로 입력하면 됩니다. 이 페이지는 억 단위 입력을 기준으로 계산합니다.",
                                            },
                                            {
                                                q: "왜 보스 체력으로 바로 나누지 않나요?",
                                                a: "실제 전투에서는 회복, 실드, 기믹, 딜컷 등으로 단순 보스 체력과 실질 총 딜량이 다르게 느껴질 수 있습니다. 이 페이지는 관문별 강투/잔혈 컷을 기준으로 실질 딜량을 역산해 지분을 계산합니다.",
                                            },
                                            {
                                                q: "8인 레이드와 4인 레이드 기준이 다른 이유는 무엇인가요?",
                                                a: "딜러 수와 파티 구조가 다르기 때문입니다. 8인 레이드는 일반적으로 한 명의 지분 기준이 낮고, 4인 레이드는 한 명이 차지하는 비중이 더 큽니다.",
                                            },
                                            {
                                                q: "강투 기준을 넘으면 무조건 잘한 건가요?",
                                                a: "강투 기준을 넘었다면 딜 기여도 자체는 좋은 편으로 볼 수 있습니다. 다만 시너지, 기믹 처리, 생존, 파티 조합도 함께 봐야 더 정확합니다.",
                                            },
                                            {
                                                q: "잔혈 기준을 넘지 못하면 문제가 있는 건가요?",
                                                a: "반드시 그렇지는 않습니다. 파티 딜 분포, 기믹 수행, 직업 구조, 딜 타이밍에 따라 잔혈 기준에 도달하지 못할 수 있습니다. 반복 기록을 비교하는 것이 더 좋습니다.",
                                            },
                                            {
                                                q: "평균 지분은 어떻게 해석하면 되나요?",
                                                a: "입력한 관문들의 피해량을 합산해 전체적으로 어느 정도 딜 기여를 했는지 보여주는 값입니다. 관문별 편차가 큰 경우에는 평균과 개별 관문 결과를 함께 보는 것이 좋습니다.",
                                            },
                                            {
                                                q: "이 계산 결과가 실제 MVP 칭호와 다를 수 있나요?",
                                                a: "있을 수 있습니다. 게임 내 MVP는 다양한 요소와 내부 계산 기준이 적용될 수 있고, 이 페이지는 공개적으로 보이는 피해량과 기준값을 바탕으로 한 참고용 계산입니다.",
                                            },
                                        ].map((item) => (
                                            <details
                                                key={item.q}
                                                className="group rounded-xl border border-white/5 bg-[#0F1014] px-4 py-3"
                                            >
                                                <summary className="list-none [&::-webkit-details-marker]:hidden cursor-pointer">
                                                    <span className="text-sm font-semibold text-gray-200">
                                                        {item.q}
                                                    </span>
                                                </summary>

                                                <div className="pt-3 mt-3 border-t border-white/5 text-sm text-gray-400 leading-relaxed break-keep">
                                                    {item.a}
                                                </div>
                                            </details>
                                        ))}
                                    </div>
                                </section>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}