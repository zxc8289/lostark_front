// components/tasks/EditTasksModal.tsx
"use client";

import { useEffect, useState } from "react";
import { raidInformation, type DifficultyKey } from "@/server/data/raids";
import type { RosterCharacter } from "../AddAccount";
import { CharacterTaskPrefs } from "@/app/lib/tasks/raid-prefs";

type Props = {
    open: boolean;
    onClose: () => void;
    character: RosterCharacter;
    initial?: CharacterTaskPrefs | null;
    onSave: (prefs: CharacterTaskPrefs) => void;
};

// ✅ 안전한 기본값 생성기
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

    const enabled = pickedInfo ? (picked === "하드" ? hardOk : normalOk) : false;
    const gates = enabled ? (pickedInfo?.gates ?? []).map((g) => g.index) : [];

    return { enabled, difficulty: picked, gates };
}

export default function EditTasksModal({ open, onClose, character, initial, onSave }: Props) {
    const ilvl = character.itemLevelNum ?? 0;

    const [state, setState] = useState<CharacterTaskPrefs>({ raids: {} });

    useEffect(() => {
        if (!open) return;

        const base: CharacterTaskPrefs = initial ?? { raids: {} };
        const filled: CharacterTaskPrefs = { raids: { ...base.raids } };

        // 미존재 키 채우기
        for (const [raidName, info] of Object.entries(raidInformation)) {
            if (!filled.raids[raidName]) {
                filled.raids[raidName] = makeDefaultPref(info, ilvl);
            }
        }
        setState(filled);
    }, [open, initial, ilvl]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[60]">
            <div className="absolute inset-0 bg-black/60" onClick={onClose} />
            <div className="absolute inset-x-0 top-[10%] mx-auto w-[min(960px,92vw)] rounded-md bg-[#16181D] shadow-lg border border-white/10">
                <header className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
                    <div className="text-sm text-gray-400">
                        <span className="font-semibold text-white mr-1">{character.name}</span>
                        숙제 설정 (ilvl {ilvl.toLocaleString()})
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-200 text-sm">
                        닫기 ✕
                    </button>
                </header>

                <div className="max-h-[60vh] overflow-y-auto px-5 py-4 space-y-5">
                    {(["군단장", "카제로스", "어비스", "에픽"] as const).map((kind) => {
                        const entries = Object.entries(raidInformation).filter(([, v]) => v.kind === kind);
                        if (!entries.length) return null;

                        return (
                            <section key={kind} className="space-y-2">
                                <h4 className="text-sm font-semibold text-gray-200">{kind}</h4>
                                <div className="grid md:grid-cols-2 gap-3">
                                    {entries.map(([raidName, info]) => {
                                        // ✅ pref 기본값 안전 보강
                                        const pref = state.raids[raidName] ?? makeDefaultPref(info, ilvl);

                                        const hard = info.difficulty["하드"];
                                        const normal = info.difficulty["노말"];
                                        const hardOk = !!(hard && ilvl >= hard.level);
                                        const normalOk = !!(normal && ilvl >= normal.level);

                                        const current = info.difficulty[pref.difficulty];
                                        const gates = current?.gates ?? [];

                                        return (
                                            <div key={raidName} className="rounded-md border border-white/10 p-3 bg-[#1B1E24]">
                                                <div className="flex items-center justify-between">
                                                    <label className="flex items-center gap-2">
                                                        <input
                                                            type="checkbox"
                                                            className="accent-[#5B69FF]"
                                                            checked={pref.enabled}
                                                            onChange={(e) =>
                                                                setState((s) => {
                                                                    const basePref = s.raids[raidName] ?? makeDefaultPref(info, ilvl);
                                                                    return {
                                                                        raids: {
                                                                            ...s.raids,
                                                                            [raidName]: { ...basePref, enabled: e.target.checked },
                                                                        },
                                                                    };
                                                                })
                                                            }
                                                        />
                                                        <div>
                                                            <div className="font-semibold">{raidName}</div>
                                                            <div className="text-xs text-gray-400">
                                                                {normal ? `노말 ${normal.level}` : "노말 없음"} {" · "}
                                                                {hard ? `하드 ${hard.level}` : "하드 없음"}
                                                            </div>
                                                        </div>
                                                    </label>

                                                    <div className="flex items-center gap-2 text-xs">
                                                        <label
                                                            className={`inline-flex items-center gap-1 px-2 py-1 rounded border ${normalOk ? "border-white/15" : "border-red-500/30 opacity-50"
                                                                }`}
                                                        >
                                                            <input
                                                                type="radio"
                                                                name={`${raidName}-diff`}
                                                                disabled={!normalOk}
                                                                checked={pref.difficulty === "노말"}
                                                                onChange={() =>
                                                                    setState((s) => {
                                                                        const basePref = s.raids[raidName] ?? makeDefaultPref(info, ilvl);
                                                                        return {
                                                                            raids: {
                                                                                ...s.raids,
                                                                                [raidName]: {
                                                                                    ...basePref,
                                                                                    difficulty: "노말",
                                                                                    gates: (normal?.gates ?? []).map((g) => g.index),
                                                                                },
                                                                            },
                                                                        };
                                                                    })
                                                                }
                                                            />
                                                            노말
                                                        </label>

                                                        <label
                                                            className={`inline-flex items-center gap-1 px-2 py-1 rounded border ${hardOk ? "border-white/15" : "border-red-500/30 opacity-50"
                                                                }`}
                                                        >
                                                            <input
                                                                type="radio"
                                                                name={`${raidName}-diff`}
                                                                disabled={!hardOk}
                                                                checked={pref.difficulty === "하드"}
                                                                onChange={() =>
                                                                    setState((s) => {
                                                                        const basePref = s.raids[raidName] ?? makeDefaultPref(info, ilvl);
                                                                        return {
                                                                            raids: {
                                                                                ...s.raids,
                                                                                [raidName]: {
                                                                                    ...basePref,
                                                                                    difficulty: "하드",
                                                                                    gates: (hard?.gates ?? []).map((g) => g.index),
                                                                                },
                                                                            },
                                                                        };
                                                                    })
                                                                }
                                                            />
                                                            하드
                                                        </label>
                                                    </div>
                                                </div>

                                                {/* 관문 선택 */}
                                                <div className="mt-3 flex flex-wrap gap-2">
                                                    {gates.length ? (
                                                        gates.map((g) => {
                                                            const checked = pref.gates.includes(g.index);
                                                            return (
                                                                <button
                                                                    key={g.index}
                                                                    disabled={!pref.enabled}
                                                                    onClick={() =>
                                                                        setState((s) => {
                                                                            const basePref = s.raids[raidName] ?? makeDefaultPref(info, ilvl);
                                                                            const cur = new Set(basePref.gates);
                                                                            if (cur.has(g.index)) cur.delete(g.index);
                                                                            else cur.add(g.index);
                                                                            return {
                                                                                raids: {
                                                                                    ...s.raids,
                                                                                    [raidName]: { ...basePref, gates: [...cur].sort((a, b) => a - b) },
                                                                                },
                                                                            };
                                                                        })
                                                                    }
                                                                    className={[
                                                                        "h-7 w-7 grid place-items-center rounded-full border text-xs",
                                                                        pref.enabled
                                                                            ? checked
                                                                                ? "border-[#5B69FF] bg-[#5B69FF]/20"
                                                                                : "border-white/15"
                                                                            : "opacity-40 pointer-events-none border-white/10",
                                                                    ].join(" ")}
                                                                >
                                                                    {g.index}
                                                                </button>
                                                            );
                                                        })
                                                    ) : (
                                                        <span className="text-xs text-gray-500">선택한 난이도에 관문 정보가 없습니다.</span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        );
                    })}
                </div>

                <footer className="px-5 py-3 border-t border-white/10 flex justify-end gap-2">
                    <button onClick={onClose} className="px-3 h-9 rounded-md border border-white/15 text-sm text-gray-300">
                        취소
                    </button>
                    <button onClick={() => onSave(state)} className="px-4 h-9 rounded-md bg-[#5B69FF] text-white text-sm">
                        저장
                    </button>
                </footer>
            </div>
        </div>
    );
}
