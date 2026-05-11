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
                                                onClick={() => setPartySize(n as 4 | 8 | 16)}
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
                                <li>4. 실제 경매 상황에서 손해 구간을 넘지 않도록 입찰합니다.</li>
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
                                        <span className="w-full bg-transparent text-white outline-none font-mono text-2xl font-bold">
                                            {fmt(calc.nbbSnipeBid)}
                                        </span>
                                        <span className="text-sm text-gray-600 font-bold">G</span>
                                    </div>
                                </div>
                                <div className="mt-auto space-y-4">
                                    <div className="flex items-end justify-between border-b border-white/5 pb-3">
                                        <span className="text-[11px] text-gray-500 font-medium">
                                            분배금 포기 대비 얻는 추가 이익
                                        </span>
                                        <span className="text-2xl font-bold font-mono text-white">
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
                                        최대 허용가
                                    </label>
                                    <div className="flex items-center rounded-lg bg-[#0F1014] border border-white/10 transition-all px-4 py-3">
                                        <span className="w-full bg-transparent text-white outline-none font-mono text-2xl font-bold">
                                            {fmt(calc.nbbBid)}
                                        </span>
                                        <span className="text-sm text-gray-600 font-bold">G</span>
                                    </div>
                                </div>
                                <div className="mt-auto space-y-4">
                                    <div className="flex items-end justify-between border-b border-white/5 pb-3">
                                        <span className="text-[11px] text-gray-500 font-medium">
                                            분배금 포기 대비 얻는 추가 이익
                                        </span>
                                        <span className="text-2xl font-bold font-mono text-white">
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
                            <section className="rounded-none sm:rounded-xl bg-gradient-to-b from-[#16181D] to-[#121318] border-y sm:border border-white/5 p-5 mt-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <Info className="w-4 h-4 text-indigo-400" />
                                    <h2 className="text-sm font-bold text-gray-200">
                                        경매 계산기 활용 가이드
                                    </h2>
                                </div>
                                <div className="space-y-3 text-[13px] leading-relaxed text-gray-400 break-keep">
                                    <p>
                                        로스트아크 레이드 경매에서는 아이템을 직접 입찰해서 가져가는 사람과,
                                        입찰하지 않고 분배금만 받는 사람의 기대 이익이 달라집니다. 이 계산기는
                                        거래소 시세를 기준으로 입찰자가 어느 가격까지 입찰해도 손해를 보지 않는지
                                        확인하기 위한 도구입니다.
                                    </p>
                                    <p>
                                        <strong className="text-gray-300 font-medium">선점 입찰가:</strong>{" "}
                                        경쟁을 줄이면서 남들이 받는 분배금보다{" "}
                                        <strong className="text-white">내가 얻는 이득을 더 크게 가져가는</strong>{" "}
                                        보수적인 추천 입찰가입니다. 실전에서 빠르게 선입찰을 걸고 싶을 때 참고하기 좋습니다.
                                    </p>
                                    <p>
                                        <strong className="text-gray-300 font-medium">N빵 입찰가:</strong>{" "}
                                        입찰한 사람과 입찰을 포기한 사람의 이득이{" "}
                                        <strong className="text-white">거의 같아지는 마지노선 가격</strong>입니다.
                                        이 금액을 넘어가면 입찰자가 오히려 손해를 볼 수 있습니다.
                                    </p>
                                    <div className="w-full h-px bg-white/5 my-3" />
                                    <p className="text-indigo-300 font-medium">
                                        입력창에 거래소 시세만 넣으면 현재 선택한 {partySize}인 기준으로 타인의 예상 분배금,
                                        나의 최종 순수익, 입찰 상한선을 함께 확인할 수 있습니다.
                                    </p>
                                </div>
                            </section>

                            <section className="rounded-none sm:rounded-xl bg-[#16181D] border-y sm:border border-white/5 p-5">
                                <h2 className="text-sm font-bold text-gray-200 mb-3">
                                    언제 사용하면 좋은가요?
                                </h2>

                                <div className="space-y-3 text-[13px] leading-relaxed text-gray-400 break-keep">
                                    <p>
                                        경매 계산기는 레이드 종료 후 재료, 장비, 보상 상자, 거래 가능 아이템 등이
                                        경매에 올라왔을 때 유용합니다. 특히 거래소 시세가 높은 아이템은 감으로 입찰하면
                                        실제로는 분배금만 받는 것보다 손해가 날 수 있습니다.
                                    </p>

                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <div className="rounded-lg bg-[#0F1014] border border-white/5 p-4">
                                            <h3 className="text-gray-200 font-semibold mb-2">
                                                입찰 전 확인
                                            </h3>
                                            <p>
                                                거래소 최저가를 입력해 현재 파티 인원 기준으로 얼마까지 입찰해도 되는지
                                                빠르게 확인할 수 있습니다.
                                            </p>
                                        </div>
                                        <div className="rounded-lg bg-[#0F1014] border border-white/5 p-4">
                                            <h3 className="text-gray-200 font-semibold mb-2">
                                                손해 구간 방지
                                            </h3>
                                            <p>
                                                N빵 입찰가를 넘기면 기대 이익이 줄어들 수 있으므로, 무리한 경쟁 입찰을
                                                피하는 기준으로 사용할 수 있습니다.
                                            </p>
                                        </div>
                                        <div className="rounded-lg bg-[#0F1014] border border-white/5 p-4">
                                            <h3 className="text-gray-200 font-semibold mb-2">
                                                분배금 비교
                                            </h3>
                                            <p>
                                                입찰하지 않았을 때 받을 수 있는 예상 분배금과 입찰했을 때의 최종 순이익을
                                                함께 비교할 수 있습니다.
                                            </p>
                                        </div>
                                        <div className="rounded-lg bg-[#0F1014] border border-white/5 p-4">
                                            <h3 className="text-gray-200 font-semibold mb-2">
                                                파티 인원별 계산
                                            </h3>
                                            <p>
                                                4인, 8인, 16인 콘텐츠는 분배 구조가 다르기 때문에 같은 시세라도 적정 입찰가가
                                                달라집니다.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <section className="rounded-none sm:rounded-xl bg-[#16181D] border-y sm:border border-white/5 p-5">
                                <h2 className="text-sm font-bold text-gray-200 mb-3">
                                    계산 원리
                                </h2>

                                <div className="space-y-3 text-[13px] leading-relaxed text-gray-400 break-keep">
                                    <p>
                                        계산은 먼저 거래소 시세에 수수료 5%를 반영해
                                        <strong className="text-gray-300"> 실제 판매 후 남는 금액</strong>을 구한 뒤,
                                        그 금액을 현재 선택한 <strong className="text-white">{partySize}인 레이드</strong> 기준으로
                                        분배해서 입찰 적정가를 계산하는 방식입니다.
                                    </p>

                                    <div className="rounded-lg bg-[#0F1014] border border-white/5 p-4 space-y-2">
                                        <p className="text-gray-300 font-semibold">간단 계산 흐름</p>
                                        <p>1. 거래소 시세 입력</p>
                                        <p>2. 거래소 수수료 5% 제외 후 실수령가 계산</p>
                                        <p>3. 파티 인원 기준으로 분배금과 입찰 가능 금액 계산</p>
                                        <p>4. 선점 입찰가와 N빵 입찰가를 나누어 표시</p>
                                    </div>

                                    <p>
                                        따라서 이 페이지는 “무조건 이 가격에 입찰하라”는 의미보다,
                                        <strong className="text-gray-300"> 현재 시세에서 어느 구간까지는 비교적 안전한가</strong>를
                                        빠르게 판단하는 기준으로 보는 것이 좋습니다.
                                    </p>
                                </div>
                            </section>

                            <section className="rounded-none sm:rounded-xl bg-[#16181D] border-y sm:border border-white/5 p-5">
                                <h2 className="text-sm font-bold text-gray-200 mb-3">
                                    예시 계산
                                </h2>

                                <div className="space-y-3 text-[13px] leading-relaxed text-gray-400 break-keep">
                                    <p>
                                        예를 들어 8인 레이드에서 거래소 시세가 10,000골드인 아이템이 경매에 올라왔다고
                                        가정하면, 거래소 판매 수수료 5%를 제외한 실수령가는 약 9,500골드가 됩니다.
                                        이 금액을 기준으로 입찰자가 가져가는 이익과 나머지 파티원에게 돌아가는 분배금을
                                        비교해야 합니다.
                                    </p>
                                    <p>
                                        입찰가가 너무 낮으면 다른 파티원이 쉽게 따라올 수 있고, 입찰가가 너무 높으면
                                        아이템을 가져가더라도 실제 이익은 줄어들 수 있습니다. 그래서 선점 입찰가는
                                        실전에서 경쟁을 줄이기 위한 추천가로 보고, N빵 입찰가는 넘기면 손해가 커질 수 있는
                                        상한선으로 보는 것이 좋습니다.
                                    </p>
                                    <div className="rounded-lg bg-indigo-500/10 border border-indigo-500/20 p-4">
                                        <p className="text-indigo-200 font-medium">
                                            핵심은 “아이템을 가져가는 이득”과 “입찰하지 않고 분배금만 받는 이득”을 비교하는 것입니다.
                                            두 값이 비슷해지는 지점이 N빵 입찰가에 가깝습니다.
                                        </p>
                                    </div>
                                </div>
                            </section>

                            <section className="rounded-none sm:rounded-xl bg-[#16181D] border-y sm:border border-white/5 p-5">
                                <h2 className="text-sm font-bold text-gray-200 mb-3">
                                    결과 해석 방법
                                </h2>

                                <div className="space-y-3 text-[13px] leading-relaxed text-gray-400 break-keep">
                                    <ul className="space-y-2">
                                        <li>
                                            • <strong className="text-gray-300">선점 입찰가</strong>는 실제 경매에서 빠르게 잡고 싶은 경우 참고하기 좋은 추천 금액입니다.
                                        </li>
                                        <li>
                                            • <strong className="text-gray-300">N빵 입찰가</strong>는 손해를 보지 않기 위한 최대 허용가에 가깝습니다.
                                        </li>
                                        <li>
                                            • <strong className="text-gray-300">타인 1인 분배금</strong>은 내가 입찰했을 때 다른 파티원이 받을 것으로 예상되는 금액입니다.
                                        </li>
                                        <li>
                                            • <strong className="text-gray-300">나의 최종 순이익</strong>은 아이템을 거래소에 판매한다고 가정했을 때 입찰자가 남기는 예상 금액입니다.
                                        </li>
                                        <li>
                                            • <strong className="text-gray-300">분배금 포기 대비 추가 이익</strong>은 입찰하지 않았을 때 받을 분배금과 비교해 입찰자가 더 얻는 금액입니다.
                                        </li>
                                    </ul>
                                </div>
                            </section>

                            <section className="rounded-none sm:rounded-xl bg-[#16181D] border-y sm:border border-white/5 p-5">
                                <h2 className="text-sm font-bold text-gray-200 mb-3">
                                    주의사항
                                </h2>

                                <div className="space-y-3 text-[13px] leading-relaxed text-gray-400 break-keep">
                                    <ul className="space-y-2">
                                        <li>
                                            • 이 계산은 거래소 시세 입력값 기준의 참고용입니다. 실제 입찰 경쟁 상황에 따라 체감 이익은 달라질 수 있습니다.
                                        </li>
                                        <li>
                                            • 시세가 급변하는 재료나 아이템은 입력 시점과 실제 판매 시점의 차이가 발생할 수 있습니다.
                                        </li>
                                        <li>
                                            • 선점 입찰가는 추천가 성격이고, N빵 입찰가는 손해를 피하기 위한 상한선에 가깝습니다.
                                        </li>
                                        <li>
                                            • 실제 거래소 판매가 어려운 아이템이라면 최저가보다 보수적으로 입력하는 것이 좋습니다.
                                        </li>
                                        <li>
                                            • 실전에서는 파티 분위기, 빠른 진행 여부, 아이템 수요, 서버 내 시세 흐름도 함께 고려하는 것이 좋습니다.
                                        </li>
                                    </ul>
                                </div>
                            </section>

                            <section className="rounded-none sm:rounded-xl bg-[#16181D] border-y sm:border border-white/5 p-5">
                                <h2 className="text-sm font-bold text-gray-200 mb-4">
                                    자주 묻는 질문
                                </h2>

                                <div className="space-y-3">
                                    {[
                                        {
                                            q: "선점 입찰가와 N빵 입찰가는 무엇이 다른가요?",
                                            a: "선점 입찰가는 경쟁을 줄이면서 내 이익을 조금 더 크게 가져가려는 추천가이고, N빵 입찰가는 입찰과 미입찰의 기대 이익이 거의 같아지는 최대 허용가입니다.",
                                        },
                                        {
                                            q: "최대 허용가를 넘기면 왜 손해인가요?",
                                            a: "그 가격을 넘어가면 입찰해서 얻는 최종 순이익이, 입찰하지 않고 분배금만 받는 경우보다 작아질 수 있기 때문입니다.",
                                        },
                                        {
                                            q: "4인, 8인, 16인 결과가 왜 다른가요?",
                                            a: "파티 인원이 달라지면 분배 구조 자체가 달라지기 때문입니다. 같은 시세라도 인원이 많을수록 1인당 분배금과 적정 입찰가가 달라집니다.",
                                        },
                                        {
                                            q: "수수료 5%는 왜 반영하나요?",
                                            a: "실제로 거래소에 판매했을 때 손에 들어오는 금액을 기준으로 계산해야 현실적인 입찰가가 나오기 때문입니다.",
                                        },
                                        {
                                            q: "거래소 최저가를 그대로 입력하면 되나요?",
                                            a: "대부분은 최저가를 기준으로 입력하면 되지만, 시세가 빠르게 변하거나 매물이 많은 아이템은 실제 판매 가능 가격을 조금 보수적으로 입력하는 것이 좋습니다.",
                                        },
                                        {
                                            q: "이 계산 결과를 그대로 믿고 입찰해도 되나요?",
                                            a: "기본 판단 기준으로는 충분히 유용하지만, 실제 경쟁 상황과 시세 변동까지 포함한 절대값은 아니므로 참고용으로 활용하는 것이 가장 좋습니다.",
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
        </>
    );
}