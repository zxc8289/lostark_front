"use client";

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Coins, CalendarDays, CheckCircle2, ExternalLink, UserCheck, Check, ChevronDown, ChevronUp } from "lucide-react";

import type { CharacterSummary } from "./AddAccount";
import type { CharacterTaskPrefs } from "../lib/tasks/raid-prefs";
import { readPrefs } from "../lib/tasks/raid-prefs";
import {
    computeRaidSummaryForRoster,
    getRaidBaseLevel,
    type RaidSummary,
} from "../lib/tasks/raid-utils";

import { raidInformation } from "@/server/data/raids";

type SavedAccount = {
    id: string;
    nickname: string;
    summary: CharacterSummary;
    isPrimary?: boolean;
    isSelected?: boolean;
};

const LOCAL_KEY = "raidTaskLastAccount";
const VISIBLE_KEY = "raidTaskVisibleByChar";
const ACCOUNTS_KEY = "raidTaskAccounts";
const ACTIVE_ACCOUNT_KEY = "raidTaskActiveAccount";

type RemainingRaidRow = {
    raidName: string;
    chars: { name: string; remainLabel: string }[];
};

type Ctx = {
    loading: boolean;
    accounts: SavedAccount[];
    activeAccountId: string | null;
    selectAccount: (id: string) => void;

    activeAccount: SavedAccount | null;
    totalRemainingTasks: number;
    totalRemainingGold: number;
    totalGold: number;
    progress: number;
    remainingRaids: RemainingRaidRow[];
};

const HomeMyTasksCtx = createContext<Ctx | null>(null);



function useHomeMyTasks() {
    const v = useContext(HomeMyTasksCtx);
    if (!v) throw new Error("HomeMyTasksSummary Provider is missing");
    return v;
}

function safeJsonParse<T>(raw: string | null): T | null {
    if (!raw) return null;
    try {
        return JSON.parse(raw) as T;
    } catch {
        return null;
    }
}

function pickActiveAccountId(accounts: SavedAccount[]) {
    if (!accounts.length) return null;

    try {
        const savedId = localStorage.getItem(ACTIVE_ACCOUNT_KEY);
        if (savedId && accounts.some((a) => a.id === savedId)) return savedId;
    } catch { }

    return (accounts.find((a) => a.isPrimary) ?? accounts[0]).id;
}

function buildPrefsByCharFromAccounts(accounts: SavedAccount[]) {
    const next: Record<string, CharacterTaskPrefs> = {};
    for (const acc of accounts) {
        for (const c of acc.summary?.roster ?? []) {
            next[c.name] = readPrefs(c.name) ?? { raids: {} };
        }
    }
    return next;
}

function buildVisibleByCharFromAccounts(accounts: SavedAccount[]) {
    const saved =
        safeJsonParse<Record<string, boolean>>(
            typeof window !== "undefined" ? localStorage.getItem(VISIBLE_KEY) : null
        ) ?? {};

    const next: Record<string, boolean> = {};
    for (const acc of accounts) {
        for (const c of acc.summary?.roster ?? []) {
            next[c.name] = saved[c.name] ?? true;
        }
    }

    try {
        localStorage.setItem(VISIBLE_KEY, JSON.stringify(next));
    } catch { }

    return next;
}

function normalizeAccountsFromAnyState(state: any): SavedAccount[] {
    if (state?.accounts && Array.isArray(state.accounts)) {
        return state.accounts as SavedAccount[];
    }

    // legacy 단일 구조
    if (state?.nickname && state?.summary) {
        return [
            {
                id: state.nickname,
                nickname: state.nickname,
                summary: state.summary as CharacterSummary,
                isPrimary: true,
            },
        ];
    }

    return [];
}

function loadLocalState(): {
    accounts: SavedAccount[];
    prefsByChar: Record<string, CharacterTaskPrefs>;
    visibleByChar: Record<string, boolean>;
} {
    let accounts =
        safeJsonParse<SavedAccount[]>(localStorage.getItem(ACCOUNTS_KEY)) ?? [];

    // legacy migration
    if (!accounts.length) {
        const legacy = safeJsonParse<{ nickname: string; data: CharacterSummary }>(
            localStorage.getItem(LOCAL_KEY)
        );
        if (legacy?.nickname && legacy?.data) {
            accounts = [
                {
                    id: legacy.nickname,
                    nickname: legacy.nickname,
                    summary: legacy.data,
                    isPrimary: true,
                },
            ];
            try {
                localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
            } catch { }
        }
    }

    const prefsByChar = buildPrefsByCharFromAccounts(accounts);
    const visibleByChar = buildVisibleByCharFromAccounts(accounts);
    return { accounts, prefsByChar, visibleByChar };
}

function formatGateRanges(gates: number[]) {
    const sorted = [...new Set(gates)].filter(Number.isFinite).sort((a, b) => a - b);
    if (sorted.length === 0) return "";

    const parts: Array<[number, number]> = [];
    let s = sorted[0];
    let p = sorted[0];

    for (let i = 1; i < sorted.length; i++) {
        const cur = sorted[i];
        if (cur === p + 1) {
            p = cur;
            continue;
        }
        parts.push([s, p]);
        s = p = cur;
    }
    parts.push([s, p]);

    return parts.map(([a, b]) => (a === b ? `${a}관` : `${a}-${b}관`)).join(", ");
}

export default function HomeMyTasksSummary({ children }: { children: React.ReactNode }) {
    const { status: authStatus } = useSession();

    const [loading, setLoading] = useState(true);

    const [accounts, setAccounts] = useState<SavedAccount[]>([]);
    const [activeAccountId, setActiveAccountId] = useState<string | null>(null);

    const [prefsByChar, setPrefsByChar] = useState<Record<string, CharacterTaskPrefs>>({});
    const [visibleByChar, setVisibleByChar] = useState<Record<string, boolean>>({});

    const activeAccount =
        accounts.find((a) => a.id === activeAccountId) ??
        accounts.find((a) => a.isPrimary) ??
        accounts[0] ??
        null;

    const selectAccount = (id: string) => {
        if (!accounts.some((a) => a.id === id)) return;
        setActiveAccountId(id);
        try {
            localStorage.setItem(ACTIVE_ACCOUNT_KEY, id);
        } catch { }
    };


    useEffect(() => {
        let cancelled = false;

        async function boot() {
            setLoading(true);

            // 1) 로그인 상태면 서버 state 우선
            if (authStatus === "authenticated") {
                try {
                    const res = await fetch("/api/raid-tasks/state", {
                        method: "GET",
                        headers: { "Content-Type": "application/json" },
                        cache: "no-store",
                        credentials: "include",
                    });

                    if (cancelled) return;

                    if (res.status === 200) {
                        const state = await res.json();
                        const nextAccounts = normalizeAccountsFromAnyState(state);
                        setAccounts(nextAccounts);

                        const nextPrefs =
                            (state?.prefsByChar as Record<string, CharacterTaskPrefs>) ??
                            buildPrefsByCharFromAccounts(nextAccounts);

                        const nextVisible =
                            (state?.visibleByChar as Record<string, boolean>) ??
                            buildVisibleByCharFromAccounts(nextAccounts);

                        setPrefsByChar(nextPrefs);
                        setVisibleByChar(nextVisible);
                        setActiveAccountId(pickActiveAccountId(nextAccounts));

                        setLoading(false);
                        return;
                    }
                } catch (e) {
                    console.error("[HomeMyTasksSummary] server state fetch error:", e);
                }
            }

            // 2) 로컬 fallback
            try {
                const local = loadLocalState();
                if (cancelled) return;

                setAccounts(local.accounts);
                setPrefsByChar(local.prefsByChar);
                setVisibleByChar(local.visibleByChar);
                setActiveAccountId(pickActiveAccountId(local.accounts));
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        if (authStatus === "loading") return;
        boot();

        return () => {
            cancelled = true;
        };
    }, [authStatus]);

    const visibleRoster =
        activeAccount?.summary?.roster?.filter((c) => visibleByChar[c.name] ?? true) ?? [];

    const { totalRemainingTasks, totalRemainingGold, totalGold } =
        useMemo<RaidSummary>(() => {
            return computeRaidSummaryForRoster(visibleRoster, prefsByChar);
        }, [visibleRoster, prefsByChar]);

    const progress =
        totalGold > 0 ? Math.round(((totalGold - totalRemainingGold) / totalGold) * 100) : 0;

    const remainingRaids = useMemo<RemainingRaidRow[]>(() => {
        const map = new Map<string, RemainingRaidRow>();

        for (const c of visibleRoster) {
            const prefs = prefsByChar[c.name];
            const raids = (prefs as any)?.raids ?? {};

            for (const [raidName, p] of Object.entries(raids)) {
                const pref: any = p;
                if (!pref?.enabled) continue;

                const info: any = (raidInformation as any)[raidName];
                const diff: any = info?.difficulty?.[pref.difficulty];
                if (!diff) continue;

                const gatesDef: any[] = Array.isArray(diff.gates) ? diff.gates : [];
                const allGateIdx = gatesDef.map((g) => g.index).filter(Number.isFinite);
                if (!allGateIdx.length) continue;

                // "마지막 관문 체크 = 완료" 기준
                const lastGateIndex = allGateIdx.reduce(
                    (max, x) => (x > max ? x : max),
                    allGateIdx[0]
                );
                const done: number[] = Array.isArray(pref.gates) ? pref.gates : [];
                if (done.includes(lastGateIndex)) continue;

                const remainIdx = allGateIdx.filter((gi) => !done.includes(gi));
                const remainLabel = remainIdx.length
                    ? `${formatGateRanges(remainIdx)} 남음`
                    : "진행 중";

                const row = map.get(raidName) ?? { raidName, chars: [] };
                row.chars.push({ name: c.name, remainLabel });
                map.set(raidName, row);
            }
        }

        const rows = [...map.values()];
        rows.sort((a, b) => {
            const lv = getRaidBaseLevel(b.raidName) - getRaidBaseLevel(a.raidName);
            if (lv) return lv;
            const cnt = b.chars.length - a.chars.length;
            if (cnt) return cnt;
            return a.raidName.localeCompare(b.raidName, "ko");
        });
        return rows;
    }, [visibleRoster, prefsByChar]);

    const ctx: Ctx = {
        loading,

        accounts,
        activeAccountId,
        selectAccount,

        activeAccount,
        totalRemainingTasks,
        totalRemainingGold,
        totalGold,
        progress,
        remainingRaids,
    };


    return <HomeMyTasksCtx.Provider value={ctx}>{children}</HomeMyTasksCtx.Provider>;
}

export function HomeMyTasksHeader() {
    const {
        loading,
        accounts,
        activeAccountId,
        selectAccount,
        activeAccount,
        totalRemainingGold,
        totalRemainingTasks,
        progress,
    } = useHomeMyTasks();

    const [accountOpen, setAccountOpen] = useState(false);
    const popRef = useRef<HTMLDivElement | null>(null);

    // 계정 바뀌면 드롭다운 닫기
    useEffect(() => {
        setAccountOpen(false);
    }, [activeAccountId]);

    // 바깥 클릭하면 닫기
    useEffect(() => {
        if (!accountOpen) return;

        const onDown = (e: MouseEvent) => {
            const el = popRef.current;
            if (!el) return;
            if (el.contains(e.target as Node)) return;
            setAccountOpen(false);
        };

        document.addEventListener("mousedown", onDown, true);
        return () => document.removeEventListener("mousedown", onDown, true);
    }, [accountOpen]);

    if (loading) {
        return (
            <div className="animate-pulse space-y-3">
                <div className="h-4 w-40 bg-white/5 rounded" />
                <div className="h-2 w-full bg-white/5 rounded" />
                <div className="grid grid-cols-2 gap-2">
                    <div className="h-12 bg-white/5 rounded" />
                    <div className="h-12 bg-white/5 rounded" />
                </div>
            </div>
        );
    }

    if (!activeAccount) {
        return (
            <div className="py-8 text-center opacity-60">
                <UserCheck size={38} className="mx-auto mb-2 text-gray-600" />
                <div className="text-lg font-bold text-gray-400">연동된 원정대가 없습니다</div>
            </div>
        );
    }

    const canSwitch = (accounts?.length ?? 0) > 1;

    return (
        <div className="space-y-5">
            {/* [상단] 계정 선택 드롭다운 섹션 (DpsShare 스타일 적용) */}
            <section className="relative rounded-xl bg-[#16181D] border border-white/5 shadow-xl overflow-hidden" ref={popRef}>
                <button
                    type="button"
                    disabled={!canSwitch}
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setAccountOpen((v) => !v);
                    }}
                    className={`w-full flex items-center justify-between px-4 py-3.5 transition-colors ${canSwitch ? 'hover:bg-white/5 cursor-pointer' : 'cursor-default'
                        } ${accountOpen ? 'bg-white/5' : ''}`}
                >
                    <div className="flex flex-col items-start min-w-0 text-left">
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">현재 계정</span>
                        <span className="text-sm font-bold text-white truncate w-full">
                            {activeAccount.nickname}
                        </span>
                    </div>
                    {canSwitch && (
                        <div className="text-gray-400 ml-2">
                            {accountOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                        </div>
                    )}
                </button>

                {/* 드롭다운 메뉴 리스트 */}
                {accountOpen && (
                    <div className="px-3 pb-3 pt-1 bg-[#16181D] border-t border-white/5 animate-in slide-in-from-top-2 duration-200">
                        <div className="flex flex-col gap-1 mt-2">
                            {accounts.map((a) => {
                                const isActive = a.id === activeAccountId;
                                return (
                                    <button
                                        key={a.id}
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            selectAccount(a.id);
                                        }}
                                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 transition-all ${isActive
                                            ? "bg-[#5B69FF]/10 text-white shadow-[inset_0_0_12px_rgba(91,105,255,0.05)]"
                                            : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                                            }`}
                                    >
                                        <div className={`flex items-center justify-center w-4 h-4 ${isActive ? 'text-[#5B69FF]' : 'text-transparent'}`}>
                                            <Check className="h-4 w-4" strokeWidth={3} />
                                        </div>
                                        <span className="text-sm font-bold">{a.nickname}</span>
                                    </button>
                                );
                            })}

                            {/* 계정 관리 링크 */}
                            <div className="mt-1 pt-1 border-t border-white/5">
                                <a
                                    href="/my-tasks"
                                    onClick={(e) => e.stopPropagation()}
                                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[11px] font-black text-gray-500 hover:bg-white/5 hover:text-gray-300 transition-all"
                                >
                                    <div className="w-4 flex justify-center text-gray-600">
                                        <ExternalLink size={12} />
                                    </div>
                                    <span>계정 관리 및 추가</span>
                                </a>
                            </div>
                        </div>
                    </div>
                )}
            </section>

            {/* [중간] 프로그레스 바 및 Weekly 정보 */}
            <div className="space-y-5 px-1">
                <div className="flex items-end justify-between">
                    <div className="space-y-0.5">
                        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Weekly Progress</div>
                        <div className="text-sm font-medium text-gray-400">이번 주 진행도</div>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-black text-[#5B69FF] leading-none tracking-tighter">
                            {progress}%
                        </div>
                    </div>
                </div>

                <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                    <div
                        className="h-full bg-gradient-to-r from-[#5B69FF] to-[#7C88FF] shadow-[0_0_12px_rgba(91,105,255,0.4)] transition-all duration-1000 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 남은 골드 카드 */}
                <div className="p-4 rounded-xl border border-white/5 bg-[#16181D] shadow-lg transition-all hover:border-white/10 group">
                    <div className="flex items-center justify-between w-full">
                        {/* 왼쪽: 아이콘 + 제목 */}
                        <div className="flex items-center gap-2.5">
                            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
                                <Coins size={14} />
                            </div>
                            <span className="text-[11px] text-gray-500 font-bold uppercase tracking-tight">남은 골드</span>
                        </div>

                        {/* 오른쪽 끝: 숫자 */}
                        <div className="text-base font-bold text-gray-100 tabular-nums">
                            {Number(totalRemainingGold ?? 0).toLocaleString()}
                            <span className="ml-1 text-[10px] text-gray-500 font-medium">G</span>
                        </div>
                    </div>
                </div>

                {/* 남은 숙제 카드 */}
                <div className="p-4 rounded-xl border border-white/5 bg-[#16181D] shadow-lg transition-all hover:border-white/10 group">
                    <div className="flex items-center justify-between w-full">
                        {/* 왼쪽: 아이콘 + 제목 */}
                        <div className="flex items-center gap-2.5">
                            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
                                <CalendarDays size={14} />
                            </div>
                            <span className="text-[11px] text-gray-500 font-bold uppercase tracking-tight">남은 숙제</span>
                        </div>

                        {/* 오른쪽 끝: 숫자 */}
                        <div className="text-base font-bold text-gray-100 tabular-nums">
                            {Number(totalRemainingTasks ?? 0)}
                            <span className="ml-1 text-[10px] text-gray-500 font-medium">개</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function HomeMyTasksDetails() {
    const { loading, activeAccount, remainingRaids } = useHomeMyTasks();

    if (loading) {
        return (
            <div className="p-6 text-center text-xs text-gray-500 animate-pulse">
                정보 동기화 중...
            </div>
        );
    }

    return (
        <div className="space-y-2.5 max-h-[420px] overflow-y-auto custom-scrollbar">
            {!activeAccount ? (
                <div className="py-10 text-center opacity-70">
                    <div className="text-xs font-bold text-gray-400">먼저 원정대를 등록해주세요</div>
                    <a
                        href="/my-tasks"
                        className="mt-4 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-black bg-blue-600/15 hover:bg-blue-600/25 text-blue-300 border border-blue-500/10 transition-all"
                    >
                        내 숙제에서 등록하기 <ExternalLink size={12} />
                    </a>
                </div>
            ) : remainingRaids.length === 0 ? (
                <div className="py-10 flex flex-col items-center justify-center opacity-55">
                    <CheckCircle2 size={34} className="text-emerald-500 mb-2" />
                    <p className="text-xs font-bold">모든 숙제를 완료했습니다!</p>
                </div>
            ) : (
                <>
                    {remainingRaids.map((r) => (
                        <div
                            key={r.raidName}
                            className="p-3.5 -white/[0.03bg] rounded-xl border border-white/5 transition-all"
                        >
                            <div className="flex items-center justify-between mb-2.5">
                                <span className="text-[11px] font-bold text-gray-200 tracking-wide">
                                    {r.raidName}
                                </span>
                                <span className="text-[10px] text-gray-600 font-bold">
                                    {r.chars.length}캐릭
                                </span>
                            </div>

                            <div className="flex flex-wrap gap-1.5">
                                {r.chars.map((c, i) => (
                                    <div
                                        key={i}
                                        className="flex items-center gap-1.5 px-2 py-1 bg-black/40 rounded border border-white/5 text-[10px]"
                                    >
                                        <span className="text-gray-200 font-medium">{c.name}</span>
                                        <span className="w-px h-2 bg-white/10" />
                                        <span className="text-gray-300 font-bold">{c.remainLabel}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </>
            )}
        </div>
    );
}


export function HomeMyTasksGuard({ children }: { children: React.ReactNode }) {
    const { loading, activeAccount } = useHomeMyTasks();
    if (loading) return null;
    if (!activeAccount) return null;
    return <>{children}</>;
}