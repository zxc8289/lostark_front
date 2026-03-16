// src/app/components/tasks/RaidPlannerTab.tsx
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Plus, Users, Swords, X, AlertTriangle, Check, ChevronLeft, ChevronRight, Edit2, Loader2 } from "lucide-react";
import {
    DndContext,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
    PointerSensor,
    TouchSensor,
    useSensor,
    useSensors,
    useDraggable,
    useDroppable,
} from "@dnd-kit/core";
import type { PartyMemberTasks } from "@/app/party-tasks/[partyId]/page";
import { raidInformation } from "@/server/data/raids";

// 🔥 onBulkToggleGate 속성 추가
type RaidPlannerTabProps = {
    partyId: number;
    partyTasks: PartyMemberTasks[];
    onBulkToggleGate?: (
        raidName: string,
        difficulty: string,
        gate: number,
        allGates: number[],
        targets: { userId: string; charName: string; currentGates: number[] }[],
        targetState: boolean
    ) => void;
};

export type RaidGroup = {
    id: string;
    raidName: string;
    groupName: string;
    difficulty: string;
    maxMembers: number;
    slots: (any | null)[];
};

type DifficultyKey = "노말" | "하드" | "나메" | "싱글";

const difficultyColors: Record<string, { badge: string; active: string; shadow: string; check: string; hover: string }> = {
    "하드": {
        badge: "bg-[#FF5252]/10 text-[#FF5252]",
        active: "bg-[#FF5252] border-[#FF5252] text-white",
        shadow: "shadow-[0_0_15px_rgba(255,82,82,0.3)]",
        check: "bg-[#FF5252] text-white border-[#FF5252]",
        hover: "hover:text-[#FF5252] hover:bg-[#FF5252]/10 hover:border-[#FF5252]/30",
    },
    "노말": {
        badge: "bg-[#5B69FF]/10 text-[#5B69FF]",
        active: "bg-[#5B69FF] border-[#5B69FF] text-white",
        shadow: "shadow-[0_0_15px_rgba(91,105,255,0.3)]",
        check: "bg-[#5B69FF] text-white border-[#5B69FF]",
        hover: "hover:text-[#5B69FF] hover:bg-[#5B69FF]/10 hover:border-[#5B69FF]/30",
    },
    "나메": {
        badge: "bg-[#6D28D9]/20 text-[#D6BCFA]",
        active: "bg-[#6D28D9] border-[#6D28D9] text-white",
        shadow: "shadow-[0_0_15px_rgba(109,40,217,0.3)]",
        check: "bg-[#6D28D9] text-white border-[#6D28D9]",
        hover: "hover:text-[#6D28D9] hover:bg-[#6D28D9]/10 hover:border-[#6D28D9]/30",
    },
    "싱글": {
        badge: "bg-gray-500/10 text-gray-400",
        active: "bg-gray-500 border-gray-500 text-white",
        shadow: "shadow-[0_0_15px_rgba(156,163,175,0.3)]",
        check: "bg-[#F1F5F9] text-[#111217] border-[#F1F5F9] font-bold",
        hover: "hover:text-[#F1F5F9] hover:bg-[#F1F5F9]/10 hover:border-[#F1F5F9]/30",
    }
};

// 🔥 TaskTable에서 사용하는 버튼 스타일 추가
const DIFF_STYLES = {
    하드: { check: "bg-[#FF5252] text-white border-[#FF5252]", idle: "bg-[#FF5252]/8 text-[#FFB3B3]/80 border-[#FF5252]/40", hover: "hover:bg-[#FF5252] hover:text-white" },
    노말: { check: "bg-[#5B69FF] text-white border-[#5B69FF]", idle: "bg-[#5B69FF]/8 text-[#C0C6FF]/85 border-[#5B69FF]/40", hover: "hover:bg-[#5B69FF] hover:text-white" },
    나메: { check: "bg-[#6D28D9] text-white border-[#6D28D9]", idle: "bg-[#6D28D9]/8 text-[#D6BCFA]/85 border-[#6D28D9]/75", hover: "hover:bg-[#6D28D9] hover:text-white" },
    싱글: { check: "bg-[#F1F5F9] text-[#111217] border-[#F1F5F9]", idle: "bg-white/5 text-white/70 border-white/20", hover: "hover:bg-[#F1F5F9] hover:text-[#111217]" },
} as const;

const classIconMap: Record<string, string> = {
    "버서커": "berserker.svg", "디스트로이어": "destroyer.svg", "워로드": "warlord.svg", "홀리나이트": "holyknight.svg", "슬레이어": "slayer.svg",
    "배틀마스터": "battlemaster.svg", "인파이터": "infighter.svg", "기공사": "soulmaster.svg", "창술사": "lancemaster.svg", "스트라이커": "striker.svg",
    "브레이커": "Breaker.svg", "데빌헌터": "devilhunter.svg", "블래스터": "blaster.svg", "호크아이": "hawkeye.svg", "스카우터": "scouter.svg",
    "건슬링어": "gunslinger.svg", "바드": "bard.svg", "서머너": "summoner.svg", "아르카나": "arcana.svg", "소서리스": "elementalmaster.svg",
    "블레이드": "blade.svg", "데모닉": "demonic.svg", "리퍼": "reaper.svg", "소울이터": "souleater.svg", "도화가": "artist.svg",
    "기상술사": "aeromancer.svg", "발키리": "valkyrie.svg", "환수사": "wildsoul.svg", "가디언나이트": "dragon_knight.svg",
};

const SUPPORTER_ENGRAVINGS = ["절실한 구원", "축복의 오라", "만개", "해방자"];

export default function RaidPlannerTab({ partyId, partyTasks, onBulkToggleGate }: RaidPlannerTabProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [isEditMode, setIsEditMode] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const [originalGroups, setOriginalGroups] = useState<RaidGroup[]>([]);
    const [groups, setGroups] = useState<RaidGroup[]>([]);

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedGroupName, setSelectedGroupName] = useState<string>("");
    const [selectedRaidName, setSelectedRaidName] = useState<string | null>(null);
    const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);

    const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
    const [activeDragChar, setActiveDragChar] = useState<any | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
    );

    useEffect(() => {
        if (!partyId) return;

        const loadPlanner = async () => {
            try {
                const res = await fetch(`/api/party-tasks/${partyId}/planner`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.groups && data.groups.length > 0) {
                        setGroups(data.groups);
                        setOriginalGroups(data.groups);
                        setIsEditMode(false);
                    } else {
                        setIsEditMode(false);
                    }
                }
            } catch (e) {
                console.error("Failed to load planner data:", e);
            } finally {
                setIsLoading(false);
            }
        };

        loadPlanner();
    }, [partyId]);

    useEffect(() => {
        if (selectedRaidName && raidInformation[selectedRaidName]) {
            const availableDiffs = Object.keys(raidInformation[selectedRaidName].difficulty).filter(d => d !== "싱글");
            if (availableDiffs.length > 0 && !availableDiffs.includes(selectedDifficulty || "")) {
                setSelectedDifficulty(availableDiffs[0]);
            }
        }
    }, [selectedRaidName]);

    const baseCharacters = useMemo(() => {
        return partyTasks.flatMap(member => {
            const roster = member.summary?.roster ?? [];
            return roster
                .filter(char => member.visibleByChar?.[char.name] !== false)
                .map(char => ({
                    ...char,
                    ownerName: member.nickname || member.name || "알 수 없음",
                    ownerId: member.userId,
                    uniqueId: `${member.userId}-${char.name}`
                }));
        });
    }, [partyTasks]);

    const waitlistCharacters = useMemo(() => {
        if (!activeGroupId) return [];
        const activeGroup = groups.find(g => g.id === activeGroupId);
        if (!activeGroup) return [];

        const reqLevel = raidInformation[activeGroup.raidName]?.difficulty[activeGroup.difficulty as DifficultyKey]?.level || 0;
        const assignedUniqueIdsForThisRaid = new Set(
            groups
                .filter(g => g.raidName === activeGroup.raidName)
                .flatMap(g => g.slots.map(s => s?.uniqueId))
                .filter(Boolean)
        );
        const ownersInActiveGroup = new Set(activeGroup.slots.map(s => s?.ownerId).filter(Boolean));

        return baseCharacters.filter(char => {
            if ((char.itemLevelNum || 0) < reqLevel) return false;
            if (assignedUniqueIdsForThisRaid.has(char.uniqueId)) return false;
            if (ownersInActiveGroup.has(char.ownerId)) return false;
            return true;
        });
    }, [baseCharacters, groups, activeGroupId]);

    const activeGroup = groups.find(g => g.id === activeGroupId) || null;

    const handleSavePlanner = async () => {
        if (!partyId) return;
        setIsSaving(true);

        try {
            const payload = groups.map(g => ({
                id: g.id,
                raidName: g.raidName,
                groupName: g.groupName,
                difficulty: g.difficulty,
                maxMembers: g.maxMembers,
                slots: g.slots.map(char => char ? {
                    uniqueId: char.uniqueId,
                    ownerId: char.ownerId,
                    ownerName: char.ownerName,
                    name: char.name,
                    className: char.className,
                    itemLevelNum: char.itemLevelNum,
                    combatPower: char.combatPower,
                    jobEngraving: char.jobEngraving
                } : null)
            }));

            const res = await fetch(`/api/party-tasks/${partyId}/planner`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ groups: payload }),
            });

            if (!res.ok) {
                throw new Error("편성 저장에 실패했습니다.");
            }

            setOriginalGroups(payload);
            setIsEditMode(false);
            setActiveGroupId(null);

        } catch (error: any) {
            console.error("Save Planner Error:", error);
            alert(error.message || "서버 통신 중 오류가 발생했습니다.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancelEdit = () => {
        setGroups(originalGroups);
        setIsEditMode(false);
        setActiveGroupId(null);
    };

    const openAddModal = () => {
        setSelectedGroupName("");
        setSelectedRaidName(null);
        setSelectedDifficulty(null);
        setIsAddModalOpen(true);
    };

    const closeAddModal = () => setIsAddModalOpen(false);

    const confirmAddGroup = () => {
        if (!selectedRaidName || !selectedDifficulty || !selectedGroupName.trim()) return;
        const info = raidInformation[selectedRaidName];

        let max = 8;
        if ((info as any).maxMembers) {
            max = (info as any).maxMembers;
        } else {
            if (info.kind === "어비스" || info.kind === "그림자") max = 4;
            else if (info.kind === "에픽") max = 16;
            if (selectedRaidName.includes("쿠크") || selectedRaidName.includes("세르카") || selectedRaidName.includes("카양겔") || selectedRaidName.includes("상아탑")) {
                max = 4;
            }
        }

        const newGroup: RaidGroup = {
            id: `group-${Date.now()}`,
            raidName: selectedRaidName,
            groupName: selectedGroupName.trim(),
            difficulty: selectedDifficulty,
            maxMembers: max,
            slots: Array(max).fill(null),
        };

        setGroups([...groups, newGroup]);
        setActiveGroupId(newGroup.id);
        closeAddModal();
    };

    const removeGroup = (groupId: string) => {
        setGroups(groups.filter(g => g.id !== groupId));
        if (activeGroupId === groupId) setActiveGroupId(null);
    };

    const removeCharFromSlot = (groupId: string, slotIndex: number) => {
        setGroups(prev => prev.map(g => {
            if (g.id === groupId) {
                const newSlots = [...g.slots];
                newSlots[slotIndex] = null;
                return { ...g, slots: newSlots };
            }
            return g;
        }));
    };

    const handleDragStart = (e: DragStartEvent) => setActiveDragChar(e.active.data.current?.char);

    const handleDragEnd = (e: DragEndEvent) => {
        setActiveDragChar(null);
        const { active, over } = e;
        if (!over) return;

        const char = active.data.current?.char;
        if (!char) return;

        const overId = String(over.id);

        if (overId === "waitlist") {
            setGroups(prev => prev.map(g => ({
                ...g,
                slots: g.slots.map(s => s?.uniqueId === char.uniqueId ? null : s)
            })));
            return;
        }

        if (overId.startsWith("slot::")) {
            const [, groupId, slotIndexStr] = overId.split("::");
            const slotIndex = parseInt(slotIndexStr, 10);
            const targetGroup = groups.find(g => g.id === groupId);

            if (!targetGroup) return;

            const reqLevel = raidInformation[targetGroup.raidName]?.difficulty[targetGroup.difficulty as DifficultyKey]?.level || 0;
            if ((char.itemLevelNum || 0) < reqLevel) {
                alert("레벨이 부족하여 배치할 수 없습니다.");
                return;
            }

            const hasSameOwnerInGroup = targetGroup.slots.some(s => s && s.ownerId === char.ownerId && s.uniqueId !== char.uniqueId);
            if (hasSameOwnerInGroup) {
                alert("한 레이드 파티에는 동일한 유저의 캐릭터를 중복으로 편성할 수 없습니다.");
                return;
            }

            setGroups(prev => {
                const next = [...prev];
                for (const g of next) {
                    for (let i = 0; i < g.slots.length; i++) {
                        if (g.slots[i]?.uniqueId === char.uniqueId) g.slots[i] = null;
                    }
                }
                const tg = next.find(g => g.id === groupId);
                if (tg) tg.slots[slotIndex] = char;
                return next;
            });

            setActiveGroupId(groupId);
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-32 text-gray-500">
                <Loader2 className="w-10 h-10 animate-spin text-[#5B69FF] mb-4" />
                <p>레이드 편성 데이터를 불러오는 중입니다...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 relative">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-[#16181D] rounded-xl border border-white/10 shadow-md">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Swords className="w-5 h-5 text-[#5B69FF]" />
                        레이드 그룹
                    </h2>
                    <p className="text-sm text-gray-400 mt-1 break-keep">
                        {isEditMode
                            ? "우측에서 그룹을 선택하고, 좌측의 캐릭터를 드래그하여 배치하세요."
                            : "파티원들의 레이드 그룹표를 한눈에 확인하세요."}
                    </p>
                </div>

                <div className="flex flex-row gap-2 sm:gap-3 w-full sm:w-auto">
                    {isEditMode ? (
                        <>
                            <button
                                onClick={openAddModal}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-2 bg-[#1E2028] hover:bg-white/10 border border-white/10 text-white text-sm font-bold rounded-lg transition-colors whitespace-nowrap"
                            >
                                <Plus className="w-4 h-4" />
                                그룹 추가
                            </button>
                            <button
                                onClick={handleCancelEdit}
                                disabled={isSaving}
                                className="flex-1 sm:flex-none flex items-center justify-center px-3 sm:px-4 py-2.5 sm:py-2 bg-[#2A2D36] hover:bg-[#343843] text-gray-300 text-sm font-bold rounded-lg transition-colors"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleSavePlanner}
                                disabled={isSaving}
                                className="flex-[1.5] sm:flex-none flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-2 bg-[#5B69FF] hover:bg-[#4A57E6] disabled:bg-gray-600 text-white text-sm font-bold rounded-lg transition-colors whitespace-nowrap"
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                저장
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={() => setIsEditMode(true)}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 sm:py-2 bg-[#1E2028] hover:bg-white/10 border border-white/10 text-white text-sm font-bold rounded-lg transition-colors"
                        >
                            <Edit2 className="w-4 h-4" />
                            그룹 수정
                        </button>
                    )}
                </div>
            </div>

            {!isEditMode ? (
                <div className="w-full">
                    {groups.length === 0 ? (
                        <div className="w-full text-center text-gray-500 py-32 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-xl px-4 bg-[#16181D]">
                            <Swords className="w-12 h-12 mb-4 text-gray-600 opacity-50" />
                            <h3 className="text-lg font-bold text-gray-300 mb-2">아직 편성된 레이드가 없습니다.</h3>
                            <p className="break-keep text-sm mb-6">상단의 [그룹 수정] 버튼을 눌러 새로운 그룹을 만들고 파티원을 배치해보세요.</p>
                            <button
                                onClick={() => setIsEditMode(true)}
                                className="px-6 py-2.5 bg-[#5B69FF] hover:bg-[#4A57E6] text-white text-sm font-bold rounded-lg transition-colors shadow-lg shadow-[#5B69FF]/20"
                            >
                                편성 시작하기
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {groups.map(group => (
                                <ReadOnlyGroupCard
                                    key={group.id}
                                    group={group}
                                    partyTasks={partyTasks} // 🔥 추가: 숙제 정보 접근용
                                    onBulkToggleGate={onBulkToggleGate} // 🔥 추가: 일괄 체크용
                                />
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                    {/* 1. 부모 div에 items-start, relative 추가 */}
                    <div className="flex flex-col xl:flex-row gap-6 items-start relative">

                        <div className="flex flex-col gap-3 w-full xl:w-80 shrink-0 xl:sticky xl:top-26 xl:z-20">
                            <WaitlistDroppable characters={waitlistCharacters} activeGroup={activeGroup} />
                        </div>

                        <div className="flex-1 w-full bg-[#16181D] rounded-xl border border-white/10 p-4 min-h-[600px] shadow-inner">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {groups.map(group => (
                                    <GroupCard
                                        key={group.id}
                                        group={group}
                                        isActive={group.id === activeGroupId}
                                        onClick={() => setActiveGroupId(group.id)}
                                        onRemove={() => removeGroup(group.id)}
                                        onRemoveChar={(idx) => removeCharFromSlot(group.id, idx)}
                                    />
                                ))}

                                {groups.length === 0 && (
                                    <div className="col-span-full text-center text-gray-500 py-32 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-xl px-4">
                                        <Swords className="w-12 h-12 mb-3 text-gray-600 opacity-50" />
                                        <p className="break-keep text-sm">생성된 레이드 그룹이 없습니다.<br />상단의 그룹 추가 버튼을 눌러 레이드를 만들어주세요.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <DragOverlay dropAnimation={null}>
                        {activeDragChar ? (
                            <div className="p-2 sm:p-2.5 h-14 sm:h-16 bg-[#2A2D36] border-2 border-[#5B69FF] rounded-lg shadow-2xl opacity-90 scale-105 flex items-center gap-2 pr-1 min-w-[150px] sm:min-w-[180px]">
                                <div className="w-7 h-7 sm:w-8 sm:h-8 shrink-0 bg-black/20 rounded border border-white/5 flex items-center justify-center overflow-hidden">
                                    <img
                                        src={`/icons/classes/${classIconMap[activeDragChar.className] || 'default.svg'}`}
                                        alt=""
                                        className="w-4 h-4 sm:w-6 sm:h-6 object-contain filter brightness-0 invert"
                                    />
                                </div>
                                <div className="flex flex-col justify-center min-w-0 flex-1">
                                    <div className="text-[11px] sm:text-[13px] font-bold text-white truncate">
                                        {activeDragChar.name}
                                    </div>
                                    <div className="text-[9px] sm:text-[11px] text-gray-400 flex gap-1 items-center truncate">
                                        <span className="text-yellow-400">Lv.{(activeDragChar.itemLevelNum || 0).toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                        ) : null}
                    </DragOverlay>
                </DndContext>
            )}

            {isAddModalOpen && isEditMode && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-0 animate-in fade-in duration-200">
                    <div className="absolute inset-0 transition-opacity" onClick={closeAddModal} />
                    <div className="relative w-full max-w-[min(800px,92vw)] flex flex-col rounded-2xl bg-[#16181D] shadow-2xl border border-white/10 overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh]">
                        <header className="px-5 py-5 sm:px-8 border-b border-white/10 flex items-center justify-between gap-4 bg-[#16181D] shrink-0">
                            <div>
                                <div className="flex items-center gap-3 mb-1">
                                    <h2 className="text-xl font-bold text-white tracking-tight">새 레이드 그룹 생성</h2>
                                </div>
                                <p className="text-xs sm:text-sm text-gray-400 leading-snug">그룹 이름과 추가할 레이드를 선택해주세요.</p>
                            </div>
                            <button onClick={closeAddModal} className="text-gray-400 hover:text-white transition-colors shrink-0">
                                <X className="w-6 h-6" />
                            </button>
                        </header>

                        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#121418] custom-scrollbar space-y-8">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-300">그룹 이름</label>
                                <input
                                    type="text"
                                    value={selectedGroupName}
                                    onChange={(e) => setSelectedGroupName(e.target.value)}
                                    placeholder="예: 토요일 저녁 8시 고정팟"
                                    maxLength={20}
                                    className="w-full bg-[#1E2028] border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-[#5B69FF] transition-colors"
                                />
                            </div>

                            {(["군단장", "카제로스", "어비스", "에픽", "그림자"] as const).map((kind) => {
                                const entries = Object.entries(raidInformation).filter(([, v]) => v.kind === kind);
                                if (!entries.length) return null;

                                return (
                                    <section key={kind} className="space-y-3">
                                        <div className="py-2 -mx-2 px-2 border-b border-white/5">
                                            <h4 className="flex items-center gap-2 text-xs font-bold text-gray-300 uppercase tracking-[0.18em]">
                                                <Swords size={14} className="text-[#5B69FF]" />
                                                {kind}
                                            </h4>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {entries.map(([raidName, info]) => {
                                                const isRaidSelected = selectedRaidName === raidName;

                                                return (
                                                    <div
                                                        key={raidName}
                                                        onClick={() => setSelectedRaidName(raidName)}
                                                        className={`group relative rounded-xl border p-4 transition-all duration-200 cursor-pointer ${isRaidSelected
                                                            ? "bg-[#1E222B] border-[#5B69FF] shadow-[0_0_15px_rgba(91,105,255,0.15)]"
                                                            : "bg-[#16181D] border-white/5 hover:border-white/20 hover:bg-[#1E222B]"
                                                            }`}
                                                    >
                                                        <div className="flex items-center justify-between mb-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-1 h-8 rounded-full ${isRaidSelected ? "bg-[#5B69FF]" : "bg-gray-700"}`} />
                                                                <div className={`font-bold flex items-center gap-2.5 ${isRaidSelected ? "text-white" : "text-gray-300"}`}>
                                                                    <span className="text-[14px] sm:text-[15px]">{raidName}</span>
                                                                </div>
                                                            </div>

                                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isRaidSelected ? "border-[#5B69FF] bg-[#5B69FF]" : "border-gray-500"}`}>
                                                                {isRaidSelected && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                                                            </div>
                                                        </div>

                                                        <div className="bg-[#121418] p-1 rounded-lg grid grid-cols-4 gap-1">
                                                            {Object.entries(info.difficulty)
                                                                .filter(([diff]) => diff !== "싱글")
                                                                .map(([diff, diffInfo]) => {
                                                                    const dKey = diff as DifficultyKey;
                                                                    const style = difficultyColors[dKey] || difficultyColors["노말"];
                                                                    const isDiffSelected = isRaidSelected && selectedDifficulty === diff;

                                                                    return (
                                                                        <button
                                                                            key={diff}
                                                                            disabled={!isRaidSelected}
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setSelectedDifficulty(diff);
                                                                            }}
                                                                            className={`
                                                                                relative flex flex-col xl:flex-row items-center justify-center gap-0.5 sm:gap-1.5 py-1.5 sm:py-2 text-[10px] sm:text-xs font-medium rounded-md transition-all
                                                                                ${!isRaidSelected ? "opacity-30 cursor-not-allowed bg-[#2A2E39]/30 text-gray-600" :
                                                                                    isDiffSelected ? style.check : `bg-[#2A2E39]/50 text-gray-400 ${style.hover}`
                                                                                }
                                                                            `}
                                                                        >
                                                                            <span>{diff}</span>
                                                                            {diffInfo && <span className="opacity-60 text-[8px] sm:text-[9px]">{diffInfo.level}</span>}
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

                        <footer className="px-5 py-4 sm:px-8 bg-[#16181D] border-t border-white/10 flex gap-3 shrink-0">
                            <button
                                onClick={closeAddModal}
                                className="flex-[1] py-3 bg-white/5 hover:bg-white/10 text-gray-300 font-bold rounded-xl transition-colors text-sm"
                            >
                                취소
                            </button>
                            <button
                                disabled={!selectedRaidName || !selectedDifficulty || !selectedGroupName.trim()}
                                onClick={confirmAddGroup}
                                className="flex-[2] sm:flex-none sm:px-10 py-3 bg-[#5B69FF] hover:bg-[#4A57E6] disabled:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-[#5B69FF]/20 ml-auto"
                            >
                                그룹 만들기
                            </button>
                        </footer>
                    </div>
                </div>
            )}
        </div>
    );
}

function ReadOnlyGroupCard({
    group,
    partyTasks,
    onBulkToggleGate
}: {
    group: RaidGroup,
    partyTasks: PartyMemberTasks[],
    onBulkToggleGate?: RaidPlannerTabProps["onBulkToggleGate"]
}) {
    const [page, setPage] = useState(0);
    const colors = difficultyColors[group.difficulty] || difficultyColors["노말"];

    const isEpic = group.maxMembers > 8;
    const totalPages = Math.ceil(group.maxMembers / 8) || 1;
    const absoluteStartIndex = page * 8;

    const info = raidInformation[group.raidName];
    const diffInfo = info?.difficulty[group.difficulty as DifficultyKey];
    const allGates: number[] = diffInfo?.gates.map((g: any) => g.index) || [];

    // 🔥 1. 그룹 내 캐릭터들의 숙제 상태 계산 (이름을 charStates로 통일)
    const charStates = useMemo(() => {
        return group.slots.map((slotChar) => {
            if (!slotChar) return null;
            const member = partyTasks.find(m => m.userId === slotChar.ownerId);
            const charPref = member?.prefsByChar?.[slotChar.name]?.raids?.[group.raidName];

            const currentGates = (charPref && charPref.enabled && charPref.difficulty === group.difficulty)
                ? (charPref.gates || [])
                : [];

            const isFullyCompleted = allGates.length > 0 && allGates.every(g => currentGates.includes(g));

            return {
                ...slotChar,
                currentGates,
                isFullyCompleted
            };
        });
    }, [group.slots, partyTasks, group.raidName, group.difficulty, allGates]);

    return (
        <div className="bg-[#1E2028] rounded-xl p-4 flex flex-col shadow-sm border-2 border-white/5 h-fit">
            <span className="text-[13px] font-bold text-[#5B69FF] bg-[#5B69FF]/10 px-2 py-0.5 rounded-md self-start truncate max-w-[200px] mb-1.5">
                {group.groupName}
            </span>
            <div className="flex justify-between items-start mb-4 border-b border-white/5 pb-3">
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <h4 className="font-bold text-lg text-white">
                        {group.raidName}
                    </h4>
                    <span className={`text-xs px-2 py-0.5 rounded font-bold ${colors.badge}`}>
                        {group.difficulty}
                    </span>

                    {/* 🔥 2. 관문 체크 버튼 영역 (크기 복구 및 오류 수정) */}
                    {allGates.length > 0 && (
                        <div className="flex items-center gap-1.5 ml-1">
                            {allGates.map(g => {
                                // null이 아닌 실제 캐릭터들만 필터링
                                const groupChars = charStates.filter((c): c is NonNullable<typeof c> => c !== null);
                                const isAllChecked = groupChars.length > 0 && groupChars.every(c => c.currentGates.includes(g));
                                const diffStyle = DIFF_STYLES[group.difficulty as keyof typeof DIFF_STYLES] || DIFF_STYLES["노말"];

                                return (
                                    <button
                                        key={g}
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (!onBulkToggleGate || groupChars.length === 0) return;

                                            // targets 데이터 매핑
                                            const targets = groupChars.map(c => ({
                                                userId: c.ownerId,
                                                charName: c.name,
                                                currentGates: c.currentGates
                                            }));

                                            onBulkToggleGate(group.raidName, group.difficulty, g, allGates, targets, !isAllChecked);
                                        }}
                                        className={`w-6.5 h-6.5 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold border transition-all duration-150 ${isAllChecked ? `${diffStyle.check} border-transparent hover:scale-110` : `${diffStyle.idle} ${diffStyle.hover}`
                                            }`}
                                    >
                                        {isAllChecked ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : g}
                                    </button>
                                )
                            })}
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-3 mt-1 shrink-0">
                    <span className="text-xs text-gray-400 bg-black/30 px-2 py-1 rounded border border-white/5">
                        {group.slots.filter(Boolean).length} / {group.maxMembers}
                    </span>
                </div>
            </div>

            <div className="grid gap-2 sm:gap-3 grid-cols-2">
                {[0, 1].map((partyOffset) => {
                    const actualPartyNumber = (page * 2) + partyOffset + 1;
                    const startIndex = absoluteStartIndex + (partyOffset * 4);

                    return (
                        <div key={partyOffset} className="flex flex-col gap-1.5 sm:gap-2">
                            <div className="text-[11px] font-bold text-gray-500 px-1 pb-0.5 mb-[-2px]">
                                {actualPartyNumber}파티
                            </div>

                            {Array.from({ length: 4 }).map((_, slotOffset) => {
                                const absoluteIndex = startIndex + slotOffset;
                                const isBlocked = absoluteIndex >= group.maxMembers;

                                if (isBlocked) {
                                    return (
                                        <div key={`blocked-${absoluteIndex}`} className="h-14 sm:h-16 border-2 border-transparent bg-white/[0.02] rounded-lg flex items-center justify-center pointer-events-none">
                                            <X className="w-5 h-5 text-gray-600/30" />
                                        </div>
                                    );
                                }

                                const char = charStates[absoluteIndex];
                                return (
                                    <div key={absoluteIndex} className={`h-14 sm:h-16 border-2 rounded-lg flex items-center overflow-hidden transition-all ${char ? "border-transparent bg-[#252832]" : "border-dashed border-white/10 bg-white/[0.02]"}`}>
                                        {char ? (
                                            <ReadOnlyChar
                                                char={char}
                                                isCompleted={char.isFullyCompleted}
                                            />
                                        ) : (
                                            <div className="w-full text-center text-[10px] sm:text-xs text-gray-600 font-medium">비어있음</div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}
            </div>

            {isEpic && (
                <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t border-white/5">
                    <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="p-1 text-gray-400 hover:text-white disabled:opacity-30">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="flex gap-2">
                        {Array.from({ length: totalPages }).map((_, idx) => (
                            <button key={idx} onClick={() => setPage(idx)} className={`w-2 h-2 rounded-full transition-colors ${page === idx ? 'bg-[#5B69FF]' : 'bg-gray-600'}`} />
                        ))}
                    </div>
                    <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page === totalPages - 1} className="p-1 text-gray-400 hover:text-white disabled:opacity-30">
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            )}
        </div>
    );
}

function ReadOnlyChar({ char, isCompleted }: { char: any, isCompleted?: boolean }) {
    const iconFileName = classIconMap[char.className] || 'default.svg';
    const iconUrl = `/icons/classes/${iconFileName}`;

    return (
        <div className={`w-full h-full flex items-center gap-2 sm:gap-3 min-w-0 px-2 sm:px-3 transition-all ${isCompleted ? "opacity-90 grayscale brightness-75" : "opacity-100"}`}>
            <div className="w-6 h-6 sm:w-8 sm:h-8 shrink-0 bg-black/30 rounded-md border border-white/5 flex items-center justify-center overflow-hidden">
                <img
                    src={iconUrl}
                    alt={char.className}
                    className="w-4 h-4 sm:w-6 sm:h-6 object-contain filter brightness-0 invert"
                    onError={(e) => {
                        (e.currentTarget.parentNode as HTMLDivElement).innerHTML = `<span class="text-[8px] text-gray-400">${char.className?.charAt(0)}</span>`;
                    }}
                />
            </div>
            <div className="flex flex-col justify-center min-w-0 flex-1 pr-1">
                <div className={`text-[11px] sm:text-[13px] font-bold truncate ${isCompleted ? "text-gray-400" : "text-white"}`}>
                    {char.name}
                    {isCompleted && <span className="ml-1 text-[9px] text-gray-400 font-normal">(완료)</span>}
                </div>
                <div className="text-[9px] sm:text-[11px] text-gray-400 truncate flex gap-1 items-center">
                    <span className={`${isCompleted ? "text-gray-400" : "text-yellow-400/80"}`}>Lv.{char.itemLevelNum || 0}</span>
                    <span className="w-1 h-1 rounded-full bg-white/20 shrink-0" />
                    <span className="truncate text-gray-400">{char.ownerName}</span>
                </div>
            </div>
        </div>
    );
}
// ... 아래 GroupCard 등 DndKit 관련 수정 모드 컴포넌트는 기존 코드 유지 ...
function GroupCard({ group, isActive, onClick, onRemove, onRemoveChar }: {
    group: RaidGroup;
    isActive: boolean;
    onClick: () => void;
    onRemove: () => void;
    onRemoveChar: (idx: number) => void;
}) {
    const [page, setPage] = useState(0);
    const colors = difficultyColors[group.difficulty] || difficultyColors["노말"];

    const isEpic = group.maxMembers > 8;
    const totalPages = Math.ceil(group.maxMembers / 8) || 1;
    const absoluteStartIndex = page * 8;

    return (
        <div
            onClick={onClick}
            className={`bg-[#1E2028] rounded-xl p-4 flex flex-col shadow-sm border-2 cursor-pointer transition-all ${isActive ? "border-[#5B69FF] shadow-[0_0_20px_rgba(91,105,255,0.15)]" : "border-white/5 hover:border-white/20"}`}
        >
            <span className="text-[14px] font-bold text-[#5B69FF] rounded-md self-start truncate max-w-[200px] mb-1.5">
                {group.groupName}
            </span>
            <div className="flex justify-between items-start mb-4 border-b border-white/5 pb-3">
                <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2 mt-1">
                        <h4 className={`font-bold text-lg ${isActive ? "text-white" : "text-gray-300"}`}>
                            {group.raidName}
                        </h4>
                        <span className={`text-xs px-2 py-0.5 rounded font-bold ${isActive ? colors.badge : "bg-gray-700/50 text-gray-500"}`}>
                            {group.difficulty}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-gray-400 bg-black/30 px-2 py-1 rounded border border-white/5">
                        {group.slots.filter(Boolean).length} / {group.maxMembers}
                    </span>
                    <button
                        onClick={(e) => { e.stopPropagation(); onRemove(); }}
                        className="text-gray-500 hover:text-red-400 transition-colors p-1"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="grid gap-2 sm:gap-3 grid-cols-2">
                {[0, 1].map((partyOffset) => {
                    const actualPartyNumber = (page * 2) + partyOffset + 1;
                    const startIndex = absoluteStartIndex + (partyOffset * 4);

                    return (
                        <div key={partyOffset} className="flex flex-col gap-1.5 sm:gap-2">
                            <div className="text-[11px] font-bold text-gray-500 px-1 pb-0.5 mb-[-2px]">
                                {actualPartyNumber}파티
                            </div>

                            {Array.from({ length: 4 }).map((_, slotOffset) => {
                                const absoluteIndex = startIndex + slotOffset;
                                const isBlocked = absoluteIndex >= group.maxMembers;

                                if (isBlocked) {
                                    return (
                                        <div key={`blocked-${absoluteIndex}`} className="h-14 sm:h-16 border-2 border-transparent bg-white/[0.02] rounded-lg flex items-center justify-center pointer-events-none">
                                            <X className="w-5 h-5 text-gray-600/30" />
                                        </div>
                                    );
                                }

                                return (
                                    <DroppableSlot
                                        key={absoluteIndex}
                                        groupId={group.id}
                                        slotIndex={absoluteIndex}
                                        char={group.slots[absoluteIndex]}
                                        onRemove={() => onRemoveChar(absoluteIndex)}
                                    />
                                );
                            })}
                        </div>
                    );
                })}
            </div>

            {isEpic && (
                <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t border-white/5">
                    <button
                        onClick={(e) => { e.stopPropagation(); setPage(Math.max(0, page - 1)); }}
                        disabled={page === 0}
                        className="p-1 text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:text-gray-400"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>

                    <div className="flex gap-2">
                        {Array.from({ length: totalPages }).map((_, idx) => (
                            <button
                                key={idx}
                                onClick={(e) => { e.stopPropagation(); setPage(idx); }}
                                className={`w-2 h-2 rounded-full transition-colors ${page === idx ? 'bg-[#5B69FF]' : 'bg-gray-600 hover:bg-gray-400'}`}
                            />
                        ))}
                    </div>

                    <button
                        onClick={(e) => { e.stopPropagation(); setPage(Math.min(totalPages - 1, page + 1)); }}
                        disabled={page === totalPages - 1}
                        className="p-1 text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:text-gray-400"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            )}
        </div>
    );
}

function WaitlistDroppable({ characters, activeGroup }: { characters: any[], activeGroup: RaidGroup | null }) {
    const { setNodeRef, isOver } = useDroppable({
        id: "waitlist",
    });

    const diffColors = activeGroup ? (difficultyColors[activeGroup.difficulty] || difficultyColors["노말"]) : null;

    const groupedCharacters = useMemo(() => {
        const map = new Map<string, { ownerName: string; chars: any[] }>();
        characters.forEach(char => {
            if (!map.has(char.ownerId)) {
                map.set(char.ownerId, { ownerName: char.ownerName, chars: [] });
            }
            map.get(char.ownerId)!.chars.push(char);
        });
        return Array.from(map.values());
    }, [characters]);

    return (
        <div
            ref={setNodeRef}
            className={`w-full shrink-0 rounded-xl border p-4 h-[400px] xl:h-[600px] overflow-y-auto transition-colors flex flex-col custom-scrollbar ${isOver ? "bg-[#1E2028] border-[#5B69FF]/50" : "bg-[#16181D] border-white/10"
                }`}
        >
            {activeGroup ? (
                <>
                    <h3 className="font-bold text-white mb-4 flex items-center gap-2 border-b border-white/5 pb-3 shrink-0">
                        <Users className="w-4 h-4 text-[#5B69FF]" />
                        <div className="flex-1 truncate flex items-center gap-1.5">
                            {activeGroup.raidName}
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${diffColors?.badge}`}>
                                {activeGroup.difficulty}
                            </span>
                        </div>
                        <span className="text-xs text-white px-2 py-0.5 rounded-full shrink-0">
                            {characters.length}개
                        </span>
                    </h3>

                    <div className="flex flex-col gap-5 pb-4">
                        {groupedCharacters.map((group) => (
                            <div key={group.ownerName} className="space-y-2">
                                <div className="text-[12px] sm:text-[13px] font-bold text-gray-300 flex items-center gap-2 px-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#5B69FF]" />
                                    {group.ownerName}
                                    <span className="text-[10px] sm:text-xs text-gray-500 font-normal ml-auto border border-white/10 px-1.5 py-0.5 rounded bg-black/20">
                                        {group.chars.length}캐릭
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    {group.chars.map((char) => (
                                        <DraggableCharacter key={char.uniqueId} char={char} />
                                    ))}
                                </div>
                            </div>
                        ))}

                        {characters.length === 0 && (
                            <div className="text-center text-sm text-gray-500 mt-2 py-8 border-2 border-dashed border-white/5 rounded-lg flex flex-col items-center gap-2">
                                <AlertTriangle className="w-6 h-6 opacity-50" />
                                배치 가능한 캐릭터가 없습니다.
                            </div>
                        )}
                    </div>
                </>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-500 opacity-60 px-4 py-8 text-center min-h-[200px]">
                    <Users className="w-10 h-10 mb-3" />
                    <p className="text-sm break-keep">우측에서 편성할 레이드 그룹을<br />클릭하여 선택해주세요.</p>
                </div>
            )}
        </div>
    );
}

function DraggableCharacter({ char }: { char: any }) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `char::${char.uniqueId}`,
        data: { char },
    });

    const iconFileName = classIconMap[char.className] || 'default.svg';
    const iconUrl = `/icons/classes/${iconFileName}`;
    const isSupporter = SUPPORTER_ENGRAVINGS.includes(char.jobEngraving ?? "");

    if (isDragging) {
        return (
            <div className="p-2.5 bg-[#1E2028]/50 border border-white/5 rounded-lg flex items-center gap-2 opacity-30 h-14 sm:h-16">
                <div className="w-6 h-6 sm:w-7 sm:h-7 shrink-0 bg-black/30 rounded-md border border-white/5 flex items-center justify-center">
                    <img src={iconUrl} alt={char.className} className="w-4 h-4 sm:w-5 sm:h-5 object-contain filter brightness-0 invert" onError={(e) => (e.currentTarget.style.display = 'none')} />
                </div>
                <div className="min-w-0">
                    <div className="text-[11px] sm:text-xs font-bold text-white truncate">{char.name}</div>
                    <div className="text-[9px] sm:text-[10px] text-gray-500 mt-0.5">Lv.{char.itemLevelNum || 0}</div>
                </div>
            </div>
        );
    }

    return (
        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            className="p-2 sm:p-2.5 h-14 sm:h-16 bg-[#1E2028] border border-white/5 rounded-lg flex items-center justify-between hover:border-[#5B69FF] hover:bg-[#5B69FF]/5 cursor-grab active:cursor-grabbing shadow-sm transition-colors group touch-none"
        >
            <div className="min-w-0 flex-1 flex items-center gap-2 pr-1">
                <div className="w-7 h-7 sm:w-8 sm:h-8 shrink-0 bg-black/20 rounded border border-white/5 flex items-center justify-center overflow-hidden">
                    <img
                        src={iconUrl}
                        alt={char.className}
                        className="w-4 h-4 sm:w-6 sm:h-6 object-contain filter brightness-0 invert"
                        onError={(e) => {
                            (e.currentTarget.parentNode as HTMLDivElement).innerHTML = `<span class="text-[8px] text-gray-500">${char.className?.charAt(0)}</span>`;
                        }}
                    />
                </div>

                <div className="flex flex-col justify-center min-w-0 flex-1">
                    <div className="text-[11px] sm:text-[13px] font-bold text-white truncate group-hover:text-[#5B69FF] transition-colors">{char.name}</div>
                    <div className="text-[9px] sm:text-[11px] text-gray-400 flex gap-1 items-center truncate">
                        <span className="text-yellow-400 ">Lv.{(char.itemLevelNum || 0).toFixed(2)}</span>
                    </div>
                    {char.combatPower && (
                        <div className={`flex items-center gap-0.5 mt-0.5 text-[9px] sm:text-[10px] ${isSupporter ? "text-emerald-400" : "text-red-400"}`}>
                            <span className={!isSupporter ? "translate-y-[0.5px]" : ""}>
                                {isSupporter ? "✚" : "⚔️"}
                            </span>
                            <span>{char.combatPower}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function DroppableSlot({ groupId, slotIndex, char, onRemove }: { groupId: string, slotIndex: number, char: any | null, onRemove: () => void }) {
    const { setNodeRef, isOver } = useDroppable({
        id: `slot::${groupId}::${slotIndex}`,
    });

    return (
        <div
            ref={setNodeRef}
            className={`h-14 sm:h-16 border-2 rounded-lg flex items-center transition-colors relative overflow-hidden ${isOver ? "border-[#5B69FF] bg-[#5B69FF]/10" :
                char ? "border-transparent bg-[#252832]" : "border-dashed border-white/10 bg-white/[0.02]"
                }`}
        >
            {char ? (
                <div className="flex-1 w-full h-full flex items-center justify-between min-w-0">
                    <DraggableCharacterInSlot char={char} />
                    <button
                        onClick={(e) => { e.stopPropagation(); onRemove(); }}
                        onPointerDown={(e) => e.stopPropagation()}
                        className="absolute top-1 right-1 sm:top-1.5 sm:right-1.5 p-1 text-gray-500 hover:bg-red-500/20 hover:text-red-400 rounded-md transition-colors z-10"
                    >
                        <X className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    </button>
                </div>
            ) : (
                <div className="w-full text-center text-[10px] sm:text-xs text-gray-600 font-medium">
                    비어있음
                </div>
            )}
        </div>
    );
}

function DraggableCharacterInSlot({ char }: { char: any }) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `char::${char.uniqueId}`,
        data: { char },
    });

    const iconFileName = classIconMap[char.className] || 'default.svg';
    const iconUrl = `/icons/classes/${iconFileName}`;
    const isSupporter = SUPPORTER_ENGRAVINGS.includes(char.jobEngraving ?? "");

    return (
        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            className={`w-full h-full flex items-center gap-2 sm:gap-3 cursor-grab active:cursor-grabbing min-w-0 ${isDragging ? 'opacity-0' : 'opacity-100'} hover:bg-white/[0.02] rounded px-2 sm:px-3 transition-colors touch-none`}
        >
            <div className="w-6 h-6 sm:w-8 sm:h-8 shrink-0 bg-black/30 rounded-md border border-white/5 flex items-center justify-center overflow-hidden">
                <img
                    src={iconUrl}
                    alt={char.className}
                    className="w-4 h-4 sm:w-6 sm:h-6 object-contain filter brightness-0 invert"
                    onError={(e) => {
                        (e.currentTarget.parentNode as HTMLDivElement).innerHTML = `<span class="text-[8px] text-gray-500">${char.className?.charAt(0)}</span>`;
                    }}
                />
            </div>

            <div className="flex flex-col justify-center min-w-0 flex-1 pr-4 sm:pr-5">
                <div className="text-[11px] sm:text-[13px] font-bold text-white truncate">{char.name}</div>
                <div className="text-[9px] sm:text-[11px] text-gray-400 truncate flex gap-1 items-center">
                    <span className="text-yellow-400/80 ">Lv.{char.itemLevelNum || 0}</span>
                    <span className="w-1 h-1 rounded-full bg-white/20 shrink-0" />
                    <span className="truncate">{char.ownerName}</span>
                </div>
                {char.combatPower && (
                    <div className={`flex items-center gap-0.5  text-[9px] sm:text-[10px] ${isSupporter ? "text-emerald-400" : "text-red-400"}`}>
                        <span className={!isSupporter ? "translate-y-[1px]" : ""}>
                            {isSupporter ? "✚" : "⚔️"}
                        </span>
                        <span>{char.combatPower}</span>
                    </div>
                )}
            </div>
        </div>
    );
}