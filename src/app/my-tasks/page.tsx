// src/app/my-tasks/page.tsx
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
  migrateLegacyPrefs, // 🔥 이거 추가!
  type RaidSummary,
} from "../lib/tasks/raid-utils";

import AnimatedNumber from "../components/tasks/AnimatedNumber";
import EmptyCharacterState from "../components/tasks/EmptyCharacterState";
import { AlertTriangle, Check, Plus, RefreshCcw, Settings, X, Wand2 } from "lucide-react";
import GoogleAd from "../components/GoogleAd";

// 🔥 공용 사이드바 컴포넌트 임포트!
import TaskSidebar from "../components/tasks/TaskSidebar";

// 🔥 전역 웹소켓 훅
import { useGlobalWebSocket } from "../components/WebSocketProvider";
import { closestCenter, DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ⭐ 1. 상단 Wrapper 함수 수정
function SortableCardStripWrapper({ id, character, tasks, onEdit, onReorderTask, isDragEnabled, onAllClear }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    position: isDragging ? ("relative" as const) : ("static" as const),
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <CharacterTaskStrip
        character={character}
        tasks={tasks}
        onEdit={onEdit}
        onAllClear={onAllClear}
        onReorder={onReorderTask}
        isDragEnabled={isDragEnabled}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

const DEMO_ACCOUNT_ID = "__demo__";

function pickDemoRaidNames(): string[] {
  const preferred = ["발탄", "비아키스", "쿠크세이튼", "아브렐슈드", "카멘", "일리아칸", "아카테스"];
  const keys = Object.keys(raidInformation);

  const picked: string[] = [];
  for (const p of preferred) {
    if (raidInformation[p] && !picked.includes(p)) picked.push(p);
    if (picked.length >= 3) return picked;
  }

  for (const k of keys) {
    if (!picked.includes(k)) picked.push(k);
    if (picked.length >= 3) break;
  }
  return picked.slice(0, 3);
}

function pickDifficulty(raidName: string): "노말" | "하드" | "나메" {
  const info = raidInformation[raidName];
  const diffs = Object.keys(info?.difficulty ?? {}) as Array<"노말" | "하드" | "나메">;
  if (diffs.includes("노말")) return "노말";
  if (diffs.includes("하드")) return "하드";
  if (diffs.includes("나메")) return "나메";
  return (diffs[0] ?? "노말") as any;
}

function getAllGateIndices(raidName: string, difficulty: "노말" | "하드" | "나메"): number[] {
  const info = raidInformation[raidName];
  const diff = info?.difficulty?.[difficulty];
  const gates = diff?.gates ?? [];
  return gates.map((g) => g.index);
}

function buildDemoPrefsByChar(charNames: string[]): Record<string, CharacterTaskPrefs> {
  const raids = pickDemoRaidNames();

  const result: Record<string, CharacterTaskPrefs> = {};
  for (let i = 0; i < charNames.length; i++) {
    const name = charNames[i];

    const raidsObj: CharacterTaskPrefs["raids"] = {};
    for (let r = 0; r < raids.length; r++) {
      const raidName = raids[r];
      const difficulty = pickDifficulty(raidName);
      const allGates = getAllGateIndices(raidName, difficulty);

      let gates: number[] = [];
      if (allGates.length) {
        if (i === 0 && r === 0) {
          gates = [allGates[0]];
        } else if (i === 1 && r === 1) {
          gates = [allGates[allGates.length - 1]];
        } else if (i === 2 && r === 2) {
          gates = allGates.slice(0, Math.min(2, allGates.length));
        }
      }

      raidsObj[raidName] = {
        enabled: true,
        difficulty,
        gates,
      } as any;
    }

    result[name] = {
      raids: raidsObj,
      order: raids,
    };
  }

  return result;
}

const DEMO_ROSTER: RosterCharacter[] = [
  { name: "테스트워로드", className: "워로드", serverName: "루페온", itemLevel: "1740.00", itemLevelNum: 1740, image: null } as any as RosterCharacter,
  { name: "테스트소서리스", className: "소서리스", serverName: "루페온", itemLevel: "1730.00", itemLevelNum: 1730, image: null } as any as RosterCharacter,
  { name: "테스트바드", className: "바드", serverName: "루페온", itemLevel: "1720.00", itemLevelNum: 1720, image: null } as any as RosterCharacter,
  { name: "테스트기상술사", className: "기상술사", serverName: "루페온", itemLevel: "1710.00", itemLevelNum: 1710, image: null } as any as RosterCharacter,
  { name: "테스트건슬링어", className: "건슬링어", serverName: "루페온", itemLevel: "1700.00", itemLevelNum: 1700, image: null } as any as RosterCharacter,
  { name: "테스트블레이드", className: "블레이드", serverName: "루페온", itemLevel: "1690.00", itemLevelNum: 1690, image: null } as any as RosterCharacter,
];

const DEMO_CHAR_NAMES = DEMO_ROSTER.map((c) => c.name);
const DEMO_PREFS_BY_CHAR = buildDemoPrefsByChar(DEMO_CHAR_NAMES);
const DEMO_VISIBLE_BY_CHAR = Object.fromEntries(DEMO_CHAR_NAMES.map((n) => [n, true])) as Record<string, boolean>;

const DEMO_SUMMARY: CharacterSummary = {
  roster: DEMO_ROSTER,
} as any as CharacterSummary;

type SavedFilters = {
  onlyRemain?: boolean;
  isCardView?: boolean;
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

const FILTER_KEY = "raidTaskFilters";
const LOCAL_KEY = "raidTaskLastAccount";
const VISIBLE_KEY = "raidTaskVisibleByChar";
const GOLD_KEY = "raidTaskGoldByChar";
const TABLE_ORDER_KEY = "raidTaskTableOrder";
const ROSTER_ORDER_KEY = "raidTaskRosterOrder";
const CARD_ROSTER_ORDER_KEY = "raidTaskCardRosterOrder";

const ACCOUNTS_KEY = "raidTaskAccounts";
const ACTIVE_ACCOUNT_KEY = "raidTaskActiveAccount";

const AD_SLOT_SIDEBAR = "4444902536";
const AD_SLOT_BOTTOM_BANNER = "7577482274";

function loadSavedFilters(): SavedFilters | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(FILTER_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);

    if (typeof (saved as any).tableView === "boolean" && (saved as any).isCardView === undefined) {
      (saved as any).isCardView = !(saved as any).tableView;
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
  const [showAutoSetupSettings, setShowAutoSetupSettings] = useState(false);
  const [autoSetupConfirmOpen, setAutoSetupConfirmOpen] = useState(false);
  const [showAllViewWarning, setShowAllViewWarning] = useState(false); // 🔥 경고 모달
  const [isDragEnabled, setIsDragEnabled] = useState<boolean>(() => {
    const saved = loadSavedFilters();
    return typeof saved?.isDragEnabled === "boolean" ? saved.isDragEnabled : false;
  });

  const [autoSetupCharCount, setAutoSetupCharCount] = useState<number>(() => {
    if (typeof window === "undefined") return 6;
    try {
      const saved = localStorage.getItem("raidTaskAutoSetupCount");
      return saved ? Number(saved) : 6;
    } catch {
      return 6;
    }
  });

  const [autoSetupSortType, setAutoSetupSortType] = useState<"latest" | "gold">(() => {
    if (typeof window === "undefined") return "latest";
    try {
      const saved = localStorage.getItem("raidTaskAutoSetupSortType");
      return saved === "gold" ? "gold" : "latest";
    } catch {
      return "latest";
    }
  });

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

  const [selectedRaids, setSelectedRaids] = useState<string[]>(() => {
    const saved = loadSavedFilters();
    return Array.isArray(saved?.selectedRaids) ? saved.selectedRaids : [];
  });

  const clearClientStorage = () => {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem(LOCAL_KEY);
      localStorage.removeItem(VISIBLE_KEY);
      localStorage.removeItem(ACCOUNTS_KEY);
      localStorage.removeItem(ROSTER_ORDER_KEY);
      clearAllPrefs();
    } catch { }
  };

  /* ──────────────────────────
   * 계정/검색 관련 상태
   * ────────────────────────── */

  const [accounts, setAccounts] = useState<SavedAccount[]>([]);
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null);

  // 🔥 "모두 보기" 처리를 위한 effectiveAccount 계산
  const isAllView = activeAccountId === "ALL";
  const effectiveAccount = useMemo(() => {
    if (isAllView) {
      // 모든 계정 병합 후 아이템 레벨 정렬
      const allRoster = accounts.flatMap(a => a.summary?.roster || []);
      const uniqueRoster = Array.from(new Map(allRoster.map(item => [item.name, item])).values());
      uniqueRoster.sort((a, b) => (b.itemLevelNum ?? 0) - (a.itemLevelNum ?? 0));

      return {
        id: "ALL",
        nickname: "모두 보기",
        summary: {
          name: "모두 보기",
          roster: uniqueRoster,
        },
        isSelected: true,
      } as SavedAccount;
    }

    return accounts.find((a) => a.id === activeAccountId) ??
      accounts.find((a) => a.isPrimary) ??
      accounts[0] ??
      null;
  }, [accounts, activeAccountId, isAllView]);

  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [loading, setLoading] = useState(false);
  const [booting, setBooting] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [accountSearchErr, setAccountSearchErr] = useState<string | null>(null);

  /* ──────────────────────────
   * 캐릭터별 레이드 설정 상태
   * ────────────────────────── */

  const [prefsByChar, setPrefsByChar] = useState<Record<string, CharacterTaskPrefs>>({});
  const [tableOrder, setTableOrder] = useState<string[]>([]);
  const [editingChar, setEditingChar] = useState<RosterCharacter | null>(null);
  const [isCharSettingOpen, setIsCharSettingOpen] = useState(false);
  const [rosterOrder, setRosterOrder] = useState<string[]>([]);
  const [cardRosterOrder, setCardRosterOrder] = useState<string[]>([]);
  const [visibleByChar, setVisibleByChar] = useState<Record<string, boolean>>({});
  const [goldDesignatedByChar, setGoldDesignatedByChar] = useState<Record<string, boolean>>({}); // 🔥 추가


  /* ✅ 데모 상태 */
  const [demoEnabled, setDemoEnabled] = useState(true);
  const [demoPrefsByChar, setDemoPrefsByChar] = useState<Record<string, CharacterTaskPrefs>>(() => DEMO_PREFS_BY_CHAR);
  const [demoVisibleByChar, setDemoVisibleByChar] = useState<Record<string, boolean>>(() => DEMO_VISIBLE_BY_CHAR);
  const [demoGoldDesignatedByChar, setDemoGoldDesignatedByChar] = useState<Record<string, boolean>>(() => DEMO_VISIBLE_BY_CHAR); // 🔥 추가

  /* ──────────────────────────
   * 웹소켓 실시간 데이터 수신
   * ────────────────────────── */

  useEffect(() => {
    if (isAuthed) return;
    try {
      const saved = localStorage.getItem(CARD_ROSTER_ORDER_KEY);
      if (saved) setCardRosterOrder(JSON.parse(saved));
    } catch { }
  }, [isAuthed]);

  useEffect(() => {
    try {
      localStorage.setItem("raidTaskAutoSetupCount", String(autoSetupCharCount));
    } catch { }
  }, [autoSetupCharCount]);

  useEffect(() => {
    try {
      localStorage.setItem("raidTaskAutoSetupSortType", autoSetupSortType);
    } catch { }
  }, [autoSetupSortType]);

  useEffect(() => {
    if (isAuthed) return;
    try {
      const saved = localStorage.getItem(TABLE_ORDER_KEY);
      if (saved) setTableOrder(JSON.parse(saved));
    } catch { }
  }, [isAuthed]);

  useEffect(() => {
    if (isAuthed) return;
    try {
      const saved = localStorage.getItem(ROSTER_ORDER_KEY);
      if (saved) setRosterOrder(JSON.parse(saved));
    } catch { }
  }, [isAuthed]);

  useEffect(() => {
    if (!ws || !isAuthed || !session?.user) return;

    const myUserId = (session.user as any).id || (session.user as any).userId;

    const handleMessage = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === "memberUpdated" && msg.userId === myUserId) {
          if (msg.prefsByChar) setPrefsByChar(msg.prefsByChar);
          if (msg.visibleByChar) setVisibleByChar(msg.visibleByChar);
          if (msg.tableOrder) setTableOrder(msg.tableOrder);
          if (msg.rosterOrder) setRosterOrder(msg.rosterOrder);
          if (msg.cardRosterOrder) setCardRosterOrder(msg.cardRosterOrder);
          if (msg.goldDesignatedByChar) setGoldDesignatedByChar(msg.goldDesignatedByChar); // 🔥 추가
        }

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
   * 첫 진입 시 localStorage에서 계정 복원
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
        const legacy = JSON.parse(rawLegacy) as { nickname: string; data: CharacterSummary };

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
    } finally {
      setBooting(false);
    }
  }, []);

  /* ──────────────────────────
   * 캐릭터별 prefs 초기 로드(비로그인)
   * ────────────────────────── */
  useEffect(() => {
    if (isAuthed) return;
    if (!accounts.length) return;

    setPrefsByChar((prev) => {
      const next = { ...prev };
      for (const acc of accounts) {
        for (const c of acc.summary?.roster ?? []) {
          const loaded = readPrefs(c.name);
          // 🔥 수정된 부분: 로컬에서 읽어온 데이터(loaded)나 기존 데이터에 마이그레이션 적용
          next[c.name] = migrateLegacyPrefs(loaded ?? next[c.name] ?? { raids: {} });
        }
      }
      return next;
    });
  }, [accounts, isAuthed]);

  /* ──────────────────────────
   * visibleByChar 초기 로드(비로그인)
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
    } catch { }
  }, [accounts, isAuthed]);

  /* ──────────────────────────
   * goldDesignatedByChar 초기 로드(비로그인)
   * ────────────────────────── */
  useEffect(() => {
    if (isAuthed) return;
    if (!accounts.length) return;

    try {
      const raw = localStorage.getItem(GOLD_KEY);
      const saved = raw ? (JSON.parse(raw) as Record<string, boolean>) : {};

      const next: Record<string, boolean> = {};
      let goldCount = 0;

      for (const acc of accounts) {
        for (const c of acc.summary?.roster ?? []) {
          if (saved[c.name] !== undefined) {
            next[c.name] = saved[c.name];
          } else {
            next[c.name] = goldCount < 6; // 최초면 상위 6개 자동 지정
          }
          if (next[c.name]) goldCount++;
        }
      }

      setGoldDesignatedByChar(next);
      localStorage.setItem(GOLD_KEY, JSON.stringify(next));
    } catch { }
  }, [accounts, isAuthed]);

  useEffect(() => {
    if (!accounts.length) {
      setActiveAccountId(null);
      return;
    }

    setActiveAccountId((prev) => {
      // 기존에 ALL 상태면 유지
      if (prev === "ALL") return prev;
      if (prev && accounts.some((a) => a.id === prev)) return prev;

      let nextId: string | null = null;
      if (typeof window !== "undefined") {
        try {
          const savedId = localStorage.getItem(ACTIVE_ACCOUNT_KEY);
          if (savedId === "ALL") return "ALL";
          if (savedId && accounts.some((a) => a.id === savedId)) nextId = savedId;
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
   * 필터 상태 localStorage 저장
   * ────────────────────────── */
  useEffect(() => {
    try {
      const payload: SavedFilters = { onlyRemain, isCardView, selectedRaids, isDragEnabled };
      localStorage.setItem(FILTER_KEY, JSON.stringify(payload));
    } catch { }
  }, [onlyRemain, isCardView, selectedRaids, isAuthed, isDragEnabled]);

  /* ──────────────────────────
   * 로스터/로딩 상태 계산
   * ────────────────────────── */
  const hasRealRoster = !!effectiveAccount && !!effectiveAccount.summary?.roster?.length;

  const isAuthLoading = authStatus === "loading";
  const waitingInitialData = isAuthLoading || (isAuthed && !syncedWithServer);

  const showInitialLoading = !hasRealRoster && (waitingInitialData || booting || syncingServer);

  const usingDemo = demoEnabled && !hasRealRoster && !showInitialLoading;

  const currentActiveAccount: SavedAccount | null = usingDemo
    ? {
      id: DEMO_ACCOUNT_ID,
      nickname: "예시 원정대",
      summary: DEMO_SUMMARY,
      isPrimary: true,
    }
    : effectiveAccount;

  const effectivePrefsByChar = usingDemo ? demoPrefsByChar : prefsByChar;
  const effectiveVisibleByChar = usingDemo ? demoVisibleByChar : visibleByChar;

  const effectiveHasRoster = !!currentActiveAccount && !!currentActiveAccount.summary?.roster?.length;

  const showEmptyState =
    !showInitialLoading &&
    !hasRealRoster &&
    !usingDemo &&
    (authStatus === "unauthenticated" || (authStatus === "authenticated" && syncedWithServer));

  /* ──────────────────────────
   * 필터: selectedRaids
   * ────────────────────────── */
  const isRaidFilterActive = selectedRaids.length > 0;

  const raidFilteredPrefsByChar = useMemo(() => {
    if (!isRaidFilterActive) return effectivePrefsByChar;

    const next: Record<string, CharacterTaskPrefs> = {};
    for (const [char, pref] of Object.entries(effectivePrefsByChar)) {
      const filteredRaids: any = {};
      for (const [rName, rData] of Object.entries(pref.raids ?? {})) {
        if (selectedRaids.includes(rName)) filteredRaids[rName] = rData;
      }
      next[char] = {
        ...pref,
        raids: filteredRaids,
        order: pref.order?.filter((r) => selectedRaids.includes(r)),
      };
    }
    return next;
  }, [effectivePrefsByChar, isRaidFilterActive, selectedRaids]);

  function setCharPrefs(name: string, updater: (cur: CharacterTaskPrefs) => CharacterTaskPrefs) {
    if (usingDemo) {
      setDemoPrefsByChar((prev) => {
        const cur = prev[name] ?? { raids: {} };
        const nextVal = updater(cur);
        return { ...prev, [name]: nextVal };
      });
      return;
    }

    setPrefsByChar((prev) => {
      const cur = prev[name] ?? { raids: {} };
      const nextVal = updater(cur);
      const next = { ...prev, [name]: nextVal };

      if (!isAuthed) {
        writePrefs(name, nextVal);
      } else if (session?.user && sendMessage) {
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
      tableOrder,
      rosterOrder,
      cardRosterOrder,
      activeAccountId,
      goldDesignatedByChar,
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

      if (state.prefsByChar) {
        const migratedPrefs: Record<string, CharacterTaskPrefs> = {};
        for (const [char, p] of Object.entries(state.prefsByChar)) {
          migratedPrefs[char] = migrateLegacyPrefs(p as CharacterTaskPrefs);
        }
        setPrefsByChar(migratedPrefs);
      }
      if (state.visibleByChar) setVisibleByChar(state.visibleByChar);
      if (state.tableOrder) setTableOrder(state.tableOrder);
      if (state.rosterOrder) setRosterOrder(state.rosterOrder);
      if (state.cardRosterOrder) setCardRosterOrder(state.cardRosterOrder);
      if (state.activeAccountId) setActiveAccountId(state.activeAccountId);
      if (state.goldDesignatedByChar) setGoldDesignatedByChar(state.goldDesignatedByChar); // 🔥 추가
    } catch { }
  }

  const handleSelectAccount = (id: string) => {
    setActiveAccountId(id);
    try {
      if (typeof window !== "undefined") localStorage.setItem(ACTIVE_ACCOUNT_KEY, id);
    } catch { }

    if (isAuthed && session?.user && sendMessage) {
      const userId = (session.user as any).id || (session.user as any).userId;
      sendMessage({ type: "activeAccountUpdate", userId, activeAccountId: id });

      // 내 로컬 상태 서버에도 엎어치기 (동기화)
      const payload = buildServerStatePayload();
      payload.activeAccountId = id;
      fetch("/api/raid-tasks/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch(e => console.error(e));
    }
  };

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
  }, [authStatus, syncedWithServer, booting, accounts, prefsByChar, visibleByChar, tableOrder, rosterOrder, cardRosterOrder, activeAccountId]);

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
            accounts.length > 0 || Object.keys(prefsByChar).length > 0 || Object.keys(visibleByChar).length > 0;

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
    return () => {
      cancelled = true;
    };
  }, [authStatus, syncedWithServer, booting, accounts, prefsByChar, visibleByChar]);

  const buildTasksFor = (c: RosterCharacter): TaskItem[] => {
    const prefs = effectivePrefsByChar[c.name];
    if (!prefs) return [];

    const baseRaidNames = prefs.order?.filter((r) => (prefs.raids as any)?.[r]) ?? Object.keys(prefs.raids ?? {});
    const raidNames = prefs.order ? baseRaidNames : [...baseRaidNames].sort((a, b) => getRaidBaseLevel(b) - getRaidBaseLevel(a));

    const items: TaskItem[] = [];

    for (const raidName of raidNames) {
      if (isRaidFilterActive && !selectedRaids.includes(raidName)) continue;

      const p = (prefs.raids as any)?.[raidName];
      if (!p?.enabled) continue;

      const info = raidInformation[raidName];
      if (!info) continue;

      const diff = (info.difficulty as any)?.[p.difficulty];
      if (!diff) continue;

      if (onlyRemain) {
        const gatesDef = diff.gates ?? [];
        if (gatesDef.length) {
          const lastGateIndex = gatesDef.reduce((max: number, g: any) => (g.index > max ? g.index : max), gatesDef[0].index);
          const gates = p.gates ?? [];
          const isCompleted = gates.includes(lastGateIndex);
          if (isCompleted) continue;
        }
      }

      const isGoldEarn = safeGoldDesignatedByChar[c.name] ?? false;

      // 🔥 개별 카드의 골드 합산 (귀속 선 차감)
      const totalGold = (p.gates ?? []).reduce((sum: number, gi: number) => {
        const g = diff.gates.find((x: any) => x.index === gi);
        if (!g) return sum;

        // 골드 캐릭이 아니면 벌어들이는 수익은 0
        const baseGold = (isGoldEarn && p.isGold) ? (g.gold ?? 0) : 0;
        const bGold = (isGoldEarn && p.isGold) ? (g.boundGold ?? 0) : 0;
        let cost = p.isBonus ? (g.bonusCost ?? 0) : 0;

        // 귀속 골드 우선 차감
        const netBoundGold = Math.max(0, bGold - cost);
        cost = Math.max(0, cost - bGold);
        // 남은 비용 일반 골드에서 차감
        const netGold = Math.max(0, baseGold - cost);

        return sum + netGold + netBoundGold;
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
            isBonus={p.isBonus}
            gates={p.gates}
            right={right}
            onToggleGate={(gate) => {
              const allGateIdx = (diff.gates ?? []).map((g: any) => g.index);
              setCharPrefs(c.name, (cur) => {
                const curRaid = (cur.raids as any)?.[raidName] ?? p;
                const currentGates = curRaid.gates ?? [];
                const next = calcNextGates(gate, currentGates, allGateIdx);

                return {
                  ...cur,
                  raids: {
                    ...(cur.raids ?? {}),
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

  const handleCharacterSearch = async (name: string): Promise<boolean> => {
    const trimmed = name.trim();
    if (!trimmed) return false;

    setLoading(true);
    setErr(null);
    setAccountSearchErr(null);

    try {
      const r = await fetch(`/api/lostark/character/${encodeURIComponent(trimmed)}`, { cache: "no-store" });
      if (!r.ok) throw new Error("캐릭터 정보를 불러오지 못했습니다. 닉네임을 확인해주세요.");

      const json = (await r.json()) as CharacterSummary;
      if (!json || !json.roster || json.roster.length === 0) {
        throw new Error("캐릭터 정보를 찾을 수 없습니다. (원정대 정보 없음)");
      }

      let newActiveId: string | null = null;

      setAccounts((prev) => {
        let next = [...prev];
        const idx = next.findIndex((a) => a.nickname.toLowerCase() === trimmed.toLowerCase());

        if (idx >= 0) {
          const existing = next[idx];
          const updated = { ...existing, summary: json };
          next[idx] = updated;
          newActiveId = updated.id;
        } else {
          const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${trimmed}-${Date.now()}`;
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
          if (typeof window !== "undefined") localStorage.setItem(ACTIVE_ACCOUNT_KEY, newActiveId);
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

  const handleMyRefreshAccount = async () => {
    if (!currentActiveAccount || isAllView) return; // 🔥 모두 보기 상태에선 동작 방지
    try {
      setIsRefreshing(true);
      await handleCharacterSearch(currentActiveAccount.nickname);
    } catch (e) {
      console.error(e);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSearchSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    void handleCharacterSearch(searchInput);
  };

  const handleDeleteAccount = () => {
    if (!currentActiveAccount || usingDemo || isAllView) return; // 🔥 모두 보기 상태에선 삭제 방지

    setDeleteConfirmOpen(false);
    setIsCharSettingOpen(false);

    try {
      const namesToRemove = new Set(currentActiveAccount.summary?.roster?.map((c) => c.name) ?? []);

      if (!isAuthed) {
        for (const name of namesToRemove) clearCharPrefs(name);
      }

      setPrefsByChar((prev) => {
        const next: typeof prev = {};
        for (const [charName, prefs] of Object.entries(prev)) {
          if (!namesToRemove.has(charName)) next[charName] = prefs;
        }
        return next;
      });

      setVisibleByChar((prev) => {
        const next = { ...prev };
        for (const name of namesToRemove) delete next[name];
        return next;
      });

      let nextActiveId: string | null = null;

      setAccounts((prev) => {
        const without = prev.filter((a) => a.id !== currentActiveAccount.id);

        if (without.length === 0) {
          if (!isAuthed) {
            try { localStorage.setItem(ACCOUNTS_KEY, JSON.stringify([])); } catch { }
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
          if (nextActiveId) localStorage.setItem(ACTIVE_ACCOUNT_KEY, nextActiveId);
          else localStorage.removeItem(ACTIVE_ACCOUNT_KEY);
        } catch { }
      }
      setActiveAccountId(nextActiveId);
    } catch (e) {
      console.error("계정 삭제 중 오류 발생:", e);
    }
  };

  const handleAutoSetup = (charCount: number = 6, sortType: "latest" | "gold" = "latest") => {
    if (!currentActiveAccount?.summary?.roster || currentActiveAccount.summary.roster.length === 0) return;

    const roster = currentActiveAccount.summary.roster;
    const { nextPrefsByChar, nextVisibleByChar, nextGoldByChar } = buildAutoSetupForRoster(roster, effectivePrefsByChar, charCount, sortType);
    const RESET_TABLE_ORDER = ["__empty_0"];

    const nextVisibleMerged: Record<string, boolean> = usingDemo ? { ...demoVisibleByChar } : { ...visibleByChar };
    const nextGoldMerged: Record<string, boolean> = usingDemo ? { ...demoGoldDesignatedByChar } : { ...goldDesignatedByChar }; // 🔥 추가

    for (const c of roster) {
      const name = c.name;
      nextVisibleMerged[name] = nextVisibleByChar[name] ?? false;
      nextGoldMerged[name] = nextGoldByChar[name] ?? false; // 🔥 추가
    }

    const nextPrefsMerged: Record<string, CharacterTaskPrefs> = usingDemo
      ? { ...demoPrefsByChar, ...nextPrefsByChar }
      : { ...prefsByChar, ...nextPrefsByChar };

    if (usingDemo) {
      setDemoPrefsByChar(nextPrefsMerged);
      setDemoVisibleByChar(nextVisibleMerged);
      setDemoGoldDesignatedByChar(nextGoldMerged); // 🔥 추가
      setTableOrder(RESET_TABLE_ORDER);
      return;
    }

    setPrefsByChar(nextPrefsMerged);
    setVisibleByChar(nextVisibleMerged);
    setGoldDesignatedByChar(nextGoldMerged); // 🔥 추가
    setTableOrder(RESET_TABLE_ORDER);

    if (!isAuthed) {
      try {
        for (const [name, prefs] of Object.entries(nextPrefsByChar)) writePrefs(name, prefs);
        localStorage.setItem(VISIBLE_KEY, JSON.stringify(nextVisibleMerged));
        localStorage.setItem(GOLD_KEY, JSON.stringify(nextGoldMerged)); // 🔥 추가
        localStorage.setItem(TABLE_ORDER_KEY, JSON.stringify(RESET_TABLE_ORDER));
      } catch { }
      return;
    }

    if (session?.user && sendMessage) {
      const userId = (session.user as any).id || (session.user as any).userId;

      sendMessage({
        type: "gateUpdate",
        userId,
        prefsByChar: nextPrefsMerged,
        visibleByChar: nextVisibleMerged,
        goldDesignatedByChar: nextGoldMerged, // 🔥 추가
      });

      sendMessage({
        type: "tableOrderUpdate",
        userId,
        tableOrder: RESET_TABLE_ORDER,
      });
    }
  };

  const gateAllClear = () => {
    if (usingDemo) {
      setDemoPrefsByChar((prev) => {
        const next: typeof prev = {};
        for (const [name, prefs] of Object.entries(prev)) {
          const raids = (prefs.raids ?? {}) as any;
          const cleared: any = {};
          for (const [raidName, raidPref] of Object.entries(raids)) {
            cleared[raidName] = { ...(raidPref as any), gates: [] };
          }
          next[name] = { ...prefs, raids: cleared };
        }
        return next;
      });
      return;
    }

    setPrefsByChar((prev) => {
      const next: typeof prev = {};

      for (const [name, prefs] of Object.entries(prev)) {
        const raids = prefs.raids ?? {};
        const clearedRaids: CharacterTaskPrefs["raids"] = {} as any;

        for (const [raidName, raidPref] of Object.entries(raids as any)) {
          (clearedRaids as any)[raidName] = { ...(raidPref as any), gates: [] };
        }

        const updated: CharacterTaskPrefs = { ...prefs, raids: clearedRaids };

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

  const handleSingleCharacterAllClear = (charName: string) => {
    setCharPrefs(charName, (cur) => {
      const raids = cur.raids ?? {};

      // 1. 현재 완료 상태 확인
      let isAllCurrentlyCleared = true;
      for (const [raidName, raidPref] of Object.entries(raids as any)) {
        if (!raidPref || !(raidPref as any).enabled) continue;
        const info = raidInformation[raidName];
        const diff = (info?.difficulty as any)?.[(raidPref as any).difficulty];
        const allGateIndices = (diff?.gates ?? []).map((g: any) => g.index);
        const currentGates = (raidPref as any).gates ?? [];

        if (allGateIndices.length !== currentGates.length) {
          isAllCurrentlyCleared = false;
          break;
        }
      }

      // 2. 결과 적용
      const nextRaids: any = {};
      for (const [raidName, raidPref] of Object.entries(raids as any)) {
        if (!raidPref || !(raidPref as any).enabled) {
          nextRaids[raidName] = raidPref;
          continue;
        }

        if (isAllCurrentlyCleared) {
          nextRaids[raidName] = { ...(raidPref as any), gates: [] };
        } else {
          const info = raidInformation[raidName];
          const diff = (info?.difficulty as any)?.[(raidPref as any).difficulty];
          const allGateIndices = (diff?.gates ?? []).map((g: any) => g.index);
          nextRaids[raidName] = { ...(raidPref as any), gates: allGateIndices };
        }
      }

      return { ...cur, raids: nextRaids };
    });
  };


  const handleTableToggleGate = (
    charName: string,
    raidName: string,
    gate: number,
    currentGates: number[],
    allGates: number[]
  ) => {
    setCharPrefs(charName, (cur) => {
      const curRaid = (cur.raids as any)?.[raidName];
      if (!curRaid) return cur;

      const nextGates = calcNextGates(gate, currentGates ?? [], allGates ?? []);
      return {
        ...cur,
        raids: {
          ...(cur.raids ?? {}),
          [raidName]: { ...curRaid, gates: nextGates },
        },
      };
    });
  };

  const visibleRoster = (currentActiveAccount?.summary?.roster ?? []).filter((c) => (effectiveVisibleByChar[c.name] ?? true)) ?? [];

  // 🔥 골드 지정 마이그레이션(Fallback) 로직
  const safeGoldDesignatedByChar = useMemo(() => {
    const baseGoldData = usingDemo ? demoGoldDesignatedByChar : goldDesignatedByChar;

    // 데이터가 존재하면 그대로 사용
    if (baseGoldData && Object.keys(baseGoldData).length > 0) {
      return baseGoldData;
    }

    // 데이터가 아예 없다면 (기존 유저) 로스터 기준 아이템 레벨 상위 6캐릭을 임시로 켬
    const fullRoster = currentActiveAccount?.summary?.roster ?? [];
    const sorted = [...fullRoster].sort((a, b) => (b.itemLevelNum ?? 0) - (a.itemLevelNum ?? 0));

    const fallback: Record<string, boolean> = {};
    sorted.forEach((c, index) => {
      fallback[c.name] = index < 6;
    });

    return fallback;
  }, [usingDemo, demoGoldDesignatedByChar, goldDesignatedByChar, currentActiveAccount]);

  const {
    totalRemainingTasks,
    remainingCharacters,
    totalRemainingGold,
    totalGold,
    totalRemainingBoundGold = 0,
    totalBoundGold = 0,
  } = useMemo<RaidSummary & { totalRemainingBoundGold?: number; totalBoundGold?: number }>(() => {
    // 🔥 effective 대신 safeGoldDesignatedByChar 사용
    return computeRaidSummaryForRoster(visibleRoster, effectivePrefsByChar, safeGoldDesignatedByChar) as any;
  }, [visibleRoster, effectivePrefsByChar, safeGoldDesignatedByChar]);

  const isAllCleared = (totalRemainingGold === 0 && totalRemainingBoundGold === 0) && (totalGold > 0 || totalBoundGold > 0);

  const shouldShowAds = effectiveHasRoster && !usingDemo;

  const tablePrefsByChar = useMemo(() => {
    const base = raidFilteredPrefsByChar;
    if (!onlyRemain) return base;

    const next: Record<string, CharacterTaskPrefs> = {};

    for (const [charName, pref] of Object.entries(base)) {
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

        const lastGateIndex = gatesDef.reduce((max: number, g: any) => (g.index > max ? g.index : max), gatesDef[0].index);
        const gates = (raidPref as any).gates ?? [];
        const isCompleted = gates.includes(lastGateIndex);

        if (isCompleted) continue;
        filteredRaids[raidName] = raidPref;
      }

      const nextOrder = pref.order?.filter((r) => filteredRaids[r]) ?? Object.keys(filteredRaids);
      next[charName] = { ...pref, raids: filteredRaids, order: nextOrder };
    }

    return next;
  }, [raidFilteredPrefsByChar, onlyRemain]);

  const tableRoster = useMemo(() => {
    if (!isRaidFilterActive && !onlyRemain) return visibleRoster;
    return visibleRoster.filter((c) => {
      const pref = tablePrefsByChar[c.name];
      if (!pref?.raids) return false;
      return Object.values(pref.raids as any).some((r: any) => r?.enabled);
    });
  }, [visibleRoster, tablePrefsByChar, isRaidFilterActive, onlyRemain]);

  const tableRaidNames = useMemo(() => {
    const set = new Set<string>();
    for (const c of tableRoster) {
      const pref = tablePrefsByChar[c.name];
      if (!pref?.raids) continue;
      for (const [raidName, raidPref] of Object.entries(pref.raids as any)) {
        if ((raidPref as any)?.enabled) set.add(raidName);
      }
    }
    return Array.from(set);
  }, [tableRoster, tablePrefsByChar]);

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

  const tableOrderForView = useMemo(() => {
    const available = tableRaidNames;
    if (!available.length) return [];

    const availableSet = new Set(available);
    const saved = (tableOrder ?? []).filter((r) => availableSet.has(r) || String(r).startsWith("__empty_"));

    let startIndex = 0;
    let endIndex = saved.length - 1;

    while (startIndex <= endIndex && saved[startIndex].startsWith("__empty_")) { startIndex++; }
    while (endIndex >= startIndex && saved[endIndex].startsWith("__empty_")) { endIndex--; }

    const trimmedSaved = startIndex <= endIndex ? saved.slice(startIndex, endIndex + 1) : [];

    const sortByReleaseDate = (a: string, b: string) => {
      const dateA = raidInformation[a]?.releaseDate || "2000-01-01";
      const dateB = raidInformation[b]?.releaseDate || "2000-01-01";
      return dateA.localeCompare(dateB);
    };

    const missing = available.filter((r) => !trimmedSaved.includes(r)).sort(sortByReleaseDate);

    const merged = [...trimmedSaved, ...missing];
    if (merged.length) return merged;

    return [...available].sort(sortByReleaseDate);
  }, [tableOrder, tableRaidNames]);

  const isTableFiltered = isRaidFilterActive || onlyRemain;
  const isTableEmpty = tableRoster.length === 0;
  const cardSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  return (
    <div className="w-full text-white py-8 sm:py-12">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 py-0 sm:py-2 px-4 sm:px-0">
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight truncate break-keep">
              내 숙제 {usingDemo ? <span className="ml-2 text-xs text-[#5B69FF]">(테스트)</span> : null}
            </h1>
          </div>
        </div>

        <div className="relative w-full flex flex-col xl:flex-row gap-4 xl:gap-6">
          <div className="flex flex-col gap-4 w-full xl:w-[220px] shrink-0 min-[1760px]:absolute min-[1760px]:top-0 min-[1760px]:-left-[240px] z-10">
            {usingDemo && (
              <section className="overflow-hidden rounded-none sm:rounded-lg bg-[#16181D] border border-white/5">
                <div className="flex items-center gap-2 px-4 py-3 bg-white/5 border-b border-white/5">
                  <div className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#5B69FF] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#5B69FF]"></span>
                  </div>
                  <span className="text-[11px] font-bold text-[#5B69FF] tracking-widest uppercase">Preview Mode</span>
                </div>

                <div className="p-4 space-y-2">
                  <div className="flex flex-col gap-1">
                    <span className="text-base font-bold text-white tracking-tight">테스트 계정</span>
                  </div>
                  <div className="space-y-2.5">
                    <p className="text-[11px] text-gray-400 leading-relaxed break-keep">
                      캐릭터 등록 없이 체험할 수 있는 <span className="text-gray-200 font-medium">샘플 데이터</span> 입니다.
                    </p>
                    <button
                      onClick={() => setIsAddAccountOpen(true)}
                      className="group w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#5B69FF] hover:bg-[#4A57E6] text-xs font-bold text-white transition-all duration-200 active:scale-[0.98]"
                    >
                      내 계정 불러오기
                    </button>
                  </div>
                </div>
              </section>
            )}

            {/* 🔥 공용 TaskSidebar (MyTaskSidebar, DemoSidebar 삭제 후 교체) */}
            <TaskSidebar
              accounts={usingDemo && currentActiveAccount ? [currentActiveAccount] : accounts}
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
            {accountSearchErr && <p className="mt-2 text-[11px] text-red-400 px-1">에러: {accountSearchErr}</p>}
          </div>

          <div className="flex-1 min-w-0 w-full flex flex-col gap-4 sm:gap-4.5">
            <div className="bg-[#16181D] rounded-none sm:rounded-sm border-x-0 px-4 sm:px-5 py-3 sm:py-4">
              <div className="flex flex-wrap gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between max-[1246px]:flex-col max-[1246px]:items-start max-[1246px]:justify-start">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 min-w-0 text-sm sm:text-base">
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-semibold text-sm sm:text-[17px] pr-1">숙제 남은 캐릭터</span>
                    <AnimatedNumber value={remainingCharacters} className="text-gray-400 text-xs sm:text-sm font-semibold" />
                  </div>
                  <span className="hidden sm:inline h-4 w-px bg-white/10" />
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-semibold text-sm sm:text-[17px] pr-1">남은 숙제</span>
                    <AnimatedNumber value={totalRemainingTasks} className="text-gray-400 text-xs sm:text-sm font-semibold" />
                  </div>
                  <span className="hidden sm:inline h-4 w-px bg-white/10" />
                  {/* 🔥 기존 "남은 골드" -> "골드"로 텍스트 수정 */}
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-semibold text-sm sm:text-[17px] pr-1">골드</span>
                    <div
                      className={[
                        "inline-flex items-baseline justify-end",
                        "min-w-[50px]",
                        "text-xs sm:text-sm font-semibold",
                        "font-mono tabular-nums",
                        isAllCleared ? "line-through decoration-gray-300 decoration-1 text-gray-400" : "text-gray-400",
                      ].join(" ")}
                    >
                      <AnimatedNumber value={isAllCleared ? totalGold : totalRemainingGold} />
                      <span className="ml-0.5 text-[0.75em]">g</span>
                    </div>
                  </div>

                  {/* 🔥 구분선 및 귀속 골드 영역 추가 */}
                  <span className="hidden sm:inline h-4 w-px bg-white/10" />

                  <div className="flex items-baseline gap-1.5">
                    <span className="font-semibold text-sm sm:text-[17px] pr-1">귀속 골드</span>
                    <div
                      className={[
                        "inline-flex items-baseline justify-end",
                        "min-w-[50px]",
                        "text-xs sm:text-sm font-semibold",
                        "font-mono tabular-nums",
                        isAllCleared ? "line-through decoration-gray-300 decoration-1 text-gray-400" : "text-gray-400",
                      ].join(" ")}
                    >
                      <AnimatedNumber value={isAllCleared ? totalBoundGold : totalRemainingBoundGold} />
                      <span className="ml-0.5 text-[0.75em]">g</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-row flex-wrap gap-2 sm:gap-3 items-center">
                  {!usingDemo && (
                    <button
                      onClick={() => {
                        if (isAllView) {
                          setShowAllViewWarning(true);
                          return;
                        }
                        handleMyRefreshAccount();
                      }}
                      disabled={isRefreshing}
                      className={`p-2 rounded-lg transition-colors ${isRefreshing ? "text-indigo-400 cursor-not-allowed" :
                        isAllView ? "text-gray-600 opacity-50 cursor-pointer" :
                          "text-gray-400 hover:text-white hover:bg-white/5"
                        }`}
                      title="계정 정보 업데이트"
                    >
                      <RefreshCcw className={`w-5 h-5 ${isRefreshing ? "animate-spin" : ""}`} />
                    </button>
                  )}

                  <div className="relative flex items-center">
                    <button
                      onClick={(e) => {
                        if (isAllView) {
                          setShowAllViewWarning(true);
                          return;
                        }
                        setAutoSetupConfirmOpen(true);
                      }}
                      className={`relative group flex items-center justify-center py-2 px-6 rounded-lg bg-white/[.04] border border-white/10 text-xs sm:text-sm font-medium transition-all duration-200 ${isAllView ? 'text-gray-600 opacity-50 cursor-pointer' : 'hover:bg-white/5 hover:border-white/20 text-white'
                        }`}
                    >
                      <span>자동 세팅</span>
                      {!isAllView && (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowAutoSetupSettings(!showAutoSetupSettings);
                          }}
                          className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors duration-200 cursor-pointer"
                          title="자동 세팅 설정"
                        >
                          <Settings className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </button>

                    {showAutoSetupSettings && (
                      <div className="absolute top-full left-0 mt-2 w-56 p-4 rounded-xl bg-[#1E2028] border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.7)] z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
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

                        <div className="space-y-1.5 mb-5">
                          <span className="text-[11px] text-gray-400 block">레이드 우선순위</span>
                          <div className="grid grid-cols-2 gap-1 p-1 bg-[#0F1115] rounded-lg border border-white/5">
                            <button
                              onClick={(e) => { e.stopPropagation(); setAutoSetupSortType("latest"); }}
                              className={`py-1.5 text-[10px] font-bold rounded-md transition-all ${autoSetupSortType === "latest" ? "bg-[#5B69FF] text-white" : "text-gray-500 hover:text-gray-300 hover:bg-white/5"}`}
                            >
                              최신순
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setAutoSetupSortType("gold"); }}
                              className={`py-1.5 text-[10px] font-bold rounded-md transition-all ${autoSetupSortType === "gold" ? "bg-[#5B69FF] text-white" : "text-gray-500 hover:text-gray-300 hover:bg-white/5"}`}
                            >
                              골드순
                            </button>
                          </div>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setAutoSetupConfirmOpen(true);
                            setShowAutoSetupSettings(false);
                          }}
                          className="w-full py-2 bg-[#5B69FF] hover:bg-[#4A57E6] text-white text-[11px] font-bold rounded-lg transition-colors"
                        >
                          적용하기
                        </button>
                        <div className="absolute -top-1.5 left-16 w-3 h-3 bg-[#1E2028] border-t border-l border-white/10 rotate-45" />
                      </div>
                    )}
                  </div>

                  <button
                    onClick={gateAllClear}
                    disabled={!effectiveHasRoster}
                    className="inline-flex items-center justify-center py-2 px-3 sm:px-4 rounded-md bg-white/[.04] border border-white/10 hover:bg-white/5 text-xs sm:text-sm disabled:opacity-50"
                  >
                    <span>관문 초기화</span>
                  </button>

                  <button
                    onClick={() => {
                      if (isAllView) {
                        setShowAllViewWarning(true);
                        return;
                      }
                      setIsCharSettingOpen(true);
                    }}
                    disabled={!effectiveHasRoster}
                    className={`inline-flex items-center justify-center py-2 px-3 sm:px-4 rounded-md bg-white/[.04] border border-white/10 text-xs sm:text-sm font-medium transition-colors ${isAllView ? 'text-gray-600 opacity-50 cursor-pointer' : 'hover:bg-white/5 text-white disabled:opacity-50'
                      }`}
                  >
                    캐릭터 설정
                  </button>
                </div>
              </div>
            </div>
            {usingDemo && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 ">
                <div className="flex flex-col gap-2 p-4 rounded-xl bg-white/[0.03] border border-white/5">
                  <div className="font-semibold text-sm text-[#5B69FF] flex items-center gap-1.5">1. 캐릭터 연동</div>
                  <div className="text-[12px] text-gray-400 break-keep">내 계정 불러오기를 통해 대표 캐릭터 닉네임을 입력하고 원정대 정보를 한 번에 가져오세요.</div>
                </div>
                <div className="flex flex-col gap-2 p-4 rounded-xl bg-white/[0.03] border border-white/5">
                  <div className="font-semibold text-sm text-[#5B69FF] flex items-center gap-1.5">2. 편리한 세팅</div>
                  <div className="text-[12px] text-gray-400 break-keep">자동 세팅으로 주력 캐릭터의 레이드를 구성하고, 클릭 한 번으로 관문 클리어 여부와 골드를 체크하세요.</div>
                </div>
                <div className="flex flex-col gap-2 p-4 rounded-xl bg-white/[0.03] border border-white/5">
                  <div className="font-semibold text-sm text-[#5B69FF] flex items-center gap-1.5">3. 데이터 저장 및 동기화</div>
                  <div className="text-[12px] text-gray-400 break-keep">비로그인 시에는 내 PC(웹)에 자동 저장되며, 로그인 시 클라우드에 안전하게 저장되어 어디서든 연동됩니다.</div>
                </div>
              </div>
            )}
            {showEmptyState && (
              <div className="w-full py-10 sm:py-16 px-4 sm:px-6 flex flex-col items-center justify-center text-center bg-[#16181D] border-x-0 sm:border-x-2 border-y-2 sm:border-y-2 border-dashed border-white/10 rounded-none sm:rounded-2xl animate-in fade-in zoom-in-95 duration-500">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-[#5B69FF] blur-[40px] opacity-20 rounded-full" />
                  <div className="relative w-16 h-16 sm:w-20 sm:h-20 bg-[#1E222B] rounded-full flex items-center justify-center border border-white/10">
                    <span className="text-sm sm:text-base font-semibold text-[#5B69FF]">LOA</span>
                  </div>
                  <div className="absolute -right-2 -bottom-2 bg-[#16181D] px-2 py-0.5 rounded-full border border-white/10">
                    <span className="text-[10px] text-gray-400">검색</span>
                  </div>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 sm:mb-3">원정대 캐릭터를 불러오세요</h2>
                <p className="text-gray-400 max-w-md mb-6 sm:mb-8 leading-relaxed text-[12px] sm:text-base">
                  아직 등록된 캐릭터 데이터가 없습니다.
                  <br />
                  <span className="text-gray-400">대표 캐릭터 닉네임을 입력하면 전투정보실에서 정보를 가져옵니다.</span>
                </p>
                <form onSubmit={handleSearchSubmit} className="relative flex items-center w-full max-w-md">
                  <input
                    type="text"
                    placeholder="캐릭터 닉네임 입력"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    disabled={loading}
                    className="w-full h-11 sm:h-12 pl-4 pr-11 sm:pr-12 rounded-lg bg-[#0F1115] border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[#5B69FF] focus:ring-1 focus:ring-[#5B69FF] transition-all disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={loading || !searchInput.trim()}
                    className="absolute right-1.5 px-3 py-2 rounded-md bg-[#5B69FF] text-white hover:bg-[#4A57E6] disabled:bg-gray-700 disabled:text-gray-400 transition-colors text-xs sm:text-sm"
                  >
                    {loading ? <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "검색"}
                  </button>
                </form>
                {accountSearchErr && <p className="mt-3 text-sm text-red-400">{accountSearchErr}</p>}
              </div>
            )}

            {showInitialLoading && (
              <div className="w-full space-y-4 animate-in fade-in duration-300">
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
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="h-[180px] rounded-none sm:rounded-2xl border-x-0 sm:border border-white/5 bg-[#16181D] p-5 animate-pulse" />
                  ))}
                </div>
                <span className="sr-only">원정대 정보를 불러오는 중입니다...</span>
              </div>
            )}

            {effectiveHasRoster ? (
              !isCardView ? (
                isTableEmpty ? (
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
                    key={`table-${isAllView ? 'all' : currentActiveAccount?.id}`} // 🔥 계정 변경 시 초기화
                    roster={tableRoster}
                    prefsByChar={tablePrefsByChar}
                    tableOrder={tableOrderForView}
                    onReorderTable={(newOrder) => {
                      if (isTableFiltered) return;
                      setTableOrder(newOrder);

                      if (!isAuthed) {
                        try { localStorage.setItem(TABLE_ORDER_KEY, JSON.stringify(newOrder)); } catch { }
                      } else if (session?.user && sendMessage) {
                        const userId = (session.user as any).id || (session.user as any).userId;
                        sendMessage({ type: "tableOrderUpdate", userId, tableOrder: newOrder });
                      }
                    }}
                    onToggleGate={handleTableToggleGate}
                    onEdit={(c) => setEditingChar(c)}
                    rosterOrder={rosterOrder}
                    isDragEnabled={isDragEnabled}
                    onReorderRoster={(newOrder) => {
                      const subset = tableRoster.map((c) => c.name);
                      setRosterOrder((prev) => {
                        const merged = mergeReorderedSubset(prev, subset, newOrder);
                        if (!isAuthed) {
                          try { localStorage.setItem(ROSTER_ORDER_KEY, JSON.stringify(merged)); } catch { }
                        } else if (session?.user && sendMessage) {
                          const userId = (session.user as any).id || (session.user as any).userId;
                          sendMessage({ type: "tableOrderUpdate", userId, rosterOrder: merged });
                        }
                        return merged;
                      });
                    }}
                  />
                )
              ) : (
                <div className="flex flex-col gap-4">
                  {(() => {
                    const sortedRoster = [...visibleRoster].sort((a, b) => {
                      const diff = (b.itemLevelNum ?? 0) - (a.itemLevelNum ?? 0);
                      if (!cardRosterOrder.length) return diff;
                      const idxA = cardRosterOrder.indexOf(a.name);
                      const idxB = cardRosterOrder.indexOf(b.name);
                      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                      if (idxA !== -1) return -1;
                      if (idxB !== -1) return 1;
                      return diff;
                    });

                    const visibleCardStrips = sortedRoster.map(c => ({
                      character: c,
                      tasks: buildTasksFor(c)
                    })).filter(item => {
                      if (onlyRemain && item.tasks.length === 0) return false;
                      if (isRaidFilterActive && item.tasks.length === 0) return false;
                      return true;
                    });

                    if (visibleCardStrips.length === 0) {
                      if (isRaidFilterActive) return null;
                      if (onlyRemain) {
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
                      return null;
                    }

                    const handleCardDragEnd = (e: DragEndEvent) => {
                      const { active, over } = e;
                      if (!over || active.id === over.id) return;

                      const subset = visibleCardStrips.map((s) => s.character.name);
                      const oldIndex = subset.indexOf(String(active.id));
                      const newIndex = subset.indexOf(String(over.id));

                      if (oldIndex !== -1 && newIndex !== -1) {
                        const newSubsetOrder = arrayMove(subset, oldIndex, newIndex);

                        setCardRosterOrder((prev) => {
                          const merged = mergeReorderedSubset(prev, subset, newSubsetOrder);
                          try { localStorage.setItem(CARD_ROSTER_ORDER_KEY, JSON.stringify(merged)); } catch { }
                          if (isAuthed && session?.user && sendMessage) {
                            const userId = (session.user as any).id || (session.user as any).userId;
                            sendMessage({ type: "tableOrderUpdate", userId, cardRosterOrder: merged });
                          }
                          return merged;
                        });
                      }
                    };

                    return (
                      <DndContext sensors={cardSensors} collisionDetection={closestCenter} onDragEnd={handleCardDragEnd}>
                        <SortableContext items={visibleCardStrips.map(s => s.character.name)} strategy={verticalListSortingStrategy}>
                          <div className="flex flex-col gap-4" key={`cards-${isAllView ? 'all' : currentActiveAccount?.id}`}>
                            {visibleCardStrips.map(({ character, tasks }) => (
                              <SortableCardStripWrapper
                                key={character.name}
                                id={character.name}
                                character={character}
                                tasks={tasks}
                                isDragEnabled={isDragEnabled}
                                onEdit={() => setEditingChar(character)}
                                onAllClear={() => handleSingleCharacterAllClear(character.name)}
                                onReorderTask={(char: any, newOrderIds: any) => {
                                  if (isRaidFilterActive) return;
                                  setCharPrefs(char.name, (cur) => ({ ...cur, order: newOrderIds }));
                                }}
                              />
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>
                    );
                  })()}
                </div>
              )
            ) : null}


          </div>
        </div>
      </div>

      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-[#1E2028] border border-white/10 animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 text-red-500">
                <AlertTriangle className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">계정을 삭제하시겠습니까?</h3>
              <p className="text-sm text-gray-400 leading-relaxed mb-6">
                현재 선택된 계정의 모든 캐릭터와
                <br />
                숙제 설정 데이터가 삭제됩니다.
                <br />
                <span className="text-red-400/80 text-xs mt-1 block">(이 작업은 되돌릴 수 없습니다)</span>
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirmOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-medium transition-colors text-sm"
                >
                  취소
                </button>
                <button
                  onClick={handleDeleteAccount}
                  className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold transition-colors text-sm"
                >
                  삭제하기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {autoSetupConfirmOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-[#1E2028] border border-white/10 animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-yellow-500/10 text-yellow-500">
                <AlertTriangle className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">자동 세팅을 진행하시겠습니까?</h3>
              <p className="text-sm text-gray-400 leading-relaxed mb-6">
                진행 시 기존에 직접 설정해둔 레이드 세팅이
                <br />
                모두 <strong className="text-white">초기화</strong>되고 새로 덮어씌워집니다.
                <br />
                <span className="text-yellow-500/80 text-xs mt-1 block">(정말 진행하시겠습니까?)</span>
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setAutoSetupConfirmOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-medium transition-colors text-sm"
                >
                  취소
                </button>
                <button
                  onClick={() => {
                    // ✨ 여기서 autoSetupSortType 상태를 넘겨줌!
                    handleAutoSetup(autoSetupCharCount, autoSetupSortType);
                    setAutoSetupConfirmOpen(false);
                  }}
                  className="flex-1 py-3 rounded-xl bg-[#5B69FF] hover:bg-[#4A57E6] text-white font-bold transition-colors text-sm"
                >
                  적용하기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🔥 모두 보기 상태 경고 모달 */}
      {showAllViewWarning && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-[#1E2028] border border-white/10 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 text-red-500">
                <AlertTriangle className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">
                기능 사용 불가
              </h3>
              <p className="text-sm text-gray-400 leading-relaxed mb-6 break-keep">
                <span className="text-white font-medium">'모두 보기'</span> 상태에서는 데이터 꼬임을 방지하기 위해 해당 기능을 이용할 수 없습니다.<br /><br />
                단일 계정을 선택한 후 다시 시도해주세요.
              </p>
              <button
                onClick={() => setShowAllViewWarning(false)}
                className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold transition-colors text-sm"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {editingChar && (
        <EditTasksModal
          open
          onClose={() => setEditingChar(null)}
          character={editingChar}
          initial={effectivePrefsByChar[editingChar.name] ?? null}
          onSave={(prefs) => {
            setCharPrefs(editingChar.name, () => prefs);
            setEditingChar(null);
          }}
        />
      )}

      {isCharSettingOpen && (
        <CharacterSettingModal
          open
          onClose={() => {
            setIsCharSettingOpen(false);
            setAccountSearchErr(null);
          }}
          goldDesignatedByChar={safeGoldDesignatedByChar}
          roster={effectiveAccount?.summary?.roster ?? []}
          onDeleteAccount={
            usingDemo || isAllView ? undefined : () => setDeleteConfirmOpen(true) // 🔥 모두 보기 상태일 때 삭제 막기
          }

          visibleByChar={effectiveVisibleByChar}
          refreshError={accountSearchErr}
          onRefreshAccount={isAllView ? undefined : handleMyRefreshAccount} // 🔥 모두 보기 상태일 때 갱신 막기
          onChangeSettings={(nextVisible, nextGold) => { // 🔥 onChangeVisible 대신 이거 사용
            if (usingDemo) {
              setDemoVisibleByChar((prev) => ({ ...prev, ...nextVisible }));
              setDemoGoldDesignatedByChar((prev) => ({ ...prev, ...nextGold }));
              return;
            }

            setVisibleByChar((prev) => {
              const mergedVisible = { ...prev, ...nextVisible };
              const mergedGold = { ...goldDesignatedByChar, ...nextGold };

              setGoldDesignatedByChar(mergedGold);

              try {
                if (!isAuthed) {
                  localStorage.setItem(VISIBLE_KEY, JSON.stringify(mergedVisible));
                  localStorage.setItem(GOLD_KEY, JSON.stringify(mergedGold));
                } else if (session?.user && sendMessage) {
                  const userId = (session.user as any).id || (session.user as any).userId;
                  sendMessage({
                    type: "gateUpdate",
                    userId,
                    prefsByChar,
                    visibleByChar: mergedVisible,
                    goldDesignatedByChar: mergedGold, // 🔥 소켓으로 같이 쏴주기
                  });
                }
              } catch { }
              return mergedVisible;
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
          if (success) setIsAddAccountOpen(false);
        }}
      />
    </div>
  );
}