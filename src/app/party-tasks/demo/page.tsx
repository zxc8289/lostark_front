// src/app/party-tasks/demo/page.tsx
"use client";

import {
    useEffect,
    useState,
    useRef,
    useCallback,
    type ReactNode,
    useMemo,
} from "react";
import { useRouter } from "next/navigation";
import {
    UsersRound,
    Loader2,
    ArrowLeft,
    AlertTriangle,
    Clock,
    LogIn,
    Link2,
    Copy,
    Check,
    Sparkles,
    X,
    ChevronDown,
    ChevronUp,
    Plus,
    Settings,
    ChevronLeft,
    MoreVertical,
    Wand2,
    RefreshCcw,
} from "lucide-react";
import { CSS } from "@dnd-kit/utilities";
import CharacterTaskStrip, {
    TaskItem,
} from "@/app/components/tasks/CharacterTaskStrip";
import TaskCard from "@/app/components/tasks/TaskCard";
import TaskTable from "@/app/components/tasks/TaskTable";
import type {
    CharacterSummary,
    RosterCharacter,
} from "@/app/components/AddAccount";
import { raidInformation } from "@/server/data/raids";
import type { CharacterTaskPrefs } from "@/app/lib/tasks/raid-prefs";
import EditTasksModal from "@/app/components/tasks/EditTasksModal";
import CharacterSettingModal from "@/app/components/tasks/CharacterSettingModal";
import {
    getRaidBaseLevel,
    calcNextGates,
    computeRaidSummaryForRoster,
    buildAutoSetupForRoster,
    type RaidSummary,
} from "@/app/lib/tasks/raid-utils";
import AnimatedNumber from "@/app/components/tasks/AnimatedNumber";
import EmptyCharacterState from "@/app/components/tasks/EmptyCharacterState";
import PartySettingsModal from "@/app/components/tasks/PartySettingsModal";
import TaskSidebar from "@/app/components/tasks/TaskSidebar";
import { useSession } from "next-auth/react";

import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { closestCenter, DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";

/* ─────────────────────────────
 * 데모용 Mock Data (가짜 데이터)
 * ───────────────────────────── */
const MOCK_MY_USER_ID = "demo-user-me";
const MOCK_OTHER_USER_ID_A = "demo-user-other-a";
const MOCK_OTHER_USER_ID_B = "demo-user-other-b";
const MOCK_PARTY_ID = 9999;

const MOCK_ROSTER_ME = [
    { name: "데모캐릭_본캐", itemLevel: "1630.00", itemLevelNum: 1630, serverName: "루페온", className: "워로드" },
    { name: "데모캐릭_부캐1", itemLevel: "1610.00", itemLevelNum: 1610, serverName: "루페온", className: "소서리스" },
    { name: "데모캐릭_부캐2", itemLevel: "1600.00", itemLevelNum: 1600, serverName: "루페온", className: "바드" },
] as unknown as RosterCharacter[];

const MOCK_ROSTER_OTHER_A = [
    { name: "파티원A_본캐", itemLevel: "1620.00", itemLevelNum: 1620, serverName: "실리안", className: "건슬링어" },
    { name: "파티원A_부캐", itemLevel: "1580.00", itemLevelNum: 1580, serverName: "실리안", className: "기상술사" },
] as unknown as RosterCharacter[];

const MOCK_ROSTER_OTHER_B = [
    { name: "파티원B_본캐", itemLevel: "1640.00", itemLevelNum: 1640, serverName: "카마인", className: "블레이드" },
    { name: "파티원B_부캐", itemLevel: "1600.00", itemLevelNum: 1600, serverName: "카마인", className: "버서커" },
] as unknown as RosterCharacter[];

const MOCK_PREFS_ME: Record<string, CharacterTaskPrefs> = {
    "데모캐릭_본캐": {
        raids: {
            "카멘": { enabled: true, difficulty: "하드" as any, gates: [1] },
            "에키드나": { enabled: true, difficulty: "노말" as any, gates: [] },
            "일리아칸": { enabled: true, difficulty: "하드" as any, gates: [] },
        },
        order: ["카멘", "에키드나", "일리아칸"],
    },
    "데모캐릭_부캐1": {
        raids: {
            "카멘": { enabled: true, difficulty: "하드" as any, gates: [1] },
            "상아탑": { enabled: true, difficulty: "노말" as any, gates: [] },
            "일리아칸": { enabled: true, difficulty: "하드" as any, gates: [] },
        },
        order: ["카멘", "상아탑", "일리아칸"],
    },
};

const MOCK_PARTY_DETAIL = {
    id: MOCK_PARTY_ID,
    name: "데모 체험용 파티",
    memo: "이곳은 기능을 체험해볼 수 있는 데모 페이지입니다.",
    ownerId: MOCK_MY_USER_ID,
    createdAt: new Date().toISOString(),
    myRole: "owner",
    members: [
        { id: MOCK_MY_USER_ID, name: "체험자 (나)", image: null, role: "owner" },
        { id: MOCK_OTHER_USER_ID_A, name: "파티원 A (수정 불가)", image: null, role: "member" },
        { id: MOCK_OTHER_USER_ID_B, name: "파티원 B (수정 가능)", image: null, role: "member" },
    ],
    raidCount: 3,
    nextResetAt: "수요일 오전 6:00",
    raidState: {},
};

const baseSummaryProps = {
    name: "", serverName: "", class: "", itemLevel: "", itemLevelNum: 0,
};

const MOCK_PARTY_TASKS: PartyMemberTasks[] = [
    {
        userId: MOCK_MY_USER_ID,
        name: "체험자 (나)",
        image: null,
        nickname: "데모캐릭_본캐",
        summary: { ...baseSummaryProps, roster: MOCK_ROSTER_ME } as unknown as CharacterSummary,
        prefsByChar: MOCK_PREFS_ME,
        visibleByChar: { "데모캐릭_본캐": true, "데모캐릭_부캐1": true, "데모캐릭_부캐2": true } as Record<string, boolean>,
        tableOrder: ["__empty_0"],
        rosterOrder: [],
        cardRosterOrder: [],
        canOthersEdit: true,
    },
    {
        userId: MOCK_OTHER_USER_ID_A,
        name: "파티원 A (수정 불가)",
        image: null,
        nickname: "파티원A_본캐",
        summary: { ...baseSummaryProps, roster: MOCK_ROSTER_OTHER_A } as unknown as CharacterSummary,
        prefsByChar: {
            "파티원A_본캐": {
                raids: {
                    "카멘": { enabled: true, difficulty: "노말" as any, gates: [] },
                    "에키드나": { enabled: true, difficulty: "노말" as any, gates: [] }
                },
                order: ["카멘", "에키드나"]
            },
            "파티원A_부캐": {
                raids: { "일리아칸": { enabled: true, difficulty: "노말" as any, gates: [] } },
                order: ["일리아칸"]
            }
        },
        visibleByChar: { "파티원A_본캐": true, "파티원A_부캐": true } as Record<string, boolean>,
        tableOrder: ["__empty_0"],
        rosterOrder: [],
        cardRosterOrder: [],
        canOthersEdit: false,
    },
    {
        userId: MOCK_OTHER_USER_ID_B,
        name: "파티원 B (수정 가능)",
        image: null,
        nickname: "파티원B_본캐",
        summary: { ...baseSummaryProps, roster: MOCK_ROSTER_OTHER_B } as unknown as CharacterSummary,
        prefsByChar: {
            "파티원B_본캐": {
                raids: {
                    "베히모스": { enabled: true, difficulty: "노말" as any, gates: [] },
                    "카멘": { enabled: true, difficulty: "하드" as any, gates: [] }
                },
                order: ["베히모스", "카멘"]
            },
        },
        visibleByChar: { "파티원B_본캐": true, "파티원B_부캐": false } as Record<string, boolean>,
        tableOrder: ["__empty_0"],
        rosterOrder: [],
        cardRosterOrder: [],
        canOthersEdit: true,
    },
];

/* ─────────────────────────────
 * 타입 정의
 * ───────────────────────────── */
type PartyMember = { id: string; name: string | null; image: string | null; role: string; };
type PartyDetail = { id: number; name: string; memo: string | null; ownerId: string; createdAt: string; myRole: string; members: PartyMember[]; raidCount: number; nextResetAt: string | null; raidState?: RaidStateFromServer; };
type PartyMemberTasks = { userId: string; name: string | null; image: string | null; nickname: string; summary: CharacterSummary | null; prefsByChar: Record<string, CharacterTaskPrefs>; visibleByChar: Record<string, boolean>; tableOrder?: string[]; rosterOrder?: string[]; cardRosterOrder?: string[]; canOthersEdit?: boolean; };
type PartyInvite = { code: string; url?: string; expiresAt?: string | null; };
type SavedFilters = { onlyRemain?: boolean; isCardView?: boolean; tableView?: boolean; columnOrder?: string[]; selectedRaids?: string[]; isDragEnabled?: boolean; };

type SavedAccount = { id: string; nickname: string; summary: CharacterSummary; isPrimary?: boolean; isSelected: boolean; };
type RaidStateFromServer = { accounts?: SavedAccount[]; activeAccountId?: string | null; activeAccountByParty?: Record<string, string | null>; prefsByChar?: Record<string, CharacterTaskPrefs>; visibleByChar?: Record<string, boolean>; filters?: SavedFilters; };

/* ─────────────────────────────
 * 공통 유틸 함수
 * ───────────────────────────── */
function applyRosterOrder(roster: RosterCharacter[], rosterOrder?: string[]): RosterCharacter[] {
    if (!rosterOrder || rosterOrder.length === 0) return roster;
    const map = new Map(roster.map((c) => [c.name, c] as const));
    const out: RosterCharacter[] = [];
    const used = new Set<string>();

    for (const name of rosterOrder) {
        const c = map.get(name);
        if (!c) continue;
        if (used.has(name)) continue;
        used.add(name);
        out.push(c);
    }
    for (const c of roster) {
        if (!used.has(c.name)) out.push(c);
    }
    return out;
}

function mergeReorderedSubset(full: string[], subset: string[], subsetNew: string[]) {
    const subsetSet = new Set(subset);
    const baseFull = full.length ? full : subset;
    const result: string[] = [];
    let k = 0;

    for (const name of baseFull) {
        if (subsetSet.has(name)) {
            result.push(subsetNew[k++] ?? name);
        } else {
            result.push(name);
        }
    }
    for (; k < subsetNew.length; k++) {
        if (!result.includes(subsetNew[k])) result.push(subsetNew[k]);
    }
    return result;
}

function buildTasksForCharacter(
    c: RosterCharacter,
    prefsByChar: Record<string, CharacterTaskPrefs>,
    options?: { onlyRemain?: boolean; onToggleGate?: (raidName: string, gateIndex: number, currentGates: number[], allGates: number[]) => void; }
): TaskItem[] {
    const prefs = prefsByChar[c.name];
    if (!prefs) return [];

    const baseRaidNames = prefs.order?.filter((r) => prefs.raids[r]) ?? Object.keys(prefs.raids);
    const raidNames = prefs.order ? baseRaidNames : [...baseRaidNames].sort((a, b) => getRaidBaseLevel(b) - getRaidBaseLevel(a));

    const items: TaskItem[] = [];

    for (const raidName of raidNames) {
        const p = prefs.raids[raidName];
        if (!p?.enabled) continue;

        const info = raidInformation[raidName];
        if (!info) continue;

        const diff = info.difficulty[p.difficulty];
        if (!diff) continue;

        const gatesDef = diff.gates ?? [];
        const allGateIdx = gatesDef.map((g) => g.index);

        if (options?.onlyRemain) {
            if (gatesDef.length) {
                const lastGateIndex = gatesDef.reduce((max, g) => (g.index > max ? g.index : max), gatesDef[0].index);
                const gates = p.gates ?? [];
                const isCompleted = gates.includes(lastGateIndex);
                if (isCompleted) continue;
            }
        }

        const totalGold = (p.gates ?? []).reduce((sum, gi) => {
            const g = diff.gates.find((x) => x.index === gi);
            const gold = g?.gold ?? 0;
            const cost = p.isBonus ? (g?.bonusCost ?? 0) : 0;
            return sum + Math.max(0, gold - cost);
        }, 0);

        const right = (
            <span className="text-xs px-2 py-1 rounded bg-yellow-500/10 text-yellow-300 border border-yellow-300/20">
                {totalGold.toLocaleString()}g
            </span>
        );

        items.push({
            id: raidName,
            element: (
                <TaskCard
                    key={`${c.name}-${raidName}-${p.difficulty}`}
                    kind={info.kind}
                    raidName={raidName}
                    difficulty={p.difficulty}
                    gates={p.gates}
                    right={right}
                    onToggleGate={(gate) => {
                        if (!options?.onToggleGate) return;
                        const currentGates = p.gates ?? [];
                        options.onToggleGate(raidName, gate, currentGates, allGateIdx);
                    }}
                />
            ),
        });
    }

    return items;
}

function computeMemberSummary(member: PartyMemberTasks & { summary: CharacterSummary | null }): RaidSummary {
    const visibleRoster = member.summary?.roster?.filter((c) => member.visibleByChar?.[c.name] ?? true) ?? [];
    return computeRaidSummaryForRoster(visibleRoster, member.prefsByChar ?? {});
}

/* ─────────────────────────────
 * 메인 컴포넌트
 * ───────────────────────────── */
export default function PartyDemoPage() {
    const router = useRouter();
    const { status: realStatus } = useSession();

    useEffect(() => {
        if (realStatus === "authenticated") {
            router.replace("/party-tasks");
        }
    }, [realStatus, router]);

    // 데모 환경을 위해 항상 인증된 상태로 강제 설정합니다.
    const status = "authenticated";
    const myUserId = MOCK_MY_USER_ID;

    const [selectedRaids, setSelectedRaids] = useState<string[]>([]);
    const [party, setParty] = useState<PartyDetail | null>(null);
    const [partyLoading, setPartyLoading] = useState(true);
    const [partyErr, setPartyErr] = useState<string | null>(null);

    const [partyTasks, setPartyTasks] = useState<PartyMemberTasks[] | null>(null);
    const [tasksLoading, setTasksLoading] = useState(false);
    const [tasksErr, setTasksErr] = useState<string | null>(null);
    const [refreshErr, setRefreshErr] = useState<string | null>(null);

    const [onlyRemain, setOnlyRemain] = useState(false);
    const [isCardView, setIsCardView] = useState(false);
    const [isDragEnabled, setIsDragEnabled] = useState(false); // 🔥 드래그 토글 추가

    const [editOpen, setEditOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<{ memberUserId: string; charName: string; character: RosterCharacter; } | null>(null);
    const [editInitial, setEditInitial] = useState<CharacterTaskPrefs | null>(null);

    const [charSettingOpen, setCharSettingOpen] = useState(false);
    const [charSettingTarget, setCharSettingTarget] = useState<{ memberUserId: string } | null>(null);

    const [inviteOpen, setInviteOpen] = useState(false);
    const [inviteLoading, setInviteLoading] = useState(false);
    const [inviteErr, setInviteErr] = useState<string | null>(null);
    const [invite, setInvite] = useState<PartyInvite | null>(null);
    const [inviteCopied, setInviteCopied] = useState(false);
    const [partySettingOpen, setPartySettingOpen] = useState(false);
    const [shareModalOpen, setShareModalOpen] = useState(false);

    const [accountSearchLoading, setAccountSearchLoading] = useState(false);
    const [accountSearchErr, setAccountSearchErr] = useState<string | null>(null);

    // 데모를 위해 초기 내 계정을 세팅해둡니다.
    const [accounts, setAccounts] = useState<SavedAccount[]>([
        {
            id: "demo-account-1",
            nickname: "데모캐릭_본캐",
            summary: { ...baseSummaryProps, roster: MOCK_ROSTER_ME } as unknown as CharacterSummary,
            isPrimary: true,
            isSelected: true,
        }
    ]);

    // 🔥 "ALL" 상태(통합 보기)를 위한 activeAccountId 상태 추가
    const [activeAccountId, setActiveAccountId] = useState<string | null>("demo-account-1");
    const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

    // 🔥 통합 보기를 위한 가상의 currentAccount 생성 로직
    const isAllView = activeAccountId === "ALL";
    const currentAccount = useMemo(() => {
        if (isAllView) {
            const allRoster = accounts.flatMap(a => a.summary?.roster || []);
            const uniqueRoster = Array.from(new Map(allRoster.map(item => [item.name, item])).values());
            uniqueRoster.sort((a, b) => (b.itemLevelNum ?? 0) - (a.itemLevelNum ?? 0));

            return {
                id: "ALL",
                nickname: "통합 보기 (모든 계정)",
                summary: {
                    name: "통합 보기",
                    roster: uniqueRoster,
                },
                isSelected: true,
            } as SavedAccount;
        }
        return accounts.find((a) => a.id === activeAccountId) ?? accounts.find((a) => a.isPrimary) ?? accounts[0] ?? null;
    }, [accounts, activeAccountId, isAllView]);


    // ─────────────────────────────────────────────────────────────────
    // Mock API Functions
    // ─────────────────────────────────────────────────────────────────
    const reloadPartyTasks = useCallback(async (showSpinner: boolean) => {
        if (showSpinner) setTasksLoading(true);
        setTasksErr(null);
        setTimeout(() => {
            setPartyTasks([...MOCK_PARTY_TASKS]);
            if (showSpinner) setTasksLoading(false);
        }, 800);
    }, []);

    const handleSelectAccount = (accountId: string) => {
        setActiveAccountId(accountId);
        const nextAccounts = accounts.map(a => ({ ...a, isSelected: a.id === accountId }));
        setAccounts(nextAccounts);
    };

    const handleCharacterSearch = async (name: string): Promise<boolean> => {
        const trimmed = name.trim();
        if (!trimmed) return false;

        setAccountSearchLoading(true);
        setAccountSearchErr(null);

        return new Promise((resolve) => {
            setTimeout(() => {
                const fakeSummary: CharacterSummary = {
                    ...baseSummaryProps,
                    roster: [
                        { name: trimmed, itemLevel: "1640.00", itemLevelNum: 1640, serverName: "카마인", className: "무도가" },
                        { name: `${trimmed}부캐`, itemLevel: "1580.00", itemLevelNum: 1580, serverName: "카마인", className: "전사" }
                    ]
                } as unknown as CharacterSummary;

                const newAcc: SavedAccount = {
                    id: `mock-acc-${Date.now()}`,
                    nickname: trimmed,
                    summary: fakeSummary,
                    isPrimary: accounts.length === 0,
                    isSelected: true,
                };

                const nextAccounts = accounts.map(a => ({ ...a, isSelected: false }));
                nextAccounts.push(newAcc);
                setAccounts(nextAccounts);
                setActiveAccountId(newAcc.id);

                setPartyTasks(prev => {
                    if (!prev) return prev;
                    return prev.map(m => m.userId === myUserId ? { ...m, summary: fakeSummary, nickname: trimmed } : m);
                });

                setAccountSearchLoading(false);
                resolve(true);
            }, 1000);
        });
    };

    const openEditModal = (member: PartyMemberTasks, char: RosterCharacter) => {
        const prefs = member.prefsByChar[char.name] ?? { raids: {} };
        setEditTarget({ memberUserId: member.userId, charName: char.name, character: char });
        setEditInitial(prefs);
        setEditOpen(true);
    };

    const openMemberCharSetting = (member: PartyMemberTasks) => {
        setCharSettingTarget({ memberUserId: member.userId });
        setCharSettingOpen(true);
    };

    async function fetchInvite() {
        setInviteLoading(true);
        setTimeout(() => {
            setInvite({ code: "DEMO-1234", url: "https://loacheck.com/join?code=DEMO-1234", expiresAt: "24시간 후" });
            setInviteLoading(false);
        }, 600);
    }

    const openInviteModal = () => {
        setInviteOpen(true);
        setInviteCopied(false);
        void fetchInvite();
    };

    const handleCopyInvite = async () => {
        if (!invite) return;
        setInviteCopied(true);
        setTimeout(() => setInviteCopied(false), 1500);
    };

    const handleSmartShare = async () => {
        handleCopyInvite();
        setShareModalOpen(true);
    };

    const launchDiscordApp = () => { setShareModalOpen(false); };
    const launchDiscordWeb = () => { setShareModalOpen(false); };

    const handleMemberChangeVisible = (memberUserId: string, partialVisibleByChar: Record<string, boolean>) => {
        if (!partyTasks) return;
        setPartyTasks(prev => prev!.map((m) => {
            if (m.userId !== memberUserId) return m;
            return { ...m, visibleByChar: { ...(m.visibleByChar ?? {}), ...partialVisibleByChar } };
        }));
    };

    const handleMyDeleteAccount = async () => {
        if (!currentAccount || isAllView) return;
        setCharSettingOpen(false);
        const filtered = accounts.filter((a) => a.id !== currentAccount.id);
        const baseActive = filtered.find(a => a.isPrimary) ?? filtered[0];
        setAccounts(filtered.map((a) => ({ ...a, isSelected: a.id === baseActive?.id })));
        setActiveAccountId(baseActive?.id ?? null);
    };

    const handleMyRefreshAccount = async () => {
        if (!currentAccount || isAllView) return;
        await handleCharacterSearch(currentAccount.nickname);
    };

    const handleMemberRefreshAccount = async (memberUserId: string) => {
        return new Promise<void>(resolve => setTimeout(resolve, 800));
    };

    const handleSaveEdit = (nextPrefs: CharacterTaskPrefs) => {
        if (!editTarget || !partyTasks) return;
        const { memberUserId, charName } = editTarget;
        setPartyTasks(prev => prev!.map((m) => {
            if (m.userId !== memberUserId) return m;
            return { ...m, prefsByChar: { ...(m.prefsByChar ?? {}), [charName]: { ...nextPrefs } } };
        }));
        setEditOpen(false);
    };

    const handleMemberToggleGate = (memberUserId: string, charName: string, raidName: string, gate: number, currentGates: number[], allGates: number[]) => {
        if (!partyTasks) return;
        setPartyTasks(prev => prev!.map((m) => {
            if (m.userId !== memberUserId) return m;
            const curPrefsForChar = m.prefsByChar[charName] ?? { raids: {} };
            const curRaidPref = curPrefsForChar.raids[raidName];
            if (!curRaidPref) return m;

            const nextGates = calcNextGates(gate, currentGates ?? [], allGates ?? []);

            return {
                ...m,
                prefsByChar: {
                    ...m.prefsByChar,
                    [charName]: {
                        ...curPrefsForChar,
                        raids: { ...curPrefsForChar.raids, [raidName]: { ...curRaidPref, gates: nextGates } }
                    }
                }
            };
        }));
    };

    const handleMemberAutoSetup = (memberUserId: string, isMe: boolean, charCount: number) => {
        if (!partyTasks) return;
        setPartyTasks(prev => prev!.map((m) => {
            if (m.userId !== memberUserId) return m;
            let roster = m.summary?.roster ?? [];
            if (isMe && currentAccount?.summary?.roster) roster = currentAccount.summary.roster;
            if (!roster.length) return m;

            const { nextPrefsByChar, nextVisibleByChar } = buildAutoSetupForRoster(roster, m.prefsByChar ?? {}, charCount);

            const nextVisibleMerged: Record<string, boolean> = { ...(m.visibleByChar ?? {}) };
            for (const c of roster) { nextVisibleMerged[c.name] = nextVisibleByChar[c.name] ?? false; }

            return {
                ...m,
                tableOrder: ["__empty_0"],
                prefsByChar: { ...(m.prefsByChar ?? {}), ...nextPrefsByChar },
                visibleByChar: nextVisibleMerged,
            };
        }));
    };

    // 🔥 드래그 관련 콜백 함수들 추가
    const handleMemberCardRosterReorder = (memberUserId: string, mergedCardOrder: string[]) => {
        setPartyTasks(prev => prev!.map(m => m.userId === memberUserId ? { ...m, cardRosterOrder: mergedCardOrder } : m));
    };

    const handleMemberRosterReorder = (memberUserId: string, mergedRosterOrder: string[]) => {
        setPartyTasks(prev => prev!.map(m => m.userId === memberUserId ? { ...m, rosterOrder: mergedRosterOrder } : m));
    };

    const handleMemberTableReorder = (memberUserId: string, newOrder: string[]) => {
        setPartyTasks(prev => prev!.map(m => m.userId === memberUserId ? { ...m, tableOrder: newOrder } : m));
    };

    const handleMemberReorder = (memberUserId: string, charName: string, newOrderIds: string[]) => {
        setPartyTasks(prev => prev!.map((m) => {
            if (m.userId !== memberUserId) return m;
            const curPrefsForChar = m.prefsByChar[charName] ?? { raids: {} };
            const allRaidNames = Object.keys(curPrefsForChar.raids ?? {});
            const mergedOrder = [...newOrderIds, ...allRaidNames.filter((name) => !newOrderIds.includes(name))];
            return {
                ...m,
                prefsByChar: {
                    ...m.prefsByChar,
                    [charName]: { ...curPrefsForChar, order: mergedOrder }
                }
            };
        }));
    };


    const handleMemberGateAllClear = (memberUserId: string) => {
        if (!partyTasks) return;
        setPartyTasks(prev => prev!.map((m) => {
            if (m.userId !== memberUserId) return m;
            const updatedPrefsByChar: Record<string, CharacterTaskPrefs> = {};
            for (const [charName, prefs] of Object.entries(m.prefsByChar ?? {})) {
                const clearedRaids: CharacterTaskPrefs["raids"] = {};
                for (const [raidName, raidPref] of Object.entries(prefs.raids ?? {})) {
                    clearedRaids[raidName] = { ...raidPref, gates: [] };
                }
                updatedPrefsByChar[charName] = { ...prefs, raids: clearedRaids };
            }
            return { ...m, prefsByChar: updatedPrefsByChar };
        }));
    };

    // 초기 데이터 로딩 효과
    useEffect(() => {
        setPartyLoading(true);
        setTimeout(() => {
            setParty(MOCK_PARTY_DETAIL as PartyDetail);
            setPartyLoading(false);
            reloadPartyTasks(true);
        }, 1000);
    }, [reloadPartyTasks]);

    const handlePartyUpdated = (patch: Partial<PartyDetail>) => {
        setParty((prev) => (prev ? { ...prev, ...patch } : prev));
    };

    const handlePartyMemberKicked = (userId: string) => {
        setParty((prev) => prev ? { ...prev, members: prev.members.filter((m) => m.id !== userId) } : prev);
        setPartyTasks((prev) => prev ? prev.filter((m) => m.userId !== userId) : prev);
    };

    function filterPrefsBySelectedRaids(prefsByChar: Record<string, CharacterTaskPrefs>, selectedRaids: string[]): Record<string, CharacterTaskPrefs> {
        if (!selectedRaids || selectedRaids.length === 0) return prefsByChar;
        const allow = new Set(selectedRaids);
        const out: Record<string, CharacterTaskPrefs> = {};

        for (const [charName, prefs] of Object.entries(prefsByChar ?? {})) {
            const raids = prefs.raids ?? {};
            const nextRaids = Object.fromEntries(Object.entries(raids).filter(([raidName]) => allow.has(raidName))) as CharacterTaskPrefs["raids"];
            const filteredOrder = prefs.order?.filter((r) => allow.has(r) && nextRaids[r]).filter(Boolean);
            const { order: _old, ...rest } = prefs;
            out[charName] = filteredOrder && filteredOrder.length > 0 ? { ...rest, raids: nextRaids, order: filteredOrder } : { ...rest, raids: nextRaids };
        }
        return out;
    }

    if (partyLoading) {
        return (
            <div className="w-full text-white py-8 sm:py-12">
                <div className="mx-auto max-w-7xl space-y-6">
                    <div className="space-y-3 animate-pulse">
                        <div className="h-4 w-28 rounded bg-white/5" />
                        <div className="h-8 w-56 rounded bg-white/5" />
                        <div className="h-4 w-72 rounded bg-white/5" />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="h-[180px] rounded-xl border border-white/5 bg-[#16181D] p-5 animate-pulse">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="h-10 w-10 rounded-full bg-white/5" />
                                    <div className="space-y-2 flex-1">
                                        <div className="h-4 w-1/2 rounded bg-white/5" />
                                        <div className="h-3 w-1/3 rounded bg-white/5" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="h-8 w-full rounded bg-white/5" />
                                    <div className="h-3 w-1/4 rounded bg-white/5" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (!party) return null;

    const sortedPartyTasks = partyTasks ? [...partyTasks] : [];
    let myRemainingRaids: number | undefined = undefined;

    if (sortedPartyTasks && myUserId) {
        const me = sortedPartyTasks.find((m) => m.userId === myUserId);
        if (me) {
            const baseSummary = currentAccount?.summary ? currentAccount.summary : me.summary;
            if (baseSummary) {
                const mySummary = computeMemberSummary({ ...me, summary: baseSummary });
                myRemainingRaids = mySummary.totalRemainingTasks;
            }
        }
    }

    return (
        <div className="w-full text-white py-8 sm:py-12">
            <div className="mx-auto max-w-7xl space-y-5">

                {/* 상단 헤더 */}
                <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 py-1 sm:py-2 px-4 sm:px-0">
                    <div className="flex items-center gap-2 sm:gap-5 min-w-0">
                        <button
                            type="button"
                            onClick={() => router.push("/party-tasks")}
                            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-300 hover:bg-white/5 hover:text-white"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </button>
                        <div className="flex items-center gap-2 sm:gap-1 min-w-0">
                            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight truncate break-keep">
                                {party.name} <span className="ml-2 text-xs text-[#5B69FF] font-semibold">(데모)</span>
                            </h1>
                            <button
                                type="button"
                                onClick={() => setPartySettingOpen(true)}
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-300 hover:bg-white/5 hover:text-white"
                            >
                                <Settings className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3">
                        <button type="button" onClick={openInviteModal} className="inline-flex items-center gap-1.5 rounded-full bg-[#5B69FF]/80 px-3 py-1.5 text-[11px] sm:text-xs font-medium text-white hover:bg-[#4a57e0]">
                            <Link2 className="h-3.5 w-3.5" />
                            <span>파티 코드 생성</span>
                        </button>
                    </div>
                </div>

                {/* 그리드 레이아웃 */}
                <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,210px)_minmax(0,1fr)] gap-5 lg:items-start">

                    {/* 공용 사이드바 적용 */}
                    <div className="space-y-4">
                        <TaskSidebar
                            accounts={accounts}
                            activeAccountId={activeAccountId}
                            onSelectAccount={handleSelectAccount}
                            onAddAccount={() => setIsAddAccountOpen(true)}
                            onlyRemain={onlyRemain}
                            setOnlyRemain={setOnlyRemain}
                            isCardView={isCardView}
                            setIsCardView={setIsCardView}
                            selectedRaids={selectedRaids}
                            setSelectedRaids={setSelectedRaids}
                            isDragEnabled={isDragEnabled}
                            setIsDragEnabled={setIsDragEnabled}
                        />
                    </div>

                    {/* 파티 멤버 목록 */}
                    <div className="grid grid-cols-1 gap-4 sm:gap-5">

                        {/* 데모 안내 배너 */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 mb-2">
                            <div className="flex flex-col gap-2 p-4 rounded-xl bg-white/[0.03] border border-white/5">
                                <div className="font-semibold text-sm text-[#5B69FF] flex items-center gap-1.5">1. 실시간 숙제 체크</div>
                                <div className="text-[12px] text-gray-400 break-keep">레이드 관문을 클릭해보세요. 골드와 숙제 수가 실시간으로 반영됩니다.</div>
                            </div>
                            <div className="flex flex-col gap-2 p-4 rounded-xl bg-white/[0.03] border border-white/5">
                                <div className="font-semibold text-sm text-[#5B69FF] flex items-center gap-1.5">2. 수정 권한 테스트</div>
                                <div className="text-[12px] text-gray-400 break-keep">파티원 A와 B의 옵션(수정 가능 여부)이 다르게 작동하는 것을 확인해보세요.</div>
                            </div>
                            <div className="flex flex-col gap-2 p-4 rounded-xl bg-white/[0.03] border border-white/5">
                                <div className="font-semibold text-sm text-[#5B69FF] flex items-center gap-1.5">3. 스마트 기능</div>
                                <div className="text-[12px] text-gray-400 break-keep">사이드바에서 모든 계정 통합 보기를 켜보거나, 레이드를 필터링 해보세요.</div>
                            </div>
                        </div>

                        {tasksLoading && (
                            <div className="w-full py-6">
                                <div className="animate-pulse space-y-3">
                                    <div className="h-4 w-40 rounded bg-white/5" />
                                    <div className="space-y-2">
                                        {[1, 2, 3].map((i) => (
                                            <div key={i} className="flex items-center gap-3 rounded-xl border border-white/5 bg-[#16181D] p-4">
                                                <div className="h-9 w-9 rounded-full bg-white/5" />
                                                <div className="flex-1 space-y-2">
                                                    <div className="h-4 w-1/2 rounded bg-white/5" />
                                                    <div className="h-3 w-1/3 rounded bg-white/5" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {!tasksLoading && sortedPartyTasks.length > 0 && (
                            <div className="flex flex-col gap-6 sm:gap-10">
                                {sortedPartyTasks.map((m) => {
                                    const filteredPrefs = filterPrefsBySelectedRaids(m.prefsByChar, selectedRaids);
                                    let filteredTableOrder = m.tableOrder ?? [];
                                    if (selectedRaids.length > 0 && Array.isArray(m.tableOrder)) {
                                        filteredTableOrder = m.tableOrder.filter(raidId => selectedRaids.includes(raidId));
                                    }

                                    let startIndex = 0;
                                    let endIndex = filteredTableOrder.length - 1;
                                    while (startIndex <= endIndex && filteredTableOrder[startIndex].startsWith("__empty_")) startIndex++;
                                    while (endIndex >= startIndex && filteredTableOrder[endIndex].startsWith("__empty_")) endIndex--;
                                    const finalTableOrder = startIndex <= endIndex ? filteredTableOrder.slice(startIndex, endIndex + 1) : [];

                                    // 🔥 데모 페이지용 isAllView 로직
                                    const isCurrentAllView = (myUserId === m.userId)
                                        ? activeAccountId === "ALL"
                                        : (m.summary?.name === "통합 원정대" || m.summary?.name === "모두 보기");

                                    return (
                                        <PartyMemberBlock
                                            key={m.userId}
                                            partyId={party.id}
                                            member={m}
                                            filteredPrefs={filteredPrefs}
                                            viewTableOrder={finalTableOrder}
                                            selectedRaids={selectedRaids}
                                            isMe={myUserId === m.userId}
                                            isAllView={isCurrentAllView}
                                            currentAccount={currentAccount}
                                            onReorderTable={handleMemberTableReorder}
                                            onlyRemain={onlyRemain}
                                            isCardView={isCardView}
                                            onAutoSetup={(isMe: boolean, count: number) => handleMemberAutoSetup(m.userId, isMe, count)}
                                            onGateAllClear={() => handleMemberGateAllClear(m.userId)}
                                            onOpenCharSetting={() => openMemberCharSetting(m)}
                                            onRefreshAccount={myUserId === m.userId ? handleMyRefreshAccount : () => handleMemberRefreshAccount(m.userId)}
                                            onToggleGate={(charName: string, raidName: string, gate: number, cur: number[], all: number[]) => handleMemberToggleGate(m.userId, charName, raidName, gate, cur, all)}
                                            onEdit={(c: RosterCharacter) => openEditModal(m, c)}
                                            onReorder={(userId: string, charName: string, newOrder: string[]) => handleMemberReorder(userId, charName, newOrder)}
                                            onSearch={handleCharacterSearch}
                                            searchLoading={accountSearchLoading}
                                            searchError={accountSearchErr}
                                            isDragEnabled={isDragEnabled}
                                            onReorderRoster={handleMemberRosterReorder}
                                            onReorderCardRoster={handleMemberCardRosterReorder}
                                        />
                                    );
                                })}
                            </div>
                        )}

                        {/* 각종 모달 */}
                        {editTarget && (
                            <EditTasksModal
                                open={editOpen}
                                onClose={() => setEditOpen(false)}
                                character={editTarget.character}
                                initial={editInitial ?? undefined}
                                onSave={handleSaveEdit}
                            />
                        )}

                        {charSettingOpen && charSettingTarget && (() => {
                            const targetMember = partyTasks?.find((m) => m.userId === charSettingTarget.memberUserId);
                            const isMeTarget = !!myUserId && charSettingTarget.memberUserId === myUserId;
                            const baseSummary = (isMeTarget ? (currentAccount?.summary ?? null) : null) ?? targetMember?.summary ?? null;
                            const roster = baseSummary?.roster ?? [];
                            const rawVisible = targetMember?.visibleByChar ?? {};
                            const modalVisibleByChar: Record<string, boolean> = {};
                            for (const c of roster) modalVisibleByChar[c.name] = rawVisible[c.name] ?? true;

                            return (
                                <CharacterSettingModal
                                    open
                                    onClose={() => { setCharSettingOpen(false); setRefreshErr(null); setAccountSearchErr(null); }}
                                    refreshError={isMeTarget ? accountSearchErr : refreshErr}
                                    roster={roster}
                                    visibleByChar={modalVisibleByChar}
                                    onChangeVisible={(next) => handleMemberChangeVisible(charSettingTarget.memberUserId, next)}
                                    onDeleteAccount={isMeTarget && activeAccountId !== "ALL" ? () => setDeleteConfirmOpen(true) : undefined}
                                    onRefreshAccount={isMeTarget ? handleMyRefreshAccount : () => handleMemberRefreshAccount(charSettingTarget.memberUserId)}
                                />
                            );
                        })()}

                        {/* 검색 모달 (계정 추가) */}
                        <EmptyCharacterState
                            open={isAddAccountOpen}
                            onClose={() => { setIsAddAccountOpen(false); setAccountSearchErr(null); }}
                            loading={accountSearchLoading}
                            error={accountSearchErr}
                            onSearch={async (nickname) => {
                                const success = await handleCharacterSearch(nickname);
                                if (success) setIsAddAccountOpen(false);
                            }}
                        />

                        {/* 계정 삭제 확인 모달 */}
                        {deleteConfirmOpen && (
                            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4 animate-in fade-in duration-200">
                                <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-[#1E2028] border border-white/10 shadow-2xl animate-in zoom-in-95 duration-200">
                                    <div className="p-6 text-center">
                                        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 text-red-500">
                                            <AlertTriangle className="h-7 w-7" />
                                        </div>
                                        <h3 className="text-lg font-bold text-white mb-2">계정을 삭제하시겠습니까?</h3>
                                        <div className="flex gap-3 mt-6">
                                            <button onClick={() => setDeleteConfirmOpen(false)} className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-medium">취소</button>
                                            <button onClick={handleMyDeleteAccount} className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold">삭제하기</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ==============================================================================
// 하위 컴포넌트들
// ==============================================================================
function SortableStripWrapper({ id, children }: any) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.65 : 1,
        zIndex: isDragging ? 20 : 1,
        position: isDragging ? "relative" : "static",
    };
    return <div ref={setNodeRef} style={style}>{children({ ...attributes, ...listeners })}</div>;
}

function PartyMemberBlock({
    partyId, onReorderTable, member, filteredPrefs, viewTableOrder, isMe, isAllView, currentAccount,
    onlyRemain, isCardView, onAutoSetup, onGateAllClear, onOpenCharSetting, onToggleGate, onEdit, onReorder, onSearch,
    searchLoading, searchError, onRefreshAccount, selectedRaids, isDragEnabled, onReorderRoster, onReorderCardRoster
}: any) {
    const [isExpanded, setIsExpanded] = useState(true);
    const [showPermissionError, setShowPermissionError] = useState(false);

    const canEdit = isMe || member.canOthersEdit === true;
    const charSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

    const withEditAuth = <T extends (...args: any[]) => any>(fn: T) => {
        return (...args: Parameters<T>): ReturnType<T> | void => {
            if (!canEdit) {
                setShowPermissionError(true);
                return;
            }
            return fn(...args);
        };
    };

    const handleToggleExpand = () => setIsExpanded(!isExpanded);

    const baseSummary = isMe && currentAccount?.summary ? currentAccount.summary : member.summary;
    const visibleRoster = baseSummary?.roster?.filter((c: any) => member.visibleByChar?.[c.name] ?? true) ?? [];
    const defaultSortedRoster = useMemo(() => [...visibleRoster].sort((a: any, b: any) => (b.itemLevelNum ?? 0) - (a.itemLevelNum ?? 0)), [visibleRoster]);

    const tableOrderedRoster = useMemo(() => applyRosterOrder(defaultSortedRoster, member.rosterOrder), [defaultSortedRoster, member.rosterOrder]);
    const cardOrderedRoster = useMemo(() => applyRosterOrder(defaultSortedRoster, member.cardRosterOrder), [defaultSortedRoster, member.cardRosterOrder]);

    const isRaidFilterActive = selectedRaids.length > 0;

    const tablePrefsByChar = useMemo(() => {
        if (!onlyRemain) return filteredPrefs;
        const next: Record<string, CharacterTaskPrefs> = {};
        for (const [charName, pref] of Object.entries(filteredPrefs as Record<string, CharacterTaskPrefs>)) {
            const raids = pref.raids ?? {};
            const filteredRaids: any = {};
            for (const [raidName, raidPref] of Object.entries(raids as any)) {
                if (!(raidPref as any)?.enabled) continue;
                const info = raidInformation[raidName];
                const diff = (info?.difficulty as any)?.[(raidPref as any).difficulty];
                if (!diff) continue;
                const gatesDef = diff.gates ?? [];
                if (!gatesDef.length) { filteredRaids[raidName] = raidPref; continue; }
                const lastGateIndex = gatesDef.reduce((max: number, g: any) => (g.index > max ? g.index : max), gatesDef[0].index);
                const gates = (raidPref as any).gates ?? [];
                if (gates.includes(lastGateIndex)) continue;
                filteredRaids[raidName] = raidPref;
            }
            const nextOrder = pref.order?.filter((r) => filteredRaids[r]) ?? Object.keys(filteredRaids);
            next[charName] = { ...pref, raids: filteredRaids, order: nextOrder };
        }
        return next;
    }, [filteredPrefs, onlyRemain]);

    const tableRoster = useMemo(() => {
        if (!isRaidFilterActive && !onlyRemain) return tableOrderedRoster;
        return tableOrderedRoster.filter((c) => {
            const pref = tablePrefsByChar[c.name];
            if (!pref?.raids) return false;
            return Object.values(pref.raids as any).some((r: any) => r?.enabled);
        });
    }, [tableOrderedRoster, tablePrefsByChar, isRaidFilterActive, onlyRemain]);

    const cardRosterForView = isRaidFilterActive
        ? cardOrderedRoster.filter((c) => Object.values((filteredPrefs?.[c.name] as any)?.raids ?? {}).some((p: any) => p?.enabled))
        : cardOrderedRoster;

    const memberSummary = computeMemberSummary({ ...member, summary: baseSummary });

    if (visibleRoster.length === 0) {
        return (
            <div className="rounded-none sm:rounded-xl border-x-0 sm:border border-white/10 bg-[#16181D] overflow-hidden relative">
                <div className="flex items-center gap-3 px-4 py-5 ">
                    <MemberAvatar member={{ id: member.userId, name: member.name, image: member.image, role: "member" }} className="h-8 w-8 rounded-full border border-black/50" />
                    <span className="font-semibold text-xl text-gray-200">{member.name || "이름 없음"}</span>
                </div>
                <div className="px-4 pb-4">
                    <div className="w-full py-10 sm:py-16 px-4 sm:px-6 flex flex-col items-center justify-center text-center bg-[#16181D] border-x-0 sm:border-x-2 border-y-2 sm:border-y-2 border-dashed border-white/10 rounded-none sm:rounded-xl">
                        <UsersRound className="w-8 h-8 sm:w-9 sm:h-9 text-[#5B69FF]" strokeWidth={1.5} />
                        <h2 className="text-xl sm:text-2xl font-bold text-white/90 mb-2 sm:mb-3 mt-4">캐릭터 정보가 없습니다</h2>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 gap-4 sm:gap-1 rounded-none sm:rounded-lg border-x-0 sm:border border-y sm:border-y border-white/10 px-3 sm:px-4 py-3 sm:py-4 relative">
            <PartyMemberSummaryBar member={member} summary={memberSummary}>
                <PartyMemberActions
                    onAutoSetup={withEditAuth((count: number) => onAutoSetup(isMe, count))}
                    onGateAllClear={withEditAuth(onGateAllClear)}
                    onOpenCharSetting={withEditAuth(onOpenCharSetting)}
                    onRefreshAccount={withEditAuth(async () => { await onRefreshAccount(); })}
                    isExpanded={isExpanded}
                    onToggleExpand={handleToggleExpand}
                    isAllView={isAllView}
                />
            </PartyMemberSummaryBar>

            {isExpanded && (
                <div className="mt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    {isCardView ? (
                        <div className="flex flex-col gap-4">
                            {(() => {
                                const strips = cardRosterForView.map((c) => {
                                    const toggleWrapper = withEditAuth((rName: string, gate: number, curG: number[], allG: number[]) => onToggleGate(c.name, rName, gate, curG, allG));
                                    const tasksAll = buildTasksForCharacter(c, filteredPrefs, { onlyRemain: false, onToggleGate: toggleWrapper });
                                    const tasksShown = onlyRemain ? buildTasksForCharacter(c, filteredPrefs, { onlyRemain: true, onToggleGate: toggleWrapper }) : tasksAll;
                                    return { c, tasksAllLen: tasksAll.length, tasks: tasksShown };
                                });

                                const visibleStrips = onlyRemain ? strips.filter((s) => s.tasks.length > 0) : strips;
                                const showAllDone = onlyRemain && strips.some(s => s.tasksAllLen > 0) && visibleStrips.length === 0;

                                if (showAllDone) {
                                    return (
                                        <div className="flex flex-col items-center justify-center py-14 rounded-none sm:rounded-xl border-x-0 sm:border border-white/5 bg-white/[0.02]">
                                            <div className="relative mb-4">
                                                <div className="absolute inset-0 bg-emerald-500 blur-[24px] opacity-20 rounded-full" />
                                                <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[#16181D] border border-emerald-500/30">
                                                    <Check className="h-7 w-7 text-emerald-400" strokeWidth={3} />
                                                </div>
                                            </div>
                                            <h3 className="text-gray-200 font-bold text-base">모든 숙제 완료!</h3>
                                        </div>
                                    );
                                }
                                const subset = visibleStrips.map((s) => s.c.name);

                                const handleCharDragEnd = (e: DragEndEvent) => {
                                    if (!canEdit) { setShowPermissionError(true); return; }
                                    const { active, over } = e;
                                    if (!over || active.id === over.id) return;
                                    const oldIndex = subset.indexOf(String(active.id));
                                    const newIndex = subset.indexOf(String(over.id));
                                    if (oldIndex === -1 || newIndex === -1) return;

                                    const newSubsetOrder = arrayMove(subset, oldIndex, newIndex);
                                    const baseFull = member.cardRosterOrder && member.cardRosterOrder.length > 0 ? member.cardRosterOrder : defaultSortedRoster.map((c) => c.name);
                                    const merged = mergeReorderedSubset(baseFull, subset, newSubsetOrder);
                                    onReorderCardRoster(member.userId, merged);
                                };

                                if (!isDragEnabled) {
                                    return visibleStrips.map(({ c, tasks }) => (
                                        <CharacterTaskStrip key={c.name} character={c} tasks={tasks} isDragEnabled={false} onEdit={withEditAuth(() => onEdit(c))} onReorder={withEditAuth((char: any, newOrder: any) => { if (selectedRaids.length === 0) onReorder(member.userId, char.name, newOrder); })} />
                                    ));
                                }

                                return (
                                    <DndContext sensors={charSensors} collisionDetection={closestCenter} onDragEnd={handleCharDragEnd}>
                                        <SortableContext items={subset} strategy={verticalListSortingStrategy}>
                                            <div className="flex flex-col gap-4">
                                                {visibleStrips.map(({ c, tasks }) => (
                                                    <SortableStripWrapper key={c.name} id={c.name}>
                                                        {(dragHandleProps: any) => (
                                                            <CharacterTaskStrip
                                                                character={c} tasks={tasks} isDragEnabled={true} dragHandleProps={dragHandleProps}
                                                                onEdit={withEditAuth(() => onEdit(c))}
                                                                onReorder={withEditAuth((char: any, newOrder: any) => { if (selectedRaids.length === 0) onReorder(member.userId, char.name, newOrder); })}
                                                            />
                                                        )}
                                                    </SortableStripWrapper>
                                                ))}
                                            </div>
                                        </SortableContext>
                                    </DndContext>
                                );
                            })()}
                        </div>
                    ) : (
                        tableRoster.length === 0 ? (
                            isRaidFilterActive ? null : (onlyRemain ? <div className="text-center py-10 text-gray-500">모든 숙제 완료!</div> : null)
                        ) : (
                            <TaskTable
                                key={`table-${isAllView ? 'all' : currentAccount?.id}`}
                                roster={tableRoster}
                                prefsByChar={tablePrefsByChar}
                                tableOrder={viewTableOrder}
                                rosterOrder={member.rosterOrder ?? []}
                                isDragEnabled={isDragEnabled}
                                onReorderTable={withEditAuth((newOrder: any) => { if (selectedRaids.length === 0 && !onlyRemain) onReorderTable(member.userId, newOrder); })}
                                onReorderRoster={withEditAuth((newOrderSubset: any) => {
                                    const subset = tableRoster.map((c) => c.name);
                                    const baseFull = (member.rosterOrder && member.rosterOrder.length > 0) ? member.rosterOrder : defaultSortedRoster.map((c) => c.name);
                                    const merged = mergeReorderedSubset(baseFull, subset, newOrderSubset);
                                    onReorderRoster(member.userId, merged);
                                })}
                                onToggleGate={withEditAuth((char: any, raid: any, gate: any, cur: any, all: any) => onToggleGate(char, raid, gate, cur, all))}
                                onEdit={withEditAuth((c: any) => onEdit(c))}
                            />
                        )
                    )}
                </div>
            )}

            {showPermissionError && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
                    <div className="w-full max-w-sm p-6 text-center bg-[#1E2028] border border-white/10 rounded-2xl">
                        <AlertTriangle className="h-7 w-7 text-red-500 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-white mb-2">수정 권한 없음</h3>
                        <p className="text-sm text-gray-400 mb-6">해당 파티원이 숙제 수정을 허용하지 않았습니다.</p>
                        <button onClick={() => setShowPermissionError(false)} className="w-full py-3 rounded-xl bg-white/10 text-white font-bold">확인</button>
                    </div>
                </div>
            )}
        </div>
    );
}

function PartyMemberSummaryBar({ member, summary, children }: any) {
    const memberAllCleared = summary.totalRemainingGold === 0 && summary.totalGold > 0;
    return (
        <div className="relative rounded-md py-2 flex flex-col sm:flex-row sm:items-center w-full">
            <div className="flex items-center justify-between w-full sm:w-auto">
                <div className="flex items-center gap-3">
                    <MemberAvatar member={{ id: member.userId, name: member.name, image: member.image, role: "member" }} className="h-8 w-8 sm:h-8 sm:w-8 rounded-full " />
                    <span className="text-lg sm:text-base md:text-xl font-bold sm:font-semibold text-white truncate">{member.name || "이름 없음"}</span>
                </div>
                <div className="flex sm:hidden items-center gap-1">{children}</div>
            </div>
            <div className="mt-3 sm:mt-0 sm:ml-4 flex items-center gap-4 text-sm sm:text-base min-w-0">
                <span className="hidden sm:inline h-4 w-px bg-white/10 " />
                <div className="flex items-baseline gap-1.5">
                    <span className="font-semibold text-sm sm:text-base pr-1">남은 숙제</span>
                    <AnimatedNumber value={summary.totalRemainingTasks} className="text-gray-400 text-xs sm:text-sm font-semibold" />
                </div>
                <span className="hidden sm:inline h-4 w-px bg-white/10 " />
                <div className="flex items-baseline gap-1.5">
                    <span className="font-semibold text-sm sm:text-base pr-1">남은 골드</span>
                    <div className={`inline-flex items-baseline justify-end min-w-[50px] text-xs sm:text-sm font-semibold font-mono tabular-nums ${memberAllCleared ? "line-through decoration-gray-300 decoration-1 text-gray-400" : "text-gray-400"}`}>
                        <AnimatedNumber value={memberAllCleared ? summary.totalGold : summary.totalRemainingGold} />
                        <span className="ml-0.5 text-[0.75em]">g</span>
                    </div>
                </div>
            </div>
            <div className="hidden sm:flex ml-auto items-center gap-2">{children}</div>
        </div>
    );
}

function PartyMemberActions({ onAutoSetup, onGateAllClear, onOpenCharSetting, onRefreshAccount, isExpanded, onToggleExpand, isAllView }: any) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [showAutoSetupSettings, setShowAutoSetupSettings] = useState(false);
    const [autoSetupConfirmOpen, setAutoSetupConfirmOpen] = useState(false);
    const [showAllViewWarning, setShowAllViewWarning] = useState(false);

    const [autoSetupCharCount, setAutoSetupCharCount] = useState<number>(() => {
        if (typeof window === "undefined") return 6;
        try { return localStorage.getItem("raidTaskAutoSetupCount") ? Number(localStorage.getItem("raidTaskAutoSetupCount")) : 6; } catch { return 6; }
    });

    useEffect(() => { try { localStorage.setItem("raidTaskAutoSetupCount", String(autoSetupCharCount)); } catch { } }, [autoSetupCharCount]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
                setShowAutoSetupSettings(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleRefreshClick = async () => {
        if (!onRefreshAccount) return;
        try { setIsRefreshing(true); await onRefreshAccount(); } finally { setIsRefreshing(false); }
    };

    return (
        <div className="flex items-center gap-1 sm:gap-2" ref={menuRef}>
            <div className="relative">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        if (isAllView) { setShowAllViewWarning(true); return; }
                        handleRefreshClick();
                    }}
                    disabled={isRefreshing}
                    className={`p-2 rounded-lg transition-colors ${isRefreshing ? "text-indigo-400 cursor-not-allowed" : isAllView ? "text-gray-600 opacity-50 cursor-pointer" : "text-gray-400 hover:text-white hover:bg-white/5"}`}
                >
                    <RefreshCcw className={`w-5 h-5 ${isRefreshing ? "animate-spin" : ""}`} />
                </button>

                <button onClick={() => setIsMenuOpen(!isMenuOpen)} className={`p-2 rounded-lg transition-colors ${isMenuOpen ? "bg-white/10 text-white" : "text-gray-400 hover:text-white hover:bg-white/5"}`}>
                    <MoreVertical className="w-5 h-5" />
                </button>

                {isMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-52 z-50 rounded-xl bg-[#1E2028] border border-white/10 shadow-xl overflow-visible">
                        <div className="relative">
                            <div className="relative group">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (isAllView) { setShowAllViewWarning(true); setIsMenuOpen(false); return; }
                                        setAutoSetupConfirmOpen(true);
                                        setIsMenuOpen(false);
                                    }}
                                    className={`w-full h-14 text-left px-4 flex items-center gap-3 transition-colors rounded-t-xl ${isAllView ? 'opacity-40 cursor-pointer' : 'hover:bg-white/5'}`}
                                >
                                    <div className={`p-1.5 rounded-lg ${isAllView ? 'bg-gray-500/10 text-gray-400' : 'bg-indigo-500/10 text-indigo-400'}`}><Wand2 className="w-4 h-4" /></div>
                                    <div className="flex flex-col justify-center">
                                        <span className={`block text-sm font-medium ${isAllView ? 'text-gray-500' : 'text-gray-200'}`}>자동 세팅</span>
                                        <span className="block text-[10px] text-gray-500 mt-0.5">상위 {autoSetupCharCount}캐릭 세팅</span>
                                    </div>
                                </button>
                                {!isAllView && (
                                    <div onClick={(e) => { e.stopPropagation(); setShowAutoSetupSettings(!showAutoSetupSettings); }} className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/10 cursor-pointer z-[60]"><Settings className="w-3 h-3" /></div>
                                )}
                                {showAutoSetupSettings && (
                                    <div className="absolute top-[80%] right-2 mt-2 w-56 p-4 rounded-xl bg-[#1E2028] border border-white/10 z-[100]">
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="text-xs font-bold text-white">자동 세팅 설정</h4>
                                            <button onClick={(e) => { e.stopPropagation(); setShowAutoSetupSettings(false); }} className="text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>
                                        </div>
                                        <div className="flex items-center justify-between gap-4 mb-4">
                                            <span className="text-[11px] text-gray-400">적용할 캐릭터 수</span>
                                            <input type="number" min={1} max={24} value={autoSetupCharCount} onChange={(e) => setAutoSetupCharCount(Number(e.target.value))} className="w-12 h-7 bg-[#0F1115] border border-white/10 rounded-md text-xs text-center text-white" />
                                        </div>
                                        <button onClick={(e) => { e.stopPropagation(); setAutoSetupConfirmOpen(true); setShowAutoSetupSettings(false); setIsMenuOpen(false); }} className="w-full py-2 bg-[#5B69FF] text-white text-[11px] font-bold rounded-lg">적용하기</button>
                                    </div>
                                )}
                            </div>

                            <button onClick={(e) => { e.stopPropagation(); onGateAllClear(); setIsMenuOpen(false); }} className="w-full h-14 text-left px-4 flex items-center gap-3 transition-colors hover:bg-white/5">
                                <div className="p-1.5 rounded-lg shrink-0 bg-red-500/10 text-red-400"><RefreshCcw className="w-4 h-4" /></div>
                                <div className="flex flex-col justify-center">
                                    <span className="block text-sm font-medium text-gray-200">관문 초기화</span>
                                    <span className="block text-[10px] text-gray-500 mt-0.5">모든 체크 해제</span>
                                </div>
                            </button>

                            <button onClick={(e) => { e.stopPropagation(); if (isAllView) { setShowAllViewWarning(true); setIsMenuOpen(false); return; } onOpenCharSetting(); setIsMenuOpen(false); }} className={`w-full h-14 text-left px-4 flex items-center gap-3 transition-colors rounded-b-xl ${isAllView ? 'opacity-40 cursor-pointer' : 'hover:bg-white/5'}`}>
                                <div className={`p-1.5 rounded-lg shrink-0 ${isAllView ? 'bg-gray-700/30 text-gray-500' : 'bg-gray-700/50 text-gray-400'}`}><Settings className="w-4 h-4" /></div>
                                <span className={`text-sm font-medium ${isAllView ? 'text-gray-500' : 'text-gray-300'}`}>캐릭터 설정</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <button onClick={onToggleExpand} className="hover:bg-white/5 p-2 rounded-md bg-white/[.04] border border-white/10 text-gray-400">
                {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </button>

            {autoSetupConfirmOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-4">
                    <div className="w-full max-w-sm p-6 text-center bg-[#1E2028] border border-white/10 rounded-2xl">
                        <AlertTriangle className="h-7 w-7 text-yellow-500 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-white mb-2">자동 세팅을 진행하시겠습니까?</h3>
                        <p className="text-sm text-gray-400 mb-6">모두 초기화되고 새로 덮어씌워집니다.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setAutoSetupConfirmOpen(false)} className="flex-1 py-3 rounded-xl bg-white/5 text-gray-300">취소</button>
                            <button onClick={() => { onAutoSetup(autoSetupCharCount); setAutoSetupConfirmOpen(false); }} className="flex-1 py-3 rounded-xl bg-[#5B69FF] text-white">적용하기</button>
                        </div>
                    </div>
                </div>
            )}

            {showAllViewWarning && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-4">
                    <div className="w-full max-w-sm p-6 text-center bg-[#1E2028] border border-white/10 rounded-2xl">
                        <AlertTriangle className="h-7 w-7 text-red-500 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-white mb-2">기능 사용 불가</h3>
                        <p className="text-sm text-gray-400 mb-6">'모두 보기' 상태에서는 데이터 꼬임을 방지하기 위해 해당 기능을 이용할 수 없습니다.</p>
                        <button onClick={() => setShowAllViewWarning(false)} className="w-full py-3 rounded-xl bg-white/10 text-white font-bold">확인</button>
                    </div>
                </div>
            )}
        </div>
    );
}

function MemberAvatar({ member, className }: any) {
    return (
        <div className={`group/avatar relative flex items-center justify-center overflow-hidden ${className}`}>
            {member.image ? (
                <img src={member.image} alt={member.name || ""} className="h-full w-full rounded-full object-cover bg-gray-800" />
            ) : (
                <div className="flex h-full w-full items-center justify-center rounded-full bg-gray-700 text-[10px] text-gray-200">
                    {(member.name || "?").slice(0, 2)}
                </div>
            )}
        </div>
    );
}