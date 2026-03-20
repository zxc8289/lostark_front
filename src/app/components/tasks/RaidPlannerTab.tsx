// src/app/components/tasks/RaidPlannerTab.tsx
"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { Plus, Users, Swords, X, AlertTriangle, Check, ChevronLeft, ChevronRight, Edit2, Loader2, Filter, ChevronUp, ChevronDown, Search, ArrowUpDown, Calendar } from "lucide-react";
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
    closestCenter,
} from "@dnd-kit/core";
import type { PartyMemberTasks } from "@/app/party-tasks/[partyId]/page";
import { raidInformation } from "@/server/data/raids";
import { CSS } from "@dnd-kit/utilities";
import { arrayMove, SortableContext, useSortable, rectSortingStrategy } from "@dnd-kit/sortable";

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
    scheduleDay?: string;
    scheduleTime?: string;
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

function getDisplayDifficulty(raidName: string, difficulty: string) {
    if (raidName === "지평의 성당") {
        if (difficulty === "노말") return "1단계";
        if (difficulty === "하드") return "2단계";
        if (difficulty === "나메") return "3단계";
    }
    return difficulty;
}

export default function RaidPlannerTab({ partyId, partyTasks, onBulkToggleGate }: RaidPlannerTabProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [isEditMode, setIsEditMode] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const [originalGroups, setOriginalGroups] = useState<RaidGroup[]>([]);
    const [groups, setGroups] = useState<RaidGroup[]>([]);

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedRaidName, setSelectedRaidName] = useState<string | null>(null);
    const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);

    const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
    const [activeDragChar, setActiveDragChar] = useState<any | null>(null);

    const [guestSearchInput, setGuestSearchInput] = useState("");
    const [isSearchingGuest, setIsSearchingGuest] = useState(false);
    const [guestModalOpen, setGuestModalOpen] = useState(false);
    const [guestTargetSlot, setGuestTargetSlot] = useState<{ groupId: string, slotIndex: number } | null>(null);
    const [guestSearchResult, setGuestSearchResult] = useState<{ roster: any[], ownerId: string, ownerName: string } | null>(null);
    const [guestSearchError, setGuestSearchError] = useState("");

    const [isReorderMode, setIsReorderMode] = useState(false);

    // 🔥 필터 관련 상태들
    const FILTER_KEY_REMAIN = "raidPlanner_onlyRemain";
    const FILTER_KEY_RAIDS = "raidPlanner_selectedRaids";
    const FILTER_KEY_USERS = "raidPlanner_selectedUsers";
    const FILTER_KEY_SCHEDULE = "raidPlanner_isScheduleView";

    const [onlyRemain, setOnlyRemain] = useState<boolean>(() => {
        if (typeof window === "undefined") return false;
        try { return JSON.parse(localStorage.getItem(FILTER_KEY_REMAIN) || "false"); } catch { return false; }
    });

    const [selectedRaids, setSelectedRaids] = useState<string[]>(() => {
        if (typeof window === "undefined") return [];
        try { return JSON.parse(localStorage.getItem(FILTER_KEY_RAIDS) || "[]"); } catch { return []; }
    });

    const [selectedUsers, setSelectedUsers] = useState<string[]>(() => {
        if (typeof window === "undefined") return [];
        try { return JSON.parse(localStorage.getItem(FILTER_KEY_USERS) || "[]"); } catch { return []; }
    });

    const [isScheduleView, setIsScheduleView] = useState<boolean>(() => {
        if (typeof window === "undefined") return false;
        try { return JSON.parse(localStorage.getItem(FILTER_KEY_SCHEDULE) || "false"); } catch { return false; }
    });

    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [isUserFilterOpen, setIsUserFilterOpen] = useState(false);

    useEffect(() => { try { localStorage.setItem(FILTER_KEY_REMAIN, JSON.stringify(onlyRemain)); } catch { } }, [onlyRemain]);
    useEffect(() => { try { localStorage.setItem(FILTER_KEY_RAIDS, JSON.stringify(selectedRaids)); } catch { } }, [selectedRaids]);
    useEffect(() => { try { localStorage.setItem(FILTER_KEY_USERS, JSON.stringify(selectedUsers)); } catch { } }, [selectedUsers]);
    useEffect(() => { try { localStorage.setItem(FILTER_KEY_SCHEDULE, JSON.stringify(isScheduleView)); } catch { } }, [isScheduleView]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
    );

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (isFilterOpen && !(e.target as Element).closest('.raid-filter-dropdown')) {
                setIsFilterOpen(false);
            }
            if (isUserFilterOpen && !(e.target as Element).closest('.user-filter-dropdown')) {
                setIsUserFilterOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isFilterOpen, isUserFilterOpen]);

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
                    uniqueId: `${member.userId}-${char.name}`,
                    isGuest: false
                }));
        });
    }, [partyTasks]);

    const handleOpenGuestModal = (groupId: string, slotIndex: number) => {
        setGuestTargetSlot({ groupId, slotIndex });
        setGuestSearchInput("");
        setGuestSearchResult(null);
        setGuestSearchError("");
        setGuestModalOpen(true);
    };

    const handleSearchGuestApi = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = guestSearchInput.trim();
        if (!trimmed) return;

        setIsSearchingGuest(true);
        setGuestSearchError("");
        setGuestSearchResult(null);

        try {
            const res = await fetch(`/api/lostark/character/${encodeURIComponent(trimmed)}`);
            if (!res.ok) throw new Error("캐릭터를 찾을 수 없습니다.");

            const data = await res.json();
            if (!data || !data.roster || data.roster.length === 0) {
                throw new Error("원정대 정보가 없습니다.");
            }

            const sortedRoster = [...data.roster].sort((a, b) => b.itemLevelNum - a.itemLevelNum);
            const topCharName = sortedRoster.length > 0 ? sortedRoster[0].name : trimmed;
            const guestOwnerId = `guest-${topCharName}`;

            setGuestSearchResult({
                roster: data.roster,
                ownerId: guestOwnerId,
                ownerName: trimmed
            });
        } catch (error: any) {
            setGuestSearchError(error.message);
        } finally {
            setIsSearchingGuest(false);
        }
    };

    const handleSelectGuestChar = (char: any) => {
        if (!guestTargetSlot || !guestSearchResult) return;

        const { ownerId, ownerName } = guestSearchResult;
        const targetGroup = groups.find(g => g.id === guestTargetSlot.groupId);

        if (targetGroup) {
            const hasSameOwner = targetGroup.slots.some(s => s && s.ownerId === ownerId);
            if (hasSameOwner) {
                alert("해당 레이드 그룹에 이미 동일한 원정대의 캐릭터가 존재합니다.");
                return;
            }
        }

        const newGuestChar = {
            ...char,
            ownerName: ownerName,
            ownerId: ownerId,
            uniqueId: `${ownerId}-${char.name}`,
            isGuest: true
        };

        setGroups(prev => prev.map(g => {
            if (g.id === guestTargetSlot.groupId) {
                const newSlots = [...g.slots];
                newSlots[guestTargetSlot.slotIndex] = newGuestChar;
                return { ...g, slots: newSlots };
            }
            return g;
        }));

        setGuestModalOpen(false);
    };

    const syncedGroups = useMemo(() => {
        return groups.map(group => ({
            ...group,
            slots: group.slots.map(slotChar => {
                if (!slotChar) return null;
                if (slotChar.isGuest) return slotChar;

                const freshData = baseCharacters.find(c => c.uniqueId === slotChar.uniqueId);
                if (freshData) return { ...slotChar, ...freshData };

                return null;
            })
        }));
    }, [groups, baseCharacters]);

    const availableFilterRaids = useMemo(() => Array.from(new Set(groups.map(g => g.raidName))), [groups]);

    const availableFilterUsers = useMemo(() => {
        const users = new Map<string, string>();
        groups.forEach(g => {
            g.slots.forEach(s => {
                if (s && s.ownerId) users.set(s.ownerId, s.ownerName);
            });
        });
        return Array.from(users.entries()).map(([id, name]) => ({ id, name }));
    }, [groups]);

    const filteredGroups = useMemo(() => {
        return syncedGroups.filter(group => {
            if (selectedRaids.length > 0 && !selectedRaids.includes(group.raidName)) {
                return false;
            }

            if (selectedUsers.length > 0) {
                const groupUserIds = group.slots.filter(Boolean).map(slot => slot.ownerId);
                const hasAllSelectedUsers = selectedUsers.every(userId => groupUserIds.includes(userId));
                if (!hasAllSelectedUsers) return false;
            }

            // 🔥 수정 모드에서는 남은 숙제만 보기 필터를 무시합니다
            if (onlyRemain && !isEditMode) {
                const info = raidInformation[group.raidName];
                const diffInfo = info?.difficulty[group.difficulty as DifficultyKey];
                const allGates = diffInfo?.gates.map((g: any) => g.index) || [];
                const members = group.slots.filter(s => s !== null && !s.isGuest);

                if (members.length === 0) return true;

                const isGroupFullyCompleted = members.every(slotChar => {
                    const memberInfo = partyTasks.find(m => m.userId === slotChar.ownerId);
                    const charPref = memberInfo?.prefsByChar?.[slotChar.name]?.raids?.[group.raidName];
                    const currentGates = (charPref && charPref.enabled && charPref.difficulty === group.difficulty)
                        ? (charPref.gates || [])
                        : [];
                    return allGates.length > 0 && allGates.every(g => currentGates.includes(g));
                });

                if (isGroupFullyCompleted) return false;
            }

            return true;
        });
    }, [syncedGroups, selectedRaids, selectedUsers, onlyRemain, isEditMode, partyTasks]);

    const dayOrderMap = useMemo(() => {
        const days = ["일", "월", "화", "수", "목", "금", "토"];
        const todayIdx = new Date().getDay();
        const orderedDays = [];
        for (let i = 0; i < 7; i++) {
            orderedDays.push(days[(todayIdx + i) % 7]);
        }
        return orderedDays;
    }, []);

    const groupedBySchedule = useMemo(() => {
        if (!isScheduleView) return null;

        const groupsByDay: Record<string, RaidGroup[]> = {};
        const unscheduled: RaidGroup[] = [];

        dayOrderMap.forEach(day => {
            groupsByDay[day] = [];
        });

        filteredGroups.forEach(g => {
            if (g.scheduleDay && groupsByDay[g.scheduleDay]) {
                groupsByDay[g.scheduleDay].push(g);
            } else {
                unscheduled.push(g);
            }
        });

        dayOrderMap.forEach(day => {
            groupsByDay[day].sort((a, b) => {
                const timeA = a.scheduleTime || "24:00";
                const timeB = b.scheduleTime || "24:00";
                return timeA.localeCompare(timeB);
            });
        });

        unscheduled.sort((a, b) => {
            const timeA = a.scheduleTime || "24:00";
            const timeB = b.scheduleTime || "24:00";
            return timeA.localeCompare(timeB);
        });

        return { groupsByDay, unscheduled };
    }, [filteredGroups, isScheduleView, dayOrderMap]);

    const activeGroup = syncedGroups.find(g => g.id === activeGroupId) || null;

    const waitlistCharacters = useMemo(() => {
        if (!activeGroup) return [];

        const reqLevel = raidInformation[activeGroup.raidName]?.difficulty[activeGroup.difficulty as DifficultyKey]?.level || 0;
        const assignedUniqueIdsForThisRaid = new Set(
            syncedGroups
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
    }, [baseCharacters, syncedGroups, activeGroup]);

    const handleGroupDragEnd = async (e: DragEndEvent) => {
        const { active, over } = e;
        if (over && active.id !== over.id) {
            let newGroups = [...groups];
            setGroups((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over.id);
                newGroups = arrayMove(items, oldIndex, newIndex);
                return newGroups;
            });

            if (!partyId) return;

            try {
                const payload = newGroups.map(g => ({
                    id: g.id,
                    raidName: g.raidName,
                    groupName: g.groupName,
                    difficulty: g.difficulty,
                    maxMembers: g.maxMembers,
                    scheduleDay: g.scheduleDay || "",
                    scheduleTime: g.scheduleTime || "",
                    slots: g.slots.map(char => char ? {
                        uniqueId: char.uniqueId,
                        ownerId: char.ownerId,
                        ownerName: char.ownerName,
                        name: char.name,
                        className: char.className,
                        itemLevelNum: char.itemLevelNum,
                        combatPower: char.combatPower,
                        jobEngraving: char.jobEngraving,
                        isGuest: char.isGuest,
                    } : null)
                }));

                const res = await fetch(`/api/party-tasks/${partyId}/planner`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ groups: payload }),
                });

                if (res.ok) {
                    setOriginalGroups(payload);
                }
            } catch (error) {
                console.error("Auto Save Order Error:", error);
            }
        }
    };

    const toggleReorderMode = () => {
        if (!isReorderMode) {
            setSelectedRaids([]);
            setSelectedUsers([]);
            setOnlyRemain(false);
            setIsScheduleView(false);
        }
        setIsReorderMode(!isReorderMode);
    };

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
                scheduleDay: g.scheduleDay || "",
                scheduleTime: g.scheduleTime || "",
                slots: g.slots.map(char => char ? {
                    uniqueId: char.uniqueId,
                    ownerId: char.ownerId,
                    ownerName: char.ownerName,
                    name: char.name,
                    className: char.className,
                    itemLevelNum: char.itemLevelNum,
                    combatPower: char.combatPower,
                    jobEngraving: char.jobEngraving,
                    isGuest: char.isGuest,
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

    const updateGroupName = (groupId: string, newName: string) => {
        setGroups(prev => prev.map(g => g.id === groupId ? { ...g, groupName: newName } : g));
    };

    const updateGroupSchedule = (groupId: string, day: string, time: string) => {
        setGroups(prev => prev.map(g => g.id === groupId ? { ...g, scheduleDay: day, scheduleTime: time } : g));
    };

    const openAddModal = () => {
        setSelectedRaidName(null);
        setSelectedDifficulty(null);
        setIsAddModalOpen(true);
    };

    const closeAddModal = () => setIsAddModalOpen(false);

    const confirmAddGroup = () => {
        if (!selectedRaidName || !selectedDifficulty) return;
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
            groupName: `${selectedRaidName}`,
            difficulty: selectedDifficulty,
            maxMembers: max,
            slots: Array(max).fill(null),
            scheduleDay: "",
            scheduleTime: "",
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
            const sourceGroupId = active.data.current?.sourceGroupId;
            const sourceSlotIndex = active.data.current?.sourceSlotIndex;

            if (sourceGroupId) {
                setGroups(prev => prev.map(g => {
                    if (g.id === sourceGroupId) {
                        const newSlots = [...g.slots];
                        newSlots[sourceSlotIndex] = null;
                        return { ...g, slots: newSlots };
                    }
                    return g;
                }));
            }
            return;
        }

        if (overId.startsWith("slot::")) {
            const [, groupId, slotIndexStr] = overId.split("::");
            const slotIndex = parseInt(slotIndexStr, 10);

            const targetGroup = groups.find(g => g.id === groupId);
            if (!targetGroup) return;

            const existingChar = targetGroup.slots[slotIndex];

            const sourceGroupId = active.data.current?.sourceGroupId;
            const sourceSlotIndex = active.data.current?.sourceSlotIndex;
            let sourceGroup = null;
            if (sourceGroupId) {
                sourceGroup = groups.find(g => g.id === sourceGroupId);
            }

            const reqLevel = raidInformation[targetGroup.raidName]?.difficulty[targetGroup.difficulty as DifficultyKey]?.level || 0;
            if ((char.itemLevelNum || 0) < reqLevel) {
                alert("레벨이 부족하여 배치할 수 없습니다.");
                return;
            }

            const isMovingWithinSameGroup = sourceGroup?.id === targetGroup.id;

            const hasSameOwnerInGroup = targetGroup.slots.some((s, idx) => {
                if (!s) return false;
                if (idx === slotIndex) return false;
                if (isMovingWithinSameGroup && idx === sourceSlotIndex) return false;

                return s.ownerId === char.ownerId;
            });

            if (hasSameOwnerInGroup) {
                alert("한 레이드 파티에는 동일한 유저의 캐릭터를 중복으로 편성할 수 없습니다.");
                return;
            }

            if (sourceGroup && existingChar && sourceGroup.id !== targetGroup.id) {
                const sourceReqLevel = raidInformation[sourceGroup.raidName]?.difficulty[sourceGroup.difficulty as DifficultyKey]?.level || 0;
                if ((existingChar.itemLevelNum || 0) < sourceReqLevel) {
                    alert("자리를 교체할 캐릭터의 레벨이 출발지 그룹의 요구 레벨보다 낮아 바꿀 수 없습니다.");
                    return;
                }

                const existingHasSameOwnerInSource = sourceGroup.slots.some((s, idx) => {
                    if (!s) return false;
                    if (idx === sourceSlotIndex) return false;

                    return s.ownerId === existingChar.ownerId;
                });

                if (existingHasSameOwnerInSource) {
                    alert("자리 교체 시 출발지 파티에 동일 유저의 캐릭터가 중복 편성됩니다.");
                    return;
                }
            }

            setGroups(prev => {
                const nextGroups = prev.map(g => ({ ...g, slots: [...g.slots] }));
                const tg = nextGroups.find(g => g.id === groupId);
                if (!tg) return prev;

                if (sourceGroup && sourceSlotIndex !== undefined) {
                    const sg = nextGroups.find(g => g.id === sourceGroup!.id);
                    if (sg) {
                        sg.slots[sourceSlotIndex] = existingChar;
                    }
                }

                tg.slots[slotIndex] = char;
                return nextGroups;
            });

            setActiveGroupId(groupId);
        }
    };

    const toggleRaid = (raidName: string) => {
        if (selectedRaids.includes(raidName)) {
            setSelectedRaids(selectedRaids.filter(r => r !== raidName));
        } else {
            setSelectedRaids([...selectedRaids, raidName]);
        }
    };

    const toggleUser = (userId: string) => {
        if (selectedUsers.includes(userId)) {
            setSelectedUsers(selectedUsers.filter(id => id !== userId));
        } else {
            setSelectedUsers([...selectedUsers, userId]);
        }
    };

    const guestTargetGroup = guestTargetSlot ? groups.find(g => g.id === guestTargetSlot.groupId) : null;
    const guestReqLevel = guestTargetGroup
        ? raidInformation[guestTargetGroup.raidName]?.difficulty[guestTargetGroup.difficulty as DifficultyKey]?.level || 0
        : 0;

    if (isLoading) {
        return (
            <div className="flex flex-col gap-6 relative animate-in fade-in duration-300">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-[#16181D] rounded-xl border border-white/10 ">
                    <div className="space-y-3">
                        <div className="h-6 w-32 bg-white/5 rounded-md animate-pulse" />
                        <div className="h-4 w-64 bg-white/5 rounded-md animate-pulse" />
                    </div>
                    <div className="h-10 w-24 bg-white/5 rounded-lg animate-pulse hidden sm:block" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="bg-[#16181D] rounded-lg p-5 flex flex-col border border-white/5 h-fit animate-pulse">
                            <div className="h-4 w-24 bg-white/10 rounded mb-3" />
                            <div className="flex justify-between items-start mb-4 border-b border-white/5 pb-3">
                                <div className="flex items-center gap-2">
                                    <div className="h-6 w-28 bg-white/10 rounded" />
                                    <div className="h-5 w-12 bg-white/5 rounded" />
                                </div>
                                <div className="h-6 w-16 bg-white/5 rounded-full" />
                            </div>

                            <div className="grid gap-2 sm:gap-3 grid-cols-2">
                                {[0, 1].map((partyIdx) => (
                                    <div key={partyIdx} className="flex flex-col gap-1.5 sm:gap-2">
                                        <div className="h-3 w-8 bg-white/5 rounded mb-1" />
                                        {[...Array(4)].map((_, slotIdx) => (
                                            <div key={slotIdx} className="h-14 sm:h-16 border border-dashed border-white/10 bg-white/[0.02] rounded-lg" />
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    return (
        <div className="flex flex-col gap-4 sm:gap-4.5 relative">
            <div className="bg-[#16181D] rounded-none sm:rounded-sm border-x-0 px-4 sm:px-5 py-3 sm:py-4">
                <div className="flex flex-wrap gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between max-[1246px]:flex-col max-[1246px]:items-start max-[1246px]:justify-start">

                    <div className="flex flex-col gap-2 min-w-0 flex-1 w-full">
                        <div className="flex flex-wrap items-center gap-2 w-full text-sm sm:text-base">
                            {/* 🔥 수정 모드가 아닐 때만 자리이동 버튼 노출 */}
                            {!isEditMode && (
                                <button
                                    onClick={toggleReorderMode}
                                    className={`inline-flex items-center justify-center py-2 px-3 sm:px-4 rounded-md text-xs sm:text-sm transition-colors ${isReorderMode
                                        ? "bg-[#5B69FF]/20 text-[#5B69FF] border border-[#5B69FF]/50"
                                        : "bg-white/[.04] border border-white/10 hover:bg-white/5 hover:text-white"
                                        }`}
                                >
                                    <ArrowUpDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5" />
                                    자리 이동
                                </button>
                            )}

                            {/* 🔥 남은 숙제만 보기 버튼: 수정 모드가 아닐 때만 노출 */}
                            {!isEditMode && (
                                <button
                                    onClick={() => setOnlyRemain(!onlyRemain)}
                                    disabled={isReorderMode}
                                    className={`inline-flex items-center justify-center py-2 px-3 sm:px-4 rounded-md text-xs sm:text-sm transition-colors ${isReorderMode ? "opacity-50 cursor-not-allowed pointer-events-none " : ""
                                        } ${onlyRemain
                                            ? "bg-[#5B69FF]/20 text-[#5B69FF] border border-[#5B69FF]/50"
                                            : "bg-white/[.04] border border-white/10 hover:bg-white/5 hover:text-white"
                                        }`}
                                >
                                    남은 숙제만 보기
                                </button>
                            )}

                            {/* 🔥 아래 필터들은 수정 모드/보기 모드 관계없이 항상 노출 */}
                            <button
                                onClick={() => setIsScheduleView(!isScheduleView)}
                                disabled={isReorderMode}
                                className={`inline-flex items-center justify-center py-2 px-3 sm:px-4 rounded-md text-xs sm:text-sm transition-colors ${isReorderMode ? "opacity-50 cursor-not-allowed pointer-events-none " : ""
                                    } ${isScheduleView
                                        ? "bg-[#5B69FF]/20 text-[#5B69FF] border border-[#5B69FF]/50"
                                        : "bg-white/[.04] border border-white/10 hover:bg-white/5 hover:text-white"
                                    }`}
                            >
                                <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5" />
                                일정 보기
                            </button>

                            <div className="raid-filter-dropdown relative">
                                <button
                                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                                    disabled={isReorderMode}
                                    className={`flex items-center justify-between gap-2 px-3 sm:px-4 py-2 bg-white/[.04] border border-white/10 rounded-md transition-all min-w-[140px] sm:min-w-[160px] ${isReorderMode ? "opacity-50 cursor-not-allowed pointer-events-none " : "hover:bg-white/5"
                                        } ${isFilterOpen ? 'border-[#5B69FF]/50 ring-1 ring-[#5B69FF]/50' : ''}`}
                                >
                                    <span className="text-xs sm:text-sm text-gray-200 truncate pr-1">
                                        {selectedRaids.length > 0 ? `${selectedRaids.length}개 레이드` : "모든 레이드"}
                                    </span>
                                    {isFilterOpen ? <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" /> : <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />}
                                </button>

                                {isFilterOpen && !isReorderMode && (
                                    <div className="absolute top-full left-0 mt-2 w-56 bg-[#1E2128] border border-white/10 rounded-lg overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200 z-[50] shadow-xl">
                                        <div className="flex flex-col gap-1 p-1.5 max-h-64 overflow-y-auto custom-scrollbar">
                                            {availableFilterRaids.map((raidName) => {
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
                                                        <span className="text-xs sm:text-sm font-medium">{raidName}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="user-filter-dropdown relative">
                                <button
                                    onClick={() => setIsUserFilterOpen(!isUserFilterOpen)}
                                    disabled={isReorderMode}
                                    className={`flex items-center justify-between gap-2 px-3 sm:px-4 py-2 bg-white/[.04] border border-white/10 rounded-md transition-all min-w-[140px] sm:min-w-[160px] ${isReorderMode ? "opacity-50 cursor-not-allowed pointer-events-none " : "hover:bg-white/5"
                                        } ${isUserFilterOpen ? 'border-[#5B69FF]/50 ring-1 ring-[#5B69FF]/50' : ''}`}
                                >
                                    <span className="text-xs sm:text-sm text-gray-200 truncate pr-1">
                                        {selectedUsers.length > 0 ? `${selectedUsers.length}명 참여` : "모든 파티원"}
                                    </span>
                                    {isUserFilterOpen ? <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" /> : <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />}
                                </button>

                                {isUserFilterOpen && !isReorderMode && (
                                    <div className="absolute top-full left-0 mt-2 w-56 bg-[#1E2128] border border-white/10 rounded-lg overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200 z-[50] shadow-xl">
                                        <div className="flex flex-col gap-1 p-1.5 max-h-64 overflow-y-auto custom-scrollbar">
                                            {availableFilterUsers.map((user) => {
                                                const isActive = selectedUsers.includes(user.id);
                                                return (
                                                    <button
                                                        key={user.id}
                                                        onClick={() => toggleUser(user.id)}
                                                        className={`relative flex w-full items-center gap-3 rounded-md px-3 py-2 transition-all ${isActive ? "bg-[#5B69FF]/10 text-white" : "text-gray-400 hover:bg-white/5"}`}
                                                    >
                                                        <div className={`w-4 h-4 flex items-center justify-center transition-colors ${isActive ? 'text-[#5B69FF]' : 'text-transparent'}`}>
                                                            <Check className="h-3.5 w-3.5" strokeWidth={3} />
                                                        </div>
                                                        <span className="text-xs sm:text-sm font-medium">{user.name}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {(selectedRaids.length > 0 || selectedUsers.length > 0) && !isReorderMode && (
                                <button
                                    onClick={() => { setSelectedRaids([]); setSelectedUsers([]); }}
                                    className="inline-flex items-center justify-center py-2 px-3 rounded-md bg-white/[.04] border border-white/10 text-xs sm:text-sm text-[#5B69FF] hover:bg-white/5 transition-colors shrink-0"
                                >
                                    초기화 ⟳
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-row flex-wrap gap-2 sm:gap-3 items-center w-full sm:w-auto mt-2 sm:mt-0 pt-3 border-t border-white/10 sm:pt-0 sm:border-none">
                        {isEditMode ? (
                            <>
                                <button
                                    onClick={openAddModal}
                                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 py-2 px-3 sm:px-4 rounded-md bg-white/[.04] border border-white/10 hover:bg-white/5 text-white text-xs sm:text-sm font-medium transition-colors"
                                >
                                    <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                    그룹 추가
                                </button>
                                <button
                                    onClick={handleCancelEdit}
                                    disabled={isSaving}
                                    className="flex-1 sm:flex-none inline-flex items-center justify-center py-2 px-3 sm:px-4 rounded-md bg-white/[.02] border border-white/5 text-gray-400 hover:text-white hover:bg-white/[.04] text-xs sm:text-sm font-medium transition-colors disabled:opacity-50"
                                >
                                    취소
                                </button>
                                <button
                                    onClick={handleSavePlanner}
                                    disabled={isSaving}
                                    className="flex-[1.5] sm:flex-none inline-flex items-center justify-center gap-1.5 py-2 px-4 sm:px-5 rounded-md bg-[#5B69FF] hover:bg-[#4A57E6] text-white text-xs sm:text-sm font-bold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSaving ? <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" /> : <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                                    저장 완료
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => {
                                    setIsReorderMode(false);
                                    setOnlyRemain(false); // 수정 모드 진입 시 남은 숙제만 보기 필터는 해제
                                    setIsEditMode(true);
                                }}
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 py-2 px-4 sm:px-5 rounded-md bg-white/[.04] border border-white/10 hover:bg-white/5 hover:text-white hover:bg-[#5B69FF]/20 text-xs sm:text-sm transition-colors"
                            >
                                <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                그룹 수정
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {!isEditMode ? (
                <div className="w-full">
                    {groups.length === 0 ? (
                        <div className="w-full text-center text-gray-500 py-32 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-xl px-4 bg-[#16181D]">
                            <Swords className="w-12 h-12 mb-4 text-gray-600 opacity-50" />
                            <h3 className="text-lg font-bold text-gray-300 mb-2">아직 생성된 레이드 그룹이 없습니다.</h3>
                            <p className="break-keep text-sm mb-6">상단의 [그룹 수정] 버튼을 눌러 새로운 그룹을 만들고 파티원을 배치해보세요.</p>
                            <button
                                onClick={() => setIsEditMode(true)}
                                className="px-6 py-2.5 bg-[#5B69FF] hover:bg-[#4A57E6] text-white text-sm font-bold rounded-lg transition-colors"
                            >
                                그룹생성 시작하기
                            </button>
                        </div>
                    ) : filteredGroups.length === 0 && !isReorderMode ? (
                        <div className="w-full text-center text-gray-500 py-32 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-xl px-4 bg-[#16181D]">
                            <Filter className="w-12 h-12 mb-4 text-gray-600 opacity-50" />
                            <h3 className="text-lg font-bold text-gray-300 mb-2">조건에 맞는 레이드 그룹이 없습니다.</h3>
                            <p className="break-keep text-sm">필터를 해제하거나 새로운 숙제가 있는 그룹을 추가해보세요.</p>
                        </div>
                    ) : isReorderMode ? (
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleGroupDragEnd}>
                            <SortableContext items={filteredGroups.map(g => g.id)} strategy={rectSortingStrategy}>
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {filteredGroups.map(group => (
                                        <SortableGroupWrapper key={group.id} id={group.id}>
                                            <ReadOnlyGroupCard
                                                group={group}
                                                partyTasks={partyTasks}
                                                onBulkToggleGate={onBulkToggleGate}
                                            />
                                        </SortableGroupWrapper>
                                    ))}
                                </div>
                            </SortableContext>
                        </DndContext>
                    ) : isScheduleView ? (
                        <div className="flex flex-col gap-8 w-full animate-in fade-in duration-200">
                            {dayOrderMap.map(day => {
                                const dayGroups = groupedBySchedule!.groupsByDay[day];
                                if (!dayGroups || dayGroups.length === 0) return null;
                                return (
                                    <div key={day} className="flex flex-col gap-3">
                                        <div className="flex items-center gap-2 border-b border-white/10 pb-2 px-1">
                                            <Calendar className="w-5 h-5 text-[#5B69FF]" />
                                            <h3 className="text-base sm:text-lg font-bold text-white">{day}요일</h3>
                                            <span className="text-xs sm:text-sm text-gray-500 font-medium bg-white/5 px-2 py-0.5 rounded-full">{dayGroups.length}개</span>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                            {dayGroups.map(group => (
                                                <ReadOnlyGroupCard key={group.id} group={group} partyTasks={partyTasks} onBulkToggleGate={onBulkToggleGate} />
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                            {groupedBySchedule!.unscheduled.length > 0 && (
                                <div className="flex flex-col gap-3 mt-2">
                                    <div className="flex items-center gap-2 border-b border-white/10 pb-2 px-1">
                                        <Calendar className="w-5 h-5 text-gray-500" />
                                        <h3 className="text-base sm:text-lg font-bold text-gray-400">일정 미정</h3>
                                        <span className="text-xs sm:text-sm text-gray-500 font-medium bg-white/5 px-2 py-0.5 rounded-full">{groupedBySchedule!.unscheduled.length}개</span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                        {groupedBySchedule!.unscheduled.map(group => (
                                            <ReadOnlyGroupCard key={group.id} group={group} partyTasks={partyTasks} onBulkToggleGate={onBulkToggleGate} />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {filteredGroups.map(group => (
                                <ReadOnlyGroupCard
                                    key={group.id}
                                    group={group}
                                    partyTasks={partyTasks}
                                    onBulkToggleGate={onBulkToggleGate}
                                />
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                    {/* 🔥 화면이 넓어질 때 튀어나가는 부분 삭제 (기본 구조 유지) */}
                    <div className="flex flex-col xl:flex-row gap-6 items-start relative">
                        <div className="flex flex-col gap-3 w-full xl:w-80 shrink-0 xl:sticky xl:top-26 xl:z-20">
                            <WaitlistDroppable characters={waitlistCharacters} activeGroup={activeGroup} />
                        </div>

                        <div className="flex-1 w-full min-h-[600px]">
                            {/* 🔥 수정 모드에서도 일정 보기 및 필터가 적용된 배열을 사용, 기존 디자인대로 2열(lg:grid-cols-2)로 롤백 */}
                            {isScheduleView ? (
                                <div className="flex flex-col gap-8 w-full animate-in fade-in duration-200">
                                    {dayOrderMap.map(day => {
                                        const dayGroups = groupedBySchedule!.groupsByDay[day];
                                        if (!dayGroups || dayGroups.length === 0) return null;
                                        return (
                                            <div key={day} className="flex flex-col gap-3">
                                                <div className="flex items-center gap-2 border-b border-white/10 pb-2 px-1">
                                                    <Calendar className="w-5 h-5 text-[#5B69FF]" />
                                                    <h3 className="text-base sm:text-lg font-bold text-white">{day}요일</h3>
                                                    <span className="text-xs sm:text-sm text-gray-500 font-medium bg-white/5 px-2 py-0.5 rounded-full">{dayGroups.length}개</span>
                                                </div>
                                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                                    {dayGroups.map(group => (
                                                        <GroupCard
                                                            key={group.id}
                                                            group={group}
                                                            isActive={group.id === activeGroupId}
                                                            onClick={() => setActiveGroupId(group.id)}
                                                            onRemove={() => removeGroup(group.id)}
                                                            onRemoveChar={(idx) => removeCharFromSlot(group.id, idx)}
                                                            onNameChange={(newName) => updateGroupName(group.id, newName)}
                                                            onScheduleChange={(day, time) => updateGroupSchedule(group.id, day, time)}
                                                            onAddGuest={(slotIndex) => handleOpenGuestModal(group.id, slotIndex)}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {groupedBySchedule!.unscheduled.length > 0 && (
                                        <div className="flex flex-col gap-3 mt-2">
                                            <div className="flex items-center gap-2 border-b border-white/10 pb-2 px-1">
                                                <Calendar className="w-5 h-5 text-gray-500" />
                                                <h3 className="text-base sm:text-lg font-bold text-gray-400">일정 미정</h3>
                                                <span className="text-xs sm:text-sm text-gray-500 font-medium bg-white/5 px-2 py-0.5 rounded-full">{groupedBySchedule!.unscheduled.length}개</span>
                                            </div>
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                                {groupedBySchedule!.unscheduled.map(group => (
                                                    <GroupCard
                                                        key={group.id}
                                                        group={group}
                                                        isActive={group.id === activeGroupId}
                                                        onClick={() => setActiveGroupId(group.id)}
                                                        onRemove={() => removeGroup(group.id)}
                                                        onRemoveChar={(idx) => removeCharFromSlot(group.id, idx)}
                                                        onNameChange={(newName) => updateGroupName(group.id, newName)}
                                                        onScheduleChange={(day, time) => updateGroupSchedule(group.id, day, time)}
                                                        onAddGuest={(slotIndex) => handleOpenGuestModal(group.id, slotIndex)}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {filteredGroups.length === 0 && groups.length > 0 && (
                                        <div className="col-span-full text-center text-gray-500 py-32 flex flex-col items-center justify-center bg-[#16181D] rounded-xl px-4">
                                            <Filter className="w-12 h-12 mb-3 text-gray-600 opacity-50" />
                                            <p className="break-keep text-sm">조건에 맞는 레이드 그룹이 없습니다.</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    {filteredGroups.map(group => (
                                        <GroupCard
                                            key={group.id}
                                            group={group}
                                            isActive={group.id === activeGroupId}
                                            onClick={() => setActiveGroupId(group.id)}
                                            onRemove={() => removeGroup(group.id)}
                                            onRemoveChar={(idx) => removeCharFromSlot(group.id, idx)}
                                            onNameChange={(newName) => updateGroupName(group.id, newName)}
                                            onScheduleChange={(day, time) => updateGroupSchedule(group.id, day, time)}
                                            onAddGuest={(slotIndex) => handleOpenGuestModal(group.id, slotIndex)}
                                        />
                                    ))}

                                    {filteredGroups.length === 0 && groups.length > 0 && (
                                        <div className="col-span-full text-center text-gray-500 py-32 flex flex-col items-center justify-center bg-[#16181D] rounded-xl px-4">
                                            <Filter className="w-12 h-12 mb-3 text-gray-600 opacity-50" />
                                            <p className="break-keep text-sm">조건에 맞는 레이드 그룹이 없습니다.</p>
                                        </div>
                                    )}
                                    {groups.length === 0 && (
                                        <div className="col-span-full text-center text-gray-500 py-32 flex flex-col items-center justify-center bg-[#16181D] rounded-xl px-4">
                                            <Swords className="w-12 h-12 mb-3 text-gray-600 opacity-50" />
                                            <p className="break-keep text-sm">생성된 레이드 그룹이 없습니다.<br />상단의 그룹 추가 버튼을 눌러 레이드를 만들어주세요.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <DragOverlay dropAnimation={null}>
                        {activeDragChar ? (
                            <div className="p-2 sm:p-2.5 h-14 sm:h-16 bg-[#2A2D36] border-2 border-[#5B69FF] rounded-lg opacity-90 scale-105 flex items-center gap-2 pr-1 min-w-[150px] sm:min-w-[180px]">
                                <div className="w-7 h-7 sm:w-8 sm:h-8 shrink-0 bg-black/20 rounded border border-white/5 flex items-center justify-center overflow-hidden">
                                    <img
                                        src={`/icons/classes/${classIconMap[activeDragChar.className] || 'default.svg'}`}
                                        alt=""
                                        className="w-4 h-4 sm:w-6 sm:h-6 object-contain filter brightness-0 invert"
                                    />
                                </div>
                                <div className="flex flex-col justify-center min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                        <div className="text-[11px] sm:text-[13px] font-bold text-white truncate">
                                            {activeDragChar.name}
                                        </div>
                                        {activeDragChar.isGuest && (
                                            <span className="shrink-0 px-1 py-0.5 rounded bg-[#FF5252]/15 text-[#FF5252] text-[9px] font-bold">
                                                용병
                                            </span>
                                        )}
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

            {/* 🔥 용병 검색 모달 */}
            {guestModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center px-4">
                    <div
                        className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
                        onClick={() => setGuestModalOpen(false)}
                    />

                    <div
                        className="relative w-full max-w-md p-6 sm:p-8 rounded-2xl bg-[#16181D] border border-white/5 text-center shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
                    >
                        <button
                            type="button"
                            onClick={() => setGuestModalOpen(false)}
                            className="absolute right-3 top-3 p-1.5 rounded-full bg-black/40 border border-white/10 text-gray-400 hover:text-white hover:bg-black/60 text-xs z-50 transition-colors"
                        >
                            <X size={16} />
                        </button>

                        <div className="absolute -top-10 -left-10 w-32 h-32 bg-[#5B69FF]/20 rounded-full blur-[50px] pointer-events-none" />
                        <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-purple-500/10 rounded-full blur-[50px] pointer-events-none" />

                        <div className="relative mx-auto mb-6 w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center rounded-full bg-[#5B69FF]/10 text-[#5B69FF] ring-1 ring-[#5B69FF]/30">
                            <div className="relative z-10">
                                <Users size={32} strokeWidth={1.5} className="sm:w-9 sm:h-9" />
                            </div>
                            <div className="absolute -right-1 -bottom-1 bg-[#16181D] rounded-full p-1.5 border border-white/10 z-20">
                                <Search size={14} className="text-gray-400" />
                            </div>
                        </div>

                        <h3 className="text-lg sm:text-xl font-bold text-white mb-2 relative z-10">
                            용병 캐릭터를 추가하세요
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-400 mb-6 leading-relaxed relative z-10 break-keep">
                            {guestTargetGroup?.raidName} {getDisplayDifficulty(guestTargetGroup?.raidName || "", guestTargetGroup?.difficulty || "")} (입장 레벨: {guestReqLevel})<br />
                            레이드 그룹에 합류할 용병의 닉네임을 검색하세요.
                        </p>

                        <form onSubmit={handleSearchGuestApi} className="relative flex items-center z-10">
                            <input
                                type="text"
                                placeholder="캐릭터 닉네임 입력"
                                value={guestSearchInput}
                                onChange={(e) => setGuestSearchInput(e.target.value)}
                                disabled={isSearchingGuest}
                                className={`
                                    w-full h-11 sm:h-12 pl-4 pr-12 rounded-lg bg-[#0F1115] border 
                                    text-white placeholder-gray-500 text-sm transition-all disabled:opacity-50
                                    focus:outline-none focus:ring-1
                                    ${guestSearchError
                                        ? "border-red-500/50 focus:border-red-500 focus:ring-red-500"
                                        : "border-white/10 focus:border-[#5B69FF] focus:ring-[#5B69FF]"
                                    }
                                `}
                                autoFocus
                            />
                            <button
                                type="submit"
                                disabled={isSearchingGuest || !guestSearchInput.trim()}
                                className="absolute right-1.5 p-2 rounded-md bg-[#5B69FF] text-white hover:bg-[#4A57E6] disabled:bg-gray-700 disabled:text-gray-500 transition-colors"
                            >
                                {isSearchingGuest ? (
                                    <div className="w-4 h-4 sm:w-[18px] sm:h-[18px] border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <Search size={16} className="sm:w-[18px] sm:h-[18px]" />
                                )}
                            </button>
                        </form>

                        {guestSearchError && (
                            <div className="mt-3 flex items-center justify-center gap-2 text-red-400 text-xs font-medium animate-in slide-in-from-top-1 fade-in relative z-10">
                                <AlertTriangle size={14} />
                                <span>{guestSearchError}</span>
                            </div>
                        )}

                        {guestSearchResult && (
                            <div className="mt-5 flex flex-col gap-2 max-h-[220px] overflow-y-auto custom-scrollbar pr-1 relative z-10 text-left animate-in slide-in-from-bottom-2 fade-in">
                                <div className="text-xs font-bold text-gray-500 mb-1 px-1">추가할 캐릭터를 선택하세요</div>
                                {(() => {
                                    const filteredChars = guestSearchResult.roster.filter(char => char.itemLevelNum >= guestReqLevel);

                                    if (filteredChars.length === 0) {
                                        return (
                                            <div className="text-center text-xs text-gray-400 py-6 bg-black/20 rounded-xl border border-white/5">
                                                입장 레벨(Lv.{guestReqLevel})을 만족하는 캐릭터가 없습니다.
                                            </div>
                                        );
                                    }

                                    return filteredChars.map(char => (
                                        <button
                                            key={char.name}
                                            type="button"
                                            onClick={() => handleSelectGuestChar(char)}
                                            className="flex items-center justify-between p-3 rounded-xl bg-[#0F1115] border border-white/5 hover:border-[#5B69FF]/50 hover:bg-[#5B69FF]/10 transition-all text-left group"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-8 h-8 rounded-md bg-black/40 border border-white/5 flex items-center justify-center shrink-0 group-hover:border-[#5B69FF]/30 transition-colors">
                                                    <img src={`/icons/classes/${classIconMap[char.className] || 'default.svg'}`} alt="" className="w-5 h-5 filter brightness-0 invert opacity-80 group-hover:opacity-100" onError={(e) => (e.currentTarget.style.display = 'none')} />
                                                </div>
                                                <div className="min-w-0 pr-2">
                                                    <div className="text-sm font-bold text-gray-200 truncate group-hover:text-white transition-colors">{char.name}</div>
                                                    <div className="text-[11px] text-gray-500 truncate">{char.className}</div>
                                                </div>
                                            </div>
                                            <div className="text-sm font-bold text-yellow-500/90 shrink-0">
                                                Lv.{char.itemLevelNum.toFixed(2)}
                                            </div>
                                        </button>
                                    ));
                                })()}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* 🔥 그룹 추가 모달 */}
            {isAddModalOpen && isEditMode && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-0 animate-in fade-in duration-200">
                    <div className="absolute inset-0 transition-opacity" onClick={closeAddModal} />
                    <div className="relative w-full max-w-[min(800px,92vw)] flex flex-col rounded-2xl bg-[#16181D] border border-white/10 overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh]">
                        <header className="px-5 py-5 sm:px-8 border-b border-white/10 flex items-center justify-between gap-4 bg-[#16181D] shrink-0">
                            <div>
                                <div className="flex items-center gap-3 mb-1">
                                    <h2 className="text-xl font-bold text-white tracking-tight">새 레이드 그룹 생성</h2>
                                </div>
                                <p className="text-xs sm:text-sm text-gray-400 leading-snug">추가할 레이드를 선택해주세요. (이름은 생성 후 바로 수정 가능합니다)</p>
                            </div>
                            <button onClick={closeAddModal} className="text-gray-400 hover:text-white transition-colors shrink-0">
                                <X className="w-6 h-6" />
                            </button>
                        </header>

                        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#121418] custom-scrollbar space-y-8">
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
                                                            ? "bg-[#1E222B] border-[#5B69FF]"
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
                                                                            <span>{getDisplayDifficulty(raidName, diff)}</span>
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
                                disabled={!selectedRaidName || !selectedDifficulty}
                                onClick={confirmAddGroup}
                                className="flex-[2] sm:flex-none sm:px-10 py-3 bg-[#5B69FF] hover:bg-[#4A57E6] disabled:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-all ml-auto"
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

    const charStates = useMemo(() => {
        return group.slots.map((slotChar) => {
            if (!slotChar) return null;

            if (slotChar.isGuest) {
                return {
                    ...slotChar,
                    currentGates: [],
                    isFullyCompleted: false
                };
            }

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
        <div className="bg-[#16181D] rounded-lg p-5 flex flex-col h-fit">
            <div className="flex justify-between items-center w-full mb-1.5 gap-2">
                <span className="text-[16px] font-bold text-[#5B69FF] rounded-md truncate">
                    {group.groupName}
                </span>
                {(group.scheduleDay || group.scheduleTime) && (
                    <div className="flex items-center gap-1.5 px-1.5 py-0.5 shrink-0 rounded bg-[#5B69FF]/10 text-[#5B69FF] text-[11px] font-bold">
                        <Calendar className="w-3 h-3" />
                        {group.scheduleDay ? `${group.scheduleDay}요일` : ""} {group.scheduleTime || ""}
                    </div>
                )}
            </div>

            <div className="flex justify-between items-start mb-4 border-b border-white/5 pb-3">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 flex-wrap mt-1">
                        <h4 className="font-bold text-lg text-white">
                            {group.raidName}
                        </h4>
                        <span className={`text-xs px-2 py-0.5 rounded font-bold ${colors.badge}`}>
                            {getDisplayDifficulty(group.raidName, group.difficulty)}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                    {allGates.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-1">
                            {allGates.map(g => {
                                const partyGroupChars = charStates.filter((c): c is NonNullable<typeof c> => c !== null && !c.isGuest);
                                const isAllChecked = partyGroupChars.length > 0 && partyGroupChars.every(c => c.currentGates.includes(g));
                                const diffStyle = DIFF_STYLES[group.difficulty as keyof typeof DIFF_STYLES] || DIFF_STYLES["노말"];

                                return (
                                    <button
                                        key={g}
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (!onBulkToggleGate || partyGroupChars.length === 0) return;

                                            const targets = partyGroupChars.map(c => ({
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
            </div>

            <div className="grid gap-2 sm:gap-3 grid-cols-2">
                {[0, 1].map((partyOffset) => {
                    const startIndex = absoluteStartIndex + (partyOffset * 4);
                    const actualPartyNumber = (page * 2) + partyOffset + 1;
                    const partySlots = group.slots.slice(startIndex, startIndex + 4);
                    const currentCount = partySlots.filter(Boolean).length;
                    const maxInParty = Math.min(4, Math.max(0, group.maxMembers - startIndex));
                    const isPartyActive = startIndex < group.maxMembers;
                    return (
                        <div key={partyOffset} className="flex flex-col gap-1.5 sm:gap-2">
                            <div className="flex items-center justify-between px-1 pb-0.5 mb-[-2px] h-[18px]">
                                {isPartyActive ? (
                                    <>
                                        <span className="text-[11px] font-bold text-gray-500">
                                            {actualPartyNumber}파티
                                        </span>
                                        <div className="text-[12px] font-mono font-bold tracking-wider">
                                            <span className={currentCount === maxInParty ? "text-[#5B69FF]" : "text-gray-300"}>
                                                {currentCount}
                                            </span>
                                            <span className="text-gray-600 mx-0.5">/</span>
                                            <span className="text-gray-500">{maxInParty}</span>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex-1" />
                                )}
                            </div>

                            {Array.from({ length: 4 }).map((_, slotOffset) => {
                                const absoluteIndex = startIndex + slotOffset;
                                const isBlocked = absoluteIndex >= group.maxMembers;

                                if (isBlocked) {
                                    return (
                                        <div key={`blocked-${absoluteIndex}`} className="h-14 sm:h-16 border border-transparent bg-white/[0.02] rounded-lg flex items-center justify-center pointer-events-none">
                                            <X className="w-5 h-5 text-gray-600/30" />
                                        </div>
                                    );
                                }

                                const char = charStates[absoluteIndex];
                                return (
                                    <div key={absoluteIndex} className={`h-14 sm:h-16 border rounded-lg flex items-center overflow-hidden transition-all ${char ? "border-white/5 bg-[#1E2028]" : "border-dashed border-white/10 bg-white/[0.02]"}`}>
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
    const isSupporter = SUPPORTER_ENGRAVINGS.includes(char.jobEngraving ?? "");

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
                <div className="flex items-center gap-1.5 min-w-0">
                    <div className={`text-[11px] sm:text-[13px] font-bold truncate ${isCompleted ? "text-gray-400" : "text-white"}`}>
                        {char.name}
                    </div>
                    {char.isGuest && (
                        <span className="shrink-0 px-1 py-0.5 rounded bg-[#FF5252]/15 text-[#FF5252] text-[9px] font-bold">
                            용병
                        </span>
                    )}
                    {isCompleted && <span className="shrink-0 text-[9px] text-gray-400 font-normal">(완료)</span>}
                </div>
                <div className="text-[9px] sm:text-[11px] text-gray-400 truncate flex gap-1 items-center">
                    <span className={`${isCompleted ? "text-gray-400" : "text-yellow-400/80"}`}>Lv.{char.itemLevelNum || 0}</span>
                    <span className="w-1 h-1 rounded-full bg-white/20 shrink-0" />
                    <span className="truncate text-gray-400">{char.ownerName}</span>
                </div>
                {char.combatPower && (
                    <div className={`flex items-center gap-0.5 text-[9px] sm:text-[10px] ${isSupporter ? "text-emerald-400" : "text-red-400"}`}>
                        <span className={!isSupporter ? "translate-y-[0.5px]" : ""}>
                            {isSupporter ? "✚" : "⚔️"}
                        </span>
                        <span>{char.combatPower}</span>
                    </div>
                )}
            </div>
        </div>
    );
}

function GroupCard({ group, isActive, onClick, onRemove, onRemoveChar, onNameChange, onScheduleChange, onAddGuest }: {
    group: RaidGroup;
    isActive: boolean;
    onClick: () => void;
    onRemove: () => void;
    onRemoveChar: (idx: number) => void;
    onNameChange: (newName: string) => void;
    onScheduleChange: (day: string, time: string) => void;
    onAddGuest: (idx: number) => void;
}) {
    const [page, setPage] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    const [isDayDropdownOpen, setIsDayDropdownOpen] = useState(false);
    const dayDropdownRef = useRef<HTMLDivElement>(null);
    const days = ["수", "목", "금", "토", "일", "월", "화"];

    const [isTimeDropdownOpen, setIsTimeDropdownOpen] = useState(false);
    const timeDropdownRef = useRef<HTMLDivElement>(null);
    const timeOptions = useMemo(() => {
        const times = [];
        for (let h = 0; h < 24; h++) {
            const hour = h.toString().padStart(2, '0');
            times.push(`${hour}:00`);
            times.push(`${hour}:30`);
        }
        return times;
    }, []);

    const colors = difficultyColors[group.difficulty] || difficultyColors["노말"];
    const isEpic = group.maxMembers > 8;
    const totalPages = Math.ceil(group.maxMembers / 8) || 1;
    const absoluteStartIndex = page * 8;

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dayDropdownRef.current && !dayDropdownRef.current.contains(e.target as Node)) {
                setIsDayDropdownOpen(false);
            }
            if (timeDropdownRef.current && !timeDropdownRef.current.contains(e.target as Node)) {
                setIsTimeDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleEditClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onClick();
        inputRef.current?.focus();
    };

    return (
        <div
            onClick={onClick}
            className={`bg-[#16181D] rounded-lg p-5 flex flex-col border-[1.5px] cursor-pointer transition-all ${isActive ? "border-[#5B69FF] bg-[#5B69FF]/5" : "border-transparent"}`}
        >
            <div className="flex justify-between items-center w-full mb-1.5 gap-2">
                <div className="flex items-center gap-1 -ml-1 min-w-0 flex-1">
                    <div className="relative inline-grid items-center h-7 max-w-full">
                        {/* 🔥 span에 overflow-hidden truncate 추가 */}
                        <span className="invisible whitespace-pre text-[16px] font-bold px-1 pointer-events-none overflow-hidden truncate">
                            {group.groupName || "그룹 이름 입력"}
                        </span>
                        {/* 🔥 input 태그 끝부분에 text-ellipsis 추가 */}
                        <input
                            ref={inputRef}
                            type="text"
                            value={group.groupName}
                            maxLength={25}
                            onChange={(e) => onNameChange(e.target.value)}
                            onClick={(e) => { e.stopPropagation(); onClick(); }}
                            placeholder="그룹 이름 입력"
                            className="absolute inset-0 w-full h-full text-[16px] font-bold text-[#5B69FF] bg-transparent border-b border-transparent hover:border-[#5B69FF]/30 focus:border-[#5B69FF] focus:outline-none transition-colors px-1 leading-none text-ellipsis"
                        />
                    </div>

                    <button
                        onClick={handleEditClick}
                        className="p-1 text-[#5B69FF] opacity-60 hover:opacity-100 transition-opacity shrink-0"
                        title="그룹 이름 수정"
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <Calendar className="w-4 h-4 text-gray-500 hidden sm:block mr-0.5" />

                    <div className="relative" ref={dayDropdownRef}>
                        <button
                            type="button"
                            onClick={() => { setIsDayDropdownOpen(!isDayDropdownOpen); setIsTimeDropdownOpen(false); }}
                            className={`flex items-center justify-between gap-1.5 min-w-[72px] bg-[#0F1115] border text-xs font-medium rounded-md px-2.5 py-1.5 transition-all ${isDayDropdownOpen
                                ? "border-[#5B69FF] text-[#5B69FF] ring-1 ring-[#5B69FF]/50"
                                : "border-white/10 text-gray-300 hover:border-white/20 hover:bg-white/5"
                                }`}
                        >
                            <span>{group.scheduleDay ? `${group.scheduleDay}요일` : "요일"}</span>
                            {isDayDropdownOpen ? <ChevronUp className="w-3 h-3 opacity-60 shrink-0" /> : <ChevronDown className="w-3 h-3 opacity-60 shrink-0" />}
                        </button>

                        {isDayDropdownOpen && (
                            <div className="absolute top-full right-0 mt-1.5 w-[100px] bg-[#1E2128] border border-white/10 rounded-lg overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200 z-[60] shadow-xl">
                                <div className="flex flex-col p-1.5 max-h-48 overflow-y-auto custom-scrollbar gap-0.5">
                                    <button
                                        onClick={() => { onScheduleChange("", group.scheduleTime || ""); setIsDayDropdownOpen(false); }}
                                        className={`text-left px-2 py-1.5 text-xs rounded-md transition-colors ${!group.scheduleDay ? "bg-[#5B69FF]/10 text-[#5B69FF] font-bold" : "text-gray-400 hover:bg-white/5 hover:text-gray-200"}`}
                                    >
                                        선택 안함
                                    </button>
                                    {days.map(day => (
                                        <button
                                            key={day}
                                            onClick={() => { onScheduleChange(day, group.scheduleTime || ""); setIsDayDropdownOpen(false); }}
                                            className={`text-left px-2 py-1.5 text-xs rounded-md transition-colors ${group.scheduleDay === day ? "bg-[#5B69FF]/10 text-[#5B69FF] font-bold" : "text-gray-400 hover:bg-white/5 hover:text-gray-200"}`}
                                        >
                                            {day}요일
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="relative" ref={timeDropdownRef}>
                        <button
                            type="button"
                            onClick={() => { setIsTimeDropdownOpen(!isTimeDropdownOpen); setIsDayDropdownOpen(false); }}
                            className={`flex items-center justify-between gap-1.5 min-w-[72px] bg-[#0F1115] border text-xs font-medium rounded-md px-2.5 py-1.5 transition-all ${isTimeDropdownOpen
                                ? "border-[#5B69FF] text-[#5B69FF] ring-1 ring-[#5B69FF]/50"
                                : "border-white/10 text-gray-300 hover:border-white/20 hover:bg-white/5"
                                }`}
                        >
                            <span>{group.scheduleTime || "시간"}</span>
                            {isTimeDropdownOpen ? <ChevronUp className="w-3 h-3 opacity-60 shrink-0" /> : <ChevronDown className="w-3 h-3 opacity-60 shrink-0" />}
                        </button>

                        {isTimeDropdownOpen && (
                            <div className="absolute top-full right-0 mt-1.5 w-[90px] bg-[#1E2128] border border-white/10 rounded-lg overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200 z-[60] shadow-xl">
                                <div className="flex flex-col p-1.5 max-h-48 overflow-y-auto custom-scrollbar gap-0.5">
                                    <button
                                        onClick={() => { onScheduleChange(group.scheduleDay || "", ""); setIsTimeDropdownOpen(false); }}
                                        className={`text-left px-2 py-1.5 text-xs rounded-md transition-colors ${!group.scheduleTime ? "bg-[#5B69FF]/10 text-[#5B69FF] font-bold" : "text-gray-400 hover:bg-white/5 hover:text-gray-200"}`}
                                    >
                                        선택 안함
                                    </button>
                                    {timeOptions.map(time => (
                                        <button
                                            key={time}
                                            onClick={() => { onScheduleChange(group.scheduleDay || "", time); setIsTimeDropdownOpen(false); }}
                                            className={`text-left px-2 py-1.5 text-xs rounded-md transition-colors ${group.scheduleTime === time ? "bg-[#5B69FF]/10 text-[#5B69FF] font-bold" : "text-gray-400 hover:bg-white/5 hover:text-gray-200"}`}
                                        >
                                            {time}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex justify-between items-start mb-4 border-b border-white/5 pb-3">
                <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2 mt-1">
                        <h4 className={`font-bold text-lg ${isActive ? "text-white" : "text-gray-300"}`}>
                            {group.raidName}
                        </h4>
                        <span className={`text-xs px-2 py-0.5 rounded font-bold ${isActive ? colors.badge : "bg-gray-700/50 text-gray-500"}`}>
                            {getDisplayDifficulty(group.raidName, group.difficulty)}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-3 mt-1">
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

                    const partySlots = group.slots.slice(startIndex, startIndex + 4);
                    const currentCount = partySlots.filter(Boolean).length;
                    const maxInParty = Math.min(4, Math.max(0, group.maxMembers - startIndex));

                    return (
                        <div key={partyOffset} className="flex flex-col gap-1.5 sm:gap-2">
                            <div className="flex items-center justify-between px-1 pb-0.5 mb-[-2px]">
                                <span className="text-[11px] font-bold text-gray-500">
                                    {actualPartyNumber}파티
                                </span>
                                {maxInParty > 0 && (
                                    <div className="text-[12px] font-mono font-bold tracking-wider">
                                        <span className={currentCount === maxInParty ? "text-[#5B69FF]" : "text-gray-300"}>
                                            {currentCount}
                                        </span>
                                        <span className="text-gray-600 mx-0.5">/</span>
                                        <span className="text-gray-500">{maxInParty}</span>
                                    </div>
                                )}
                            </div>

                            {Array.from({ length: 4 }).map((_, slotOffset) => {
                                const absoluteIndex = startIndex + slotOffset;
                                const isBlocked = absoluteIndex >= group.maxMembers;
                                if (isBlocked) {
                                    return (
                                        <div key={`blocked-${absoluteIndex}`} className="h-14 sm:h-16 border border-transparent bg-white/[0.02] rounded-lg flex items-center justify-center pointer-events-none">
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
                                        onAddGuest={() => onAddGuest(absoluteIndex)}
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
            className={`w-full shrink-0 rounded-lg p-4 h-[400px] xl:h-[600px] overflow-y-auto transition-colors flex flex-col custom-scrollbar ${isOver ? "bg-[#1E2028] border-[#5B69FF]/50" : "bg-[#16181D] border-white/10"
                }`}
        >
            {activeGroup ? (
                <>
                    <h3 className="font-bold text-white mb-4 flex items-center gap-2 border-b border-white/5 pb-3 shrink-0">

                        <Users className="w-4 h-4 text-[#5B69FF]" />
                        <div className="flex-1 truncate flex items-center gap-1.5">
                            {activeGroup.raidName}
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${diffColors?.badge}`}>
                                {getDisplayDifficulty(activeGroup.raidName, activeGroup.difficulty)}
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
                    <p className="text-sm break-keep">우측에서 생성한 레이드 그룹을<br />클릭하여 선택해주세요.</p>
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
            className="p-2 sm:p-2.5 h-14 sm:h-16 bg-[#1E2028] border border-white/5 rounded-lg flex items-center justify-between hover:border-[#5B69FF] hover:bg-[#5B69FF]/5 cursor-grab active:cursor-grabbing transition-colors group touch-none"
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
                    <div className="flex items-center gap-1.5 min-w-0">
                        <div className="text-[11px] sm:text-[13px] font-bold text-white truncate group-hover:text-[#5B69FF] transition-colors">
                            {char.name}
                        </div>
                        {char.isGuest && (
                            <span className="shrink-0 px-1 py-0.5 rounded bg-[#FF5252]/15 text-[#FF5252] text-[9px] font-bold">
                                용병
                            </span>
                        )}
                    </div>
                    <div className="text-[9px] sm:text-[11px] text-gray-400 truncate flex gap-1 items-center">
                        <span className="text-yellow-400 ">Lv.{(char.itemLevelNum || 0).toFixed(2)}</span>
                    </div>
                    {char.combatPower && (
                        <div className={`flex items-center gap-0.5  text-[9px] sm:text-[10px] ${isSupporter ? "text-emerald-400" : "text-red-400"}`}>
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

function DroppableSlot({ groupId, slotIndex, char, onRemove, onAddGuest }: {
    groupId: string, slotIndex: number, char: any | null, onRemove: () => void, onAddGuest: () => void
}) {
    const { setNodeRef, isOver } = useDroppable({
        id: `slot::${groupId}::${slotIndex}`,
    });

    return (
        <div
            ref={setNodeRef}
            className={`h-14 sm:h-16 border rounded-lg flex items-center transition-colors relative overflow-hidden ${isOver ? "border-[#5B69FF] bg-[#5B69FF]/10" :
                char ? "border-white/5 bg-[#1E2028]" : "border-dashed border-white/10 bg-white/[0.02]"
                }`}
        >
            {char ? (
                <div className="flex-1 w-full h-full flex items-center justify-between min-w-0">
                    <DraggableCharacterInSlot char={char} groupId={groupId} slotIndex={slotIndex} />
                    <button
                        onClick={(e) => { e.stopPropagation(); onRemove(); }}
                        onPointerDown={(e) => e.stopPropagation()}
                        className="absolute top-1 right-1 sm:top-1.5 sm:right-1.5 p-1 text-gray-500 hover:bg-red-500/20 hover:text-red-400 rounded-md transition-colors z-10"
                    >
                        <X className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    </button>
                </div>
            ) : (
                <button
                    onClick={(e) => { e.stopPropagation(); onAddGuest(); }}
                    className="w-full h-full flex items-center justify-center gap-1.5 text-[11px] sm:text-xs text-gray-500 hover:text-[#5B69FF] hover:bg-[#5B69FF]/5 transition-colors"
                >
                    <Plus className="w-3.5 h-3.5" /> 용병 추가
                </button>
            )}
        </div>
    );
}

function DraggableCharacterInSlot({ char, groupId, slotIndex }: { char: any, groupId: string, slotIndex: number }) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `char-slot-${groupId}-${slotIndex}-${char.uniqueId}`,
        data: { char, sourceGroupId: groupId, sourceSlotIndex: slotIndex },
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
                <div className="flex items-center gap-1.5 min-w-0">
                    <div className="text-[11px] sm:text-[13px] font-bold text-white truncate group-hover:text-[#5B69FF] transition-colors">
                        {char.name}
                    </div>
                    {char.isGuest && (
                        <span className="shrink-0 px-1 py-0.5 rounded bg-[#FF5252]/15 text-[#FF5252] text-[9px] font-bold">
                            용병
                        </span>
                    )}
                </div>
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

function SortableGroupWrapper({ id, children }: { id: string, children: React.ReactNode }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 10 : 1,
    };
    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing touch-none"
        >
            <div className="pointer-events-none">
                {/* 드래그 중 내부 체크박스나 버튼 클릭을 방지하기 위해 pointer-events-none 처리 */}
                {children}
            </div>
        </div>
    );
}