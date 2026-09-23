// components/tasks/EditTasksModal.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { raidInformation, type DifficultyKey } from "@/server/data/raids";
import type { RosterCharacter } from "../AddAccount";
import { CharacterTaskPrefs } from "@/app/lib/tasks/raid-prefs";
import {
    RAID_PRIORITY_SORT_OPTIONS,
    sortRaidEntriesByPriority,
    type RaidPrioritySortMode,
} from "@/app/lib/tasks/raid-utils";
import { Lock, Search, Swords } from "lucide-react";

const DIFF_STYLES = {
    하드: {
        check: "bg-[#FF5252] text-white border-[#FF5252]",
        hover: "hover:text-[#FF5252] hover:bg-[#FF5252]/10 hover:border-[#FF5252]/30",
    },
    노말: {
        check: "bg-[#5B69FF] text-white border-[#5B69FF]",
        hover: "hover:text-[#5B69FF] hover:bg-[#5B69FF]/10 hover:border-[#5B69FF]/30",
    },
    나메: {
        check: "bg-[#6D28D9] text-white border-[#6D28D9]",
        hover: "hover:text-[#6D28D9] hover:bg-[#6D28D9]/10 hover:border-[#6D28D9]/30",
    },
    싱글: {
        check: "bg-[#F1F5F9] text-[#111217] border-[#F1F5F9] font-bold",
        hover: "hover:text-[#F1F5F9] hover:bg-[#F1F5F9]/10 hover:border-[#F1F5F9]/30",
    },
} as const;

type Props = {
    open: boolean;
    onClose: () => void;
    character: RosterCharacter;
    initial?: CharacterTaskPrefs | null;
    lockedRaidNames?: string[];
    onSave: (prefs: CharacterTaskPrefs) => void;
};

// 1. isGold 기본값 추가
function makeDefaultPref(
    info: (typeof raidInformation)[string],
    ilvl: number
): { enabled: boolean; difficulty: DifficultyKey; gates: number[]; isBonus: boolean; isGold: boolean } {
    const nightmare = info.difficulty["나메"];
    const hard = info.difficulty["하드"];
    const normal = info.difficulty["노말"];
    const single = info.difficulty["싱글"];

    const nightmareOk = !!(nightmare && ilvl >= nightmare.level);
    const hardOk = !!(hard && ilvl >= hard.level);
    const normalOk = !!(normal && ilvl >= normal.level);
    const singleOk = !!(single && ilvl >= single.level);

    const picked: DifficultyKey = nightmareOk ? "나메" : hardOk ? "하드" : normalOk ? "노말" : singleOk ? "싱글" : "노말";

    const enabled = false;
    const gates: number[] = [];

    return { enabled, difficulty: picked, gates, isBonus: false, isGold: false };
}

function getDisplayDifficulty(raidName: string, difficulty: DifficultyKey | string) {
    if (raidName === "지평의 성당") {
        if (difficulty === "노말") return "1단계";
        if (difficulty === "하드") return "2단계";
        if (difficulty === "나메") return "3단계";
    }
    return difficulty;
}

export default function EditTasksModal({ open, onClose, character, initial, lockedRaidNames = [], onSave }: Props) {
    const ilvl = character.itemLevelNum ?? 0;
    const [state, setState] = useState<CharacterTaskPrefs>({ raids: {} });
    const [sortMode, setSortMode] = useState<RaidPrioritySortMode>("recommended");
    const [raidSearch, setRaidSearch] = useState("");

    useEffect(() => {
        if (!open) return;
        const originalStyle = window.getComputedStyle(document.body).overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = originalStyle;
        };
    }, [open]);

    useEffect(() => {
        if (!open) return;

        const base: CharacterTaskPrefs = initial ?? { raids: {} };
        const raids = Object.fromEntries(
            Object.entries(base.raids ?? {}).filter(([raidName]) => !!raidInformation[raidName])
        ) as CharacterTaskPrefs["raids"];
        const order = base.order?.filter((raidName) => !!raids[raidName]);
        const baseWithoutOrder = { ...base };
        delete baseWithoutOrder.order;
        const filled: CharacterTaskPrefs = {
            ...baseWithoutOrder,
            raids,
            ...(order && order.length > 0 ? { order } : {}),
        };

        for (const [raidName, info] of Object.entries(raidInformation)) {
            if (!filled.raids[raidName]) {
                filled.raids[raidName] = makeDefaultPref(info, ilvl);
            }
        }
        setState(filled);
    }, [open, initial, ilvl]);

    const enabledCount = useMemo(
        () => Object.values(state.raids ?? {}).filter((raid) => raid.enabled).length,
        [state.raids]
    );

    const regularGoldCount = useMemo(
        () =>
            Object.entries(state.raids ?? {}).filter(
                ([raidName, raid]) =>
                    raid.enabled &&
                    raid.isGold &&
                    raidInformation[raidName]?.kind !== "익스트림"
            ).length,
        [state.raids]
    );

    const displayedRaidEntries = useMemo(() => {
        const query = raidSearch.trim().toLowerCase();
        const entries = Object.entries(raidInformation).filter(([raidName, info]) => {
            if (!query) return true;
            return raidName.toLowerCase().includes(query) || info.kind.toLowerCase().includes(query);
        });

        return sortRaidEntriesByPriority(entries, sortMode, ilvl);
    }, [ilvl, raidSearch, sortMode]);

    const handleAutoSelect = (mode: "top3" | "all" | "none") => {
        setState((s) => {
            const updatedRaids = { ...s.raids };
            const raidEntries = Object.entries(raidInformation);

            if (mode === "top3") {
                const candidates: {
                    raidName: string;
                    difficulty: DifficultyKey;
                    levelReq: number;
                    gold: number;
                }[] = [];
                const extremeCandidates: typeof candidates = [];

                for (const [raidName, info] of raidEntries) {
                    const nightmare = info.difficulty["나메"];
                    const hard = info.difficulty["하드"];
                    const normal = info.difficulty["노말"];
                    const single = info.difficulty["싱글"];

                    let pickedDiff: DifficultyKey | null = null;
                    let levelReq = 0;
                    let diffInfo = null;

                    if (nightmare && ilvl >= nightmare.level) {
                        pickedDiff = "나메";
                        levelReq = nightmare.level;
                        diffInfo = nightmare;
                    } else if (hard && ilvl >= hard.level) {
                        pickedDiff = "하드";
                        levelReq = hard.level;
                        diffInfo = hard;
                    } else if (normal && ilvl >= normal.level) {
                        pickedDiff = "노말";
                        levelReq = normal.level;
                        diffInfo = normal;
                    } else if (single && ilvl >= single.level) {
                        pickedDiff = "싱글";
                        levelReq = single.level;
                        diffInfo = single;
                    } else {
                        continue;
                    }

                    const totalGold = (diffInfo.gates ?? []).reduce(
                        (sum, g) => sum + (g.gold || 0),
                        0
                    );

                    const candidate = { raidName, difficulty: pickedDiff, levelReq, gold: totalGold };
                    if (info.kind === "익스트림") {
                        extremeCandidates.push(candidate);
                    } else {
                        candidates.push(candidate);
                    }
                }

                const top3 = candidates
                    .sort((a, b) => {
                        const infoA = raidInformation[a.raidName];
                        const infoB = raidInformation[b.raidName];
                        const dateA = infoA?.releaseDate || "2000-01-01";
                        const dateB = infoB?.releaseDate || "2000-01-01";

                        if (dateA !== dateB) return dateB.localeCompare(dateA);
                        if (b.gold !== a.gold) return b.gold - a.gold;
                        return b.levelReq - a.levelReq;
                    })
                    .slice(0, 3);
                const extreme = lockedRaidNames.length
                    ? []
                    : extremeCandidates
                        .sort((a, b) => b.levelReq - a.levelReq || b.gold - a.gold)
                        .slice(0, 1);
                const selectedRaids = [...top3, ...extreme];

                for (const [raidName, pref] of Object.entries(updatedRaids)) {
                    updatedRaids[raidName] = { ...pref, enabled: false, gates: [], isGold: false }; // 초기화 시 골드도 해제
                }

                for (const { raidName, difficulty } of selectedRaids) {
                    updatedRaids[raidName] = {
                        ...(updatedRaids[raidName] ?? { gates: [] }),
                        enabled: true,
                        difficulty,
                        isGold: true, // 일반 3개와 익스트림 +1 모두 골드 지정
                    };
                }
            } else if (mode === "all" || mode === "none") {
                const visible = mode === "all";
                for (const [raidName] of raidEntries) {
                    updatedRaids[raidName] = {
                        ...updatedRaids[raidName],
                        enabled: visible,
                        isGold: mode === "none" ? false : updatedRaids[raidName].isGold, // 전체 해제 시 골드 체크도 해제
                    };
                }
            }
            return { raids: updatedRaids };
        });
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-0">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity" onClick={onClose} />
            <div className="relative w-full max-w-[min(800px,92vw)] flex flex-col rounded-xl bg-[#16181D] shadow-2xl border border-white/10 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <header className="px-5 py-5 sm:px-8 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#16181D]">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h2 className="text-xl font-bold text-white tracking-tight">{character.name}</h2>
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#5B69FF]/20 text-[#8eaaff] border border-[#5B69FF]/30">
                                Lv. {ilvl.toLocaleString()}
                            </span>
                        </div>
                        <p className="text-xs sm:text-sm text-gray-400 leading-snug">
                            이 캐릭터의 군단장 / 카제로스 / 익스트림 / 어비스 / 에픽 숙제를 설정합니다.
                        </p>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto max-h-[55vh] p-4 sm:max-h-[65vh] sm:p-5 bg-[#121418] custom-scrollbar">
                    <div className="mb-5 space-y-3">
                        <div className="flex gap-2 overflow-x-auto pb-1">
                            <button onClick={() => handleAutoSelect("top3")} className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-gray-400 text-xs hover:bg-white/10 hover:text-white transition-colors whitespace-nowrap">
                                상위 3개 + 익스트림
                            </button>
                            <button onClick={() => handleAutoSelect("all")} className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-gray-400 text-xs hover:bg-white/10 hover:text-white transition-colors whitespace-nowrap">
                                전체 선택
                            </button>
                            <button onClick={() => handleAutoSelect("none")} className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-gray-400 text-xs hover:bg-white/10 hover:text-white transition-colors whitespace-nowrap">
                                전체 해제
                            </button>
                        </div>

                        <div className="flex flex-col gap-2 rounded-xl border border-white/10 bg-[#16181D] p-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <div className="text-xs font-bold text-gray-300">정렬 기준</div>
                                <div className="text-[11px] text-gray-500">캐릭터 Lv. {ilvl.toLocaleString()} 기준</div>
                            </div>
                            <div className="grid grid-cols-3 gap-1 rounded-lg bg-[#0F1116] p-1">
                                {RAID_PRIORITY_SORT_OPTIONS.map((option) => (
                                    <button
                                        key={option.key}
                                        type="button"
                                        onClick={() => setSortMode(option.key)}
                                        className={`rounded-md px-2 py-1.5 text-[11px] font-bold transition-colors ${sortMode === option.key
                                            ? "bg-[#5B69FF] text-white"
                                            : "text-gray-400 hover:bg-white/5 hover:text-white"
                                            }`}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="relative">
                            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                            <input
                                value={raidSearch}
                                onChange={(e) => setRaidSearch(e.target.value)}
                                placeholder="레이드 검색"
                                className="h-11 w-full rounded-xl border border-white/10 bg-[#0F1116] pl-9 pr-3 text-sm font-medium text-white outline-none transition-colors placeholder:text-gray-600 focus:border-[#5B69FF]/60"
                            />
                        </div>
                    </div>

                    {[displayedRaidEntries].map((entries) => {
                        if (!entries.length) {
                            return (
                                <div key="empty-raids" className="rounded-xl border border-white/10 bg-[#16181D] px-4 py-8 text-center text-sm text-gray-500">
                                    검색 결과가 없습니다.
                                </div>
                            );
                        }

                        return (
                            <section key="all-raids" className="space-y-4 pb-8">
                                <div className="top-0 z-10 py-2 -mx-2 px-2 bg-[#121418]/95 backdrop-blur border-b border-white/5">
                                    <h4 className="flex items-center gap-2 text-xs font-bold text-gray-300 uppercase tracking-[0.18em]">
                                        <Swords size={14} className="text-[#5B69FF]" />
                                        레이드 목록
                                    </h4>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    {entries.map(([raidName, info]) => {
                                        const pref = state.raids[raidName] ?? makeDefaultPref(info, ilvl);
                                        const isRosterLocked = !pref.enabled && lockedRaidNames.includes(raidName);
                                        const nightmare = info.difficulty["나메"];
                                        const hard = info.difficulty["하드"];
                                        const normal = info.difficulty["노말"];
                                        const single = info.difficulty["싱글"];

                                        const nightmareOk = !!(nightmare && ilvl >= nightmare.level);
                                        const hardOk = !!(hard && ilvl >= hard.level);
                                        const normalOk = !!(normal && ilvl >= normal.level);
                                        const singleOk = !!(single && ilvl >= single.level);

                                        const displayDiff = getDisplayDifficulty(raidName, pref.difficulty);
                                        const curText = pref.difficulty === "나메" ? (nightmare ? `${displayDiff} ${nightmare.level}` : displayDiff)
                                            : pref.difficulty === "하드" ? (hard ? `${displayDiff} ${hard.level}` : displayDiff)
                                                : pref.difficulty === "싱글" ? (single ? `${displayDiff} ${single.level}` : displayDiff)
                                                    : (normal ? `${displayDiff} ${normal.level}` : displayDiff);

                                        return (
                                            <div
                                                key={raidName}
                                                className={`group relative rounded-xl border p-4 transition-all duration-200 ${pref.enabled ? "bg-[#1E222B] border-white/10 shadow-lg shadow-black/20" : "bg-[#16181D] border-white/5 opacity-80 grayscale-[0.3]"}`}
                                            >
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-1 h-8 rounded-full ${pref.enabled ? "bg-[#5B69FF]" : "bg-gray-700"}`} />
                                                        <div>
                                                            <div className={`font-bold flex flex-wrap items-center gap-2.5 ${pref.enabled ? "text-white" : "text-gray-400"}`}>
                                                                <span className="text-[14px] sm:text-[15px]">{raidName}</span>
                                                                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-bold text-gray-500">
                                                                    {info.kind}
                                                                </span>

                                                                {pref.enabled && (
                                                                    <div className="flex items-center gap-1.5">
                                                                        {/* 4. 골드 체크 버튼 추가 */}
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                const isExtremeRaid = info.kind === "익스트림";
                                                                                if (!pref.isGold && !isExtremeRaid && regularGoldCount >= 3) {
                                                                                    alert("일반 레이드는 캐릭터당 최대 3개, 익스트림은 원정대당 1개까지 골드 지정할 수 있습니다.");
                                                                                    return;
                                                                                }
                                                                                setState((s) => ({
                                                                                    ...s,
                                                                                    raids: {
                                                                                        ...s.raids,
                                                                                        [raidName]: { ...pref, isGold: !pref.isGold },
                                                                                    },
                                                                                }));
                                                                            }}
                                                                            className={`
                                                                                flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide transition-all duration-200 border
                                                                                ${pref.isGold
                                                                                    ? "bg-[#EAB308]/10 text-[#FDE047] border-[#EAB308]/30"
                                                                                    : "bg-[#121418] text-gray-500 border-white/5 hover:bg-white/10 hover:text-gray-300 hover:border-white/10"
                                                                                }
                                                                                ${!pref.isGold && info.kind !== "익스트림" && regularGoldCount >= 3 ? "opacity-50 cursor-not-allowed" : ""}
                                                                            `}
                                                                        >
                                                                            <div className={`w-1.5 h-1.5 rounded-full transition-colors ${pref.isGold
                                                                                ? "bg-[#EAB308] shadow-[0_0_4px_rgba(234,179,8,0.8)]"
                                                                                : "bg-gray-600"
                                                                                }`} />
                                                                            골드
                                                                        </button>

                                                                        {/* 기존 더보기 버튼 */}
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setState((s) => ({
                                                                                    ...s,
                                                                                    raids: {
                                                                                        ...s.raids,
                                                                                        [raidName]: { ...pref, isBonus: !pref.isBonus },
                                                                                    },
                                                                                }));
                                                                            }}
                                                                            className={`
                                                                                flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide transition-all duration-200 border
                                                                                ${pref.isBonus
                                                                                    ? "bg-[#5B69FF]/10 text-[#8eaaff] border-[#5B69FF]/30"
                                                                                    : "bg-[#121418] text-gray-500 border-white/5 hover:bg-white/10 hover:text-gray-300 hover:border-white/10"
                                                                                }
                                                                            `}
                                                                        >
                                                                            <div className={`w-1.5 h-1.5 rounded-full transition-colors ${pref.isBonus
                                                                                ? "bg-[#5B69FF] shadow-[0_0_4px_rgba(91,105,255,0.8)]"
                                                                                : "bg-gray-600"
                                                                                }`} />
                                                                            더보기
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="text-xs text-gray-500">{curText}</div>
                                                        </div>
                                                    </div>

                                                    <label className={`relative inline-flex items-center ${isRosterLocked ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}>
                                                        <input
                                                            type="checkbox"
                                                            className="sr-only peer"
                                                            checked={pref.enabled}
                                                            disabled={isRosterLocked}
                                                            onChange={(e) =>
                                                                setState((s) => {
                                                                    const prev = s.raids[raidName] ?? makeDefaultPref(info, ilvl);
                                                                    const enabled = e.target.checked;

                                                                    return {
                                                                        raids: {
                                                                            ...s.raids,
                                                                            [raidName]: {
                                                                                ...prev,
                                                                                enabled,
                                                                                gates: [],
                                                                                isGold: enabled ? prev.isGold : false,
                                                                                isBonus: enabled ? prev.isBonus : false,
                                                                            },
                                                                        },
                                                                    };
                                                                })
                                                            }
                                                        />
                                                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#5B69FF] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#5B69FF]" />
                                                    </label>
                                                </div>

                                                <div className="bg-[#121418] p-1 rounded-lg grid grid-cols-4 gap-1">
                                                    {[
                                                        { key: "싱글", info: single, ok: singleOk },
                                                        { key: "노말", info: normal, ok: normalOk },
                                                        { key: "하드", info: hard, ok: hardOk },
                                                        { key: "나메", info: nightmare, ok: nightmareOk },
                                                    ].map(({ key, info: dInfo, ok }) => {
                                                        const diffKey = key as DifficultyKey;
                                                        const style = DIFF_STYLES[diffKey] || DIFF_STYLES["노말"];
                                                        const isSelected = pref.enabled && pref.difficulty === key;

                                                        return (
                                                            <button
                                                                key={key}
                                                                disabled={!ok || !pref.enabled}
                                                                onClick={() =>
                                                                    setState((s) => {
                                                                        const prev = s.raids[raidName] ?? makeDefaultPref(info, ilvl);
                                                                        return {
                                                                            raids: {
                                                                                ...s.raids,
                                                                                [raidName]: {
                                                                                    ...prev,
                                                                                    difficulty: key as DifficultyKey,
                                                                                    gates: [],
                                                                                },
                                                                            },
                                                                        };
                                                                    })
                                                                }
                                                                className={`relative flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-md transition-all ${isSelected ? style.check : `bg-[#2A2E39]/50 text-gray-500 hover:text-gray-300 hover:bg-white/5`} ${!ok && "opacity-40 cursor-not-allowed"}`}
                                                            >
                                                                {!ok && <Lock size={10} />}
                                                                {getDisplayDifficulty(raidName, key)}
                                                                {dInfo && <span className={`opacity-60 text-[9px] sm:text-[10px]`}>{dInfo.level}</span>}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                                {isRosterLocked && (
                                                    <p className="mt-2 text-[11px] text-amber-300/80">익스트림은 원정대당 1개 캐릭터만 등록할 수 있습니다.</p>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        );
                    })}
                </div>

                <footer className="px-5 py-4 sm:px-8 bg-[#16181D] border-t border-white/10 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
                    <div className="flex gap-2 w-full sm:w-auto">
                        <button
                            onClick={onClose}
                            className="flex-1 sm:flex-none px-4 h-10 rounded-lg border border-white/10 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                        >
                            취소
                        </button>
                    </div>

                    <button
                        onClick={() => onSave(state)}
                        className="w-full sm:w-auto px-6 h-10 rounded-lg bg-[#5B69FF] hover:bg-[#4A57E6] text-white text-sm font-bold transition-all active:scale-95 flex items-center justify-center"
                    >
                        설정 완료 ({enabledCount})
                    </button>
                </footer>

                <style jsx global>{`
          .custom-scrollbar::-webkit-scrollbar { width: 6px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: #16181d; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #444; }
        `}</style>
            </div>
        </div>
    );
}
