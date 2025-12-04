"use client";

import { useMemo, useState } from "react";

type DiffKey = "노말" | "하드";
type ActKey = "1막" | "2막" | "3막" | "4막" | "종막";

type GateRow = {
    gate: number;
    hp: number;
    range: [number, number];
};

const DIFF = {
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

const kaizeros: Record<ActKey, Record<DiffKey, GateRow[]>> = {
    "1막": {
        노말: [
            { gate: 1, hp: 1615, range: [270, 365] },
            { gate: 2, hp: 2132, range: [335, 450] },
        ],
        하드: [
            { gate: 1, hp: 2698, range: [450, 600] },
            { gate: 2, hp: 3985, range: [600, 800] },
        ],
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
    },
    "3막": {
        노말: [
            { gate: 1, hp: 3687, range: [525, 700] },
            { gate: 2, hp: 3346, range: [460, 620] },
            { gate: 3, hp: 7319, range: [1000, 1360] },
        ],
        하드: [
            { gate: 1, hp: 6525, range: [940, 1250] },
            { gate: 2, hp: 6630, range: [970, 1300] },
            { gate: 3, hp: 14737, range: [2150, 2950] },
        ],
    },
    "4막": {
        노말: [
            { gate: 1, hp: 4750, range: [740, 990] },
            { gate: 2, hp: 5250, range: [950, 1270] },
        ],
        하드: [
            { gate: 1, hp: 9500, range: [1425, 1900] },
            { gate: 2, hp: 10500, range: [1575, 2100] },
        ],
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
    },
};

export default function DpsSharePage() {
    const [act, setAct] = useState<ActKey>("1막");
    const [diff, setDiff] = useState<DiffKey>("노말");
    const [dmgInput, setDmgInput] = useState<Record<string, string>>({});

    // 상단 요약 카드용 총합 계산
    const { totalHp, totalMyDmg, totalShare } = useMemo(() => {
        const rows = kaizeros[act][diff];
        let hpSum = 0;
        let dmgSum = 0;

        for (const row of rows) {
            const key = `${act}-${diff}-${row.gate}`;
            const dmg = Number(dmgInput[key] ?? "0") || 0;
            hpSum += row.hp;
            dmgSum += dmg;
        }

        const share = hpSum > 0 ? (dmgSum / hpSum) * 100 : 0;

        return {
            totalHp: hpSum,
            totalMyDmg: dmgSum,
            totalShare: share,
        };
    }, [act, diff, dmgInput]);

    const rows = kaizeros[act][diff];

    return (
        <>
            {/* 숫자 인풋 위/아래 화살표 제거 */}
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
                <div className="mx-auto max-w-7xl space-y-4 sm:px-0">
                    {/* 헤더 */}
                    <div className="relative pb-7">
                        <div className="absolute -top-10 -left-10 w-64 h-64 rounded-full pointer-events-none" />
                        <div className="relative flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                            <div className="space-y-2">
                                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                                    딜 지분
                                </h1>
                                <p className="text-sm text-gray-400 max-w-lg">
                                    관문별 내 피해량을 입력하여 실시간 지분율을 확인하세요.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* 메인 레이아웃 */}
                    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 items-start">
                        {/* [좌측] 설정 패널 */}
                        <div className="space-y-4 top-4">
                            <div className="rounded-xl bg-[#1A1C23] border border-white/5 overflow-hidden shadow-xl">
                                <div className="px-5 py-4 border-b border-white/5">
                                    <h3 className="font-semibold text-white flex items-center gap-2">
                                        <span className="w-1 h-4 bg-indigo-500 rounded-full" />
                                        레이드 설정
                                    </h3>
                                </div>

                                <div className="p-5 space-y-6">
                                    {/* 난이도 선택 */}
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                            난이도
                                        </label>
                                        <div className="grid grid-cols-2 gap-2 p-1 bg-[#121318] rounded-lg">
                                            {(["노말", "하드"] as DiffKey[]).map((d) => (
                                                <button
                                                    key={d}
                                                    onClick={() => setDiff(d)}
                                                    className={`
                                                        py-2 rounded-md text-sm font-bold transition-all duration-200
                                                        ${diff === d
                                                            ? DIFF[d].check
                                                            : `bg-[#1B222D] text-gray-400 ${DIFF[d].hover}`
                                                        }
                                                    `}
                                                >
                                                    {d}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* 막 선택 */}
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                            레이드 선택
                                        </label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {(["1막", "2막", "3막", "4막", "종막"] as ActKey[]).map(
                                                (a) => (
                                                    <button
                                                        key={a}
                                                        onClick={() => setAct(a)}
                                                        className={`
                                                            py-2 px-3 text-sm font-medium rounded-lg border transition-all duration-200
                                                            ${act === a
                                                                ? "bg-white/10 border-white/20 text-white shadow-[0_0_10px_rgba(255,255,255,0.05)]"
                                                                : "bg-transparent border-transparent text-gray-500 hover:bg-white/5 hover:text-gray-300"
                                                            }
                                                        `}
                                                    >
                                                        {a}
                                                    </button>
                                                )
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 팁 박스 */}
                            <div className="rounded-xl bg-[#1A1C23]/50 border border-white/5 p-4 text-xs text-gray-500 leading-relaxed">
                                선택한 막의 관문별 보스 체력을 기준으로 지분이 계산됩니다.
                            </div>
                        </div>

                        {/* [우측] 결과 영역 */}
                        <div className="space-y-5">
                            {/* 종합 요약 바 */}
                            <div className="bg-[#1A1C23] rounded-xl border border-white/5 p-5 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div
                                        className={`px-3 py-2 rounded-lg flex items-center justify-center text-sm font-bold ${DIFF[diff].badge}`}
                                    >
                                        {diff}
                                    </div>
                                    <div>
                                        <div className="text-sm text-gray-400">{act} 종합 분석</div>
                                        <div className="text-white font-bold text-lg">
                                            {totalShare.toFixed(1)}%{" "}
                                            <span className="text-xs text-gray-500 font-normal ml-1">
                                                평균 지분
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6 text-right ml-auto sm:ml-0 self-end sm:self-auto">
                                    <div>
                                        <div className="text-xs text-gray-500">보스 총 체력</div>
                                        <div className="text-gray-200 font-mono font-medium">
                                            {totalHp.toLocaleString()}{" "}
                                            <span className="text-xs">억</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 관문별 카드 리스트 */}
                            <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-2">
                                {rows.map((row) => {
                                    const [strong, bleed] = row.range;
                                    const key = `${act}-${diff}-${row.gate}`;
                                    const input = dmgInput[key] ?? "";
                                    const sharePercent =
                                        row.hp > 0
                                            ? ((Number(input) / row.hp) * 100).toFixed(1)
                                            : "0.0";

                                    return (
                                        <div
                                            key={key}
                                            className="relative group flex flex-col gap-4 rounded-xl border border-white/5 bg-[#1A1C23] p-5 shadow-md transition-all hover:border-white/10 hover:shadow-xl"
                                        >
                                            {/* 관문 헤더 */}
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-gray-200">
                                                        {row.gate} 관문
                                                    </span>
                                                </div>
                                                <span className="text-xs font-mono text-gray-500">
                                                    체력: {row.hp.toLocaleString()}억
                                                </span>
                                            </div>

                                            {/* 입력부 */}
                                            <div className="relative mt-2">
                                                <label className="absolute -top-2 left-2 bg-[#1A1C23] px-1 text-[10px] text-indigo-400 font-medium z-10">
                                                    나의 피해량
                                                </label>
                                                <div className="flex items-center rounded-lg bg-[#0F1014] border border-white/10 focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/50 transition-all">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        placeholder="0"
                                                        value={input}
                                                        onChange={(e) =>
                                                            setDmgInput((prev) => ({
                                                                ...prev,
                                                                [key]: e.target.value,
                                                            }))
                                                        }
                                                        className="w-full bg-transparent px-4 py-3 text-white placeholder-gray-700 outline-none font-mono text-xl font-medium tracking-tight"
                                                    />
                                                    <span className="pr-4 text-sm text-gray-600 font-bold select-none">
                                                        억
                                                    </span>
                                                </div>
                                            </div>

                                            {/* 결과 & 목표 지표 섹션 */}
                                            <div className="mt-auto space-y-4">
                                                {/* 현재 나의 지분 */}
                                                <div className="flex items-end justify-between border-b border-white/5 pb-3">
                                                    <span className="text-[11px] text-gray-500 font-medium">
                                                        현재 딜 지분
                                                    </span>
                                                    <span
                                                        className={`text-2xl font-bold font-mono tracking-tight leading-none ${Number(sharePercent) >= 20
                                                            ? "text-amber-400"
                                                            : "text-white"
                                                            }`}
                                                    >
                                                        {sharePercent}%
                                                    </span>
                                                </div>

                                                {/* 목표 컷 (강투/잔혈) */}
                                                <div className="grid grid-cols-2 gap-3">
                                                    {/* 강투 컷 */}
                                                    <div className="flex flex-col items-center justify-center rounded-lg bg-[#5B69FF]/5 border border-[#5B69FF]/10 py-2.5">
                                                        <span className="text-[14px] text-[#7C88FF] font-bold mb-0.5">
                                                            강투
                                                        </span>
                                                        <span className="text-lg font-medium text-gray-300">
                                                            {strong.toLocaleString()}억
                                                        </span>
                                                    </div>

                                                    {/* 잔혈 컷 */}
                                                    <div className="flex flex-col items-center justify-center rounded-lg bg-[#FF5252]/5 border border-[#FF5252]/10 py-2.5">
                                                        <span className="text-[14px] text-[#FF8585] font-bold mb-0.5">
                                                            잔혈
                                                        </span>
                                                        <span className="text-lg font-medium text-gray-300">
                                                            {bleed.toLocaleString()}억
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
