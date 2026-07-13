"use client";

import { useEffect, useMemo, useState } from "react";
import {
    AlertCircle,
    Check,
    Loader2,
    Search,
} from "lucide-react";
import {
    calculateWeeklyGoldRoster,
    getWeeklyGoldRaidOptions,
    recommendWeeklyGoldRaids,
    type WeeklyGoldSortMode,
} from "@/app/lib/calculators/weekly-gold";

type CharacterForm = {
    id: string;
    name: string;
    itemLevel: string;
    raidIds: [string, string, string];
    earnsGold: boolean;
};

type ApiRosterCharacter = {
    name?: string;
    itemLevel?: string;
    itemLevelNum?: number;
};

const STORAGE_KEY = "loacheck_weekly_gold_calculator";

const formatGold = (value: number) => Math.max(0, Math.floor(value)).toLocaleString();
const parseItemLevel = (value: string) => Number(value.replace(/[^\d.]/g, "")) || 0;

function makeCharacter(index: number): CharacterForm {
    return {
        id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
        name: `캐릭터 ${index}`,
        itemLevel: "1640",
        raidIds: ["", "", ""],
        earnsGold: index <= 6,
    };
}

function normalizeCharacters(value: unknown): CharacterForm[] {
    if (!Array.isArray(value)) return [makeCharacter(1)];

    const normalized = value
        .map((character, index) => {
            const source = character as Partial<CharacterForm>;
            const raidIds = Array.isArray(source.raidIds) ? source.raidIds : [];

            return {
                id: String(source.id || `${Date.now()}_${index}`),
                name: String(source.name || `캐릭터 ${index + 1}`),
                itemLevel: String(source.itemLevel || "1640"),
                raidIds: [
                    String(raidIds[0] || ""),
                    String(raidIds[1] || ""),
                    String(raidIds[2] || ""),
                ] as [string, string, string],
                earnsGold: source.earnsGold !== false,
            };
        })
        .slice(0, 12);

    return normalized.length > 0 ? normalized : [makeCharacter(1)];
}

export default function WeeklyGoldCalculatorPage() {
    const raidOptions = useMemo(() => getWeeklyGoldRaidOptions(), []);
    const [characters, setCharacters] = useState<CharacterForm[]>(() => [makeCharacter(1)]);
    const [searchName, setSearchName] = useState("");
    const [isSearchingRoster, setIsSearchingRoster] = useState(false);
    const [searchStatus, setSearchStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [sortMode, setSortMode] = useState<WeeklyGoldSortMode>("gold");
    const [goldLimitEnabled, setGoldLimitEnabled] = useState(true);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                setCharacters(normalizeCharacters(parsed.characters));
                if (parsed.sortMode === "latest" || parsed.sortMode === "gold") setSortMode(parsed.sortMode);
                if (typeof parsed.goldLimitEnabled === "boolean") setGoldLimitEnabled(parsed.goldLimitEnabled);
            } else {
                const firstCharacter = makeCharacter(1);
                const recommended = recommendWeeklyGoldRaids(1640, raidOptions, "gold", 3);
                firstCharacter.raidIds = [
                    recommended[0]?.id ?? "",
                    recommended[1]?.id ?? "",
                    recommended[2]?.id ?? "",
                ];
                setCharacters([firstCharacter]);
            }
        } catch { }

        setLoaded(true);
    }, [raidOptions]);

    useEffect(() => {
        if (!loaded) return;

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ characters, sortMode, goldLimitEnabled }));
        } catch { }
    }, [characters, sortMode, goldLimitEnabled, loaded]);

    const result = useMemo(() => {
        return calculateWeeklyGoldRoster(
            characters.map((character) => ({
                id: character.id,
                name: character.name,
                itemLevel: parseItemLevel(character.itemLevel),
                raidIds: character.raidIds.filter(Boolean),
                earnsGold: character.earnsGold,
            })),
            raidOptions,
            goldLimitEnabled
        );
    }, [characters, goldLimitEnabled, raidOptions]);

    const visibleResults = useMemo(
        () => (goldLimitEnabled ? result.characters.filter((character) => character.earnsGold) : result.characters),
        [goldLimitEnabled, result.characters]
    );

    const loadRosterFromSearch = async () => {
        const trimmed = searchName.trim();
        if (!trimmed || isSearchingRoster) return;

        setIsSearchingRoster(true);
        setSearchStatus(null);

        try {
            const response = await fetch(`/api/lostark/character/${encodeURIComponent(trimmed)}`, {
                cache: "no-store",
            });
            const payload = await response.json();

            if (!response.ok || !Array.isArray(payload?.roster) || payload.roster.length === 0) {
                if (response.status === 429 || payload?.error === "TOO_MANY_REQUESTS") {
                    throw new Error("검색 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.");
                }

                throw new Error("캐릭터 정보를 찾을 수 없습니다.");
            }

            const sortedRoster = [...(payload.roster as ApiRosterCharacter[])].sort((a, b) => {
                const levelA = Number(a.itemLevelNum) || parseItemLevel(a.itemLevel ?? "");
                const levelB = Number(b.itemLevelNum) || parseItemLevel(b.itemLevel ?? "");
                return levelB - levelA;
            });

            const rosterCharacters = sortedRoster
                .map((character, index) => {
                    const itemLevel = Number(character.itemLevelNum) || parseItemLevel(character.itemLevel ?? "");
                    const recommended = recommendWeeklyGoldRaids(itemLevel, raidOptions, sortMode, 3);

                    return {
                        id: `${character.name || "character"}_${index}_${Date.now()}`,
                        name: character.name || `캐릭터 ${index + 1}`,
                        itemLevel: itemLevel > 0 ? String(itemLevel) : "0",
                        raidIds: [
                            recommended[0]?.id ?? "",
                            recommended[1]?.id ?? "",
                            recommended[2]?.id ?? "",
                        ] as [string, string, string],
                        earnsGold: index < 6,
                    };
                })
                .filter((character) => parseItemLevel(character.itemLevel) > 0);

            if (rosterCharacters.length === 0) {
                throw new Error("계산할 수 있는 원정대 캐릭터가 없습니다.");
            }

            setCharacters(rosterCharacters.slice(0, 12));
            setGoldLimitEnabled(true);
            setSearchStatus({
                type: "success",
                text: `${payload.name ?? trimmed} 원정대 ${rosterCharacters.length}명을 불러왔습니다.`,
            });
        } catch (error) {
            setSearchStatus({
                type: "error",
                text: error instanceof Error ? error.message : "원정대 정보를 불러오지 못했습니다.",
            });
        } finally {
            setIsSearchingRoster(false);
        }
    };

    const applyRecommendationAll = () => {
        setCharacters((prev) =>
            prev.map((character) => {
                const recommended = recommendWeeklyGoldRaids(
                    parseItemLevel(character.itemLevel),
                    raidOptions,
                    sortMode,
                    3
                );

                return {
                    ...character,
                    raidIds: [
                        recommended[0]?.id ?? "",
                        recommended[1]?.id ?? "",
                        recommended[2]?.id ?? "",
                    ],
                };
            })
        );
    };

    const reset = () => {
        setCharacters([makeCharacter(1)]);
        setSortMode("gold");
        setGoldLimitEnabled(true);
    };

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

            <div className="-mx-4 space-y-6 animate-in fade-in duration-300 sm:mx-0">
                <header className="px-4 pb-5 sm:px-0">
                    <div className="space-y-2">
                        <div className="text-xs font-medium text-[#5B69FF]">레이드 계산 도구</div>
                        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                            주간 레이드 수익 계산기
                        </h1>
                        <p className="max-w-3xl break-keep text-sm leading-relaxed text-gray-400">
                            캐릭터별 아이템 레벨과 레이드 3개를 기준으로 이번 주 거래 가능 골드, 귀속 골드,
                            전체 레이드 수익을 간단하게 계산합니다.
                        </p>
                    </div>
                </header>

                <div className="grid grid-cols-1 items-start gap-4 sm:gap-6 lg:grid-cols-[280px_1fr]">
                    <aside className="space-y-4">
                        <section className="overflow-hidden rounded-none border-y border-white/5 bg-[#16181D] sm:rounded-xl sm:border">
                            <div className="border-b border-white/5 px-5 py-4">
                                <h2 className="flex items-center gap-2 font-semibold text-white">
                                    <span className="h-4 w-1 rounded-full bg-indigo-500" />
                                    계산 설정
                                </h2>
                            </div>
                            <div className="space-y-6 p-5">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                                        추천 기준
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {[
                                            { value: "gold", label: "골드순" },
                                            { value: "latest", label: "최신순" },
                                        ].map((mode) => (
                                            <button
                                                key={mode.value}
                                                type="button"
                                                onClick={() => setSortMode(mode.value as WeeklyGoldSortMode)}
                                                className={`h-10 rounded-lg border text-sm font-bold transition-colors ${sortMode === mode.value
                                                    ? "border-indigo-500/40 bg-indigo-500/15 text-white"
                                                    : "border-white/10 bg-[#0F1014] text-gray-400 hover:bg-white/5"
                                                    }`}
                                            >
                                                {mode.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                                        골드 제한
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setGoldLimitEnabled((prev) => !prev)}
                                        className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors ${goldLimitEnabled
                                            ? "border-indigo-500/30 bg-indigo-500/10"
                                            : "border-white/10 bg-[#0F1014]"
                                            }`}
                                    >
                                        <span>
                                            <span className="block text-sm font-bold text-white">6캐릭 제한 적용</span>
                                            <span className="mt-1 block text-xs text-gray-500">
                                                아이템 레벨 상위 6캐릭터만 골드 합산
                                            </span>
                                        </span>
                                        <span
                                            className={`flex h-5 w-5 items-center justify-center rounded border ${goldLimitEnabled
                                                ? "border-indigo-400 bg-indigo-500 text-white"
                                                : "border-white/20 text-transparent"
                                                }`}
                                        >
                                            <Check className="h-3.5 w-3.5" strokeWidth={3} />
                                        </span>
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={applyRecommendationAll}
                                        className="inline-flex h-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 px-3 text-sm font-bold text-gray-200 hover:bg-white/10"
                                    >
                                        추천
                                    </button>
                                    <button
                                        type="button"
                                        onClick={reset}
                                        className="inline-flex h-10 items-center justify-center rounded-lg border border-white/10 bg-[#0F1014] px-3 text-sm font-bold text-gray-300 hover:bg-white/5"
                                    >
                                        초기화
                                    </button>
                                </div>
                            </div>
                        </section>

                        <section className="rounded-none border-y border-white/5 bg-[#16181D] p-5 sm:rounded-xl sm:border">
                            <h2 className="mb-3 text-sm font-bold text-gray-200">계산 방식</h2>
                            <ol className="space-y-2 break-keep text-[13px] leading-relaxed text-gray-400">
                                <li>1. 캐릭터명으로 원정대를 불러옵니다.</li>
                                <li>2. 아이템 레벨 기준으로 가능한 레이드 3개를 자동 추천합니다.</li>
                                <li>3. 거래 가능 골드와 귀속 골드를 나누어 합산합니다.</li>
                                <li>4. 6캐릭 제한을 켜면 아이템 레벨 상위 6캐릭터만 계산합니다.</li>
                            </ol>
                        </section>
                    </aside>

                    <main className="space-y-5">
                        <section className="rounded-none border-y border-white/5 bg-[#16181D] p-5 sm:rounded-xl sm:border">
                            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                    <h2 className="flex items-center gap-2 font-semibold text-white">
                                        <Search className="h-4 w-4 text-indigo-300" />
                                        캐릭터명으로 원정대 불러오기
                                    </h2>
                                    <p className="mt-1 break-keep text-xs leading-relaxed text-gray-500">
                                        검색한 캐릭터의 원정대 목록을 불러와 아이템 레벨 기준으로 레이드 3개를 자동 추천합니다.
                                    </p>
                                </div>
                            </div>

                            <form
                                className="grid gap-3 lg:grid-cols-[1fr_auto]"
                                onSubmit={(event) => {
                                    event.preventDefault();
                                    loadRosterFromSearch();
                                }}
                            >
                                <div className="relative">
                                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                                    <input
                                        value={searchName}
                                        onChange={(event) => setSearchName(event.target.value)}
                                        className="h-12 w-full rounded-lg border border-white/10 bg-[#0F1014] py-3 pl-11 pr-4 text-sm font-bold text-white outline-none transition-colors placeholder:text-gray-700 focus:border-indigo-500/50"
                                        placeholder="캐릭터명을 입력하세요"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={isSearchingRoster || !searchName.trim()}
                                    className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-indigo-500/30 bg-indigo-500/15 px-5 text-sm font-bold text-white transition-colors hover:bg-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {isSearchingRoster ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Search className="h-4 w-4" />
                                    )}
                                    원정대 불러오기
                                </button>
                            </form>

                            {searchStatus && (
                                <div
                                    className={`mt-3 flex items-start gap-2 rounded-lg border px-4 py-3 text-sm font-bold ${searchStatus.type === "success"
                                        ? "border-indigo-500/20 bg-indigo-500/10 text-indigo-100"
                                        : "border-red-500/20 bg-red-500/10 text-red-100"
                                        }`}
                                >
                                    {searchStatus.type === "success" ? (
                                        <Check className="mt-0.5 h-4 w-4 shrink-0" />
                                    ) : (
                                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                                    )}
                                    <span className="break-keep">{searchStatus.text}</span>
                                </div>
                            )}
                        </section>

                        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            <SummaryCard
                                label="총 주간 수익"
                                value={`${formatGold(result.totalGold)} G`}
                                tone="text-white"
                            />
                            <SummaryCard
                                label="거래 가능 골드"
                                value={`${formatGold(result.gold)} G`}
                                tone="text-indigo-200"
                            />
                            <SummaryCard
                                label="귀속 골드"
                                value={`${formatGold(result.boundGold)} G`}
                                tone="text-blue-200"
                            />
                            <SummaryCard
                                label="계산 대상"
                                value={`${result.countedCharacters}명`}
                                subText={`(${result.selectedRaidCount}개 레이드)`}
                                tone="text-gray-100"
                            />
                        </section>

                        <section className="overflow-hidden rounded-none border-y border-white/5 bg-[#16181D] sm:rounded-sm sm:border">
                            <div className="border-b border-white/5 px-5 py-4">
                                <h2 className="text-sm font-bold text-white sm:text-base">계산 결과 상세</h2>
                                <p className="mt-1 text-xs text-gray-500 break-keep">
                                    아이템 레벨 기준으로 자동 추천된 레이드 3개를 캐릭터별로 보여줍니다.
                                </p>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[760px] text-center text-sm">
                                    <thead className="bg-[#0F1014] text-center text-[11px] uppercase tracking-wider text-gray-500">
                                        <tr>
                                            <th className="px-5 py-3">캐릭터</th>
                                            <th className="px-5 py-3">레이드</th>
                                            <th className="px-5 py-3">거래 가능</th>
                                            <th className="px-5 py-3">귀속</th>
                                            <th className="px-5 py-3">합계</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {visibleResults.map((character) => (
                                            <tr key={character.id} className={character.earnsGold ? "text-gray-300" : "text-gray-500"}>
                                                <td className="px-5 py-4 align-top text-center">
                                                    <div className="font-bold text-white">{character.name}</div>
                                                    <div className="mt-1 text-xs text-gray-500">
                                                        {character.itemLevel || 0} / {character.earnsGold ? "골드 포함" : "골드 제외"}
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4 text-center">
                                                    <div className="flex flex-wrap justify-center gap-2">
                                                        {character.raids.length > 0 ? (
                                                            character.raids.map((raid) => (
                                                                <span
                                                                    key={raid.id}
                                                                    className="rounded-full bg-white/5 px-2.5 py-1 text-xs font-bold text-gray-300"
                                                                >
                                                                    {raid.raidName} {raid.difficulty}
                                                                </span>
                                                            ))
                                                        ) : (
                                                            <span className="text-xs text-gray-500">선택 없음</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4 text-center font-bold text-indigo-100">
                                                    {formatGold(character.gold)} G
                                                </td>
                                                <td className="px-5 py-4 text-center font-bold text-blue-100">
                                                    {formatGold(character.boundGold)} G
                                                </td>
                                                <td className="px-5 py-4 text-center text-base font-bold text-white">
                                                    {formatGold(character.totalGold)} G
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        <section className="space-y-5 rounded-none border-y border-white/5 bg-[#16181D] p-5 sm:rounded-xl sm:border">
                            <div className="space-y-2">
                                <h2 className="text-xl font-bold text-gray-100">주간 레이드 수익 계산기란?</h2>
                                <p className="break-keep text-sm leading-relaxed text-gray-400">
                                    캐릭터별로 진행할 레이드 3개를 정하고, 한 주에 받을 수 있는 거래 가능 골드와 귀속 골드를
                                    빠르게 비교하는 계산기입니다. 실제 레이드 선택이나 더보기 여부는 게임 내 상황에 맞게 조정해 주세요.
                                </p>
                            </div>

                            <div className="grid gap-4 md:grid-cols-3">
                                <InfoBlock
                                    title="거래 가능 골드"
                                    body="거래소 이용이나 캐릭터 간 사용이 가능한 일반 골드를 따로 합산합니다."
                                />
                                <InfoBlock
                                    title="귀속 골드"
                                    body="레이드 보상에 포함된 귀속 골드를 분리해서 보여주므로 실제 사용 가능한 골드와 구분할 수 있습니다."
                                />
                                <InfoBlock
                                    title="6캐릭 제한"
                                    body="골드 획득 캐릭터를 체크해두면 원정대 기준으로 계산에 포함할 캐릭터를 따로 볼 수 있습니다."
                                />
                            </div>
                        </section>
                    </main>
                </div>
            </div>
        </>
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
            <div className={`text-2xl font-bold ${tone}`}>
                {value}
                {subText && <span className="ml-2 align-middle text-xs font-bold text-gray-500">{subText}</span>}
            </div>
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
