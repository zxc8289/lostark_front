"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Check } from "lucide-react";

type RaidCategory = "카제로스" | "그림자";
type DiffKey = "노말" | "하드" | "나메";

type GateRow = {
    gate: number;
    hp: number;
    range: [number, number];
};

const DIFF = {
    나메: {
        badge: "bg-[#6D28D9]/10 text-[#D6BCFA] border border-none",
        check: "bg-[#6D28D9] text-white border-[#6D28D9] shadow-[0_0_12px_rgba(109,40,217,0.55)]",
        hover: "hover:bg-[#6D28D9] hover:text-white",
    },
    하드: {
        badge: "bg-[#FF5252]/10 text-[#FF5252] border border-none",
        check: "bg-[#ff5a5a] text-white",
        hover: "hover:bg-[#FF5252] hover:text-white",
    },
    노말: {
        badge: "bg-[#5B69FF]/10 text-[#5B69FF] border border-none",
        check: "bg-[#5B69FF] text-white",
        hover: "hover:bg-[#5B69FF] hover:text-white",
    },
} as const;

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
            하드: [{ gate: 1, hp: 9500, range: [1425, 1900] }, { gate: 2, hp: 10500, range: [1575, 2100] }],
            나메: [],
        },
        "종막": {
            노말: [{ gate: 1, hp: 8041, range: [1190, 1590] }, { gate: 2, hp: 7629, range: [1050, 1400] }],
            하드: [{ gate: 1, hp: 16222, range: [2400, 3200] }, { gate: 2, hp: 24431, range: [4275, 5700] }],
            나메: [],
        },
    },
    "그림자": {
        "세르카": {
            노말: [{ gate: 1, hp: 3699, range: [1100, 1480] }, { gate: 2, hp: 4768, range: [1430, 1900] }],
            하드: [{ gate: 1, hp: 7695, range: [2300, 3070] }, { gate: 2, hp: 9919, range: [2980, 3970] }],
            나메: [{ gate: 1, hp: 11941, range: [3580, 4770] }, { gate: 2, hp: 15392, range: [4620, 6160] }],
        }
    }
};

export default function DpsSharePage() {
    const [category, setCategory] = useState<RaidCategory>("카제로스");
    const [act, setAct] = useState<string>("1막");
    const [diff, setDiff] = useState<DiffKey>("노말");
    const [dmgInput, setDmgInput] = useState<Record<string, string>>({});
    const [isCatOpen, setIsCatOpen] = useState(false);

    const handleCategoryChange = (cat: RaidCategory) => {
        setCategory(cat);
        const firstAct = Object.keys(RAID_DATA[cat])[0];
        setAct(firstAct);

        // 카제로스로 변경 시, 현재 난이도가 '나메'라면 강제로 '노말'로 변경
        if (cat === "카제로스" && diff === "나메") {
            setDiff("노말");
        }

        setIsCatOpen(false);
    };

    const { totalHp, totalShare } = useMemo(() => {
        const rows = RAID_DATA[category][act][diff] || [];
        let hpSum = 0;
        let dmgSum = 0;

        for (const row of rows) {
            const key = `${category}-${act}-${diff}-${row.gate}`;
            const dmg = Number(dmgInput[key] ?? "0") || 0;
            hpSum += row.hp;
            dmgSum += dmg;
        }

        const share = hpSum > 0 ? (dmgSum / hpSum) * 100 : 0;
        return { totalHp: hpSum, totalShare: share };
    }, [category, act, diff, dmgInput]);

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
                <div className="mx-auto max-w-7xl space-y-4 sm:px-0 px-4">
                    <div className="relative pb-7">
                        <div className="relative flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                            <div className="space-y-2">
                                <div className="inline-flex items-center gap-2 text-xs font-medium text-[#5B69FF]">
                                    <svg
                                        className="h-4 w-4"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        strokeWidth={2.5}
                                    >
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

                    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 items-start">
                        {/* [좌측] 설정 패널 */}
                        <div className="space-y-4">
                            <section className="rounded-xl bg-[#16181D] border border-white/5 shadow-xl overflow-hidden">
                                <button
                                    onClick={() => setIsCatOpen(!isCatOpen)}
                                    className={`w-full flex items-center justify-between px-4 py-3.5 hover:bg-white/5 transition-colors ${isCatOpen ? 'bg-white/5' : ''}`}
                                >
                                    <div className="flex flex-col items-start">
                                        <span className="text-[10px] text-gray-400 font-medium">레이드 카테고리</span>
                                        <span className="text-sm font-bold text-white">{category} 레이드</span>
                                    </div>
                                    <div className="text-gray-400">
                                        {isCatOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                                    </div>
                                </button>

                                {isCatOpen && (
                                    <div className="px-3 pb-3 pt-2 bg-[#16181D] animate-in slide-in-from-top-2 duration-200">
                                        <div className="flex flex-col gap-1">
                                            {(["카제로스", "그림자"] as RaidCategory[]).map((cat) => (
                                                <button
                                                    key={cat}
                                                    onClick={() => handleCategoryChange(cat)}
                                                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 transition-all ${category === cat ? "bg-[#5B69FF]/10 text-white" : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                                                        }`}
                                                >
                                                    <div className={`flex items-center justify-center w-4 h-4 ${category === cat ? 'text-[#5B69FF]' : 'text-transparent'}`}>
                                                        <Check className="h-4 w-4" strokeWidth={3} />
                                                    </div>
                                                    <span className="text-sm font-medium">{cat} 레이드</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </section>

                            <div className="rounded-xl bg-[#16181D] border border-white/5 overflow-hidden shadow-xl">
                                <div className="px-5 py-4 border-b border-white/5">
                                    <h3 className="font-semibold text-white flex items-center gap-2">
                                        <span className="w-1 h-4 bg-indigo-500 rounded-full" />
                                        레이드 설정
                                    </h3>
                                </div>

                                <div className="p-5 space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">난이도</label>
                                        <div className={`grid ${category === "카제로스" ? "grid-cols-2" : "grid-cols-3"} gap-2 p-1 bg-[#121318] rounded-lg`}>
                                            {(["노말", "하드", "나메"] as DiffKey[])
                                                .filter(d => category !== "카제로스" || d !== "나메") // 카제로스면 나메 필터링
                                                .map((d) => (
                                                    <button
                                                        key={d}
                                                        onClick={() => setDiff(d)}
                                                        className={`py-2 rounded-md text-sm font-bold transition-all duration-200 ${diff === d ? DIFF[d].check : `bg-[#1B222D] text-gray-400 ${DIFF[d].hover}`
                                                            }`}
                                                    >
                                                        {d}
                                                    </button>
                                                ))}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">레이드 선택</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {Object.keys(RAID_DATA[category]).map((a) => (
                                                <button
                                                    key={a}
                                                    onClick={() => setAct(a)}
                                                    className={`py-2 px-3 text-sm font-medium rounded-lg border transition-all duration-200 ${act === a
                                                        ? "bg-white/10 border-white/20 text-white shadow-[0_0_10px_rgba(255,255,255,0.05)]"
                                                        : "bg-transparent border-transparent text-gray-500 hover:bg-white/5 hover:text-gray-300"
                                                        }`}
                                                >
                                                    {a}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* [우측] 결과 영역 */}
                        <div className="space-y-5">
                            <div className="bg-[#16181D] rounded-xl border border-white/5 p-5 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className={`px-3 py-2 rounded-lg flex items-center justify-center text-sm font-bold ${DIFF[diff].badge}`}>
                                        {diff}
                                    </div>
                                    <div>
                                        <div className="text-sm text-gray-400">{act} 종합 분석</div>
                                        <div className="text-white font-bold text-lg">
                                            {totalShare.toFixed(1)}%{" "}
                                            <span className="text-xs text-gray-500 font-normal ml-1">평균 지분</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6 text-right ml-auto sm:ml-0 self-end sm:self-auto">
                                    <div>
                                        <div className="text-xs text-gray-500">보스 총 체력</div>
                                        <div className="text-gray-200 font-mono font-medium">
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
                                        const sharePercent = row.hp > 0 ? ((Number(input) / row.hp) * 100).toFixed(1) : "0.0";

                                        return (
                                            <div key={key} className="relative group flex flex-col gap-4 rounded-xl border border-white/5 bg-[#16181D] p-5 shadow-md transition-all hover:border-white/10 hover:shadow-xl">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-semibold text-gray-200">{row.gate} 관문</span>
                                                    <span className="text-xs font-mono text-gray-500">체력: {row.hp.toLocaleString()}억</span>
                                                </div>

                                                <div className="relative mt-2">
                                                    <label className="absolute -top-2 left-2 bg-[#16181D] px-1 text-[10px] text-indigo-400 font-medium z-10">나의 피해량</label>
                                                    <div className="flex items-center rounded-lg bg-[#0F1014] border border-white/10 focus-within:border-indigo-500/50 transition-all">
                                                        <input
                                                            type="number"
                                                            placeholder="0"
                                                            value={input}
                                                            onChange={(e) => setDmgInput(prev => ({ ...prev, [key]: e.target.value }))}
                                                            className="w-full bg-transparent px-4 py-3 text-white outline-none font-mono text-xl font-medium"
                                                        />
                                                        <span className="pr-4 text-sm text-gray-600 font-bold">억</span>
                                                    </div>
                                                </div>

                                                <div className="mt-auto space-y-4">
                                                    <div className="flex items-end justify-between border-b border-white/5 pb-3">
                                                        <span className="text-[11px] text-gray-500 font-medium">현재 딜 지분</span>
                                                        <span className={`text-2xl font-bold font-mono ${Number(sharePercent) >= 20 ? "text-amber-400" : "text-white"}`}>
                                                            {sharePercent}%
                                                        </span>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="flex flex-col items-center justify-center rounded-lg bg-[#5B69FF]/5 border border-[#5B69FF]/10 py-2.5">
                                                            <span className="text-[14px] text-[#7C88FF] font-bold mb-0.5">강투</span>
                                                            <span className="text-lg font-medium text-gray-300">{strong.toLocaleString()}억</span>
                                                        </div>
                                                        <div className="flex flex-col items-center justify-center rounded-lg bg-[#FF5252]/5 border border-[#FF5252]/10 py-2.5">
                                                            <span className="text-[14px] text-[#FF8585] font-bold mb-0.5">잔혈</span>
                                                            <span className="text-lg font-medium text-gray-300">{bleed.toLocaleString()}억</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="py-20 text-center text-gray-500 bg-[#16181D] rounded-xl border border-dashed border-white/10">
                                    해당 난이도의 데이터가 없습니다.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}