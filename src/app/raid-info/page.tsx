"use client";

import { useMemo, useState, useEffect } from "react";
import {
    Check,
    Info,
    BookOpen,
    Coins,
    PackageOpen,
    HelpCircle,
    ListChecks,
    AlertTriangle,
    ClipboardList,
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

const RewardList = ({ text, cost }: { text: string; cost?: number }) => {
    if (!text && !cost) return null;

    const items = text
        ? text.split(",").map((itemStr) => {
            const match = itemStr.trim().match(/(.+?)\s*(\d+)개/);
            if (match) {
                return { name: match[1].trim(), amount: match[2] };
            }
            return { name: itemStr.trim(), amount: "" };
        })
        : [];

    return (
        <div className="flex flex-wrap gap-2">
            {items.map((item, idx) => {
                const iconPath = REWARD_ICONS[item.name];

                return (
                    <div
                        key={idx}
                        className="flex items-center gap-1.5 bg-[#0F1014] border border-white/10 px-2 py-1.5 rounded-md"
                        title={item.name}
                    >
                        {iconPath && (
                            <Image
                                src={iconPath}
                                alt={item.name}
                                width={20}
                                height={20}
                                className="w-5 h-5 object-contain drop-shadow-md"
                            />
                        )}
                        <div className="flex items-baseline gap-1">
                            <span className="text-[13px] font-medium text-gray-300">
                                {item.name}
                            </span>
                            {item.amount && (
                                <span className="text-[13px] font-bold text-indigo-400">
                                    x{item.amount}
                                </span>
                            )}
                        </div>
                    </div>
                );
            })}

            {cost !== undefined && cost > 0 && (
                <div
                    className="flex items-center gap-1.5 bg-[#0F1014] border border-[#FF8585]/30 px-2 py-1.5 rounded-md"
                    title="더보기 골드"
                >
                    <Coins className="w-4 h-4 text-[#FF8585] drop-shadow-md" />
                    <div className="flex items-baseline gap-1">
                        <span className="text-[13px] font-medium text-gray-300">
                            더보기 골드
                        </span>
                        <span className="text-[13px] font-bold text-[#FF8585]">
                            {cost.toLocaleString()}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};

const DIFF: Record<string, { badge: string; check: string; hover: string }> = {
    싱글: {
        badge: "bg-[#F1F5F9]/10 text-[#F1F5F9] border-transparent",
        check: "bg-[#F1F5F9] text-[#111217] font-bold border-[#F1F5F9]",
        hover: "hover:bg-[#F1F5F9] hover:text-[#111217]",
    },
    노말: {
        badge: "bg-[#5B69FF]/10 text-[#5B69FF]",
        check: "bg-[#5B69FF] text-white border-[#5B69FF]",
        hover: "hover:bg-[#5B69FF] hover:text-white",
    },
    하드: {
        badge: "bg-[#FF5252]/10 text-[#FF5252]",
        check: "bg-[#ff5a5a] text-white border-[#ff5a5a]",
        hover: "hover:bg-[#FF5252] hover:text-white",
    },
    나메: {
        badge: "bg-[#6D28D9]/10 text-[#D6BCFA]",
        check: "bg-[#6D28D9] text-white border-[#6D28D9]",
        hover: "hover:bg-[#6D28D9] hover:text-white",
    },
};

export default function RaidInfoPage() {
    const categories = useMemo(() => {
        const kinds = new Set<RaidKind>();
        Object.values(raidInformation).forEach((data) => kinds.add(data.kind));
        return Array.from(kinds);
    }, []);

    const [category, setCategory] = useState<RaidKind>("카제로스");

    const availableRaids = useMemo(() => {
        return Object.keys(raidInformation).filter(
            (raidName) => raidInformation[raidName].kind === category
        );
    }, [category]);

    const [act, setAct] = useState<string>(availableRaids[0]);
    const [diff, setDiff] = useState<DifficultyKey>("노말");

    const handleCategoryChange = (cat: RaidKind) => {
        setCategory(cat);

        const newAvailableRaids = Object.keys(raidInformation).filter(
            (raidName) => raidInformation[raidName].kind === cat
        );

        const firstAct = newAvailableRaids[0];
        setAct(firstAct);

        const firstDiff = Object.keys(
            raidInformation[firstAct].difficulty
        )[0] as DifficultyKey;

        setDiff(firstDiff);
    };

    useEffect(() => {
        if (!raidInformation[act]) return;

        const availableDiffs = Object.keys(
            raidInformation[act].difficulty
        ) as DifficultyKey[];

        if (!availableDiffs.includes(diff)) {
            setDiff(availableDiffs[0]);
        }
    }, [act, diff]);

    const currentRaidData = raidInformation[act];

    const availableDiffs = currentRaidData
        ? (Object.keys(currentRaidData.difficulty) as DifficultyKey[])
        : [];

    const currentDiffData = currentRaidData?.difficulty[diff];
    const rows = currentDiffData?.gates || [];

    const getDiffLabel = (cat: RaidKind, d: DifficultyKey) => {
        if (cat === "어비스") {
            if (d === "노말") return "1단계";
            if (d === "하드") return "2단계";
            if (d === "나메") return "3단계";
        }

        return d;
    };

    const aggregatedRewards = useMemo(() => {
        const clearTotals: Record<string, number> = {};
        const bonusTotals: Record<string, number> = {};

        const parseAndAdd = (text: string, totals: Record<string, number>) => {
            if (!text) return;

            text.split(",").forEach((itemStr) => {
                const match = itemStr.trim().match(/(.+?)\s*(\d+)개/);

                if (match) {
                    const name = match[1].trim();
                    const amount = parseInt(match[2], 10);
                    totals[name] = (totals[name] || 0) + amount;
                } else {
                    const name = itemStr.trim();

                    if (name) {
                        totals[name] = (totals[name] || 0) + 1;
                    }
                }
            });
        };

        rows.forEach((row) => {
            parseAndAdd(row.rewards, clearTotals);
            parseAndAdd(row.bonusRewards, bonusTotals);
        });

        const toRewardString = (totals: Record<string, number>) =>
            Object.entries(totals)
                .map(([name, amount]) => `${name} ${amount}개`)
                .join(", ");

        return {
            clear: toRewardString(clearTotals),
            bonus: toRewardString(bonusTotals),
        };
    }, [rows]);

    const totalBonusCost = useMemo(() => {
        return rows.reduce((sum, row) => sum + (row.bonusCost || 0), 0);
    }, [rows]);

    return (
        <div className="w-full text-white py-8 sm:py-12 min-h-screen">
            <div className="mx-auto max-w-[1400px] space-y-4">
                <div className="relative pb-7 px-4 sm:px-0">
                    <div className="relative flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                        <div className="space-y-2">
                            <div className="inline-flex items-center gap-2 text-xs font-medium text-[#5B69FF]">
                                <BookOpen className="h-4 w-4" strokeWidth={2.5} />
                                <span>레이드 도감</span>
                            </div>

                            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                                레이드 보상 정보
                            </h1>

                            <p className="text-sm text-gray-400 max-w-2xl leading-relaxed break-keep">
                                관문별 클리어 보상과 더보기 보상을 한눈에 비교해보세요.
                            </p>
                        </div>
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
                                        {categories.map((cat) => (
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
                                                    ? DIFF[d].check
                                                    : `bg-[#1B222D] text-gray-400 border-transparent ${DIFF[d].hover}`
                                                    }`}
                                            >
                                                {getDiffLabel(category, d)}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                        레이드 선택
                                    </label>

                                    <div className="grid grid-cols-2 gap-2">
                                        {availableRaids.map((a) => {
                                            const isActive = act === a;

                                            return (
                                                <button
                                                    key={a}
                                                    onClick={() => setAct(a)}
                                                    className={`relative flex items-center justify-center py-2 px-3 text-sm font-bold rounded-lg border transition-all ${isActive
                                                        ? "bg-[#5B69FF]/15 border-[#5B69FF]/30 text-white"
                                                        : "bg-transparent border-white/5 text-gray-500 hover:bg-white/5 hover:text-gray-300"
                                                        }`}
                                                >
                                                    <span className="truncate">{a}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="rounded-none sm:rounded-xl bg-[#16181D] border-y sm:border border-white/5 p-5">
                            <h2 className="text-sm font-bold text-gray-200 mb-3">
                                빠른 사용법
                            </h2>

                            <ol className="space-y-2 text-[13px] leading-relaxed text-gray-400 break-keep">
                                <li>1. 왼쪽에서 레이드 카테고리를 선택합니다.</li>
                                <li>2. 난이도와 레이드를 선택합니다.</li>
                                <li>3. 상단에서 입장 레벨과 골드 보상을 확인합니다.</li>
                                <li>4. 표에서 관문별 클리어 보상과 더보기 보상을 비교합니다.</li>
                                <li>5. 총합 행에서 전체 보상량을 한 번에 확인합니다.</li>
                            </ol>
                        </section>
                    </div>

                    <div className="space-y-4 sm:space-y-5">
                        <section className="bg-[#16181D] rounded-none sm:rounded-xl border-y sm:border border-white/5 px-5 py-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div
                                    className={`px-3 py-2 rounded-lg flex items-center justify-center text-sm font-bold ${DIFF[diff]?.badge}`}
                                >
                                    {getDiffLabel(category, diff)}
                                </div>

                                <div>
                                    <div className="text-sm text-gray-400 flex items-center gap-2">
                                        {act}
                                    </div>

                                    <div className="text-white font-bold text-lg">
                                        총 보상 합계
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-6 text-right ml-auto sm:ml-0 self-end sm:self-auto flex-wrap justify-end">
                                <div>
                                    <div className="text-xs text-gray-500">입장 레벨</div>
                                    <div className="text-gray-200 font-medium text-lg">
                                        {currentDiffData?.level} <span className="text-xs">Lv</span>
                                    </div>
                                </div>

                                {currentDiffData?.gold !== undefined && currentDiffData.gold > 0 && (
                                    <div>
                                        <div className="text-xs text-gray-500">일반 골드</div>
                                        <div className="text-yellow-400 font-bold text-lg flex items-center justify-end gap-1">
                                            <Coins className="w-4 h-4 text-yellow-500" />
                                            {currentDiffData.gold.toLocaleString()}
                                        </div>
                                    </div>
                                )}

                                {currentDiffData?.boundGold !== undefined &&
                                    currentDiffData.boundGold > 0 && (
                                        <div>
                                            <div className="text-xs text-gray-500">귀속 골드</div>
                                            <div className="text-yellow-400 font-bold text-lg flex items-center justify-end gap-1">
                                                <Coins className="w-4 h-4 text-yellow-500" />
                                                {currentDiffData.boundGold.toLocaleString()}
                                            </div>
                                        </div>
                                    )}

                                {totalBonusCost > 0 && (
                                    <div>
                                        <div className="text-xs text-gray-500">더보기 골드</div>
                                        <div className="text-[#FF8585] font-bold text-lg flex items-center justify-end gap-1">
                                            <Coins className="w-4 h-4 text-[#FF8585]" />
                                            {totalBonusCost.toLocaleString()}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </section>

                        {rows.length > 0 ? (
                            <div className="rounded-none sm:rounded-xl bg-[#16181D] border-y sm:border border-white/5 overflow-hidden shadow-sm">
                                <div className="hidden md:block overflow-x-auto custom-scrollbar">
                                    <table className="w-full text-left border-collapse min-w-[700px]">
                                        <thead>
                                            <tr className="border-b border-white/10 text-[13px] font-bold text-gray-400 bg-[#121318] uppercase tracking-wider">
                                                <th className="py-4 px-5 whitespace-nowrap border-r border-white/5 w-[10%] text-center">
                                                    관문
                                                </th>
                                                <th className="py-4 px-5 whitespace-nowrap border-r border-white/5 w-[45%] text-center text-[#7C88FF]">
                                                    클리어 보상
                                                </th>
                                                <th className="py-4 px-5 whitespace-nowrap border-r border-white/5 w-[45%] text-center text-[#7C88FF]">
                                                    더보기 보상
                                                </th>
                                            </tr>
                                        </thead>

                                        <tbody className="text-[13.5px]">
                                            {rows.map((row) => (
                                                <tr
                                                    key={row.index}
                                                    className="transition-colors border-b border-white/5 hover:bg-white/[0.01]"
                                                >
                                                    <td className="py-5 px-5 font-bold text-gray-200 whitespace-nowrap border-r border-white/5 text-center align-middle">
                                                        {row.name}
                                                    </td>

                                                    <td className="py-5 px-5 align-top border-r border-white/5">
                                                        <RewardList text={row.rewards} />
                                                    </td>

                                                    <td className="py-5 px-5 align-top">
                                                        <RewardList
                                                            text={row.bonusRewards}
                                                            cost={row.bonusCost}
                                                        />
                                                    </td>
                                                </tr>
                                            ))}

                                            <tr className="border-t border-white/5">
                                                <td className="py-5 px-5 font-bold text-gray-200 whitespace-nowrap border-r border-white/5 text-center align-middle">
                                                    총합
                                                </td>

                                                <td className="py-5 px-5 align-top border-r border-white/5">
                                                    {aggregatedRewards.clear ? (
                                                        <RewardList text={aggregatedRewards.clear} />
                                                    ) : (
                                                        <span className="text-gray-500">-</span>
                                                    )}
                                                </td>

                                                <td className="py-5 px-5 align-top">
                                                    {aggregatedRewards.bonus ? (
                                                        <RewardList
                                                            text={aggregatedRewards.bonus}
                                                            cost={totalBonusCost}
                                                        />
                                                    ) : (
                                                        <span className="text-gray-500">-</span>
                                                    )}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                <div className="md:hidden flex flex-col divide-y divide-white/5">
                                    {rows.map((row) => (
                                        <div
                                            key={row.index}
                                            className="p-4 sm:p-5 space-y-4 hover:bg-white/[0.01] transition-colors"
                                        >
                                            <div className="flex items-center justify-between border-b border-white/5 pb-3">
                                                <span className="font-bold text-gray-200 text-base">
                                                    {row.name}
                                                </span>
                                            </div>

                                            <div className="space-y-4">
                                                <div>
                                                    <div className="text-[12px] font-bold text-[#7C88FF] mb-2 flex items-center gap-1.5">
                                                        <PackageOpen className="w-3.5 h-3.5" />
                                                        클리어 보상
                                                    </div>
                                                    <RewardList text={row.rewards} />
                                                </div>

                                                <div className="pt-2">
                                                    <div className="text-[12px] font-bold text-[#FF8585] mb-2 flex items-center gap-1.5">
                                                        <PackageOpen className="w-3.5 h-3.5" />
                                                        더보기 보상
                                                    </div>
                                                    <RewardList
                                                        text={row.bonusRewards}
                                                        cost={row.bonusCost}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    <div className="p-4 sm:p-5 space-y-4 border-t border-white/5">
                                        <div className="flex items-center justify-between border-b border-white/5 pb-3">
                                            <span className="font-bold text-gray-200 text-base flex items-center gap-2">
                                                총합
                                            </span>
                                        </div>

                                        <div className="space-y-4">
                                            <div>
                                                <div className="text-[12px] font-bold text-[#7C88FF] mb-2 flex items-center gap-1.5">
                                                    <PackageOpen className="w-3.5 h-3.5" />
                                                    총 클리어 보상
                                                </div>

                                                {aggregatedRewards.clear ? (
                                                    <RewardList text={aggregatedRewards.clear} />
                                                ) : (
                                                    <span className="text-gray-500">-</span>
                                                )}
                                            </div>

                                            <div className="pt-2">
                                                <div className="text-[12px] font-bold text-[#FF8585] mb-2 flex items-center gap-1.5">
                                                    <PackageOpen className="w-3.5 h-3.5" />
                                                    총 더보기 보상
                                                </div>

                                                {aggregatedRewards.bonus ? (
                                                    <RewardList
                                                        text={aggregatedRewards.bonus}
                                                        cost={totalBonusCost}
                                                    />
                                                ) : (
                                                    <span className="text-gray-500">-</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="py-20 text-center text-gray-500 bg-[#16181D] rounded-none sm:rounded-xl border-y sm:border border-dashed border-white/10">
                                해당 난이도의 데이터가 없습니다.
                            </div>
                        )}

                        <div className="space-y-4 mt-6">
                            <section className="rounded-none sm:rounded-xl bg-gradient-to-b from-[#16181D] to-[#121318] border-y sm:border border-white/5 p-5">

                                <div className="flex items-center gap-2 mb-3">
                                    <Info className="w-4 h-4 text-indigo-400" />
                                    <h2 className="text-sm font-bold text-gray-200">
                                        레이드 보상 정보 페이지란?
                                    </h2>
                                </div>


                                <div className="space-y-3 text-[13px] leading-relaxed text-gray-400 break-keep">
                                    <p>
                                        이 페이지는 로스트아크 레이드의 보상 정보를 빠르게 확인하기 위한
                                        레이드 보상 조회 도구입니다. 게임에 직접 접속하지 않아도 레이드별
                                        입장 레벨, 골드 보상, 관문별 클리어 보상, 더보기 보상 구성을 확인할 수 있습니다.
                                    </p>

                                    <p>
                                        레이드 보상은 캐릭터별 주간 숙제 계획, 골드 수급 계산, 더보기 여부 판단,
                                        재련 재료 수급 계획에 직접 연결됩니다. 그래서 각 관문에서 어떤 보상이 나오는지
                                        미리 확인해두면 어떤 캐릭터로 어떤 레이드를 우선 진행할지 정하기 쉽습니다.
                                    </p>

                                    <p>
                                        표의 총합 행은 선택한 레이드와 난이도의 전체 관문 보상을 합산한 값입니다.
                                        관문별 보상만 따로 보는 것보다, 한 주 동안 해당 레이드를 완료했을 때 얻는
                                        전체 재료량을 확인하는 데 유용합니다.
                                    </p>
                                </div>
                            </section>

                            <div className="grid gap-3 px-4 sm:px-0 md:grid-cols-3">
                                <section className="rounded-xl bg-[#16181D] border border-white/5 p-4">
                                    <div className="flex items-center gap-2 mb-2 text-gray-200 font-bold">
                                        <ClipboardList className="w-4 h-4 text-[#5B69FF]" />
                                        관문별 보상 확인
                                    </div>
                                    <p className="text-sm text-gray-400 leading-relaxed break-keep">
                                        각 관문에서 얻는 클리어 보상과 더보기 보상을 구분해 확인할 수 있습니다.
                                    </p>
                                </section>

                                <section className="rounded-xl bg-[#16181D] border border-white/5 p-4">
                                    <div className="flex items-center gap-2 mb-2 text-gray-200 font-bold">
                                        <Coins className="w-4 h-4 text-yellow-400" />
                                        골드 정보 비교
                                    </div>
                                    <p className="text-sm text-gray-400 leading-relaxed break-keep">
                                        난이도별 일반 골드, 귀속 골드, 더보기 비용을 함께 비교할 수 있습니다.
                                    </p>
                                </section>

                                <section className="rounded-xl bg-[#16181D] border border-white/5 p-4">
                                    <div className="flex items-center gap-2 mb-2 text-gray-200 font-bold">
                                        <PackageOpen className="w-4 h-4 text-indigo-400" />
                                        총합 보상 정리
                                    </div>
                                    <p className="text-sm text-gray-400 leading-relaxed break-keep">
                                        전체 관문을 기준으로 클리어 보상 총합과 더보기 보상 총합을 한 번에 볼 수 있습니다.
                                    </p>
                                </section>
                            </div>

                            <section className="rounded-none sm:rounded-xl bg-[#16181D] border-y sm:border border-white/5 p-5">
                                <div className="flex items-center gap-2 mb-3">
                                    <ListChecks className="w-4 h-4 text-indigo-400" />
                                    <h2 className="text-sm font-bold text-gray-200">
                                        이 페이지에서 확인할 수 있는 정보
                                    </h2>
                                </div>

                                <div className="space-y-3 text-[13px] leading-relaxed text-gray-400 break-keep">
                                    <ul className="space-y-2">
                                        <li>
                                            • 레이드별 <strong className="text-gray-300">입장 레벨</strong>
                                        </li>
                                        <li>
                                            • 난이도별{" "}
                                            <strong className="text-yellow-400">일반 골드</strong> /{" "}
                                            <strong className="text-yellow-400">귀속 골드</strong>
                                        </li>
                                        <li>
                                            • 관문별 <strong className="text-gray-300">클리어 보상</strong>
                                        </li>
                                        <li>
                                            • 관문별 <strong className="text-gray-300">더보기 보상</strong>
                                        </li>
                                        <li>
                                            • 전체 관문 기준{" "}
                                            <strong className="text-gray-300">클리어 보상 총합</strong>
                                        </li>
                                        <li>
                                            • 전체 관문 기준{" "}
                                            <strong className="text-gray-300">더보기 보상 총합과 더보기 비용</strong>
                                        </li>
                                    </ul>
                                </div>
                            </section>

                            <section className="rounded-none sm:rounded-xl bg-[#16181D] border-y sm:border border-white/5 p-5">
                                <h2 className="text-sm font-bold text-gray-200 mb-3">
                                    현재 선택 기준 안내
                                </h2>

                                <div className="space-y-3 text-[13px] leading-relaxed text-gray-400 break-keep">
                                    <p>
                                        현재 선택한 레이드는{" "}
                                        <strong className="text-white">{act}</strong>, 난이도는{" "}
                                        <strong className="text-white">
                                            {getDiffLabel(category, diff)}
                                        </strong>
                                        입니다. 이 기준에 해당하는 입장 레벨은{" "}
                                        <strong className="text-gray-300">{currentDiffData?.level}Lv</strong>
                                        이며, 표시되는 골드와 보상은 현재 선택한 난이도의 보상표를 기준으로 합니다.
                                    </p>

                                    <p>
                                        레이드에 따라 일반 골드와 귀속 골드가 함께 표시될 수 있습니다.
                                        일반 골드는 거래와 사용 범위가 넓은 골드이고, 귀속 골드는 캐릭터 또는 원정대 성장에
                                        사용하는 제한적인 골드로 이해하면 됩니다.
                                    </p>

                                    <p>
                                        더보기 골드는 모든 관문에서 더보기를 눌렀을 때 필요한 총 비용입니다.
                                        더보기 보상 자체의 가치는 시세에 따라 달라질 수 있으므로, 실제 이득 여부는
                                        더보기 효율 계산기와 함께 확인하는 것이 좋습니다.
                                    </p>
                                </div>
                            </section>

                            <section className="rounded-none sm:rounded-xl bg-[#16181D] border-y sm:border border-white/5 p-5">
                                <h2 className="text-sm font-bold text-gray-200 mb-3">
                                    클리어 보상과 더보기 보상의 차이
                                </h2>

                                <div className="space-y-3 text-[13px] leading-relaxed text-gray-400 break-keep">
                                    <p>
                                        <strong className="text-[#7C88FF]">클리어 보상</strong>은 레이드를 완료했을 때
                                        기본적으로 받을 수 있는 보상입니다. 관문별 클리어 보상은 골드 수급뿐만 아니라
                                        재련 재료, 성장 재료, 특수 재료 수급량을 확인하는 데 중요합니다.
                                    </p>

                                    <p>
                                        <strong className="text-[#FF8585]">더보기 보상</strong>은 추가 골드를 사용해서
                                        더 많은 재료를 받는 선택 보상입니다. 더보기는 재료가 급할 때는 유용하지만,
                                        현재 시세 기준으로는 손해가 될 수도 있으므로 비용과 보상 구성을 함께 비교하는 것이 좋습니다.
                                    </p>

                                    <div className="rounded-lg bg-[#0F1014] border border-white/5 p-4 space-y-2">
                                        <p className="text-gray-300 font-semibold">간단한 판단 흐름</p>
                                        <p>1. 먼저 클리어 보상으로 기본 획득 재료를 확인합니다.</p>
                                        <p>2. 더보기 보상에서 추가로 얻는 재료를 확인합니다.</p>
                                        <p>3. 더보기 골드 비용과 추가 재료 가치를 비교합니다.</p>
                                        <p>4. 재료가 급한 캐릭터인지, 골드 효율을 우선하는 캐릭터인지에 따라 결정합니다.</p>
                                    </div>
                                </div>
                            </section>

                            <section className="rounded-none sm:rounded-xl bg-[#16181D] border-y sm:border border-white/5 p-5">
                                <h2 className="text-sm font-bold text-gray-200 mb-3">
                                    보상표 활용 예시
                                </h2>

                                <div className="space-y-3 text-[13px] leading-relaxed text-gray-400 break-keep">
                                    <p>
                                        예를 들어 여러 캐릭터의 주간 레이드를 계획할 때, 각 캐릭터가 갈 수 있는 레이드의
                                        입장 레벨과 골드 보상을 먼저 확인하면 주간 골드 수급량을 대략적으로 정리할 수 있습니다.
                                    </p>

                                    <p>
                                        또 특정 재련 재료가 부족한 캐릭터라면, 해당 재료가 많이 나오는 레이드와 난이도를
                                        찾아서 우선순위를 정할 수 있습니다. 보상 총합을 보면 관문별로 흩어진 재료를
                                        한 번에 합산해서 볼 수 있어 재료 수급 계획을 세우기 편합니다.
                                    </p>

                                    <div className="rounded-lg bg-indigo-500/10 border border-indigo-500/20 p-4">
                                        <p className="text-indigo-200 font-medium break-keep">
                                            핵심은 “이 레이드를 돌면 총 얼마의 골드와 어떤 재료를 얻는가”를 빠르게 확인하고,
                                            더보기까지 눌렀을 때 추가로 얻는 재료가 필요한지 판단하는 것입니다.
                                        </p>
                                    </div>
                                </div>
                            </section>

                            <section className="rounded-none sm:rounded-xl bg-[#16181D] border-y sm:border border-white/5 p-5">
                                <div className="flex items-center gap-2 mb-3">
                                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                                    <h2 className="text-sm font-bold text-gray-200">
                                        데이터 안내 및 주의사항
                                    </h2>
                                </div>

                                <div className="space-y-3 text-[13px] leading-relaxed text-gray-400 break-keep">
                                    <p>
                                        위 표의 <strong className="text-yellow-400 font-medium">일반 골드</strong>
                                        는 일반적으로 사용할 수 있는 골드이고,{" "}
                                        <strong className="text-yellow-400 font-medium">귀속 골드</strong>는
                                        사용 범위가 제한된 골드입니다.
                                    </p>

                                    <p>
                                        보상표는 너무 복잡해지지 않도록 주요 재련 재료와 핵심 보상 중심으로 정리되어 있습니다.
                                        실제 게임에서는 장신구, 카드, 어빌리티 스톤, 기타 드롭 아이템 등이 추가로 존재할 수 있습니다.
                                    </p>

                                    <p>
                                        로스트아크는 패치에 따라 보상 구조가 바뀔 수 있으므로, 중요한 의사결정을 할 때는
                                        실제 게임 내 보상 정보와 함께 확인하는 것이 좋습니다. 이 페이지는 빠른 조회와 비교용
                                        보조 도구로 활용하는 것이 가장 적절합니다.
                                    </p>
                                </div>
                            </section>

                            <section className="rounded-none sm:rounded-xl bg-[#16181D] border-y sm:border border-white/5 p-5">
                                <div className="flex items-center gap-2 mb-4">
                                    <HelpCircle className="w-4 h-4 text-indigo-400" />
                                    <h2 className="text-sm font-bold text-gray-200">
                                        자주 묻는 질문
                                    </h2>
                                </div>

                                <div className="space-y-3">
                                    {[
                                        {
                                            q: "클리어 보상과 더보기 보상은 무엇이 다른가요?",
                                            a: "클리어 보상은 레이드를 완료했을 때 기본으로 받는 보상이고, 더보기 보상은 추가 골드를 사용해 더 많은 재료를 받는 선택 보상입니다.",
                                        },
                                        {
                                            q: "더보기 골드는 무엇을 의미하나요?",
                                            a: "해당 레이드의 모든 관문에서 더보기를 눌렀을 때 필요한 총 골드 비용입니다. 관문별 비용은 표의 더보기 보상 칸에서 함께 확인할 수 있습니다.",
                                        },
                                        {
                                            q: "일반 골드와 귀속 골드는 어떻게 다른가요?",
                                            a: "일반 골드는 사용 범위가 넓은 골드이고, 귀속 골드는 사용 범위가 제한된 골드입니다. 실제 사용처와 제한 조건은 게임 내 안내를 함께 확인하는 것이 좋습니다.",
                                        },
                                        {
                                            q: "총합 행은 어떤 기준으로 계산되나요?",
                                            a: "현재 선택한 레이드와 난이도의 모든 관문 보상을 합산한 값입니다. 클리어 보상 총합과 더보기 보상 총합을 따로 보여줍니다.",
                                        },
                                        {
                                            q: "더보기를 무조건 누르는 것이 좋은가요?",
                                            a: "아닙니다. 재료가 급한 캐릭터라면 누를 가치가 있지만, 골드 효율만 보면 손해일 수 있습니다. 더보기 효율 계산기와 함께 비교하는 것이 좋습니다.",
                                        },
                                        {
                                            q: "보상 정보가 실제 게임과 다를 수 있나요?",
                                            a: "패치나 이벤트, 보상 개편에 따라 실제 게임 정보와 차이가 생길 수 있습니다. 중요한 판단 전에는 게임 내 보상 정보도 함께 확인하는 것이 좋습니다.",
                                        },
                                        {
                                            q: "이 페이지는 어떤 상황에서 쓰면 좋나요?",
                                            a: "주간 숙제 계획, 캐릭터별 골드 수급량 확인, 재련 재료 수급 계획, 더보기 여부 판단 전에 빠르게 보상을 확인할 때 사용하기 좋습니다.",
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