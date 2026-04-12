"use client";

import { useState, useEffect } from "react";
import { RosterCharacter } from "../AddAccount";
import { RefreshCcw, X, Trash2, Check, AlertCircle, Eye, EyeOff, Coins, Lock, Unlock } from "lucide-react";

type ModalCharacter = {
    name: string;
    className: string;
    itemLevel: string;
    itemLevelNum: number;
    isVisible: boolean;
    isGoldEarn: boolean;
    isPowerLocked: boolean;
};

const DUMMY_CHARACTERS: ModalCharacter[] = [];

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
    goldDesignatedByChar?: Record<string, boolean>;
    powerLockedByChar?: Record<string, boolean>;
    onChangeSettings?: (
        nextVisible: Record<string, boolean>,
        nextGold: Record<string, boolean>,
        nextLocked: Record<string, boolean>
    ) => void;
    refreshError?: string | null;

};

export default function CharacterSettingModal({
    onRefreshAccount,
    onDeleteAccount,
    open,
    onClose,
    roster,
    visibleByChar,
    goldDesignatedByChar,
    powerLockedByChar,
    onChangeSettings, // 🔥 수정됨
    refreshError
}: Props) {
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [characters, setCharacters] = useState<ModalCharacter[]>([]);
    const [alertMessage, setAlertMessage] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        const originalStyle = window.getComputedStyle(document.body).overflow;
        document.body.style.overflow = "hidden";

        return () => {
            document.body.style.overflow = originalStyle;
        };
    }, [open]);

    useEffect(() => {
        if (!roster) {
            const dummy = DUMMY_CHARACTERS
                .map((c) => ({
                    ...c,
                    isVisible: visibleByChar?.[c.name] ?? c.isVisible,
                    isGoldEarn: false,
                }))
                .sort((a, b) => b.itemLevelNum - a.itemLevelNum);

            setCharacters(dummy);
            return;
        }

        if (roster.length === 0) {
            setCharacters([]);
            return;
        }

        // 1차: 기본 정보 맵핑
        let mapped: ModalCharacter[] = roster
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
                    isGoldEarn: false,
                    isPowerLocked: powerLockedByChar?.[c.name] ?? false,
                };
            })
            .sort((a, b) => b.itemLevelNum - a.itemLevelNum); // 높은 레벨부터

        // 2차: 골드 획득 지정 여부 처리
        let tempGoldCount = 0;
        mapped = mapped.map(c => {
            let isGold = false;
            if (goldDesignatedByChar && goldDesignatedByChar[c.name] !== undefined) {
                isGold = goldDesignatedByChar[c.name];
            } else {
                if (tempGoldCount < 6) {
                    isGold = true;
                }
            }
            if (isGold) tempGoldCount++;

            return { ...c, isGoldEarn: isGold };
        });

        setCharacters(mapped);
    }, [roster, visibleByChar, goldDesignatedByChar]);

    const applyCharacters = (next: ModalCharacter[]) => {
        setCharacters(next);
    };

    const togglePowerLock = (index: number) => {
        setCharacters(prev =>
            prev.map((c, i) => i === index ? { ...c, isPowerLocked: !c.isPowerLocked } : c)
        );
    };

    const commitSettings = () => {
        const nextVisible: Record<string, boolean> = {};
        const nextGold: Record<string, boolean> = {};
        const nextLocked: Record<string, boolean> = {};

        for (const c of characters) {
            nextVisible[c.name] = c.isVisible;
            nextGold[c.name] = c.isGoldEarn;
            nextLocked[c.name] = c.isPowerLocked;
        }

        if (onChangeSettings) {
            onChangeSettings(nextVisible, nextGold, nextLocked);
        }

        onClose(); // 설정 완료 시 모달 닫기
    };

    const toggleVisibility = (index: number) => {
        const next = characters.map((char, i) =>
            i === index ? { ...char, isVisible: !char.isVisible } : char
        );
        applyCharacters(next);
    };

    const toggleGoldEarn = (index: number) => {
        setAlertMessage(null);
        setCharacters(prev => {
            const char = prev[index];

            // 켜려고 할 때 6개 제한 검사
            if (!char.isGoldEarn) {
                const currentGoldCount = prev.filter(c => c.isGoldEarn).length;
                if (currentGoldCount >= 6) {
                    setAlertMessage("골드 획득 지정은 최대 6캐릭터까지만 가능합니다.");
                    setTimeout(() => setAlertMessage(null), 3000);
                    return prev;
                }
            }

            return prev.map((c, i) => i === index ? { ...c, isGoldEarn: !c.isGoldEarn } : c);
        });
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

    const handleAutoSelect = (mode: "top6" | "all" | "none") => {
        if (mode === "top6") {
            const next = characters.map((char, index) => ({
                ...char,
                isVisible: index < 6,
                isGoldEarn: index < 6, // 상위 6캐릭 선택 시 골드 획득도 함께 켬
            }));
            applyCharacters(next);
        } else if (mode === "all" || mode === "none") {
            const visible = mode === "all";
            const next = characters.map((c) => ({
                ...c,
                isVisible: visible,
                isGoldEarn: mode === "none" ? false : c.isGoldEarn
            }));
            applyCharacters(next);
        }
    };

    if (!open) return null;

    const visibleCount = characters.filter((c) => c.isVisible).length;
    const goldEarnCount = characters.filter((c) => c.isGoldEarn).length;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-0">
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            <div className="relative w-full max-w-[min(800px,92vw)] flex flex-col rounded-xl bg-[#16181D] shadow-2xl border border-white/10 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <header className="px-5 py-5 sm:px-8 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#16181D]">
                    <div>
                        <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight mb-1">
                            캐릭터 관리
                        </h2>
                        <div className="text-sm text-gray-400 leading-snug">
                            <p className="sm:hidden text-xs text-gray-500">
                                캐릭터 및 골드 지정을 설정하세요.
                            </p>
                            <p className="hidden sm:block">
                                화면에 표시할 캐릭터와 골드 획득 지정 캐릭터(최대 6개)를 설정하세요.
                            </p>
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
                        <span className="sm:hidden">
                            {isRefreshing ? "업데이트..." : "업데이트"}
                        </span>
                        <span className="hidden sm:inline">
                            {isRefreshing ? "업데이트 중..." : "계정 정보 업데이트"}
                        </span>
                    </button>
                </header>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto max-h-[55vh] p-4 sm:max-h-[65vh] sm:p-5 bg-[#121418] custom-scrollbar relative">

                    {/* 🔥 6캐릭 제한 알림 배너 (불투명하게 처리) */}
                    {alertMessage && (
                        <div className="sticky top-0 z-10 mb-4 flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-[#2A1616] border-2 border-red-500 text-red-400 text-sm font-bold shadow-xl shadow-black/50 animate-in slide-in-from-top-2 fade-in">
                            <AlertCircle size={18} />
                            {alertMessage}
                        </div>
                    )}

                    <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide">
                        <button
                            onClick={() => handleAutoSelect("top6")}
                            className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-gray-400 text-xs hover:bg-white/10 hover:text-white transition-colors whitespace-nowrap"
                        >
                            <span className="sm:inline">상위 6캐릭 세팅</span>
                        </button>
                        <button
                            onClick={() => handleAutoSelect("all")}
                            className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-gray-400 text-xs hover:bg-white/10 hover:text-white transition-colors whitespace-nowrap"
                        >
                            <span className="sm:inline">모두 표시</span>
                        </button>
                        <button
                            onClick={() => handleAutoSelect("none")}
                            className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-gray-400 text-xs hover:bg-white/10 hover:text-white transition-colors whitespace-nowrap"
                        >
                            <span className="sm:inline">전체 해제</span>
                        </button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {characters.map((char, index) => (
                            <div
                                key={char.name}
                                onClick={() => toggleVisibility(index)}
                                className={`
                                        flex flex-col p-3 sm:p-4 rounded-xl transition-all duration-200 border cursor-pointer select-none
                                        ${char.isVisible
                                        ? "bg-[#1E222B] border-white/10 shadow-lg shadow-black/20"
                                        : "bg-[#16181D] border-white/5 opacity-50 grayscale hover:bg-[#1a1c23]"
                                    }
                                    `}
                            >
                                {/* 캐릭터 정보 영역 */}
                                <div className="flex flex-col items-center text-center mb-3 pointer-events-none">
                                    <div className={`font-bold text-[14px] sm:text-base mb-0.5 truncate w-full px-1 ${char.isVisible ? "text-white" : "text-gray-400"}`}>
                                        {char.name}
                                    </div>
                                    <div className="text-[10px] sm:text-xs text-gray-500 font-medium">
                                        {char.className} <span className="opacity-50 mx-1">|</span> {char.itemLevel}
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-1.5 mt-auto pt-3 border-t border-white/5">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation(); // 카드 클릭(표시 토글) 방지
                                            toggleGoldEarn(index);
                                        }}
                                        className={`flex flex-col items-center justify-center py-2 rounded-lg transition-colors border ${char.isGoldEarn
                                            ? "bg-yellow-600 border-yellow-600 text-white shadow-[0_0_10px_rgba(234,179,8,0.3)]" // 🔥 노란색(골드) 스타일
                                            : "bg-black/20 border-white/5 text-gray-500 hover:bg-white/10 hover:text-gray-300"
                                            }`}
                                    >
                                        <Coins size={16} className="mb-1" strokeWidth={2.5} />
                                        <span className="text-[9px] sm:text-[10px] font-bold">골드 지정</span>
                                    </button>

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleVisibility(index);
                                        }}
                                        className={`flex flex-col items-center justify-center py-2 rounded-lg transition-colors border ${char.isVisible
                                            ? "bg-[#5B69FF] border-[#5B69FF] text-white shadow-[0_0_10px_rgba(91,105,255,0.2)]"
                                            : "bg-black/20 border-white/5 text-gray-500 hover:bg-white/10 hover:text-gray-300"
                                            }`}
                                    >
                                        {char.isVisible ? <Eye size={16} className="mb-1" /> : <EyeOff size={16} className="mb-1" />}
                                        <span className="text-[9px] sm:text-[10px] font-bold">{char.isVisible ? "표시됨" : "숨김됨"}</span>
                                    </button>

                                    {/* 3. 스펙 고정 토글 (기존 골드 지정이었던 밝은 화이트 테마로 변경) */}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); togglePowerLock(index); }}
                                        className={`flex flex-col items-center justify-center py-2 rounded-lg transition-colors border ${char.isPowerLocked
                                            ? "bg-[#F1F5F9] border-[#F1F5F9] text-[#111217] shadow-[0_0_10px_rgba(241,245,249,0.2)]" // 🔥 밝은 화이트/메탈 스타일
                                            : "bg-black/20 border-white/5 text-gray-500 hover:bg-white/10 hover:text-gray-300"
                                            }`}
                                    >
                                        {char.isPowerLocked ? <Lock size={14} className="mb-1" /> : <Unlock size={14} className="mb-1" />}
                                        <span className="text-[9px] sm:text-[10px] font-bold">스펙 고정</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <footer className="px-5 py-4 sm:px-8 bg-[#16181D] border-t border-white/10 flex flex-col gap-3">
                    {refreshError && (
                        <div className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-200 text-xs sm:text-sm animate-in slide-in-from-bottom-1 fade-in">
                            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                            <span>{refreshError}</span>
                        </div>
                    )}

                    <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 w-full">
                        <div className="flex gap-2 w-full sm:w-auto">
                            <button
                                onClick={onClose}
                                className="flex-1 sm:flex-none px-4 h-10 rounded-lg border border-white/10 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                            >
                                취소
                            </button>

                            {onDeleteAccount && (
                                <button
                                    className="flex-none px-4 h-10 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2"
                                    title="계정 삭제"
                                    onClick={() => {
                                        onDeleteAccount();
                                    }}
                                >
                                    <Trash2 size={16} />
                                    <span className="hidden sm:inline">계정 삭제</span>
                                    <span className="sm:hidden">삭제</span>
                                </button>
                            )}
                        </div>

                        <button
                            onClick={commitSettings}
                            className="w-full sm:w-auto px-6 h-10 rounded-lg bg-[#5B69FF] hover:bg-[#4A57E6] text-white text-sm font-bold shadow-lg shadow-indigo-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            {/* PC 화면용 텍스트 */}
                            <span className="hidden sm:inline">
                                설정 완료 (표시 {visibleCount}캐릭, 골드 {goldEarnCount}/6)
                            </span>
                            {/* 모바일 화면용 텍스트 (조금 더 짧게) */}
                            <span className="sm:hidden">
                                설정 완료 (표시 {visibleCount}, 골드 {goldEarnCount}/6)
                            </span>
                        </button>
                    </div>
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