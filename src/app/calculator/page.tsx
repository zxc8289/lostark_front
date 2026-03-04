"use client";

import React, { useMemo, useState } from "react";
import { Info, Calculator, Check } from "lucide-react";

export default function AuctionCalculatorPage() {
    const [partySize, setPartySize] = useState<4 | 8 | 16>(8);
    const [marketPriceRaw, setMarketPriceRaw] = useState<string>("");

    const calc = useMemo(() => {
        const fee = 0.95;
        const n = partySize;
        const price = Number(marketPriceRaw || "0") || 0;

        const afterFee = price > 0 ? Math.floor(price * fee) : 0;

        // ✅ N빵 입찰가 (공평 분배)
        const nbbBid = price > 0 ? Math.floor(afterFee * ((n - 1) / n)) : 0;

        // ✅ 선점 입찰가 (타 사이트 범용 공식 적용)
        const nbbSnipeBid = price > 0 ? Math.floor(nbbBid / 1.1) : 0;

        return {
            price,
            afterFee,

            // N빵 입찰 결과
            nbbBid,
            nbbDividend: price > 0 ? Math.floor(nbbBid / (n - 1)) : 0,
            nbbMyNet: price > 0 ? afterFee - nbbBid : 0,

            // 선점 입찰 결과
            nbbSnipeBid,
            nbbSnipeDividend: price > 0 ? Math.floor(nbbSnipeBid / (n - 1)) : 0,
            nbbSnipeMyNet: price > 0 ? afterFee - nbbSnipeBid : 0,
        };
    }, [marketPriceRaw, partySize]);

    const onChangePrice = (v: string) => {
        const digits = v.replace(/[^\d]/g, "");
        setMarketPriceRaw(digits);
    };

    const fmt = (v: number) => (v || 0).toLocaleString();

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
                    {/* 상단 헤더 */}
                    <div className="relative pb-7 px-4 sm:px-0">
                        <div className="relative flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                            <div className="space-y-2">
                                <div className="inline-flex items-center gap-2 text-xs font-medium text-[#5B69FF]">
                                    <Calculator className="h-4 w-4" strokeWidth={2.5} />
                                    <span>경매 분석 도구</span>
                                </div>
                                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">경매 분배 계산기</h1>
                                <p className="text-sm text-gray-400 max-w-lg leading-relaxed">
                                    거래소 시세를 바탕으로 파티 인원에 맞는 입찰 적정가를 계산하고 내 순수익을 분석합니다.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* 2단 레이아웃 Grid 적용 */}
                    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 sm:gap-6 items-start">

                        {/* [좌측] 설정 영역 */}
                        <div className="space-y-4">
                            <section className="rounded-none sm:rounded-xl bg-[#16181D] border-y sm:border border-white/5 overflow-hidden">
                                <div className="px-5 py-4 border-b border-white/5">
                                    <h3 className="font-semibold text-white flex items-center gap-2">
                                        <span className="w-1 h-4 bg-indigo-500 rounded-full" />
                                        경매 설정
                                    </h3>
                                </div>

                                <div className="p-5 space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">파티 인원</label>
                                        <div className="flex flex-col border border-white/5 rounded-lg overflow-hidden">
                                            {[4, 8, 16].map((n) => (
                                                <button
                                                    key={n}
                                                    onClick={() => setPartySize(n as 4 | 8 | 16)}
                                                    className={`flex w-full items-center gap-3 px-4 py-3 transition-colors border-b border-white/5 last:border-b-0 ${partySize === n
                                                        ? "bg-[#5B69FF]/15 text-white"
                                                        : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                                                        }`}
                                                >
                                                    <div className={`flex items-center justify-center w-4 h-4 ${partySize === n ? 'text-[#5B69FF]' : 'text-transparent'}`}>
                                                        <Check className="h-4 w-4" strokeWidth={3} />
                                                    </div>
                                                    <span className="text-sm font-bold">{n}인 레이드</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>

                        {/* [우측] 결과 영역 */}
                        <div className="space-y-5">
                            {/* 거래소 가격 입력 섹션 */}
                            <div className="bg-[#16181D] rounded-none sm:rounded-xl border-y sm:border border-white/5 p-5 shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="font-semibold text-gray-200">거래소 시세 입력</span>
                                </div>

                                <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6">
                                    <div className="w-full sm:max-w-[1000px] relative mt-1">
                                        <label className="absolute -top-2.5 left-2 bg-[#16181D] px-1 text-[11px] text-indigo-400 font-bold z-10">
                                            실시간 최저가
                                        </label>
                                        <div className="flex items-center rounded-lg bg-[#0F1014] border border-white/10 focus-within:border-indigo-500/50 transition-all">
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                placeholder="0"
                                                value={marketPriceRaw}
                                                onChange={(e) => onChangePrice(e.target.value)}
                                                className="w-full bg-transparent px-4 py-3 text-white outline-none font-mono text-2xl font-bold placeholder:text-gray-700"
                                            />
                                            <span className="pr-4 text-sm text-gray-600 font-bold">G</span>
                                        </div>
                                    </div>


                                </div>
                            </div>

                            {/* 입찰가 결과 그리드 */}
                            <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
                                {/* 선점 입찰가 (Indigo 테마로 통일) */}
                                <div className="relative group flex flex-col gap-4 rounded-none sm:rounded-xl border-y sm:border border-white/5 bg-[#16181D] p-5 transition-all hover:border-white/10 shadow-sm">
                                    <div className="flex items-center justify-between">
                                        <span className="font-semibold text-gray-200">선점 입찰가</span>
                                    </div>

                                    <div className="relative mt-2">
                                        <label className="absolute -top-2.5 left-2 bg-[#16181D] px-1 text-[11px] text-indigo-400 font-bold z-10">추천 최적가</label>
                                        <div className="flex items-center rounded-lg bg-[#0F1014] border border-white/10 transition-all px-4 py-3">
                                            <span className="w-full bg-transparent text-white outline-none font-mono text-2xl font-bold">{fmt(calc.nbbSnipeBid)}</span>
                                            <span className="text-sm text-gray-600 font-bold">G</span>
                                        </div>
                                    </div>

                                    <div className="mt-auto space-y-4">
                                        <div className="flex items-end justify-between border-b border-white/5 pb-3">
                                            <span className="text-[11px] text-gray-500 font-medium">분배금 포기 대비 얻는 추가 이익</span>
                                            <span className="text-2xl font-bold font-mono text-indigo-400">
                                                +{fmt(calc.nbbSnipeMyNet - calc.nbbSnipeDividend)} G
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="flex flex-col items-center justify-center rounded-lg bg-white/5 border border-white/5 py-2.5">
                                                <span className="text-[12px] text-gray-400 font-bold mb-0.5">타인 1인 분배금</span>
                                                <span className="text-lg font-medium text-gray-300">{fmt(calc.nbbSnipeDividend)}</span>
                                            </div>
                                            <div className="flex flex-col items-center justify-center rounded-lg bg-indigo-500/10 border border-indigo-500/20 py-2.5">
                                                <span className="text-[12px] text-indigo-400 font-bold mb-0.5">나의 최종 순이익</span>
                                                <span className="text-lg font-bold text-white">{fmt(calc.nbbSnipeMyNet)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* N빵 입찰가 (Indigo 테마로 통일) */}
                                <div className="relative group flex flex-col gap-4 rounded-none sm:rounded-xl border-y sm:border border-white/5 bg-[#16181D] p-5 transition-all hover:border-white/10 shadow-sm">
                                    <div className="flex items-center justify-between">
                                        <span className="font-semibold text-gray-200">N빵 입찰가</span>
                                    </div>

                                    <div className="relative mt-2">
                                        <label className="absolute -top-2.5 left-2 bg-[#16181D] px-1 text-[11px] text-indigo-400 font-bold z-10">최대 허용가</label>
                                        <div className="flex items-center rounded-lg bg-[#0F1014] border border-white/10 transition-all px-4 py-3">
                                            <span className="w-full bg-transparent text-white outline-none font-mono text-2xl font-bold">{fmt(calc.nbbBid)}</span>
                                            <span className="text-sm text-gray-600 font-bold">G</span>
                                        </div>
                                    </div>

                                    <div className="mt-auto space-y-4">
                                        <div className="flex items-end justify-between border-b border-white/5 pb-3">
                                            <span className="text-[11px] text-gray-500 font-medium">분배금 포기 대비 얻는 추가 이익</span>
                                            <span className="text-2xl font-bold font-mono text-white">
                                                {fmt(calc.nbbMyNet - calc.nbbDividend)} G
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="flex flex-col items-center justify-center rounded-lg bg-white/5 border border-white/5 py-2.5">
                                                <span className="text-[12px] text-gray-400 font-bold mb-0.5">타인 1인 분배금</span>
                                                <span className="text-lg font-medium text-gray-300">{fmt(calc.nbbDividend)}</span>
                                            </div>
                                            <div className="flex flex-col items-center justify-center rounded-lg bg-indigo-500/10 border border-indigo-500/20 py-2.5">
                                                <span className="text-[12px] text-indigo-400 font-bold mb-0.5">나의 최종 순이익</span>
                                                <span className="text-lg font-bold text-white">{fmt(calc.nbbMyNet)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>


                            {/* 안내 / 도움말 섹션 */}
                            <section className="rounded-none sm:rounded-xl bg-gradient-to-b from-[#16181D] to-[#121318] border-y sm:border border-white/5 p-5 mt-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <Info className="w-4 h-4 text-indigo-400" />
                                    <h4 className="text-sm font-bold text-gray-200">경매 계산기 활용 가이드</h4>
                                </div>
                                <div className="space-y-3 text-[13px] leading-relaxed text-gray-400 break-keep">
                                    <p>
                                        <strong className="text-gray-300 font-medium">선점 입찰가 (추천):</strong> 경쟁을 줄이면서 남들이 받는 분배금보다 <strong className="text-white">내가 얻는 이득을 더 크게 가져가는</strong> 최적의 입찰가입니다.
                                    </p>
                                    <p>
                                        <strong className="text-gray-300 font-medium">N빵 입찰가 (마지노선):</strong> 입찰한 사람과 입찰을 포기한 사람의 이득이 <strong className="text-white">완벽하게 동일해지는 가격</strong>입니다. 이 금액을 넘겨서 입찰하면 오히려 손해를 보게 됩니다.
                                    </p>
                                    <div className="w-full h-px bg-white/5 my-3" />
                                    <p className="text-indigo-300 font-medium">
                                        💡 입력창에 금액만 넣으면 좌측 결과 카드에서 타인의 분배금과 나의 실제 순수익 차이를 직관적으로 확인할 수 있습니다.
                                    </p>
                                </div>
                            </section>

                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}