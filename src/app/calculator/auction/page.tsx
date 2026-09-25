"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Calculator, Check } from "lucide-react";
const PARTY_SIZE_STORAGE_KEY = "auctionCalculator_partySize";

export default function AuctionCalculatorPage() {
    const [partySize, setPartySize] = useState<4 | 8 | 16>(8);

    useEffect(() => {
        try {
            const saved = Number(localStorage.getItem(PARTY_SIZE_STORAGE_KEY));

            if (saved === 4 || saved === 8 || saved === 16) {
                setPartySize(saved);
            }
        } catch { }

    }, []);

    const [marketPriceRaw, setMarketPriceRaw] = useState<string>("");


    const calc = useMemo(() => {
        const fee = 0.95;
        const n = partySize;
        const price = Number(marketPriceRaw || "0") || 0;
        const afterFee = price > 0 ? Math.floor(price * fee) : 0;
        const nbbBid = price > 0 ? Math.floor(afterFee * ((n - 1) / n)) : 0;
        const nbbSnipeBid = price > 0 ? Math.floor(nbbBid / 1.1) : 0;

        return {
            price,
            afterFee,
            nbbBid,
            nbbDividend: price > 0 ? Math.floor(nbbBid / (n - 1)) : 0,
            nbbMyNet: price > 0 ? afterFee - nbbBid : 0,
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

            <div className="-mx-4 sm:mx-0 space-y-6 animate-in fade-in duration-300">
                <div className="relative pb-5 px-4 sm:px-0">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 text-xs font-medium text-[#5B69FF]">
                            <Calculator className="h-4 w-4" strokeWidth={2.5} />
                            <span>경매 분석 도구</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                            경매 분배 계산기
                        </h1>
                        <p className="text-sm text-gray-400 max-w-2xl leading-relaxed break-keep">
                            거래소 시세를 바탕으로 파티 인원에 맞는 입찰 적정가를 계산하고 내 순수익을 분석합니다.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 sm:gap-6 items-start">
                    <div className="space-y-4">
                        <section className="rounded-none sm:rounded-xl bg-[#16181D] border-y sm:border border-white/5 overflow-hidden">
                            <div className="px-5 py-4 border-b border-white/5">
                                <h2 className="font-semibold text-white flex items-center gap-2">
                                    <span className="w-1 h-4 bg-indigo-500 rounded-full" />
                                    경매 설정
                                </h2>
                            </div>

                            <div className="p-5 space-y-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                        파티 인원
                                    </label>
                                    <div className="flex flex-col border border-white/5 rounded-lg overflow-hidden">
                                        {[4, 8, 16].map((n) => (
                                            <button
                                                key={n}
                                                onClick={() => {
                                                    const nextPartySize = n as 4 | 8 | 16;
                                                    setPartySize(nextPartySize);

                                                    try {
                                                        localStorage.setItem(PARTY_SIZE_STORAGE_KEY, String(nextPartySize));
                                                    } catch { }
                                                }}
                                                className={`flex w-full items-center gap-3 px-4 py-3 transition-colors border-b border-white/5 last:border-b-0 ${partySize === n
                                                    ? "bg-[#5B69FF]/15 text-white"
                                                    : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                                                    }`}
                                            >
                                                <div
                                                    className={`flex items-center justify-center w-4 h-4 ${partySize === n
                                                        ? "text-[#5B69FF]"
                                                        : "text-transparent"
                                                        }`}
                                                >
                                                    <Check className="h-4 w-4" strokeWidth={3} />
                                                </div>
                                                <span className="text-sm font-bold">{n}인 레이드</span>
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-xs text-gray-500 leading-relaxed break-keep">
                                        레이드 인원에 따라 분배 대상 인원이 달라지므로, 실제 참여 인원에 맞게 선택해야 합니다.
                                    </p>
                                </div>
                            </div>
                        </section>

                        <section className="rounded-none sm:rounded-xl bg-[#16181D] border-y sm:border border-white/5 p-5">
                            <h2 className="text-sm font-bold text-gray-200 mb-3">빠른 사용법</h2>
                            <ol className="space-y-2 text-[13px] leading-relaxed text-gray-400 break-keep">
                                <li>1. 경매가 진행되는 레이드 인원을 선택합니다.</li>
                                <li>2. 아이템의 현재 거래소 시세를 입력합니다.</li>
                                <li>3. 선점 입찰가와 N빵 입찰가를 비교합니다.</li>
                                <li>4. 분배금과 재판매 이익을 비교해 입찰 여부를 판단합니다.</li>
                            </ol>
                        </section>
                    </div>

                    <div className="space-y-5">
                        <section className="bg-[#16181D] rounded-none sm:rounded-xl border-y sm:border border-white/5 p-5 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="font-semibold text-gray-200">거래소 시세 입력</h2>
                            </div>

                            <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6">
                                <div className="w-full sm:max-w-[1000px] relative mt-1">
                                    <label className="absolute -top-2.5 left-2 bg-[#16181D] px-1 text-[11px] text-indigo-400 font-bold z-10">
                                        예상 판매가 (직접 입력)
                                    </label>
                                    <div className="flex items-center rounded-lg bg-[#0F1014] border border-white/10 focus-within:border-indigo-500/50 transition-all">
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            placeholder="0"
                                            value={marketPriceRaw}
                                            onChange={(e) => onChangePrice(e.target.value)}
                                            className="w-full bg-transparent px-4 py-3 text-white outline-none text-2xl font-bold placeholder:text-gray-700"
                                            aria-label="거래소 시세 입력"
                                        />
                                        <span className="pr-4 text-sm text-gray-600 font-bold">G</span>
                                    </div>
                                    <p className="mt-2 text-xs text-gray-500 leading-relaxed break-keep">
                                        거래소에서 실제로 판매할 수 있을 것으로 예상되는 금액을 입력하세요.
                                        계산에는 거래소 수수료 5%가 반영됩니다.
                                    </p>
                                </div>
                            </div>
                        </section>

                        <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
                            <section className="relative group flex flex-col gap-4 rounded-none sm:rounded-xl border-y sm:border border-white/5 bg-[#16181D] p-5 transition-all hover:border-white/10 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <h2 className="font-semibold text-gray-200">선점 입찰가</h2>
                                </div>
                                <div className="relative mt-2">
                                    <label className="absolute -top-2.5 left-2 bg-[#16181D] px-1 text-[11px] text-indigo-400 font-bold z-10">
                                        추천 최적가
                                    </label>
                                    <div className="flex items-center rounded-lg bg-[#0F1014] border border-white/10 transition-all px-4 py-3">
                                        <span className="w-full bg-transparent text-white outline-none text-2xl font-bold">
                                            {fmt(calc.nbbSnipeBid)}
                                        </span>
                                        <span className="text-sm text-gray-600 font-bold">G</span>
                                    </div>
                                </div>
                                <div className="mt-auto space-y-4">
                                    <div className="flex items-end justify-between border-b border-white/5 pb-3">
                                        <span className="text-[11px] text-gray-500 font-medium">
                                            다른 1명 분배금 대비 이익 차이
                                        </span>
                                        <span className="text-2xl font-bold text-white">
                                            {fmt(calc.nbbSnipeMyNet - calc.nbbSnipeDividend)} G
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="flex flex-col items-center justify-center rounded-lg bg-white/5 border border-white/5 py-2.5">
                                            <span className="text-[12px] text-gray-400 font-bold mb-0.5">
                                                타인 1인 분배금
                                            </span>
                                            <span className="text-lg font-medium text-gray-300">
                                                {fmt(calc.nbbSnipeDividend)}
                                            </span>
                                        </div>
                                        <div className="flex flex-col items-center justify-center rounded-lg bg-indigo-500/10 border border-indigo-500/20 py-2.5">
                                            <span className="text-[12px] text-indigo-400 font-bold mb-0.5">
                                                나의 최종 순이익
                                            </span>
                                            <span className="text-lg font-bold text-white">
                                                {fmt(calc.nbbSnipeMyNet)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <section className="relative group flex flex-col gap-4 rounded-none sm:rounded-xl border-y sm:border border-white/5 bg-[#16181D] p-5 transition-all hover:border-white/10 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <h2 className="font-semibold text-gray-200">N빵 입찰가</h2>
                                </div>
                                <div className="relative mt-2">
                                    <label className="absolute -top-2.5 left-2 bg-[#16181D] px-1 text-[11px] text-indigo-400 font-bold z-10">
                                        균등 분배 기준가
                                    </label>
                                    <div className="flex items-center rounded-lg bg-[#0F1014] border border-white/10 transition-all px-4 py-3">
                                        <span className="w-full bg-transparent text-white outline-none text-2xl font-bold">
                                            {fmt(calc.nbbBid)}
                                        </span>
                                        <span className="text-sm text-gray-600 font-bold">G</span>
                                    </div>
                                </div>
                                <div className="mt-auto space-y-4">
                                    <div className="flex items-end justify-between border-b border-white/5 pb-3">
                                        <span className="text-[11px] text-gray-500 font-medium">
                                            다른 1명 분배금 대비 이익 차이
                                        </span>
                                        <span className="text-2xl font-bold text-white">
                                            {fmt(calc.nbbMyNet - calc.nbbDividend)} G
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="flex flex-col items-center justify-center rounded-lg bg-white/5 border border-white/5 py-2.5">
                                            <span className="text-[12px] text-gray-400 font-bold mb-0.5">
                                                타인 1인 분배금
                                            </span>
                                            <span className="text-lg font-medium text-gray-300">
                                                {fmt(calc.nbbDividend)}
                                            </span>
                                        </div>
                                        <div className="flex flex-col items-center justify-center rounded-lg bg-indigo-500/10 border border-indigo-500/20 py-2.5">
                                            <span className="text-[12px] text-indigo-400 font-bold mb-0.5">
                                                나의 최종 순이익
                                            </span>
                                            <span className="text-lg font-bold text-white">
                                                {fmt(calc.nbbMyNet)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>

                        <div className="space-y-4 mt-4">
                            <section className="rounded-none sm:rounded-xl border-y sm:border border-white/5 bg-[#16181D] p-5 space-y-4 text-sm leading-7 text-gray-400">
                                <h2 className="flex items-center gap-2.5 font-semibold text-white"><span aria-hidden="true" className="h-4 w-1 rounded-full bg-[#5B69FF]" />계산 과정</h2>
                                <p>판매 후 실수령액에서 입찰가를 빼면 낙찰자의 재판매 이익이 됩니다. 다른 참여자는 입찰가를 인원 − 1로 나눈 분배금을 받는다고 가정합니다.</p>
                                <ol className="list-decimal space-y-2 pl-5">
                                    <li>실수령액 = 내림(예상 판매가 × 0.95)</li>
                                    <li>N빵 입찰가 = 내림(실수령액 × (인원 − 1) ÷ 인원)</li>
                                    <li>선점 입찰가 = 내림(N빵 입찰가 ÷ 1.1)</li>
                                </ol>
                                <p>선점 가격은 다음 입찰이 약 10% 높아진다는 가정의 참고값입니다. 낙찰을 보장하지 않으며, 분배금과 순이익은 같은 낙찰가에서 참여자끼리 비교한 값입니다.</p>
                                {calc.price > 0 && <p className="rounded-lg border border-white/5 bg-[#0F1014] p-4 text-gray-200">현재 입력: {calc.price.toLocaleString()} G × 0.95 → 실수령액 {calc.afterFee.toLocaleString()} G. {partySize}인 N빵 기준 {calc.nbbBid.toLocaleString()} G에 낙찰되면 내 순이익은 {calc.nbbMyNet.toLocaleString()} G, 다른 1명의 분배금은 {calc.nbbDividend.toLocaleString()} G입니다.</p>}
                            </section>
                            <section className="rounded-none sm:rounded-xl border-y sm:border border-white/5 bg-[#16181D] p-5 space-y-4 text-sm leading-7 text-gray-400">
                                <h2 className="flex items-center gap-2.5 font-semibold text-white"><span aria-hidden="true" className="h-4 w-1 rounded-full bg-[#5B69FF]" />8인·판매가 10,000골드 예시</h2>
                                <p>수수료 5%를 제외하면 9,500 G입니다. N빵 기준은 내림(9,500 × 7 ÷ 8) = 8,312 G, 선점 가격은 내림(8,312 ÷ 1.1) = 7,556 G입니다. 실제 시세가 아닌 설명용 예시입니다.</p>
                                <p>9,000 G에 낙찰받았다면 순이익은 500 G입니다. 다른 사람의 분배금 약 1,285 G보다 적지만 아직 적자는 아닙니다. 재판매 적자는 입찰가가 실수령액 9,500 G를 넘을 때 발생합니다.</p>
                                <p>직접 사용, 거래 불가능한 아이템, 옵션별 가격 차이, 판매 지연은 이 재판매 계산과 구분해야 합니다. 가격 하락이 걱정된다면 예상 판매가를 낮춰 다시 비교하세요.</p>
                                <a href="/articles/auction-bid-guide" className="inline-block text-blue-300 hover:underline">4인·8인·16인 비교표와 상세 해석 읽기 →</a>
                            </section>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
