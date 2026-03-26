"use client";

import React, { useMemo, useState, useEffect } from "react";
import { Info, PackageOpen, Check, ArrowRight, TrendingUp, TrendingDown } from "lucide-react";
import { DifficultyKey, raidInformation, RaidKind } from "@/server/data/raids";


const DIFF_STYLE: Record<string, { badge: string; check: string; hover: string }> = {
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
    싱글: {
        badge: "bg-[#F1F5F9]/10 text-[#F1F5F9] border-transparent",
        check: "bg-[#F1F5F9] text-[#111217] font-bold border-[#F1F5F9]",
        hover: "hover:bg-[#F1F5F9] hover:text-[#111217]",
    },
};
const CATEGORIES = Array.from(new Set(Object.values(raidInformation).map(r => r.kind)));

export default function MoreRewardCalculatorPage() {
    // [상태] 레이드 선택 필터
    const [category, setCategory] = useState<RaidKind>("카제로스");
    const [raid, setRaid] = useState<string>("1막-에기르");
    const [diff, setDiff] = useState<DifficultyKey>("노말");

    // [상태] 시세 입력 (글로벌)
    const [leapPrice, setLeapPrice] = useState<string>("40");
    const [destPrice, setDestPrice] = useState<string>("60");
    const [guardPrice, setGuardPrice] = useState<string>("10");

    // [상태] 관문별 재료 획득량 입력 (키: 레이드명-난이도-관문번호)
    const [matInputs, setMatInputs] = useState<Record<string, { leap: string, dest: string, guard: string }>>({});

    // 카테고리에 속한 레이드 목록 추출
    const availableRaids = useMemo(() => {
        return Object.keys(raidInformation).filter(k => raidInformation[k].kind === category);
    }, [category]);

    // 선택된 레이드의 선택 가능한 난이도 목록 추출
    const availableDiffs = useMemo(() => {
        const info = raidInformation[raid];
        return info ? (Object.keys(info.difficulty) as DifficultyKey[]) : [];
    }, [raid]);

    // 카테고리 변경 시 첫 번째 레이드로 자동 변경
    const handleCategoryChange = (cat: RaidKind) => {
        setCategory(cat);
        const firstRaid = Object.keys(raidInformation).find(k => raidInformation[k].kind === cat);
        if (firstRaid) handleRaidChange(firstRaid);
    };

    // 레이드 변경 시 가능한 첫 번째 난이도로 자동 변경
    const handleRaidChange = (r: string) => {
        setRaid(r);
        const diffs = Object.keys(raidInformation[r].difficulty) as DifficultyKey[];
        if (!diffs.includes(diff) && diffs.length > 0) {
            setDiff(diffs[0]);
        }
    };

    // 현재 선택된 관문 데이터 가져오기
    const gates = useMemo(() => {
        return raidInformation[raid]?.difficulty[diff]?.gates || [];
    }, [raid, diff]);

    // 숫자 변환 헬퍼
    const toNum = (v: string) => Number(v?.replace(/[^\d]/g, "")) || 0;
    const fmt = (v: number) => Math.floor(v).toLocaleString();

    // 입력 핸들러 (시세)
    const handlePriceChange = (setter: React.Dispatch<React.SetStateAction<string>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
        setter(e.target.value.replace(/[^\d]/g, ""));
    };

    // 입력 핸들러 (관문별 재료)
    const handleMatChange = (gateKey: string, field: "leap" | "dest" | "guard", value: string) => {
        setMatInputs(prev => ({
            ...prev,
            [gateKey]: {
                ...(prev[gateKey] || { leap: "", dest: "", guard: "" }),
                [field]: value.replace(/[^\d]/g, "")
            }
        }));
    };

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
                <div className="mx-auto max-w-[1400px] space-y-4 px-4 sm:px-0">

                    {/* 상단 헤더 */}
                    <div className="relative pb-7">
                        <div className="space-y-2">
                            <div className="inline-flex items-center gap-2 text-xs font-medium text-[#5B69FF]">
                                <PackageOpen className="h-4 w-4" strokeWidth={2.5} />
                                <span>보상 분석 도구</span>
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">더보기 효율 계산기</h1>
                            <p className="text-sm text-gray-400 max-w-lg leading-relaxed">
                                레이드 클리어 후 더보기를 누르는 것이 이득인지, 현재 거래소 시세를 바탕으로 분석합니다.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 sm:gap-6 items-start">

                        {/* [좌측] 레이드 설정 필터 */}
                        <div className="space-y-4">
                            <section className="rounded-none sm:rounded-xl bg-[#16181D] border-y sm:border border-white/5 overflow-hidden shadow-sm">
                                <div className="px-5 py-4 border-b border-white/5">
                                    <h3 className="font-semibold text-white flex items-center gap-2">
                                        <span className="w-1 h-4 bg-indigo-500 rounded-full" />
                                        레이드 설정
                                    </h3>
                                </div>

                                <div className="p-5 space-y-6">
                                    {/* 카테고리 */}
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">카테고리</label>
                                        <div className="flex flex-col border border-white/5 rounded-lg overflow-hidden">
                                            {CATEGORIES.map((cat) => (
                                                <button
                                                    key={cat}
                                                    onClick={() => handleCategoryChange(cat)}
                                                    className={`flex w-full items-center gap-3 px-4 py-3 transition-colors border-b border-white/5 last:border-b-0 ${category === cat ? "bg-[#5B69FF]/15 text-white" : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
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

                                    {/* 난이도 */}
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">난이도</label>
                                        <div className={`grid ${availableDiffs.length > 2 ? 'grid-cols-3' : 'grid-cols-2'} gap-2 p-1 bg-[#121318] rounded-lg border border-white/5`}>
                                            {availableDiffs.map((d) => (
                                                <button
                                                    key={d}
                                                    onClick={() => setDiff(d)}
                                                    className={`py-2 rounded-md text-sm font-bold transition-all border ${diff === d ? DIFF_STYLE[d]?.check : `bg-[#1B222D] text-gray-400 border-transparent ${DIFF_STYLE[d]?.hover}`
                                                        }`}
                                                >
                                                    {d}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* 레이드 선택 */}
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">레이드 선택</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {availableRaids.map((a) => (
                                                <button
                                                    key={a}
                                                    onClick={() => handleRaidChange(a)}
                                                    className={`relative flex items-center justify-center py-2 px-3 text-sm font-bold rounded-lg border transition-all ${raid === a ? "bg-[#5B69FF]/15 border-[#5B69FF]/30 text-white" : "bg-transparent border-white/5 text-gray-500 hover:bg-white/5 hover:text-gray-300"
                                                        }`}
                                                >
                                                    <span className="truncate">{a}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>

                        {/* [우측] 시세 및 관문 결과 영역 */}
                        <div className="space-y-5">

                            {/* 거래소 시세 글로벌 입력 */}
                            <div className="bg-[#16181D] rounded-none sm:rounded-xl border-y sm:border border-white/5 p-5 shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="font-semibold text-gray-200">현재 거래소 시세 입력</span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="relative mt-2">
                                        <label className="absolute -top-2.5 left-2 bg-[#16181D] px-1 text-[11px] text-gray-400 font-bold z-10">돌파석 (1개당)</label>
                                        <div className="flex items-center rounded-lg bg-[#0F1014] border border-white/10 focus-within:border-indigo-500/50 transition-all px-3 py-2.5">
                                            <input type="text" inputMode="numeric" value={leapPrice} onChange={handlePriceChange(setLeapPrice)} className="w-full bg-transparent text-white outline-none font-mono text-lg font-bold" />
                                            <span className="text-xs text-gray-500 font-bold shrink-0">G</span>
                                        </div>
                                    </div>
                                    <div className="relative mt-2">
                                        <label className="absolute -top-2.5 left-2 bg-[#16181D] px-1 text-[11px] text-gray-400 font-bold z-10">파괴석류 (10개당)</label>
                                        <div className="flex items-center rounded-lg bg-[#0F1014] border border-white/10 focus-within:border-indigo-500/50 transition-all px-3 py-2.5">
                                            <input type="text" inputMode="numeric" value={destPrice} onChange={handlePriceChange(setDestPrice)} className="w-full bg-transparent text-white outline-none font-mono text-lg font-bold" />
                                            <span className="text-xs text-gray-500 font-bold shrink-0">G</span>
                                        </div>
                                    </div>
                                    <div className="relative mt-2">
                                        <label className="absolute -top-2.5 left-2 bg-[#16181D] px-1 text-[11px] text-gray-400 font-bold z-10">수호석류 (10개당)</label>
                                        <div className="flex items-center rounded-lg bg-[#0F1014] border border-white/10 focus-within:border-indigo-500/50 transition-all px-3 py-2.5">
                                            <input type="text" inputMode="numeric" value={guardPrice} onChange={handlePriceChange(setGuardPrice)} className="w-full bg-transparent text-white outline-none font-mono text-lg font-bold" />
                                            <span className="text-xs text-gray-500 font-bold shrink-0">G</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 관문별 결과 카드 리스트 */}
                            {gates.length > 0 ? (
                                <div className="grid gap-4 sm:grid-cols-1 xl:grid-cols-2">
                                    {gates.map((g) => {
                                        const gateKey = `${raid}-${diff}-${g.index}`;
                                        const mats = matInputs[gateKey] || { leap: "", dest: "", guard: "" };

                                        // 수익 계산
                                        const leapVal = toNum(mats.leap) * toNum(leapPrice);
                                        const destVal = (toNum(mats.dest) / 10) * toNum(destPrice);
                                        const guardVal = (toNum(mats.guard) / 10) * toNum(guardPrice);

                                        const totalValue = leapVal + destVal + guardVal;
                                        const netProfit = totalValue - g.bonusCost;
                                        const isProfitable = netProfit >= 0;

                                        return (
                                            <div key={gateKey} className={`relative flex flex-col gap-4 rounded-none sm:rounded-xl border-y sm:border p-5 shadow-sm transition-all ${isProfitable ? 'bg-[#16181D] border-white/5 hover:border-indigo-500/30' : 'bg-[#16181D] border-white/5 hover:border-red-500/30'
                                                }`}>
                                                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`px-2 py-1 rounded-md text-[11px] font-bold ${DIFF_STYLE[diff]?.badge}`}>
                                                            {diff}
                                                        </div>
                                                        <span className="font-semibold text-gray-200">{g.name}</span>
                                                    </div>
                                                    <div className="text-sm font-bold text-gray-400">
                                                        더보기 비용: <span className="text-white font-mono">{fmt(g.bonusCost)} G</span>
                                                    </div>
                                                </div>

                                                <div className="space-y-3">
                                                    <label className="text-[11px] font-bold text-gray-500">예상 획득량 입력</label>
                                                    <div className="grid grid-cols-3 gap-2">
                                                        <div className="flex items-center rounded bg-[#0F1014] border border-white/5 px-2 py-1.5 focus-within:border-white/20">
                                                            <span className="text-[10px] text-gray-500 w-8 shrink-0">돌파석</span>
                                                            <input type="text" inputMode="numeric" placeholder="0" value={mats.leap} onChange={(e) => handleMatChange(gateKey, "leap", e.target.value)} className="w-full bg-transparent text-white outline-none text-right font-mono text-sm" />
                                                        </div>
                                                        <div className="flex items-center rounded bg-[#0F1014] border border-white/5 px-2 py-1.5 focus-within:border-white/20">
                                                            <span className="text-[10px] text-gray-500 w-8 shrink-0">파괴석</span>
                                                            <input type="text" inputMode="numeric" placeholder="0" value={mats.dest} onChange={(e) => handleMatChange(gateKey, "dest", e.target.value)} className="w-full bg-transparent text-white outline-none text-right font-mono text-sm" />
                                                        </div>
                                                        <div className="flex items-center rounded bg-[#0F1014] border border-white/5 px-2 py-1.5 focus-within:border-white/20">
                                                            <span className="text-[10px] text-gray-500 w-8 shrink-0">수호석</span>
                                                            <input type="text" inputMode="numeric" placeholder="0" value={mats.guard} onChange={(e) => handleMatChange(gateKey, "guard", e.target.value)} className="w-full bg-transparent text-white outline-none text-right font-mono text-sm" />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className={`mt-auto pt-3 border-t flex items-center justify-between ${isProfitable ? 'border-indigo-500/20' : 'border-red-500/20'}`}>
                                                    <div className="flex flex-col">
                                                        <span className="text-[11px] text-gray-400 font-medium">재료 가치: {fmt(totalValue)} G</span>
                                                        <span className={`text-sm font-bold flex items-center gap-1 ${isProfitable ? 'text-indigo-400' : 'text-red-400'}`}>
                                                            {isProfitable ? '누르는 게 이득' : '안 누르는 게 이득'}
                                                            {isProfitable ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                                        </span>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-[10px] text-gray-500">순수익</span>
                                                        <div className={`text-xl font-black font-mono ${isProfitable ? 'text-white' : 'text-red-400'}`}>
                                                            {isProfitable ? '+' : ''}{fmt(netProfit)} G
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="py-20 text-center text-gray-500 bg-[#16181D] rounded-none sm:rounded-xl border-y sm:border border-dashed border-white/10">
                                    해당 레이드의 관문 정보가 없습니다.
                                </div>
                            )}

                            {/* 도움말 가이드 */}
                            <section className="rounded-none sm:rounded-xl bg-gradient-to-b from-[#16181D] to-[#121318] border-y sm:border border-white/5 p-5 mt-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <Info className="w-4 h-4 text-indigo-400" />
                                    <h4 className="text-sm font-bold text-gray-200">더보기 효율 계산 안내</h4>
                                </div>
                                <div className="space-y-2 text-[13px] leading-relaxed text-gray-400 break-keep">
                                    <p>• 관문별로 획득하는 돌파석/파괴석/수호석의 개수를 입력하면, 실시간으로 시세와 비교하여 순수익을 계산합니다.</p>
                                    <p>• 귀속 재료(명예의 파편, 실링, 엘릭서 등)의 가치는 제외된 <strong className="text-white">순수 거래소 골드 환산 가치</strong>입니다.</p>
                                    <p>• 캐릭터 스펙업이 목적이거나 독성/파편 등이 급하게 필요하다면, 골드 상으로 손해구간이더라도 더보기를 누르는 것이 유리할 수 있습니다.</p>
                                </div>
                            </section>

                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}