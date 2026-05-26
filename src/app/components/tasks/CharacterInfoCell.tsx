"use client";

import { SquarePen, MessageSquareText } from "lucide-react";
import { RosterCharacter } from "../AddAccount";
import type { CharacterTaskPrefs } from "@/app/lib/tasks/raid-prefs";
import { getClassIconUrl, isSupporterEngraving } from "./ClassIconMap";

type Props = {
    char: RosterCharacter;
    prefs?: CharacterTaskPrefs;
    onEdit: (character: RosterCharacter) => void;
    onOpenMemo: (charName: string, currentMemo: string) => void;
};

export default function CharacterInfoCell({
    char,
    prefs,
    onEdit,
    onOpenMemo,
}: Props) {
    const iconUrl = getClassIconUrl(char.className);
    const isSupporter = isSupporterEngraving((char as any).jobEngraving);

    const itemLevel = String(char.itemLevel ?? "-").replace(/\s+/g, "");
    const combatPower = String((char as any).combatPower ?? "").replace(/\s+/g, "");
    const hasCombatPower = combatPower && combatPower !== "0";

    return (
        <div className="flex items-center justify-center w-full h-full pointer-events-none">
            <div className="inline-flex items-center gap-1 sm:gap-2 max-w-full min-w-0">
                <div className="w-8 h-8 sm:w-[42px] sm:h-[42px] bg-black/40 rounded-md flex-shrink-0 flex items-center justify-center border border-white/5 overflow-hidden">
                    <img
                        src={iconUrl}
                        alt={char.className}
                        className="w-5 h-5 sm:w-7 sm:h-7 object-contain filter brightness-0 invert opacity-80"
                        onError={(e) => {
                            (e.currentTarget.parentNode as HTMLDivElement).innerHTML =
                                `<span class="text-[9px] sm:text-[12px] text-gray-400 font-medium leading-tight text-center break-keep px-1">${char.className}</span>`;
                        }}
                    />
                </div>

                <div className="flex flex-col min-w-0 items-start text-left gap-[3px] sm:gap-[6px] justify-center">
                    <div className="flex items-center justify-start gap-1 min-w-0 max-w-full">
                        <span
                            className="block truncate text-left text-white text-[12px] sm:text-[15px] leading-none max-w-[72px] sm:max-w-[110px]"
                            title={char.name}
                        >
                            {char.name}
                        </span>

                        <div className="flex items-center gap-0.5 flex-shrink-0 pointer-events-auto">
                            <button
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onEdit(char);
                                }}
                                className="text-[#64748B] hover:text-white transition-colors p-[2px] rounded hover:bg-white/10 cursor-pointer"
                                title="캐릭터 설정"
                            >
                                <SquarePen
                                    size={12}
                                    className="sm:w-[14px] sm:h-[14px] w-[11px] h-[11px]"
                                    strokeWidth={2}
                                />
                            </button>

                            <button
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenMemo(char.name, prefs?.memo || "");
                                }}
                                className="p-[2px] rounded transition-colors cursor-pointer hover:bg-white/10 flex-shrink-0"
                                title="메모 작성/보기"
                            >
                                <MessageSquareText
                                    size={12}
                                    className={`sm:w-[14px] sm:h-[14px] w-[11px] h-[11px] ${prefs?.memo
                                        ? "text-amber-400 hover:text-amber-300"
                                        : "text-[#64748B] hover:text-white"
                                        }`}
                                    strokeWidth={2}
                                />
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center items-start text-left gap-[3px] sm:gap-1 text-[10px] sm:text-[12px] leading-none">
                        <span className="text-gray-400 whitespace-nowrap">
                            Lv.{itemLevel}
                        </span>

                        <span className="hidden sm:block w-1 h-1 rounded-full bg-white/20 shrink-0" />

                        {hasCombatPower ? (
                            <div className="flex items-center justify-start gap-0.5 flex-shrink-0 whitespace-nowrap">
                                <span
                                    className={
                                        isSupporter
                                            ? "text-emerald-300/70 font-medium"
                                            : "text-red-400/70 font-medium"
                                    }
                                >
                                    {combatPower}
                                </span>
                            </div>
                        ) : (
                            <span className="text-[#E57373] text-[9px] sm:text-[11px] whitespace-nowrap">
                                전투력 없음
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
