// components/tasks/EditTasksModal.tsx
"use client";

import { useEffect, useState } from "react";
import { raidInformation, type DifficultyKey } from "@/server/data/raids";
import type { RosterCharacter } from "../AddAccount";
import { CharacterTaskPrefs } from "@/app/lib/tasks/raid-prefs";
import { X, Lock, Swords, Check } from "lucide-react";

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
    const hard = info.difficulty["하드"];
    const normal = info.difficulty["노말"];

    const hardOk = !!(hard && ilvl >= hard.level);
    const normalOk = !!(normal && ilvl >= normal.level);

    const picked: DifficultyKey = hardOk ? "하드" : "노말";
    const pickedInfo = info.difficulty[picked];

    const enabled = false;  // 항상 비활성으로 시작
    const gates: number[] = []; // 기본은 관문도 안 켜기


    return { enabled, difficulty: picked, gates };
}

export default function EditTasksModal({ open, onClose, character, initial, onSave }: Props) {
    const ilvl = character.itemLevelNum ?? 0;
    const [state, setState] = useState<CharacterTaskPrefs>({ raids: {} });

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


    const handleAutoSelect = (mode: "top3" | "all" | "none") => {
        setState((s) => {
            const updatedRaids = { ...s.raids };
            const raidEntries = Object.entries(raidInformation);
            if (mode === "top3") {
                // 1) 캐릭터 템렙(ilvl) 기준으로 실제 갈 수 있는 난이도만 후보로 뽑기
                const candidates: {
                    raidName: string;
                    difficulty: DifficultyKey;
                    levelReq: number;
                }[] = [];

                for (const [raidName, info] of raidEntries) {
                    const hard = info.difficulty["하드"];
                    const normal = info.difficulty["노말"];

                    let pickedDiff: DifficultyKey | null = null;
                    let levelReq = 0;

                    // 🔹 하드 가능하면 하드만 후보 (노말은 아예 고려 안 함)
                    if (hard && ilvl >= hard.level) {
                        pickedDiff = "하드";
                        levelReq = hard.level;
                    }
                    // 🔹 하드는 못 가고, 노말은 가능하면 노말 후보
                    else if (normal && ilvl >= normal.level) {
                        pickedDiff = "노말";
                        levelReq = normal.level;
                    }
                    // 🔹 둘 다 못 가면 스킵
                    else {
                        continue;
                    }

                    candidates.push({ raidName, difficulty: pickedDiff, levelReq });
                }

                // 2) 요구 레벨 높은 순으로 정렬해서 상위 3개만
                const top3 = candidates.sort((a, b) => b.levelReq - a.levelReq).slice(0, 3);

                // 3) 일단 전 레이드 OFF
                for (const [raidName, pref] of Object.entries(updatedRaids)) {
                    updatedRaids[raidName] = {
                        ...pref,
                        enabled: false,
                        gates: [],
                    };
                }

                // 4) 상위 3개만 "내가 갈 수 있는 최고 난이도"로 ON + 관문 전부 켜기
                for (const { raidName, difficulty } of top3) {
                    const info = raidInformation[raidName];
                    const diffInfo = info.difficulty[difficulty];

                    updatedRaids[raidName] = {
                        ...(updatedRaids[raidName] ?? {}),
                        enabled: true,
                        difficulty,
                    };
                }
            }

            else if (mode === "all" || mode === "none") {
                const visible = mode === "all";
                for (const [raidName, info] of raidEntries) {
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
            {/* 배경 오버레이 */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* 모달 컨테이너 - CharacterSettingModal 이랑 동일한 프레임 */}
            <div className="relative w-full max-w-[min(800px,92vw)] flex flex-col rounded-xl bg-[#16181D] shadow-2xl border border-white/10 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}

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
                        <p className="text-sm text-gray-400 leading-snug">
                            이 캐릭터의 군단장 / 카제로스 / 어비스 / 에픽 숙제를 설정합니다.
                        </p>
                    </div>

                    <button
                        onClick={onClose}
                        className="self-start sm:self-auto p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </header>

                {/* Scrollable Content – CharacterSettingModal과 같은 배경/스크롤 스타일 */}
                <div className="flex-1 overflow-y-auto max-h-[60vh] p-5 sm:p-5 bg-[#121418] custom-scrollbar space-y-8">
                    <div className="flex gap-2 mb-4 ">
                        <button
                            onClick={() => handleAutoSelect("top3")}
                            className="px-3 py-1.5 rounded-full bg-[#5B69FF]/10 border border-[#5B69FF]/30 text-[#5B69FF] text-xs font-bold hover:bg-[#5B69FF]/20 transition-colors whitespace-nowrap"
                        >
                            상위 3개 레이드
                        </button>
                        <button
                            onClick={() => handleAutoSelect("all")}
                            className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-gray-400 text-xs hover:bg-white/10 hover:text-white transition-colors whitespace-nowrap"
                        >
                            전체 선택
                        </button>
                        <button
                            onClick={() => handleAutoSelect("none")}
                            className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-gray-400 text-xs hover:bg-white/10 hover:text-white transition-colors whitespace-nowrap"
                        >
                            전체 해제
                        </button>
                    </div>


                    {(["군단장", "카제로스", "어비스", "에픽"] as const).map((kind) => {
                        const entries = Object.entries(raidInformation).filter(
                            ([, v]) => v.kind === kind
                        );
                        if (!entries.length) return null;

                        return (
                            <section key={kind} className="space-y-4">
                                {/* 섹션 타이틀 (살짝 sticky 느낌) */}
                                <div className="top-0 z-10 py-2 -mx-2 px-2 bg-[#121418]/95 backdrop-blur border-b border-white/5">
                                    <h4 className="flex items-center gap-2 text-xs font-bold text-gray-300 uppercase tracking-[0.18em]">
                                        <Swords size={14} className="text-[#5B69FF]" />
                                        {kind}
                                    </h4>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    {entries.map(([raidName, info]) => {
                                        const pref = state.raids[raidName] ?? makeDefaultPref(info, ilvl);
                                        const hard = info.difficulty["하드"];
                                        const normal = info.difficulty["노말"];
                                        const hardOk = !!(hard && ilvl >= hard.level);
                                        const normalOk = !!(normal && ilvl >= normal.level);

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
                                                {/* Card Header: 이름 + 토글 */}
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="flex items-center gap-3">
                                                        <div
                                                            className={`w-1 h-8 rounded-full ${pref.enabled ? "bg-[#5B69FF]" : "bg-gray-700"
                                                                }`}
                                                        />
                                                        <div>
                                                            <div
                                                                className={`font-bold ${pref.enabled ? "text-white" : "text-gray-400"
                                                                    }`}
                                                            >
                                                                {raidName}
                                                            </div>
                                                            <div className="text-xs text-gray-500">
                                                                {pref.difficulty === "하드"
                                                                    ? hard
                                                                        ? `하드 ${hard.level}`
                                                                        : "하드"
                                                                    : normal
                                                                        ? `노말 ${normal.level}`
                                                                        : "노말"}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* 커스텀 토글 스위치 */}
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
                                                                                // 🔹 토글을 ON 할 때는 관문을 전부 비우기
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
                                                <div className="bg-[#121418] p-1 rounded-lg grid grid-cols-2 gap-1 mb-4">
                                                    {[
                                                        { key: "노말", info: normal, ok: normalOk },
                                                        { key: "하드", info: hard, ok: hardOk },
                                                    ].map(({ key, info: dInfo, ok }) => (
                                                        <button
                                                            key={key}
                                                            disabled={!ok || !pref.enabled}
                                                            onClick={() =>
                                                                setState((s) => ({
                                                                    raids: {
                                                                        ...s.raids,
                                                                        [raidName]: {
                                                                            ...pref,
                                                                            difficulty: key as DifficultyKey,
                                                                            gates: (dInfo?.gates ?? []).map((g) => g.index),
                                                                        },
                                                                    },
                                                                }))
                                                            }
                                                            className={`
                                                                relative flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-md transition-all
                                                                ${pref.difficulty === key
                                                                    ? "bg-[#2A2E39] text-white shadow-sm border border-white/10"
                                                                    : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                                                                }
                                                                ${!ok && "opacity-40 cursor-not-allowed"}
                                                            `}
                                                        >
                                                            {!ok && <Lock size={10} />}
                                                            {key}
                                                            {dInfo && (
                                                                <span className="opacity-60 text-[10px]">
                                                                    {dInfo.level}
                                                                </span>
                                                            )}
                                                        </button>
                                                    ))}
                                                </div>


                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        );
                    })}
                </div>

                {/* Footer – CharacterSettingModal과 동일한 느낌 */}
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
                        변경사항 저장
                    </button>
                </footer>

                {/* 스크롤바 스타일 – CharacterSettingModal과 동일 */}
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
        </div>
    );
}
