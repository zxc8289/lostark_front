"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import CharacterTaskStrip, { TaskItem } from "../components/tasks/CharacterTaskStrip";
import TaskCard from "../components/tasks/TaskCard";
import EditTasksModal from "../components/tasks/EditTasksModal";
import type { CharacterSummary, RosterCharacter } from "../components/AddAccount";
import { raidInformation } from "@/server/data/raids";
import type { CharacterTaskPrefs } from "@/app/lib/tasks/raid-prefs";
import { clearAllPrefs, clearCharPrefs, readPrefs, writePrefs } from "@/app/lib/tasks/raid-prefs";
import CharacterSettingModal from "../components/tasks/CharacterSettingModal";
import TaskTable from "../components/tasks/TaskTable";
import { useSession } from "next-auth/react";
import {
  getRaidBaseLevel,
  calcNextGates,
  computeRaidSummaryForRoster,
  buildAutoSetupForRoster,
  type RaidSummary,
} from "../lib/tasks/raid-utils";
import AnimatedNumber from "../components/tasks/AnimatedNumber";
import EmptyCharacterState from "../components/tasks/EmptyCharacterState";
import { AlertTriangle, Check, ChevronDown, ChevronUp, Plus, UserCircle2, UsersRound } from "lucide-react";
import GoogleAd from "../components/GoogleAd";
import TaskSidebar from "../components/tasks/TaskSidebar";

// 🔥 [추가] 전역 웹소켓 훅 임포트
import { useGlobalWebSocket } from "../components/WebSocketProvider";

type SavedFilters = {
  onlyRemain?: boolean;
  isCardView?: boolean;
};

type SavedAccount = {
  id: string;
  nickname: string;
  summary: CharacterSummary;
  isPrimary?: boolean;  // 대표 계정 (서버에 저장)
  isSelected?: boolean; // 과거 데이터용, 실제 선택은 ACTIVE_ACCOUNT_KEY로 관리
};


const FILTER_KEY = "raidTaskFilters";
const LOCAL_KEY = "raidTaskLastAccount"; // 예전 단일 구조용 (마이그레이션용)
const VISIBLE_KEY = "raidTaskVisibleByChar";

const ACCOUNTS_KEY = "raidTaskAccounts"; // 여러 계정 저장
const ACTIVE_ACCOUNT_KEY = "raidTaskActiveAccount"; // 현재 선택 계정 ID
const AD_SLOT_SIDEBAR = "4444902536";
const AD_SLOT_BOTTOM_BANNER = "7577482274"

/** 좌측 필터 영역에서 쓸 필터 값 localStorage에서 복원 */
function loadSavedFilters(): SavedFilters | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(FILTER_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);

    if (typeof saved.tableView === 'boolean' && saved.isCardView === undefined) {
      saved.isCardView = !saved.tableView;
    }
    return saved as SavedFilters;
  } catch {
    return null;
  }
}

export default function MyTasksPage() {
  const { data: session, status: authStatus } = useSession();
  const [syncedWithServer, setSyncedWithServer] = useState(false);
  const [syncingServer, setSyncingServer] = useState(false);
  const isAuthed = authStatus === "authenticated" && !!session?.user;

  // 🔥 [추가] 전역 웹소켓 연결 객체 가져오기
  const wsContext = useGlobalWebSocket();
  const ws = wsContext?.ws;
  const sendMessage = wsContext?.sendMessage;

  const [onlyRemain, setOnlyRemain] = useState<boolean>(() => {
    const saved = loadSavedFilters();
    return typeof saved?.onlyRemain === "boolean" ? saved.onlyRemain : false;
  });

  const [isCardView, setIsCardView] = useState<boolean>(() => {
    const saved = loadSavedFilters();
    return typeof saved?.isCardView === "boolean" ? saved.isCardView : false;
  });

  /** 필터 초기화 버튼 */
  const resetFilters = () => {
    setOnlyRemain(false);
    setIsCardView(false);
  };

  const clearClientStorage = () => {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem(LOCAL_KEY);
      localStorage.removeItem(VISIBLE_KEY);
      localStorage.removeItem(ACCOUNTS_KEY);
      clearAllPrefs();
    } catch {
      // 무시
    }
  };


  /* ──────────────────────────
   * 계정/검색 관련 상태
   * ────────────────────────── */

  const [accounts, setAccounts] = useState<SavedAccount[]>([]);
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null);

  const activeAccount =
    accounts.find((a) => a.id === activeAccountId) ??
    accounts.find((a) => a.isPrimary) ??
    accounts[0] ??
    null;

  const [isAccountListOpen, setIsAccountListOpen] = useState(false);
  const currentAccount = activeAccount;


  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [booting, setBooting] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [accountSearchErr, setAccountSearchErr] = useState<string | null>(null);


  /* ──────────────────────────
   * 캐릭터별 레이드 설정 상태
   * ────────────────────────── */
  const [prefsByChar, setPrefsByChar] = useState<Record<string, CharacterTaskPrefs>>({});
  const [editingChar, setEditingChar] = useState<RosterCharacter | null>(null);
  const [isCharSettingOpen, setIsCharSettingOpen] = useState(false);

  /** 캐릭터별 표시 여부 (왼쪽 설정 모달에서 제어) */
  const [visibleByChar, setVisibleByChar] = useState<Record<string, boolean>>({});

  /* ──────────────────────────
   * 🔥 [추가] 웹소켓 실시간 데이터 수신 (다른 기기/파티탭 동기화)
   * ────────────────────────── */
  useEffect(() => {
    if (!ws || !isAuthed || !session?.user) return;

    const myUserId = (session.user as any).id || (session.user as any).userId;

    const handleMessage = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data);

        // 1. 다른 탭이나 기기에서 내 데이터 변경 시
        if (msg.type === "memberUpdated" && msg.userId === myUserId) {
          if (msg.prefsByChar) setPrefsByChar(msg.prefsByChar);
          if (msg.visibleByChar) setVisibleByChar(msg.visibleByChar);
        }

        // 2. 다른 곳에서 계정(로스터) 변경 시
        if (msg.type === "activeAccountUpdated" && msg.userId === myUserId) {
          if (msg.activeAccountId) setActiveAccountId(msg.activeAccountId);
        }
      } catch (e) {
        console.error("WS Parse Error", e);
      }
    };

    ws.addEventListener("message", handleMessage);
    return () => ws.removeEventListener("message", handleMessage);
  }, [ws, isAuthed, session]);


  /* ──────────────────────────
   * 첫 진입 시 localStorage에서 여러 계정/활성 계정 복원
   * ────────────────────────── */
  useEffect(() => {
    try {
      const rawAccounts = localStorage.getItem(ACCOUNTS_KEY);
      if (rawAccounts) {
        const parsed = JSON.parse(rawAccounts) as SavedAccount[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAccounts(parsed);
          setBooting(false);
          return;
        }
      }

      // Legacy 마이그레이션
      const rawLegacy = localStorage.getItem(LOCAL_KEY);
      if (rawLegacy) {
        const legacy = JSON.parse(rawLegacy) as {
          nickname: string;
          data: CharacterSummary;
        };

        const migrated: SavedAccount = {
          id: legacy.nickname,
          nickname: legacy.nickname,
          summary: legacy.data,
          isPrimary: true,
        };

        const list = [migrated];
        setAccounts(list);
        localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(list));
      }
    } catch {
      // 무시
    } finally {
      setBooting(false);
    }
  }, []);

  /* ──────────────────────────
   * 캐릭터별 prefs 초기 로드
   * ────────────────────────── */
  useEffect(() => {
    if (isAuthed) return;
    if (!accounts.length) return;

    setPrefsByChar((prev) => {
      const next = { ...prev };
      for (const acc of accounts) {
        for (const c of acc.summary?.roster ?? []) {
          next[c.name] = readPrefs(c.name) ?? next[c.name] ?? { raids: {} };
        }
      }
      return next;
    });
  }, [accounts, isAuthed]);

  /* ──────────────────────────
   * visibleByChar 초기 로드
   * ────────────────────────── */
  useEffect(() => {
    if (isAuthed) return;
    if (!accounts.length) return;

    try {
      const raw = localStorage.getItem(VISIBLE_KEY);
      const saved = raw ? (JSON.parse(raw) as Record<string, boolean>) : {};

      const next: Record<string, boolean> = {};
      for (const acc of accounts) {
        for (const c of acc.summary?.roster ?? []) {
          next[c.name] = saved[c.name] ?? true;
        }
      }

      setVisibleByChar(next);
      localStorage.setItem(VISIBLE_KEY, JSON.stringify(next));
    } catch {
      // 무시
    }
  }, [accounts, isAuthed]);


  useEffect(() => {
    if (!accounts.length) {
      setActiveAccountId(null);
      return;
    }

    setActiveAccountId((prev) => {
      if (prev && accounts.some((a) => a.id === prev)) {
        return prev;
      }

      let nextId: string | null = null;
      if (typeof window !== "undefined") {
        try {
          const savedId = localStorage.getItem(ACTIVE_ACCOUNT_KEY);
          if (savedId && accounts.some((a) => a.id === savedId)) {
            nextId = savedId;
          }
        } catch { }
      }

      if (!nextId) {
        const base = accounts.find((a) => a.isPrimary) ?? accounts[0];
        nextId = base.id;
      }

      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(ACTIVE_ACCOUNT_KEY, nextId);
        } catch { }
      }

      return nextId;
    });
  }, [accounts]);


  /* ──────────────────────────
   * 필터 상태를 localStorage에 저장
   * ────────────────────────── */
  useEffect(() => {
    try {
      const payload: SavedFilters = { onlyRemain, isCardView };
      localStorage.setItem(FILTER_KEY, JSON.stringify(payload));
    } catch { }
  }, [onlyRemain, isCardView, isAuthed]);


  // 🔥 [수정] 데이터 변경 시 웹소켓 전송 추가
  function setCharPrefs(
    name: string,
    updater: (cur: CharacterTaskPrefs) => CharacterTaskPrefs
  ) {
    setPrefsByChar((prev) => {
      const cur = prev[name] ?? { raids: {} };
      const nextVal = updater(cur);
      const next = { ...prev, [name]: nextVal };

      if (!isAuthed) {
        writePrefs(name, nextVal);
      } else if (session?.user && sendMessage) {
        // 웹소켓으로 내 변경 상태 전송
        const userId = (session.user as any).id || (session.user as any).userId;
        sendMessage({
          type: "gateUpdate",
          userId,
          prefsByChar: next,
          visibleByChar,
        });
      }

      return next;
    });
  }

  function buildServerStatePayload() {
    const primaryAccount = accounts.find((a) => a.isPrimary) ?? accounts[0] ?? null;
    const accountsForServer = accounts.map(({ isSelected, ...rest }) => rest);

    return {
      nickname: primaryAccount?.nickname ?? null,
      summary: primaryAccount?.summary ?? null,
      accounts: accountsForServer,
      prefsByChar,
      visibleByChar,
    };
  }

  function applyServerState(state: any) {
    try {
      if (state.accounts && Array.isArray(state.accounts)) {
        const serverAccounts = state.accounts as SavedAccount[];
        setAccounts(serverAccounts);
      } else if (state.nickname && state.summary) {
        const migrated: SavedAccount = {
          id: state.nickname,
          nickname: state.nickname,
          summary: state.summary,
          isPrimary: true,
        };
        setAccounts([migrated]);
      }

      if (state.prefsByChar) setPrefsByChar(state.prefsByChar);
      if (state.visibleByChar) setVisibleByChar(state.visibleByChar);
    } catch { }
  }


  // 🔥 [수정] 계정 탭 전환 시 웹소켓 전송 추가
  const handleSelectAccount = (id: string) => {
    setActiveAccountId(id);
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(ACTIVE_ACCOUNT_KEY, id);
      }
    } catch { }

    if (isAuthed && session?.user && sendMessage) {
      const userId = (session.user as any).id || (session.user as any).userId;
      sendMessage({
        type: "activeAccountUpdate",
        userId,
        activeAccountId: id,
      });
    }
  };


  /* ──────────────────────────
   * 로그인 상태에서 자동 저장 (디바운스)
   * ────────────────────────── */
  useEffect(() => {
    if (authStatus !== "authenticated") return;
    if (!syncedWithServer) return;
    if (booting) return;

    const controller = new AbortController();

    const timeoutId = setTimeout(() => {
      const payload = buildServerStatePayload();
      fetch("/api/raid-tasks/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      }).catch((e: any) => {
        if (e?.name === "AbortError") return;
        console.error("raid-tasks autosave failed", e);
      });
    }, 400);

    return () => {
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, [authStatus, syncedWithServer, booting, accounts, prefsByChar, visibleByChar, onlyRemain, isCardView]);

  /* ──────────────────────────
   * 로그인 상태에서 초기 서버 동기화
   * ────────────────────────── */
  useEffect(() => {
    if (authStatus !== "authenticated") return;
    if (syncedWithServer) return;
    if (booting) return;

    let cancelled = false;

    async function syncWithServer() {
      let didSync = false;
      setSyncingServer(true);
      try {
        const res = await fetch("/api/raid-tasks/state", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        });

        if (cancelled) return;

        if (res.status === 200) {
          const serverState = await res.json();
          applyServerState(serverState);
          didSync = true;
        } else if (res.status === 204 || res.status === 404) {
          const hasSomethingLocal =
            accounts.length > 0 ||
            Object.keys(prefsByChar).length > 0 ||
            Object.keys(visibleByChar).length > 0;

          if (hasSomethingLocal) {
            const payload = buildServerStatePayload();
            await fetch("/api/raid-tasks/state", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
            didSync = true;
          } else {
            didSync = true;
          }
        }
      } catch (e) {
        console.error("raid-tasks state sync failed", e);
      } finally {
        if (!cancelled && didSync) {
          clearClientStorage();
          setSyncedWithServer(true);
        }
        if (!cancelled) setSyncingServer(false);
      }
    }

    syncWithServer();
    return () => { cancelled = true; };
  }, [authStatus, syncedWithServer, booting, accounts, prefsByChar, visibleByChar, onlyRemain, isCardView]);


  const buildTasksFor = (c: RosterCharacter): TaskItem[] => {
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

      if (onlyRemain) {
        const gatesDef = diff.gates ?? [];
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
              const allGateIdx = diff.gates.map((g) => g.index);
              setCharPrefs(c.name, (cur) => {
                const curRaid = cur.raids[raidName] ?? p;
                const currentGates = curRaid.gates ?? [];
                const next = calcNextGates(gate, currentGates, allGateIdx);

                return {
                  ...cur,
                  raids: {
                    ...cur.raids,
                    [raidName]: { ...curRaid, gates: next },
                  },
                };
              });
            }}
          />
        ),
      });
    }
    return items;
  };

  const handleDeleteAccount = () => {
    if (!activeAccount) return;

    setDeleteConfirmOpen(false);
    setIsCharSettingOpen(false);

    try {
      const namesToRemove = new Set(
        activeAccount.summary?.roster?.map((c) => c.name) ?? []
      );

      if (!isAuthed) {
        for (const name of namesToRemove) {
          clearCharPrefs(name);
        }
      }

      setPrefsByChar((prev) => {
        const next: typeof prev = {};
        for (const [charName, prefs] of Object.entries(prev)) {
          if (!namesToRemove.has(charName)) {
            next[charName] = prefs;
          }
        }
        return next;
      });

      setVisibleByChar((prev) => {
        const next = { ...prev };
        for (const name of namesToRemove) {
          delete next[name];
        }
        return next;
      });
    } catch { }

    let nextActiveId: string | null = null;

    setAccounts((prev) => {
      const without = prev.filter((a) => a.id !== activeAccount.id);

      if (without.length === 0) {
        if (!isAuthed) {
          try { localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(without)); } catch { }
        }
        nextActiveId = null;
        return [];
      }

      const baseActive = without.find((a) => a.isPrimary) ?? without[0];
      nextActiveId = baseActive.id;

      if (!isAuthed) {
        try { localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(without)); } catch { }
      }
      return without;
    });

    if (typeof window !== "undefined") {
      try {
        if (nextActiveId) {
          localStorage.setItem(ACTIVE_ACCOUNT_KEY, nextActiveId);
        } else {
          localStorage.removeItem(ACTIVE_ACCOUNT_KEY);
        }
      } catch { }
    }
    setActiveAccountId(nextActiveId);
  };


  const handleCharacterSearch = async (name: string): Promise<boolean> => {
    const trimmed = name.trim();
    if (!trimmed) return false;

    setLoading(true);
    setErr(null);
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

      let newActiveId: string | null = null;

      setAccounts((prev) => {
        let next = [...prev];
        const idx = next.findIndex(
          (a) => a.nickname.toLowerCase() === trimmed.toLowerCase()
        );

        if (idx >= 0) {
          const existing = next[idx];
          const updated = { ...existing, summary: json };
          next[idx] = updated;
          newActiveId = updated.id;
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
          };
          next = [...prev, acc];
          newActiveId = id;
        }

        if (!isAuthed) {
          try { localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(next)); } catch { }
        }
        return next;
      });

      if (newActiveId) {
        setActiveAccountId(newActiveId);
        try {
          if (typeof window !== "undefined") {
            localStorage.setItem(ACTIVE_ACCOUNT_KEY, newActiveId);
          }
        } catch { }
      }

      return true;

    } catch (e: any) {
      const errMsg = e?.message ?? String(e);
      console.error("캐릭터 검색 실패:", errMsg);
      setErr(errMsg);
      setAccountSearchErr(errMsg);
      return false;
    } finally {
      setLoading(false);
    }
  };


  const handleSearchSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    void handleCharacterSearch(searchInput);
  };

  const handleRefreshAccount = async () => {
    if (!activeAccount) return;
    await handleCharacterSearch(activeAccount.nickname);
  };

  const visibleRoster =
    activeAccount?.summary?.roster?.filter((c) => visibleByChar[c.name] ?? true) ?? [];

  const {
    totalRemainingTasks,
    remainingCharacters,
    totalRemainingGold,
    totalGold,
  } = useMemo<RaidSummary>(() => {
    return computeRaidSummaryForRoster(visibleRoster, prefsByChar);
  }, [visibleRoster, prefsByChar]);

  const isAllCleared = totalRemainingGold === 0 && totalGold > 0;
  const hasRoster = !!activeAccount && !!activeAccount.summary?.roster?.length;
  const isAuthLoading = authStatus === "loading";
  const isAuthAuthed = authStatus === "authenticated";
  const waitingInitialData = isAuthLoading || (isAuthAuthed && !syncedWithServer);
  const showInitialLoading = !hasRoster && (waitingInitialData || booting || syncingServer);
  const showEmptyState = !showInitialLoading && !hasRoster && (authStatus === "unauthenticated" || (authStatus === "authenticated" && syncedWithServer));

  const handleTableToggleGate = (
    charName: string,
    raidName: string,
    gate: number,
    currentGates: number[],
    allGates: number[]
  ) => {
    setCharPrefs(charName, (cur) => {
      const curRaid = cur.raids[raidName];
      if (!curRaid) return cur;

      const nextGates = calcNextGates(gate, currentGates ?? [], allGates ?? []);
      return {
        ...cur,
        raids: {
          ...cur.raids,
          [raidName]: { ...curRaid, gates: nextGates },
        },
      };
    });
  };

  // 🔥 [수정] 자동 세팅 시 웹소켓 전송 추가
  const handleAutoSetup = () => {
    if (!activeAccount?.summary?.roster || activeAccount.summary.roster.length === 0)
      return;

    const roster = activeAccount.summary.roster;
    const { nextPrefsByChar, nextVisibleByChar } = buildAutoSetupForRoster(
      roster,
      prefsByChar
    );

    let mergedPrefs = { ...prefsByChar };
    let mergedVisible = { ...visibleByChar };

    setPrefsByChar((prev) => {
      mergedPrefs = { ...prev, ...nextPrefsByChar };
      try {
        if (!isAuthed) {
          for (const [name, prefs] of Object.entries(nextPrefsByChar)) {
            writePrefs(name, prefs);
          }
        }
      } catch { }
      return mergedPrefs;
    });

    setVisibleByChar((prev) => {
      mergedVisible = { ...prev, ...nextVisibleByChar };
      try {
        if (!isAuthed) {
          localStorage.setItem(VISIBLE_KEY, JSON.stringify(mergedVisible));
        } else if (session?.user && sendMessage) {
          const userId = (session.user as any).id || (session.user as any).userId;
          sendMessage({
            type: "gateUpdate",
            userId,
            prefsByChar: mergedPrefs,
            visibleByChar: mergedVisible,
          });
        }
      } catch { }
      return mergedVisible;
    });
  };


  // 🔥 [수정] 관문 초기화 시 웹소켓 전송 추가
  const gateAllClear = () => {
    setPrefsByChar((prev) => {
      const next: typeof prev = {};

      for (const [name, prefs] of Object.entries(prev)) {
        const raids = prefs.raids ?? {};
        const clearedRaids: CharacterTaskPrefs["raids"] = {};

        for (const [raidName, raidPref] of Object.entries(raids)) {
          clearedRaids[raidName] = {
            ...raidPref,
            gates: [],
          };
        }

        const updated: CharacterTaskPrefs = {
          ...prefs,
          raids: clearedRaids,
        };

        next[name] = updated;

        try {
          if (!isAuthed) writePrefs(name, updated);
        } catch { }
      }

      if (isAuthed && session?.user && sendMessage) {
        const userId = (session.user as any).id || (session.user as any).userId;
        sendMessage({
          type: "gateUpdate",
          userId,
          prefsByChar: next,
          visibleByChar,
        });
      }

      return next;
    });
  };

  return (
    <div className="w-full text-white py-8 sm:py-12">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 py-0 sm:py-2 px-4 sm:px-0">
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight truncate break-keep">
              내 숙제
            </h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,210px)_minmax(0,1fr)] gap-5 lg:items-start">
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
              adSlot={AD_SLOT_SIDEBAR}
            />
            {accountSearchErr && (
              <p className="mt-2 text-[11px] text-red-400 px-1">
                에러: {accountSearchErr}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:gap-5">
            {/* 🔥 Stats Bar (모바일 Edge-to-Edge) */}
            <div className="bg-[#16181D] rounded-none sm:rounded-2xl border-x-0 sm:border border-white/5 shadow-sm px-4 sm:px-5 py-3 sm:py-4">
              <div className="flex flex-wrap gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between max-[1246px]:flex-col max-[1246px]:items-start max-[1246px]:justify-start">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 min-w-0 text-sm sm:text-base">
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-semibold text-sm sm:text-lg pr-1">숙제 남은 캐릭터</span>
                    <AnimatedNumber value={remainingCharacters} className="text-gray-400 text-xs sm:text-sm font-semibold" />
                  </div>
                  <span className="hidden sm:inline h-4 w-px bg-white/10" />
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-semibold text-sm sm:text-lg pr-1">남은 숙제</span>
                    <AnimatedNumber value={totalRemainingTasks} className="text-gray-400 text-xs sm:text-sm font-semibold" />
                  </div>
                  <span className="hidden sm:inline h-4 w-px bg-white/10" />
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-semibold text-sm sm:text-lg pr-1">남은 골드</span>
                    <div className={["inline-flex items-baseline justify-end", "min-w-[50px]", "text-xs sm:text-sm font-semibold", "font-mono tabular-nums", isAllCleared ? "line-through decoration-gray-300 decoration-1 text-gray-400" : "text-gray-400"].join(" ")}>
                      <AnimatedNumber value={isAllCleared ? totalGold : totalRemainingGold} />
                      <span className="ml-0.5 text-[0.75em]">g</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-row flex-wrap gap-2 sm:gap-3 max-[]:w-full max-[]:justify-start">
                  <button onClick={handleAutoSetup} disabled={!hasRoster} className="relative group flex items-center justify-center py-2 px-6 rounded-lg bg-white/[.04] border border-white/10 hover:bg-white/5 hover:border-white/20 text-xs sm:text-sm font-medium text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed">
                    <span>자동 세팅</span>
                    <span className="absolute top-1 right-1 w-3 h-3 rounded-full border border-white/20 text-[9px] font-bold flex items-center justify-center text-gray-400 bg-black/20 group-hover:text-white group-hover:border-white/40 transition-colors duration-200 cursor-help">?</span>
                    <div className="pointer-events-none absolute bottom-full left-15 mb-3 w-64 p-3 rounded-xl bg-gray-900/95 backdrop-blur-md border border-white/10 text-xs text-gray-300 leading-relaxed text-center shadow-2xl shadow-black/50 opacity-0 translate-y-2 scale-95 group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-100 transition-all duration-200 ease-out z-20">
                      <p><span className="text-white font-semibold">아이템 레벨 상위 6개 캐릭터</span>와 해당 캐릭터의 <span className="text-indigo-400">Top 3 레이드</span>를 자동으로 세팅합니다.</p>
                      <div className="absolute -bottom-1.5 left-4 w-3 h-3 bg-gray-900/95 border-b border-r border-white/10 rotate-45" />
                    </div>
                  </button>
                  <button onClick={gateAllClear} className="inline-flex items-center justify-center py-2 px-3 sm:px-4 rounded-md bg-white/[.04] border border-white/10 hover:bg-white/5 text-xs sm:text-sm">
                    <span>관문 초기화</span>
                  </button>
                  <button onClick={() => setIsCharSettingOpen(true)} className="inline-flex items-center justify-center py-2 px-3 sm:px-4 rounded-md bg-white/[.04] border border-white/10 text-xs sm:text-sm font-medium">
                    캐릭터 설정
                  </button>
                </div>
              </div>
            </div>

            {/* 🔥 빈 상태 (모바일 Edge-to-Edge) */}
            {showEmptyState && (
              <div className="w-full py-10 sm:py-16 px-4 sm:px-6 flex flex-col items-center justify-center text-center bg-[#16181D] border-x-0 sm:border-x-2 border-y-2 sm:border-y-2 border-dashed border-white/10 rounded-none sm:rounded-2xl animate-in fade-in zoom-in-95 duration-500">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-[#5B69FF] blur-[40px] opacity-20 rounded-full" />
                  <div className="relative w-16 h-16 sm:w-20 sm:h-20 bg-[#1E222B] rounded-full flex items-center justify-center border border-white/10 shadow-xl">
                    <span className="text-sm sm:text-base font-semibold text-[#5B69FF]">LOA</span>
                  </div>
                  <div className="absolute -right-2 -bottom-2 bg-[#16181D] px-2 py-0.5 rounded-full border border-white/10">
                    <span className="text-[10px] text-gray-400">검색</span>
                  </div>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 sm:mb-3">원정대 캐릭터를 불러오세요</h2>
                <p className="text-gray-400 max-w-md mb-6 sm:mb-8 leading-relaxed text-[12px] sm:text-base">
                  아직 등록된 캐릭터 데이터가 없습니다.<br />
                  <span className="text-gray-400">대표 캐릭터 닉네임을 입력하면 전투정보실에서 정보를 가져옵니다.</span>
                </p>
                <form onSubmit={handleSearchSubmit} className="relative flex items-center w-full max-w-md">
                  <input type="text" placeholder="캐릭터 닉네임 입력" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} disabled={loading} className="w-full h-11 sm:h-12 pl-4 pr-11 sm:pr-12 rounded-lg bg-[#0F1115] border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[#5B69FF] focus:ring-1 focus:ring-[#5B69FF] transition-all disabled:opacity-50" />
                  <button type="submit" disabled={loading || !searchInput.trim()} className="absolute right-1.5 px-3 py-2 rounded-md bg-[#5B69FF] text-white hover:bg-[#4A57E6] disabled:bg-gray-700 disabled:text-gray-400 transition-colors text-xs sm:text-sm">
                    {loading ? <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "검색"}
                  </button>
                </form>
                {accountSearchErr && <p className="mt-3 text-sm text-red-400">{accountSearchErr}</p>}
              </div>
            )}

            {showInitialLoading && (
              <div className="w-full space-y-4 animate-in fade-in duration-300">
                {/* 🔥 스켈레톤 상단 바 (모바일 Edge-to-Edge) */}
                <div className="bg-[#16181D] rounded-none sm:rounded-2xl border-x-0 sm:border border-white/5 px-4 sm:px-5 py-3 sm:py-4 animate-pulse">
                  <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="h-5 w-36 rounded bg-white/5" />
                      <div className="h-5 w-28 rounded bg-white/5" />
                      <div className="h-5 w-32 rounded bg-white/5" />
                    </div>
                    <div className="flex flex-wrap gap-2 sm:gap-3">
                      <div className="h-9 w-24 rounded-lg bg-white/5" />
                      <div className="h-9 w-24 rounded-lg bg-white/5" />
                      <div className="h-9 w-28 rounded-lg bg-white/5" />
                    </div>
                  </div>
                </div>
                {/* 🔥 스켈레톤 카드들 (모바일 Edge-to-Edge) */}
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="h-[180px] rounded-none sm:rounded-2xl border-x-0 sm:border border-white/5 bg-[#16181D] p-5 animate-pulse">
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
                <span className="sr-only">원정대 정보를 불러오는 중입니다...</span>
              </div>
            )}

            {!isCardView && hasRoster ? (
              <TaskTable
                roster={visibleRoster}
                prefsByChar={prefsByChar}
                onToggleGate={handleTableToggleGate}
                onEdit={(c) => setEditingChar(c)}
              />
            ) : (
              <div className="flex flex-col gap-4">
                {visibleRoster
                  .sort((a, b) => (b.itemLevelNum ?? 0) - (a.itemLevelNum ?? 0))
                  .map((c) => {
                    const tasks = buildTasksFor(c);
                    if (onlyRemain && tasks.length === 0) return null;
                    return (
                      <CharacterTaskStrip
                        key={c.name}
                        character={c}
                        tasks={tasks}
                        onEdit={() => setEditingChar(c)}
                        onReorder={(char, newOrderIds) => {
                          setCharPrefs(char.name, (cur) => ({
                            ...cur,
                            order: newOrderIds,
                          }));
                        }}
                      />
                    );
                  })}
              </div>
            )}
            <div className="block lg:hidden w-full">
              {/* 🔥 모바일 Ad 배너 (모바일 Edge-to-Edge) */}
              <div className="w-full bg-[#1e2128]/30 border-x-0 sm:border border-white/5 rounded-none sm:rounded-2xl overflow-hidden flex items-center justify-center" style={{ height: '100px', minHeight: '100px', maxHeight: '100px' }}>
                <GoogleAd slot={AD_SLOT_BOTTOM_BANNER} className="!my-0 w-full h-full" responsive={false} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 모달창 등은 화면 한가운데 뜨기 때문에 둥글기를 그대로 유지(rounded-2xl)합니다. */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-[#1E2028] border border-white/10 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 text-red-500">
                <AlertTriangle className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">계정을 삭제하시겠습니까?</h3>
              <p className="text-sm text-gray-400 leading-relaxed mb-6">
                현재 선택된 계정의 모든 캐릭터와<br />숙제 설정 데이터가 삭제됩니다.<br />
                <span className="text-red-400/80 text-xs mt-1 block">(이 작업은 되돌릴 수 없습니다)</span>
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirmOpen(false)} className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-medium transition-colors text-sm">취소</button>
                <button onClick={handleDeleteAccount} className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold transition-colors text-sm shadow-lg shadow-red-500/20">삭제하기</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editingChar && (
        <EditTasksModal
          open
          onClose={() => setEditingChar(null)}
          character={editingChar}
          initial={prefsByChar[editingChar.name] ?? null}
          onSave={(prefs) => {
            setCharPrefs(editingChar.name, () => prefs);
            setEditingChar(null);
          }}
        />
      )}

      {/* 🔥 [수정] 캐릭터 숨김 설정 변경 시 웹소켓 전송 반영 */}
      {isCharSettingOpen && (
        <CharacterSettingModal
          open
          onClose={() => {
            setIsCharSettingOpen(false);
            setAccountSearchErr(null);
          }}
          roster={activeAccount?.summary?.roster ?? []}
          onDeleteAccount={() => setDeleteConfirmOpen(true)}
          onRefreshAccount={handleRefreshAccount}
          visibleByChar={visibleByChar}
          refreshError={accountSearchErr}
          onChangeVisible={(partial) => {
            setVisibleByChar((prev) => {
              const merged = { ...prev, ...partial };
              try {
                if (!isAuthed) {
                  localStorage.setItem(VISIBLE_KEY, JSON.stringify(merged));
                } else if (session?.user && sendMessage) {
                  const userId = (session.user as any).id || (session.user as any).userId;
                  sendMessage({
                    type: "gateUpdate",
                    userId,
                    prefsByChar,
                    visibleByChar: merged,
                  });
                }
              } catch { }
              return merged;
            });
          }}
        />
      )}

      <EmptyCharacterState
        open={isAddAccountOpen}
        onClose={() => {
          setIsAddAccountOpen(false);
          setAccountSearchErr(null);
        }}
        loading={loading}
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