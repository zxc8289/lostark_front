"use client";

import { useState, useEffect } from "react";
import { RosterCharacter } from "../AddAccount";
import { RefreshCcw, X, Trash2, Check } from "lucide-react";

type ModalCharacter = {
    name: string;
    className: string;
    itemLevel: string;
    itemLevelNum: number;
    isVisible: boolean;
};

const DUMMY_CHARACTERS: ModalCharacter[] = [

];

// 안전하게 아이템 레벨 숫자로 변환하는 헬퍼
function parseItemLevel(input: number | string | null | undefined): number {
    if (typeof input === "number") return input;
    if (typeof input === "string") {
        const n = Number(input.replace(/,/g, ""));
        return Number.isFinite(n) ? n : 0;
    }
    return 0;
}

type Props = {
    open: boolean;
    onClose: () => void;
    onDeleteAccount?: () => void;
    roster?: RosterCharacter[];
    onRefreshAccount?: () => Promise<void> | void;
    visibleByChar?: Record<string, boolean>;
    onChangeVisible?: (next: Record<string, boolean>) => void;
};

export default function CharacterSettingModal({
    onRefreshAccount,
    onDeleteAccount,
    open,
    onClose,
    roster,
    visibleByChar,
    onChangeVisible,
}: Props) {
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [characters, setCharacters] = useState<ModalCharacter[]>([]);

    useEffect(() => {
        if (!roster) {
            const dummy = DUMMY_CHARACTERS
                .map((c) => ({
                    ...c,
                    isVisible: visibleByChar?.[c.name] ?? c.isVisible,
                }))
                .sort((a, b) => b.itemLevelNum - a.itemLevelNum);

            setCharacters(dummy);
            return;
        }

        if (roster.length === 0) {
            setCharacters([]);
            return;
        }

        const mapped: ModalCharacter[] = roster
            .map((c) => {
                const levelNum =
                    c.itemLevelNum != null
                        ? c.itemLevelNum
                        : parseItemLevel(c.itemLevel);

                return {
                    name: c.name,
                    className: c.className ?? "",
                    itemLevelNum: levelNum,
                    itemLevel: levelNum ? levelNum.toLocaleString() : String(c.itemLevel ?? ""),
                    isVisible: visibleByChar?.[c.name] ?? true,
                };
            })
            .sort((a, b) => b.itemLevelNum - a.itemLevelNum); // 🔥 높은 레벨부터

        setCharacters(mapped);
    }, [roster, visibleByChar]);

    const applyCharacters = (next: ModalCharacter[]) => {
        setCharacters(next);
    };

    const commitVisible = () => {
        if (!onChangeVisible) return;

        const map: Record<string, boolean> = {};
        for (const c of characters) {
            map[c.name] = c.isVisible;
        }
        onChangeVisible(map);
    };


    const toggleVisibility = (index: number) => {
        const next = characters.map((char, i) =>
            i === index ? { ...char, isVisible: !char.isVisible } : char
        );
        applyCharacters(next);
    };


    const handleRefreshClick = async () => {
        if (!onRefreshAccount) return;

        try {
            setIsRefreshing(true);
            await onRefreshAccount();
        } catch (error) {
            console.error("계정 업데이트 실패:", error);
        } finally {
            setIsRefreshing(false);
        }
    };

    if (!open) return null;

    const handleAutoSelect = (mode: "top6" | "all" | "none") => {
        if (mode === "top6") {
            const next = characters.map((char, index) => ({
                ...char,
                isVisible: index < 6,
            }));
            applyCharacters(next);
        } else if (mode === "all" || mode === "none") {
            const visible = mode === "all";
            const next = characters.map((c) => ({
                ...c,
                isVisible: visible,
            }));
            applyCharacters(next);
        }
    };


    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-0">
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            <div className="relative w-full max-w-[min(800px,92vw)] flex flex-col rounded-xl bg-[#16181D] shadow-2xl border border-white/10 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <header className="px-5 py-5 sm:px-8 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#16181D]">
                    <div>
                        <h2 className="text-xl font-bold text-white tracking-tight mb-1">
                            캐릭터 관리
                        </h2>
                        <div className="text-sm text-gray-400 leading-snug">
                            <p>표시할 캐릭터를 선택하세요. (회색 처리된 캐릭터는 목록에서 숨겨집니다)</p>
                        </div>

                    </div>

                    <button
                        onClick={handleRefreshClick}
                        disabled={isRefreshing}
                        className={`
                                flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-white/10 text-xs transition-colors whitespace-nowrap
                                ${isRefreshing
                                ? "bg-white/5 text-gray-500 cursor-not-allowed"
                                : "bg-white/5 hover:bg-white/10 text-gray-300"
                            }
                                `}
                    >
                        <RefreshCcw
                            size={14}
                            className={isRefreshing ? "animate-spin text-indigo-400" : ""}
                        />
                        <span>
                            {isRefreshing ? "업데이트 중..." : "계정 정보 업데이트"}
                        </span>
                    </button>
                </header>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto max-h-[60vh] p-5 sm:p-5 bg-[#121418] custom-scrollbar">
                    <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide">
                        <button
                            onClick={() => handleAutoSelect("top6")}
                            className="px-3 py-1.5 rounded-full bg-[#5B69FF]/10 border border-[#5B69FF]/30 text-[#5B69FF] text-xs font-bold hover:bg-[#5B69FF]/20 transition-colors whitespace-nowrap"
                        >
                            상위 6캐릭
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
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {characters.map((char, index) => (
                            <div
                                key={char.name}
                                onClick={() => toggleVisibility(index)}
                                className={`
                                relative flex flex-col items-center justify-center py-4 px-2 rounded-lg cursor-pointer transition-all duration-200 select-none border
                                ${char.isVisible
                                        ? "bg-[#5B69FF] border-[#5B69FF] text-white shadow-lg shadow-indigo-500/20 translate-y-0"
                                        : "bg-[#1E222B] border-white/5 text-gray-500 hover:bg-[#252932] hover:border-white/10"
                                    }
                                `}
                            >
                                <div
                                    className={`
                                        absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-[10px] transition-colors
                                        ${char.isVisible ? "bg-white/20 text-white" : "bg-black/20 text-gray-600"}
                                    `}
                                >
                                    {char.isVisible ? <Check size={12} strokeWidth={3} /> : <X size={12} />}
                                </div>

                                <div className="font-bold text-base sm:text-lg mb-1 truncate w-full text-center px-2">
                                    {char.name}
                                </div>
                                <div
                                    className={`text-xs font-medium ${char.isVisible ? "text-indigo-100" : "text-gray-600"
                                        }`}
                                >
                                    {char.className} <span className="opacity-50 mx-1">|</span>{" "}
                                    {char.itemLevel}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <footer className="px-5 py-4 sm:px-8 bg-[#16181D] border-t border-white/10 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
                    <div className="flex gap-2 w-full sm:w-auto">
                        <button
                            onClick={onClose}
                            className="flex-1 sm:flex-none px-4 h-10 rounded-lg border border-white/10 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                        >
                            취소
                        </button>
                        <button
                            className="flex-none px-4 h-10 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2"
                            title="계정 삭제"
                            onClick={() => {
                                onDeleteAccount?.();
                            }}
                        >
                            <Trash2 size={16} />
                            <span className="sm:hidden">계정 삭제</span>
                        </button>
                    </div>

                    <button
                        onClick={() => {
                            commitVisible();
                            onClose();
                        }}
                        className="w-full sm:w-auto px-6 h-10 rounded-lg bg-[#5B69FF] hover:bg-[#4A57E6] text-white text-sm font-bold shadow-lg shadow-indigo-500/20 transition-all active:scale-95 flex items-center justify-center"
                    >
                        설정 완료 ({characters.filter((c) => c.isVisible).length})
                    </button>

                </footer>
            </div>

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
    );
}
