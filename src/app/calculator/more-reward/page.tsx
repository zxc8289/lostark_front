"use client";

import Link from "next/link";
import { summarizeRewardValue } from "@/app/lib/calculators/reward-value";
import RaidDataStatus from "@/app/components/RaidDataStatus";

import React, { useMemo, useState, useEffect } from "react";
import {
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
    const [priceStatus, setPriceStatus] = useState("시세 조회 전입니다.");
    const [priceUpdatedAt, setPriceUpdatedAt] = useState<string | null>(null);

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
        setPriceStatus("시세를 불러오는 중입니다.");

        try {
            const response = await fetch("/api/lostark/lostark-market");

            if (!response.ok) {
                throw new Error("시세 불러오기 실패");
            }

            const data = await response.json();
            const validPrices = Object.fromEntries(Object.entries(data).filter(([, value]) => typeof value === "number" && Number.isFinite(value) && value > 0)) as Record<string, number>;
            if (!Object.keys(validPrices).length) throw new Error("조회된 가격 없음");
            setMarketPrices(validPrices);
            const at = response.headers.get("X-Loacheck-Cache-At");
            setPriceUpdatedAt(at && Number.isFinite(Date.parse(at)) ? at : null);
            setPriceStatus(response.headers.get("X-Loacheck-Cache") === "STALE" ? "최신 조회 실패로 이전 캐시를 표시합니다." : "조회된 재료 가격을 반영했습니다. 가격 없는 재료는 평가에서 빠집니다.");
        } catch (error) {
            console.error(error);
            setPriceStatus("시세 조회에 실패했습니다. 표시된 가격이 있다면 이전 조회값입니다. 다시 갱신해 주세요.");
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
                            조회한 거래소 시세를 반영하여 더보기 보상 가치를 계산합니다.
                        </p>
                    </div>
                </div>

                <RaidDataStatus raid={raid} difficulty={diff} />
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
                                <li>5. 가격 누락과 재료 필요도를 확인한 뒤 평가 차액을 비교합니다.</li>
                            </ol>
                        </section>
                    </div>

                    <div className="space-y-4 sm:space-y-5">
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-between bg-[#16181D] rounded-none sm:rounded-xl border-y sm:border border-white/5 p-4 sm:px-5 shadow-sm">
                                <div className="space-y-1">
                                    <span className="font-semibold text-gray-200">
                                        거래소 시세 조회 상태
                                    </span>
                                    <p className="text-xs text-gray-500 break-keep">
                                        재료 가격은 API로 불러온 거래소 기준값을 사용합니다.
                                        귀속 재료의 구매 대체 가치이며 판매 수익이 아닙니다.
                                    </p>
                                    <p role="status" className="text-xs leading-6 text-gray-400">{priceStatus}{priceUpdatedAt && <> · 가격 조회 {new Date(priceUpdatedAt).toLocaleString("ko-KR", {timeZone: "Asia/Seoul"})} KST</>}
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

                                    const valuation = summarizeRewardValue(calculatedItems, g.bonusCost);
                                    const { totalValue } = valuation;
                                    const netProfit = valuation.difference;
                                    const isProfitable = netProfit >= 0;
                                    const isPartial = !valuation.canCalculate || valuation.missingCount > 0;

                                    return (
                                        <div
                                            key={gateKey}
                                            className={`relative flex flex-col gap-4 rounded-none sm:rounded-xl border-y sm:border p-5 shadow-sm transition-all ${isPartial ? "bg-[#16181D] border-white/5 hover:border-white/10" : isProfitable
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
                                                                            가격 미확인
                                                                        </span>
                                                                    )}
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            <div
                                                className={`mt-auto pt-3 border-t flex items-center justify-between ${isPartial ? "border-white/10" : isProfitable
                                                    ? "border-indigo-500/20"
                                                    : "border-red-500/20"
                                                    }`}
                                            >
                                                <div className="flex flex-col">
                                                    <span className="text-[11px] text-gray-400 font-medium">
                                                        확인된 재료 가치: {valuation.canCalculate ? `${fmt(totalValue)} G` : "—"}
                                                    </span>

                                                    <span
                                                        className={`text-sm font-bold flex items-center gap-1 ${isPartial ? "text-gray-400" : isProfitable
                                                            ? "text-indigo-400"
                                                            : "text-red-400"
                                                            }`}
                                                    >
                                                        {valuation.label}
                                                        {valuation.canCalculate && valuation.missingCount === 0 && (isProfitable ? (
                                                            <TrendingUp className="w-4 h-4" />
                                                        ) : (
                                                            <TrendingDown className="w-4 h-4" />
                                                        ))}
                                                    </span>
                                                </div>

                                                <div className="text-right">
                                                    <span className="text-[10px] text-gray-500">
                                                        {valuation.missingCount > 0 ? "부분 평가 차액" : "평가 차액"}
                                                    </span>

                                                    <div
                                                        className={`text-xl font-black ${isPartial ? "text-gray-300" : isProfitable
                                                            ? "text-white"
                                                            : "text-red-400"
                                                            }`}
                                                    >
                                                        {valuation.canCalculate ? `${isProfitable ? "+" : ""}${fmt(netProfit)} G` : "—"}
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

                        <section className="space-y-4 rounded-none border-y border-white/5 bg-[#16181D] p-5 text-[13px] leading-7 text-gray-400 sm:rounded-xl sm:border">
                            <h2 className="font-semibold text-gray-200">평가 차액을 읽는 방법</h2>
                            <p>확인된 재료의 수량 × 개당 단가를 합한 뒤 더보기 기본 비용을 뺍니다. 귀속 재료를 직접 사용할 때의 구매 대체 가치이며, 지갑에 들어오는 순수익이 아닙니다.</p>
                            <p>가격 미확인은 거래 불가능하다는 뜻이 아닙니다. 조회 누락·매물 없음·평가 대상 밖일 수 있습니다. 일부 재료만 평가한 값이 음수여도 나머지 보상을 포함한 손해를 확정할 수 없습니다. 쐐기돌·코어 등 성장 보상은 별도로 판단하세요.</p>
                            <p>재료를 누르면 평가에서 제외하거나 포함할 수 있습니다. 주차 캐릭터나 파편이 충분한 캐릭터는 실제 사용할 재료만 남기세요. 제외 설정은 현재 브라우저에 저장됩니다.</p>
                            <p>상위 재료 환산은 교환 비율을 단순 적용한 평가입니다. 실제 교환 가능한 정수 수량과 잔여 재료는 게임에서 확인하세요. 무료·할인 더보기는 자동 반영하지 않으므로 게임의 실제 결제 금액을 우선합니다.</p>
                            <Link className="inline-block text-[#A6AEFF] hover:underline" href="/articles/more-reward-efficiency">에기르 노말: 성장·주차 캐릭터별 계산 사례 →</Link>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
}