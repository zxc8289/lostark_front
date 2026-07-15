"use client";

import { useMemo } from "react";
import { useMyTasksCtx } from "@/app/my-tasks/MyTasksContext";
import { raidInformation, type DifficultyKey } from "@/server/data/raids";
import { getRaidDifficultyLabel } from "@/app/lib/tasks/raid-display";

type RaidIncomeRow = {
    raidName: string;
    difficulty: string;
    gold: number;
    boundGold: number;
    totalGold: number;
};

type CharacterIncomeRow = {
    name: string;
    itemLevel: number;
    isGoldCharacter: boolean;
    raids: RaidIncomeRow[];
    gold: number;
    boundGold: number;
    totalGold: number;
};

const formatGold = (value: number) => Math.max(0, Math.floor(value)).toLocaleString();

function calculateGateIncome(gate: any, isGoldEnabled: boolean, isBonus: boolean) {
    if (!isGoldEnabled) return { gold: 0, boundGold: 0 };

    let gold = gate.gold ?? 0;
    let boundGold = gate.boundGold ?? 0;
    let bonusCost = isBonus ? gate.bonusCost ?? 0 : 0;

    const netBoundGold = Math.max(0, boundGold - bonusCost);
    bonusCost = Math.max(0, bonusCost - boundGold);
    const netGold = Math.max(0, gold - bonusCost);

    return { gold: netGold, boundGold: netBoundGold };
}

function getRaidIncome(raidName: string, raidPref: any, isGoldCharacter: boolean): RaidIncomeRow | null {
    if (!raidPref?.enabled) return null;

    const info = raidInformation[raidName];
    const diff = info?.difficulty?.[raidPref.difficulty as DifficultyKey];
    if (!diff) return null;

    const isGoldEnabled = isGoldCharacter && (raidPref.isGold ?? true);
    const income = (diff.gates ?? []).reduce(
        (sum, gate) => {
            const gateIncome = calculateGateIncome(gate, isGoldEnabled, raidPref.isBonus ?? false);
            return {
                gold: sum.gold + gateIncome.gold,
                boundGold: sum.boundGold + gateIncome.boundGold,
            };
        },
        { gold: 0, boundGold: 0 }
    );

    return {
        raidName,
        difficulty: raidPref.difficulty,
        gold: income.gold,
        boundGold: income.boundGold,
        totalGold: income.gold + income.boundGold,
    };
}

export default function WeeklyIncomeTab() {
    const {
        visibleRoster,
        effectivePrefsByChar,
        safeGoldDesignatedByChar,
        showInitialLoading,
        effectiveHasRoster,
    } = useMyTasksCtx();

    const incomeRows = useMemo<CharacterIncomeRow[]>(() => {
        return [...visibleRoster]
            .sort((a: any, b: any) => (b.itemLevelNum ?? 0) - (a.itemLevelNum ?? 0))
            .map((character: any) => {
                const prefs = effectivePrefsByChar[character.name];
                const isGoldCharacter = safeGoldDesignatedByChar[character.name] ?? false;
                const orderedRaidNames = prefs?.order?.filter((raidName: string) => prefs.raids?.[raidName])
                    ?? Object.keys(prefs?.raids ?? {});
                const raids = orderedRaidNames
                    .map((raidName: string) => getRaidIncome(raidName, prefs?.raids?.[raidName], isGoldCharacter))
                    .filter((row: RaidIncomeRow | null): row is RaidIncomeRow => !!row);
                const gold = raids.reduce((sum: number, raid: RaidIncomeRow) => sum + raid.gold, 0);
                const boundGold = raids.reduce((sum: number, raid: RaidIncomeRow) => sum + raid.boundGold, 0);

                return {
                    name: character.name,
                    itemLevel: character.itemLevelNum ?? 0,
                    isGoldCharacter,
                    raids,
                    gold,
                    boundGold,
                    totalGold: gold + boundGold,
                };
            })
            .filter((row) => row.raids.length > 0);
    }, [visibleRoster, effectivePrefsByChar, safeGoldDesignatedByChar]);

    const summary = useMemo(() => {
        const gold = incomeRows.reduce((sum, row) => sum + row.gold, 0);
        const boundGold = incomeRows.reduce((sum, row) => sum + row.boundGold, 0);
        const raidCount = incomeRows.reduce((sum, row) => sum + row.raids.length, 0);
        const goldCharacterCount = incomeRows.filter((row) => row.isGoldCharacter).length;

        return {
            gold,
            boundGold,
            totalGold: gold + boundGold,
            raidCount,
            goldCharacterCount,
        };
    }, [incomeRows]);

    if (showInitialLoading) {
        return (
            <div className="rounded-none sm:rounded-sm bg-[#16181D] border-y sm:border border-white/5 p-5">
                <div className="h-5 w-40 rounded bg-white/10 animate-pulse" />
                <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[0, 1, 2].map((item) => (
                        <div key={item} className="h-24 rounded-xl bg-white/[0.04] animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    if (!effectiveHasRoster || incomeRows.length === 0) {
        return (
            <section className="rounded-none sm:rounded-sm bg-[#16181D] border-y sm:border border-white/5 p-6 text-center">
                <h2 className="text-base sm:text-lg font-bold text-white">계산할 레이드 수익이 없습니다.</h2>
                <p className="mt-2 text-sm text-gray-400 break-keep">
                    캐릭터를 불러온 뒤 주간 레이드 탭에서 레이드 보상 설정을 켜면 이곳에 주간 수익이 표시됩니다.
                </p>
            </section>
        );
    }

    return (
        <div className="space-y-4">
            <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                <SummaryCard label="총 주간 수익" value={`${formatGold(summary.totalGold)} G`} valueClassName="text-white" />
                <SummaryCard label="거래 가능 골드" value={`${formatGold(summary.gold)} G`} valueClassName="text-indigo-200" />
                <SummaryCard label="귀속 골드" value={`${formatGold(summary.boundGold)} G`} valueClassName="text-blue-200" />
                <SummaryCard
                    label="계산 대상"
                    value={`${summary.goldCharacterCount}명`}
                    suffix={`(${summary.raidCount}개 레이드)`}
                    valueClassName="text-gray-100"
                />
            </section>

            <section className="overflow-hidden rounded-none sm:rounded-sm bg-[#16181D] border-y sm:border border-white/5">
                <div className="px-4 sm:px-5 py-4 border-b border-white/5">
                    <h2 className="text-sm sm:text-base font-bold text-white">캐릭터별 주간 레이드 수익</h2>
                    <p className="mt-1 text-xs text-gray-500 break-keep">
                        주간 레이드 보상 설정과 레이드 보상, 골드 캐릭터 기준을 그대로 적용합니다.
                    </p>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-center text-sm">
                        <thead className="bg-[#0F1115] text-center text-[11px] uppercase tracking-wider text-gray-500">
                            <tr>
                                <th className="px-5 py-3">캐릭터</th>
                                <th className="px-5 py-3">레이드</th>
                                <th className="px-5 py-3">거래 가능</th>
                                <th className="px-5 py-3">귀속</th>
                                <th className="px-5 py-3">합계</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {incomeRows.map((row) => (
                                <tr key={row.name} className={row.isGoldCharacter ? "text-gray-300" : "text-gray-500"}>
                                    <td className="px-5 py-4 align-top text-center">
                                        <div className="font-bold text-white">{row.name}</div>
                                        <div className="mt-1 text-xs text-gray-500">
                                            {row.itemLevel.toLocaleString()} / {row.isGoldCharacter ? "골드 포함" : "골드 제외"}
                                        </div>
                                    </td>
                                    <td className="px-5 py-4 text-center">
                                        <div className="flex flex-wrap justify-center gap-2">
                                            {row.raids.map((raid) => (
                                                <span key={`${row.name}-${raid.raidName}`} className="rounded-full bg-white/5 px-2.5 py-1 text-xs font-bold text-gray-300">
                                                    {raid.raidName} {getRaidDifficultyLabel(raid.raidName, raid.difficulty)}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-5 py-4 text-center font-bold text-indigo-100">
                                        {formatGold(row.gold)} G
                                    </td>
                                    <td className="px-5 py-4 text-center font-bold text-blue-100">
                                        {formatGold(row.boundGold)} G
                                    </td>
                                    <td className="px-5 py-4 text-center text-base font-bold text-white">
                                        {formatGold(row.totalGold)} G
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}

function SummaryCard({
    label,
    value,
    suffix,
    valueClassName,
}: {
    label: string;
    value: string;
    suffix?: string;
    valueClassName: string;
}) {
    return (
        <div className="rounded-none sm:rounded-sm bg-[#16181D] border-y sm:border border-white/5 p-5">
            <div className="mb-3 text-sm font-bold text-gray-300">{label}</div>
            <div className={`text-2xl font-bold ${valueClassName}`}>
                {value}
                {suffix && <span className="ml-2 align-middle text-xs font-bold text-gray-500">{suffix}</span>}
            </div>
        </div>
    );
}
