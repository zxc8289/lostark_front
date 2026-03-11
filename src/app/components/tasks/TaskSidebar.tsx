// components/tasks/layout/TaskSidebar.tsx
"use client";

import { Check, ChevronDown, ChevronUp, Plus, Users, X } from "lucide-react";
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

    isDragEnabled: boolean;
    setIsDragEnabled: (v: boolean) => void;
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
    adSlot = "4444902536",
    isDragEnabled,
    setIsDragEnabled
}: TaskSidebarProps) {
    const [isAccountListOpen, setIsAccountListOpen] = useState(false);
    const [isRaidDropdownOpen, setIsRaidDropdownOpen] = useState(false);

    const isAllView = activeAccountId === "ALL";

    const currentAccount = isAllView
        ? { nickname: "모두 보기" }
        : (accounts.find(a => a.id === activeAccountId) ?? accounts.find(a => a.isPrimary) ?? accounts[0]);


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

    const handleToggleAllView = (checked: boolean) => {
        if (checked) {
            onSelectAccount("ALL");
        } else {
            const defaultAcc = accounts.find(a => a.isPrimary) ?? accounts[0];
            if (defaultAcc) onSelectAccount(defaultAcc.id);
        }
    };

    return (
        <div className="space-y-4">
            {/* 1. 계정 선택 섹션 (기존 유지) */}
            <section className="rounded-none sm:rounded-sm bg-[#16181D]">
                <button
                    onClick={() => setIsAccountListOpen(!isAccountListOpen)}
                    className={`w-full flex items-center justify-between px-4 py-4 hover:bg-white/5 transition-colors ${isAccountListOpen ? 'bg-white/5' : ''}`}
                >
                    <div className="flex flex-col items-start">
                        <span className="text-[10px] text-gray-400 font-medium">현재 계정</span>
                        <span className="text-base font-bold text-white">
                            {currentAccount ? currentAccount.nickname : '계정 선택'}
                        </span>
                    </div>
                    <div className="text-gray-400">
                        {isAccountListOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                    </div>
                </button>

                {isAccountListOpen && (
                    <div className="px-3 pb-3 pt-2 bg-[#16181D]">
                        {accounts.length > 1 && (
                            <div className="flex items-center justify-between px-3 py-2.5 mb-2 bg-[#0F1115] rounded-lg border border-white/5">
                                <div className="flex items-center gap-2">
                                    <Users className="w-4 h-4 text-gray-400" />
                                    <span className="text-xs font-semibold text-gray-200">모두 보기</span>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={isAllView}
                                        onChange={(e) => handleToggleAllView(e.target.checked)}
                                    />
                                    <div className="w-9 h-5 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#5B69FF]"></div>
                                </label>
                            </div>
                        )}
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
                {/* 🔥 xl(1280px) 이상에서는 세로(flex-col), 그 미만에서는 가로(flex-row)로 배치 */}
                <div className="flex flex-col xl:flex-col sm:flex-row flex-wrap px-5 py-7 gap-7 xl:space-y-0 text-sm">

                    {/* ✅ 숙제/보상 체크박스 */}
                    <div className="space-y-3 flex-1 min-w-[140px]">
                        <div className="font-bold text-white">숙제/보상</div>
                        <label className="flex items-center gap-2 cursor-pointer text-[#A2A3A5] relative group w-max">
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
                        </label>
                    </div>

                    {/* ✅ 보기 설정 */}
                    <div className="space-y-3 flex-1 min-w-[120px]">
                        <div className="font-semibold text-white">보기 설정</div>
                        <label className="flex items-center gap-2 cursor-pointer text-[#A2A3A5] w-max">
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

                    {/* ✅ 자리 이동 */}
                    <div className="space-y-3 flex-1 min-w-[140px]">
                        <div className="font-semibold text-white">자리 이동</div>
                        <label className="flex items-center gap-2 cursor-pointer text-[#A2A3A5] w-max">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={isDragEnabled}
                                onChange={(e) => setIsDragEnabled(e.target.checked)}
                            />
                            <span className="grid place-items-center h-5 w-5 rounded-md border border-white/30 transition peer-checked:bg-[#5B69FF] peer-checked:border-[#5B69FF] peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500 peer-checked:[&_svg]:opacity-100">
                                <svg className="h-4 w-4 text-white opacity-0 transition-opacity duration-150 peer-checked:opacity-100" viewBox="0 0 20 20" fill="none">
                                    <path d="M5 10l3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </span>
                            <span>드래그로 자리 이동</span>
                        </label>
                    </div>

                    <div className="space-y-3 flex-[2] min-w-[140px] xl:w-full pt-0">
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
                                <div className="absolute top-full left-0 right-0 mt-2 bg-[#1E2128] border border-white/10 rounded-lg overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200 z-[10]">
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
                            <div className="flex flex-wrap gap-2 mt-3 animate-in fade-in duration-300">
                                {selectedRaids.map((raid) => (
                                    <div
                                        key={raid}
                                        className="flex items-center justify-between gap-1.5 px-2.5 py-1 rounded-full bg-[#5B69FF]/10 border border-[#5B69FF]/30 text-[#A2A3A5] text-[10px] font-medium transition-all hover:border-[#5B69FF]/60 min-w-0"
                                    >
                                        <span className="text-gray-200 truncate max-w-[100px]">{raid}</span>
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