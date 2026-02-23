// src/app/party-tasks/demo/page.tsx
"use client";

import {
    useEffect,
    useState,
    useRef,
    useCallback,
    type ReactNode,
} from "react";
// 데모 페이지이므로 실제 인증을 제거합니다.
// import { useSession, signIn } from "next-auth/react";
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

/* ─────────────────────────────
 * 데모용 Mock Data (가짜 데이터)
 * ───────────────────────────── */
const MOCK_MY_USER_ID = "demo-user-me";
const MOCK_OTHER_USER_ID_A = "demo-user-other-a";
const MOCK_OTHER_USER_ID_B = "demo-user-other-b";
const MOCK_PARTY_ID = 9999;

// 🔥 class 오류 해결 (as unknown as RosterCharacter[] 사용)
const MOCK_ROSTER_ME = [
    { name: "데모캐릭_본캐", itemLevel: "1630.00", itemLevelNum: 1630, serverName: "루페온" },
    { name: "데모캐릭_부캐1", itemLevel: "1610.00", itemLevelNum: 1610, serverName: "루페온" },
    { name: "데모캐릭_부캐2", itemLevel: "1600.00", itemLevelNum: 1600, serverName: "루페온" },
] as unknown as RosterCharacter[];

const MOCK_ROSTER_OTHER_A = [
    { name: "파티원A_본캐", itemLevel: "1620.00", itemLevelNum: 1620, serverName: "실리안" },
    { name: "파티원A_부캐", itemLevel: "1580.00", itemLevelNum: 1580, serverName: "실리안" },
] as unknown as RosterCharacter[];

const MOCK_ROSTER_OTHER_B = [
    { name: "파티원B_본캐", itemLevel: "1640.00", itemLevelNum: 1640, serverName: "카마인" },
    { name: "파티원B_부캐", itemLevel: "1600.00", itemLevelNum: 1600, serverName: "카마인" },
] as unknown as RosterCharacter[];

const MOCK_PREFS_ME: Record<string, CharacterTaskPrefs> = {
    "데모캐릭_본캐": {
        raids: {
            "카멘": { enabled: true, difficulty: "하드" as any, gates: [1] }, // 1관문 완료 상태
            "에키드나": { enabled: true, difficulty: "노말" as any, gates: [] },
            "일리아칸": { enabled: true, difficulty: "하드" as any, gates: [] },
        },
        order: ["카멘", "에키드나", "일리아칸"],
    },
    "데모캐릭_부캐1": {
        raids: {
            "카멘": { enabled: true, difficulty: "하드" as any, gates: [1] }, // 1관문 완료 상태
            "상아탑": { enabled: true, difficulty: "노말" as any, gates: [] },
            "일리아칸": { enabled: true, difficulty: "하드" as any, gates: [] },
        },
        order: ["카멘", "에키드나", "일리아칸"],
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
        canOthersEdit: true,
    },
];

/* ─────────────────────────────
 * 타입 정의 (기존과 동일)
 * ───────────────────────────── */
type PartyMember = { id: string; name: string | null; image: string | null; role: string; };
type PartyDetail = { id: number; name: string; memo: string | null; ownerId: string; createdAt: string; myRole: string; members: PartyMember[]; raidCount: number; nextResetAt: string | null; raidState?: RaidStateFromServer; };
type PartyMemberTasks = { userId: string; name: string | null; image: string | null; nickname: string; summary: CharacterSummary | null; prefsByChar: Record<string, CharacterTaskPrefs>; visibleByChar: Record<string, boolean>; tableOrder?: string[]; canOthersEdit?: boolean; };
type PartyInvite = { code: string; url?: string; expiresAt?: string | null; };
type SavedFilters = { onlyRemain?: boolean; isCardView?: boolean; tableView?: boolean; columnOrder?: string[]; selectedRaids?: string[]; };

// 🔥 isSelected 오류 해결 (boolean으로 명시)
type SavedAccount = { id: string; nickname: string; summary: CharacterSummary; isPrimary?: boolean; isSelected: boolean; };
type RaidStateFromServer = { accounts?: SavedAccount[]; activeAccountId?: string | null; activeAccountByParty?: Record<string, string | null>; prefsByChar?: Record<string, CharacterTaskPrefs>; visibleByChar?: Record<string, boolean>; filters?: SavedFilters; };

const PARTY_FILTER_KEY = (partyId: number | string) => `partyTaskFilters:${partyId}`;

/* ─────────────────────────────
 * 공통 함수 (기존과 동일)
 * ───────────────────────────── */
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
            return sum + (g?.gold ?? 0);
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
    const [orderTick, setOrderTick] = useState(0);

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
    const [isAccountListOpen, setIsAccountListOpen] = useState(false);
    const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
    const [inlineSearchInput, setInlineSearchInput] = useState("");
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

    const currentAccount = accounts.find((a) => a.isSelected) ?? accounts.find((a) => a.isPrimary) ?? accounts[0] ?? null;

    // ─────────────────────────────────────────────────────────────────
    // Mock API Functions (서버 통신 제거 및 로컬 상태 반영)
    // ─────────────────────────────────────────────────────────────────
    const reloadPartyTasks = useCallback(async (showSpinner: boolean) => {
        if (showSpinner) setTasksLoading(true);
        setTasksErr(null);
        setTimeout(() => {
            setPartyTasks([...MOCK_PARTY_TASKS]); // Mock 데이터 로드
            if (showSpinner) setTasksLoading(false);
        }, 800);
    }, []);

    async function saveRaidState() { console.log("Mock: saveRaidState"); }
    async function saveActiveAccountToServer() { console.log("Mock: saveActiveAccountToServer"); }
    function sendMemberUpdateWS() { console.log("Mock: WS Update Sent"); }
    async function saveMemberPrefsToServer() { console.log("Mock: saveMemberPrefsToServer"); }

    const handleSelectAccount = (accountId: string) => {
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
                        { name: trimmed, itemLevel: "1640.00", itemLevelNum: 1640, serverName: "카마인" },
                        { name: `${trimmed}부캐`, itemLevel: "1580.00", itemLevelNum: 1580, serverName: "카마인" }
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

                // 검색된 정보를 현재 내 Task에 반영 (데모용)
                setPartyTasks(prev => {
                    if (!prev) return prev;
                    return prev.map(m => m.userId === myUserId ? { ...m, summary: fakeSummary, nickname: trimmed } : m);
                });

                setAccountSearchLoading(false);
                resolve(true);
            }, 1000); // 1초 대기 (로딩 체감용)
        });
    };

    // 모달 및 기본 액션 핸들러들
    const handleInlineSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        const success = await handleCharacterSearch(inlineSearchInput);
        if (success) setInlineSearchInput("");
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

    // 로컬 상태만 업데이트 하도록 수정
    const handleMemberChangeVisible = (memberUserId: string, partialVisibleByChar: Record<string, boolean>) => {
        if (!partyTasks) return;
        setPartyTasks(prev => prev!.map((m) => {
            if (m.userId !== memberUserId) return m;
            return { ...m, visibleByChar: { ...(m.visibleByChar ?? {}), ...partialVisibleByChar } };
        }));
    };

    const handleMyDeleteAccount = async () => {
        if (!currentAccount) return;
        setCharSettingOpen(false);
        const filtered = accounts.filter((a) => a.id !== currentAccount.id);
        setAccounts(filtered.map((a, i) => ({ ...a, isSelected: i === 0, isPrimary: i === 0 })));
    };

    const handleMyRefreshAccount = async () => {
        if (!currentAccount) return;
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

    const handleMemberAutoSetup = (memberUserId: string, isMe: boolean) => {
        if (!partyTasks) return;
        setPartyTasks(prev => prev!.map((m) => {
            if (m.userId !== memberUserId) return m;
            let roster = m.summary?.roster ?? [];
            if (isMe && currentAccount?.summary?.roster) roster = currentAccount.summary.roster;
            if (!roster.length) return m;

            const { nextPrefsByChar, nextVisibleByChar } = buildAutoSetupForRoster(roster, m.prefsByChar ?? {});

            const nextVisibleMerged: Record<string, boolean> = { ...(m.visibleByChar ?? {}) };
            for (const c of roster) { nextVisibleMerged[c.name] = nextVisibleByChar[c.name] ?? false; }

            return {
                ...m,
                prefsByChar: { ...(m.prefsByChar ?? {}), ...nextPrefsByChar },
                visibleByChar: nextVisibleMerged,
            };
        }));
    };

    const handleMemberReorder = (memberUserId: string, charName: string, newOrderIds: string[]) => {
        if (!partyTasks) return;
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

    const handleMemberTableReorder = (memberUserId: string, newOrder: string[]) => {
        if (!partyTasks) return;
        setPartyTasks(prev => prev!.map(m => m.userId === memberUserId ? { ...m, tableOrder: newOrder } : m));
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
        }, 1000); // 파티 정보 로딩 체감
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
                <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 py-1 sm:py-2 px-4 sm:px-0">
                    <div className="flex items-center gap-2 sm:gap-5 min-w-0">
                        <button
                            type="button"
                            onClick={() => router.push("/party-tasks")}
                            className="flex h-8 w-8 items-center justify-center rounded-full  text-gray-300 hover:bg-white/5 hover:text-white"
                            aria-label="파티 목록으로 돌아가기"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </button>
                        <div className="flex items-center gap-2 sm:gap-1 min-w-0">
                            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight truncate break-keep">
                                {party.name}
                            </h1>
                            <button
                                type="button"
                                onClick={() => setPartySettingOpen(true)}
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-300 hover:bg-white/5 hover:text-white"
                                aria-label="파티 설정 열기"
                            >
                                <Settings className="h-5 w-5" />
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3">
                        <button
                            type="button"
                            onClick={openInviteModal}
                            className="inline-flex items-center gap-1.5 rounded-full bg-[#5B69FF]/80 px-3 py-1.5 text-[11px] sm:text-xs font-medium text-white hover:bg-[#4a57e0]"
                        >
                            <Link2 className="h-3.5 w-3.5" />
                            <span>파티 코드 생성</span>
                        </button>
                    </div>
                </div>




                <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,210px)_minmax(0,1fr)] gap-5 lg:items-start">
                    <div className="space-y-4">
                        <TaskSidebar
                            accounts={accounts}
                            activeAccountId={currentAccount?.id ?? null}
                            onSelectAccount={handleSelectAccount}
                            onAddAccount={() => setIsAddAccountOpen(true)}
                            onlyRemain={onlyRemain}
                            setOnlyRemain={setOnlyRemain}
                            isCardView={isCardView}
                            setIsCardView={setIsCardView}
                            selectedRaids={selectedRaids}
                            setSelectedRaids={setSelectedRaids}
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:gap-5">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                            {/* 1. 실시간 숙제 체크 */}
                            <div className="flex flex-col gap-2 p-4 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] transition-colors">
                                <div className="font-semibold text-sm text-gray-200 flex items-center gap-1.5">
                                    <span className="text-[#5B69FF]">1.</span> 실시간 숙제 체크
                                </div>
                                <div className="text-[12px] text-gray-400 leading-relaxed break-keep">
                                    캐릭터별 <strong className="text-gray-300">레이드 관문</strong>을 클릭해보세요. 골드 수입과 남은 숙제 수가 실시간으로 계산됩니다.
                                </div>
                            </div>

                            {/* 2. 수정 권한 테스트 */}
                            <div className="flex flex-col gap-2 p-4 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] transition-colors">
                                <div className="font-semibold text-sm text-gray-200 flex items-center gap-1.5">
                                    <span className="text-[#5B69FF]">2.</span> 수정 권한 테스트
                                </div>
                                <div className="text-[12px] text-gray-400 leading-relaxed break-keep">
                                    파티원A는 <strong className="text-red-400/80">수정 불가</strong>, 파티원B는 <strong className="text-emerald-400/80">수정 가능</strong> 상태입니다. 각기 다른 반응을 확인해보세요.
                                </div>
                            </div>

                            {/* 3. 계정 연동 체험 */}
                            <div className="flex flex-col gap-2 p-4 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] transition-colors">
                                <div className="font-semibold text-sm text-gray-200 flex items-center gap-1.5">
                                    <span className="text-[#5B69FF]">3.</span> 계정 연동 체험
                                </div>
                                <div className="text-[12px] text-gray-400 leading-relaxed break-keep">
                                    왼쪽 <strong className="text-gray-300">계정 추가</strong> 버튼을 눌러 아무 닉네임이나 입력해보세요. 테스트 원정대 데이터를 즉시 불러옵니다.
                                </div>
                            </div>

                            {/* 4. 스마트 필터링 */}
                            <div className="flex flex-col gap-2 p-4 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] transition-colors">
                                <div className="font-semibold text-sm text-gray-200 flex items-center gap-1.5">
                                    <span className="text-[#5B69FF]">4.</span> 필터링
                                </div>
                                <div className="text-[12px] text-gray-400 leading-relaxed break-keep">
                                    사이드바의 <strong className="text-gray-300">레이드 필터</strong>를 사용하여 특정 레이드만 모아보거나, 완료된 숙제를 숨겨 효율적으로 관리하세요.
                                </div>
                            </div>

                            {/* 5. 캐릭터 설정 및 숨김 */}
                            <div className="flex flex-col gap-2 p-4 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] transition-colors">
                                <div className="font-semibold text-sm text-gray-200 flex items-center gap-1.5">
                                    <span className="text-[#5B69FF]">5.</span> 캐릭터 설정 및 레이드 설정
                                </div>
                                <div className="text-[12px] text-gray-400 leading-relaxed break-keep">
                                    메뉴의 <strong className="text-gray-300">캐릭터 설정</strong>에서 파티창에 노출할 캐릭터를 선택하고, 드래그하여 레이드 순서를 자유롭게 변경하세요.
                                </div>
                            </div>

                            {/* 6. 원정대 업데이트 */}
                            <div className="flex flex-col gap-2 p-4 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] transition-colors">
                                <div className="font-semibold text-sm text-gray-200 flex items-center gap-1.5">
                                    <span className="text-[#5B69FF]">6.</span> 캐릭터 업데이트
                                </div>
                                <div className="text-[12px] text-gray-400 leading-relaxed break-keep">
                                    아이템 레벨이나 캐릭터명이 바뀌었다면 <strong className="text-gray-300">새로고침</strong> 아이콘을 눌러 실시간 전투정보실 데이터를 다시 가져옵니다.
                                </div>
                            </div>
                        </div>
                        {tasksLoading && (
                            <div className="w-full py-6">
                                <div className="animate-pulse space-y-3">
                                    <div className="h-4 w-40 rounded bg-white/5" />
                                    <div className="space-y-2">
                                        {Array.from({ length: 3 }).map((_, i) => (
                                            <div key={i} className="flex items-center gap-3 rounded-none sm:rounded-xl border-x-0 sm:border border-white/5 bg-[#16181D] p-4">
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
                                    let filteredTableOrder = m.tableOrder;
                                    if (selectedRaids.length > 0 && Array.isArray(m.tableOrder)) {
                                        filteredTableOrder = m.tableOrder.filter(raidId => selectedRaids.includes(raidId));
                                    }

                                    return (
                                        <PartyMemberBlock
                                            key={m.userId}
                                            partyId={party.id}
                                            member={{ ...m, prefsByChar: filteredPrefs, tableOrder: filteredTableOrder }}
                                            selectedRaids={selectedRaids}
                                            isMe={myUserId === m.userId}
                                            currentAccount={currentAccount}
                                            onReorderTable={handleMemberTableReorder}
                                            onlyRemain={onlyRemain}
                                            isCardView={isCardView}
                                            onAutoSetup={(isMe: boolean) => handleMemberAutoSetup(m.userId, isMe)}
                                            onGateAllClear={() => handleMemberGateAllClear(m.userId)}
                                            onOpenCharSetting={() => openMemberCharSetting(m)}
                                            onRefreshAccount={myUserId === m.userId ? handleMyRefreshAccount : () => handleMemberRefreshAccount(m.userId)}
                                            onToggleGate={handleMemberToggleGate}
                                            onEdit={openEditModal}
                                            onReorder={handleMemberReorder}
                                            onSearch={handleCharacterSearch}
                                            searchLoading={accountSearchLoading}
                                            searchError={accountSearchErr}
                                        />
                                    );
                                })}
                            </div>
                        )}

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
                                    onDeleteAccount={isMeTarget ? () => setDeleteConfirmOpen(true) : undefined}
                                    onRefreshAccount={isMeTarget ? handleMyRefreshAccount : () => handleMemberRefreshAccount(charSettingTarget.memberUserId)}
                                />
                            );
                        })()}
                    </div>
                </div>
            </div>

            {/* 나머지 모달 컴포넌트들 (설정, 초대, 공유, 계정삭제) 유지 */}
            {partySettingOpen && (
                <PartySettingsModal
                    open={partySettingOpen}
                    onClose={() => setPartySettingOpen(false)}
                    party={party}
                    myUserId={myUserId}
                    myRemainingRaids={myRemainingRaids}
                    onPartyUpdated={handlePartyUpdated}
                    onMemberKicked={handlePartyMemberKicked}
                    onLocalOrderChange={() => setOrderTick(t => t + 1)}
                />
            )}

            {inviteOpen && (
                <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-md overflow-hidden rounded-2xl bg-[#1E2028] border border-white/10 shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="relative flex items-center justify-between bg-[#252832] px-5 py-4 border-b border-white/5">
                            <div className="flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-[#5B69FF]" />
                                <h2 className="text-base sm:text-lg font-bold text-white">파티 초대</h2>
                            </div>
                            <button onClick={() => setInviteOpen(false)} className="rounded-full p-1 text-gray-400 hover:bg-white/5 hover:text-white transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="px-5 py-6 space-y-5 text-sm">
                            <p className="text-gray-300 leading-relaxed">아래 초대 링크를 파티원에게 공유하세요.<br />링크를 통해 파티의 숙제 페이지로 바로 접속할 수 있습니다.</p>
                            {inviteLoading && (
                                <div className="flex items-center justify-center gap-3 py-8 text-gray-400 bg-black/20 rounded-xl">
                                    <Loader2 className="h-5 w-5 animate-spin text-[#5B69FF]" />
                                    <span>초대 코드를 생성하는 중입니다...</span>
                                </div>
                            )}
                            {!inviteLoading && invite && (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-gray-400 ml-1">초대 링크</label>
                                        <div className="flex items-center gap-2 p-2 rounded-xl bg-black/30 border border-white/10">
                                            <div className="flex-1 flex items-center gap-2 min-w-0 px-2">
                                                <Link2 className="h-4 w-4 text-[#5B69FF] shrink-0" />
                                                <span className="truncate text-sm text-gray-100 font-medium">{invite.url}</span>
                                            </div>
                                            <button onClick={handleCopyInvite} className={`shrink-0 inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${inviteCopied ? "bg-[#5B69FF] text-white" : "bg-white/10 text-gray-200 hover:bg-white/15 hover:text-white"}`}>
                                                {inviteCopied ? <><Check className="h-3.5 w-3.5" strokeWidth={3} />복사됨</> : <><Copy className="h-3.5 w-3.5" />복사</>}
                                            </button>
                                        </div>
                                    </div>
                                    <button onClick={handleSmartShare} className="w-full mt-3 flex items-center justify-center gap-2 rounded-xl bg-[#5865F2] p-3 text-white hover:bg-[#4752C4] transition-colors shadow-lg shadow-[#5865F2]/20">
                                        Discord로 보내기
                                    </button>
                                    <div className="flex items-center justify-between text-xs text-gray-400 bg-white/5 px-3 py-2 rounded-lg">
                                        <span className="flex items-center gap-1.5"><span>초대 코드:</span><span className="font-mono text-sm font-bold text-[#5B69FF]">{invite.code}</span></span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

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
        </div>
    );
}

// ==============================================================================
// 하위 컴포넌트들 (PartyMemberBlock, PartyMemberSummaryBar 등)은 기존과 100% 동일하게 유지합니다.
// ==============================================================================

function PartyMemberBlock({
    partyId,
    onReorderTable,
    member,
    isMe,
    currentAccount,
    onlyRemain,
    isCardView,
    onAutoSetup,
    onGateAllClear,
    onOpenCharSetting,
    onToggleGate,
    onEdit,
    onReorder,
    onSearch,
    searchLoading,
    searchError,
    onRefreshAccount,
    selectedRaids,
}: any) {
    const [isExpanded, setIsExpanded] = useState(true);
    const [searchInput, setSearchInput] = useState("");
    const [showPermissionError, setShowPermissionError] = useState(false);

    const canEdit = isMe || member.canOthersEdit === true;
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

    const handleLocalSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canEdit) { setShowPermissionError(true); return; }
        if (onSearch && searchInput.trim()) await onSearch(searchInput);
    };

    const baseSummary = isMe && currentAccount?.summary ? currentAccount.summary : member.summary;
    const visibleRoster = baseSummary?.roster?.filter((c: any) => member.visibleByChar?.[c.name] ?? true) ?? [];
    const sortedRoster = [...visibleRoster].sort((a: any, b: any) => (b.itemLevelNum ?? 0) - (a.itemLevelNum ?? 0));
    const memberSummary = computeMemberSummary({ ...member, summary: baseSummary });
    const isRaidFilterActive = selectedRaids.length > 0;

    const rosterForView = isRaidFilterActive
        ? sortedRoster.filter((c: any) => {
            const prefs = member.prefsByChar?.[c.name];
            const raids = prefs?.raids ?? {};
            return Object.values(raids).some((p: any) => p?.enabled);
        })
        : sortedRoster;

    if (visibleRoster.length === 0) {
        return (
            <div className="rounded-none sm:rounded-xl border-x-0 sm:border border-white/10 bg-[#16181D] overflow-hidden relative">
                <div className="flex items-center gap-3 px-4 py-5 ">
                    <MemberAvatar member={{ id: member.userId, name: member.name, image: member.image, role: "member" }} className="h-8 w-8 rounded-full border border-black/50" />
                    <span className="font-semibold text-xl text-gray-200">{member.name || "이름 없음"}</span>
                </div>
                <div className="px-4 pb-4">
                    {isMe ? (
                        <div className="w-full py-10 sm:py-16 px-4 sm:px-6 flex flex-col items-center justify-center text-center bg-[#16181D] border-x-0 sm:border-x-2 border-y-2 sm:border-y-2 border-dashed border-white/10 rounded-none sm:rounded-xl">
                            <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 sm:mb-3">원정대 캐릭터를 불러오세요</h2>
                            <form onSubmit={handleLocalSearch} className="relative flex items-center w-full max-w-md">
                                <input type="text" placeholder="캐릭터 닉네임 입력 (아무거나 입력해보세요)" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} disabled={searchLoading} className="w-full h-11 sm:h-12 pl-4 pr-11 sm:pr-12 rounded-lg bg-[#0F1115] border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[#5B69FF] transition-all" />
                                <button type="submit" disabled={searchLoading || !searchInput.trim()} className="absolute right-1.5 px-3 py-2 rounded-md bg-[#5B69FF] text-white hover:bg-[#4A57E6] disabled:bg-gray-700 disabled:text-gray-400 transition-colors text-xs sm:text-sm">
                                    {searchLoading ? <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "검색"}
                                </button>
                            </form>
                        </div>
                    ) : (
                        <div className="w-full py-10 sm:py-16 px-4 sm:px-6 flex flex-col items-center justify-center text-center bg-[#16181D] border-x-0 sm:border-x-2 border-y-2 sm:border-y-2 border-dashed border-white/10 rounded-none sm:rounded-xl">
                            <UsersRound className="w-8 h-8 sm:w-9 sm:h-9 text-[#5B69FF]" strokeWidth={1.5} />
                            <h2 className="text-xl sm:text-2xl font-bold text-white/90 mb-2 sm:mb-3 mt-4">캐릭터 정보가 없습니다</h2>
                        </div>
                    )}
                </div>
                {showPermissionError && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
                        <div className="w-full max-w-sm p-6 text-center bg-[#1E2028] border border-white/10 rounded-2xl">
                            <AlertTriangle className="h-7 w-7 text-red-500 mx-auto mb-4" />
                            <h3 className="text-lg font-bold text-white mb-2">수정 권한 없음</h3>
                            <button onClick={() => setShowPermissionError(false)} className="w-full py-3 mt-4 rounded-xl bg-white/10 text-white font-bold">확인</button>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 gap-4 sm:gap-1 rounded-none sm:rounded-lg border-x-0 sm:border border-y sm:border-y border-white/10 px-3 sm:px-4 py-3 sm:py-4 relative">
            <PartyMemberSummaryBar member={member} summary={memberSummary}>
                <PartyMemberActions
                    onAutoSetup={withEditAuth(() => onAutoSetup(isMe))}
                    onGateAllClear={withEditAuth(onGateAllClear)}
                    onOpenCharSetting={withEditAuth(onOpenCharSetting)}
                    onRefreshAccount={withEditAuth(async () => { await onRefreshAccount(); })}
                    isExpanded={isExpanded}
                    onToggleExpand={handleToggleExpand}
                />
            </PartyMemberSummaryBar>

            {isExpanded && (
                <div className="mt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    {isCardView ? (
                        <div className="flex flex-col gap-4">
                            {rosterForView.map((c: any) => {
                                const toggleWrapper = withEditAuth((rName: string, gate: number, curG: number[], allG: number[]) => onToggleGate(member.userId, c.name, rName, gate, curG, allG));
                                const tasksShown = buildTasksForCharacter(c, member.prefsByChar, { onlyRemain, onToggleGate: toggleWrapper });
                                if (onlyRemain && tasksShown.length === 0) return null;
                                return (
                                    <CharacterTaskStrip
                                        key={c.name}
                                        character={c}
                                        tasks={tasksShown}
                                        onEdit={withEditAuth(() => onEdit(member, c))}
                                        onReorder={withEditAuth((char: any, newOrder: any) => { if (selectedRaids.length === 0) onReorder(member.userId, char.name, newOrder); })}
                                    />
                                );
                            })}
                        </div>
                    ) : (
                        <TaskTable
                            roster={rosterForView}
                            prefsByChar={member.prefsByChar}
                            tableOrder={member.tableOrder}
                            onReorderTable={withEditAuth((newOrder: any) => { if (selectedRaids.length === 0) onReorderTable(member.userId, newOrder); })}
                            onToggleGate={withEditAuth((char: any, raid: any, gate: any, cur: any, all: any) => onToggleGate(member.userId, char, raid, gate, cur, all))}
                            onEdit={withEditAuth((c: any) => onEdit(member, c))}
                        />
                    )}
                </div>
            )}

            {showPermissionError && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-[#1E2028] border border-white/10 shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-6 text-center">
                            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 text-red-500">
                                <AlertTriangle className="h-7 w-7" />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">수정 권한 없음</h3>
                            <p className="text-sm text-gray-400 leading-relaxed mb-6 break-keep">해당 파티원이 타인의 숙제 수정을<br />허용하지 않았습니다.</p>
                            <button onClick={() => setShowPermissionError(false)} className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold transition-colors text-sm">확인</button>
                        </div>
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
                    <div className="flex flex-col">
                        <span className="text-lg sm:text-base md:text-xl font-bold sm:font-semibold text-white truncate max-w-[150px] sm:max-w-none">{member.name || "이름 없음"}</span>
                    </div>
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

function PartyMemberActions({ onAutoSetup, onGateAllClear, onOpenCharSetting, onRefreshAccount, isExpanded, onToggleExpand }: any) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    return (
        <div className="flex items-center gap-1 sm:gap-2 relative">
            <button onClick={async () => { setIsRefreshing(true); await onRefreshAccount(); setIsRefreshing(false); }} disabled={isRefreshing} className={`p-2 rounded-lg transition-colors ${isRefreshing ? "text-indigo-400" : "text-gray-400 hover:text-white hover:bg-white/5"}`}>
                <RefreshCcw className={`w-5 h-5 ${isRefreshing ? "animate-spin" : ""}`} />
            </button>
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
                <MoreVertical className="w-5 h-5" />
            </button>
            {isMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 z-50 rounded-xl bg-[#1E2028] border border-white/10 shadow-xl overflow-hidden">
                    <button onClick={() => { onAutoSetup(); setIsMenuOpen(false); }} className="w-full h-14 text-left px-4 hover:bg-white/5 flex items-center gap-3">
                        <Wand2 className="w-4 h-4 text-indigo-400" /> <span className="text-sm font-medium text-gray-200">자동 세팅</span>
                    </button>
                    <button onClick={() => { onGateAllClear(); setIsMenuOpen(false); }} className="w-full h-14 text-left px-4 hover:bg-white/5 flex items-center gap-3">
                        <RefreshCcw className="w-4 h-4 text-red-400" /> <span className="text-sm font-medium text-gray-200">관문 초기화</span>
                    </button>
                    <button onClick={() => { onOpenCharSetting(); setIsMenuOpen(false); }} className="w-full h-14 text-left px-4 hover:bg-white/5 flex items-center gap-3">
                        <Settings className="w-4 h-4 text-gray-400" /> <span className="text-sm font-medium text-gray-200">캐릭터 설정</span>
                    </button>
                </div>
            )}
            <button onClick={onToggleExpand} className="p-2 rounded-md bg-white/[.04] border border-white/10 text-gray-400 hover:text-white">
                {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </button>
        </div>
    );
}

function MemberAvatar({ member, className }: any) {
    return (
        <div className={`group/avatar relative flex items-center justify-center overflow-hidden ${className}`}>
            {member.image ? <img src={member.image} alt={member.name || ""} className="h-full w-full rounded-full object-cover bg-gray-800" /> : <div className="flex h-full w-full items-center justify-center rounded-full bg-gray-700 text-[10px] text-gray-200">{(member.name || "?").slice(0, 2)}</div>}
        </div>
    );
}