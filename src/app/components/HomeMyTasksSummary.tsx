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

/* ───────── 타입 정의 ───────── */
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

/* ───────── 유틸 함수들 (기존 유지) ───────── */
function safeJsonParse<T>(raw: string | null): T | null {
    if (!raw) return null;
    try { return JSON.parse(raw) as T; } catch { return null; }
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
    const saved = safeJsonParse<Record<string, boolean>>(
        typeof window !== "undefined" ? localStorage.getItem(VISIBLE_KEY) : null
    ) ?? {};
    const next: Record<string, boolean> = {};
    for (const acc of accounts) {
        for (const c of acc.summary?.roster ?? []) {
            next[c.name] = saved[c.name] ?? true;
        }
    }
    try { localStorage.setItem(VISIBLE_KEY, JSON.stringify(next)); } catch { }
    return next;
}

function normalizeAccountsFromAnyState(state: any): SavedAccount[] {
    if (state?.accounts && Array.isArray(state.accounts)) return state.accounts as SavedAccount[];
    if (state?.nickname && state?.summary) {
        return [{ id: state.nickname, nickname: state.nickname, summary: state.summary as CharacterSummary, isPrimary: true }];
    }
    return [];
}

function loadLocalState() {
    let accounts = safeJsonParse<SavedAccount[]>(localStorage.getItem(ACCOUNTS_KEY)) ?? [];
    if (!accounts.length) {
        const legacy = safeJsonParse<{ nickname: string; data: CharacterSummary }>(localStorage.getItem(LOCAL_KEY));
        if (legacy?.nickname && legacy?.data) {
            accounts = [{ id: legacy.nickname, nickname: legacy.nickname, summary: legacy.data, isPrimary: true }];
            try { localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts)); } catch { }
        }
    }
    return {
        accounts,
        prefsByChar: buildPrefsByCharFromAccounts(accounts),
        visibleByChar: buildVisibleByCharFromAccounts(accounts)
    };
}

function formatGateRanges(gates: number[]) {
    const sorted = [...new Set(gates)].filter(Number.isFinite).sort((a, b) => a - b);
    if (sorted.length === 0) return "";
    const parts: Array<[number, number]> = [];
    let s = sorted[0], p = sorted[0];
    for (let i = 1; i < sorted.length; i++) {
        const cur = sorted[i];
        if (cur === p + 1) { p = cur; continue; }
        parts.push([s, p]);
        s = p = cur;
    }
    parts.push([s, p]);
    return parts.map(([a, b]) => (a === b ? `${a}관` : `${a}-${b}관`)).join(", ");
}

/* ───────── Provider ───────── */
export default function HomeMyTasksSummary({ children }: { children: React.ReactNode }) {
    const { status: authStatus } = useSession();
    const [loading, setLoading] = useState(true);
    const [accounts, setAccounts] = useState<SavedAccount[]>([]);
    const [activeAccountId, setActiveAccountId] = useState<string | null>(null);
    const [prefsByChar, setPrefsByChar] = useState<Record<string, CharacterTaskPrefs>>({});
    const [visibleByChar, setVisibleByChar] = useState<Record<string, boolean>>({});

    const activeAccount = accounts.find((a) => a.id === activeAccountId) ?? accounts.find((a) => a.isPrimary) ?? accounts[0] ?? null;

    const selectAccount = (id: string) => {
        if (!accounts.some((a) => a.id === id)) return;
        setActiveAccountId(id);
        try { localStorage.setItem(ACTIVE_ACCOUNT_KEY, id); } catch { }
    };

    useEffect(() => {
        let cancelled = false;
        async function boot() {
            setLoading(true);
            if (authStatus === "authenticated") {
                try {
                    const res = await fetch("/api/raid-tasks/state", { method: "GET", headers: { "Content-Type": "application/json" }, cache: "no-store" });
                    if (cancelled) return;
                    if (res.status === 200) {
                        const state = await res.json();
                        const nextAccounts = normalizeAccountsFromAnyState(state);
                        setAccounts(nextAccounts);
                        setPrefsByChar((state?.prefsByChar as Record<string, CharacterTaskPrefs>) ?? buildPrefsByCharFromAccounts(nextAccounts));
                        setVisibleByChar((state?.visibleByChar as Record<string, boolean>) ?? buildVisibleByCharFromAccounts(nextAccounts));
                        setActiveAccountId(pickActiveAccountId(nextAccounts));
                        setLoading(false);
                        return;
                    }
                } catch (e) { console.error(e); }
            }
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
        return () => { cancelled = true; };
    }, [authStatus]);

    const visibleRoster = activeAccount?.summary?.roster?.filter((c) => visibleByChar[c.name] ?? true) ?? [];
    const { totalRemainingTasks, totalRemainingGold, totalGold } = useMemo(() => computeRaidSummaryForRoster(visibleRoster, prefsByChar), [visibleRoster, prefsByChar]);
    const progress = totalGold > 0 ? Math.round(((totalGold - totalRemainingGold) / totalGold) * 100) : 0;

    const remainingRaids = useMemo(() => {
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
                const lastGateIndex = allGateIdx.reduce((max, x) => (x > max ? x : max), allGateIdx[0]);
                const done: number[] = Array.isArray(pref.gates) ? pref.gates : [];
                if (done.includes(lastGateIndex)) continue;
                const remainIdx = allGateIdx.filter((gi) => !done.includes(gi));
                const remainLabel = remainIdx.length ? `${formatGateRanges(remainIdx)} 남음` : "진행 중";
                const row = map.get(raidName) ?? { raidName, chars: [] };
                row.chars.push({ name: c.name, remainLabel });
                map.set(raidName, row);
            }
        }
        const rows = [...map.values()];
        rows.sort((a, b) => {
            const lv = getRaidBaseLevel(b.raidName) - getRaidBaseLevel(a.raidName);
            if (lv) return lv;
            return b.chars.length - a.chars.length || a.raidName.localeCompare(b.raidName, "ko");
        });
        return rows;
    }, [visibleRoster, prefsByChar]);

    const ctx: Ctx = { loading, accounts, activeAccountId, selectAccount, activeAccount, totalRemainingTasks, totalRemainingGold, totalGold, progress, remainingRaids };
    return <HomeMyTasksCtx.Provider value={ctx}>{children}</HomeMyTasksCtx.Provider>;
}

/* ───────── [Guard] 데이터 유무 체크 및 빈화면 표시 ───────── */
export function HomeMyTasksGuard({ children }: { children: React.ReactNode }) {
    const { loading, activeAccount } = useHomeMyTasks();

    // 🔹 로딩 시 스켈레톤 (flex-1로 꽉 채움)
    if (loading) return <HomeMyTasksSkeleton />;

    // 🔹 데이터 없을 때: 파티 숙제와 동일한 디자인 (flex-1, dashed border)
    if (!activeAccount) {
        return (
            <div className="flex-1 w-full flex flex-col items-center justify-center text-center rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-6">
                <UserCheck size={32} className="mx-auto mb-2 text-gray-600" />
                <p className="text-sm font-medium text-gray-400">연동된 원정대가 없습니다.</p>
                <a
                    href="/my-tasks"
                    className="text-[11px] text-[#5B69FF] hover:underline mt-2 inline-block"
                >
                    내 숙제에서 등록하기 ›
                </a>
            </div>
        );
    }

    return <>{children}</>;
}

/* ───────── [Header] 요약 정보 ───────── */
export function HomeMyTasksHeader() {
    const { loading, accounts, activeAccountId, selectAccount, activeAccount, totalRemainingGold, totalRemainingTasks, progress } = useHomeMyTasks();
    const [accountOpen, setAccountOpen] = useState(false);
    const popRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => { setAccountOpen(false); }, [activeAccountId]);
    useEffect(() => {
        if (!accountOpen) return;
        const onDown = (e: MouseEvent) => { if (popRef.current && !popRef.current.contains(e.target as Node)) setAccountOpen(false); };
        document.addEventListener("mousedown", onDown, true);
        return () => document.removeEventListener("mousedown", onDown, true);
    }, [accountOpen]);

    if (loading) return null; // 로딩은 Guard/Skeleton에서 처리

    if (!activeAccount) return null;

    const canSwitch = (accounts?.length ?? 0) > 1;

    return (
        <div className="space-y-5">
            {/* 계정 선택 드롭다운 */}
            <section className="relative rounded-xl bg-[#16181D] border border-white/5 overflow-hidden" ref={popRef}>
                <button
                    type="button"
                    disabled={!canSwitch}
                    onClick={() => setAccountOpen(!accountOpen)}
                    className={`w-full flex items-center justify-between px-4 py-3.5 transition-colors ${canSwitch ? 'hover:bg-white/5 cursor-pointer' : 'cursor-default'} ${accountOpen ? 'bg-white/5' : ''}`}
                >
                    <div className="flex flex-col items-start min-w-0 text-left">
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">현재 계정</span>
                        <span className="text-sm font-bold text-white truncate w-full">{activeAccount.nickname}</span>
                    </div>
                    {canSwitch && (
                        <div className="text-gray-400 ml-2">
                            {accountOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                        </div>
                    )}
                </button>
                {accountOpen && (
                    <div className="px-3 pb-3 pt-1 bg-[#16181D] border-t border-white/5 animate-in slide-in-from-top-2 duration-200">
                        <div className="flex flex-col gap-1 mt-2">
                            {accounts.map((a) => {
                                const isActive = a.id === activeAccountId;
                                return (
                                    <button key={a.id} type="button" onClick={() => selectAccount(a.id)} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 transition-all ${isActive ? "bg-[#5B69FF]/10 text-white" : "text-gray-400 hover:bg-white/5 hover:text-gray-200"}`}>
                                        <div className={`flex items-center justify-center w-4 h-4 ${isActive ? 'text-[#5B69FF]' : 'text-transparent'}`}><Check className="h-4 w-4" strokeWidth={3} /></div>
                                        <span className="text-sm font-bold">{a.nickname}</span>
                                    </button>
                                );
                            })}
                            <div className="mt-1 pt-1 border-t border-white/5">
                                <a href="/my-tasks" onClick={(e) => e.stopPropagation()} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[11px] font-black text-gray-500 hover:bg-white/5 hover:text-gray-300 transition-all">
                                    <div className="w-4 flex justify-center text-gray-600"><ExternalLink size={12} /></div>
                                    <span>계정 관리 및 추가</span>
                                </a>
                            </div>
                        </div>
                    </div>
                )}
            </section>

            {/* 프로그레스 바 */}
            <div className="space-y-5 px-1">
                <div className="flex items-end justify-between">
                    <div className="space-y-0.5">
                        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Weekly Progress</div>
                        <div className="text-sm font-medium text-gray-400">이번 주 진행도</div>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-black text-[#5B69FF] leading-none tracking-tighter">{progress}%</div>
                    </div>
                </div>
                <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                    <div className="h-full bg-[#5B69FF] transition-all duration-1000 ease-out" style={{ width: `${progress}%` }} />
                </div>
            </div>

            {/* 요약 카드들 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-xl border border-white/5 bg-[#16181D] transition-all hover:border-white/10 group">
                    <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2.5">
                            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500"><Coins size={14} /></div>
                            <span className="text-[11px] text-gray-500 font-bold uppercase tracking-tight">남은 골드</span>
                        </div>
                        <div className="text-base font-bold text-gray-100 tabular-nums">
                            {Number(totalRemainingGold ?? 0).toLocaleString()}<span className="ml-1 text-[10px] text-gray-500 font-medium">G</span>
                        </div>
                    </div>
                </div>
                <div className="p-4 rounded-xl border border-white/5 bg-[#16181D] transition-all hover:border-white/10 group">
                    <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2.5">
                            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500"><CalendarDays size={14} /></div>
                            <span className="text-[11px] text-gray-500 font-bold uppercase tracking-tight">남은 숙제</span>
                        </div>
                        <div className="text-base font-bold text-gray-100 tabular-nums">
                            {Number(totalRemainingTasks ?? 0)}<span className="ml-1 text-[10px] text-gray-500 font-medium">개</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ───────── [Details] 상세 리스트 ───────── */
export function HomeMyTasksDetails() {
    const { loading, activeAccount, remainingRaids } = useHomeMyTasks();

    if (loading) return null; // 로딩은 Guard가 처리

    // Guard가 있으므로 activeAccount가 null일 일은 거의 없지만 안전장치
    if (!activeAccount) return null;

    if (remainingRaids.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center opacity-55 py-8">
                <CheckCircle2 size={34} className="text-emerald-500 mb-2" />
                <p className="text-xs font-bold">모든 숙제를 완료했습니다!</p>
            </div>
        );
    }

    // 🔹 [수정] h-full로 꽉 채우고 min-h-0으로 스크롤 보장
    return (
        <div className="h-full min-h-0 overflow-y-auto custom-scrollbar space-y-2.5 pr-1">
            {remainingRaids.map((r) => (
                <div key={r.raidName} className="p-3.5 bg-white/[0.03] rounded-xl border border-white/5 transition-all">
                    <div className="flex items-center justify-between mb-2.5">
                        <span className="text-[11px] font-bold text-gray-200 tracking-wide">{r.raidName}</span>
                        <span className="text-[10px] text-gray-600 font-bold">{r.chars.length}캐릭</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {r.chars.map((c, i) => (
                            <div key={i} className="flex items-center gap-1.5 px-2 py-1 bg-black/40 rounded border border-white/5 text-[10px]">
                                <span className="text-gray-200 font-medium">{c.name}</span>
                                <span className="w-px h-2 bg-white/10" />
                                <span className="text-gray-300 font-bold">{c.remainLabel}</span>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

function HomeMyTasksSkeleton() {
    return (
        // 🔹 [수정] flex-1 적용
        <div className="flex-1 w-full flex flex-col justify-center animate-pulse gap-4">
            <div className="h-10 bg-white/5 rounded w-full" />
            <div className="h-32 bg-white/5 rounded w-full" />
        </div>
    );
}