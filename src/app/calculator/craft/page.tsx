"use client";

import { Fragment, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import {
    AlertCircle,
    Check,
    Hammer,
    Loader2,
    RefreshCw,
    RotateCcw,
} from "lucide-react";

type CraftRecipe = {
    id: string;
    name: string;
    outputItem: string;
    group: "상급 아비도스" | "아비도스" | "최상급 오레하";
    source: "벌목" | "고고학" | "채광" | "식물채집" | "낚시" | "수렵";
    outputCount: number;
    activity: number;
    baseCraftGold: number;
    materials: { name: string; quantity: number }[];
};

type Settings = {
    saleFeeRate: string;
    craftDiscountRate: string;
    greatSuccessRate: string;
};

type PriceMap = Record<string, string>;

const PRICE_STORAGE_KEY = "loacheck_craft_calculator_prices";
const SETTINGS_STORAGE_KEY = "loacheck_craft_calculator_settings";

const SOURCE_MATERIALS: Record<CraftRecipe["source"], { common: string; uncommon: string; oreha: string; abydos: string }> = {
    벌목: { common: "목재", uncommon: "부드러운 목재", oreha: "튼튼한 목재", abydos: "아비도스 목재" },
    고고학: { common: "고대 유물", uncommon: "희귀한 유물", oreha: "오레하 유물", abydos: "아비도스 유물" },
    채광: { common: "철광석", uncommon: "묵직한 철광석", oreha: "단단한 철광석", abydos: "아비도스 철광석" },
    식물채집: { common: "들꽃", uncommon: "수줍은 들꽃", oreha: "화사한 들꽃", abydos: "아비도스 들꽃" },
    낚시: { common: "생선", uncommon: "붉은 살 생선", oreha: "오레하 태양 잉어", abydos: "아비도스 태양 잉어" },
    수렵: { common: "두툼한 생고기", uncommon: "다듬은 생고기", oreha: "오레하 두툼한 생고기", abydos: "아비도스 두툼한 생고기" },
};

const SOURCES = Object.keys(SOURCE_MATERIALS) as CraftRecipe["source"][];

function makeRecipe(
    group: CraftRecipe["group"],
    source: CraftRecipe["source"],
    config: {
        outputItem: string;
        outputCount: number;
        activity: number;
        baseCraftGold: number;
        common: number;
        uncommon: number;
        special: number;
        specialKind: "oreha" | "abydos";
    }
): CraftRecipe {
    const materials = SOURCE_MATERIALS[source];

    return {
        id: `${group}-${source}`,
        name: `${config.outputItem}(${source})`,
        outputItem: config.outputItem,
        group,
        source,
        outputCount: config.outputCount,
        activity: config.activity,
        baseCraftGold: config.baseCraftGold,
        materials: [
            { name: materials.common, quantity: config.common },
            { name: materials.uncommon, quantity: config.uncommon },
            { name: materials[config.specialKind], quantity: config.special },
        ],
    };
}

const RECIPES: CraftRecipe[] = [
    ...SOURCES.map((source) =>
        makeRecipe("상급 아비도스", source, {
            outputItem: "상급 아비도스 융화 재료",
            outputCount: 10,
            activity: 360,
            baseCraftGold: 520,
            common: 112,
            uncommon: 59,
            special: 43,
            specialKind: "abydos",
        })
    ),
    ...SOURCES.map((source) =>
        makeRecipe("아비도스", source, {
            outputItem: "아비도스 융화 재료",
            outputCount: 10,
            activity: 288,
            baseCraftGold: 400,
            common: 86,
            uncommon: 45,
            special: 33,
            specialKind: "abydos",
        })
    ),
    ...SOURCES.map((source) =>
        makeRecipe("최상급 오레하", source, {
            outputItem: "최상급 오레하 융화 재료",
            outputCount: 15,
            activity: 360,
            baseCraftGold: 300,
            common: 142,
            uncommon: 69,
            special: 52,
            specialKind: "oreha",
        })
    ),
];

const GROUPS = ["전체", "상급 아비도스", "아비도스", "최상급 오레하"] as const;

const DEFAULT_SETTINGS: Settings = {
    saleFeeRate: "5",
    craftDiscountRate: "0",
    greatSuccessRate: "0",
};

const parseGold = (value: string) => Number(value.replace(/[^\d.]/g, "")) || 0;
const formatGold = (value: number, digits = 0) =>
    Math.max(0, value).toLocaleString(undefined, {
        maximumFractionDigits: digits,
        minimumFractionDigits: 0,
    });
const formatUnitGold = (value: number) => formatGold(value, value % 1 === 0 ? 0 : 2);
const formatSignedGold = (value: number) => `${value >= 0 ? "+" : "-"}${formatGold(Math.abs(value))} G`;
const formatRate = (value: number) => `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;

function normalizePriceMap(value: unknown): PriceMap {
    const source = value as Record<string, string | number> | null;
    return Object.fromEntries(
        Array.from(new Set(RECIPES.flatMap((recipe) => [recipe.outputItem, ...recipe.materials.map((material) => material.name)]))).map((itemName) => {
            const raw = source?.[itemName];
            const price = typeof raw === "number" ? raw : parseGold(String(raw ?? ""));
            return [itemName, price > 0 ? String(Number(price.toFixed(2))) : ""];
        })
    );
}

function normalizeSettings(value: unknown): Settings {
    const source = value as Partial<Settings> | null;
    return {
        saleFeeRate: String(source?.saleFeeRate ?? DEFAULT_SETTINGS.saleFeeRate),
        craftDiscountRate: String(source?.craftDiscountRate ?? DEFAULT_SETTINGS.craftDiscountRate),
        greatSuccessRate: String(source?.greatSuccessRate ?? DEFAULT_SETTINGS.greatSuccessRate),
    };
}

export default function CraftCalculatorPage() {
    const [prices, setPrices] = useState<PriceMap>(() => normalizePriceMap(null));
    const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
    const [selectedGroup, setSelectedGroup] = useState<(typeof GROUPS)[number]>("전체");
    const [loaded, setLoaded] = useState(false);
    const [isFetchingPrices, setIsFetchingPrices] = useState(false);
    const [priceStatus, setPriceStatus] = useState<string | null>(null);
    const [, setUpdatedAt] = useState<string | null>(null);
    const [expandedRecipeId, setExpandedRecipeId] = useState<string | null>(null);

    useEffect(() => {
        try {
            const savedPrices = localStorage.getItem(PRICE_STORAGE_KEY);
            const savedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);

            if (savedPrices) setPrices(normalizePriceMap(JSON.parse(savedPrices)));
            if (savedSettings) setSettings(normalizeSettings(JSON.parse(savedSettings)));
        } catch { }

        setLoaded(true);
    }, []);

    useEffect(() => {
        if (!loaded) return;

        try {
            localStorage.setItem(PRICE_STORAGE_KEY, JSON.stringify(prices));
            localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
        } catch { }
    }, [prices, settings, loaded]);

    const fetchCraftPrices = async () => {
        setIsFetchingPrices(true);
        setPriceStatus(null);

        try {
            const response = await fetch("/api/lostark/craft-prices", { cache: "no-store" });

            if (!response.ok) {
                throw new Error("시세를 불러오지 못했습니다.");
            }

            const data = await response.json();
            const nextPrices = normalizePriceMap(data?.prices);

            setPrices((prev) => ({ ...prev, ...nextPrices }));
            setUpdatedAt(data?.updatedAt ?? new Date().toISOString());
            setPriceStatus("융화 재료와 생활 재료 시세를 불러왔습니다.");
        } catch (error) {
            console.error(error);
            setPriceStatus("시세를 불러오지 못했습니다. 판매가와 재료 시세를 직접 수정할 수 있습니다.");
        } finally {
            setIsFetchingPrices(false);
        }
    };

    useEffect(() => {
        if (!loaded) return;
        fetchCraftPrices();
    }, [loaded]);

    const rows = useMemo(() => {
        const saleFeeRate = Math.min(100, Math.max(0, parseGold(settings.saleFeeRate)));
        const craftDiscountRate = Math.min(100, Math.max(0, parseGold(settings.craftDiscountRate)));
        const greatSuccessRate = Math.min(100, Math.max(0, parseGold(settings.greatSuccessRate)));

        return RECIPES.map((recipe) => {
            const unitPrice = parseGold(prices[recipe.outputItem] ?? "");
            const hasOutputPrice = unitPrice > 0;
            const hasMaterialPrices = recipe.materials.every((material) => parseGold(prices[material.name] ?? "") > 0);
            const canCalculate = hasOutputPrice && hasMaterialPrices;
            const materialCost = recipe.materials.reduce(
                (sum, material) => sum + parseGold(prices[material.name] ?? "") * material.quantity,
                0
            );
            const craftGold = recipe.baseCraftGold * (1 - craftDiscountRate / 100);
            const craftCost = materialCost + craftGold;
            const expectedOutputCount = recipe.outputCount * (1 + greatSuccessRate / 100);
            const grossValue = unitPrice * expectedOutputCount;
            const saleValue = grossValue * (1 - saleFeeRate / 100);
            const directProfit = grossValue - craftCost;
            const saleProfit = saleValue - craftCost;
            const costRate = craftCost > 0 ? (saleProfit / craftCost) * 100 : 0;
            const activityProfit = recipe.activity > 0 ? saleProfit / recipe.activity : 0;
            const bestMode = directProfit >= saleProfit ? "direct" : "sale";
            const bestProfit = Math.max(directProfit, saleProfit);
            const recommendation =
                !canCalculate
                    ? {
                        label: "시세 확인 필요",
                        detail: "재료 시세 부족",
                        tone: "bg-amber-500/10 text-amber-300",
                    }
                    : bestProfit < 0
                    ? {
                        label: "제작 비추천",
                        detail: `${formatSignedGold(bestProfit)} 손해`,
                        tone: "bg-red-500/10 text-red-300",
                    }
                    : bestMode === "direct"
                        ? {
                            label: "직접사용 추천",
                            detail: `판매보다 ${formatSignedGold(directProfit - saleProfit)}`,
                            tone: "bg-emerald-500/10 text-emerald-300",
                        }
                        : {
                            label: "판매 추천",
                            detail: `직접사용보다 ${formatSignedGold(saleProfit - directProfit)}`,
                            tone: "bg-indigo-500/10 text-indigo-200",
                        };

            return {
                recipe,
                canCalculate,
                unitPrice,
                materialCost,
                craftGold,
                craftCost,
                expectedOutputCount,
                directProfit,
                saleProfit,
                costRate,
                activityProfit,
                recommendation,
            };
        })
            .filter((row) => selectedGroup === "전체" || row.recipe.group === selectedGroup)
            .sort((a, b) => b.saleProfit - a.saleProfit);
    }, [prices, selectedGroup, settings]);

    const bestSaleRow = rows.find((row) => row.canCalculate && row.saleProfit >= 0) ?? rows.find((row) => row.canCalculate) ?? rows[0];
    const profitableCount = rows.filter((row) => row.canCalculate && row.saleProfit >= 0).length;
    const directRecommendCount = rows.filter((row) => row.recommendation.label === "직접사용 추천").length;
    const saleRecommendCount = rows.filter((row) => row.recommendation.label === "판매 추천").length;
    const toggleRecipeMaterials = (recipeId: string) => {
        setExpandedRecipeId((prev) => (prev === recipeId ? null : recipeId));
    };
    const reset = () => {
        setPrices(normalizePriceMap(null));
        setSettings(DEFAULT_SETTINGS);
        setSelectedGroup("전체");
        setPriceStatus(null);
        setUpdatedAt(null);
        setExpandedRecipeId(null);
    };

    return (
        <div className="-mx-4 space-y-6 animate-in fade-in duration-300 sm:mx-0">
            <div className="mx-auto max-w-[1400px] space-y-6">
                <header className="px-4 pb-5 sm:px-0">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 text-xs font-medium text-[#5B69FF]">
                            <Hammer className="h-4 w-4" />
                            <span>영지 제작 계산 도구</span>
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                            오레하 제작 수익 계산기
                        </h1>
                        <p className="max-w-3xl break-keep text-sm leading-relaxed text-gray-400">
                            원정대 영지에서 제작하는 오레하와 아비도스 융화 재료의 시세, 제작비, 판매 수수료를 기준으로
                            직접 사용할 때와 판매할 때의 손익을 비교합니다.
                        </p>
                    </div>
                </header>

                <div className="grid grid-cols-1 items-start gap-4 sm:gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
                    <aside className="space-y-4">
                        <section className="overflow-hidden rounded-none border-y border-white/5 bg-[#16181D] sm:rounded-xl sm:border">
                            <div className="border-b border-white/5 px-5 py-4">
                                <h2 className="flex items-center gap-2 font-semibold text-white">
                                    <span className="h-4 w-1 rounded-full bg-indigo-500" />
                                    계산 설정
                                </h2>
                            </div>
                            <div className="space-y-5 p-5">
                                <NumberInput
                                    label="판매 수수료"
                                    value={settings.saleFeeRate}
                                    suffix="%"
                                    onChange={(value) => setSettings((prev) => ({ ...prev, saleFeeRate: value }))}
                                />
                                <NumberInput
                                    label="제작 수수료 감소"
                                    value={settings.craftDiscountRate}
                                    suffix="%"
                                    onChange={(value) => setSettings((prev) => ({ ...prev, craftDiscountRate: value }))}
                                />
                                <NumberInput
                                    label="대성공 기대값"
                                    value={settings.greatSuccessRate}
                                    suffix="%"
                                    onChange={(value) => setSettings((prev) => ({ ...prev, greatSuccessRate: value }))}
                                />

                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={fetchCraftPrices}
                                        disabled={isFetchingPrices}
                                        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 text-sm font-bold text-gray-200 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {isFetchingPrices ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                                        시세
                                    </button>
                                    <button
                                        type="button"
                                        onClick={reset}
                                        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-white/10 bg-[#0F1014] px-3 text-sm font-bold text-gray-300 hover:bg-white/5"
                                    >
                                        <RotateCcw className="h-4 w-4" />
                                        초기화
                                    </button>
                                </div>
                            </div>
                        </section>

                        <section className="rounded-none border-y border-white/5 bg-[#16181D] p-5 sm:rounded-xl sm:border">
                            <h2 className="mb-3 text-sm font-bold text-gray-200">레시피</h2>
                            <div className="grid grid-cols-2 gap-2">
                                {GROUPS.map((group) => (
                                    <button
                                        key={group}
                                        type="button"
                                        onClick={() => setSelectedGroup(group)}
                                        className={`h-10 rounded-lg border text-xs font-bold transition-colors ${selectedGroup === group
                                            ? "border-indigo-500/40 bg-indigo-500/15 text-white"
                                            : "border-white/10 bg-[#0F1014] text-gray-400 hover:bg-white/5"
                                            }`}
                                    >
                                        {group}
                                    </button>
                                ))}
                            </div>
                        </section>

                        <section className="rounded-none border-y border-white/5 bg-[#16181D] p-5 sm:rounded-xl sm:border">
                            <h2 className="mb-3 text-sm font-bold text-gray-200">계산 방식</h2>
                            <ol className="space-y-2 break-keep text-[13px] leading-relaxed text-gray-400">
                                <li>1. 융화 재료와 생활 재료 시세를 자동으로 불러옵니다.</li>
                                <li>2. 제작비용은 재료비와 제작 수수료를 합산해 계산합니다.</li>
                                <li>3. 제작 수수료 감소는 기본 제작 골드에만 적용됩니다.</li>
                                <li>4. 판매 수익은 거래소 수수료를 제외한 값으로 계산합니다.</li>
                            </ol>
                        </section>
                    </aside>

                    <main className="min-w-0 space-y-5">
                        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                            <SummaryCard
                                label="직접사용 추천"
                                value={`${directRecommendCount}개`}
                                subText={`${rows.length}개 중`}
                                tone="text-white"
                            />
                            <SummaryCard
                                label="판매 추천"
                                value={`${saleRecommendCount}개`}
                                subText={`${profitableCount}개 판매 이득`}
                                tone="text-indigo-200"
                            />
                            <SummaryCard
                                label="최고 판매 차익"
                                value={bestSaleRow ? formatSignedGold(bestSaleRow.saleProfit) : "0 G"}
                                subText={bestSaleRow?.recipe.name ?? "레시피 없음"}
                                tone={bestSaleRow?.saleProfit >= 0 ? "text-emerald-300" : "text-red-300"}
                            />
                        </section>

                        {priceStatus && (
                            <div className="flex items-start gap-2 rounded-lg border border-white/10 bg-[#16181D] px-4 py-3 text-sm font-bold text-gray-300">
                                {priceStatus.includes("불러왔") ? (
                                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-indigo-300" />
                                ) : (
                                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                                )}
                                <span className="break-keep">{priceStatus}</span>
                            </div>
                        )}

                        <section className="overflow-hidden rounded-none border-y border-white/5 bg-[#16181D] sm:rounded-sm sm:border">
                            <div className="border-b border-white/5 px-5 py-4">
                                <h2 className="text-sm font-bold text-white sm:text-base">제작 수익 비교</h2>
                                <p className="mt-1 break-keep text-xs text-gray-500">
                                    제작비용은 생활 재료 시세와 기본 제작 수수료를 기준으로 자동 계산됩니다.
                                </p>
                            </div>
                            <div className="hidden overflow-hidden md:block">
                                <table className="w-full table-fixed text-center text-[13px] xl:text-sm">
                                    <colgroup>
                                        <col style={{ width: "27%" }} />
                                        <col style={{ width: "12%" }} />
                                        <col style={{ width: "12%" }} />
                                        <col style={{ width: "10%" }} />
                                        <col style={{ width: "10%" }} />
                                        <col style={{ width: "8%" }} />
                                        <col style={{ width: "8%" }} />
                                        <col style={{ width: "13%" }} />
                                    </colgroup>
                                    <thead className="whitespace-nowrap bg-[#0F1014] text-center text-[11px] uppercase tracking-wider text-gray-500">
                                        <tr>
                                            <th className="px-3 py-3 text-left">레시피</th>
                                            <th className="px-3 py-3">판매가</th>
                                            <th className="px-3 py-3">제작비용</th>
                                            <th className="px-3 py-3">사용</th>
                                            <th className="px-3 py-3">판매</th>
                                            <th className="px-3 py-3">수익률</th>
                                            <th className="px-3 py-3">활동력</th>
                                            <th className="px-3 py-3">판단</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {rows.map((row) => {
                                            const isExpanded = expandedRecipeId === row.recipe.id;

                                            return (
                                                <Fragment key={row.recipe.id}>
                                                    <tr
                                                        onClick={() => toggleRecipeMaterials(row.recipe.id)}
                                                        className={`cursor-pointer text-gray-300 transition-colors ${isExpanded ? "bg-[#5B69FF]/5" : "hover:bg-white/[0.03]"}`}
                                                    >
                                                        <td className="px-3 py-4 text-left">
                                                            <div className="min-w-0">
                                                                <div className="truncate font-bold text-white">{row.recipe.name}</div>
                                                                <div className="mt-1 truncate text-xs text-gray-500">
                                                                    {row.recipe.outputItem} /{" "}
                                                                    {row.expectedOutputCount.toFixed(row.expectedOutputCount % 1 ? 1 : 0)}개 / 활동력{" "}
                                                                    {row.recipe.activity}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-3 py-4" onClick={(event) => event.stopPropagation()}>
                                                            <InlineGoldInput
                                                                value={prices[row.recipe.outputItem] ?? ""}
                                                                onChange={(value) =>
                                                                    setPrices((prev) => ({ ...prev, [row.recipe.outputItem]: value }))
                                                                }
                                                            />
                                                        </td>
                                                        <td className="px-3 py-4">
                                                            <div
                                                                className="truncate font-bold text-gray-100"
                                                                title={`재료 ${formatGold(row.materialCost)} G + 수수료 ${formatGold(row.craftGold)} G`}
                                                            >
                                                                {row.canCalculate ? `${formatGold(row.craftCost)} G` : "-"}
                                                            </div>
                                                        </td>
                                                        <td className={`truncate px-3 py-4 font-bold ${!row.canCalculate ? "text-gray-500" : row.directProfit >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                                                            {row.canCalculate ? formatSignedGold(row.directProfit) : "-"}
                                                        </td>
                                                        <td className={`truncate px-3 py-4 font-bold ${!row.canCalculate ? "text-gray-500" : row.saleProfit >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                                                            {row.canCalculate ? formatSignedGold(row.saleProfit) : "-"}
                                                        </td>
                                                        <td className={`truncate px-3 py-4 font-bold ${!row.canCalculate ? "text-gray-500" : row.costRate >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                                                            {row.canCalculate ? formatRate(row.costRate) : "-"}
                                                        </td>
                                                        <td className={`truncate px-3 py-4 font-bold ${!row.canCalculate ? "text-gray-500" : row.activityProfit >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                                                            {row.canCalculate ? formatSignedGold(row.activityProfit) : "-"}
                                                        </td>
                                                        <td className="px-3 py-4">
                                                            <div className="flex flex-col items-center gap-1">
                                                                <span className={`max-w-full truncate rounded-full px-2.5 py-1.5 text-[11px] font-bold xl:text-xs ${row.recommendation.tone}`}>
                                                                    {row.recommendation.label}
                                                                </span>
                                                                <span className="max-w-full truncate text-[11px] font-medium text-gray-500">
                                                                    {row.recommendation.detail}
                                                                </span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                    {isExpanded && (
                                                        <tr key={`${row.recipe.id}-materials`} className="bg-[#0F1014]/70">
                                                            <td colSpan={8} className="px-5 py-4">
                                                                <RecipeMaterialEditor
                                                                    row={row}
                                                                    prices={prices}
                                                                    setPrices={setPrices}
                                                                    formatGold={formatGold}
                                                                />
                                                            </td>
                                                        </tr>
                                                    )}
                                                </Fragment>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            <div className="divide-y divide-white/5 md:hidden">
                                {rows.map((row) => {
                                    const isExpanded = expandedRecipeId === row.recipe.id;

                                    return (
                                        <article
                                            key={`${row.recipe.id}-mobile`}
                                            className={`space-y-4 px-5 py-4 transition-colors ${isExpanded ? "bg-[#5B69FF]/5" : ""}`}
                                        >
                                            <div
                                                role="button"
                                                tabIndex={0}
                                                onClick={() => toggleRecipeMaterials(row.recipe.id)}
                                                onKeyDown={(event) => {
                                                    if (event.key === "Enter" || event.key === " ") toggleRecipeMaterials(row.recipe.id);
                                                }}
                                                className="flex cursor-pointer items-start justify-between gap-3 text-left"
                                            >
                                                <div className="min-w-0">
                                                    <h3 className="break-keep text-sm font-bold text-white">{row.recipe.name}</h3>
                                                    <p className="mt-1 break-keep text-xs text-gray-500">
                                                        {row.recipe.outputItem} /{" "}
                                                        {row.expectedOutputCount.toFixed(row.expectedOutputCount % 1 ? 1 : 0)}개 / 활동력{" "}
                                                        {row.recipe.activity}
                                                    </p>
                                                </div>
                                                <div className="flex shrink-0 flex-col items-end gap-1">
                                                    <span className={`whitespace-nowrap rounded-full px-2.5 py-1.5 text-[11px] font-bold ${row.recommendation.tone}`}>
                                                        {row.recommendation.label}
                                                    </span>
                                                    <span className="whitespace-nowrap text-[11px] font-medium text-gray-500">
                                                        {row.recommendation.detail}
                                                    </span>
                                                </div>
                                            </div>

                                            {isExpanded && (
                                                <RecipeMaterialEditor
                                                    row={row}
                                                    prices={prices}
                                                    setPrices={setPrices}
                                                    formatGold={formatGold}
                                                />
                                            )}

                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-2">
                                                    <span className="text-[11px] font-bold text-gray-500">판매가</span>
                                                    <InlineGoldInput
                                                        value={prices[row.recipe.outputItem] ?? ""}
                                                        onChange={(value) =>
                                                            setPrices((prev) => ({ ...prev, [row.recipe.outputItem]: value }))
                                                        }
                                                        fullWidth
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <span className="text-[11px] font-bold text-gray-500">제작비용</span>
                                                    <div
                                                        className="flex h-10 items-center rounded-lg border border-white/10 bg-[#0F1014] px-3 text-sm font-bold text-gray-100"
                                                        title={`재료 ${formatGold(row.materialCost)} G + 수수료 ${formatGold(row.craftGold)} G`}
                                                    >
                                                        {row.canCalculate ? `${formatGold(row.craftCost)} G` : "-"}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2 rounded-lg border border-white/5 bg-[#0F1014] p-3">
                                                <CraftResultValue
                                                    label="직접사용"
                                                    value={row.canCalculate ? formatSignedGold(row.directProfit) : "-"}
                                                    tone={!row.canCalculate ? "text-gray-500" : row.directProfit >= 0 ? "text-emerald-300" : "text-red-300"}
                                                />
                                                <CraftResultValue
                                                    label="판매차익"
                                                    value={row.canCalculate ? formatSignedGold(row.saleProfit) : "-"}
                                                    tone={!row.canCalculate ? "text-gray-500" : row.saleProfit >= 0 ? "text-emerald-300" : "text-red-300"}
                                                />
                                                <CraftResultValue
                                                    label="수익률"
                                                    value={row.canCalculate ? formatRate(row.costRate) : "-"}
                                                    tone={!row.canCalculate ? "text-gray-500" : row.costRate >= 0 ? "text-emerald-300" : "text-red-300"}
                                                />
                                                <CraftResultValue
                                                    label="활동력당"
                                                    value={row.canCalculate ? formatSignedGold(row.activityProfit) : "-"}
                                                    tone={!row.canCalculate ? "text-gray-500" : row.activityProfit >= 0 ? "text-emerald-300" : "text-red-300"}
                                                />
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        </section>

                        <section className="space-y-5 rounded-none border-y border-white/5 bg-[#16181D] p-5 sm:rounded-xl sm:border">
                            <div className="space-y-2">
                                <h2 className="text-xl font-bold text-gray-100">영지 제작 수익 계산기란?</h2>
                                <p className="break-keep text-sm leading-relaxed text-gray-400">
                                    오레하와 아비도스 융화 재료를 영지에서 제작할 때, 경매장에 판매하는 편이 좋은지
                                    직접 사용하는 편이 좋은지 빠르게 비교하는 계산기입니다. 생활 재료 시세나 영지 연구 효과에 따라
                                    제작비용이 달라질 수 있으므로, 실제 제작 전에는 재료 시세와 제작 수수료 감소 값을 확인해 주세요.
                                </p>
                            </div>

                            <div className="grid gap-4 md:grid-cols-3">
                                <InfoBlock
                                    title="판매차익"
                                    body="현재 판매가와 예상 제작 수량에서 거래소 수수료를 제외한 뒤 재료비와 제작 수수료를 뺀 값입니다."
                                />
                                <InfoBlock
                                    title="직접사용"
                                    body="판매 수수료를 빼지 않고 현재 시세만큼의 가치를 직접 사용한다고 보고 계산한 값입니다."
                                />
                                <InfoBlock
                                    title="대성공 기대값"
                                    body="대성공이 발생하면 결과물이 한 번 더 나온다고 가정한 단순 기대값입니다. 실제 게임 조건과 다르면 0으로 두고 계산해도 됩니다."
                                />
                            </div>
                        </section>
                    </main>
                </div>
            </div>
        </div>
    );
}

function NumberInput({
    label,
    value,
    suffix,
    onChange,
}: {
    label: string;
    value: string;
    suffix: string;
    onChange: (value: string) => void;
}) {
    return (
        <label className="block space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">{label}</span>
            <span className="flex h-10 items-center rounded-lg border border-white/10 bg-[#0F1014] px-3 focus-within:border-indigo-500/50">
                <input
                    value={value}
                    onChange={(event) => onChange(event.target.value.replace(/[^\d.]/g, ""))}
                    inputMode="decimal"
                    className="min-w-0 flex-1 bg-transparent text-sm font-bold text-white outline-none"
                    placeholder="0"
                />
                <span className="text-xs font-bold text-gray-500">{suffix}</span>
            </span>
        </label>
    );
}

function InlineGoldInput({
    value,
    onChange,
    fullWidth = false,
}: {
    value: string;
    onChange: (value: string) => void;
    fullWidth?: boolean;
}) {
    return (
        <label className={`${fullWidth ? "w-full" : "mx-auto max-w-[118px]"} flex h-10 items-center rounded-lg border border-white/10 bg-[#0F1014] px-3 focus-within:border-indigo-500/50`}>
            <input
                value={value}
                onChange={(event) => onChange(event.target.value.replace(/[^\d.]/g, ""))}
                inputMode="decimal"
                className="min-w-0 flex-1 bg-transparent text-right text-sm font-bold text-white outline-none"
                placeholder="0"
            />
            <span className="ml-2 text-xs font-bold text-gray-500">G</span>
        </label>
    );
}

function RecipeMaterialEditor({
    row,
    prices,
    setPrices,
    formatGold,
}: {
    row: {
        recipe: CraftRecipe;
        materialCost: number;
        craftGold: number;
        craftCost: number;
    };
    prices: PriceMap;
    setPrices: Dispatch<SetStateAction<PriceMap>>;
    formatGold: (value: number, digits?: number) => string;
}) {
    return (
        <div className="rounded-lg border border-white/5 bg-[#0F1014] p-4">
            <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <div className="text-xs font-bold text-gray-300">재료 시세</div>
                    <p className="mt-1 break-keep text-[11px] text-gray-500">
                        생활 재료 개당 단가입니다. API 시세가 다르면 직접 수정할 수 있습니다.
                    </p>
                </div>
                <div className="text-[11px] font-bold text-gray-500">
                    재료 {formatGold(row.materialCost)} G + 수수료 {formatGold(row.craftGold)} G
                </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
                {row.recipe.materials.map((material) => {
                    const unitPrice = parseGold(prices[material.name] ?? "");
                    const subtotal = unitPrice * material.quantity;

                    return (
                        <label key={material.name} className="space-y-2">
                            <span className="flex items-center justify-between gap-2 text-[11px] font-bold text-gray-500">
                                <span className="truncate">{material.name}</span>
                                <span className="shrink-0">x{material.quantity}</span>
                            </span>
                            <InlineGoldInput
                                value={prices[material.name] ?? ""}
                                onChange={(value) => setPrices((prev) => ({ ...prev, [material.name]: value }))}
                                fullWidth
                            />
                            <span className="block truncate text-[11px] text-gray-500">
                                개당 {unitPrice > 0 ? formatUnitGold(unitPrice) : "0"} G · 소계 {formatGold(subtotal, 1)} G
                            </span>
                        </label>
                    );
                })}
            </div>
        </div>
    );
}

function CraftResultValue({ label, value, tone }: { label: string; value: string; tone: string }) {
    return (
        <div className="min-w-0">
            <div className="text-[11px] font-bold text-gray-500">{label}</div>
            <div className={`mt-1 truncate text-sm font-bold ${tone}`}>{value}</div>
        </div>
    );
}

function SummaryCard({
    label,
    value,
    subText,
    tone,
}: {
    label: string;
    value: string;
    subText?: string;
    tone: string;
}) {
    return (
        <div className="rounded-none border-y border-white/5 bg-[#16181D] p-5 sm:rounded-sm sm:border">
            <div className="mb-3 text-sm font-bold text-gray-300">{label}</div>
            <div className={`text-2xl font-bold ${tone}`}>{value}</div>
            {subText && <div className="mt-2 truncate text-xs font-medium text-gray-500">{subText}</div>}
        </div>
    );
}

function InfoBlock({ title, body }: { title: string; body: string }) {
    return (
        <div className="rounded-lg border border-white/5 bg-[#0F1014] p-4">
            <h3 className="mb-2 text-sm font-bold text-gray-100">{title}</h3>
            <p className="break-keep text-sm leading-relaxed text-gray-400">{body}</p>
        </div>
    );
}
