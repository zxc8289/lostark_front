"use client";

import React, { useMemo, useState } from "react";

export default function AuctionCalculatorPage() {
    const [partySize, setPartySize] = useState<4 | 8 | 16>(8);
    const [marketPriceRaw, setMarketPriceRaw] = useState<string>("");

    const calc = useMemo(() => {
        const fee = 0.95;
        const n = partySize;

        const price = Number(marketPriceRaw || "0") || 0;

        const afterFee = price > 0 ? Math.floor(price * fee) : 0;

        const nbbBid = price > 0 ? Math.floor(price * fee * ((n - 1) / (n + 1))) : 0;

        const nbbSnipeBid = price > 0 ? Math.floor(price * fee * ((n - 1) / n)) : 0;

        const profit = (bid: number) => {
            if (price <= 0 || bid <= 0) return 0;
            // 순이익 = P*0.95 - B - (B/(n-1))
            return Math.floor(price * fee - bid - bid / (n - 1));
        };

        return {
            price,
            afterFee,
            nbbBid,
            nbbProfit: profit(nbbBid),
            nbbSnipeBid,
            nbbSnipeProfit: profit(nbbSnipeBid),
        };
    }, [marketPriceRaw, partySize]);

    const onChangePrice = (v: string) => {
        // 숫자만 허용
        const digits = v.replace(/[^\d]/g, "");
        setMarketPriceRaw(digits);
    };

    const fmt = (v: number) => (v || 0).toLocaleString();

    return (
        <div className="w-full py-10 sm:py-14 bg-[#F6F7F9]">
            <div className="mx-auto max-w-[720px] px-4">
                <h1 className="text-center text-[28px] sm:text-[32px] font-extrabold tracking-tight text-[#0B3B2E]">
                    경매 손익 계산기
                </h1>

                {/* 입력 */}
                <div className="mt-8">
                    <div className="relative">
                        <input
                            inputMode="numeric"
                            placeholder="거래소 가격 입력"
                            value={marketPriceRaw}
                            onChange={(e) => onChangePrice(e.target.value)}
                            className="w-full rounded-full bg-white px-6 pr-14 py-5 text-[18px] sm:text-[20px] font-semibold text-gray-900 placeholder:text-gray-400 shadow-sm border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-400/40"
                        />
                        <div className="absolute right-5 top-1/2 -translate-y-1/2 text-[22px] font-black text-gray-900">
                            G
                        </div>
                    </div>

                    {/* 파티 인원 */}
                    <div className="mt-6 flex items-center justify-center gap-10">
                        {[4, 8, 16].map((n) => {
                            const active = partySize === n;
                            return (
                                <button
                                    key={n}
                                    type="button"
                                    onClick={() => setPartySize(n as 4 | 8 | 16)}
                                    className="flex items-center gap-2 text-[18px] font-bold text-[#0B3B2E]"
                                >
                                    <span
                                        className={`relative inline-flex h-6 w-6 items-center justify-center rounded-full border-2 ${active ? "border-emerald-500" : "border-gray-400"
                                            }`}
                                    >
                                        <span
                                            className={`h-3 w-3 rounded-full ${active ? "bg-emerald-500" : "bg-transparent"
                                                }`}
                                        />
                                    </span>
                                    {n}인
                                </button>
                            );
                        })}
                    </div>

                    {/* 부가 표시 */}
                    <div className="mt-4 text-center text-sm text-gray-500">
                        수수료 5% 제외 시세:{" "}
                        <span className="font-mono font-bold text-gray-800">{fmt(calc.afterFee)} G</span>
                    </div>
                </div>

                {/* 표 */}
                <div className="mt-10 overflow-hidden rounded-2xl bg-white border border-gray-200">
                    <div className="grid grid-cols-[1fr_120px_120px] px-5 py-4 text-sm font-bold text-gray-500">
                        <div />
                        <div className="text-right">입찰가</div>
                        <div className="text-right">이득</div>
                    </div>

                    <div className="h-px bg-gray-200" />

                    {/* N빵 입찰가 */}
                    <div className="grid grid-cols-[1fr_120px_120px] items-center px-5 py-5">
                        <div className="text-[18px] font-extrabold text-gray-900">N빵 입찰가</div>
                        <div className="text-right font-mono text-[18px] font-extrabold text-gray-900">
                            {fmt(calc.nbbBid)} G
                        </div>
                        <div className="text-right font-mono text-[18px] font-extrabold text-sky-600">
                            {calc.nbbProfit > 0 ? "+" : ""}
                            {fmt(calc.nbbProfit)} G
                        </div>
                    </div>

                    <div className="h-px bg-gray-200" />

                    {/* N빵 선점 입찰가 */}
                    <div className="grid grid-cols-[1fr_120px_120px] items-center px-5 py-5">
                        <div className="text-[18px] font-extrabold text-gray-900">N빵 선점 입찰가</div>
                        <div className="text-right font-mono text-[18px] font-extrabold text-gray-900">
                            {fmt(calc.nbbSnipeBid)} G
                        </div>
                        <div className="text-right font-mono text-[18px] font-extrabold text-sky-600">
                            {calc.nbbSnipeProfit > 0 ? "+" : ""}
                            {fmt(calc.nbbSnipeProfit)} G
                        </div>
                    </div>
                </div>

                <p className="mt-5 text-center text-sm text-gray-500">
                    * <span className="font-bold">N빵 선점 입찰가</span> 보다 낮게 입찰 할 수록 이익금이 증가 합니다.
                </p>
            </div>
        </div>
    );
}