"use client";

import { useEffect, useMemo, useState } from "react";
import { compareGemPrices } from "@/app/lib/calculators/gem-comparison";
import {
    Calculator,
    Check,
    Gem,
    Loader2,
    RefreshCw,
    RotateCcw,
} from "lucide-react";

type GemLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
type TargetLevel = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
type GemType = "damage" | "cooldown";
type PriceMap = Record<GemLevel, Record<GemType, string>>;

const STORAGE_KEY = "loacheck_gem_calculator_prices";
const SETTINGS_KEY = "loacheck_gem_calculator_settings";
const PRICE_LEVELS: GemLevel[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const TARGET_LEVELS: TargetLevel[] = [2, 3, 4, 5, 6, 7, 8, 9, 10];
const GEM_TYPES: { key: GemType; label: string; shortLabel: string }[] = [
    { key: "damage", label: "겁화의 보석", shortLabel: "겁화" },
    { key: "cooldown", label: "작열의 보석", shortLabel: "작열" },
];

const EMPTY_PRICES: PriceMap = {
    1: { damage: "", cooldown: "" },
    2: { damage: "", cooldown: "" },
    3: { damage: "", cooldown: "" },
    4: { damage: "", cooldown: "" },
    5: { damage: "", cooldown: "" },
    6: { damage: "", cooldown: "" },
    7: { damage: "", cooldown: "" },
    8: { damage: "", cooldown: "" },
    9: { damage: "", cooldown: "" },
    10: { damage: "", cooldown: "" },
};

const parseGold = (value: string) => Number(value.replace(/[^\d]/g, "")) || 0;
const formatGold = (value: number) => Math.max(0, Math.floor(value)).toLocaleString();
const lowerLevelOf = (level: TargetLevel) => (level - 1) as GemLevel;

function normalizePrices(value: unknown): PriceMap {
    const source = value as Partial<Record<GemLevel, Partial<Record<GemType, string | number>>>> | null;
    const next: PriceMap = {
        1: { ...EMPTY_PRICES[1] },
        2: { ...EMPTY_PRICES[2] },
        3: { ...EMPTY_PRICES[3] },
        4: { ...EMPTY_PRICES[4] },
        5: { ...EMPTY_PRICES[5] },
        6: { ...EMPTY_PRICES[6] },
        7: { ...EMPTY_PRICES[7] },
        8: { ...EMPTY_PRICES[8] },
        9: { ...EMPTY_PRICES[9] },
        10: { ...EMPTY_PRICES[10] },
    };

    PRICE_LEVELS.forEach((level) => {
        GEM_TYPES.forEach((type) => {
            const raw = source?.[level]?.[type.key];
            const price = typeof raw === "number" ? raw : parseGold(String(raw ?? ""));
            next[level][type.key] = Number.isFinite(price) && price > 0 ? String(price) : "";
        });
    });

    return next;
}

export default function GemCalculatorPage() {
    const [prices, setPrices] = useState<PriceMap>(EMPTY_PRICES);
    const [targetLevel, setTargetLevel] = useState<TargetLevel>(9);
    const [targetType, setTargetType] = useState<GemType>("damage");
    const [loaded, setLoaded] = useState(false);
    const [isFetchingPrices, setIsFetchingPrices] = useState(false);
    const [priceStatus, setPriceStatus] = useState<string | null>(null);
    const [updatedAt, setUpdatedAt] = useState<string | null>(null);

    useEffect(() => {
        try {
            const savedPrices = localStorage.getItem(STORAGE_KEY);
            const savedSettings = localStorage.getItem(SETTINGS_KEY);

            if (savedPrices) {
                const saved = JSON.parse(savedPrices);
                setPrices(normalizePrices(saved?.prices ?? saved));
                setUpdatedAt(typeof saved?.updatedAt === "string" && Number.isFinite(Date.parse(saved.updatedAt)) ? saved.updatedAt : null);
                setPriceStatus("이전에 저장한 가격입니다. 최신 시세를 확인해 주세요.");
            }

            if (savedSettings) {
                const parsed = JSON.parse(savedSettings);
                if ([2, 3, 4, 5, 6, 7, 8, 9, 10].includes(parsed.targetLevel)) setTargetLevel(parsed.targetLevel);
                if (parsed.targetType === "damage" || parsed.targetType === "cooldown") setTargetType(parsed.targetType);
            }
        } catch { }

        setLoaded(true);
    }, []);

    useEffect(() => {
        if (!loaded) return;

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ prices, updatedAt }));
            localStorage.setItem(SETTINGS_KEY, JSON.stringify({ targetLevel, targetType }));
        } catch { }
    }, [prices, updatedAt, targetLevel, targetType, loaded]);

    const fetchGemPrices = async () => {
        setIsFetchingPrices(true);
        setPriceStatus(null);

        try {
            const response = await fetch("/api/lostark/gem-prices", { cache: "no-store" });

            if (!response.ok) {
                throw new Error("시세를 불러오지 못했습니다.");
            }

            const data = await response.json();
            const nextPrices = normalizePrices(data?.prices);
            const count = PRICE_LEVELS.flatMap((level) => GEM_TYPES.map((type) => parseGold(nextPrices[level][type.key]))).filter((price) => price > 0).length;
            if (!count) throw new Error("조회된 보석 가격이 없습니다.");
            setPrices(nextPrices);
            setUpdatedAt(typeof data?.updatedAt === "string" && Number.isFinite(Date.parse(data.updatedAt)) ? data.updatedAt : null);
            setPriceStatus(data?.cache?.stale
                ? "최신 조회에 실패하여 이전 캐시 가격을 표시합니다. 갱신 시간을 확인해 주세요."
                : count < 20 ? "일부 보석 가격이 없습니다. 가격이 확인된 조합만 비교합니다." : "T4 보석 최저가를 불러왔습니다.");
        } catch (error) {
            console.error(error);
            setPriceStatus("시세 갱신에 실패했습니다. 표시 중인 가격이 있다면 이전 저장값입니다. 잠시 후 다시 시도해 주세요.");
        } finally {
            setIsFetchingPrices(false);
        }
    };

    useEffect(() => {
        if (!loaded) return;
        fetchGemPrices();
    }, [loaded]);

    const result = useMemo(() => ({
        lowerLevel: lowerLevelOf(targetLevel),
        ...compareGemPrices(parseGold(prices[targetLevel][targetType]), parseGold(prices[lowerLevelOf(targetLevel)].damage), parseGold(prices[lowerLevelOf(targetLevel)].cooldown)),
    }), [prices, targetLevel, targetType]);

    const synthesisRows = useMemo(() => TARGET_LEVELS.map((level) => ({
        level,
        lowerLevel: lowerLevelOf(level),
        ...compareGemPrices(parseGold(prices[level][targetType]), parseGold(prices[lowerLevelOf(level)].damage), parseGold(prices[lowerLevelOf(level)].cooldown)),
    })), [prices, targetType]);

    const resetPrices = () => {
        setPrices(EMPTY_PRICES);
        setUpdatedAt(null);
        setPriceStatus(null);
    };

    const recommendationLabel = isFetchingPrices && !result.canCalculate ? "시세를 불러오는 중입니다" : result.label;

    const recommendationTone = "border-white/10 bg-white/5 text-gray-200";
    const targetTypeLabel = GEM_TYPES.find((type) => type.key === targetType)?.shortLabel ?? "";
    const updatedAtLabel = updatedAt
        ? new Date(updatedAt).toLocaleString("ko-KR", {
            year: "numeric",
            timeZone: "Asia/Seoul",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
        })
        : null;

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
                <header className="relative pb-5 px-4 sm:px-0">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 text-xs font-medium text-[#5B69FF]">
                            <Gem className="h-4 w-4" strokeWidth={2.5} />
                            <span>보석 계산 도구</span>
                        </div>
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div className="space-y-2">
                                <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                                    T4 보석 합성/구매 비교 계산기
                                </h1>
                                <p className="max-w-3xl break-keep text-sm leading-relaxed text-gray-400">
                                    경매장에서 가져온 T4 겁화/작열 보석 최저가를 기준으로 바로 구매할지, 하위 보석 3개를 합성할지 비교합니다.
                                </p>
                            </div>

                        </div>
                    </div>
                </header>

                <div className="grid grid-cols-1 items-start gap-4 sm:gap-6 lg:grid-cols-[280px_1fr]">
                    <aside className="space-y-4">
                        <section className="overflow-hidden rounded-none border-y border-white/5 bg-[#16181D] sm:rounded-xl sm:border">
                            <div className="border-b border-white/5 px-5 py-4">
                                <h2 className="flex items-center gap-2 font-semibold text-white">
                                    <span className="h-4 w-1 rounded-full bg-indigo-500" />
                                    목표 설정
                                </h2>
                            </div>
                            <div className="space-y-6 p-5">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                                        목표 레벨
                                    </label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {TARGET_LEVELS.map((level) => (
                                            <button
                                                key={level}
                                                type="button"
                                                onClick={() => setTargetLevel(level)}
                                                className={`flex h-11 items-center justify-center rounded-lg border text-sm font-bold transition-colors ${targetLevel === level
                                                    ? "border-[#5B69FF]/40 bg-[#5B69FF]/15 text-white"
                                                    : "border-white/5 bg-[#0F1014] text-gray-400 hover:border-white/10 hover:text-gray-200"
                                                    }`}
                                            >
                                                {level}레벨
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                                        목표 보석
                                    </label>
                                    <div className="space-y-2">
                                        {GEM_TYPES.map((type) => (
                                            <button
                                                key={type.key}
                                                type="button"
                                                onClick={() => setTargetType(type.key)}
                                                className={`flex h-11 w-full items-center gap-3 rounded-lg border px-4 text-sm font-bold transition-colors ${targetType === type.key
                                                    ? "border-[#5B69FF]/40 bg-[#5B69FF]/15 text-white"
                                                    : "border-white/5 bg-[#0F1014] text-gray-400 hover:border-white/10 hover:text-gray-200"
                                                    }`}
                                            >
                                                <div
                                                    className={`flex h-4 w-4 items-center justify-center ${targetType === type.key
                                                        ? "text-[#5B69FF]"
                                                        : "text-transparent"
                                                        }`}
                                                >
                                                    <Check className="h-4 w-4" strokeWidth={3} />
                                                </div>
                                                <span>{type.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="rounded-none border-y border-white/5 bg-[#16181D] p-5 sm:rounded-xl sm:border">
                            <h2 className="mb-3 text-sm font-bold text-gray-200">계산 기준</h2>
                            <div className="space-y-3 break-keep text-[13px] leading-relaxed text-gray-400">
                                <p>합성 비용은 하위 레벨 T4 보석 3개의 구매 비용으로 계산합니다.</p>
                                <p>합성 결과의 스킬과 타입은 확정이 아니므로, 결과는 가격 비교용 참고값입니다.</p>
                            </div>
                        </section>
                    </aside>

                    <main className="space-y-5">
                        <section className="rounded-none border-y border-white/5 bg-[#16181D] p-5 shadow-sm sm:rounded-xl sm:border">
                            <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                                <div className="min-w-0 max-w-3xl">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h2 className="font-semibold text-gray-200">목표 타입 획득 시 가격 차이</h2>
                                        {updatedAtLabel && (
                                            <span className="text-[11px] font-medium text-gray-500">
                                                (가격 조회 {updatedAtLabel} KST)
                                            </span>
                                        )}
                                    </div>
                                    <p className="mt-1 break-keep text-xs text-gray-500">
                                        같은 레벨 보석 3개로 한 단계 높은 {targetTypeLabel} 보석을 얻는다고 가정한 비교입니다. 확률을 반영한 기대 수익이나 판매 수수료 차감 후 수익이 아닙니다.
                                        행을 누르면 목표 레벨이 바뀝니다.
                                    </p>
                                </div>
                                <div className="flex shrink-0 flex-row flex-wrap gap-2 xl:flex-nowrap">
                                    <button
                                        type="button"
                                        onClick={fetchGemPrices}
                                        disabled={isFetchingPrices}
                                        className="inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-gray-300 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {isFetchingPrices ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                                        시세 불러오기
                                    </button>
                                    <button
                                        type="button"
                                        onClick={resetPrices}
                                        disabled={isFetchingPrices}
                                        className="inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-lg border border-white/10 bg-[#0F1014] px-3 py-2 text-xs font-bold text-gray-400 transition hover:bg-white/5 hover:text-gray-200"
                                    >
                                        <RotateCcw className="h-4 w-4" />
                                        초기화
                                    </button>
                                </div>
                            </div>

                            {(priceStatus || isFetchingPrices) && (
                                <div role="status" aria-live="polite" className="mb-4 rounded-lg border border-white/10 bg-[#0F1014] px-4 py-3 text-xs font-medium text-gray-300">
                                    {isFetchingPrices ? "시세를 불러오는 중입니다. 기존 값이 있으면 갱신 전 가격을 표시합니다." : priceStatus}
                                </div>
                            )}

                            <div className="overflow-x-auto rounded-xl border border-white/5">
                                <div className="min-w-[720px]">
                                    <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr_0.8fr] bg-[#0F1014] px-3 py-3 text-xs font-bold text-gray-500">
                                        <div>합성</div>
                                        <div className="text-right">비용</div>
                                        <div className="text-right">결과 가치</div>
                                        <div className="text-right">가격 차이</div>
                                        <div className="text-right">차이율</div>
                                    </div>
                                    {synthesisRows.map((row) => {
                                        const selected = row.level === targetLevel;
                                        const isProfit = row.profit > 0;
                                        const profitClass = row.canCalculate
                                            ? isProfit
                                                ? "text-emerald-300"
                                                : row.profit < 0
                                                    ? "text-rose-300"
                                                    : "text-gray-300"
                                            : "text-gray-500";

                                        return (
                                            <button
                                                key={row.level}
                                                type="button"
                                                onClick={() => setTargetLevel(row.level)}
                                                className={`grid w-full grid-cols-[1.2fr_1fr_1fr_1fr_0.8fr] items-center border-t border-white/5 px-3 py-3 text-sm transition-colors ${selected
                                                    ? "bg-[#5B69FF]/10"
                                                    : "hover:bg-white/[0.03]"
                                                    }`}
                                            >
                                                <div className="text-left font-bold text-gray-100">
                                                    {row.lowerLevel}Lv x3 → {row.level}Lv
                                                </div>
                                                <div className="text-right font-bold text-gray-200">
                                                    {row.canCalculate ? `${formatGold(row.synthesisCost)}G` : "-"}
                                                </div>
                                                <div className="text-right font-bold text-gray-200">
                                                    {row.canCalculate ? `${formatGold(row.targetPrice)}G` : "-"}
                                                </div>
                                                <div className={`text-right font-bold ${profitClass}`}>
                                                    {row.canCalculate ? `${row.profit > 0 ? "+" : row.profit < 0 ? "−" : ""}${formatGold(Math.abs(row.profit))}G` : "-"}
                                                </div>
                                                <div className="text-right">
                                                    <span className={`inline-flex rounded-md border border-white/5 bg-[#0F1014] px-2 py-1 text-xs font-bold ${profitClass}`}>
                                                        {row.canCalculate ? `${row.profitRate > 0 ? "+" : ""}${row.profitRate.toFixed(1)}%` : "-"}
                                                    </span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </section>

                        <section className="grid gap-4 lg:grid-cols-3">
                            <ResultCard
                                label="바로 구매"
                                value={result.targetPrice > 0 ? `${formatGold(result.targetPrice)} G` : "—"}
                                subText={`${targetLevel}레벨 ${targetTypeLabel} 보석 최저가`}
                            />
                            <ResultCard
                                label="1회 합성 비용"
                                value={result.synthesisCost > 0 ? `${formatGold(result.synthesisCost)} G` : "—"}
                                subText={`${result.lowerLevel}레벨 보석 3개 기준`}
                            />
                            <ResultCard
                                label="차액"
                                value={result.canCalculate ? `${result.diff > 0 ? "+" : result.diff < 0 ? "−" : ""}${formatGold(Math.abs(result.diff))} G` : "—"}
                                subText={recommendationLabel}
                            />
                        </section>

                        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                            <div className="rounded-none border-y border-white/5 bg-[#16181D] p-5 sm:rounded-xl sm:border">
                                <div className="mb-4 flex items-center justify-between">
                                    <h2 className="font-semibold text-gray-200">합성 계산 상세</h2>
                                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-bold text-gray-400">
                                        T4 보석 기준
                                    </span>
                                </div>
                                <div className="space-y-3">
                                    <DetailRow label="사용할 하위 보석 레벨" value={`${result.lowerLevel}레벨`} />
                                    <DetailRow label="하위 보석 최저 단가" value={result.lowerUnitPrice > 0 ? `${formatGold(result.lowerUnitPrice)} G` : "—"} />
                                    <DetailRow label="필요 수량" value="3개" />
                                    <DetailRow label="1회 합성 비용" value={result.synthesisCost > 0 ? `${formatGold(result.synthesisCost)} G` : "—"} />
                                </div>
                            </div>

                            <div className={`rounded-none border-y p-5 sm:rounded-xl sm:border ${recommendationTone}`}>
                                <div className="mb-4 flex items-center gap-3">
                                    <Calculator className="h-5 w-5" />
                                    <h2 className="font-semibold">판단 결과</h2>
                                </div>
                                {result.canCalculate ? (
                                    <div className="space-y-2 break-keep">
                                        <div className="text-xl font-bold text-white">
                                            {recommendationLabel}
                                        </div>
                                        <p className="text-sm leading-relaxed text-gray-400">
                                            {result.diff === 0 ? "목표 보석 구매가와 1회 합성 비용의 차이가 없습니다." : result.isSynthesisCheaper
                                                ? `바로 구매보다 합성 비용이 ${formatGold(Math.abs(result.diff))} G 저렴합니다.`
                                                : `합성보다 바로 구매가 ${formatGold(Math.abs(result.diff))} G 저렴합니다.`}
                                        </p>
                                    </div>
                                ) : (
                                    <p className="break-keep text-sm leading-relaxed">
                                        {recommendationLabel}. 목표 보석과 하위 보석의 가격이 모두 있어야 비교할 수 있습니다.
                                    </p>
                                )}
                            </div>
                        </section>

                        <section className="rounded-none border-y border-white/5 bg-[#16181D] p-5 sm:rounded-xl sm:border">
                            <h2 className="mb-3 text-sm font-bold text-gray-200">사용 예시</h2>
                            <div className="space-y-3 break-keep text-[13px] leading-relaxed text-gray-400">
                                <p>
                                    예를 들어 9레벨 겁화 보석을 목표로 잡았다면, 계산기는 9레벨 겁화 최저가와 8레벨 T4 보석 3개의 구매 비용을 비교합니다.
                                </p>
                                <p>
                                    자동 시세는 경매장 즉시 구매가 기준이며, 보석 옵션과 스킬은 매물마다 다를 수 있습니다. 이 페이지는 보석 레벨별 가격 차이를 빠르게 보는 용도로 사용하는 것이 좋습니다.
                                </p>
                            </div>
                        </section>
                    </main>
                </div>
            </div>
        </>
    );
}

function ResultCard({
    label,
    value,
    subText,
}: {
    label: string;
    value: string;
    subText: string;
}) {
    return (
        <div className="rounded-none border-y border-white/5 bg-[#16181D] p-5 sm:rounded-xl sm:border">
            <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-300">{label}</span>
            </div>
            <div className="text-2xl font-bold text-white">{value}</div>
            <p className="mt-2 break-keep text-xs leading-relaxed text-gray-500">{subText}</p>
        </div>
    );
}

function DetailRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between gap-4 rounded-lg border border-white/5 bg-[#0F1014] px-4 py-3">
            <span className="break-keep text-sm text-gray-400">{label}</span>
            <span className="shrink-0 text-sm font-bold text-gray-100">{value}</span>
        </div>
    );
}
