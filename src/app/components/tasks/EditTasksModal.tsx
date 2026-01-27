// components/tasks/EditTasksModal.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { raidInformation, type DifficultyKey } from "@/server/data/raids";
import type { RosterCharacter } from "../AddAccount";
import { CharacterTaskPrefs } from "@/app/lib/tasks/raid-prefs";
import { Lock, Swords } from "lucide-react";

// 🎨 난이도별 색상 스타일 정의
const DIFF_STYLES = {
    하드: {
        check: "bg-[#FF5252] text-white border-[#FF5252] shadow-[0_0_12px_rgba(255,82,82,0.55)]",
        // idle 상태는 아래에서 공통으로 처리하므로 hover만 정의해도 됨 (필요시 사용)
        hover: "hover:text-[#FF5252] hover:bg-[#FF5252]/10 hover:border-[#FF5252]/30",
    },
    노말: {
        check: "bg-[#5B69FF] text-white border-[#5B69FF] shadow-[0_0_12px_rgba(91,105,255,0.55)]",
        hover: "hover:text-[#5B69FF] hover:bg-[#5B69FF]/10 hover:border-[#5B69FF]/30",
    },
    나메: {
        check: "bg-[#6D28D9] text-white border-[#6D28D9] shadow-[0_0_12px_rgba(109,40,217,0.55)]",
        hover: "hover:text-[#6D28D9] hover:bg-[#6D28D9]/10 hover:border-[#6D28D9]/30",
    },
} as const;

type Props = {
    open: boolean;
    onClose: () => void;
    character: RosterCharacter;
    initial?: CharacterTaskPrefs | null;
    onSave: (prefs: CharacterTaskPrefs) => void;
};

function makeDefaultPref(
    info: (typeof raidInformation)[string],
    ilvl: number
): { enabled: boolean; difficulty: DifficultyKey; gates: number[] } {
    const nightmare = info.difficulty["나메"];
    const hard = info.difficulty["하드"];
    const normal = info.difficulty["노말"];

    const nightmareOk = !!(nightmare && ilvl >= nightmare.level);
    const hardOk = !!(hard && ilvl >= hard.level);
    const normalOk = !!(normal && ilvl >= normal.level);

    const picked: DifficultyKey = nightmareOk ? "나메" : hardOk ? "하드" : "노말";

    const enabled = false;
    const gates: number[] = [];
    return { enabled, difficulty: picked, gates };
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
        () =>
            Object.values(state.raids ?? {}).filter((raid) => raid.enabled).length,
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
                    } else {
                        continue;
                    }

                    const totalGold = (diffInfo.gates ?? []).reduce(
                        (sum, g) => sum + (g.gold || 0),
                        0
                    );

                    candidates.push({
                        raidName,
                        difficulty: pickedDiff,
                        levelReq,
                        gold: totalGold
                    });
                }

                const top3 = candidates.sort((a, b) => {
                    const infoA = raidInformation[a.raidName];
                    const infoB = raidInformation[b.raidName];
                    const dateA = infoA?.releaseDate || "2000-01-01";
                    const dateB = infoB?.releaseDate || "2000-01-01";

                    if (dateA !== dateB) {
                        return dateB.localeCompare(dateA);
                    }
                    if (b.gold !== a.gold) {
                        return b.gold - a.gold;
                    }
                    return b.levelReq - a.levelReq;
                }).slice(0, 3);

                for (const [raidName, pref] of Object.entries(updatedRaids)) {
                    updatedRaids[raidName] = {
                        ...pref,
                        enabled: false,
                        gates: [],
                    };
                }

                for (const { raidName, difficulty } of top3) {
                    updatedRaids[raidName] = {
                        ...(updatedRaids[raidName] ?? { gates: [] }),
                        enabled: true,
                        difficulty,
                    };
                }
            } else if (mode === "all" || mode === "none") {
                const visible = mode === "all";
                for (const [raidName] of raidEntries) {
                    updatedRaids[raidName] = {
                        ...updatedRaids[raidName],
                        enabled: visible,
                    };
                }
            }
            return { raids: updatedRaids };
        });
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-0">
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            <div className="relative w-full max-w-[min(800px,92vw)] flex flex-col rounded-xl bg-[#16181D] shadow-2xl border border-white/10 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <header className="px-5 py-5 sm:px-8 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#16181D]">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h2 className="text-xl font-bold text-white tracking-tight">
                                {character.name}
                            </h2>
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
                    <div className="flex gap-2 mb-4 ">
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
                        const entries = Object.entries(raidInformation).filter(
                            ([, v]) => v.kind === kind
                        );
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

                                        const nightmareOk = !!(nightmare && ilvl >= nightmare.level);
                                        const hardOk = !!(hard && ilvl >= hard.level);
                                        const normalOk = !!(normal && ilvl >= normal.level)

                                        const curInfo = pref.difficulty === "나메" ? nightmare : pref.difficulty === "하드" ? hard : normal;
                                        const curText = pref.difficulty === "나메"
                                            ? (nightmare ? `나메 ${nightmare.level}` : "나메")
                                            : pref.difficulty === "하드"
                                                ? (hard ? `하드 ${hard.level}` : "하드")
                                                : (normal ? `노말 ${normal.level}` : "노말");

                                        return (
                                            <div
                                                key={raidName}
                                                className={`
                                                    group relative rounded-xl border p-4 transition-all duration-200
                                                    ${pref.enabled
                                                        ? "bg-[#1E222B] border-white/10 shadow-lg shadow-black/20"
                                                        : "bg-[#16181D] border-white/5 opacity-80 grayscale-[0.3]"
                                                    }
                                                `}
                                            >
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-1 h-8 rounded-full ${pref.enabled ? "bg-[#5B69FF]" : "bg-gray-700"}`} />
                                                        <div>
                                                            <div className={`font-bold ${pref.enabled ? "text-white" : "text-gray-400"}`}>
                                                                {raidName}
                                                            </div>
                                                            <div className="text-xs text-gray-500">
                                                                {curText}
                                                            </div>
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

                                                {/* 난이도 선택 (Segmented Control) */}
                                                <div className="bg-[#121418] p-1 rounded-lg grid grid-cols-3 gap-1">
                                                    {[
                                                        { key: "노말", info: normal, ok: normalOk },
                                                        { key: "하드", info: hard, ok: hardOk },
                                                        { key: "나메", info: nightmare, ok: nightmareOk },
                                                    ].map(({ key, info: dInfo, ok }) => {
                                                        const diffKey = key as DifficultyKey;
                                                        const style = DIFF_STYLES[diffKey] || DIFF_STYLES["노말"];

                                                        const isSelected = pref.enabled && pref.difficulty === key;

                                                        // (참고) 레이드가 꺼져있어도 내부적으로 어떤 난이도인지 알 수 있게 하려면 아래처럼 옅게 표시할 수도 있습니다.
                                                        // 하지만 "선택 안 한 것처럼" 보이려면 위 조건이 맞습니다.

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
                                                                className={`
                                                                    relative flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-md transition-all
                                                                    ${isSelected
                                                                        ? style.check // 켜져있고 선택됨: 화려한 색상
                                                                        : `bg-[#2A2E39]/50 text-gray-500 hover:text-gray-300 hover:bg-white/5` // 꺼져있거나 선택안됨: 회색
                                                                    }
                                                                    ${!ok && "opacity-40 cursor-not-allowed"}
                                                                `}
                                                            >
                                                                {!ok && <Lock size={10} />}
                                                                {key}
                                                                {dInfo && <span className={`opacity-60 text-[10px] ${isSelected ? 'text-white/80' : ''}`}>{dInfo.level}</span>}
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
                        className="w-full sm:w-auto px-6 h-10 rounded-lg bg-[#5B69FF] hover:bg-[#4A57E6] text-white text-sm font-bold shadow-lg shadow-indigo-500/20 transition-all active:scale-95 flex items-center justify-center"
                    >
                        설정 완료 ({enabledCount})
                    </button>
                </footer>

                <style jsx global>{`
          .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: #16181d;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #333;
            border-radius: 3px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #444;
          }
        `}</style>
            </div>
        </div >
    );
}