"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, Info } from "lucide-react";
import GoogleAd from "../components/GoogleAd";

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
    "카제로스": {
        "1막": {
            노말: [{ gate: 1, hp: 1615, range: [270, 365] }, { gate: 2, hp: 2132, range: [335, 450] }],
            하드: [{ gate: 1, hp: 2698, range: [450, 600] }, { gate: 2, hp: 3985, range: [600, 800] }],
            나메: [],
        },
        "2막": {
            노말: [{ gate: 1, hp: 2754, range: [450, 600] }, { gate: 2, hp: 3994, range: [610, 810] }],
            하드: [{ gate: 1, hp: 5163, range: [900, 1200] }, { gate: 2, hp: 8253, range: [1200, 1600] }],
            나메: [],
        },
        "3막": {
            노말: [{ gate: 1, hp: 3687, range: [525, 700] }, { gate: 2, hp: 3346, range: [460, 620] }, { gate: 3, hp: 7319, range: [1000, 1360] }],
            하드: [{ gate: 1, hp: 5872, range: [846, 1125] }, { gate: 2, hp: 5968, range: [873, 1170] }, { gate: 3, hp: 12527, range: [1828, 2508] }],
            나메: [],
        },
        "4막": {
            노말: [{ gate: 1, hp: 4750, range: [740, 990] }, { gate: 2, hp: 5250, range: [950, 1270] }],
            하드: [{ gate: 1, hp: 9500, range: [1425, 1900] }, { gate: 2, hp: 10500, range: [1575, 2250] }],
            나메: [],
        },
        "종막": {
            노말: [{ gate: 1, hp: 8041, range: [1190, 1590] }, { gate: 2, hp: 7629, range: [1050, 1400] }],
            하드: [{ gate: 1, hp: 16222, range: [2400, 3200] }, { gate: 2, hp: 24431, range: [4275, 5700] }],
            나메: [],
        },
        "1막-EX": {
            "노말": [
                { "gate": 1, "hp": 16400, "range": [2042, 2723] }
            ],
            "하드": [
                { "gate": 1, "hp": 33500, "range": [4161, 5548] }
            ],
            "나메": [
                { "gate": 1, "hp": 60200, "range": [7461, 9948] }
            ]
        }
    },
    "그림자": {
        "세르카": {
            노말: [{ gate: 1, hp: 3699, range: [1100, 1480] }, { gate: 2, hp: 4768, range: [1430, 1900] }],
            하드: [{ gate: 1, hp: 7695, range: [2300, 3070] }, { gate: 2, hp: 9919, range: [2980, 3970] }],
            나메: [{ gate: 1, hp: 11941, range: [3580, 4770] }, { gate: 2, hp: 15392, range: [4620, 6160] }],
        }
    },
    "어비스 던전": {
        "지평의 성당": {
            "노말": [
                { "gate": 1, "hp": 3112, "range": [990, 1330] },
                { "gate": 2, "hp": 3125, "range": [938, 1250] }
            ],
            "하드": [
                { "gate": 1, "hp": 6765, "range": [2157, 2876] },
                { "gate": 2, "hp": 6964, "range": [2089, 2785] }
            ],
            "나메": [
                { "gate": 1, "hp": 11400, "range": [3602, 4854] },
                { "gate": 2, "hp": 11900, "range": [3570, 4760] }
            ]
        }
    }
};

export default function DpsSharePage() {
    const [category, setCategory] = useState<RaidCategory>("카제로스");
    const [act, setAct] = useState<string>("1막");
    const [diff, setDiff] = useState<DiffKey>("노말");
    const [dmgInput, setDmgInput] = useState<Record<string, string>>({});

    const AD_SLOT_BOTTOM_BANNER = "7577482274";

    const handleCategoryChange = (cat: RaidCategory) => {
        setCategory(cat);
        const firstAct = Object.keys(RAID_DATA[cat])[0];
        setAct(firstAct);
        if (cat === "카제로스" && diff === "나메") {
            setDiff("노말");
        }
    };

    // 4인 레이드인지 8인 레이드인지 판별
    const is4PlayerRaid = category === "그림자" || category === "어비스 던전";
    // 칭호 기준 퍼센트
    const strongCut = is4PlayerRaid ? 30 : 15;
    const bleedCut = is4PlayerRaid ? 40 : 20;

    // 단계/난이도 텍스트 변환 헬퍼 (지평의 성당인 경우 1단계, 2단계, 3단계로 표시)
    const getDiffLabel = (cat: RaidCategory, d: DiffKey) => {
        if (cat === "어비스 던전") {
            if (d === "노말") return "1단계";
            if (d === "하드") return "2단계";
            if (d === "나메") return "3단계";
        }
        return d;
    };

    // 전체 요약 계산 (보스 체력 기반이 아닌, 잔혈 컷을 역산한 "실질 총 피해량" 기준)
    const { totalHp, totalShare } = useMemo(() => {
        const rows = RAID_DATA[category][act][diff] || [];
        let hpSum = 0; // 보여주기용 보스 총 체력
        let effectiveTotalDmg = 0; // 잔혈 컷으로 역산한 파티 실질 총 딜량
        let myDmgSum = 0;

        for (const row of rows) {
            const key = `${category}-${act}-${diff}-${row.gate}`;
            const dmg = Number(dmgInput[key] ?? "0") || 0;
            hpSum += row.hp;
            myDmgSum += dmg;

            // [강투, 잔혈]
            const bleedDmg = row.range[1];
            // 잔혈 딜량 / 잔혈 기준치(0.2 or 0.4) = 해당 관문의 파티 전체 실질 딜량
            effectiveTotalDmg += bleedDmg / (bleedCut / 100);
        }

        const share = effectiveTotalDmg > 0 ? (myDmgSum / effectiveTotalDmg) * 100 : 0;
        return { totalHp: hpSum, totalShare: share };
    }, [category, act, diff, dmgInput, bleedCut]);

    const rows = RAID_DATA[category][act][diff] || [];

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
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V19.875c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                                    </svg>
                                    <span>딜 지분 분석</span>
                                </div>
                                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">딜 지분</h1>
                                <p className="text-sm text-gray-400 max-w-lg leading-relaxed">
                                    관문별 내 피해량을 입력하여 공격대 내의 지분율을 실시간으로 분석하고 확인하세요.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 sm:gap-6 items-start">
                        <div className="space-y-4">
                            {/* [좌측] 레이드 설정 */}
                            <section className="rounded-none sm:rounded-xl bg-[#16181D] border-y sm:border border-white/5 overflow-hidden">
                                <div className="px-5 py-4 border-b border-white/5">
                                    <h3 className="font-semibold text-white flex items-center gap-2">
                                        <span className="w-1 h-4 bg-indigo-500 rounded-full" />
                                        레이드 설정
                                    </h3>
                                </div>

                                <div className="p-5 space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">카테고리</label>
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
                                                    <div className={`flex items-center justify-center w-4 h-4 ${category === cat ? 'text-[#5B69FF]' : 'text-transparent'}`}>
                                                        <Check className="h-4 w-4" strokeWidth={3} />
                                                    </div>
                                                    <span className="text-sm font-bold">{cat}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">난이도</label>
                                        {(() => {
                                            const isNightmareAvailable = category !== "카제로스" || act === "1막-EX";
                                            return (
                                                <div className={`grid ${isNightmareAvailable ? "grid-cols-3" : "grid-cols-2"} gap-2 p-1 bg-[#121318] rounded-lg border border-white/5`}>
                                                    {(["노말", "하드", "나메"] as DiffKey[])
                                                        .filter(d => d !== "나메" || isNightmareAvailable)
                                                        .map((d) => (
                                                            <button
                                                                key={d}
                                                                onClick={() => setDiff(d)}
                                                                className={`py-2 rounded-md text-sm font-bold transition-all border ${diff === d ? DIFF[d].check : `bg-[#1B222D] text-gray-400 border-transparent ${DIFF[d].hover}`
                                                                    }`}
                                                            >
                                                                {getDiffLabel(category, d)}
                                                            </button>
                                                        ))}
                                                </div>
                                            );
                                        })()}
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">레이드 선택</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {Object.keys(RAID_DATA[category]).map((a) => {
                                                const isActive = act === a;
                                                return (
                                                    <button
                                                        key={a}
                                                        onClick={() => setAct(a)}
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
                        </div>

                        {/* [우측] 결과 영역 */}
                        <div className="space-y-5">
                            <div className="bg-[#16181D] rounded-none sm:rounded-xl border-y sm:border border-white/5 px-5 py-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className={`px-3 py-2 rounded-lg flex items-center justify-center text-sm font-bold ${DIFF[diff].badge}`}>
                                        {getDiffLabel(category, diff)}
                                    </div>
                                    <div>
                                        <div className="text-sm text-gray-400">{act} 종합 분석</div>
                                        <div className="text-white font-bold text-lg">
                                            {totalShare.toFixed(1)}% <span className="text-xs text-gray-500 font-normal ml-1">평균 지분</span>
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
                            </div>

                            {rows.length > 0 ? (
                                <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
                                    {rows.map((row) => {
                                        const [strong, bleed] = row.range;
                                        const key = `${category}-${act}-${diff}-${row.gate}`;
                                        const input = dmgInput[key] ?? "";

                                        const effectiveHp = bleed / (bleedCut / 100);
                                        const sharePercent = effectiveHp > 0 ? ((Number(input) / effectiveHp) * 100).toFixed(1) : "0.0";

                                        return (
                                            <div key={key} className="relative group flex flex-col gap-4 rounded-none sm:rounded-xl border-y sm:border border-white/5 bg-[#16181D] p-5 transition-all hover:border-white/10 shadow-sm">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-semibold text-gray-200">{row.gate} 관문</span>
                                                    <span className="text-xs text-gray-500">체력: {row.hp.toLocaleString()}억</span>
                                                </div>
                                                <div className="relative mt-2">
                                                    <label className="absolute -top-2 left-2 bg-[#16181D] px-1 text-[10px] text-indigo-400 font-medium z-10">나의 피해량</label>
                                                    <div className="flex items-center rounded-lg bg-[#0F1014] border border-white/10 focus-within:border-indigo-500/50 transition-all">
                                                        <input
                                                            type="number"
                                                            placeholder="0"
                                                            value={input}
                                                            onChange={(e) => setDmgInput(prev => ({ ...prev, [key]: e.target.value }))}
                                                            className="w-full bg-transparent px-4 py-3 text-white outline-none text-xl font-medium"
                                                        />
                                                        <span className="pr-4 text-sm text-gray-600 font-bold">억</span>
                                                    </div>
                                                </div>
                                                <div className="mt-auto space-y-4">
                                                    <div className="flex items-end justify-between border-b border-white/5 pb-3">
                                                        <span className="text-[11px] text-gray-500 font-medium">현재 딜 지분</span>
                                                        <span className={`text-2xl font-bold ${Number(sharePercent) >= bleedCut ? "text-[#FF8585]" : Number(sharePercent) >= strongCut ? "text-[#7C88FF]" : "text-white"}`}>
                                                            {sharePercent}%
                                                        </span>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="flex flex-col items-center justify-center rounded-lg bg-[#5B69FF]/5 border border-[#5B69FF]/10 py-2.5">
                                                            <span className="text-[14px] text-[#7C88FF] font-bold mb-0.5">강투 ({strongCut}%)</span>
                                                            <span className="text-lg font-medium text-gray-300">{strong.toLocaleString()}억</span>
                                                        </div>
                                                        <div className="flex flex-col items-center justify-center rounded-lg bg-[#FF5252]/5 border border-[#FF5252]/10 py-2.5">
                                                            <span className="text-[14px] text-[#FF8585] font-bold mb-0.5">잔혈 ({bleedCut}%)</span>
                                                            <span className="text-lg font-medium text-gray-300">{bleed.toLocaleString()}억</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
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
                                        <h4 className="text-sm font-bold text-gray-200">딜 지분 계산기란?</h4>
                                    </div>

                                    <div className="space-y-3 text-[13px] leading-relaxed text-gray-400 break-keep">
                                        <p>
                                            <strong>로스트아크 딜 지분 계산기</strong>는 게임 내 MVP 화면에서 확인한 내 피해량(억 단위)을 바탕으로,
                                            <strong className="text-gray-300 font-medium"> 보스 체력과 관문별 기준값을 참고해 내 실질적인 딜 기여도(%)를 확인하는 분석 도구</strong>
                                            입니다.
                                        </p>
                                        <p>
                                            단순히 MVP 칭호만 보는 것이 아니라, 내가 이번 레이드에서 어느 정도의 퍼포먼스를 냈는지 수치로 빠르게
                                            확인할 수 있도록 구성했습니다. 특히 관문별 입력값을 따로 넣을 수 있어서, 특정 관문에서 유독 강했는지
                                            혹은 전체적으로 고르게 기여했는지도 함께 판단할 수 있습니다.
                                        </p>

                                        <div className="w-full h-px bg-white/5 my-3" />

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <strong className="text-gray-300 font-medium block mb-1">
                                                    8인 레이드 (딜러 6명 기준)
                                                </strong>
                                                • 1인분 평균: <strong className="text-white">약 16.6%</strong>
                                                <br />
                                                • <span className="text-[#7C88FF]">강직한 투사:</span> 15% 이상
                                                <br />
                                                • <span className="text-[#FF8585]">잔혹한 혈투사:</span> 20% 이상
                                            </div>
                                            <div>
                                                <strong className="text-gray-300 font-medium block mb-1">
                                                    4인 레이드 (딜러 3명 기준)
                                                </strong>
                                                • 1인분 평균: <strong className="text-white">약 33.3%</strong>
                                                <br />
                                                • <span className="text-[#7C88FF]">강직한 투사:</span> 30% 이상
                                                <br />
                                                • <span className="text-[#FF8585]">잔혹한 혈투사:</span> 40% 이상
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                <section className="rounded-none sm:rounded-xl bg-[#16181D] border-y sm:border border-white/5 p-5">
                                    <h4 className="text-sm font-bold text-gray-200 mb-3">계산 원리</h4>
                                    <div className="space-y-3 text-[13px] leading-relaxed text-gray-400 break-keep">
                                        <p>
                                            이 페이지는 단순히 입력한 피해량을 바로 퍼센트로 바꾸는 방식이 아닙니다. 관문별 기준표에 들어 있는
                                            <strong className="text-gray-300"> 강투/잔혈 컷 수치</strong>를 참고해서 레이드별 실질적인 전체 딜량을
                                            추정하고, 그 안에서 내가 차지하는 비율을 보여주는 방식입니다.
                                        </p>
                                        <p>
                                            그래서 같은 500억을 넣더라도 8인 레이드인지 4인 레이드인지, 어떤 막과 어떤 난이도인지에 따라 의미가
                                            달라질 수 있습니다. 이 점 때문에 단순 피해량보다 <strong className="text-gray-300">지분율</strong>로
                                            보는 것이 훨씬 해석하기 편합니다.
                                        </p>
                                        <div className="rounded-lg bg-[#0F1014] border border-white/5 p-4 text-xs text-gray-500">
                                            예시) 2관문 레이드에서 1관문 320억, 2관문 410억을 기록했다면 각 관문 입력칸에 그대로 넣으면 됩니다.
                                            로아체크는 관문별 입력값을 합산해 전체 지분과 각 관문 컷 달성 여부를 함께 보여줍니다.
                                        </div>
                                    </div>
                                </section>

                                <section className="rounded-none sm:rounded-xl bg-[#16181D] border-y sm:border border-white/5 p-5">
                                    <h4 className="text-sm font-bold text-gray-200 mb-3">결과 해석 방법</h4>
                                    <div className="space-y-3 text-[13px] leading-relaxed text-gray-400 break-keep">
                                        <p>
                                            현재 지분이 <span className="text-[#7C88FF] font-semibold">{strongCut}%</span> 이상이면 강투 기준,
                                            <span className="text-[#FF8585] font-semibold"> {bleedCut}%</span> 이상이면 잔혈 기준을 충족하는 것으로
                                            볼 수 있습니다.
                                        </p>
                                        <p>
                                            다만 이 수치는 레이드 인원 수에 따라 해석이 달라집니다. 8인 레이드는 평균 1인분 기준이 낮고, 4인
                                            레이드는 한 명의 기여 비중이 커지기 때문에 같은 퍼센트라도 체감 의미가 다를 수 있습니다.
                                        </p>
                                        <p>
                                            따라서 한 번의 결과만 보기보다, 비슷한 레이드와 비슷한 파티 구성에서 반복적으로 비교해 보는 것이 더
                                            유용합니다. 특정 관문에서만 지분이 높았는지, 전체적으로 안정적으로 유지됐는지도 같이 보는 편이 좋습니다.
                                        </p>
                                    </div>
                                </section>

                                <section className="rounded-none sm:rounded-xl bg-[#16181D] border-y sm:border border-white/5 p-5">
                                    <h4 className="text-sm font-bold text-gray-200 mb-3">주의사항</h4>
                                    <div className="space-y-3 text-[13px] leading-relaxed text-gray-400 break-keep">
                                        <p>
                                            딜 지분은 실제 퍼포먼스를 정리하는 데 유용한 참고 지표이지만, 모든 요소를 완전히 반영하는 절대값은
                                            아닙니다.
                                        </p>
                                        <ul className="space-y-2 text-[13px] text-gray-400 leading-relaxed">
                                            <li>• 시너지 조합, 서포터 숙련도, 기믹 수행 비중은 숫자만으로 완전히 드러나지 않을 수 있습니다.</li>
                                            <li>• 무력, 카운터, 패턴 처리처럼 공략 기여도는 지분 수치와 별개로 중요할 수 있습니다.</li>
                                            <li>• 관문 구조나 파티 딜 편차가 큰 레이드는 단순 평균보다 관문별 수치를 함께 보는 것이 좋습니다.</li>
                                            <li>• 따라서 이 계산 결과는 실전 기록을 정리하고 비교하는 참고 자료로 활용하는 것이 가장 적절합니다.</li>
                                        </ul>
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