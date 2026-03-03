// src/app/party-tasks/[partyId]/page.tsx
"use client";

import {
    useEffect,
    useState,
    useRef,
    useCallback,
    type ReactNode,
    useMemo,
} from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
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
} from "../../components/tasks/CharacterTaskStrip";
import TaskCard from "../../components/tasks/TaskCard";
import TaskTable from "../../components/tasks/TaskTable";
import type {
    CharacterSummary,
    RosterCharacter,
} from "../../components/AddAccount";
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
import GoogleAd from "@/app/components/GoogleAd";
import TaskSidebar from "@/app/components/tasks/TaskSidebar";

import { useGlobalWebSocket } from "@/app/components/WebSocketProvider";
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { closestCenter, DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";

/* ─────────────────────────────
 * 타입 정의
 * ───────────────────────────── */

type PartyMember = {
    id: string;
    name: string | null;
    image: string | null;
    role: string;
};

type PartyDetail = {
    id: number;
    name: string;
    memo: string | null;
    ownerId: string;
    createdAt: string;
    myRole: string;
    members: PartyMember[];
    raidCount: number;
    nextResetAt: string | null;
    raidState?: RaidStateFromServer;
};

type PartyMemberTasks = {
    userId: string;
    name: string | null;
    image: string | null;
    nickname: string;
    summary: CharacterSummary | null;
    prefsByChar: Record<string, CharacterTaskPrefs>;
    visibleByChar: Record<string, boolean>;
    tableOrder?: string[];
    canOthersEdit?: boolean;
    rosterOrder?: string[];        // ✅ 테이블(행)용
    cardRosterOrder?: string[];    // ✅ 카드(캐릭터 카드)용 ← 추가
};

type PartyRaidTasksResponse = {
    members: PartyMemberTasks[];
};

type PartyInvite = {
    code: string;
    url?: string;
    expiresAt?: string | null;
};

type SavedFilters = {
    onlyRemain?: boolean;
    isCardView?: boolean;
    tableView?: boolean;
    columnOrder?: string[];
    selectedRaids?: string[];
    isDragEnabled?: boolean;
};

type SavedAccount = {
    id: string;
    nickname: string;
    summary: CharacterSummary;
    isPrimary?: boolean;
    isSelected?: boolean;
};

type RaidStateFromServer = {
    accounts?: SavedAccount[];
    activeAccountId?: string | null;
    activeAccountByParty?: Record<string, string | null>;
    prefsByChar?: Record<string, CharacterTaskPrefs>;
    visibleByChar?: Record<string, boolean>;
    filters?: SavedFilters;
};

const PARTY_FILTER_KEY = (partyId: number | string) =>
    `partyTaskFilters:${partyId}`;

const ACCOUNTS_KEY = "raidTaskAccounts";
const ACTIVE_ACCOUNT_KEY = "raidTaskActiveAccount";

/* ─────────────────────────────
 * 공통 함수
 * ───────────────────────────── */

function applyRosterOrder(
    roster: RosterCharacter[],
    rosterOrder?: string[]
): RosterCharacter[] {
    // roster는 “기본 정렬된 배열”이 들어온다고 가정(지금 코드: itemLevel 내림차순)
    if (!rosterOrder || rosterOrder.length === 0) return roster;

    const map = new Map(roster.map((c) => [c.name, c] as const));
    const out: RosterCharacter[] = [];
    const used = new Set<string>();

    // 저장된 순서대로 먼저 채움
    for (const name of rosterOrder) {
        const c = map.get(name);
        if (!c) continue;
        if (used.has(name)) continue;
        used.add(name);
        out.push(c);
    }

    // 새로 생긴 캐릭터/누락된 캐릭터는 기본정렬 순으로 뒤에 붙임
    for (const c of roster) {
        if (!used.has(c.name)) out.push(c);
    }

    return out;
}

function mergeReorderedSubset(
    full: string[],
    subset: string[],
    subsetNew: string[]
) {
    const subsetSet = new Set(subset);

    // full이 비었으면(처음) subset을 full로 취급
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

    // baseFull에 없던 항목이 subsetNew에 있으면 뒤에 추가
    for (; k < subsetNew.length; k++) {
        if (!result.includes(subsetNew[k])) result.push(subsetNew[k]);
    }

    return result;
}



function buildTasksForCharacter(
    c: RosterCharacter,
    prefsByChar: Record<string, CharacterTaskPrefs>,
    options?: {
        onlyRemain?: boolean;
        onToggleGate?: (
            raidName: string,
            gateIndex: number,
            currentGates: number[],
            allGates: number[]
        ) => void;
    }
): TaskItem[] {
    const prefs = prefsByChar[c.name];
    if (!prefs) return [];

    const baseRaidNames = prefs.order?.filter((r) => prefs.raids[r]) ?? Object.keys(prefs.raids);
    const raidNames = prefs.order
        ? baseRaidNames
        : [...baseRaidNames].sort((a, b) => getRaidBaseLevel(b) - getRaidBaseLevel(a));

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
                const lastGateIndex = gatesDef.reduce(
                    (max, g) => (g.index > max ? g.index : max),
                    gatesDef[0].index
                );
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

function computeMemberSummary(
    member: PartyMemberTasks & { summary: CharacterSummary | null }
): RaidSummary {
    const visibleRoster =
        member.summary?.roster?.filter(
            (c) => member.visibleByChar?.[c.name] ?? true
        ) ?? [];

    return computeRaidSummaryForRoster(visibleRoster, member.prefsByChar ?? {});
}

/* ─────────────────────────────
 * 메인 컴포넌트
 * ───────────────────────────── */
export default function PartyDetailPage() {
    const router = useRouter();
    const params = useParams<{ partyId: string }>();

    const partyId = Array.isArray(params.partyId) ? params.partyId[0] : params.partyId;

    const { data: session, status } = useSession();

    const myUserId =
        (session as any)?.user?.id ??
        (session as any)?.userId ??
        (session as any)?.user?.discordId ??
        null;
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
    const [isDragEnabled, setIsDragEnabled] = useState(false);
    const [orderTick, setOrderTick] = useState(0);

    const wsContext = useGlobalWebSocket();
    const ws = wsContext?.ws;
    const sendGlobalMessage = wsContext?.sendMessage;
    const joinRoom = wsContext?.joinRoom;
    const addPartyId = wsContext?.addPartyId;

    const [editOpen, setEditOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<{
        memberUserId: string;
        charName: string;
        character: RosterCharacter;
    } | null>(null);
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
    const [accounts, setAccounts] = useState<SavedAccount[]>([]);
    const [isAccountListOpen, setIsAccountListOpen] = useState(false);
    const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
    const [inlineSearchInput, setInlineSearchInput] = useState("");
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

    const AD_SLOT_SIDEBAR = "4444902536";
    const AD_SLOT_BOTTOM_BANNER = "7577482274"

    const currentAccount =
        accounts.find((a) => a.isSelected) ??
        accounts.find((a) => a.isPrimary) ??
        accounts[0] ??
        null;

    const reloadPartyTasks = useCallback(
        async (showSpinner: boolean) => {
            if (!party || status !== "authenticated") return;

            const partyIdNum = party.id;
            if (!partyIdNum) return;

            if (showSpinner) setTasksLoading(true);
            setTasksErr(null);

            try {
                const res = await fetch(
                    `/api/party-tasks/${partyIdNum}/raid-tasks`,
                    {
                        method: "GET",
                        headers: { "Content-Type": "application/json" },
                        cache: "no-store",
                    }
                );

                if (!res.ok) {
                    if (res.status === 204 || res.status === 404) {
                        setPartyTasks([]);
                        return;
                    }
                    throw new Error("파티 숙제 데이터를 불러오지 못했습니다.");
                }

                const json = (await res.json()) as PartyRaidTasksResponse;
                setPartyTasks(json.members ?? []);
            } catch (e: any) {
                setTasksErr(e?.message ?? "알 수 없는 오류가 발생했습니다.");
            } finally {
                if (showSpinner) setTasksLoading(false);
            }
        },
        [party, status]
    );

    type RaidStatePatch = Partial<RaidStateFromServer> & {
        deleteAccountId?: string;
    };

    async function saveRaidState(partial: RaidStatePatch) {
        try {
            await fetch("/api/raid-tasks/state", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(partial),
            });
        } catch (e) {
            console.error("raid_task_state 저장 실패 (네트워크 에러):", e);
        }
    }
    const handleMemberCardRosterReorder = (memberUserId: string, mergedCardOrder: string[]) => {
        if (!party || !partyTasks) return;
        const partyIdNum = party.id;

        const next: PartyMemberTasks[] = partyTasks.map((m) => {
            if (m.userId !== memberUserId) return m;
            return {
                ...m,
                cardRosterOrder: mergedCardOrder,
            };
        });

        setPartyTasks(next);

        const updated = next.find((m) => m.userId === memberUserId);
        if (updated) {
            sendMemberUpdateWS(
                partyIdNum,
                updated.userId,
                updated.prefsByChar,
                updated.visibleByChar,
                updated.tableOrder,
                updated.rosterOrder,
                updated.cardRosterOrder // ✅ 여기로 카드 순서 전달
            );

            void saveMemberPrefsToServer(
                partyIdNum,
                updated.userId,
                updated.prefsByChar,
                updated.visibleByChar,
                updated.tableOrder,
                updated.rosterOrder,
                updated.cardRosterOrder // ✅ 여기로 카드 순서 저장
            );
        }
    };

    async function saveActiveAccountToServer(
        partyId: number,
        activeAccountId: string | null
    ) {
        try {
            await fetch(`/api/party-tasks/${partyId}/active-account`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ activeAccountId }),
            });
        } catch (e) {
            console.error("파티 activeAccount 저장 실패 (네트워크 에러):", e);
        }
    }

    function sendMemberUpdateWS(
        partyId: number,
        userId: string,
        prefsByChar: Record<string, CharacterTaskPrefs>,
        visibleByChar?: Record<string, boolean>,
        tableOrder?: string[],
        rosterOrder?: string[],
        cardRosterOrder?: string[]      // ✅ 추가
    ) {
        if (sendGlobalMessage) {
            sendGlobalMessage({
                type: "tableOrderUpdate",
                partyId,
                userId,
                prefsByChar,
                visibleByChar,
                tableOrder,
                rosterOrder,
                cardRosterOrder,            // ✅ 추가
            });
        }
    }

    const handleSelectAccount = (accountId: string) => {
        if (!party) return;
        const targetAcc = accounts.find((a) => a.id === accountId);
        if (!targetAcc) return;

        void (async () => {
            const nextAccounts = await applyActiveAccount(
                targetAcc,
                accounts,
                party.id,
                myUserId,
                saveRaidState,
                saveActiveAccountToServer,
                sendGlobalMessage
            );
            setAccounts(nextAccounts);
        })();
    };

    const handleCharacterSearch = async (name: string): Promise<boolean> => {
        const trimmed = name.trim();
        if (!trimmed) return false;

        setAccountSearchLoading(true);
        setAccountSearchErr(null);

        try {
            const r = await fetch(
                `/api/lostark/character/${encodeURIComponent(trimmed)}`,
                { cache: "no-store" }
            );

            if (!r.ok) {
                throw new Error("캐릭터 정보를 불러오지 못했습니다. 닉네임을 확인해주세요.");
            }

            const json = (await r.json()) as CharacterSummary;

            if (!json || !json.roster || json.roster.length === 0) {
                throw new Error("캐릭터 정보를 찾을 수 없습니다. (원정대 정보 없음)");
            }

            if (!party) {
                setAccounts((prev) => {
                    let next = [...prev];
                    const idx = next.findIndex(
                        (a) => a.nickname.toLowerCase() === trimmed.toLowerCase()
                    );

                    if (idx >= 0) {
                        next = next.map((a, i) =>
                            i === idx
                                ? { ...a, summary: json, isSelected: true }
                                : { ...a, isSelected: false }
                        );
                    } else {
                        const id = typeof crypto !== "undefined" && "randomUUID" in crypto
                            ? crypto.randomUUID()
                            : `${trimmed}-${Date.now()}`;

                        const acc: SavedAccount = {
                            id,
                            nickname: trimmed,
                            summary: json,
                            isPrimary: prev.length === 0,
                            isSelected: true,
                        };

                        next = prev.map((a) => ({ ...a, isSelected: false }));
                        next.push(acc);
                    }
                    return next;
                });
                return true;
            }

            const baseAccounts = accounts ?? [];
            const existingIdx = baseAccounts.findIndex(
                (a) => a.nickname.toLowerCase() === trimmed.toLowerCase()
            );

            let newAcc: SavedAccount;
            let nextAccountsBase: SavedAccount[];

            if (existingIdx >= 0) {
                nextAccountsBase = baseAccounts.map((a, i) =>
                    i === existingIdx ? { ...a, summary: json } : a
                );
                newAcc = nextAccountsBase[existingIdx];
            } else {
                const id = typeof crypto !== "undefined" && "randomUUID" in crypto
                    ? crypto.randomUUID()
                    : `${trimmed}-${Date.now()}`;

                newAcc = {
                    id,
                    nickname: trimmed,
                    summary: json,
                    isPrimary: baseAccounts.length === 0,
                    isSelected: true,
                };

                nextAccountsBase = baseAccounts.map((a) => ({
                    ...a,
                    isSelected: false,
                }));
                nextAccountsBase.push(newAcc);
            }

            const nextAccounts = await applyActiveAccount(
                newAcc,
                nextAccountsBase,
                party.id,
                myUserId,
                saveRaidState,
                saveActiveAccountToServer,
                sendGlobalMessage
            );

            setAccounts(nextAccounts);
            void reloadPartyTasks(false);

            return true;

        } catch (e: any) {
            const errMsg = e?.message ?? String(e);
            console.error("캐릭터 검색 실패:", errMsg);
            setAccountSearchErr(errMsg);
            return false;
        } finally {
            setAccountSearchLoading(false);
        }
    };


    const handleInlineSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        const success = await handleCharacterSearch(inlineSearchInput);
        if (success) {
            setInlineSearchInput("");
        }
    };

    const openEditModal = (member: PartyMemberTasks, char: RosterCharacter) => {
        const prefs = member.prefsByChar[char.name] ?? { raids: {} };
        setEditTarget({
            memberUserId: member.userId,
            charName: char.name,
            character: char,
        });
        setEditInitial(prefs);
        setEditOpen(true);
    };

    const openMemberCharSetting = (member: PartyMemberTasks) => {
        setCharSettingTarget({ memberUserId: member.userId });
        setCharSettingOpen(true);
    };


    async function fetchInvite() {
        if (!party) return;
        setInviteLoading(true);
        setInviteErr(null);
        try {
            const res = await fetch(`/api/party-tasks/${party.id}/invite`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            });

            if (!res.ok) {
                throw new Error("파티 초대 코드를 생성하지 못했습니다.");
            }

            const data = await res.json();
            setInvite({
                code: data.code ?? "",
                url: data.url ?? "",
                expiresAt: data.expiresAt ?? null,
            });
        } catch (e: any) {
            setInviteErr(e?.message ?? "알 수 없는 오류가 발생했습니다.");
        } finally {
            setInviteLoading(false);
        }
    }

    const openInviteModal = () => {
        if (!party) return;
        setInviteOpen(true);
        setInviteCopied(false);
        void fetchInvite();
    };

    const handleCopyInvite = async () => {
        if (!invite) return;
        const text = invite.url || invite.code;
        if (!text) return;

        try {
            if (
                typeof navigator !== "undefined" &&
                navigator.clipboard &&
                (window.location.protocol === "https:" ||
                    window.location.hostname === "localhost" ||
                    window.location.hostname === "127.0.0.1")
            ) {
                await navigator.clipboard.writeText(text);
            } else if (typeof document !== "undefined") {
                const textarea = document.createElement("textarea");
                textarea.value = text;
                textarea.readOnly = true;
                textarea.style.position = "fixed";
                textarea.style.top = "0";
                textarea.style.left = "-9999px";
                textarea.style.opacity = "0";

                document.body.appendChild(textarea);
                textarea.select();

                const ok = document.execCommand("copy");
                document.body.removeChild(textarea);

                if (!ok) {
                    throw new Error("execCommand copy 실패");
                }
            }

            setInviteCopied(true);
            setTimeout(() => setInviteCopied(false), 1500);
        } catch (e) {
            console.error("초대 링크 복사 실패:", e);
        }
    };

    const handleSmartShare = async () => {
        if (!invite) return;

        const shareData = {
            title: '로스트아크 파티 초대',
            text: `[LoaCheck] 파티에 초대되었습니다!\n참여 코드: ${invite.code}`,
            url: invite.url || window.location.href,
        };

        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        if (isMobile && typeof navigator !== "undefined" && navigator.share && navigator.canShare(shareData)) {
            try {
                await navigator.share(shareData);
            } catch (err: any) {
                if (err.name !== 'AbortError') console.error('공유 실패:', err);
            }
        }
        else {
            handleCopyInvite();
            setShareModalOpen(true);
        }
    };

    const launchDiscordApp = () => {
        window.location.href = "discord://channels/@me";
        setShareModalOpen(false);
    };

    const launchDiscordWeb = () => {
        window.open("https://discord.com/channels/@me", "_blank");
        setShareModalOpen(false);
    };

    const handleMemberChangeVisible = (
        memberUserId: string,
        partialVisibleByChar: Record<string, boolean>
    ) => {
        if (!party || !partyTasks) return;
        const partyIdNum = party.id;

        const next: PartyMemberTasks[] = partyTasks.map((m) => {
            if (m.userId !== memberUserId) return m;

            const mergedVisible: Record<string, boolean> = {
                ...(m.visibleByChar ?? {}),
                ...partialVisibleByChar,
            };

            return {
                ...m,
                visibleByChar: mergedVisible,
            };
        });

        setPartyTasks(next);

        const updated = next.find((m) => m.userId === memberUserId);
        if (updated) {
            sendMemberUpdateWS(
                partyIdNum,
                updated.userId,
                updated.prefsByChar,
                updated.visibleByChar
            );

            void saveMemberPrefsToServer(
                partyIdNum,
                updated.userId,
                updated.prefsByChar,
                updated.visibleByChar
            );
        }
    };

    async function applyActiveAccount(
        acc: SavedAccount,
        accounts: SavedAccount[],
        partyId: number,
        myUserId: string | null,
        saveRaidState: (patch: RaidStatePatch) => Promise<void>,
        saveActiveAccountToServer: (partyId: number, activeAccountId: string) => Promise<void>,
        sendMessage: ((msg: any) => void) | undefined
    ) {
        const nextAccounts = accounts.map((a) =>
            a.id === acc.id
                ? { ...a, isSelected: true }
                : { ...a, isSelected: false }
        );

        const active =
            nextAccounts.find((a) => a.id === acc.id) ??
            nextAccounts.find((a) => a.isPrimary) ??
            nextAccounts[0] ??
            null;

        await saveRaidState({
            accounts: nextAccounts,
            activeAccountId: active?.id ?? null,
        });

        await saveActiveAccountToServer(partyId, acc.id);

        if (sendMessage && myUserId) {
            sendMessage({
                type: "activeAccountUpdate",
                partyId,
                userId: myUserId,
                activeAccountId: acc.id,
            });
        }

        return nextAccounts;
    }


    const handleMyDeleteAccount = async () => {
        if (!party || !partyTasks || !myUserId || !currentAccount) return;

        setCharSettingOpen(false);
        setCharSettingTarget(null);

        const partyIdNum = party.id;
        const targetAccountId = currentAccount.id;

        if (accounts && accounts.length > 0) {
            const filtered = accounts.filter((a) => a.id !== targetAccountId);

            let nextActive: SavedAccount | null = null;
            if (filtered.length > 0) {
                nextActive =
                    filtered.find((a) => a.isSelected) ||
                    filtered.find((a) => a.isPrimary) ||
                    filtered[0];
            }

            const hasPrimaryAfter = filtered.some((a) => a.isPrimary);

            const nextAccounts: SavedAccount[] = filtered.map((a) => ({
                ...a,
                isSelected: nextActive ? a.id === nextActive.id : false,
                isPrimary: hasPrimaryAfter
                    ? a.isPrimary
                    : nextActive
                        ? a.id === nextActive.id
                        : false,
            }));

            setAccounts(nextAccounts);

            try {
                await saveRaidState({
                    accounts: nextAccounts,
                    activeAccountId: nextActive?.id ?? null,
                    deleteAccountId: targetAccountId,
                });

                if (nextAccounts.length > 0) {
                    await saveActiveAccountToServer(
                        partyIdNum,
                        nextActive ? nextActive.id : null
                    );
                }

                if (sendGlobalMessage && myUserId) {
                    sendGlobalMessage({
                        type: "activeAccountUpdate",
                        partyId: partyIdNum,
                        userId: myUserId,
                        activeAccountId: nextActive?.id ?? null,
                    });
                }
            } catch (e) {
                console.error("계정 삭제 중 오류 발생:", e);
            }
        }

        if (party) {
            await reloadPartyTasks(false);
        }
    };

    const handleMyRefreshAccount = async () => {
        if (!currentAccount) return;
        await handleCharacterSearch(currentAccount.nickname);
    };

    const handleMemberRefreshAccount = async (memberUserId: string) => {
        setRefreshErr(null);

        if (!party || !partyTasks) return;

        const target = partyTasks.find((m) => m.userId === memberUserId);
        if (!target) {
            console.error("대상 파티원을 찾을 수 없습니다.");
            return;
        }

        const originalNick = (target.nickname ?? "").trim();
        const rosterNames = target.summary?.roster?.map((c) => c.name) ?? [];

        const searchCandidates = Array.from(new Set([originalNick, ...rosterNames])).filter(Boolean);

        if (searchCandidates.length === 0) {
            setRefreshErr("검색할 닉네임 정보가 없습니다.");
            return;
        }

        try {
            let json: CharacterSummary | null = null;
            let successNickname: string | null = null;

            for (const name of searchCandidates) {
                try {
                    const r = await fetch(
                        `/api/lostark/character/${encodeURIComponent(name)}`,
                        { cache: "no-store" }
                    );

                    if (r.ok) {
                        json = (await r.json()) as CharacterSummary;
                        successNickname = name;
                        break;
                    }
                } catch (innerErr) {
                    continue;
                }
            }

            if (!json) {
                const errMsg = `'${originalNick}' 및 원정대 캐릭터를 찾을 수 없습니다. (닉네임 변경 확인)`;
                setRefreshErr(errMsg);
                return;
            }

            setRefreshErr(null);

            setPartyTasks((prev) => {
                if (!prev) return prev;
                return prev.map((m) =>
                    m.userId === memberUserId
                        ? {
                            ...m,
                            summary: json,
                            nickname: successNickname || m.nickname
                        }
                        : m
                );
            });

            await fetch(`/api/party-tasks/${party.id}/raid-tasks`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: memberUserId,
                    summary: json,
                    prefsByChar: target.prefsByChar,
                    visibleByChar: target.visibleByChar,
                    nickname: successNickname
                }),
            });

            sendMemberUpdateWS(
                party.id,
                memberUserId,
                target.prefsByChar,
                target.visibleByChar
            );

        } catch (e: any) {
            console.error("파티원 정보 새로고침 실패:", e);
            setRefreshErr("서버 통신 중 오류가 발생했습니다.");
        }
    };

    const handleSaveEdit = (nextPrefs: CharacterTaskPrefs) => {
        if (!party || !editTarget || !partyTasks) return;
        const partyIdNum = party.id;
        const { memberUserId, charName } = editTarget;

        const next: PartyMemberTasks[] = partyTasks.map((m) => {
            if (m.userId !== memberUserId) return m;

            const memberPrefsByChar: Record<string, CharacterTaskPrefs> = {
                ...(m.prefsByChar ?? {}),
                [charName]: { ...nextPrefs },
            };

            return {
                ...m,
                prefsByChar: memberPrefsByChar,
            };
        });

        setPartyTasks(next);

        const updated = next.find((m) => m.userId === memberUserId);
        if (updated) {
            sendMemberUpdateWS(
                partyIdNum,
                updated.userId,
                updated.prefsByChar,
                updated.visibleByChar
            );

            void saveMemberPrefsToServer(
                partyIdNum,
                updated.userId,
                updated.prefsByChar,
                updated.visibleByChar
            );
        }

        setEditOpen(false);
    };

    const resetFilters = () => {
        setOnlyRemain(false);
        setIsCardView(false);
    };

    async function saveMemberPrefsToServer(
        partyId: number,
        userId: string,
        prefsByChar: Record<string, CharacterTaskPrefs>,
        visibleByChar?: Record<string, boolean>,
        tableOrder?: string[],
        rosterOrder?: string[],
        cardRosterOrder?: string[]      // ✅ 추가
    ) {
        try {
            await fetch(`/api/party-tasks/${partyId}/raid-tasks`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId,
                    prefsByChar,
                    visibleByChar,
                    tableOrder,
                    rosterOrder,
                    cardRosterOrder,          // ✅ 추가
                }),
            });
        } catch (e) {
            console.error("파티원 숙제 저장 실패 (네트워크 에러):", e);
        }
    }

    const handleMemberToggleGate = (
        memberUserId: string,
        charName: string,
        raidName: string,
        gate: number,
        currentGates: number[],
        allGates: number[]
    ) => {
        if (!party || !partyTasks) return;

        const partyIdNum = party.id;

        const next: PartyMemberTasks[] = partyTasks.map((m) => {
            if (m.userId !== memberUserId) return m;

            const memberPrefsByChar: Record<string, CharacterTaskPrefs> = {
                ...(m.prefsByChar ?? {}),
            };

            const curPrefsForChar: CharacterTaskPrefs =
                memberPrefsByChar[charName] ?? { raids: {} };

            const curRaidPref = curPrefsForChar.raids[raidName];
            if (!curRaidPref) {
                return m;
            }

            const nextGates = calcNextGates(
                gate,
                currentGates ?? [],
                allGates ?? []
            );

            const updatedRaidPref: CharacterTaskPrefs["raids"][string] = {
                ...curRaidPref,
                gates: nextGates,
            };

            const updatedPrefsForChar: CharacterTaskPrefs = {
                ...curPrefsForChar,
                raids: {
                    ...curPrefsForChar.raids,
                    [raidName]: updatedRaidPref,
                },
            };

            const updatedPrefsByChar: Record<string, CharacterTaskPrefs> = {
                ...memberPrefsByChar,
                [charName]: updatedPrefsForChar,
            };

            return {
                ...m,
                prefsByChar: updatedPrefsByChar,
            };
        });

        setPartyTasks(next);

        const updated = next.find((m) => m.userId === memberUserId);
        if (!updated) return;

        sendMemberUpdateWS(
            partyIdNum,
            updated.userId,
            updated.prefsByChar,
            updated.visibleByChar
        );

        void saveMemberPrefsToServer(
            partyIdNum,
            updated.userId,
            updated.prefsByChar,
            updated.visibleByChar
        );
    };

    const handleMemberAutoSetup = (memberUserId: string, isMe: boolean) => {
        if (!party || !partyTasks) return;

        const partyIdNum = party.id;
        const RESET_TABLE_ORDER = ["__empty_0"];

        const savedCount = typeof window !== "undefined" ? localStorage.getItem("raidTaskAutoSetupCount") : null;
        const charCount = savedCount ? Number(savedCount) : 6;

        const next: PartyMemberTasks[] = partyTasks.map((m) => {
            if (m.userId !== memberUserId) return m;

            let roster = m.summary?.roster ?? [];
            if (isMe && currentAccount?.summary?.roster) {
                roster = currentAccount.summary.roster;
            }
            if (!roster.length) return m;

            const { nextPrefsByChar, nextVisibleByChar } = buildAutoSetupForRoster(
                roster,
                m.prefsByChar ?? {},
                charCount
            );


            const nextVisibleMerged: Record<string, boolean> = {
                ...(m.visibleByChar ?? {}),
            };
            for (const c of roster) {
                const name = c.name;
                nextVisibleMerged[name] = nextVisibleByChar[name] ?? false;
            }

            const nextPrefsMerged: Record<string, CharacterTaskPrefs> = {
                ...(m.prefsByChar ?? {}),
                ...nextPrefsByChar,
            };

            return {
                ...m,
                prefsByChar: nextPrefsMerged,
                visibleByChar: nextVisibleMerged,
                tableOrder: RESET_TABLE_ORDER,
            };
        });

        setPartyTasks(next);

        const updated = next.find((m) => m.userId === memberUserId);
        if (updated) {
            sendMemberUpdateWS(
                partyIdNum,
                updated.userId,
                updated.prefsByChar,
                updated.visibleByChar,
                updated.tableOrder
            );

            void saveMemberPrefsToServer(
                partyIdNum,
                updated.userId,
                updated.prefsByChar,
                updated.visibleByChar,
                updated.tableOrder
            );
        }
    };

    const handleMemberReorder = (
        memberUserId: string,
        charName: string,
        newOrderIds: string[]
    ) => {
        if (!party || !partyTasks) return;
        const partyIdNum = party.id;

        const next: PartyMemberTasks[] = partyTasks.map((m) => {
            if (m.userId !== memberUserId) return m;

            const memberPrefsByChar: Record<string, CharacterTaskPrefs> = {
                ...(m.prefsByChar ?? {}),
            };

            const curPrefsForChar: CharacterTaskPrefs =
                memberPrefsByChar[charName] ?? { raids: {} };

            const allRaidNames = Object.keys(curPrefsForChar.raids ?? {});

            const mergedOrder = [
                ...newOrderIds,
                ...allRaidNames.filter((name) => !newOrderIds.includes(name)),
            ];

            const updatedPrefsForChar: CharacterTaskPrefs = {
                ...curPrefsForChar,
                order: mergedOrder,
            };

            const updatedPrefsByChar: Record<string, CharacterTaskPrefs> = {
                ...memberPrefsByChar,
                [charName]: updatedPrefsForChar,
            };

            return {
                ...m,
                prefsByChar: updatedPrefsByChar,
            };
        });

        setPartyTasks(next);

        const updated = next.find((m) => m.userId === memberUserId);
        if (updated) {
            sendMemberUpdateWS(
                partyIdNum,
                updated.userId,
                updated.prefsByChar,
                updated.visibleByChar
            );

            void saveMemberPrefsToServer(
                partyIdNum,
                updated.userId,
                updated.prefsByChar,
                updated.visibleByChar
            );
        }
    };

    const handleMemberTableReorder = (memberUserId: string, newOrder: string[]) => {
        if (!party || !partyTasks) return;
        const partyIdNum = party.id;

        const next: PartyMemberTasks[] = partyTasks.map((m) => {
            if (m.userId !== memberUserId) return m;
            return {
                ...m,
                tableOrder: newOrder,
            };
        });

        setPartyTasks(next);

        const updated = next.find((m) => m.userId === memberUserId);
        if (updated) {
            sendMemberUpdateWS(
                partyIdNum,
                updated.userId,
                updated.prefsByChar,
                updated.visibleByChar,
                updated.tableOrder
            );

            void saveMemberPrefsToServer(
                partyIdNum,
                updated.userId,
                updated.prefsByChar,
                updated.visibleByChar,
                updated.tableOrder
            );
        }
    };

    const handleMemberRosterReorder = (memberUserId: string, mergedRosterOrder: string[]) => {
        if (!party || !partyTasks) return;
        const partyIdNum = party.id;

        const next: PartyMemberTasks[] = partyTasks.map((m) => {
            if (m.userId !== memberUserId) return m;
            return {
                ...m,
                rosterOrder: mergedRosterOrder,
            };
        });

        setPartyTasks(next);

        const updated = next.find((m) => m.userId === memberUserId);
        if (updated) {
            sendMemberUpdateWS(
                partyIdNum,
                updated.userId,
                updated.prefsByChar,
                updated.visibleByChar,
                updated.tableOrder,
                updated.rosterOrder // ✅ 여기
            );

            void saveMemberPrefsToServer(
                partyIdNum,
                updated.userId,
                updated.prefsByChar,
                updated.visibleByChar,
                updated.tableOrder,
                updated.rosterOrder // ✅ 여기
            );
        }
    };

    const handleMemberGateAllClear = (memberUserId: string) => {
        if (!party || !partyTasks) return;
        const partyIdNum = party.id;

        const next: PartyMemberTasks[] = partyTasks.map((m) => {
            if (m.userId !== memberUserId) return m;

            const prevPrefsByChar = m.prefsByChar ?? {};
            const updatedPrefsByChar: Record<string, CharacterTaskPrefs> = {};

            for (const [charName, prefs] of Object.entries(prevPrefsByChar)) {
                const raids = prefs.raids ?? {};
                const clearedRaids: CharacterTaskPrefs["raids"] = {};

                for (const [raidName, raidPref] of Object.entries(raids)) {
                    clearedRaids[raidName] = {
                        ...raidPref,
                        gates: [],
                    };
                }

                updatedPrefsByChar[charName] = {
                    ...prefs,
                    raids: clearedRaids,
                };
            }

            return {
                ...m,
                prefsByChar: updatedPrefsByChar,
            };
        });

        setPartyTasks(next);

        const updated = next.find((m) => m.userId === memberUserId);
        if (updated) {
            sendMemberUpdateWS(
                partyIdNum,
                updated.userId,
                updated.prefsByChar,
                updated.visibleByChar
            );

            void saveMemberPrefsToServer(
                partyIdNum,
                updated.userId,
                updated.prefsByChar,
                updated.visibleByChar
            );
        }
    };




    // 🔥 필터 불러오기 useEffect 수정 (약 625번째 줄 부근)
    useEffect(() => {
        if (!party) return;
        if (typeof window === "undefined") return;

        try {
            const raw = localStorage.getItem(PARTY_FILTER_KEY(party.id));
            if (!raw) return;

            const saved = JSON.parse(raw) as SavedFilters & { isCardView?: boolean };

            if (typeof saved.onlyRemain === "boolean") setOnlyRemain(saved.onlyRemain);
            if (typeof saved.isCardView === "boolean") setIsCardView(saved.isCardView);
            else if (typeof saved.tableView === "boolean") setIsCardView(!saved.tableView);

            if (Array.isArray(saved.selectedRaids)) {
                setSelectedRaids(saved.selectedRaids.filter((x) => typeof x === "string"));
            }

            // 🔥 추가
            if (typeof saved.isDragEnabled === "boolean") setIsDragEnabled(saved.isDragEnabled);
        } catch (e) {
            console.error("파티 필터 불러오기 실패:", e);
        }
    }, [party]);

    // 🔥 필터 저장하기 useEffect 수정 (바로 아래)
    useEffect(() => {
        if (!party) return;
        if (typeof window === "undefined") return;

        try {
            const toSave: SavedFilters = {
                onlyRemain,
                isCardView,
                selectedRaids,
                isDragEnabled, // 🔥 추가
            };
            localStorage.setItem(PARTY_FILTER_KEY(party.id), JSON.stringify(toSave));
        } catch (e) {
            console.error("파티 필터 저장 실패:", e);
        }
    }, [onlyRemain, isCardView, selectedRaids, isDragEnabled, party]); // 🔥 의존성 배열에 isDragEnabled 추가

    useEffect(() => {
        if (status === "loading") return;

        if (status === "unauthenticated") {
            setPartyLoading(false);
            setPartyErr("로그인이 필요합니다.");
            return;
        }

        let cancelled = false;

        async function loadDetail() {
            setPartyLoading(true);
            setPartyErr(null);
            try {
                const res = await fetch(`/api/party-tasks/${partyId}`, {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                    cache: "no-store",
                });

                if (!res.ok) {
                    if (res.status === 401) {
                        throw new Error("로그인이 필요합니다.");
                    }
                    if (res.status === 403) {
                        throw new Error("이 파티에 참여 중인 멤버만 볼 수 있습니다.");
                    }
                    if (res.status === 404) {
                        throw new Error("존재하지 않는 파티입니다.");
                    }
                    throw new Error(`파티 정보를 불러오지 못했습니다. (${res.status})`);
                }

                const data = (await res.json()) as PartyDetail;
                if (!cancelled) {
                    setParty(data);


                    if (addPartyId) addPartyId(data.id);
                    if (joinRoom) {
                        joinRoom(`party:${data.id}`);

                        if (data.members && Array.isArray(data.members)) {
                            data.members.forEach((m) => {
                                joinRoom(`user:${m.id}`);
                            });
                        }
                    }

                    const raidState = data.raidState;
                    if (
                        raidState?.accounts &&
                        Array.isArray(raidState.accounts) &&
                        raidState.accounts.length > 0
                    ) {
                        let accs = raidState.accounts.map((a) => ({ ...a })) as SavedAccount[];

                        const partyKey = String(data.id);
                        const partyActiveId =
                            raidState.activeAccountByParty?.[partyKey] ?? null;

                        let initialActiveId: string | null =
                            partyActiveId ?? raidState.activeAccountId ?? null;

                        let shouldSaveDefault = false;
                        if (!initialActiveId) {
                            const primary = accs.find((a) => a.isPrimary);
                            const first = accs[0];
                            initialActiveId = primary?.id ?? first?.id ?? null;

                            if (initialActiveId) {
                                shouldSaveDefault = true;
                            }
                        }

                        if (initialActiveId) {
                            accs = accs.map((a) =>
                                a.id === initialActiveId
                                    ? { ...a, isSelected: true }
                                    : { ...a, isSelected: false }
                            );
                        } else {
                            accs = accs.map((a) => ({ ...a, isSelected: false }));
                        }

                        setAccounts(accs);

                        if (shouldSaveDefault && initialActiveId) {
                            void saveActiveAccountToServer(data.id, initialActiveId);
                        }
                    }
                }
            } catch (e: any) {
                if (!cancelled) {
                    setPartyErr(e?.message ?? "알 수 없는 오류가 발생했습니다.");
                }
            } finally {
                if (!cancelled) setPartyLoading(false);
            }
        }

        loadDetail();
        return () => {
            cancelled = true;
        };
    }, [status, partyId, joinRoom]);

    useEffect(() => {
        if (!party || status !== "authenticated") return;
        void reloadPartyTasks(true);
    }, [party, status, reloadPartyTasks]);

    useEffect(() => {
        if (!ws || !party || status !== "authenticated") return;

        const handleMessage = (event: MessageEvent) => {
            try {
                const msg = JSON.parse(event.data);

                if (msg.type === "memberUpdated") {
                    setPartyTasks((prev) => {
                        if (!prev) return prev;
                        const exists = prev.some((m) => m.userId === msg.userId);
                        if (!exists) return prev;

                        return prev.map((m) => {
                            if (m.userId === msg.userId) {
                                return {
                                    ...m,
                                    prefsByChar: msg.prefsByChar ?? m.prefsByChar ?? {},
                                    visibleByChar: msg.visibleByChar ?? m.visibleByChar ?? {},
                                    tableOrder: msg.tableOrder ?? m.tableOrder ?? [],
                                    rosterOrder: msg.rosterOrder ?? m.rosterOrder ?? [],
                                    cardRosterOrder: msg.cardRosterOrder ?? m.cardRosterOrder ?? [], // ✅ 추가
                                };
                            }
                            return m;
                        });
                    });
                }
                else if (msg.type === "activeAccountUpdated") {
                    setAccounts((prev) => {
                        if (!prev || prev.length === 0) return prev;

                        const exists = prev.some((a) => a.id === msg.activeAccountId);
                        if (!exists) return prev;

                        return prev.map((a) =>
                            a.id === msg.activeAccountId
                                ? { ...a, isSelected: true }
                                : { ...a, isSelected: false }
                        );
                    });

                    void reloadPartyTasks(false);
                }
                else if (msg.type === "memberKicked" && String(msg.partyId) === String(party.id)) {
                    const kickedUserId = String(msg.userId);

                    if (myUserId && String(myUserId) === kickedUserId) {
                        alert("파티에서 강퇴되어 파티 목록으로 이동합니다.");
                        router.push("/party-tasks");
                        return;
                    }

                    setParty((prev) =>
                        prev ? {
                            ...prev,
                            members: prev.members.filter((m) => String(m.id) !== kickedUserId),
                        } : prev
                    );
                    setPartyTasks((prev) =>
                        prev ? prev.filter((m) => String(m.userId) !== kickedUserId) : prev
                    );
                }
            } catch (e) {
                console.error("[WS] Parse error:", e);
            }
        };

        ws.addEventListener("message", handleMessage);
        return () => ws.removeEventListener("message", handleMessage);
    }, [ws, party?.id, status, myUserId, router, reloadPartyTasks]);

    useEffect(() => {
        if (!party || !myUserId) return;

        const isStillMember = party.members.some((m) => m.id === myUserId);

        if (!isStillMember) {
            alert("파티에서 강퇴되어 파티 목록으로 이동합니다.");
            router.push("/party-tasks");
        }
    }, [party, myUserId, router]);

    const handlePartyUpdated = (patch: Partial<PartyDetail>) => {
        setParty((prev) => (prev ? { ...prev, ...patch } : prev));
    };

    const handlePartyMemberKicked = (userId: string) => {
        setParty((prev) =>
            prev
                ? {
                    ...prev,
                    members: prev.members.filter((m) => m.id !== userId),
                }
                : prev
        );

        setPartyTasks((prev) =>
            prev ? prev.filter((m) => m.userId !== userId) : prev
        );
    };

    function filterPrefsBySelectedRaids(
        prefsByChar: Record<string, CharacterTaskPrefs>,
        selectedRaids: string[]
    ): Record<string, CharacterTaskPrefs> {
        if (!selectedRaids || selectedRaids.length === 0) return prefsByChar;

        const allow = new Set(selectedRaids);
        const out: Record<string, CharacterTaskPrefs> = {};

        for (const [charName, prefs] of Object.entries(prefsByChar ?? {})) {
            const raids = prefs.raids ?? {};

            const nextRaids = Object.fromEntries(
                Object.entries(raids).filter(([raidName]) => allow.has(raidName))
            ) as CharacterTaskPrefs["raids"];

            const filteredOrder = prefs.order
                ?.filter((r) => allow.has(r) && nextRaids[r])
                .filter(Boolean);

            // order가 비어버리면(undefined로) → buildTasksForCharacter가 자동 정렬 fallback을 타게 함
            const { order: _old, ...rest } = prefs;

            out[charName] =
                filteredOrder && filteredOrder.length > 0
                    ? { ...rest, raids: nextRaids, order: filteredOrder }
                    : { ...rest, raids: nextRaids };
        }

        return out;
    }

    if (status === "unauthenticated") {
        return (
            <div className="w-full min-h-[60vh] flex flex-col items-center justify-center text-gray-300 px-4">
                <div className="max-w-md w-full textcenter space-y-6">
                    <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-1.5 text-xs font-medium text-[#5B69FF] border border-[#5B69FF]/20">
                        <UsersRound className="h-3.5 w-3.5" />
                        <span>파티 숙제</span>
                    </div>
                    <h1 className="text-2xl font-bold text-white">
                        파티 숙제를 보려면
                        <br />
                        먼저 로그인해주세요
                    </h1>
                    <button
                        onClick={() => signIn("discord")}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#5865F2] px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#5865F2]/25 hover:bg-[#4752C4] transition-all"
                    >
                        <LogIn className="h-5 w-5" />
                        Discord로 로그인
                    </button>
                </div>
            </div>
        );
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
                            <div
                                key={i}
                                className="h-[180px] rounded-xl border border-white/5 bg-[#16181D] p-5 animate-pulse"
                            >
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


    if (partyErr && !party) {
        return (
            <div className="relative w-full min-h-[70vh] flex items-center justify-center overflow-hidden px-4">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-500/10 blur-[120px] rounded-full pointer-events-none opacity-50" />

                <div className="relative z-10 w-full max-w-sm bg-[#16181D]/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-8 text-center animate-in fade-in zoom-in-95 duration-300">
                    <div className="flex flex-col items-center gap-6">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 text-red-500 border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.15)]">
                            <AlertTriangle className="h-8 w-8" />
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-xl font-bold text-white">
                                접근할 수 없습니다
                            </h2>
                            <p className="text-sm text-gray-400 leading-relaxed whitespace-pre-line break-keep">
                                {partyErr}
                            </p>
                        </div>

                        <button
                            onClick={() => router.push("/party-tasks")}
                            className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-white/5 py-3.5 text-sm font-bold text-white hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            파티 목록으로 돌아가기
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!party) return null;

    const sortedPartyTasks = partyTasks && myUserId
        ? [...partyTasks].sort((a, b) => {
            if (a.userId === myUserId && b.userId !== myUserId) return -1;
            if (b.userId === myUserId && a.userId !== myUserId) return 1;

            if (typeof window !== "undefined") {
                const savedOrderRaw2 = localStorage.getItem(`partyMemberOrder:${party?.id}`);

                if (savedOrderRaw2) {
                    const orderIds = JSON.parse(savedOrderRaw2) as string[];
                    const indexA = orderIds.indexOf(a.userId);
                    const indexB = orderIds.indexOf(b.userId);

                    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                    if (indexA !== -1) return -1;
                    if (indexB !== -1) return 1;
                }
            }

            return 0;
        })
        : partyTasks;

    let myRemainingRaids: number | undefined = undefined;
    if (sortedPartyTasks && myUserId) {
        const me = sortedPartyTasks.find((m) => m.userId === myUserId);
        if (me) {
            const baseSummary =
                currentAccount?.summary ? currentAccount.summary : me.summary;

            if (baseSummary) {
                const mySummary = computeMemberSummary({
                    ...me,
                    summary: baseSummary,
                });
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
                        {party.nextResetAt && (
                            <div className="inline-flex items-center gap-1.5 rounded-full bg-black/30 px-3 py-1 text-[11px] text-gray-400">
                                <Clock className="h-3 w-3" />
                                <span>다음 초기화: {party.nextResetAt}</span>
                            </div>
                        )}

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

                <div
                    className="
                        grid grid-cols-1 
                        lg:grid-cols-[minmax(0,210px)_minmax(0,1fr)]
                        gap-5 lg:items-start
                    "
                >
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
                            isDragEnabled={isDragEnabled} // 🔥 추가
                            setIsDragEnabled={setIsDragEnabled} // 🔥 추가
                        />

                        {accountSearchErr && (
                            <p className="mt-2 text-[11px] text-red-400 px-1">
                                에러: {accountSearchErr}
                            </p>
                        )}
                    </div>


                    <div className="grid grid-cols-1 gap-4 sm:gap-5">
                        {tasksLoading && (
                            <div className="w-full py-6">
                                <div className="animate-pulse space-y-3">
                                    <div className="h-4 w-40 rounded bg-white/5" />
                                    <div className="space-y-2">
                                        {Array.from({ length: 6 }).map((_, i) => (
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

                        {tasksErr && (
                            <div className="w-full rounded-md border border-red-500/40 bg-red-900/20 px-4 py-3 text-xs text-red-200">
                                {tasksErr}
                            </div>
                        )}

                        {!tasksLoading && !tasksErr && sortedPartyTasks && sortedPartyTasks.length > 0 && (
                            <div className="flex flex-col gap-6 sm:gap-10">
                                {sortedPartyTasks.map((m) => {
                                    const filteredPrefs = filterPrefsBySelectedRaids(m.prefsByChar, selectedRaids);

                                    let filteredTableOrder = m.tableOrder ?? [];
                                    if (selectedRaids.length > 0 && Array.isArray(m.tableOrder)) {
                                        filteredTableOrder = m.tableOrder.filter(raidId => selectedRaids.includes(raidId));
                                    }

                                    // 🔥 양 끝에 불필요하게 쌓인 빈칸 제거 (테이블 무조건 왼쪽 정렬 보장)
                                    let startIndex = 0;
                                    let endIndex = filteredTableOrder.length - 1;

                                    while (startIndex <= endIndex && filteredTableOrder[startIndex].startsWith("__empty_")) {
                                        startIndex++;
                                    }
                                    while (endIndex >= startIndex && filteredTableOrder[endIndex].startsWith("__empty_")) {
                                        endIndex--;
                                    }

                                    const finalTableOrder = startIndex <= endIndex
                                        ? filteredTableOrder.slice(startIndex, endIndex + 1)
                                        : [];

                                    return (
                                        <PartyMemberBlock
                                            key={m.userId}
                                            partyId={party.id}
                                            member={m} // 🔥 원본 데이터 (통계 계산용)
                                            filteredPrefs={filteredPrefs} // 🔥 필터링된 숙제 데이터 (화면 렌더링용)
                                            viewTableOrder={finalTableOrder} // 🔥 필터 및 정렬된 테이블 순서 (화면 렌더링용)
                                            selectedRaids={selectedRaids}
                                            isMe={myUserId === m.userId}
                                            currentAccount={currentAccount}
                                            onReorderTable={handleMemberTableReorder}
                                            onlyRemain={onlyRemain}
                                            isCardView={isCardView}
                                            onAutoSetup={(isMe) => handleMemberAutoSetup(m.userId, isMe)}
                                            onGateAllClear={() => handleMemberGateAllClear(m.userId)}
                                            onOpenCharSetting={() => openMemberCharSetting(m)}
                                            onRefreshAccount={myUserId === m.userId ? handleMyRefreshAccount : () => handleMemberRefreshAccount(m.userId)}
                                            onToggleGate={handleMemberToggleGate}
                                            onEdit={openEditModal}
                                            onReorder={handleMemberReorder}
                                            onSearch={handleCharacterSearch}
                                            searchLoading={accountSearchLoading}
                                            isDragEnabled={isDragEnabled} // 🔥 추가
                                            searchError={accountSearchErr}
                                            onReorderRoster={handleMemberRosterReorder}         // ✅ 테이블용 그대로
                                            onReorderCardRoster={handleMemberCardRosterReorder} // ✅ 추가
                                        />
                                    );
                                })}
                            </div>
                        )}

                        {!tasksLoading && !tasksErr && partyTasks && partyTasks.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-none sm:rounded-2xl border-x-0 sm:border-x-2 border-y-2 sm:border-y-2 border-dashed border-white/10 bg-[#16181D]">
                                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/5 mb-4">
                                    <UsersRound className="h-8 w-8 text-gray-500" strokeWidth={1.5} />
                                </div>
                                <h3 className="text-lg font-bold text-gray-200">
                                    아직 캐릭터를 등록한 파티원이 없습니다.
                                </h3>
                                <p className="mt-2 text-sm text-gray-500 leading-relaxed max-w-sm">
                                    파티원들이 캐릭터를 설정하고 숙제를 등록하면<br className="hidden sm:block" />
                                    이곳에서 실시간 진행 상황을 한눈에 볼 수 있어요.
                                </p>
                                {myUserId === party.ownerId && (
                                    <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                                        <button
                                            onClick={() => {
                                                setIsAddAccountOpen(true);
                                                setIsAccountListOpen(false);
                                            }}
                                            className="inline-flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 px-4 py-2.5 text-sm font-medium text-gray-200 hover:bg-white/10 hover:text-white transition-colors"
                                        >
                                            <Plus className="h-4 w-4" />
                                            캐릭터 등록하기
                                        </button>
                                        <button
                                            onClick={openInviteModal}
                                            className="inline-flex items-center gap-2 rounded-lg bg-[#5B69FF]/10 border border-[#5B69FF]/20 px-4 py-2.5 text-sm font-medium text-[#5B69FF] hover:bg-[#5B69FF]/20 transition-colors"
                                        >
                                            <Link2 className="h-4 w-4" />
                                            파티원 초대하기
                                        </button>
                                    </div>
                                )}
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
                            const targetMember = partyTasks?.find(
                                (m) => m.userId === charSettingTarget.memberUserId
                            );
                            const isMeTarget =
                                !!myUserId && charSettingTarget.memberUserId === myUserId;
                            const baseSummary =
                                (isMeTarget ? (currentAccount?.summary ?? null) : null) ??
                                targetMember?.summary ??
                                null;
                            const roster = baseSummary?.roster ?? [];
                            const rawVisible = targetMember?.visibleByChar ?? {};
                            const modalVisibleByChar: Record<string, boolean> = {};
                            for (const c of roster) {
                                modalVisibleByChar[c.name] = rawVisible[c.name] ?? true;
                            }

                            return (
                                <CharacterSettingModal
                                    open
                                    onClose={() => {
                                        setCharSettingOpen(false);
                                        setRefreshErr(null);
                                        setAccountSearchErr(null);
                                    }}
                                    refreshError={isMeTarget ? accountSearchErr : refreshErr}
                                    roster={roster}
                                    visibleByChar={modalVisibleByChar}
                                    onChangeVisible={(next) => {
                                        handleMemberChangeVisible(charSettingTarget.memberUserId, next);
                                    }}
                                    onDeleteAccount={
                                        isMeTarget ? () => setDeleteConfirmOpen(true) : undefined
                                    }
                                    onRefreshAccount={
                                        isMeTarget
                                            ? handleMyRefreshAccount
                                            : () => handleMemberRefreshAccount(charSettingTarget.memberUserId)
                                    }
                                />
                            );
                        })()}
                    </div>

                </div>
            </div>

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
                                <h2 className="text-base sm:text-lg font-bold text-white">
                                    파티 초대
                                </h2>
                            </div>
                            <button
                                type="button"
                                onClick={() => setInviteOpen(false)}
                                className="rounded-full p-1 text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="px-5 py-6 space-y-5 text-sm">
                            <p className="text-gray-300 leading-relaxed">
                                아래 초대 링크를 파티원에게 공유하세요.
                                <br />
                                링크를 통해 파티의 숙제 페이지로 바로 접속할 수 있습니다.
                            </p>

                            {inviteLoading && (
                                <div className="flex items-center justify-center gap-3 py-8 text-gray-400 bg-black/20 rounded-xl">
                                    <Loader2 className="h-5 w-5 animate-spin text-[#5B69FF]" />
                                    <span>초대 코드를 생성하는 중입니다...</span>
                                </div>
                            )}

                            {inviteErr && (
                                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-200 text-sm flex items-center gap-2">
                                    <X className="h-4 w-4 shrink-0" />
                                    {inviteErr}
                                </div>
                            )}

                            {!inviteLoading && !inviteErr && invite && (
                                <div className="space-y-4">
                                    {invite.url && (
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-gray-400 ml-1">
                                                초대 링크
                                            </label>
                                            <div className="flex items-center gap-2 p-2 rounded-xl bg-black/30 border border-white/10 focus-within:border-[#5B69FF]/50 transition-colors">
                                                <div className="flex-1 flex items-center gap-2 min-w-0 px-2">
                                                    <Link2 className="h-4 w-4 text-[#5B69FF] shrink-0" />
                                                    <span className="truncate text-sm text-gray-100 font-medium">
                                                        {invite.url}
                                                    </span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={handleCopyInvite}
                                                    className={`shrink-0 inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${inviteCopied
                                                        ? "bg-[#5B69FF] text-white"
                                                        : "bg-white/10 text-gray-200 hover:bg-white/15 hover:text-white"
                                                        }`}
                                                >
                                                    {inviteCopied ? (
                                                        <>
                                                            <Check
                                                                className="h-3.5 w-3.5"
                                                                strokeWidth={3}
                                                            />
                                                            복사됨
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Copy className="h-3.5 w-3.5" />
                                                            복사
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                    <button
                                        type="button"
                                        onClick={handleSmartShare}
                                        className="w-full mt-3 flex items-center justify-center gap-2 rounded-xl bg-[#5865F2] p-3 text-white hover:bg-[#4752C4] transition-colors shadow-lg shadow-[#5865F2]/20"
                                    >
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0 fill-current">
                                            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.086 2.157 2.419 0 1.334-.956 2.419-2.157 2.419zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.086 2.157 2.419 0 1.334-.946 2.419-2.157 2.419z" />
                                        </svg>
                                        Discord로 보내기
                                    </button>
                                    <p className="mt-2 text-[10px] text-gray-500 text-center">
                                        버튼을 누르면 링크가 복사되고 디스코드가 열립니다.
                                    </p>

                                    <div className="flex items-center justify-between text-xs text-gray-400 bg-white/5 px-3 py-2 rounded-lg">
                                        <span className="flex items-center gap-1.5">
                                            <span>초대 코드:</span>
                                            <span className="font-mono text-sm font-bold text-[#5B69FF]">
                                                {invite.code}
                                            </span>
                                        </span>
                                        {invite.expiresAt && (
                                            <span>만료: {invite.expiresAt}</span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {shareModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-[#1E2028] border border-white/10 shadow-2xl animate-in zoom-in-95 duration-200">

                        <button
                            onClick={() => setShareModalOpen(false)}
                            className="absolute top-3 right-3 p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/5 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="p-6 pt-8 text-center">
                            <div className="mx-auto w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mb-5 ring-1 ring-emerald-500/20 shadow-[0_0_20px_rgba(52,211,153,0.15)]">
                                <Check className="w-8 h-8" strokeWidth={3} />
                            </div>

                            <h3 className="text-xl font-bold text-white mb-2">링크 복사 완료!</h3>

                            <div className="text-sm text-gray-300 leading-relaxed space-y-1 mb-8">
                                <p>초대 링크가 클립보드에 복사되었습니다.</p>
                                <p className="text-gray-400 text-xs">
                                    이제 디스코드를 열고 <span className="text-[#5B69FF] font-bold bg-[#5B69FF]/10 px-1 rounded">Ctrl + V</span> 로 붙여넣으세요.
                                </p>
                            </div>

                            <div className="space-y-3">
                                <button
                                    onClick={launchDiscordApp}
                                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold transition-all shadow-lg shadow-[#5865F2]/25 active:scale-[0.98]"
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="fill-white shrink-0">
                                        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.086 2.157 2.419 0 1.334-.956 2.419-2.157 2.419zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.086 2.157 2.419 0 1.334-.946 2.419-2.157 2.419z" />
                                    </svg>
                                    디스코드 앱 열기
                                </button>

                                <button
                                    onClick={launchDiscordWeb}
                                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-medium transition-colors text-sm"
                                >
                                    웹 브라우저로 열기
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {deleteConfirmOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-[#1E2028] border border-white/10 shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-6 text-center">
                            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 text-red-500">
                                <AlertTriangle className="h-7 w-7" />
                            </div>

                            <h3 className="text-lg font-bold text-white mb-2">
                                계정을 삭제하시겠습니까?
                            </h3>

                            <p className="text-sm text-gray-400 leading-relaxed mb-6">
                                현재 선택된 계정의 모든 캐릭터와<br />
                                숙제 설정 데이터가 삭제됩니다.<br />
                                <span className="text-red-400/80 text-xs mt-1 block">
                                    (이 작업은 되돌릴 수 없습니다)
                                </span>
                            </p>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setDeleteConfirmOpen(false)}
                                    className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-medium transition-colors text-sm"
                                >
                                    취소
                                </button>
                                <button
                                    onClick={() => {
                                        setDeleteConfirmOpen(false);
                                        handleMyDeleteAccount();
                                    }}
                                    className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold transition-colors text-sm shadow-lg shadow-red-500/20"
                                >
                                    삭제하기
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}


            <EmptyCharacterState
                open={isAddAccountOpen}
                onClose={() => {
                    setIsAddAccountOpen(false);
                    setAccountSearchErr(null);
                }}
                loading={accountSearchLoading}

                error={accountSearchErr}

                onSearch={async (nickname) => {
                    const success = await handleCharacterSearch(nickname);
                    if (success) {
                        setIsAddAccountOpen(false);
                    }
                }}
            />
        </div>
    );
}

function SortableStripWrapper({
    id,
    children,
}: {
    id: string;
    children: (dragHandleProps: Record<string, any>) => React.ReactNode;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
        useSortable({ id });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.65 : 1,
        zIndex: isDragging ? 20 : 1,
        position: isDragging ? "relative" : "static",
    };

    return (
        <div ref={setNodeRef} style={style}>
            {children({ ...attributes, ...listeners })}
        </div>
    );
}

function PartyMemberBlock({
    partyId,
    onReorderTable,
    onReorderRoster,
    member,
    filteredPrefs,
    viewTableOrder,
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
    isDragEnabled,
    onReorderCardRoster,

}: {
    partyId: number;
    member: PartyMemberTasks;
    onReorderTable: (userId: string, newOrder: string[]) => void;
    filteredPrefs: Record<string, CharacterTaskPrefs>;
    viewTableOrder: string[];
    isMe: boolean;
    currentAccount: SavedAccount | null;
    onlyRemain: boolean;
    isCardView: boolean;
    onAutoSetup: (isMe: boolean) => void;
    onGateAllClear: () => void;
    onOpenCharSetting: () => void;
    onToggleGate: (userId: string, charName: string, raidName: string, gate: number, currentGates: number[], allGates: number[]) => void;
    onEdit: (m: PartyMemberTasks, c: RosterCharacter) => void;
    onReorder: (userId: string, charName: string, newOrder: string[]) => void;
    onSearch?: (name: string) => Promise<boolean>;
    searchLoading?: boolean;
    searchError?: string | null;
    onRefreshAccount: () => Promise<void>;
    selectedRaids: string[];
    onReorderRoster: (userId: string, mergedRosterOrder: string[]) => void;
    isDragEnabled: boolean;
    onReorderCardRoster: (userId: string, mergedCardOrder: string[]) => void; // ✅ 추가
}) {
    const [isExpanded, setIsExpanded] = useState(true);
    const [searchInput, setSearchInput] = useState("");
    const [showPermissionError, setShowPermissionError] = useState(false); // 🔥 모달 상태 추가

    const storageKey = `party_expand_state_v1:${partyId}:${member.userId}`;
    // 🔥 권한 체크 로직: 내가 내 것을 보거나, 상대방이 권한을 허용했을 때만 true
    const canEdit = isMe || member.canOthersEdit === true;
    const charSensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
    );

    const withEditAuth = <T extends (...args: any[]) => any>(fn: T) => {
        return (...args: Parameters<T>): ReturnType<T> | void => {
            if (!canEdit) {
                setShowPermissionError(true);
                return;
            }
            return fn(...args); // ✅ 정상 작동
        };
    };

    useEffect(() => {
        const saved = localStorage.getItem(storageKey);
        if (saved !== null) {
            setIsExpanded(saved === 'true');
        }
    }, [storageKey]);

    const handleToggleExpand = () => {
        const nextState = !isExpanded;
        setIsExpanded(nextState);
        localStorage.setItem(storageKey, String(nextState));
    };

    const handleLocalSearch = async (e: React.FormEvent) => {
        e.preventDefault();

        // 검색 전 권한 체크
        if (!canEdit) {
            setShowPermissionError(true); // alert 대신 모달 띄우기
            return;
        }

        if (onSearch && searchInput.trim()) {
            await onSearch(searchInput);
        }
    };



    const baseSummary = isMe && currentAccount?.summary ? currentAccount.summary : member.summary;
    const visibleRoster = baseSummary?.roster?.filter((c) => member.visibleByChar?.[c.name] ?? true) ?? [];
    const sortedRoster = [...visibleRoster].sort((a, b) => (b.itemLevelNum ?? 0) - (a.itemLevelNum ?? 0));
    const memberSummary = computeMemberSummary({ ...member, summary: baseSummary });
    const isRaidFilterActive = selectedRaids.length > 0;
    const defaultSortedRoster = useMemo(
        () => [...visibleRoster].sort((a, b) => (b.itemLevelNum ?? 0) - (a.itemLevelNum ?? 0)),
        [visibleRoster]
    );


    const tableOrderedRoster = useMemo(
        () => applyRosterOrder(defaultSortedRoster, member.rosterOrder),
        [defaultSortedRoster, member.rosterOrder]
    );

    const cardOrderedRoster = useMemo(
        () => applyRosterOrder(defaultSortedRoster, member.cardRosterOrder),
        [defaultSortedRoster, member.cardRosterOrder]
    );


    const tableRosterForView = isRaidFilterActive
        ? tableOrderedRoster.filter((c) => {
            const prefs = filteredPrefs?.[c.name];
            return Object.values(prefs?.raids ?? {}).some((p) => p?.enabled);
        })
        : tableOrderedRoster;

    const cardRosterForView = isRaidFilterActive
        ? cardOrderedRoster.filter((c) => {
            const prefs = filteredPrefs?.[c.name];
            return Object.values(prefs?.raids ?? {}).some((p) => p?.enabled);
        })
        : cardOrderedRoster;


    // const rosterForView = isRaidFilterActive
    //     ? orderedRoster.filter((c) => {
    //         const prefs = filteredPrefs?.[c.name];
    //         const raids = prefs?.raids ?? {};
    //         return Object.values(raids).some((p) => p?.enabled);
    //     })
    //     : orderedRoster;

    const tablePrefsByChar = useMemo(() => {
        if (!onlyRemain) return filteredPrefs;

        const next: Record<string, CharacterTaskPrefs> = {};

        for (const [charName, pref] of Object.entries(filteredPrefs)) {
            const raids = pref.raids ?? {};
            const filteredRaids: any = {};

            for (const [raidName, raidPref] of Object.entries(raids as any)) {
                if (!(raidPref as any)?.enabled) continue;

                const info = raidInformation[raidName];
                const diff = (info?.difficulty as any)?.[(raidPref as any).difficulty];
                if (!diff) continue;

                const gatesDef = diff.gates ?? [];
                if (!gatesDef.length) {
                    filteredRaids[raidName] = raidPref;
                    continue;
                }

                const lastGateIndex = gatesDef.reduce(
                    (max: number, g: any) => (g.index > max ? g.index : max),
                    gatesDef[0].index
                );

                const gates = (raidPref as any).gates ?? [];
                const isCompleted = gates.includes(lastGateIndex);

                if (isCompleted) continue;

                filteredRaids[raidName] = raidPref;
            }

            const nextOrder = pref.order?.filter((r) => filteredRaids[r]) ?? Object.keys(filteredRaids);

            next[charName] = {
                ...pref,
                raids: filteredRaids,
                order: nextOrder,
            };
        }

        return next;
    }, [filteredPrefs, onlyRemain]);

    const tableRoster = useMemo(() => {
        // 🔥 tableRosterForView를 기반으로 필터링
        if (!isRaidFilterActive && !onlyRemain) return tableRosterForView;

        return tableRosterForView.filter((c) => {
            const pref = tablePrefsByChar[c.name];
            if (!pref?.raids) return false;
            return Object.values(pref.raids as any).some((r: any) => r?.enabled);
        });
    }, [tableRosterForView, tablePrefsByChar, isRaidFilterActive, onlyRemain]);

    if (visibleRoster.length === 0) {
        return (
            <div className="rounded-none sm:rounded-xl border-x-0 sm:border border-white/10 bg-[#16181D] overflow-hidden relative">
                <div className="flex items-center gap-3 px-4 py-5 ">
                    <MemberAvatar member={{ id: member.userId, name: member.name, image: member.image, role: "member" }} className="h-8 w-8 rounded-full border border-black/50" />
                    <span className="font-semibold text-xl text-gray-200">{member.name || "이름 없음"}</span>
                </div>
                <div className="px-4 pb-4">
                    {isMe ? (
                        <div className="w-full py-10 sm:py-16 px-4 sm:px-6 flex flex-col items-center justify-center text-center bg-[#16181D] border-x-0 sm:border-x-2 border-y-2 sm:border-y-2 border-dashed border-white/10 rounded-none sm:rounded-xl animate-in fade-in zoom-in-95 duration-500">
                            <div className="relative mb-6">
                                <div className="absolute inset-0 bg-[#5B69FF] blur-[40px] opacity-20 rounded-full" />
                                <div className="relative w-16 h-16 sm:w-20 sm:h-20 bg-[#1E222B] rounded-full flex items-center justify-center border border-white/10 shadow-xl">
                                    <span className="text-sm sm:text-base font-semibold text-[#5B69FF]">LOA</span>
                                </div>
                                <div className="absolute -right-2 -bottom-2 bg-[#16181D] px-2 py-0.5 rounded-full border border-white/10">
                                    <span className="text-[10px] text-gray-400">검색</span>
                                </div>
                            </div>
                            <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 sm:mb-3">
                                원정대 캐릭터를 불러오세요
                            </h2>
                            <p className="text-gray-400 max-w-md mb-6 sm:mb-8 leading-relaxed text-[12px] sm:text-base">
                                아직 등록된 캐릭터 데이터가 없습니다.<br />
                                <span className="text-gray-400">대표 캐릭터 닉네임을 입력하면 전투정보실에서 정보를 가져옵니다.</span>
                            </p>

                            <form onSubmit={handleLocalSearch} className="relative flex items-center w-full max-w-md">
                                <input
                                    type="text"
                                    placeholder="캐릭터 닉네임 입력"
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                    disabled={searchLoading}
                                    className="w-full h-11 sm:h-12 pl-4 pr-11 sm:pr-12 rounded-lg bg-[#0F1115] border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[#5B69FF] focus:ring-1 focus:ring-[#5B69FF] transition-all disabled:opacity-50"
                                />
                                <button
                                    type="submit"
                                    disabled={searchLoading || !searchInput.trim()}
                                    className="absolute right-1.5 px-3 py-2 rounded-md bg-[#5B69FF] text-white hover:bg-[#4A57E6] disabled:bg-gray-700 disabled:text-gray-400 transition-colors text-xs sm:text-sm"
                                >
                                    {searchLoading ? (
                                        <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        "검색"
                                    )}
                                </button>
                            </form>

                            {searchError && (
                                <p className="mt-3 text-sm text-red-400">
                                    {searchError}
                                </p>
                            )}

                        </div>
                    ) : (
                        <div className="w-full py-10 sm:py-16 px-4 sm:px-6 flex flex-col items-center justify-center text-center bg-[#16181D] border-x-0 sm:border-x-2 border-y-2 sm:border-y-2 border-dashed border-white/10 rounded-none sm:rounded-xl">
                            <div className="relative mb-6">
                                <div className="absolute inset-0 bg-[#5B69FF] blur-[40px] opacity-10 rounded-full" />
                                <div className="relative w-16 h-16 sm:w-20 sm:h-20 bg-[#1E222B] rounded-full flex items-center justify-center border border-white/10 shadow-xl">
                                    <UsersRound className="w-8 h-8 sm:w-9 sm:h-9 text-[#5B69FF]" strokeWidth={1.5} />
                                </div>
                                <div className="absolute -right-2 -bottom-2 bg-[#16181D] px-2.5 py-1 rounded-full border border-white/10">
                                    <span className="text-[10px] font-medium text-gray-400">미등록</span>
                                </div>
                            </div>
                            <h2 className="text-xl sm:text-2xl font-bold text-white/90 mb-2 sm:mb-3">
                                캐릭터 정보가 없습니다
                            </h2>
                            <p className="text-gray-500 max-w-md leading-relaxed text-[12px] sm:text-base">
                                아직 이 파티원이 계정을 등록하지 않았습니다.
                                <br className="hidden sm:block" />
                                등록을 완료하면 이곳에 숙제 현황이 표시됩니다.
                            </p>
                        </div>
                    )}
                </div>

                {/* 🔥 빈 계정 상태에서도 검색 버튼 누를 때 권한 없으면 띄우는 모달 */}
                {showPermissionError && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4 animate-in fade-in duration-200">
                        <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-[#1E2028] border border-white/10 shadow-2xl animate-in zoom-in-95 duration-200">
                            <div className="p-6 text-center">
                                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 text-red-500">
                                    <AlertTriangle className="h-7 w-7" />
                                </div>
                                <h3 className="text-lg font-bold text-white mb-2">
                                    수정 권한 없음
                                </h3>
                                <p className="text-sm text-gray-400 leading-relaxed mb-6 break-keep">
                                    해당 파티원이 숙제 수정을<br />허용하지 않았습니다.
                                </p>
                                <button
                                    onClick={() => setShowPermissionError(false)}
                                    className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold transition-colors text-sm"
                                >
                                    확인
                                </button>
                            </div>
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
                    onToggleExpand={handleToggleExpand} // 접기/펼치기는 항상 작동
                />
            </PartyMemberSummaryBar>

            {isExpanded && (
                <div className="mt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    {isCardView ? (
                        <div className="flex flex-col gap-4">
                            {(() => {
                                const strips = cardRosterForView.map((c) => {
                                    const toggleWrapper = withEditAuth((rName: string, gate: number, curG: number[], allG: number[]) =>
                                        onToggleGate(member.userId, c.name, rName, gate, curG, allG)
                                    );

                                    const tasksAll = buildTasksForCharacter(c, filteredPrefs, { onlyRemain: false, onToggleGate: toggleWrapper });
                                    const tasksShown = onlyRemain
                                        ? buildTasksForCharacter(c, filteredPrefs, { onlyRemain: true, onToggleGate: toggleWrapper })
                                        : tasksAll;

                                    return { c, tasksAllLen: tasksAll.length, tasks: tasksShown };
                                });

                                const visibleStrips = onlyRemain ? strips.filter((s) => s.tasks.length > 0) : strips;
                                const showAllDone = onlyRemain && strips.some(s => s.tasksAllLen > 0) && visibleStrips.length === 0;

                                if (showAllDone) {
                                    return (
                                        <div className="flex flex-col items-center justify-center py-14 rounded-none sm:rounded-xl border-x-0 sm:border border-white/5 bg-white/[0.02] animate-in fade-in zoom-in-95 duration-300">
                                            <div className="relative mb-4">
                                                <div className="absolute inset-0 bg-emerald-500 blur-[24px] opacity-20 rounded-full" />

                                                <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[#16181D] border border-emerald-500/30 shadow-lg shadow-emerald-900/20">
                                                    <Check className="h-7 w-7 text-emerald-400" strokeWidth={3} />
                                                </div>
                                            </div>
                                            <h3 className="text-gray-200 font-bold text-base">모든 숙제 완료!</h3>
                                            <p className="text-gray-500 text-xs mt-1.5 font-medium">이번 주 숙제를 모두 끝내셨습니다</p>
                                        </div>
                                    );
                                }
                                const subset = visibleStrips.map((s) => s.c.name);

                                const handleCharDragEnd = (e: DragEndEvent) => {
                                    if (!canEdit) {
                                        setShowPermissionError(true);
                                        return;
                                    }

                                    const { active, over } = e;
                                    if (!over || active.id === over.id) return;

                                    const oldIndex = subset.indexOf(String(active.id));
                                    const newIndex = subset.indexOf(String(over.id));
                                    if (oldIndex === -1 || newIndex === -1) return;

                                    const newSubsetOrder = arrayMove(subset, oldIndex, newIndex);

                                    const baseFull =
                                        member.cardRosterOrder && member.cardRosterOrder.length > 0
                                            ? member.cardRosterOrder
                                            : defaultSortedRoster.map((c) => c.name);

                                    const merged = mergeReorderedSubset(baseFull, subset, newSubsetOrder);

                                    // ✅ 카드 순서만 저장
                                    onReorderCardRoster(member.userId, merged);

                                    // onReorderRoster(member.userId, merged); // ✅ 여기서 저장/WS 전송은 기존 로직 그대로 타게 됨
                                };

                                if (!isDragEnabled) {
                                    return visibleStrips.map(({ c, tasks }) => (
                                        <CharacterTaskStrip
                                            key={c.name}
                                            character={c}
                                            tasks={tasks}
                                            isDragEnabled={isDragEnabled}
                                            onEdit={withEditAuth(() => onEdit(member, c))}
                                            onReorder={withEditAuth((char, newOrder) => {
                                                if (selectedRaids.length > 0) return;
                                                onReorder(member.userId, char.name, newOrder);
                                            })}
                                        />
                                    ));
                                }

                                return (
                                    <DndContext
                                        sensors={charSensors}
                                        collisionDetection={closestCenter}
                                        onDragEnd={handleCharDragEnd}
                                    >
                                        <SortableContext items={subset} strategy={verticalListSortingStrategy}>
                                            <div className="flex flex-col gap-4">
                                                {visibleStrips.map(({ c, tasks }) => (
                                                    <SortableStripWrapper key={c.name} id={c.name}>
                                                        {(dragHandleProps) => (
                                                            <CharacterTaskStrip
                                                                character={c}
                                                                tasks={tasks}
                                                                isDragEnabled={isDragEnabled}
                                                                dragHandleProps={dragHandleProps} // ✅ 이름 영역이 캐릭터 드래그 핸들
                                                                onEdit={withEditAuth(() => onEdit(member, c))}
                                                                onReorder={withEditAuth((char, newOrder) => {
                                                                    if (selectedRaids.length > 0) return;
                                                                    onReorder(member.userId, char.name, newOrder);
                                                                })}
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
                            isRaidFilterActive ? null : (
                                onlyRemain ? (
                                    <div className="flex flex-col items-center justify-center py-14 rounded-none sm:rounded-xl border-x-0 sm:border border-white/5 bg-white/[0.02] animate-in fade-in zoom-in-95 duration-300">
                                        <div className="relative mb-4">
                                            <div className="absolute inset-0 bg-emerald-500 blur-[24px] opacity-20 rounded-full" />
                                            <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[#16181D] border border-emerald-500/30 shadow-lg shadow-emerald-900/20">
                                                <Check className="h-7 w-7 text-emerald-400" strokeWidth={3} />
                                            </div>
                                        </div>
                                        <h3 className="text-gray-200 font-bold text-base">모든 숙제 완료!</h3>
                                        <p className="text-gray-500 text-xs mt-1.5 font-medium">이번 주 숙제를 모두 끝내셨습니다</p>
                                    </div>
                                ) : null
                            )
                        ) : (
                            <TaskTable
                                roster={tableRoster}
                                prefsByChar={tablePrefsByChar}
                                tableOrder={viewTableOrder}
                                rosterOrder={member.rosterOrder ?? []} // ✅ 추가
                                isDragEnabled={isDragEnabled}
                                onReorderTable={withEditAuth((newOrder) => {
                                    if (selectedRaids.length > 0 || onlyRemain) return;
                                    onReorderTable(member.userId, newOrder);
                                })}
                                onReorderRoster={withEditAuth((newOrderSubset) => {
                                    // ✅ 필터/visible로 인해 tableRoster가 부분집합일 수 있으므로 merge
                                    const subset = tableRoster.map((c) => c.name);

                                    const baseFull =
                                        (member.rosterOrder && member.rosterOrder.length > 0)
                                            ? member.rosterOrder
                                            : defaultSortedRoster.map((c) => c.name);

                                    const merged = mergeReorderedSubset(baseFull, subset, newOrderSubset);

                                    onReorderRoster(member.userId, merged);
                                })}
                                onToggleGate={withEditAuth((char, raid, gate, cur, all) =>
                                    onToggleGate(member.userId, char, raid, gate, cur, all)
                                )}
                                onEdit={withEditAuth((c) => onEdit(member, c))}
                            />
                        )
                    )}
                </div>
            )}

            {/* 🔥 권한 부족 경고 모달 */}
            {showPermissionError && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-[#1E2028] border border-white/10 shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-6 text-center">
                            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 text-red-500">
                                <AlertTriangle className="h-7 w-7" />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">
                                수정 권한 없음
                            </h3>
                            <p className="text-sm text-gray-400 leading-relaxed mb-6 break-keep">
                                해당 파티원이 숙제 수정을<br />허용하지 않았습니다.
                            </p>
                            <button
                                onClick={() => setShowPermissionError(false)}
                                className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold transition-colors text-sm"
                            >
                                확인
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ... 아래 `PartyMemberSummaryBar`, `PartyMemberActions`, `MemberAvatar` 컴포넌트는 기존과 동일
type PartyMemberSummaryBarProps = {
    member: PartyMemberTasks;
    summary: RaidSummary;
    children?: ReactNode;
};

function PartyMemberSummaryBar({
    member,
    summary,
    children,
}: PartyMemberSummaryBarProps) {
    const memberAllCleared =
        summary.totalRemainingGold === 0 && summary.totalGold > 0;

    return (
        <div className="relative rounded-md py-2 flex flex-col sm:flex-row sm:items-center w-full">

            <div className="flex items-center justify-between w-full sm:w-auto">
                <div className="flex items-center gap-3">
                    <MemberAvatar
                        member={{
                            id: member.userId,
                            name: member.name,
                            image: member.image,
                            role: "member",
                        }}
                        className="h-8 w-8 sm:h-8 sm:w-8 rounded-full "
                    />
                    <div className="flex flex-col">
                        <span className="text-lg sm:text-base md:text-xl font-bold sm:font-semibold text-white truncate max-w-[150px] sm:max-w-none">
                            {member.name || "이름 없음"}
                        </span>
                    </div>
                </div>

                <div className="flex sm:hidden items-center gap-1">
                    {children}
                </div>
            </div>

            <div className="mt-3 sm:mt-0 sm:ml-4 flex items-center gap-4 text-sm sm:text-base min-w-0">
                <span className="hidden sm:inline h-4 w-px bg-white/10 " />
                <div className="flex items-baseline gap-1.5">
                    <span className="font-semibold text-sm sm:text-base pr-1">
                        남은 숙제
                    </span>
                    <AnimatedNumber
                        value={summary.totalRemainingTasks}
                        className="text-gray-400 text-xs sm:text-sm font-semibold"
                    />
                </div>
                <span className="hidden sm:inline h-4 w-px bg-white/10 " />
                <div className="flex items-baseline gap-1.5">
                    <span className="font-semibold text-sm sm:text-base pr-1">
                        숙제 남은 캐릭터
                    </span>
                    <AnimatedNumber
                        value={summary.remainingCharacters}
                        className="text-gray-400 text-xs sm:text-sm font-semibold"
                    />
                </div>
                <span className="hidden sm:inline h-4 w-px bg-white/10 " />
                <div className="flex items-baseline gap-1.5">
                    <span className="font-semibold text-sm sm:text-base pr-1">
                        남은 골드
                    </span>
                    <div
                        className={[
                            "inline-flex items-baseline justify-end",
                            "min-w-[50px]",
                            "text-xs sm:text-sm font-semibold",
                            "font-mono tabular-nums",
                            memberAllCleared
                                ? "line-through decoration-gray-300 decoration-1 text-gray-400"
                                : "text-gray-400",
                        ].join(" ")}
                    >
                        <AnimatedNumber
                            value={
                                memberAllCleared
                                    ? summary.totalGold
                                    : summary.totalRemainingGold
                            }
                        />
                        <span className="ml-0.5 text-[0.75em]">g</span>
                    </div>
                </div>
            </div>

            <div className="hidden sm:flex ml-auto items-center gap-2">
                {children}
            </div>

        </div>
    );
}

type PartyMemberActionsProps = {
    onAutoSetup: () => void;
    onGateAllClear: () => void;
    onOpenCharSetting: () => void;
    onRefreshAccount: () => Promise<void> | void;
    isExpanded: boolean;
    onToggleExpand: () => void;
};

function PartyMemberActions({
    onAutoSetup,
    onGateAllClear,
    onOpenCharSetting,
    onRefreshAccount,
    isExpanded,
    onToggleExpand,
}: PartyMemberActionsProps) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [showAutoSetupSettings, setShowAutoSetupSettings] = useState(false);
    const [autoSetupCharCount, setAutoSetupCharCount] = useState<number>(() => {
        if (typeof window === "undefined") return 6;
        try {
            const saved = localStorage.getItem("raidTaskAutoSetupCount");
            return saved ? Number(saved) : 6;
        } catch {
            return 6;
        }
    });


    useEffect(() => {
        try {
            localStorage.setItem("raidTaskAutoSetupCount", String(autoSetupCharCount));
        } catch { }
    }, [autoSetupCharCount]);

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
        try {
            setIsRefreshing(true);
            await onRefreshAccount();
        } catch (error) {
            console.error("계정 업데이트 실패:", error);
        } finally {
            setIsRefreshing(false);
        }
    };

    return (
        <div className="flex items-center gap-1 sm:gap-2" ref={menuRef}>
            <div className="relative">
                <button
                    onClick={handleRefreshClick}
                    disabled={isRefreshing}
                    className={`p-2 rounded-lg transition-colors ${isRefreshing ? "text-indigo-400 cursor-not-allowed" : "text-gray-400 hover:text-white hover:bg-white/5"}`}
                    title="계정 정보 업데이트"
                >
                    <RefreshCcw className={`w-5 h-5 ${isRefreshing ? "animate-spin" : ""}`} />
                </button>

                <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className={`p-2 rounded-lg transition-colors ${isMenuOpen ? "bg-white/10 text-white" : "text-gray-400 hover:text-white hover:bg-white/5"}`}
                    title="메뉴 열기"
                >
                    <MoreVertical className="w-5 h-5" />
                </button>

                {isMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-52 z-50 origin-top-right rounded-xl bg-[#1E2028] border border-white/10 shadow-xl overflow-visible animate-in fade-in zoom-in-95 duration-150">
                        <div className="relative">
                            {/* 자동 세팅 버튼 그룹 */}
                            <div className="relative group">
                                <button
                                    onClick={() => {
                                        onAutoSetup();
                                        setIsMenuOpen(false);
                                    }}
                                    className="w-full h-14 text-left px-4 hover:bg-white/5 flex items-center gap-3 transition-colors rounded-t-xl"
                                >
                                    <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                                        <Wand2 className="w-4 h-4" />
                                    </div>
                                    <div className="flex flex-col justify-center">
                                        <span className="block text-sm font-medium text-gray-200 leading-tight">자동 세팅</span>
                                        <span className="block text-[10px] text-gray-500 mt-0.5 leading-tight">상위 {autoSetupCharCount}캐릭 세팅</span>
                                    </div>
                                </button>

                                {/* 톱니바퀴 아이콘 */}
                                <div
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowAutoSetupSettings(!showAutoSetupSettings);
                                    }}
                                    className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/10 transition-colors cursor-pointer z-[60]"
                                >
                                    <Settings className="w-3 h-3" />
                                </div>

                                {/* 🔥 설정 팝업창: z-index를 최상위급으로 높이고 위치 고정 */}
                                {showAutoSetupSettings && (
                                    <div className="absolute top-[80%] right-2 mt-2 w-56 p-4 rounded-xl bg-[#1E2028] border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.7)] z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="text-xs font-bold text-white">자동 세팅 설정</h4>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setShowAutoSetupSettings(false);
                                                }}
                                                className="text-gray-400 hover:text-white"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <div className="flex items-center justify-between gap-4 mb-4">
                                            <span className="text-[11px] text-gray-400">적용할 캐릭터 수</span>
                                            <input
                                                type="number"
                                                min={1}
                                                max={24}
                                                value={autoSetupCharCount}
                                                onChange={(e) => setAutoSetupCharCount(Number(e.target.value))}
                                                className="w-12 h-7 bg-[#0F1115] border border-white/10 rounded-md px-1 text-xs text-center text-white focus:outline-none focus:border-[#5B69FF] appearance-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                            />
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onAutoSetup();
                                                setShowAutoSetupSettings(false);
                                                setIsMenuOpen(false);
                                            }}
                                            className="w-full py-2 bg-[#5B69FF] hover:bg-[#4A57E6] text-white text-[11px] font-bold rounded-lg transition-colors"
                                        >
                                            적용하기
                                        </button>
                                        {/* 화살표 위치 조정 */}
                                        <div className="absolute -top-1.5 right-3 w-3 h-3 bg-[#1E2028] border-t border-l border-white/10 rotate-45" />
                                    </div>
                                )}
                            </div>

                            {/* 나머지 버튼들... */}
                            <button
                                onClick={() => {
                                    onGateAllClear();
                                    setIsMenuOpen(false);
                                }}
                                className="w-full h-14 text-left px-4 hover:bg-white/5 flex items-center gap-3 transition-colors"
                            >
                                <div className="p-1.5 rounded-lg bg-red-500/10 text-red-400 shrink-0">
                                    <RefreshCcw className="w-4 h-4" />
                                </div>
                                <div className="flex flex-col justify-center">
                                    <span className="block text-sm font-medium text-gray-200 leading-tight">관문 초기화</span>
                                    <span className="block text-[10px] text-gray-500 mt-0.5 leading-tight">모든 체크 해제</span>
                                </div>
                            </button>

                            <button
                                onClick={() => {
                                    onOpenCharSetting();
                                    setIsMenuOpen(false);
                                }}
                                className="w-full h-14 text-left px-4 hover:bg-white/5 flex items-center gap-3 transition-colors rounded-b-xl"
                            >
                                <div className="p-1.5 rounded-lg bg-gray-700/50 text-gray-400 shrink-0">
                                    <Settings className="w-4 h-4" />
                                </div>
                                <span className="text-sm font-medium text-gray-300">캐릭터 설정</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <button
                onClick={onToggleExpand}
                className="hover:bg-white/5 hover:border-white/20 inline-flex items-center justify-center p-2 rounded-md bg-white/[.04] border border-white/10 text-gray-400 hover:text-white transition-colors"
                title={isExpanded ? "접기" : "펼치기"}
            >
                {isExpanded ? (
                    <ChevronUp className="h-5 w-5" />
                ) : (
                    <ChevronDown className="h-5 w-5" />
                )}
            </button>
        </div>
    );
}

function MemberAvatar({
    member,
    className,
}: {
    member: PartyMember;
    className?: string;
}) {
    return (
        <div
            className={`group/avatar relative flex items-center justify-center overflow-hidden ${className}`}
        >
            {member.image ? (
                <img
                    src={member.image}
                    alt={member.name || ""}
                    className="h-full w-full rounded-full object-cover bg-gray-800"
                />
            ) : (
                <div className="flex h-full w-full items-center justify-center rounded-full bg-gray-700 text-[10px] text-gray-200">
                    {(member.name || "?").slice(0, 2)}
                </div>
            )}
        </div>
    );
}