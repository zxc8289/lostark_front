"use client";

import React, { useMemo, useState, useEffect } from "react";
import {
    Info,
    PackageOpen,
    Check,
    TrendingUp,
    TrendingDown,
    RefreshCw,
    ArrowRightLeft,
} from "lucide-react";
import Image from "next/image";
import { DifficultyKey, raidInformation, RaidKind } from "@/server/data/raids";

const REWARD_ICONS: Record<string, string> = {
    "정제된 파괴강석": "/icons/materials/refined-destruction-stone.png",
    "정제된 수호강석": "/icons/materials/refined-guardian-stone.png",
    "찬명돌": "/icons/materials/radiant-honor-leapstone.png",
    "찬란한 명예의 돌파석": "/icons/materials/radiant-honor-leapstone.png",
    "운명의 파괴석": "/icons/materials/destiny-destruction-stone.png",
    "운명의 수호석": "/icons/materials/destiny-guardian-stone.png",
    "운명의 돌파석": "/icons/materials/destiny-leapstone.png",
    "운명의 파괴석 결정": "/icons/materials/destiny-destruction-crystal.png",
    "운명의 수호석 결정": "/icons/materials/destiny-guardian-crystal.png",
    "위대한 운명의 돌파석": "/icons/materials/great-destiny-leapstone.png",
    "최상급 오레하 융화 재료": "/icons/materials/prime-oreha-fusion-material.png",
    "아비도스 융화 재료": "/icons/materials/abydos-fusion-material.png",
    "상급 아비도스 융화 재료": "/icons/materials/advanced-abydos-fusion-material.png",
    "베히모스의 비늘": "/icons/materials/scale-of-behemoth.png",
    "아그리스의 비늘": "/icons/materials/scale-of-agris.png",
    "알키오네의 눈": "/icons/materials/eye-of-alcyone.png",
    "업화의 쐐기돌": "/icons/materials/hellfire-keystone.png",
    "카르마의 잔영": "/icons/materials/vestige-of-karma.png",
    "낙뢰의 뿔": "/icons/materials/horn-of-thunderbolt.png",
    "우레의 뇌옥": "/icons/materials/prison-of-thunder.png",
    "고통의 가시": "/icons/materials/thorn-of-agony.png",
    "은총의 파편": "/icons/materials/fragment-of-grace.png",
    "코어(영웅~고대)": "/icons/materials/core-to-ancient.png",
    "코어(전설~고대)": "/icons/materials/core-to-ancient.png",
    "명예의 파편": "/icons/materials/shard-of-honor.png",
    "운명의 파편": "/icons/materials/shard-of-destiny.png",
    "클리어 메달": "/icons/materials/clear-medal.png",
};

const DIFF_STYLE: Record<
    string,
    { badge: string; check: string; hover: string }
> = {
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

const CATEGORIES = Array.from(
    new Set(Object.values(raidInformation).map((r) => r.kind))
);

type ConvTier = "NONE" | "T4_LOWER" | "T4_UPPER";

const CONV_TIERS: { value: ConvTier; label: string; icons: string[] }[] = [
    {
        value: "T4_LOWER",
        label: "T4 일반",
        icons: ["운명의 파괴석", "운명의 수호석", "운명의 돌파석"],
    },
    {
        value: "T4_UPPER",
        label: "T4 상급",
        icons: ["운명의 파괴석 결정", "운명의 수호석 결정", "위대한 운명의 돌파석"],
    },
];

const CONVERSION_RATES: Record<
    string,
    Partial<Record<ConvTier, { target: string; div: number }>>
> = {
    "찬란한 명예의 돌파석": {
        T4_LOWER: { target: "운명의 돌파석", div: 5 },
        T4_UPPER: { target: "위대한 운명의 돌파석", div: 25 },
    },
    찬명돌: {
        T4_LOWER: { target: "운명의 돌파석", div: 5 },
        T4_UPPER: { target: "위대한 운명의 돌파석", div: 25 },
    },
    "운명의 돌파석": {
        T4_UPPER: { target: "위대한 운명의 돌파석", div: 5 },
    },
    "정제된 파괴강석": {
        T4_LOWER: { target: "운명의 파괴석", div: 5 },
        T4_UPPER: { target: "운명의 파괴석 결정", div: 25 },
    },
    "운명의 파괴석": {
        T4_UPPER: { target: "운명의 파괴석 결정", div: 5 },
    },
    "정제된 수호강석": {
        T4_LOWER: { target: "운명의 수호석", div: 5 },
        T4_UPPER: { target: "운명의 수호석 결정", div: 25 },
    },
    "운명의 수호석": {
        T4_UPPER: { target: "운명의 수호석 결정", div: 5 },
    },
};

const parseRewards = (rewardStr: string) => {
    const items = rewardStr.split(",").map((s) => s.trim());

    return items
        .map((item) => {
            const match = item.match(/(.+?)\s*(\d+)개/);

            if (match) {
                return {
                    name: match[1].trim(),
                    count: parseInt(match[2], 10),
                };
            }

            return null;
        })
        .filter(Boolean) as { name: string; count: number }[];
};

export default function MoreRewardCalculatorPage() {
    const [category, setCategory] = useState<RaidKind>("카제로스");
    const [raid, setRaid] = useState<string>("1막-에기르");
    const [diff, setDiff] = useState<DifficultyKey>("노말");

    const [marketPrices, setMarketPrices] = useState<Record<string, number>>({});
    const [isFetchingPrices, setIsFetchingPrices] = useState<boolean>(false);

    const [excludedItems, setExcludedItems] = useState<Set<string>>(new Set());
    const [isMounted, setIsMounted] = useState(false);

    const [convTier, setConvTier] = useState<ConvTier>("NONE");

    const availableRaids = useMemo(
        () =>
            Object.keys(raidInformation).filter(
                (k) => raidInformation[k].kind === category
            ),
        [category]
    );

    const availableDiffs = useMemo(() => {
        const info = raidInformation[raid];
        return info ? (Object.keys(info.difficulty) as DifficultyKey[]) : [];
    }, [raid]);

    const gates = useMemo(
        () => raidInformation[raid]?.difficulty[diff]?.gates || [],
        [raid, diff]
    );

    const handleCategoryChange = (cat: RaidKind) => {
        setCategory(cat);

        const firstRaid = Object.keys(raidInformation).find(
            (k) => raidInformation[k].kind === cat
        );

        if (firstRaid) {
            handleRaidChange(firstRaid);
        }
    };

    const handleRaidChange = (r: string) => {
        setRaid(r);

        const diffs = Object.keys(
            raidInformation[r].difficulty
        ) as DifficultyKey[];

        if (!diffs.includes(diff) && diffs.length > 0) {
            setDiff(diffs[0]);
        }
    };

    const toggleExcludeItem = (gateKey: string, itemName: string) => {
        const excludeKey = `${gateKey}-${itemName}`;

        setExcludedItems((prev) => {
            const newSet = new Set(prev);

            if (newSet.has(excludeKey)) {
                newSet.delete(excludeKey);
            } else {
                newSet.add(excludeKey);
            }

            return newSet;
        });
    };

    const fmt = (v: number) => Math.floor(v).toLocaleString();

    const fetchMarketPrices = async () => {
        setIsFetchingPrices(true);

        try {
            const response = await fetch("/api/lostark/lostark-market");

            if (!response.ok) {
                throw new Error("시세 불러오기 실패");
            }

            const data = await response.json();
            setMarketPrices(data);
        } catch (error) {
            console.error(error);
            alert("최신 거래소 시세를 불러오지 못했습니다.");
        } finally {
            setIsFetchingPrices(false);
        }
    };

    useEffect(() => {
        fetchMarketPrices();
    }, []);

    const getDiffLabel = (r: string, d: DifficultyKey) => {
        if (r === "지평의 성당") {
            if (d === "노말") return "1단계";
            if (d === "하드") return "2단계";
            if (d === "나메") return "3단계";
        }

        return d;
    };

    useEffect(() => {
        setIsMounted(true);

        const savedItems = localStorage.getItem("loacheck_more_reward_excluded");

        if (savedItems) {
            try {
                const parsed = JSON.parse(savedItems);

                if (Array.isArray(parsed)) {
                    setExcludedItems(new Set(parsed));
                }
            } catch (error) {
                console.error("Failed to load excluded items:", error);
            }
        }
    }, []);

    useEffect(() => {
        if (isMounted) {
            localStorage.setItem(
                "loacheck_more_reward_excluded",
                JSON.stringify(Array.from(excludedItems))
            );
        }
    }, [excludedItems, isMounted]);

    // if (!isMounted) {
    //     return <div className="min-h-screen bg-[#111217]" />;
    // }

    return (
        <div className="-mx-4 sm:mx-0 space-y-6 animate-in fade-in duration-300">
            <div className="mx-auto max-w-[1400px] space-y-4">
                <div className="relative pb-7 px-4 sm:px-0">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 text-xs font-medium text-[#5B69FF]">
                            <PackageOpen className="h-4 w-4" strokeWidth={2.5} />
                            <span>보상 분석 도구</span>
                        </div>

                        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                            더보기 효율 계산기
                        </h1>

                        <p className="text-sm text-gray-400 max-w-2xl leading-relaxed break-keep">
                            현재 거래소 시세를 반영하여 더보기 보상 가치를 계산합니다.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 sm:gap-6 items-start">
                    <div className="space-y-4">
                        <section className="rounded-none sm:rounded-xl bg-[#16181D] border-y sm:border border-white/5 overflow-hidden shadow-sm">
                            <div className="px-5 py-4 border-b border-white/5">
                                <h2 className="font-semibold text-white flex items-center gap-2">
                                    <span className="w-1 h-4 bg-indigo-500 rounded-full" />
                                    레이드 설정
                                </h2>
                            </div>

                            <div className="p-5 space-y-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                        카테고리
                                    </label>

                                    <div className="flex flex-col border border-white/5 rounded-lg overflow-hidden">
                                        {CATEGORIES.map((cat) => (
                                            <button
                                                key={cat}
                                                onClick={() => handleCategoryChange(cat)}
                                                className={`flex w-full items-center gap-3 px-4 py-3 transition-colors border-b border-white/5 last:border-b-0 ${category === cat
                                                    ? "bg-[#5B69FF]/15 text-white"
                                                    : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                                                    }`}
                                            >
                                                <div
                                                    className={`flex items-center justify-center w-4 h-4 ${category === cat
                                                        ? "text-[#5B69FF]"
                                                        : "text-transparent"
                                                        }`}
                                                >
                                                    <Check className="h-4 w-4" strokeWidth={3} />
                                                </div>

                                                <span className="text-sm font-bold">{cat}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                        난이도
                                    </label>

                                    <div className="grid grid-cols-3 gap-2 p-1 bg-[#121318] rounded-lg border border-white/5">
                                        {availableDiffs.map((d) => (
                                            <button
                                                key={d}
                                                onClick={() => setDiff(d)}
                                                className={`py-2 rounded-md text-sm font-bold transition-all border ${diff === d
                                                    ? DIFF_STYLE[d]?.check
                                                    : `bg-[#1B222D] text-gray-400 border-transparent ${DIFF_STYLE[d]?.hover}`
                                                    }`}
                                            >
                                                {getDiffLabel(raid, d)}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                        레이드 선택
                                    </label>

                                    <div className="grid grid-cols-2 gap-2">
                                        {availableRaids.map((a) => (
                                            <button
                                                key={a}
                                                onClick={() => handleRaidChange(a)}
                                                className={`relative flex items-center justify-center py-2 px-3 text-sm font-bold rounded-lg border transition-all ${raid === a
                                                    ? "bg-[#5B69FF]/15 border-[#5B69FF]/30 text-white"
                                                    : "bg-transparent border-white/5 text-gray-500 hover:bg-white/5 hover:text-gray-300"
                                                    }`}
                                            >
                                                <span className="truncate">{a}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="rounded-none sm:rounded-xl bg-[#16181D] border-y sm:border border-white/5 p-5">
                            <h2 className="text-sm font-bold text-gray-200 mb-3">
                                빠른 사용법
                            </h2>

                            <ol className="space-y-2 text-[13px] leading-relaxed text-gray-400 break-keep">
                                <li>1. 카테고리, 레이드, 난이도를 선택합니다.</li>
                                <li>2. 관문별 더보기 비용과 보상 재료를 확인합니다.</li>
                                <li>3. 최신 시세 갱신 버튼으로 거래소 기준을 업데이트합니다.</li>
                                <li>4. 필요 없는 재료는 클릭해서 계산에서 제외합니다.</li>
                                <li>5. 순수익이 플러스인지 마이너스인지 확인하고 결정합니다.</li>
                            </ol>
                        </section>
                    </div>

                    <div className="space-y-4 sm:space-y-5">
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-between bg-[#16181D] rounded-none sm:rounded-xl border-y sm:border border-white/5 p-4 sm:px-5 shadow-sm">
                                <div className="space-y-1">
                                    <span className="font-semibold text-gray-200">
                                        현재 거래소 시세 연동 상태
                                    </span>
                                    <p className="text-xs text-gray-500 break-keep">
                                        재료 가격은 API로 불러온 거래소 기준값을 사용합니다.
                                        실제 판매 가능 가격과는 차이가 있을 수 있습니다.
                                    </p>
                                </div>

                                <button
                                    onClick={fetchMarketPrices}
                                    disabled={isFetchingPrices}
                                    className="flex shrink-0 items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-[#5B69FF] hover:bg-[#4a56d9] rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <RefreshCw
                                        className={`w-3.5 h-3.5 ${isFetchingPrices ? "animate-spin" : ""
                                            }`}
                                    />
                                    {isFetchingPrices ? "시세 갱신 중..." : "최신 시세 갱신"}
                                </button>
                            </div>

                            <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between bg-[#16181D] rounded-none sm:rounded-xl border-y sm:border border-white/5 p-4 sm:px-5 shadow-sm gap-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <ArrowRightLeft className="w-4 h-4 text-[#5B69FF]" />
                                        <span className="font-semibold text-gray-200">
                                            상위 재료 환산 가치 적용
                                        </span>
                                    </div>

                                    <p className="text-xs text-gray-400 break-keep">
                                        하위 재료를 상위 재료 가치로 비교하고 싶을 때 사용합니다.
                                        같은 버튼을 다시 누르면 환산이 해제됩니다.
                                    </p>
                                </div>

                                <div className="flex items-center p-1.5 gap-2 bg-[#121318] rounded-lg border border-white/5 w-full xl:w-auto overflow-x-auto overflow-y-hidden scrollbar-hide">
                                    {CONV_TIERS.map((ct, idx) => (
                                        <React.Fragment key={ct.value}>
                                            <button
                                                onClick={() =>
                                                    setConvTier((prev) =>
                                                        prev === ct.value ? "NONE" : ct.value
                                                    )
                                                }
                                                title={`${ct.label} (다시 클릭 시 변환 취소)`}
                                                className={`flex items-center justify-center min-h-[44px] flex-1 xl:flex-none px-4 py-2 rounded-md transition-all border ${convTier === ct.value
                                                    ? "bg-[#5B69FF]/10 border-[#5B69FF]/50 shadow-sm"
                                                    : "border-transparent hover:bg-white/5"
                                                    }`}
                                            >
                                                <div className="flex items-center gap-1.5 sm:gap-2">
                                                    {ct.icons.map((iconName, i) =>
                                                        REWARD_ICONS[iconName] ? (
                                                            <div
                                                                key={i}
                                                                className="relative w-6 h-6 sm:w-7 sm:h-7"
                                                            >
                                                                <Image
                                                                    src={REWARD_ICONS[iconName]}
                                                                    alt={iconName}
                                                                    fill
                                                                    sizes="(max-width: 768px) 24px, 28px"
                                                                    className={`object-contain transition-all duration-200 ${convTier === ct.value
                                                                        ? "drop-shadow-md"
                                                                        : "opacity-50 grayscale hover:grayscale-0 hover:opacity-80"
                                                                        }`}
                                                                />
                                                            </div>
                                                        ) : null
                                                    )}
                                                </div>
                                            </button>

                                            {idx === 0 && (
                                                <div className="w-px h-8 bg-white/10 mx-1 shrink-0" />
                                            )}
                                        </React.Fragment>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {gates.length > 0 ? (
                            <div className="grid gap-4 sm:grid-cols-1 xl:grid-cols-2">
                                {gates.map((g) => {
                                    const gateKey = `${raid}-${diff}-${g.index}`;
                                    const parsedItems = parseRewards(g.bonusRewards);

                                    let totalValue = 0;

                                    const calculatedItems = parsedItems.map((item) => {
                                        const originalName = item.name;
                                        const originalCount = item.count;

                                        let convName = item.name;
                                        let convCount = item.count;
                                        let isConverted = false;

                                        if (
                                            convTier !== "NONE" &&
                                            CONVERSION_RATES[originalName]?.[convTier]
                                        ) {
                                            const rule =
                                                CONVERSION_RATES[originalName][convTier]!;

                                            convName = rule.target;
                                            convCount = Number((item.count / rule.div).toFixed(2));
                                            isConverted = true;
                                        }

                                        const unitPrice = marketPrices[convName] || 0;
                                        const itemTotalValue = unitPrice * convCount;

                                        const isExcluded = excludedItems.has(
                                            `${gateKey}-${originalName}`
                                        );

                                        if (!isExcluded) {
                                            totalValue += itemTotalValue;
                                        }

                                        return {
                                            originalName,
                                            originalCount,
                                            convName,
                                            convCount,
                                            isConverted,
                                            unitPrice,
                                            itemTotalValue,
                                            isExcluded,
                                        };
                                    });

                                    const netProfit = totalValue - g.bonusCost;
                                    const isProfitable = netProfit >= 0;

                                    return (
                                        <div
                                            key={gateKey}
                                            className={`relative flex flex-col gap-4 rounded-none sm:rounded-xl border-y sm:border p-5 shadow-sm transition-all ${isProfitable
                                                ? "bg-[#16181D] border-white/5 hover:border-indigo-500/30"
                                                : "bg-[#16181D] border-white/5 hover:border-red-500/30"
                                                }`}
                                        >
                                            <div className="flex items-center justify-between border-b border-white/5 pb-3 gap-3">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <div
                                                        className={`px-2 py-1 rounded-md text-[11px] font-bold shrink-0 ${DIFF_STYLE[diff]?.badge}`}
                                                    >
                                                        {getDiffLabel(raid, diff)}
                                                    </div>
                                                    <span className="font-semibold text-gray-200 truncate">
                                                        {g.name}
                                                    </span>
                                                </div>

                                                <div className="text-sm font-bold text-gray-400 shrink-0">
                                                    더보기 비용:{" "}
                                                    <span className="text-white">
                                                        {fmt(g.bonusCost)} G
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <div className="flex justify-between items-end">
                                                    <label className="text-[11px] font-bold text-gray-500">
                                                        더보기 획득 재료
                                                        <span className="font-normal text-gray-600">
                                                            {" "}
                                                            (클릭 시 제외)
                                                        </span>
                                                    </label>
                                                </div>

                                                <div className="bg-[#0F1014] rounded-lg border border-white/5 p-3 space-y-2">
                                                    {calculatedItems.map((item, idx) => {
                                                        const iconPath =
                                                            REWARD_ICONS[item.convName] ||
                                                            REWARD_ICONS[item.originalName];

                                                        return (
                                                            <div
                                                                key={idx}
                                                                onClick={() =>
                                                                    toggleExcludeItem(
                                                                        gateKey,
                                                                        item.originalName
                                                                    )
                                                                }
                                                                className={`flex justify-between items-center text-[12px] p-1.5 -mx-1.5 rounded cursor-pointer transition-colors ${item.isExcluded
                                                                    ? "opacity-40 hover:bg-white/5"
                                                                    : "hover:bg-white/5"
                                                                    }`}
                                                                title="클릭하여 계산에서 제외/포함"
                                                            >
                                                                <span
                                                                    className={`flex items-center gap-1.5 min-w-0 ${item.isExcluded
                                                                        ? "text-gray-500 line-through"
                                                                        : "text-gray-300"
                                                                        }`}
                                                                >
                                                                    {iconPath ? (
                                                                        <Image
                                                                            src={iconPath}
                                                                            alt={item.convName}
                                                                            width={16}
                                                                            height={16}
                                                                            className={`w-4 h-4 object-contain shrink-0 ${item.isExcluded
                                                                                ? "grayscale"
                                                                                : ""
                                                                                }`}
                                                                        />
                                                                    ) : (
                                                                        <span className="w-4 h-4 bg-gray-800 rounded flex items-center justify-center text-[8px] text-gray-500 shrink-0">
                                                                            ?
                                                                        </span>
                                                                    )}

                                                                    <span className="truncate">
                                                                        {item.convName}{" "}
                                                                        <span
                                                                            className={
                                                                                item.isExcluded
                                                                                    ? "text-gray-600"
                                                                                    : "text-gray-500"
                                                                            }
                                                                        >
                                                                            x{item.convCount}
                                                                        </span>
                                                                        {item.isConverted && (
                                                                            <span className="ml-1 text-[10px] text-indigo-400">
                                                                                환산
                                                                            </span>
                                                                        )}
                                                                    </span>
                                                                </span>

                                                                <span
                                                                    className={
                                                                        item.isExcluded
                                                                            ? "text-gray-600 line-through shrink-0"
                                                                            : "text-gray-400 shrink-0"
                                                                    }
                                                                >
                                                                    {item.unitPrice > 0 ? (
                                                                        `${fmt(item.itemTotalValue)} G`
                                                                    ) : (
                                                                        <span className="text-gray-600 text-[10px] no-underline">
                                                                            거래불가
                                                                        </span>
                                                                    )}
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            <div
                                                className={`mt-auto pt-3 border-t flex items-center justify-between ${isProfitable
                                                    ? "border-indigo-500/20"
                                                    : "border-red-500/20"
                                                    }`}
                                            >
                                                <div className="flex flex-col">
                                                    <span className="text-[11px] text-gray-400 font-medium">
                                                        환산 가치 합계: {fmt(totalValue)} G
                                                    </span>

                                                    <span
                                                        className={`text-sm font-bold flex items-center gap-1 ${isProfitable
                                                            ? "text-indigo-400"
                                                            : "text-red-400"
                                                            }`}
                                                    >
                                                        {isProfitable
                                                            ? "누르는 게 이득"
                                                            : "안 누르는 게 이득"}
                                                        {isProfitable ? (
                                                            <TrendingUp className="w-4 h-4" />
                                                        ) : (
                                                            <TrendingDown className="w-4 h-4" />
                                                        )}
                                                    </span>
                                                </div>

                                                <div className="text-right">
                                                    <span className="text-[10px] text-gray-500">
                                                        순수익
                                                    </span>

                                                    <div
                                                        className={`text-xl font-black ${isProfitable
                                                            ? "text-white"
                                                            : "text-red-400"
                                                            }`}
                                                    >
                                                        {isProfitable ? "+" : ""}
                                                        {fmt(netProfit)} G
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

                        <div className="space-y-4 mt-4">
                            <section className="rounded-none sm:rounded-xl bg-gradient-to-b from-[#16181D] to-[#121318] border-y sm:border border-white/5 p-5">
                                <div className="flex items-center gap-2 mb-3">
                                    <Info className="w-4 h-4 text-indigo-400" />
                                    <h2 className="text-sm font-bold text-gray-200">
                                        더보기 효율 계산기란?
                                    </h2>
                                </div>

                                <div className="space-y-3 text-[13px] leading-relaxed text-gray-400 break-keep">
                                    <p>
                                        이 페이지는 로스트아크 레이드에서 더보기를 눌렀을 때
                                        얻는 재료의 골드 가치를 계산하고, 더보기 비용과 비교해
                                        이득인지 손해인지 판단할 수 있도록 만든 보상 분석 도구입니다.
                                    </p>

                                    <p>
                                        레이드와 난이도를 선택하면 관문별 더보기 보상에 포함된
                                        재료를 자동으로 불러오고, 거래소 시세를 기준으로 각 재료의
                                        환산 가치를 계산합니다. 결과 카드에서는{" "}
                                        <strong className="text-white">더보기 비용</strong>,{" "}
                                        <strong className="text-white">재료 가치 합계</strong>,{" "}
                                        <strong className="text-white">최종 순수익</strong>을
                                        한 번에 확인할 수 있습니다.
                                    </p>

                                    <p>
                                        즉, 게임 안에서 재료 수량과 시세를 일일이 계산하지 않아도
                                        현재 시세 기준으로 더보기를 누를지 말지 빠르게 판단하는 데
                                        사용할 수 있습니다.
                                    </p>
                                </div>
                            </section>

                            <section className="rounded-none sm:rounded-xl bg-[#16181D] border-y border-x-0 sm:border border-white/5 p-5">
                                <h2 className="text-sm font-bold text-gray-200 mb-3">
                                    현재 선택 기준 안내
                                </h2>

                                <div className="space-y-3 text-[13px] leading-relaxed text-gray-400 break-keep">
                                    <p>
                                        현재 선택한 레이드는{" "}
                                        <strong className="text-white">{raid}</strong>,
                                        난이도는{" "}
                                        <strong className="text-white">
                                            {getDiffLabel(raid, diff)}
                                        </strong>
                                        입니다. 이 기준에 맞는 관문별 더보기 보상을 바탕으로
                                        계산 결과가 표시됩니다.
                                    </p>

                                    <p>
                                        관문 수가 여러 개인 레이드는 관문마다 더보기 비용과 재료
                                        구성이 다를 수 있습니다. 그래서 레이드 전체를 한 번에 보는
                                        것보다, 각 관문 카드에서{" "}
                                        <strong className="text-gray-300">
                                            관문별 순수익을 따로 확인
                                        </strong>
                                        하는 것이 더 정확합니다.
                                    </p>

                                    <p>
                                        계산 결과가 플러스인 관문은 골드 기준으로 더보기를 누르는
                                        쪽이 유리하고, 마이너스인 관문은 골드 기준으로는 누르지 않는
                                        편이 유리하다고 볼 수 있습니다.
                                    </p>
                                </div>
                            </section>

                            <section className="rounded-none sm:rounded-xl bg-[#16181D] border-y border-x-0 sm:border border-white/5 p-5">
                                <h2 className="text-sm font-bold text-gray-200 mb-3">
                                    계산 기준
                                </h2>

                                <div className="space-y-3 text-[13px] leading-relaxed text-gray-400 break-keep">
                                    <p>
                                        더보기 효율은{" "}
                                        <strong className="text-gray-300">
                                            현재 거래소 시세가 있는 재료만 골드로 환산
                                        </strong>
                                        해서 계산합니다. 재료 가치 합계를 먼저 구하고, 그 값에서
                                        더보기 비용을 차감해 최종 순수익을 표시합니다.
                                    </p>

                                    <p>
                                        <strong className="text-white">순수익이 플러스</strong>
                                        라면 골드 기준으로는 더보기를 누르는 쪽이 유리하고,{" "}
                                        <strong className="text-white">순수익이 마이너스</strong>
                                        라면 골드 기준으로는 더보기를 누르지 않는 편이 유리합니다.
                                    </p>

                                    <div className="rounded-lg bg-[#0F1014] border border-white/5 p-4 space-y-2">
                                        <p className="text-gray-300 font-semibold">
                                            간단 계산 흐름
                                        </p>
                                        <p>1. 선택한 레이드와 난이도의 관문별 더보기 보상 확인</p>
                                        <p>2. 보상 재료의 최신 거래소 시세 반영</p>
                                        <p>3. 상위 재료 환산 옵션을 켠 경우 환산된 재료 기준으로 계산</p>
                                        <p>4. 제외한 재료를 빼고 재료 가치 합계 계산</p>
                                        <p>5. 재료 가치 합계에서 더보기 비용을 차감해 순수익 표시</p>
                                    </div>
                                </div>
                            </section>

                            <section className="rounded-none sm:rounded-xl bg-[#16181D] border-y border-x-0 sm:border border-white/5 p-5">
                                <h2 className="text-sm font-bold text-gray-200 mb-3">
                                    상위 재료 환산 옵션 사용법
                                </h2>

                                <div className="space-y-3 text-[13px] leading-relaxed text-gray-400 break-keep">
                                    <p>
                                        상위 재료 환산 옵션은 하위 재료를 그대로 계산하지 않고,
                                        실제 성장 구간에서 주로 비교하는 상위 재료 가치로 바꾸어
                                        효율을 확인하고 싶을 때 사용하는 기능입니다.
                                    </p>

                                    <p>
                                        예를 들어 하위 돌파석이나 강석류를 상위 재료 기준으로
                                        비교하고 싶다면 T4 일반 또는 T4 상급 옵션을 켜서 환산된
                                        시세 기준으로 계산할 수 있습니다. 같은 버튼을 다시 누르면
                                        환산이 해제되어 원래 재료 기준 계산으로 돌아갑니다.
                                    </p>

                                    <p>
                                        다만 환산 비율은 게임 내 교환 구조를 단순화한 기준이므로,
                                        실제 서버 시세나 캐릭터 성장 상황에 따라 체감 효율은
                                        달라질 수 있습니다.
                                    </p>
                                </div>
                            </section>

                            <section className="rounded-none sm:rounded-xl bg-[#16181D] border-y border-x-0 sm:border border-white/5 p-5">
                                <h2 className="text-sm font-bold text-gray-200 mb-3">
                                    재료 제외 기능 안내
                                </h2>

                                <div className="space-y-3 text-[13px] leading-relaxed text-gray-400 break-keep">
                                    <p>
                                        관문 카드의 재료 항목을 클릭하면 해당 재료를 계산에서
                                        제외하거나 다시 포함할 수 있습니다. 이 기능은 특정 재료를
                                        이미 충분히 가지고 있거나, 실제로는 골드 가치로 보지 않는
                                        경우에 유용합니다.
                                    </p>

                                    <p>
                                        예를 들어 현재 캐릭터에게 명예의 파편은 필요하지만 특정
                                        귀속 재료는 가치가 낮다고 판단된다면, 해당 재료를 제외하고
                                        나머지 보상만으로 더보기 효율을 다시 계산할 수 있습니다.
                                    </p>

                                    <p>
                                        제외한 재료 목록은 브라우저 로컬 저장소에 저장되므로,
                                        같은 기기와 브라우저에서는 다시 접속해도 제외 상태가
                                        유지됩니다.
                                    </p>
                                </div>
                            </section>

                            <section className="rounded-none sm:rounded-xl bg-[#16181D] border-y border-x-0 sm:border border-white/5 p-5">
                                <h2 className="text-sm font-bold text-gray-200 mb-3">
                                    예시로 보는 더보기 판단
                                </h2>

                                <div className="space-y-3 text-[13px] leading-relaxed text-gray-400 break-keep">
                                    <p>
                                        예를 들어 어떤 관문의 더보기 비용이 2,000골드이고,
                                        더보기로 얻는 재료의 거래소 환산 가치가 2,700골드라면
                                        순수익은 약 700골드입니다. 이런 경우에는 골드 기준으로
                                        더보기를 누르는 쪽이 유리하다고 볼 수 있습니다.
                                    </p>

                                    <p>
                                        반대로 더보기 비용이 2,000골드인데 재료 환산 가치가
                                        1,500골드라면 순수익은 -500골드입니다. 이 경우 골드만
                                        기준으로 보면 더보기를 누르지 않는 편이 낫습니다.
                                    </p>

                                    <div className="rounded-lg bg-indigo-500/10 border border-indigo-500/20 p-4">
                                        <p className="text-indigo-200 font-medium break-keep">
                                            핵심은 “더보기로 얻는 재료를 지금 골드로 환산하면 얼마인가”와
                                            “그 값을 더보기 비용과 비교했을 때 남는가”입니다.
                                        </p>
                                    </div>
                                </div>
                            </section>

                            <section className="rounded-none sm:rounded-xl bg-[#16181D] border-y border-x-0 sm:border border-white/5 p-5">
                                <h2 className="text-sm font-bold text-gray-200 mb-3">
                                    데이터 해석 시 참고할 점
                                </h2>

                                <div className="space-y-3 text-[13px] leading-relaxed text-gray-400 break-keep">
                                    <p>
                                        이 계산은{" "}
                                        <strong className="text-gray-300">
                                            거래소에서 바로 환산 가능한 재료의 골드 가치
                                        </strong>
                                        를 중심으로 계산한 값입니다. 따라서 비늘, 뿔, 쐐기돌,
                                        코어처럼 거래소 시세로 단순 환산하기 어려운 재료는 골드
                                        기준 계산에서 제외되거나 낮게 반영될 수 있습니다.
                                    </p>

                                    <p>
                                        그래서 골드 기준으로는 손해 구간이어도, 현재 캐릭터 성장에
                                        필요한 귀속 재료가 급한 경우에는 더보기를 누르는 것이
                                        실제 체감상 더 유리할 수 있습니다.
                                    </p>

                                    <p>
                                        이 페이지는{" "}
                                        <strong className="text-gray-300">
                                            골드 기준 효율 판단 도구
                                        </strong>
                                        로 활용하는 것이 가장 적절하고, 실제 선택은 재료 필요도,
                                        성장 목표, 강화 계획, 서버 시세 흐름을 함께 고려하는 것이
                                        좋습니다.
                                    </p>
                                </div>
                            </section>

                            <section className="rounded-none sm:rounded-xl bg-[#16181D] border-y border-x-0 sm:border border-white/5 p-5">
                                <h2 className="text-sm font-bold text-gray-200 mb-4">
                                    자주 묻는 질문
                                </h2>

                                <div className="space-y-3">
                                    {[
                                        {
                                            q: "순수익이 마이너스면 무조건 더보기를 안 하는 게 맞나요?",
                                            a: "골드만 기준으로 보면 안 누르는 편이 유리합니다. 다만 현재 캐릭터에게 필요한 귀속 재료나 성장 재료가 급하다면 손해 구간이어도 더보기를 누를 가치가 있을 수 있습니다.",
                                        },
                                        {
                                            q: "왜 어떤 재료는 거래불가로 표시되나요?",
                                            a: "현재 거래소 시세로 환산하기 어렵거나, 거래 가능한 시장 가격 기준을 적용하지 않는 재료이기 때문입니다. 이런 재료는 개인 성장 상황에 따라 실제 가치가 달라질 수 있습니다.",
                                        },
                                        {
                                            q: "최신 시세 갱신 버튼은 언제 누르면 좋나요?",
                                            a: "가격 변동이 심한 시간대, 레이드 직후, 실제 더보기를 누르기 직전에 최신 거래소 기준으로 다시 확인하고 싶을 때 누르면 좋습니다.",
                                        },
                                        {
                                            q: "상위 재료 환산 옵션은 꼭 켜야 하나요?",
                                            a: "꼭 켤 필요는 없습니다. 현재 재료를 그대로 사용할 계획이면 끄고, 상위 재료 가치로 비교하고 싶다면 T4 일반 또는 T4 상급 옵션을 켜면 됩니다.",
                                        },
                                        {
                                            q: "재료를 클릭하면 왜 흐리게 표시되나요?",
                                            a: "해당 재료가 계산에서 제외된 상태라는 뜻입니다. 다시 클릭하면 계산에 포함됩니다. 필요 없는 재료나 개인적으로 가치가 낮다고 보는 재료를 제외할 때 사용할 수 있습니다.",
                                        },
                                        {
                                            q: "이 계산은 어떤 유저에게 가장 잘 맞나요?",
                                            a: "골드를 최대한 효율적으로 쓰고 싶은 유저에게 가장 잘 맞습니다. 더보기를 눌렀을 때 골드 기준으로 이득인지 빠르게 판단하는 용도입니다.",
                                        },
                                        {
                                            q: "게임에 접속하지 않고 확인하는 용도로 써도 되나요?",
                                            a: "네. 이 페이지는 게임 접속 전후에 현재 시세 기준 더보기 효율과 재료 환산 가치를 빠르게 확인하는 보조 도구로 쓰기 좋습니다.",
                                        },
                                        {
                                            q: "실제 결과와 차이가 날 수 있나요?",
                                            a: "있습니다. 거래소 시세는 계속 변하고, 실제 판매 가능 가격이나 귀속 재료의 개인별 가치는 다를 수 있습니다. 따라서 최종 판단은 참고용으로 보는 것이 좋습니다.",
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
        </div>
    );
}