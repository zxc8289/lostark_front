// src/app/party-tasks/[partyId]/page.tsx
"use client";

import {
    useEffect,
    useState,
    useRef,
    useCallback,
    type ReactNode,
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
} from "lucide-react";

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

/** 파티원 한 명의 "내 숙제 상태" */
type PartyMemberTasks = {
    userId: string;
    name: string | null;
    image: string | null;
    nickname: string;
    summary: CharacterSummary | null;
    prefsByChar: Record<string, CharacterTaskPrefs>;
    visibleByChar: Record<string, boolean>;
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
    tableView?: boolean;
};

type SavedAccount = {
    id: string;
    nickname: string;
    summary: CharacterSummary;
    isPrimary?: boolean; // 대표 계정
    isSelected?: boolean; // 현재 선택된 계정 (MyTasks와 동일)
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

// MyTasks와 동일한 계정 저장 키
const ACCOUNTS_KEY = "raidTaskAccounts";
const ACTIVE_ACCOUNT_KEY = "raidTaskActiveAccount";

/* ─────────────────────────────
 * 공통 함수
 * ───────────────────────────── */

/** 카드 뷰에서 한 캐릭터에 대한 TaskCard 리스트 생성 (MyTasks의 buildTasksFor와 동일 스타일) */
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

    // 1) 기본 순서 후보 만들기
    const baseRaidNames =
        prefs.order?.filter((r) => prefs.raids[r]) ?? Object.keys(prefs.raids);

    // 2) order가 없는 경우에만 레벨 기준 정렬
    const raidNames = prefs.order
        ? baseRaidNames
        : [...baseRaidNames].sort(
            (a, b) => getRaidBaseLevel(b) - getRaidBaseLevel(a)
        );

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

        // 카드 뷰에서만 "남은 숙제만 보기" 필터 적용
        if (options?.onlyRemain) {
            if (gatesDef.length) {
                const lastGateIndex = gatesDef.reduce(
                    (max, g) => (g.index > max ? g.index : max),
                    gatesDef[0].index
                );
                const gates = p.gates ?? [];
                const isCompleted = gates.includes(lastGateIndex);

                if (isCompleted) {
                    // 마지막 관문까지 완료된 레이드는 카드에서 숨김
                    continue;
                }
            }
        }

        // 현재 선택된 관문 기준 골드 합계
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

/** 파티원 단위 레이드 요약 */
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

    const partyId = Array.isArray(params.partyId)
        ? params.partyId[0]
        : params.partyId;

    const { data: session, status } = useSession();

    const myUserId =
        (session as any)?.user?.id ??
        (session as any)?.userId ??
        (session as any)?.user?.discordId ??
        null;

    const [party, setParty] = useState<PartyDetail | null>(null);
    const [partyLoading, setPartyLoading] = useState(true);
    const [partyErr, setPartyErr] = useState<string | null>(null);

    // 파티 숙제 상태
    const [partyTasks, setPartyTasks] = useState<PartyMemberTasks[] | null>(null);
    const [tasksLoading, setTasksLoading] = useState(false);
    const [tasksErr, setTasksErr] = useState<string | null>(null);

    // 필터 (파티별 localStorage)
    const [onlyRemain, setOnlyRemain] = useState(false);
    const [tableView, setTableView] = useState(false);

    const wsRef = useRef<WebSocket | null>(null);
    const [wsReady, setWsReady] = useState(false);

    // 레이드 설정(숙제 편집) 모달 상태
    const [editOpen, setEditOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<{
        memberUserId: string;
        charName: string;
        character: RosterCharacter;
    } | null>(null);
    const [editInitial, setEditInitial] =
        useState<CharacterTaskPrefs | null>(null);

    const [charSettingOpen, setCharSettingOpen] = useState(false);
    const [charSettingTarget, setCharSettingTarget] =
        useState<{ memberUserId: string; roster: RosterCharacter[] } | null>(null);

    // 파티 코드 모달 상태
    const [inviteOpen, setInviteOpen] = useState(false);
    const [inviteLoading, setInviteLoading] = useState(false);
    const [inviteErr, setInviteErr] = useState<string | null>(null);
    const [invite, setInvite] = useState<PartyInvite | null>(null);
    const [inviteCopied, setInviteCopied] = useState(false);
    const [partySettingOpen, setPartySettingOpen] = useState(false);

    /* ──────────────────────────
     *  계정 드롭다운 (MyTasks와 동일 기능)
     * ────────────────────────── */
    const [accountSearchLoading, setAccountSearchLoading] = useState(false);
    const [accountSearchErr, setAccountSearchErr] = useState<string | null>(null);
    const [accounts, setAccounts] = useState<SavedAccount[]>([]);
    const [isAccountListOpen, setIsAccountListOpen] = useState(false);
    const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);

    const currentAccount =
        accounts.find((a) => a.isSelected) ??
        accounts.find((a) => a.isPrimary) ??
        accounts[0] ??
        null;

    /* ─────────────────────────────
     * 파티 숙제 재로딩 공통 함수
     *  - 초기 로딩
     *  - activeAccount 변경
     *  - 계정 삭제/추가 후
     *  - WS(activeAccountUpdated) 수신 시
     * ───────────────────────────── */
    const reloadPartyTasks = useCallback(
        async (showSpinner: boolean) => {
            if (!party || status !== "authenticated") return;

            const partyIdNum = party.id;
            if (!partyIdNum) return;

            if (showSpinner) {
                setTasksLoading(true);
            }
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
                if (showSpinner) {
                    setTasksLoading(false);
                }
            }
        },
        [party, status]
    );



    type RaidStatePatch = Partial<RaidStateFromServer> & {
        deleteAccountId?: string;
    };

    async function saveRaidState(partial: RaidStatePatch) {
        try {
            const res = await fetch("/api/raid-tasks/state", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(partial),
            });

            let payload: any = null;
            const text = await res.text();
            try {
                payload = text ? JSON.parse(text) : null;
            } catch {
                payload = text;
            }

            if (!res.ok) {
                console.error(
                    "[raid_task_state 저장 실패]",
                    res.status,
                    res.statusText,
                    payload
                );
            } else {
                console.log("[raid_task_state 저장 성공]", partial);
            }
        } catch (e) {
            console.error("raid_task_state 저장 실패 (네트워크 에러):", e);
        }
    }

    async function saveActiveAccountToServer(
        partyId: number,
        activeAccountId: string | null
    ) {
        try {
            const res = await fetch(`/api/party-tasks/${partyId}/active-account`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ activeAccountId }),
            });
            if (!res.ok) {
                console.error(
                    "[파티 activeAccount 저장 실패]",
                    res.status,
                    res.statusText,
                    await res.text()
                );
            } else {
                console.log("[파티 activeAccount 저장 성공]", partyId, activeAccountId);
            }
        } catch (e) {
            console.error("파티 activeAccount 저장 실패 (네트워크 에러):", e);
        }
    }

    function sendMemberUpdateWS(
        partyId: number,
        userId: string,
        prefsByChar: Record<string, CharacterTaskPrefs>,
        visibleByChar?: Record<string, boolean>
    ) {
        const ws = wsRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN) return;

        const payload = {
            type: "gateUpdate" as const,
            partyId,
            userId,
            prefsByChar,
            visibleByChar,
        };

        try {
            ws.send(JSON.stringify(payload));
        } catch (e) {
            console.error("[WS] send memberUpdate failed:", e);
        }
    }

    const handleCharacterSearch = async (name: string): Promise<void> => {
        const trimmed = name.trim();
        if (!trimmed) return;

        setAccountSearchLoading(true);
        setAccountSearchErr(null);

        try {
            const r = await fetch(
                `/api/lostark/character/${encodeURIComponent(trimmed)}`,
                { cache: "no-store" }
            );

            if (!r.ok) {
                throw new Error("캐릭터 정보를 불러오지 못했습니다.");
            }

            const json = (await r.json()) as CharacterSummary;

            // 🔹 파티 화면이 아닌 경우(이 페이지에서는 거의 없겠지만) - 그냥 로컬 계정만 갱신
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
                        const id =
                            typeof crypto !== "undefined" && "randomUUID" in crypto
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

                return;
            }

            // 🔹 파티 화면인 경우: applyActiveAccount를 통해
            //     1) raid_task_state 저장
            //     2) 파티 activeAccount 저장
            //     3) WS 브로드캐스트
            //   순서대로 처리하게 만든다.
            const baseAccounts = accounts ?? [];

            const existingIdx = baseAccounts.findIndex(
                (a) => a.nickname.toLowerCase() === trimmed.toLowerCase()
            );

            let newAcc: SavedAccount;
            let nextAccountsBase: SavedAccount[];

            if (existingIdx >= 0) {
                // 이미 있는 계정이면 summary만 갱신하고, 선택은 applyActiveAccount가 처리
                nextAccountsBase = baseAccounts.map((a, i) =>
                    i === existingIdx ? { ...a, summary: json } : a
                );
                newAcc = nextAccountsBase[existingIdx];
            } else {
                // 새 계정 생성
                const id =
                    typeof crypto !== "undefined" && "randomUUID" in crypto
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

            // 🔸 여기서부터가 핵심:
            //    applyActiveAccount 내부에서
            //      - await saveRaidState(...)
            //      - await saveActiveAccountToServer(...)
            //      - WS.send("activeAccountUpdate")
            //    순서로 실행됨
            const nextAccounts = await applyActiveAccount(
                newAcc,
                nextAccountsBase,
                party.id,
                myUserId,
                saveRaidState,
                saveActiveAccountToServer,
                wsRef.current
            );

            // 최종적으로 프론트 상태 갱신
            setAccounts(nextAccounts);

            // 내 화면은 바로 갱신하고,
            // 다른 파티원들은 WS를 통해 activeAccountUpdated 이벤트 받고 reloadPartyTasks 함
            void reloadPartyTasks(false);
        } catch (e: any) {
            setAccountSearchErr(e?.message ?? String(e));
        } finally {
            setAccountSearchLoading(false);
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

    // 두 번째 인자는 옵션으로 변경 (카드뷰에서는 baseSummary, 테이블에서는 member.summary 사용)
    const openMemberCharSetting = (
        member: PartyMemberTasks,
        baseSummary?: CharacterSummary | null
    ) => {
        const roster = baseSummary?.roster ?? member.summary?.roster ?? [];
        setCharSettingTarget({
            memberUserId: member.userId,
            roster,
        });
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
            // https / localhost 환경
            if (
                typeof navigator !== "undefined" &&
                navigator.clipboard &&
                (window.location.protocol === "https:" ||
                    window.location.hostname === "localhost" ||
                    window.location.hostname === "127.0.0.1")
            ) {
                await navigator.clipboard.writeText(text);
            } else if (typeof document !== "undefined") {
                // 폴백
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

    // 파일 상단에 SavedAccount 타입 이미 있어야 함
    async function applyActiveAccount(
        acc: SavedAccount,
        accounts: SavedAccount[],
        partyId: number,
        myUserId: string | null,
        saveRaidState: (patch: RaidStatePatch) => Promise<void>,
        saveActiveAccountToServer: (partyId: number, activeAccountId: string) => Promise<void>,
        ws: WebSocket | null
    ) {
        // 1) 프론트 로컬 상태용 next 계정 리스트
        const nextAccounts = accounts.map((a) =>
            a.id === acc.id
                ? { ...a, isSelected: true }
                : { ...a, isSelected: false }
        );

        // 대표 계정 하나 골라두기 (혹시 모를 fallback)
        const active =
            nextAccounts.find((a) => a.id === acc.id) ??
            nextAccounts.find((a) => a.isPrimary) ??
            nextAccounts[0] ??
            null;

        // 2) raid_task_state (전역) 먼저 저장
        await saveRaidState({
            accounts: nextAccounts,
            activeAccountId: active?.id ?? null,
        });

        // 3) 파티별 대표 계정 저장
        await saveActiveAccountToServer(partyId, acc.id);

        // 4) WebSocket 브로드캐스트 (DB 업데이트 끝난 뒤 보내기)
        if (ws && ws.readyState === WebSocket.OPEN && myUserId) {
            try {
                ws.send(
                    JSON.stringify({
                        type: "activeAccountUpdate",
                        partyId,
                        userId: myUserId,
                        activeAccountId: acc.id,
                    })
                );
            } catch (e) {
                console.error("[WS] send activeAccountUpdate failed:", e);
            }
        }

        return nextAccounts;
    }


    const handleMyDeleteAccount = () => {
        if (!party || !partyTasks || !myUserId || !currentAccount) return;

        const partyIdNum = party.id;
        const targetAccountId = currentAccount.id;

        // 현재 계정에 속한 캐릭터 이름들
        const namesToRemove = new Set(
            currentAccount.summary?.roster?.map((c) => c.name) ?? []
        );

        // 1) 파티 숙제 상태에서 "내 계정의 캐릭터들"만 정리 (기존 로직 그대로)
        const nextTasks: PartyMemberTasks[] = partyTasks.map((m) => {
            if (m.userId !== myUserId) return m;

            const prevPrefsByChar = m.prefsByChar ?? {};
            const prevVisibleByChar = m.visibleByChar ?? {};

            const nextPrefsByChar: Record<string, CharacterTaskPrefs> = {};
            for (const [charName, prefs] of Object.entries(prevPrefsByChar)) {
                // 현재 삭제하려는 계정에 속한 캐릭터면 제거
                if (!namesToRemove.has(charName)) {
                    nextPrefsByChar[charName] = prefs;
                }
            }

            const nextVisibleByChar: Record<string, boolean> = { ...prevVisibleByChar };
            for (const name of namesToRemove) {
                delete nextVisibleByChar[name];
            }

            return {
                ...m,
                prefsByChar: nextPrefsByChar,
                visibleByChar: nextVisibleByChar,
            };
        });

        setPartyTasks(nextTasks);

        // 정리된 내 row 찾아서 WS 브로드캐스트 + 파티용 DB 저장
        const me = nextTasks.find((m) => m.userId === myUserId);
        if (me) {
            sendMemberUpdateWS(
                partyIdNum,
                me.userId,
                me.prefsByChar,
                me.visibleByChar
            );

            void saveMemberPrefsToServer(
                partyIdNum,
                me.userId,
                me.prefsByChar,
                me.visibleByChar
            );
        }

        // 2) 전역 계정 목록에서도 현재 계정 제거 + active 계정 재지정
        if (accounts && accounts.length > 0) {
            // 지금 삭제되는 계정을 빼고 나머지만 남기기
            const filtered = accounts.filter((a) => a.id !== targetAccountId);

            // 새로 active로 사용할 계정 선택
            let nextActive: SavedAccount | null = null;
            if (filtered.length > 0) {
                // 남아 있는 계정 중에서 현재 선택된 계정이 있으면 유지
                nextActive =
                    filtered.find((a) => a.isSelected) ||
                    filtered.find((a) => a.isPrimary) ||
                    filtered[0];
            }

            const hasPrimaryAfter = filtered.some((a) => a.isPrimary);

            const nextAccounts: SavedAccount[] = filtered.map((a) => ({
                ...a,
                isSelected: nextActive ? a.id === nextActive.id : false,
                // 남은 계정 중에 primary가 없으면 nextActive를 primary로 승격
                isPrimary: hasPrimaryAfter
                    ? a.isPrimary
                    : nextActive
                        ? a.id === nextActive.id
                        : false,
            }));

            setAccounts(nextAccounts);

            // MyTasks에서 쓰고 있는 구조 그대로라면 이 패치로 계정이 완전히 삭제됨
            void saveRaidState({
                accounts: nextAccounts,
                activeAccountId: nextActive?.id ?? null,
                deleteAccountId: targetAccountId,
            });

            // 이 파티의 activeAccount도 갱신
            void saveActiveAccountToServer(
                partyIdNum,
                nextActive ? nextActive.id : null
            );

            // 다른 탭/창(같은 유저)에게도 WS로 알려주기
            if (
                wsRef.current &&
                wsRef.current.readyState === WebSocket.OPEN &&
                myUserId
            ) {
                try {
                    wsRef.current.send(
                        JSON.stringify({
                            type: "activeAccountUpdate",
                            partyId: partyIdNum,
                            userId: myUserId,
                            activeAccountId: nextActive?.id ?? null,
                        })
                    );
                } catch (e) {
                    console.error("[WS] send activeAccountUpdate (delete) failed:", e);
                }
            }
        }

        // 캐릭터 설정 모달 닫기
        setCharSettingOpen(false);

        // 🔹 계정 삭제 후, 서버 기준 숙제/요약 재로딩
        if (party) {
            void reloadPartyTasks(false);
        }
    };

    /** 내 계정 새로고침 (파티 화면에서 호출) */
    const handleMyRefreshAccount = async () => {
        if (!currentAccount) return;
        // 이미 위에서 정의된 handleCharacterSearch 재사용
        await handleCharacterSearch(currentAccount.nickname);
    };

    const handleSaveEdit = (nextPrefs: CharacterTaskPrefs) => {
        if (!party || !editTarget || !partyTasks) return;
        const partyIdNum = party.id;
        const { memberUserId, charName } = editTarget;

        // 1) next 상태 계산
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

        // 2) state 반영
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
        setTableView(false);
    };

    async function saveMemberPrefsToServer(
        partyId: number,
        userId: string,
        prefsByChar: Record<string, CharacterTaskPrefs>,
        visibleByChar?: Record<string, boolean>
    ) {
        try {
            const res = await fetch(`/api/party-tasks/${partyId}/raid-tasks`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(
                    visibleByChar
                        ? { userId, prefsByChar, visibleByChar }
                        : { userId, prefsByChar }
                ),
            });

            let payload: any = null;
            const text = await res.text();
            try {
                payload = text ? JSON.parse(text) : null;
            } catch {
                payload = text;
            }

            if (!res.ok) {
                console.error(
                    "[파티 숙제 저장 실패]",
                    res.status,
                    res.statusText,
                    payload
                );
            } else {
                console.log("[파티 숙제 저장 성공]", partyId, userId, payload);
            }
        } catch (e) {
            console.error("파티원 숙제 저장 실패 (네트워크 에러):", e);
        }
    }

    /** 파티원 관문 토글 (카드/테이블 공통) */
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

        // 1) 현재 state를 기준으로 next 상태 먼저 계산 (기존 로직 그대로)
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

            const newMember: PartyMemberTasks = {
                ...m,
                prefsByChar: updatedPrefsByChar,
            };

            return newMember;
        });

        // 2) state 반영 (optimistic UI)
        setPartyTasks(next);

        const updated = next.find((m) => m.userId === memberUserId);
        if (!updated) return;

        // 1) WebSocket으로 실시간 브로드캐스트
        sendMemberUpdateWS(
            partyIdNum,
            updated.userId,
            updated.prefsByChar,
            updated.visibleByChar
        );

        // 2) 항상 DB 저장
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

        const next: PartyMemberTasks[] = partyTasks.map((m) => {
            if (m.userId !== memberUserId) return m;

            // 🔹 기본은 서버에서 온 summary
            let roster = m.summary?.roster ?? [];

            // 🔹 내 줄 + currentAccount 선택되어 있으면 -> 그 계정의 roster 사용
            if (isMe && currentAccount?.summary?.roster) {
                roster = currentAccount.summary.roster;
            }

            if (!roster.length) return m;

            const { nextPrefsByChar, nextVisibleByChar } = buildAutoSetupForRoster(
                roster,
                m.prefsByChar ?? {}
            );

            // 🔹 기존 prefs/visible에 "현재 계정 캐릭터들만" 덮어쓰기
            return {
                ...m,
                prefsByChar: {
                    ...(m.prefsByChar ?? {}),
                    ...nextPrefsByChar,
                },
                visibleByChar: {
                    ...(m.visibleByChar ?? {}),
                    ...nextVisibleByChar,
                },
            };
        });

        setPartyTasks(next);

        const updated = next.find((m) => m.userId === memberUserId);
        if (updated) {
            // 1) WebSocket 브로드캐스트
            sendMemberUpdateWS(
                partyIdNum,
                updated.userId,
                updated.prefsByChar,
                updated.visibleByChar
            );

            // 2) DB 저장
            void saveMemberPrefsToServer(
                partyIdNum,
                updated.userId,
                updated.prefsByChar,
                updated.visibleByChar
            );
        }
    };

    /** 파티원 레이드 순서 재정렬 */
    const handleMemberReorder = (
        memberUserId: string,
        charName: string,
        newOrderIds: string[]
    ) => {
        if (!party || !partyTasks) return;
        const partyIdNum = party.id;

        // 1) next 상태 계산
        const next: PartyMemberTasks[] = partyTasks.map((m) => {
            if (m.userId !== memberUserId) return m;

            const memberPrefsByChar: Record<string, CharacterTaskPrefs> = {
                ...(m.prefsByChar ?? {}),
            };

            const curPrefsForChar: CharacterTaskPrefs =
                memberPrefsByChar[charName] ?? { raids: {} };

            // 기존에 있던 레이드 이름들
            const allRaidNames = Object.keys(curPrefsForChar.raids ?? {});

            // 드래그 결과로 온 순서 + 나머지(탈락된 애들) 뒤에 붙이기
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

    /** 파티원 관문 전체 초기화 (해당 파티원의 모든 캐릭터에 대해 gates만 초기화) */
    const handleMemberGateAllClear = (memberUserId: string) => {
        if (!party || !partyTasks) return;
        const partyIdNum = party.id;

        // 1) next 상태 계산
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

        // 2) state 반영
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

    // 🔹 파티별 필터 로컬스토리지에서 불러오기
    useEffect(() => {
        if (!party) return;
        if (typeof window === "undefined") return;

        try {
            const raw = localStorage.getItem(PARTY_FILTER_KEY(party.id));
            if (!raw) return;

            const saved = JSON.parse(raw) as SavedFilters;

            if (typeof saved.onlyRemain === "boolean") {
                setOnlyRemain(saved.onlyRemain);
            }
            if (typeof saved.tableView === "boolean") {
                setTableView(saved.tableView);
            }
        } catch (e) {
            console.error("파티 필터 불러오기 실패:", e);
        }
    }, [party]);

    // 🔹 필터 변경 시 파티별로 로컬스토리지에 저장
    useEffect(() => {
        if (!party) return;
        if (typeof window === "undefined") return;

        try {
            const toSave: SavedFilters = {
                onlyRemain,
                tableView,
            };
            localStorage.setItem(
                PARTY_FILTER_KEY(party.id),
                JSON.stringify(toSave)
            );
        } catch (e) {
            console.error("파티 필터 저장 실패:", e);
        }
    }, [onlyRemain, tableView, party]);

    /* ─────────────────────────────
     * 1차: 파티 기본 정보 불러오기
     * ───────────────────────────── */
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

                    const raidState = data.raidState;
                    if (
                        raidState?.accounts &&
                        Array.isArray(raidState.accounts) &&
                        raidState.accounts.length > 0
                    ) {
                        // 원본 훼손 방지용 복사
                        let accs = raidState.accounts.map((a) => ({ ...a })) as SavedAccount[];

                        const partyKey = String(data.id);
                        const partyActiveId =
                            raidState.activeAccountByParty?.[partyKey] ?? null;

                        // 1️⃣ 서버에 이미 저장된 값(파티별 activeAccount > 전역 activeAccount) 우선
                        let initialActiveId: string | null =
                            partyActiveId ?? raidState.activeAccountId ?? null;

                        // 2️⃣ 둘 다 없으면 → 대표 계정(isPrimary)이나 첫 번째 계정으로 기본값 설정
                        let shouldSaveDefault = false;
                        if (!initialActiveId) {
                            const primary = accs.find((a) => a.isPrimary);
                            const first = accs[0];
                            initialActiveId = primary?.id ?? first?.id ?? null;

                            if (initialActiveId) {
                                // “처음 들어와서 자동으로 골라준 경우” 표시
                                shouldSaveDefault = true;
                            }
                        }

                        // 3️⃣ 선택된 계정 플래그(isSelected) 세팅
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
    }, [status, partyId]);

    /* ─────────────────────────────
     * 2차: 파티원들의 "내 숙제 상태" 불러오기 (초기 1회 + party 변경 시)
     * ───────────────────────────── */
    useEffect(() => {
        if (!party || status !== "authenticated") return;
        void reloadPartyTasks(true);
    }, [party, status, reloadPartyTasks]);

    /* ─────────────────────────────
     * WebSocket 연결
     * ───────────────────────────── */
    useEffect(() => {
        if (!party || status !== "authenticated") return;
        if (typeof window === "undefined") return;

        const base =
            process.env.NEXT_PUBLIC_WS_URL ||
            (window.location.protocol === "https:"
                ? `wss://${window.location.host}`
                : `ws://${window.location.host}`);

        const url = `${base}/ws/party-tasks?partyId=${party.id}`;
        const ws = new WebSocket(url);

        wsRef.current = ws;

        ws.onopen = () => {
            setWsReady(true);
            console.log("[WS] connected:", url);
        };

        ws.onclose = () => {
            console.log("[WS] closed");
            setWsReady(false);
            if (wsRef.current === ws) {
                wsRef.current = null;
            }
        };

        ws.onerror = (err) => {
            console.error("[WS] error:", err);
        };

        ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data as string);
                console.log("[WS] message from server:", msg);

                if (msg.type === "memberUpdated" && msg.partyId === party.id) {
                    setPartyTasks((prev) => {
                        if (!prev) return prev;
                        const exists = prev.some((m) => m.userId === msg.userId);
                        if (!exists) return prev;

                        return prev.map((m) =>
                            m.userId === msg.userId
                                ? {
                                    ...m,
                                    prefsByChar: msg.prefsByChar ?? m.prefsByChar,
                                    visibleByChar: msg.visibleByChar ?? m.visibleByChar,
                                }
                                : m
                        );
                    });
                } else if (
                    msg.type === "activeAccountUpdated" &&
                    msg.partyId === party.id
                ) {
                    setAccounts((prev) => {
                        if (!prev || prev.length === 0) return prev;

                        const exists = prev.some((a) => a.id === msg.activeAccountId);
                        if (!exists) {
                            // 다른 유저의 activeAccount 변경일 수도 있음
                            return prev;
                        }

                        const next = prev.map((a) =>
                            a.id === msg.activeAccountId
                                ? { ...a, isSelected: true }
                                : { ...a, isSelected: false }
                        );

                        return next;
                    });

                    // 🔥 activeAccount 변경 이후에는 서버 기준 숙제 전체 재로딩
                    void reloadPartyTasks(false);
                } else if (
                    msg.type === "memberKicked" &&
                    String(msg.partyId) === String(party.id)
                ) {
                    const kickedUserId = String(msg.userId);

                    // 내가 킥당한 경우 → 바로 목록으로 튕겨내기
                    if (myUserId && String(myUserId) === kickedUserId) {
                        alert("파티에서 강퇴되어 파티 목록으로 이동합니다.");
                        router.push("/party-tasks");
                        return;
                    }

                    // 다른 파티원이 킥당한 경우 → 파티 정보/숙제 목록에서 제거
                    setParty((prev) =>
                        prev
                            ? {
                                ...prev,
                                members: prev.members.filter(
                                    (m) => String(m.id) !== kickedUserId
                                ),
                            }
                            : prev
                    );

                    setPartyTasks((prev) =>
                        prev ? prev.filter((m) => String(m.userId) !== kickedUserId) : prev
                    );
                }
            } catch (e) {
                console.error("[WS] invalid message:", e);
            }
        };

        return () => {
            ws.close();
        };
    }, [party?.id, status, myUserId, router, reloadPartyTasks]);

    // 내가 더 이상 이 파티의 member가 아니면 강제 퇴장
    useEffect(() => {
        if (!party || !myUserId) return;

        const isStillMember = party.members.some((m) => m.id === myUserId);

        // 파티원 목록에 내 userId가 없으면 → 킥당한 상태로 간주하고 튕겨내기
        if (!isStillMember) {
            alert("파티에서 강퇴되어 파티 목록으로 이동합니다.");
            router.push("/party-tasks");
        }
    }, [party, myUserId, router]);

    // 파티 설정 모달에서 이름/파티장/파티원 목록이 변경됐을 때 반영
    const handlePartyUpdated = (patch: Partial<PartyDetail>) => {
        setParty((prev) => (prev ? { ...prev, ...patch } : prev));
    };

    // 특정 파티원이 강퇴됐을 때 파티 정보 + 숙제 목록에서 제거
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

    /* ─────────────────────────────
     * 상태별 렌더링
     * ───────────────────────────── */

    // 1) 로그인 필요
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

    // 2) 파티 정보 로딩
    if (partyLoading) {
        return (
            <div className="w-full min-h-[60vh] flex flex-col items-center justify-center text-gray-300">
                <Loader2 className="h-6 w-6 animate-spin mb-3" />
                <p className="text-sm text-gray-400">
                    파티 정보를 불러오는 중입니다...
                </p>
            </div>
        );
    }

    // 3) 에러
    if (partyErr && !party) {
        return (
            <div className="w-full min-h-[60vh] flex flex-col items-center justify-center text-gray-300 px-4">
                <div className="max-w-md w-full space-y-4 text-center">
                    <div className="flex justify-center">
                        <AlertTriangle className="h-8 w-8 text-red-400" />
                    </div>
                    <p className="text-sm text-red-200 whitespace-pre-line">{partyErr}</p>
                    <div className="flex flex-col sm:flex-row gap-2 justify-center mt-2">
                        <button
                            onClick={() => router.push("/party-tasks")}
                            className="inline-flex items-center justify-center gap-2 rounded-md bg.white/10 px-4 py-2 text-xs sm:text-sm text-gray-200 hover:bg-white/15"
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

    const sortedPartyTasks =
        partyTasks && myUserId
            ? [...partyTasks].sort((a, b) => {
                if (a.userId === myUserId && b.userId !== myUserId) return -1; // a가 나면 위로
                if (b.userId === myUserId && a.userId !== myUserId) return 1; // b가 나면 위로
                return 0;
            })
            : partyTasks;

    let myRemainingRaids: number | undefined = undefined;
    if (sortedPartyTasks && myUserId) {
        const me = sortedPartyTasks.find((m) => m.userId === myUserId);
        if (me) {
            // 파티 화면에서처럼: 현재 선택된 계정 summary가 있으면 우선 사용
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
                {/* 상단 헤더 */}
                <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 py-1 sm:py-2">
                    <div className="flex items-center gap-2 sm:gap-5 min-w-0">
                        <button
                            type="button"
                            onClick={() => router.push("/party-tasks")}
                            className="flex h-8 w-8 items-center justify-center rounded-full  text-gray-300 hover:bg-white/5 hover:text-white"
                            aria-label="파티 목록으로 돌아가기"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </button>

                        {/* 파티 제목 + 설정 버튼 묶음 */}
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

                {/* 바디 (좌 필터 / 우 메인) */}
                <div
                    className="
            grid grid-cols-1 
            lg:grid-cols-[minmax(0,210px)_minmax(0,1fr)]
            gap-5 lg:items-start
          "
                >
                    {/* 왼쪽 필터 영역 */}
                    <div className="space-y-4">
                        {/* 🔹 MyTasks의 계정 선택 섹션 이식 */}
                        <section className="rounded-sm bg-[#16181D] shadow-sm">
                            {/* 헤더: 현재 선택된 계정 표시 (클릭 시 펼치기/접기) */}
                            <button
                                onClick={() => setIsAccountListOpen(!isAccountListOpen)}
                                className={`w-full flex items-center justify-between px-4 py-3.5 hover:bg-white/5 transition-colors ${isAccountListOpen ? "bg-white/5" : ""
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex flex-col items-start">
                                        <span className="text-[10px] text-gray-400 font-medium">
                                            현재 계정
                                        </span>
                                        <span className="text-sm font-bold text-white">
                                            {currentAccount
                                                ? currentAccount.nickname
                                                : "계정 선택"}
                                        </span>
                                    </div>
                                </div>

                                {/* 화살표 아이콘 (열림/닫힘 상태에 따라 변경) */}
                                <div className="text-gray-400">
                                    {isAccountListOpen ? (
                                        <ChevronUp className="h-5 w-5" />
                                    ) : (
                                        <ChevronDown className="h-5 w-5" />
                                    )}
                                </div>
                            </button>

                            {/* 펼쳐지는 목록 영역 */}
                            {isAccountListOpen && (
                                <div className="px-3 pb-3 pt-2 bg-[#16181D] animate-in slide-in-from-top-2 duration-200">
                                    <div className="flex flex-col gap-1">
                                        {accounts.map((acc) => {
                                            const isActive = currentAccount?.id === acc.id;

                                            return (
                                                <button
                                                    key={acc.id}
                                                    onClick={() => {
                                                        if (!party) return;

                                                        void (async () => {
                                                            // 1) nextAccounts 계산 + 서버에 순서대로 반영
                                                            const nextAccounts = await applyActiveAccount(
                                                                acc,
                                                                accounts,                 // 현재 상태 기준
                                                                party.id,
                                                                myUserId,
                                                                saveRaidState,
                                                                saveActiveAccountToServer,
                                                                wsRef.current
                                                            );

                                                            // 2) 최종적으로 프론트 상태 갱신
                                                            setAccounts(nextAccounts);

                                                            // 3) 드롭다운 닫기
                                                            setIsAccountListOpen(false);
                                                        })();
                                                    }}
                                                    className={[
                                                        "relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 transition-all",
                                                        isActive
                                                            ? "bg-[#5B69FF]/10 text-white"
                                                            : "text-gray-400 hover:bg-white/5 hover:text-gray-200",
                                                    ].join(" ")}
                                                >
                                                    <div
                                                        className={`flex items-center justify-center w-5 h-5 ${isActive ? "text-[#5B69FF]" : "text-transparent"
                                                            }`}
                                                    >
                                                        <Check className="h-4 w-4" strokeWidth={3} />
                                                    </div>

                                                    <span className="text-sm font-medium">{acc.nickname}</span>
                                                </button>
                                            );
                                        })}


                                        {/* 구분선 */}
                                        <div className="my-1 border-t border-white/5 mx-2" />

                                        {/* 2. 계정 추가 버튼 (맨 아래 배치) */}
                                        <button
                                            onClick={() => {
                                                setIsAddAccountOpen(true);
                                                setIsAccountListOpen(false);
                                            }}
                                            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
                                        >
                                            <div className="flex items-center justify-center w-5 h-5">
                                                <Plus className="h-4 w-4" />
                                            </div>
                                            <span className="text-sm font-medium">계정 추가</span>
                                        </button>
                                    </div>

                                    {accountSearchErr && (
                                        <p className="mt-2 text-[11px] text-red-400 px-1">
                                            에러: {accountSearchErr}
                                        </p>
                                    )}
                                </div>
                            )}
                        </section>

                        {/* 필터 카드 */}
                        <section className="rounded-sm bg-[#16181D] shadow-sm">
                            <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                                <h3 className="text-base sm:text-lg font-semibold">필터</h3>
                                <button
                                    onClick={resetFilters}
                                    className="inline-flex items-center gap-1 text-[11px] sm:text-xs text-neutral-400 hover:text-neutral-200"
                                >
                                    초기화 <span className="text-[10px]">⟳</span>
                                </button>
                            </header>

                            <div className="px-4 sm:px-5 py-5 sm:py-7">
                                {/* 🔹 모바일: 2컬럼 / sm 이상: 1컬럼 */}
                                <div className="grid grid-cols-2 sm:grid-cols-1 gap-4 sm:gap-5 text-xs sm:text-sm">
                                    {/* 왼쪽: 숙제/보상 */}
                                    <div className="space-y-3">
                                        <div className="font-bold">숙제/보상</div>
                                        <div className="space-y-3">
                                            <label className="flex items-center gap-2 cursor-pointer select-none text-[#A2A3A5] relative group">
                                                <input
                                                    type="checkbox"
                                                    className="sr-only peer"
                                                    checked={onlyRemain}
                                                    onChange={(e) => setOnlyRemain(e.target.checked)}
                                                />
                                                <span
                                                    className="grid place-items-center h-5 w-5 rounded-md border border-white/30 transition
                            peer-checked:bg-[#5B69FF] peer-checked:border-[#5B69FF]
                            peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500
                            peer-checked:[&_svg]:opacity-100"
                                                >
                                                    <svg
                                                        className="h-4 w-4 text-white opacity-0 transition-opacity duration-150 peer-checked:opacity-100"
                                                        viewBox="0 0 20 20"
                                                        fill="none"
                                                    >
                                                        <path
                                                            d="M5 10l3 3 7-7"
                                                            stroke="currentColor"
                                                            strokeWidth="2"
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                        />
                                                    </svg>
                                                </span>

                                                <span className="text-xs sm:text-sm">
                                                    남은 숙제만 보기
                                                </span>

                                                <span
                                                    className="
                            w-3 h-3
                            rounded-full
                            border border-white/20
                            text-[9px] font-bold
                            flex items-center justify-center
                            text-gray-400
                            bg-black/20
                            group-hover:text-white group-hover:border-white/40
                            transition-colors duration-200
                            cursor-help"
                                                >
                                                    ?
                                                </span>

                                                {/* 설명 툴팁 그대로 유지 */}
                                                <div
                                                    className="
                            pointer-events-none
                            absolute left-6 top-full mt-2.5
                            w-64 p-4
                            rounded-2xl
                            bg-gray-900/95 backdrop-blur-xl
                            border border-white/[0.08]
                            shadow-[0_8px_30px_rgb(0,0,0,0.4)]
                            opacity-0 translate-y-1 scale-95
                            group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-100
                            transition-all duration-200 ease-out
                            z-[200]"
                                                >
                                                    <div className="flex flex-col gap-2 text-xs leading-relaxed text-left">
                                                        <p className="text-gray-200">
                                                            <span className="font-bold text-sky-400">
                                                                카드 보기
                                                            </span>
                                                            에서만 적용됩니다.
                                                            <span className="block text-gray-400 font-normal mt-0.5">
                                                                마지막 관문까지 완료되지 않은 레이드만 필터링하여
                                                                보여줍니다.
                                                            </span>
                                                        </p>

                                                        <div className="w-full h-px bg-white/5 my-0.5" />

                                                        <p className="text-gray-400 font-medium">
                                                            ※ 테이블 보기에서는 이 옵션이 적용되지 않습니다.
                                                        </p>
                                                    </div>

                                                    <div
                                                        className="
                              absolute -top-[5px] left-6
                              w-2.5 h-2.5
                              bg-gray-900/95
                              border-t border-l border-white/[0.08]
                              rotate-45
                              z-10"
                                                    />
                                                </div>
                                            </label>
                                        </div>
                                    </div>

                                    {/* 오른쪽: 보기 설정 */}
                                    <div className="space-y-3">
                                        <div className="font-semibold">보기 설정</div>
                                        <label className="flex items-center gap-2 cursor-pointer select-none text-[#A2A3A5] text-xs sm:text-sm">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={tableView}
                                                onChange={(e) => setTableView(e.target.checked)}
                                            />
                                            <span
                                                className="grid place-items-center h-5 w-5 rounded-md border border-white/30 transition
                          peer-checked:bg-[#5B69FF] peer-checked:border-[#5B69FF]
                          peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500
                          peer-checked:[&_svg]:opacity-100"
                                            >
                                                <svg
                                                    className="h-4 w-4 text-white opacity-0 transition-opacity duration-150 peer-checked:opacity-100"
                                                    viewBox="0 0 20 20"
                                                    fill="none"
                                                >
                                                    <path
                                                        d="M5 10l3 3 7-7"
                                                        stroke="currentColor"
                                                        strokeWidth="2"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                    />
                                                </svg>
                                            </span>
                                            테이블로 보기
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* 오른쪽 메인 영역 */}
                    <div className="grid grid-cols-1 gap-4 sm:gap-5">
                        {tasksLoading && (
                            <div className="w-full flex items-center justify-center py-6 text-xs text-gray-400">
                                파티 숙제 데이터를 불러오는 중입니다...
                            </div>
                        )}

                        {tasksErr && (
                            <div className="w-full rounded-md border border-red-500/40 bg-red-900/20 px-4 py-3 text-xs text-red-200">
                                {tasksErr}
                            </div>
                        )}

                        {/* 카드 뷰 */}
                        {!tasksLoading &&
                            !tasksErr &&
                            sortedPartyTasks &&
                            sortedPartyTasks.length > 0 &&
                            !tableView && (
                                <div className="flex flex-col gap-10">
                                    {sortedPartyTasks.map((m) => {
                                        const isMe = myUserId && m.userId === myUserId;

                                        // 나인 경우, 현재 선택된 계정의 summary를 우선 사용
                                        const baseSummary =
                                            isMe && currentAccount?.summary
                                                ? currentAccount.summary
                                                : m.summary;

                                        const visibleRoster =
                                            baseSummary?.roster?.filter(
                                                (c) => m.visibleByChar?.[c.name] ?? true
                                            ) ?? [];

                                        if (visibleRoster.length === 0) {
                                            return (
                                                <div
                                                    key={m.userId}
                                                    className="grid grid-cols-1 gap-4 sm:gap-1 rounded-lg border border-white/10 px-3 sm:px-4 py-3 sm:py-4"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <MemberAvatar
                                                            member={{
                                                                id: m.userId,
                                                                name: m.name,
                                                                image: m.image,
                                                                role: "member",
                                                            }}
                                                            className="h-7 w-7 rounded-full border border-black/60"
                                                        />
                                                    </div>
                                                    <span className="font-medium text-gray-200">
                                                        {m.name || "이름 없음"}
                                                    </span>
                                                    <span className="text-[11px] text-gray-400">
                                                        표시 중인 캐릭터가 없습니다
                                                    </span>
                                                </div>
                                            );
                                        }

                                        const sortedRoster = [...visibleRoster].sort(
                                            (a, b) =>
                                                (b.itemLevelNum ?? 0) - (a.itemLevelNum ?? 0)
                                        );

                                        const memberSummary = computeMemberSummary({
                                            ...m,
                                            summary: baseSummary,
                                        });

                                        return (
                                            <div
                                                key={m.userId}
                                                className="grid grid-cols-1 gap-4 sm:gap-1 rounded-lg border border-white/10 px-3 sm:px-4 py-3 sm:py-4"
                                            >
                                                <PartyMemberSummaryBar
                                                    member={m}
                                                    summary={memberSummary}
                                                >
                                                    <PartyMemberActions
                                                        onAutoSetup={() =>
                                                            handleMemberAutoSetup(m.userId, !!isMe)
                                                        }
                                                        onGateAllClear={() =>
                                                            handleMemberGateAllClear(m.userId)
                                                        }
                                                        onOpenCharSetting={() =>
                                                            openMemberCharSetting(m, baseSummary)
                                                        }
                                                    />
                                                </PartyMemberSummaryBar>

                                                {/* 🔹 MyTasks와 동일한 캐릭터별 카드 스트립 */}
                                                <div className="mt-2 flex flex-col gap-4">
                                                    {sortedRoster.map((c) => {
                                                        const tasks = buildTasksForCharacter(
                                                            c,
                                                            m.prefsByChar,
                                                            {
                                                                onlyRemain,
                                                                onToggleGate: (
                                                                    raidName,
                                                                    gate,
                                                                    currentGates,
                                                                    allGates
                                                                ) =>
                                                                    handleMemberToggleGate(
                                                                        m.userId,
                                                                        c.name,
                                                                        raidName,
                                                                        gate,
                                                                        currentGates,
                                                                        allGates
                                                                    ),
                                                            }
                                                        );

                                                        if (onlyRemain && tasks.length === 0) {
                                                            return null;
                                                        }

                                                        return (
                                                            <CharacterTaskStrip
                                                                key={c.name}
                                                                character={c}
                                                                tasks={tasks}
                                                                onEdit={() => openEditModal(m, c)}
                                                                onReorder={(char, newOrderIds) =>
                                                                    handleMemberReorder(
                                                                        m.userId,
                                                                        char.name,
                                                                        newOrderIds
                                                                    )
                                                                }
                                                            />
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                        {/* 테이블 뷰 */}
                        {!tasksLoading &&
                            !tasksErr &&
                            sortedPartyTasks &&
                            sortedPartyTasks.length > 0 &&
                            tableView && (
                                <div className="flex flex-col gap-10">
                                    {sortedPartyTasks.map((m) => {
                                        const isMe = myUserId && m.userId === myUserId;

                                        const baseSummary =
                                            isMe && currentAccount?.summary
                                                ? currentAccount.summary
                                                : m.summary;

                                        const visibleRoster =
                                            baseSummary?.roster?.filter(
                                                (c) => m.visibleByChar?.[c.name] ?? true
                                            ) ?? [];

                                        if (visibleRoster.length === 0) {
                                            return (
                                                <div
                                                    key={m.userId}
                                                    className="
                            grid grid-cols-1 gap-4 sm:gap-1
                            rounded-lg border border-white/10
                            px-3 sm:px-4 py-3 sm:py-4"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <MemberAvatar
                                                            member={{
                                                                id: m.userId,
                                                                name: m.name,
                                                                image: m.image,
                                                                role: "member",
                                                            }}
                                                            className="h-7 w-7 rounded-full border border-black/60"
                                                        />
                                                    </div>
                                                    <span className="font-medium text-gray-200">
                                                        {m.name || "이름 없음"}
                                                    </span>
                                                    <span className="text-[11px] text-gray-400">
                                                        표시 중인 캐릭터가 없습니다
                                                    </span>
                                                </div>
                                            );
                                        }

                                        const sortedRoster = [...visibleRoster].sort(
                                            (a, b) =>
                                                (b.itemLevelNum ?? 0) - (a.itemLevelNum ?? 0)
                                        );

                                        const memberSummary = computeMemberSummary({
                                            ...m,
                                            summary: baseSummary,
                                        });

                                        return (
                                            <div
                                                key={m.userId}
                                                className="
                          grid grid-cols-1 gap-4 sm:gap-1
                          rounded-lg border border-white/10
                          px-3 sm:px-4 py-3 sm:py-4"
                                            >
                                                <PartyMemberSummaryBar
                                                    member={m}
                                                    summary={memberSummary}
                                                >
                                                    <PartyMemberActions
                                                        onAutoSetup={() =>
                                                            handleMemberAutoSetup(m.userId, !!isMe)
                                                        }
                                                        onGateAllClear={() =>
                                                            handleMemberGateAllClear(m.userId)
                                                        }
                                                        onOpenCharSetting={() =>
                                                            openMemberCharSetting(m, baseSummary)
                                                        }
                                                    />
                                                </PartyMemberSummaryBar>

                                                <div className="mt-2">
                                                    <TaskTable
                                                        roster={sortedRoster}
                                                        prefsByChar={m.prefsByChar}
                                                        onToggleGate={(
                                                            charName,
                                                            raidName,
                                                            gate,
                                                            currentGates,
                                                            allGates
                                                        ) =>
                                                            handleMemberToggleGate(
                                                                m.userId,
                                                                charName,
                                                                raidName,
                                                                gate,
                                                                currentGates,
                                                                allGates
                                                            )
                                                        }
                                                        onEdit={(c) => openEditModal(m, c)}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                        {/* 아무도 상태를 저장 안 한 경우 */}
                        {!tasksLoading &&
                            !tasksErr &&
                            partyTasks &&
                            partyTasks.length === 0 && (
                                <p className="text-xs text-gray-500">
                                    아직 숙제 데이터를 등록한 파티원이 없습니다.
                                </p>
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

                        {charSettingOpen && charSettingTarget && (
                            <CharacterSettingModal
                                open
                                onClose={() => setCharSettingOpen(false)}
                                roster={charSettingTarget.roster}
                                visibleByChar={
                                    partyTasks?.find(
                                        (m) => m.userId === charSettingTarget.memberUserId
                                    )?.visibleByChar ?? {}
                                }
                                onChangeVisible={(next) => {
                                    handleMemberChangeVisible(
                                        charSettingTarget.memberUserId,
                                        next
                                    );
                                }}
                                // 🔹 내 줄일 때만 계정 삭제/새로고침 동작
                                onDeleteAccount={
                                    myUserId && charSettingTarget.memberUserId === myUserId
                                        ? handleMyDeleteAccount
                                        : undefined
                                }
                                onRefreshAccount={
                                    myUserId && charSettingTarget.memberUserId === myUserId
                                        ? handleMyRefreshAccount
                                        : undefined
                                }
                            />
                        )}
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
                />
            )}

            {/* 파티 코드 모달 */}
            {inviteOpen && (
                <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-md overflow-hidden rounded-2xl bg-[#1E2028] border border-white/10 shadow-2xl animate-in zoom-in-95 duration-200">
                        {/* 1. 모달 헤더 */}
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

                        {/* 2. 모달 바디 */}
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

            {/* 계정 추가 모달 (EmptyCharacterState) */}
            <EmptyCharacterState
                open={isAddAccountOpen}
                onClose={() => setIsAddAccountOpen(false)}
                loading={accountSearchLoading}
                onSearch={async (nickname) => {
                    await handleCharacterSearch(nickname);
                    setIsAddAccountOpen(false);
                }}
            />
        </div>
    );
}

/* ── 공통 UI 컴포넌트 ── */

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
        <div className="rounded-md py-2 sm:py-2 flex flex-wrap sm:flex-row sm:items-center gap-3 sm:gap-4  max-[1247px]:flex-col max-[1247px]:items-start">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 min-w-0 text-sm sm:text-base">
                <div className="flex items-center gap-3">
                    <MemberAvatar
                        member={{
                            id: member.userId,
                            name: member.name,
                            image: member.image,
                            role: "member",
                        }}
                        className="h-8 w-8 rounded-full b"
                    />

                    <div className="flex flex-col">
                        <span className="text-sm sm:text-base md:text-xl font-semibold text-white truncate">
                            {member.name || "이름 없음"}
                        </span>
                    </div>
                </div>
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

                <span className="hidden sm:inline h-4 w-px bg-white/10" />

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

            <div
                className="
        flex flex-row flex-wrap gap-2 sm:gap-3 sm:ml-auto justify-end
        max-[1247px]:w-full max-[1247px]:justify-start"
            >
                {children}
            </div>
        </div>
    );
}

type PartyMemberActionsProps = {
    onAutoSetup: () => void;
    onGateAllClear: () => void;
    onOpenCharSetting: () => void;
};

function PartyMemberActions({
    onAutoSetup,
    onGateAllClear,
    onOpenCharSetting,
}: PartyMemberActionsProps) {
    return (
        <>
            {/* 자동 세팅 */}
            <button
                onClick={onAutoSetup}
                className="
          relative group
          flex items-center justify-center
          py-2 px-6 rounded-lg
          bg-white/[.04] border border-white/10
          hover:bg-white/5 hover:border-white/20
          text-xs sm:text-sm font-medium text-white
          transition-all duration-200
          disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <span>자동 세팅</span>

                <span
                    className="
            absolute top-1 right-1
            w-3 h-3
            rounded-full
            border border-white/20
            text-[9px] font-bold
            flex items-center justify-center
            text-gray-400
            bg-black/20
            group-hover:text-white group-hover:border-white/40
            transition-colors duration-200
            cursor-help"
                >
                    ?
                </span>

                <div
                    className="
            pointer-events-none
            absolute bottom-full left-15 mb-3
            w-64 p-3
            rounded-xl
            bg-gray-900/95 backdrop-blur-md
            border border-white/10
            text-xs text-gray-300 leading-relaxed
            text-center
            shadow-2xl shadow-black/50
            opacity-0 translate-y-2 scale-95
            group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-100
            transition-all duration-200 ease-out
            z-20"
                >
                    <p>
                        <span className="text-white font-semibold">
                            아이템 레벨 상위 6개 캐릭터
                        </span>
                        와 해당 캐릭터의{" "}
                        <span className="text-indigo-400">Top 3 레이드</span>를 자동으로
                        세팅합니다.
                    </p>

                    <div
                        className="
              absolute -bottom-1.5 left-4
              w-3 h-3 
              bg-gray-900/95 border-b border-r border-white/10 
              rotate-45"
                    />
                </div>
            </button>

            {/* 관문 전체 초기화 */}
            <button
                onClick={onGateAllClear}
                className="inline-flex items-center justify-center py-2 px-3 sm:px-4 rounded-md bg-white/[.04] border border-white/10 hover:bg.white/5 text-xs sm:text-sm"
            >
                <span>관문 초기화</span>
            </button>

            {/* 캐릭터 설정 모달 열기 */}
            <button
                onClick={onOpenCharSetting}
                className="inline-flex items-center justify-center py-2 px-3 sm:px-4 rounded-md bg-white/[.04] border border-white/10 text-xs sm:text-sm font-medium"
            >
                캐릭터 설정
            </button>
        </>
    );
}

/* ── 아바타 컴포넌트 ── */
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
