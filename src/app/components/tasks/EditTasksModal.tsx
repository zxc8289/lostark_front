// components/tasks/EditTasksModal.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { raidInformation, type DifficultyKey } from "@/server/data/raids";
import type { RosterCharacter } from "../AddAccount";
import { CharacterTaskPrefs } from "@/app/lib/tasks/raid-prefs";
import { Lock, Swords } from "lucide-react";

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

export default function EditTasksModal({ open, onClose, character, initial, onSave }: Props) {
    const ilvl = character.itemLevelNum ?? 0;
    const [state, setState] = useState<CharacterTaskPrefs>({ raids: {} });

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
        const filled: CharacterTaskPrefs = { raids: { ...base.raids } };

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

    const goldCount = useMemo(
        () => Object.entries(state.raids ?? {}).filter(([rName, raid]) => raid.isGold && rName !== "1막-에기르 EX").length,
        [state.raids]
    );

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

                    candidates.push({ raidName, difficulty: pickedDiff, levelReq, gold: totalGold });
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

                for (const [raidName, pref] of Object.entries(updatedRaids)) {
                    updatedRaids[raidName] = { ...pref, enabled: false, gates: [], isGold: false }; // 초기화 시 골드도 해제
                }

                for (const { raidName, difficulty } of top3) {
                    updatedRaids[raidName] = {
                        ...(updatedRaids[raidName] ?? { gates: [] }),
                        enabled: true,
                        difficulty,
                        isGold: true, // 3. 상위 3개 자동 선택 시 골드도 자동 지정
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
                            이 캐릭터의 군단장 / 카제로스 / 어비스 / 에픽 숙제를 설정합니다.
                        </p>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto max-h-[55vh] p-4 sm:max-h-[65vh] sm:p-5 bg-[#121418] custom-scrollbar">
                    <div className="flex gap-2 mb-4">
                        <button onClick={() => handleAutoSelect("top3")} className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-gray-400 text-xs hover:bg-white/10 hover:text-white transition-colors whitespace-nowrap">
                            상위 3개 레이드
                        </button>
                        <button onClick={() => handleAutoSelect("all")} className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-gray-400 text-xs hover:bg-white/10 hover:text-white transition-colors whitespace-nowrap">
                            전체 선택
                        </button>
                        <button onClick={() => handleAutoSelect("none")} className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-gray-400 text-xs hover:bg-white/10 hover:text-white transition-colors whitespace-nowrap">
                            전체 해제
                        </button>
                    </div>

                    {(["군단장", "카제로스", "어비스", "에픽", "그림자"] as const).map((kind) => {
                        const entries = Object.entries(raidInformation).filter(([, v]) => v.kind === kind);
                        if (!entries.length) return null;

                        return (
                            <section key={kind} className="space-y-4 pb-8">
                                <div className="top-0 z-10 py-2 -mx-2 px-2 bg-[#121418]/95 backdrop-blur border-b border-white/5">
                                    <h4 className="flex items-center gap-2 text-xs font-bold text-gray-300 uppercase tracking-[0.18em]">
                                        <Swords size={14} className="text-[#5B69FF]" />
                                        {kind}
                                    </h4>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    {entries.map(([raidName, info]) => {
                                        const pref = state.raids[raidName] ?? makeDefaultPref(info, ilvl);
                                        const nightmare = info.difficulty["나메"];
                                        const hard = info.difficulty["하드"];
                                        const normal = info.difficulty["노말"];
                                        const single = info.difficulty["싱글"];

                                        const nightmareOk = !!(nightmare && ilvl >= nightmare.level);
                                        const hardOk = !!(hard && ilvl >= hard.level);
                                        const normalOk = !!(normal && ilvl >= normal.level);
                                        const singleOk = !!(single && ilvl >= single.level);

                                        const curInfo = pref.difficulty === "나메" ? nightmare : pref.difficulty === "하드" ? hard : pref.difficulty === "싱글" ? single : normal;
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
                                                            <div className={`font-bold flex items-center gap-2.5 ${pref.enabled ? "text-white" : "text-gray-400"}`}>
                                                                <span className="text-[14px] sm:text-[15px]">{raidName}</span>

                                                                {pref.enabled && (
                                                                    <div className="flex items-center gap-1.5">
                                                                        {/* 4. 골드 체크 버튼 추가 */}
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                if (raidName !== "1막-에기르 EX" && !pref.isGold && goldCount >= 3) {
                                                                                    alert("골드 획득은 캐릭터당 최대 3개까지만 지정할 수 있습니다. (익스트림 제외)");
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
                                                                                ${raidName !== "1막-에기르 EX" && !pref.isGold && goldCount >= 3 ? "opacity-50 cursor-not-allowed" : ""}
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

                                                    <label className="relative inline-flex items-center cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            className="sr-only peer"
                                                            checked={pref.enabled}
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
                                                                                gates: enabled ? [] : prev.gates,
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