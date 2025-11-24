// components/tasks/EditTasksModal.tsx
"use client";

import { useEffect, useState } from "react";
import { raidInformation, type DifficultyKey } from "@/server/data/raids";
import type { RosterCharacter } from "../AddAccount";
import { CharacterTaskPrefs } from "@/app/lib/tasks/raid-prefs";
import { X, Lock, Shield, Swords, Check } from "lucide-react"; // 아이콘 추가

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
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
            {/* Backdrop with Blur */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Container */}
            <div className="relative w-full max-w-4xl max-h-[85vh] flex flex-col rounded-xl bg-[#16181D] shadow-2xl border border-white/10 overflow-hidden animation-fade-in-up">

                {/* Header */}
                <header className="px-6 py-5 border-b border-white/10 bg-[#16181D] flex items-center justify-between z-20">
                    <div>
                        <div className="flex items-center justify-center gap-3 mb-1">
                            <h2 className="text-xl font-bold text-white tracking-tight">{character.name}</h2>
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#5B69FF]/20 text-[#8eaaff] border border-[#5B69FF]/30">
                                Lv. {ilvl.toLocaleString()}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </header>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8 bg-[#121418]">
                    {(["군단장", "카제로스", "어비스", "에픽"] as const).map((kind) => {
                        const entries = Object.entries(raidInformation).filter(([, v]) => v.kind === kind);
                        if (!entries.length) return null;

                        return (
                            <section key={kind} className="space-y-4">
                                {/* Sticky Section Title */}
                                <div className="top-0 z-10 py-2 -mx-2 px-2 bg-[#121418]/95 backdrop-blur border-b border-white/5">
                                    <h4 className="flex items-center gap-2 text-sm font-bold text-gray-300 uppercase tracking-wider">
                                        <Swords size={14} className="text-[#5B69FF]" />
                                        {kind}
                                    </h4>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    {entries.map(([raidName, info]) => {
                                        // Logic Setup
                                        const pref = state.raids[raidName] ?? makeDefaultPref(info, ilvl);
                                        const hard = info.difficulty["하드"];
                                        const normal = info.difficulty["노말"];
                                        const hardOk = !!(hard && ilvl >= hard.level);
                                        const normalOk = !!(normal && ilvl >= normal.level);
                                        const current = info.difficulty[pref.difficulty];
                                        const gates = current?.gates ?? [];

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
                                                {/* Card Header: Name & Toggle */}
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-1 h-8 rounded-full ${pref.enabled ? "bg-[#5B69FF]" : "bg-gray-700"}`} />
                                                        <div>
                                                            <div className={`font-bold ${pref.enabled ? "text-white" : "text-gray-400"}`}>
                                                                {raidName}
                                                            </div>
                                                            <div className="text-xs text-gray-500">
                                                                {pref.difficulty === "하드" ? `하드 ${hard?.level}` : `노말 ${normal?.level}`}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Custom Toggle Switch */}
                                                    <label className="relative inline-flex items-center cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            className="sr-only peer"
                                                            checked={pref.enabled}
                                                            onChange={(e) =>
                                                                setState((s) => ({
                                                                    raids: {
                                                                        ...s.raids,
                                                                        [raidName]: { ...pref, enabled: e.target.checked },
                                                                    },
                                                                }))
                                                            }
                                                        />
                                                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#5B69FF] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#5B69FF]"></div>
                                                    </label>
                                                </div>

                                                {/* Difficulty Segmented Control */}
                                                <div className="bg-[#121418] p-1 rounded-lg grid grid-cols-2 gap-1 mb-4">
                                                    {[
                                                        { key: "노말", info: normal, ok: normalOk, color: "text-blue-400" },
                                                        { key: "하드", info: hard, ok: hardOk, color: "text-orange-400" }
                                                    ].map(({ key, info: dInfo, ok, color }) => (
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
                                                            {key} {dInfo && <span className="opacity-60 text-[10px]">{dInfo.level}</span>}
                                                        </button>
                                                    ))}
                                                </div>

                                                {/* Gate Stepper */}
                                                <div className="relative pt-2">
                                                    {/* Connecting Line (Behind) */}
                                                    <div className="absolute top-1/2 left-2 right-2 h-0.5 bg-white/5 -translate-y-1/2" />

                                                    <div className="relative flex justify-between items-center px-1">
                                                        {gates.length > 0 ? (
                                                            gates.map((g) => {
                                                                const isSelected = pref.gates.includes(g.index);
                                                                return (
                                                                    <button
                                                                        key={g.index}
                                                                        disabled={!pref.enabled}
                                                                        onClick={() =>
                                                                            setState((s) => {
                                                                                const cur = new Set(pref.gates);
                                                                                if (cur.has(g.index)) cur.delete(g.index);
                                                                                else cur.add(g.index);
                                                                                return {
                                                                                    raids: {
                                                                                        ...s.raids,
                                                                                        [raidName]: { ...pref, gates: [...cur].sort((a, b) => a - b) },
                                                                                    },
                                                                                };
                                                                            })
                                                                        }
                                                                        className={`
                                        group/btn relative w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border transition-all z-10
                                        ${isSelected
                                                                                ? "bg-[#5B69FF] border-[#5B69FF] text-white shadow-[0_0_10px_rgba(91,105,255,0.4)]"
                                                                                : "bg-[#16181D] border-white/20 text-gray-500 hover:border-gray-400"
                                                                            }
                                        ${!pref.enabled && "opacity-50 cursor-not-allowed"}
                                      `}
                                                                    >
                                                                        {isSelected ? <Check size={12} strokeWidth={4} /> : g.index}
                                                                        <span className="absolute -bottom-5 text-[10px] font-normal text-gray-500 opacity-0 group-hover/btn:opacity-100 transition-opacity whitespace-nowrap">
                                                                            {g.index}관문
                                                                        </span>
                                                                    </button>
                                                                );
                                                            })
                                                        ) : (
                                                            <div className="w-full text-center text-xs text-gray-600 py-1">
                                                                관문 정보 없음
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        );
                    })}
                </div>

                {/* Footer */}
                <footer className="px-6 py-4 bg-[#16181D] border-t border-white/10 flex justify-end gap-3 z-20">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-lg border border-white/10 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                    >
                        취소
                    </button>
                    <button
                        onClick={() => onSave(state)}
                        className="px-6 py-2.5 rounded-lg bg-[#5B69FF] hover:bg-[#4A57E6] text-white text-sm font-bold shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
                    >
                        변경사항 저장
                    </button>
                </footer>
            </div>
        </div>
    );
}