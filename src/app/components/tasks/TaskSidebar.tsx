// components/tasks/layout/TaskSidebar.tsx
"use client";

import { Check, ChevronDown, ChevronUp, Plus, X } from "lucide-react";
import { useState, useMemo } from "react";
// 경로가 다르다면 수정 필요
import GoogleAd from "../../components/GoogleAd";
import type { CharacterSummary } from "../../components/AddAccount";

// 🔥 레이드 정보 및 유틸리티 임포트
import { raidInformation } from "@/server/data/raids";
import { getRaidBaseLevel } from "@/app/lib/tasks/raid-utils";

export type SavedAccount = {
    id: string;
    nickname: string;
    summary: CharacterSummary;
    isPrimary?: boolean;
    isSelected?: boolean;
};

interface TaskSidebarProps {
    accounts: SavedAccount[];
    activeAccountId: string | null;
    onSelectAccount: (id: string) => void;
    onAddAccount: () => void;

    onlyRemain: boolean;
    setOnlyRemain: (v: boolean) => void;
    isCardView: boolean;
    setIsCardView: (v: boolean) => void;

    // 🔥 레이드 필터 상태
    selectedRaids: string[];
    setSelectedRaids: (v: string[]) => void;

    adSlot?: string;
}

export default function TaskSidebar({
    accounts,
    activeAccountId,
    onSelectAccount,
    onAddAccount,
    onlyRemain,
    setOnlyRemain,
    isCardView,
    setIsCardView,
    selectedRaids,
    setSelectedRaids,
    adSlot = "4444902536"
}: TaskSidebarProps) {
    const [isAccountListOpen, setIsAccountListOpen] = useState(false);
    const [isRaidDropdownOpen, setIsRaidDropdownOpen] = useState(false);

    const currentAccount = accounts.find(a => a.id === activeAccountId)
        ?? accounts.find(a => a.isPrimary)
        ?? accounts[0];

    // 모든 레이드 목록 가져오기 (레벨 높은 순 정렬)
    const allRaidNames = useMemo(() => {
        return Object.keys(raidInformation).sort((a, b) => getRaidBaseLevel(b) - getRaidBaseLevel(a));
    }, []);

    const toggleRaid = (raidName: string) => {
        if (selectedRaids.includes(raidName)) {
            setSelectedRaids(selectedRaids.filter(r => r !== raidName));
        } else {
            setSelectedRaids([...selectedRaids, raidName]);
        }
    };

    const removeRaidChip = (raidName: string) => {
        setSelectedRaids(selectedRaids.filter(r => r !== raidName));
    };

    return (
        <div className="space-y-4">
            {/* 1. 계정 선택 섹션 (기존 유지) */}
            <section className="rounded-none sm:rounded-sm bg-[#16181D]">
                <button
                    onClick={() => setIsAccountListOpen(!isAccountListOpen)}
                    className={`w-full flex items-center justify-between px-4 py-3.5 hover:bg-white/5 transition-colors ${isAccountListOpen ? 'bg-white/5' : ''}`}
                >
                    <div className="flex flex-col items-start">
                        <span className="text-[10px] text-gray-400 font-medium">현재 계정</span>
                        <span className="text-sm font-bold text-white">
                            {currentAccount ? currentAccount.nickname : '계정 선택'}
                        </span>
                    </div>
                    <div className="text-gray-400">
                        {isAccountListOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                    </div>
                </button>

                {isAccountListOpen && (
                    <div className="px-3 pb-3 pt-2 bg-[#16181D]">
                        <div className="flex flex-col gap-1">
                            {accounts.map((acc) => {
                                const isActive = acc.id === activeAccountId;
                                return (
                                    <button
                                        key={acc.id}
                                        onClick={() => {
                                            onSelectAccount(acc.id);
                                            setIsAccountListOpen(false);
                                        }}
                                        className={`relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 transition-all ${isActive ? "bg-[#5B69FF]/10 text-white" : "text-gray-400 hover:bg-white/5"}`}
                                    >
                                        <div className={`w-5 h-5 flex items-center justify-center ${isActive ? 'text-[#5B69FF]' : 'text-transparent'}`}>
                                            <Check className="h-4 w-4" strokeWidth={3} />
                                        </div>
                                        <span className="text-sm font-medium">{acc.nickname}</span>
                                    </button>
                                );
                            })}
                            <div className="my-1 border-t border-white/5 mx-2" />
                            <button onClick={onAddAccount} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-gray-400 hover:bg-white/5 hover:text-white">
                                <div className="flex items-center justify-center w-5 h-5"><Plus className="h-4 w-4" /></div>
                                <span className="text-sm font-medium">계정 추가</span>
                            </button>
                        </div>
                    </div>
                )}
            </section>

            {/* 2. 필터 섹션 */}
            <section className="rounded-none sm:rounded-sm bg-[#16181D]">
                <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                    <h3 className="text-base sm:text-lg font-semibold text-white">필터</h3>
                    <button
                        onClick={() => { setOnlyRemain(false); setIsCardView(false); setSelectedRaids([]); }}
                        className="text-[11px] sm:text-xs text-neutral-400 hover:text-neutral-200"
                    >
                        초기화 ⟳
                    </button>
                </header>
                <div className="px-5 py-7 space-y-7 text-sm">

                    {/* ✅ 숙제/보상 체크박스 디자인 복구 */}
                    <div className="space-y-3">
                        <div className="font-bold text-white">숙제/보상</div>
                        <label className="flex items-center gap-2 cursor-pointer text-[#A2A3A5] relative group">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={onlyRemain}
                                onChange={e => setOnlyRemain(e.target.checked)}
                            />
                            <span className="grid place-items-center h-5 w-5 rounded-md border border-white/30 transition peer-checked:bg-[#5B69FF] peer-checked:border-[#5B69FF] peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500 peer-checked:[&_svg]:opacity-100">
                                <svg className="h-4 w-4 text-white opacity-0 transition-opacity duration-150 peer-checked:opacity-100" viewBox="0 0 20 20" fill="none">
                                    <path d="M5 10l3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </span>
                            <span>남은 숙제만 보기</span>

                            <span className="w-3 h-3 rounded-full border border-white/20 text-[9px] font-bold flex items-center justify-center text-gray-400 bg-black/20 group-hover:text-white group-hover:border-white/40 transition-colors duration-200 cursor-help">
                                ?
                            </span>

                            {/* 툴팁 */}
                            <div className="pointer-events-none absolute left-6 top-full mt-2.5 w-64 p-4 rounded-2xl bg-gray-900/95 backdrop-blur-xl border border-white/[0.08] shadow-[0_8px_30px_rgb(0,0,0,0.4)] opacity-0 translate-y-1 scale-95 group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-100 transition-all duration-200 ease-out z-[200]">
                                <div className="flex flex-col gap-2 text-xs leading-relaxed text-left">
                                    <p className="text-gray-200">
                                        <span className="font-bold text-sky-400">카드 보기</span>에서만 적용됩니다.
                                        <span className="block text-gray-400 font-normal mt-0.5">
                                            마지막 관문까지 완료되지 않은 레이드만 필터링하여 보여줍니다.
                                        </span>
                                    </p>
                                    <div className="w-full h-px bg-white/5 my-0.5" />
                                    <p className="text-gray-400 font-medium">
                                        ※ 테이블 보기에서는 이 옵션이 적용되지 않습니다.
                                    </p>
                                </div>
                                <div className="absolute -top-[5px] left-6 w-2.5 h-2.5 bg-gray-900/95 border-t border-l border-white/[0.08] rotate-45 z-10" />
                            </div>
                        </label>
                    </div>

                    <div className="space-y-3">
                        <div className="font-semibold text-white">보기 설정</div>
                        <label className="flex items-center gap-2 cursor-pointer text-[#A2A3A5]">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={isCardView}
                                onChange={e => setIsCardView(e.target.checked)}
                            />
                            <span className="grid place-items-center h-5 w-5 rounded-md border border-white/30 transition peer-checked:bg-[#5B69FF] peer-checked:border-[#5B69FF] peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500 peer-checked:[&_svg]:opacity-100">
                                <svg className="h-4 w-4 text-white opacity-0 transition-opacity duration-150 peer-checked:opacity-100" viewBox="0 0 20 20" fill="none">
                                    <path d="M5 10l3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </span>
                            <span>카드로 보기</span>
                        </label>
                    </div>

                    <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between">
                            <div className="font-semibold text-white">레이드 설정</div>
                            {selectedRaids.length > 0 && (
                                <button
                                    onClick={() => setSelectedRaids([])}
                                    className="text-[11px] text-[#5B69FF] hover:text-[#4A57E6] transition-colors"
                                >
                                    초기화 ⟳
                                </button>
                            )}
                        </div>
                        <div className="relative">
                            <button
                                onClick={() => setIsRaidDropdownOpen(!isRaidDropdownOpen)}
                                className={`w-full flex items-center justify-between px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all ${isRaidDropdownOpen ? 'border-[#5B69FF]/50 ring-1 ring-[#5B69FF]/50' : ''}`}
                            >
                                <span className="text-xs text-gray-300 truncate pr-1">
                                    모든 레이드
                                </span>
                                {isRaidDropdownOpen ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                            </button>

                            {isRaidDropdownOpen && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-[#1E2128] border border-white/10 rounded-lg shadow-[0_10px_30px_rgba(0,0,0,0.5)] overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200 z-[100]">
                                    <div className="flex flex-col gap-1 p-1.5 max-h-64 overflow-y-auto custom-scrollbar">
                                        {allRaidNames.map((raidName) => {
                                            const isActive = selectedRaids.includes(raidName);
                                            return (
                                                <button
                                                    key={raidName}
                                                    onClick={() => toggleRaid(raidName)}
                                                    className={`relative flex w-full items-center gap-3 rounded-md px-3 py-2 transition-all ${isActive ? "bg-[#5B69FF]/10 text-white" : "text-gray-400 hover:bg-white/5"}`}
                                                >
                                                    <div className={`w-4 h-4 flex items-center justify-center transition-colors ${isActive ? 'text-[#5B69FF]' : 'text-transparent'}`}>
                                                        <Check className="h-3.5 w-3.5" strokeWidth={3} />
                                                    </div>
                                                    <span className="text-xs font-medium">{raidName}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        {selectedRaids.length > 0 && (
                            <div className="grid grid-cols-2 gap-2 mt-3 animate-in fade-in duration-300">
                                {selectedRaids.map((raid) => (
                                    <div
                                        key={raid}
                                        className="flex items-center justify-between gap-1.5 px-2.5 py-1 rounded-full bg-[#5B69FF]/10 border border-[#5B69FF]/30 text-[#A2A3A5] text-[10px] font-medium transition-all hover:border-[#5B69FF]/60 min-w-0"
                                    >
                                        <span className="text-gray-200 truncate">{raid}</span>
                                        <button
                                            onClick={() => removeRaidChip(raid)}
                                            className="p-0.5 hover:bg-[#5B69FF]/20 rounded-full transition-colors group shrink-0"
                                        >
                                            <X className="w-3 h-3 text-gray-500 group-hover:text-white" strokeWidth={2.5} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
}