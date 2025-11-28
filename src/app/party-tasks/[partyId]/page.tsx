// src/app/party-tasks/[partyId]/page.tsx
"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import {
    UsersRound,
    Loader2,
    ArrowLeft,
    AlertTriangle,
    Clock,
    LogIn,
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

type SavedFilters = {
    onlyRemain?: boolean;
    tableView?: boolean;
};

const PARTY_FILTER_KEY = (partyId: number | string) =>
    `partyTaskFilters:${partyId}`;

/* ─────────────────────────────
 * 공통 함수
 * ───────────────────────────── */

/** 카드 뷰에서 한 캐릭터에 대한 TaskCard 리스트 생성 */
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

        // 카드 오른쪽 골드 뱃지
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
function computeMemberSummary(member: PartyMemberTasks): RaidSummary {
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
        useState<PartyMemberTasks | null>(null);

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
        setCharSettingTarget(member);
        setCharSettingOpen(true);
    };

    const handleMemberChangeVisible = (
        memberUserId: string,
        nextVisibleByChar: Record<string, boolean>
    ) => {
        if (!party) return;
        const partyIdNum = party.id;

        setPartyTasks((prev) => {
            if (!prev) return prev;

            const next: PartyMemberTasks[] = prev.map((m) => {
                if (m.userId !== memberUserId) return m;

                const updated: PartyMemberTasks = {
                    ...m,
                    visibleByChar: nextVisibleByChar,
                };

                return updated;
            });

            const updated = next.find((m) => m.userId === memberUserId);
            if (updated) {
                void saveMemberPrefsToServer(
                    partyIdNum,
                    updated.userId,
                    updated.prefsByChar,
                    updated.visibleByChar
                );
            }

            return next;
        });
    };

    const handleSaveEdit = (nextPrefs: CharacterTaskPrefs) => {
        if (!party || !editTarget) return;
        const partyIdNum = party.id;
        const { memberUserId, charName } = editTarget;

        setPartyTasks((prev) => {
            if (!prev) return prev;

            const next: PartyMemberTasks[] = prev.map((m) => {
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

            const updated = next.find((m) => m.userId === memberUserId);
            if (updated) {
                void saveMemberPrefsToServer(
                    partyIdNum,
                    updated.userId,
                    updated.prefsByChar
                );
            }

            return next;
        });

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
        if (!party) return;

        const partyIdNum = party.id;

        setPartyTasks((prev) => {
            if (!prev) return prev;

            // 1) 우선 새 배열 생성
            const next: PartyMemberTasks[] = prev.map((m) => {
                if (m.userId !== memberUserId) return m;

                const memberPrefsByChar: Record<string, CharacterTaskPrefs> = {
                    ...(m.prefsByChar ?? {}),
                };

                const curPrefsForChar: CharacterTaskPrefs =
                    memberPrefsByChar[charName] ?? { raids: {} };

                const curRaidPref = curPrefsForChar.raids[raidName];
                if (!curRaidPref) {
                    // 해당 레이드 설정이 없으면 그대로
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

            // 2) 새 상태에서 해당 멤버를 다시 찾아서 서버에 저장
            const updated = next.find((m) => m.userId === memberUserId);
            if (updated) {
                void saveMemberPrefsToServer(
                    partyIdNum,
                    updated.userId,
                    updated.prefsByChar
                );
            }

            return next;
        });
    };

    /** 파티원 자동 세팅 (상위 6캐릭 + 각 캐릭 Top3 레이드) */
    const handleMemberAutoSetup = (memberUserId: string) => {
        if (!party) return;

        const partyIdNum = party.id;

        setPartyTasks((prev) => {
            if (!prev) return prev;

            const next: PartyMemberTasks[] = prev.map((m) => {
                if (m.userId !== memberUserId) return m;

                const roster = m.summary?.roster ?? [];
                if (!roster.length) return m;

                const { nextPrefsByChar, nextVisibleByChar } = buildAutoSetupForRoster(
                    roster,
                    m.prefsByChar ?? {}
                );

                const updated: PartyMemberTasks = {
                    ...m,
                    prefsByChar: nextPrefsByChar,
                    visibleByChar: nextVisibleByChar,
                };

                // 서버에 저장
                void saveMemberPrefsToServer(
                    partyIdNum,
                    updated.userId,
                    updated.prefsByChar,
                    updated.visibleByChar
                );

                return updated;
            });

            return next;
        });
    };

    /** 파티원 레이드 순서 재정렬 */
    const handleMemberReorder = (
        memberUserId: string,
        charName: string,
        newOrderIds: string[]
    ) => {
        if (!party) return;
        const partyIdNum = party.id;

        setPartyTasks((prev) => {
            if (!prev) return prev;

            const next: PartyMemberTasks[] = prev.map((m) => {
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

            // 서버에도 저장
            const updated = next.find((m) => m.userId === memberUserId);
            if (updated) {
                void saveMemberPrefsToServer(
                    partyIdNum,
                    updated.userId,
                    updated.prefsByChar
                );
            }

            return next;
        });
    };

    /** 파티원 관문 전체 초기화 (해당 파티원의 모든 캐릭터에 대해 gates만 초기화) */
    const handleMemberGateAllClear = (memberUserId: string) => {
        if (!party) return;
        const partyIdNum = party.id;

        setPartyTasks((prev) => {
            if (!prev) return prev;

            const next: PartyMemberTasks[] = prev.map((m) => {
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

            const updated = next.find((m) => m.userId === memberUserId);
            if (updated) {
                void saveMemberPrefsToServer(
                    partyIdNum,
                    updated.userId,
                    updated.prefsByChar,
                    updated.visibleByChar
                );
            }

            return next;
        });
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
     * 2차: 파티원들의 "내 숙제 상태" 불러오기 (폴링)
     * ───────────────────────────── */
    useEffect(() => {
        if (!party || status !== "authenticated") return;

        const partyIdForFetch = party.id;

        let cancelled = false;
        let timerId: ReturnType<typeof setInterval> | null = null;

        // showSpinner=true  : 첫 로딩 때만 스피너
        async function loadPartyTasks(showSpinner: boolean) {
            if (cancelled) return;

            if (showSpinner) {
                setTasksLoading(true);
            }
            setTasksErr(null);

            try {
                const res = await fetch(
                    `/api/party-tasks/${partyIdForFetch}/raid-tasks`,
                    {
                        method: "GET",
                        headers: { "Content-Type": "application/json" },
                        cache: "no-store",
                    }
                );

                if (!res.ok) {
                    if (res.status === 204 || res.status === 404) {
                        if (!cancelled) setPartyTasks([]);
                        return;
                    }
                    throw new Error("파티 숙제 데이터를 불러오지 못했습니다.");
                }

                const json = (await res.json()) as PartyRaidTasksResponse;
                if (!cancelled) {
                    setPartyTasks(json.members ?? []);
                }
            } catch (e: any) {
                if (!cancelled) {
                    setTasksErr(e?.message ?? "알 수 없는 오류가 발생했습니다.");
                }
            } finally {
                if (!cancelled && showSpinner) {
                    setTasksLoading(false);
                }
            }
        }

        loadPartyTasks(true);

        timerId = setInterval(() => {
            loadPartyTasks(false);
        }, 10_000); // 10초

        return () => {
            cancelled = true;
            if (timerId) {
                clearInterval(timerId);
            }
        };
    }, [party, status]);

    /* ─────────────────────────────
     * 상태별 렌더링
     * ───────────────────────────── */

    // 1) 로그인 필요
    if (status === "unauthenticated") {
        return (
            <div className="w-full min-h-[60vh] flex flex-col items-center justify-center text-gray-300 px-4">
                <div className="max-w-md w-full text-center space-y-6">
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
                <p className="text-sm text-gray-400">파티 정보를 불러오는 중입니다...</p>
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
                    <p className="text-sm text-red-200 whitespace-pre-line">
                        {partyErr}
                    </p>
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

    const myUserId =
        (session as any)?.user?.id ??
        (session as any)?.userId ??
        (session as any)?.user?.discordId ??
        null;

    const sortedPartyTasks =
        partyTasks && myUserId
            ? [...partyTasks].sort((a, b) => {
                if (a.userId === myUserId && b.userId !== myUserId) return -1; // a가 나면 위로
                if (b.userId === myUserId && a.userId !== myUserId) return 1;  // b가 나면 위로
                return 0;
            })
            : partyTasks;

    return (
        <div className="w-full text-white py-8 sm:py-12">
            <div className="mx-auto max-w-7xl space-y-5">
                {/* 상단 헤더 */}
                <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 py-1 sm:py-2">
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight truncate break-keep">
                            {party.name}
                        </h1>
                    </div>

                    {party.nextResetAt && (
                        <div className="inline-flex items-center gap-1.5 rounded-full bg-black/30 px-3 py-1 text-[11px] text-gray-400">
                            <Clock className="h-3 w-3" />
                            <span>다음 초기화: {party.nextResetAt}</span>
                        </div>
                    )}
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

                            <div className="px-4 sm:px-5 py-5 sm:py-7 space-y-5">
                                <div>
                                    <div className="mb-3 text-xs sm:text-sm font-bold">
                                        숙제/보상
                                    </div>
                                    <div className="space-y-3 text-xs sm:text-sm">
                                        <label className="flex items-center gap-2 cursor-pointer select-none text-[#A2A3A5] relative group">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={onlyRemain}
                                                onChange={(e) => setOnlyRemain(e.target.checked)}
                                            />
                                            <span
                                                className="grid place-items-center h-5 w-5 rounded-md border border.white/30 transition
                                                    peer-checked:bg-[#5B69FF] peer-checked:border-[#5B69FF]
                                                    peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500
                                                    peer-checked:[&_svg]:opacity-100
                                                    "
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
                                                    cursor-help
                                                    "
                                            >
                                                ?
                                            </span>

                                            {/* 설명 툴팁 */}
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
                                                    z-[200]
                                                    "
                                            >
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

                                                {/* 위쪽 화살표 */}
                                                <div
                                                    className="
                                                        absolute -top-[5px] left-6
                                                        w-2.5 h-2.5
                                                        bg-gray-900/95
                                                        border-t border-l border-white/[0.08]
                                                        rotate-45
                                                        z-10
                                                    "
                                                />
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* 보기 설정 카드 */}
                        <section className="rounded-sm bg-[#16181D] shadow-sm">
                            <div className="px-4 sm:px-5 py-5 sm:py-7 space-y-4 sm:space-y-5">
                                <div className="mb-3 text-xs sm:text-sm font-semibold">
                                    보기 설정
                                </div>
                                <label className="flex items-center gap-2 cursor-pointer select-none text-[#A2A3A5] text-xs sm:text-sm">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={tableView}
                                        onChange={(e) => setTableView(e.target.checked)}
                                    />
                                    <span
                                        className="grid place-items-center h-5 w-5 rounded-md border border.white/30 transition
                                            peer-checked:bg-[#5B69FF] peer-checked:border-[#5B69FF]
                                            peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500
                                            peer-checked:[&_svg]:opacity-100
                                            "
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
                                <div className="flex flex-col gap-14">
                                    {sortedPartyTasks.map((m) => {
                                        const visibleRoster =
                                            m.summary?.roster?.filter(
                                                (c) => m.visibleByChar?.[c.name] ?? true
                                            ) ?? [];

                                        const sortedRoster = [...visibleRoster].sort(
                                            (a, b) =>
                                                (b.itemLevelNum ?? 0) - (a.itemLevelNum ?? 0)
                                        );

                                        // 캐릭별 tasks 만들고, onlyRemain + tasks.length === 0 이면 캐릭터 숨김
                                        const rosterForRender = sortedRoster
                                            .map((c) => {
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
                                                        ) => {
                                                            handleMemberToggleGate(
                                                                m.userId,
                                                                c.name,
                                                                raidName,
                                                                gate,
                                                                currentGates,
                                                                allGates
                                                            );
                                                        },
                                                    }
                                                );

                                                if (onlyRemain && tasks.length === 0) {
                                                    return null;
                                                }

                                                return { char: c, tasks };
                                            })
                                            .filter(
                                                (
                                                    x
                                                ): x is {
                                                    char: RosterCharacter;
                                                    tasks: TaskItem[];
                                                } => x !== null
                                            );

                                        const memberSummary = computeMemberSummary(m);

                                        return (
                                            <div
                                                key={m.userId}
                                                className="grid grid-cols-1 gap-4 sm:gap-1"
                                            >
                                                <PartyMemberSummaryBar
                                                    member={m}
                                                    summary={memberSummary}
                                                >
                                                    <PartyMemberActions
                                                        onAutoSetup={() => handleMemberAutoSetup(m.userId)}
                                                        onGateAllClear={() =>
                                                            handleMemberGateAllClear(m.userId)
                                                        }
                                                        onOpenCharSetting={() =>
                                                            openMemberCharSetting(m)
                                                        }
                                                    />
                                                </PartyMemberSummaryBar>

                                                {/* 캐릭터별 스트립 */}
                                                <div className="flex flex-col gap-3 mt-2">
                                                    {rosterForRender.map(({ char, tasks }) => (
                                                        <CharacterTaskStrip
                                                            key={`${m.userId}-${char.name}`}
                                                            character={char}
                                                            tasks={tasks}
                                                            onEdit={() => openEditModal(m, char)}
                                                            onReorder={(_, newOrderIds) =>
                                                                handleMemberReorder(
                                                                    m.userId,
                                                                    char.name,
                                                                    newOrderIds
                                                                )
                                                            }
                                                        />
                                                    ))}
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
                                <div className="flex flex-col gap-14">
                                    {sortedPartyTasks.map((m) => {
                                        const visibleRoster =
                                            m.summary?.roster?.filter(
                                                (c) => m.visibleByChar?.[c.name] ?? true
                                            ) ?? [];

                                        if (visibleRoster.length === 0) {
                                            return (
                                                <div
                                                    key={m.userId}
                                                    className="rounded-lg border border.white/5 bg-black/20 px-4 py-3 text-xs text-gray-500 flex items-center justify-between"
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
                                            (a, b) => (b.itemLevelNum ?? 0) - (a.itemLevelNum ?? 0)
                                        );

                                        const memberSummary = computeMemberSummary(m);

                                        return (
                                            <div key={m.userId} className="space-y-3">
                                                <PartyMemberSummaryBar
                                                    member={m}
                                                    summary={memberSummary}
                                                >
                                                    <PartyMemberActions
                                                        onAutoSetup={() => handleMemberAutoSetup(m.userId)}
                                                        onGateAllClear={() =>
                                                            handleMemberGateAllClear(m.userId)
                                                        }
                                                        onOpenCharSetting={() =>
                                                            openMemberCharSetting(m)
                                                        }
                                                    />
                                                </PartyMemberSummaryBar>

                                                <div>
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
                                                        onEdit={() => {
                                                            /* 파티 페이지에서는 편집 모달 안 띄움 */
                                                        }}
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
                                roster={charSettingTarget.summary?.roster ?? []}
                                visibleByChar={charSettingTarget.visibleByChar ?? {}}
                                onChangeVisible={(next) => {
                                    handleMemberChangeVisible(charSettingTarget.userId, next);
                                }}
                                onDeleteAccount={() => { }}
                                onRefreshAccount={() => { }}
                            />
                        )}
                    </div>
                </div>
            </div>
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
        <div className="bg-[#16181D] rounded-md px-4 sm:px-5 py-3 sm:py-4 flex flex-wrap sm:flex-row sm:items-center gap-3 sm:gap-4">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 min-w-0 text-sm sm:text-base">
                <div className="flex items-center gap-3">
                    <MemberAvatar
                        member={{
                            id: member.userId,
                            name: member.name,
                            image: member.image,
                            role: "member",
                        }}
                        className="h-8 w-8 rounded-full border border-black/60"
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
                    <span className="text-gray-400 text-xs sm:text-sm font-semibold">
                        {summary.totalRemainingTasks}
                    </span>
                </div>

                <span className="hidden sm:inline h-4 w-px bg-white/10 " />

                <div className="flex items-baseline gap-1.5">
                    <span className="font-semibold text-sm sm:text-base pr-1">
                        숙제 남은 캐릭터
                    </span>
                    <span className="text-gray-400 text-xs sm:text-sm font-semibold">
                        {summary.remainingCharacters}
                    </span>
                </div>
                <span className="hidden sm:inline h-4 w-px bg-white/10" />

                <div className="flex items-baseline gap-1.5">
                    <span className="font-semibold text-sm sm:text-base pr-1">
                        남은 골드
                    </span>
                    <span
                        className={`text-xs sm:text-sm font-semibold ${memberAllCleared
                            ? "line-through decoration-gray-300 decoration-1 text-gray-400"
                            : "text-gray-400"
                            }`}
                    >
                        {memberAllCleared
                            ? `${summary.totalGold.toLocaleString()}g`
                            : `${summary.totalRemainingGold.toLocaleString()}g`}
                    </span>
                </div>
            </div>

            <div className="flex flex-row flex-wrap gap-2 sm:gap-3 sm:ml-auto">
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
                    disabled:opacity-50 disabled:cursor-not-allowed
                    "
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
                        cursor-help
                    "
                >
                    ?
                </span>

                <div
                    className="
                      pointer-events-none
                      absolute bottom-full left-15 mb-3  {/* right-0을 left-0으로 변경 */}
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
                      z-20
                    "
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
              rotate-45
            "
                    />
                </div>
            </button>

            {/* 관문 전체 초기화 */}
            <button
                onClick={onGateAllClear}
                className="inline-flex items-center justify-center py-2 px-3 sm:px-4 rounded-md bg-white/[.04] border border-white/10 hover:bg-white/5 text-xs sm:text-sm"
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
