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
import { AlertTriangle, Check, ChevronDown, ChevronUp, Plus } from "lucide-react";
import GoogleAd from "../components/GoogleAd";
import TaskSidebar from "../components/tasks/TaskSidebar";

// 🔥 전역 웹소켓 훅
import { useGlobalWebSocket } from "../components/WebSocketProvider";

/* ──────────────────────────
 * ✅ 데모(임시) 데이터: 로스터가 없을 때 자동으로 보여줄 프리뷰
 * ────────────────────────── */

const DEMO_ACCOUNT_ID = "__demo__";

/** 안전하게 데모 레이드 3개 고르기 */
function pickDemoRaidNames(): string[] {
  const preferred = ["발탄", "비아키스", "쿠크세이튼", "아브렐슈드", "카멘", "일리아칸", "아카테스"];
  const keys = Object.keys(raidInformation);

  const picked: string[] = [];
  for (const p of preferred) {
    if (raidInformation[p] && !picked.includes(p)) picked.push(p);
    if (picked.length >= 3) return picked;
  }

  // 부족하면 그냥 앞에서 채움
  for (const k of keys) {
    if (!picked.includes(k)) picked.push(k);
    if (picked.length >= 3) break;
  }
  return picked.slice(0, 3);
}

/** 레이드의 사용 가능한 난이도 중 하나를 고름(우선 노말) */
function pickDifficulty(raidName: string): "노말" | "하드" | "나메" {
  const info = raidInformation[raidName];
  const diffs = Object.keys(info?.difficulty ?? {}) as Array<"노말" | "하드" | "나메">;
  if (diffs.includes("노말")) return "노말";
  if (diffs.includes("하드")) return "하드";
  if (diffs.includes("나메")) return "나메";
  return (diffs[0] ?? "노말") as any;
}

/** 레이드의 모든 관문 index 배열 */
function getAllGateIndices(raidName: string, difficulty: "노말" | "하드" | "나메"): number[] {
  const info = raidInformation[raidName];
  const diff = info?.difficulty?.[difficulty];
  const gates = diff?.gates ?? [];
  return gates.map((g) => g.index);
}

/** 데모 prefs 생성 */
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

      // 데모는 일부는 진행중/일부는 완료로 보여주기
      let gates: number[] = [];
      if (allGates.length) {
        if (i === 0 && r === 0) {
          // 1번 캐릭 1번 레이드는 1관문만 완료(진행중)
          gates = [allGates[0]];
        } else if (i === 1 && r === 1) {
          // 2번 캐릭 2번 레이드는 완료(마지막 관문 포함)
          gates = [allGates[allGates.length - 1]];
        } else if (i === 2 && r === 2) {
          // 3번 캐릭 3번 레이드는 중간 정도(가능하면 2개)
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

/** 데모 로스터(필드가 프로젝트마다 달라서 안전하게 any 캐스팅) */
const DEMO_ROSTER: RosterCharacter[] = [
  {
    name: "테스트워로드",
    className: "워로드",
    serverName: "루페온",
    itemLevel: "1740.00",
    itemLevelNum: 1740,
    image: null,
  } as any as RosterCharacter,
  {
    name: "테스트소서리스",
    className: "소서리스",
    serverName: "루페온",
    itemLevel: "1730.00",
    itemLevelNum: 1730,
    image: null,
  } as any as RosterCharacter,
  {
    name: "테스트바드",
    className: "바드",
    serverName: "루페온",
    itemLevel: "1720.00",
    itemLevelNum: 1720,
    image: null,
  } as any as RosterCharacter,
  {
    name: "테스트기상술사",
    className: "기상술사",
    serverName: "루페온",
    itemLevel: "1710.00",
    itemLevelNum: 1710,
    image: null,
  } as any as RosterCharacter,
  {
    name: "테스트건슬링어",
    className: "건슬링어",
    serverName: "루페온",
    itemLevel: "1700.00",
    itemLevelNum: 1700,
    image: null,
  } as any as RosterCharacter,
  {
    name: "테스트블레이드",
    className: "블레이드",
    serverName: "루페온",
    itemLevel: "1690.00",
    itemLevelNum: 1690,
    image: null,
  } as any as RosterCharacter,
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

const ACCOUNTS_KEY = "raidTaskAccounts";
const ACTIVE_ACCOUNT_KEY = "raidTaskActiveAccount";

const AD_SLOT_SIDEBAR = "4444902536";
const AD_SLOT_BOTTOM_BANNER = "7577482274";

/** 좌측 필터 영역에서 쓸 필터 값 localStorage에서 복원 */
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

function DemoSidebar({
  accounts,
  activeAccountId,
  onSelectAccount,
  onAddAccount,
  onlyRemain,
  setOnlyRemain,
  isCardView,
  setIsCardView,
  adSlot = "4444902536"
}: {
  accounts: SavedAccount[];
  activeAccountId: string | null;
  onSelectAccount: (id: string) => void;
  onAddAccount: () => void;
  onlyRemain: boolean;
  setOnlyRemain: (v: boolean) => void;
  isCardView: boolean;
  setIsCardView: (v: boolean) => void;
  adSlot?: string;
}) {
  const [isAccountListOpen, setIsAccountListOpen] = useState(false);

  // 현재 선택된 계정 찾기
  const currentAccount = accounts.find(a => a.id === activeAccountId)
    ?? accounts.find(a => a.isPrimary)
    ?? accounts[0];

  return (
    <div className="space-y-4">
      {/* 1. 데모 상태 안내 섹션 */}
      <section className="overflow-hidden rounded-none sm:rounded-lg bg-[#16181D] border border-white/5 shadow-xl">
        {/* 상단 라벨 영역 */}
        <div className="flex items-center gap-2 px-4 py-3 bg-white/5 border-b border-white/5">
          <div className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#5B69FF] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#5B69FF]"></span>
          </div>
          <span className="text-[11px] font-bold text-[#5B69FF] tracking-widest uppercase">Preview Mode</span>
        </div>

        {/* 메인 정보 영역 */}
        <div className="p-4 space-y-4">
          <div className="flex flex-col gap-1">
            <span className="text-base font-bold text-white tracking-tight">
              테스트 계정
            </span>
          </div>

          <div className="space-y-2.5">
            <p className="text-[11px] text-gray-400 leading-relaxed break-keep">
              로그인 없이 체험할 수 있는 <span className="text-gray-200 font-medium">샘플 데이터</span>입니다.
              자신의 캐릭터를 등록하여 숙제를 관리해보세요.
            </p>

            <button
              onClick={onAddAccount}
              className="group w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#5B69FF] hover:bg-[#4A57E6] text-xs font-bold text-white transition-all duration-200 active:scale-[0.98] shadow-lg shadow-[#5B69FF]/10"
            >
              내 원정대 등록하기
            </button>
          </div>
        </div>
      </section>

      {/* 2. 필터 섹션 */}
      <section className="rounded-none sm:rounded-sm bg-[#16181D]">
        <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h3 className="text-base sm:text-lg font-semibold">필터</h3>
          <button
            onClick={() => { setOnlyRemain(false); setIsCardView(false); }}
            className="text-[11px] sm:text-xs text-neutral-400 hover:text-neutral-200"
          >
            초기화 ⟳
          </button>
        </header>
        <div className="px-5 py-7 space-y-5 text-sm">

          {/* 숙제/보상 체크박스 + 툴팁 */}
          <div className="space-y-3">
            <div className="font-bold">숙제/보상</div>
            <label className="flex items-center gap-2 cursor-pointer text-[#A2A3A5] relative group">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={onlyRemain}
                onChange={e => setOnlyRemain(e.target.checked)}
              />
              <span className="grid place-items-center h-5 w-5 rounded-md border border-white/30 transition peer-checked:bg-[#5B69FF] peer-checked:border-[#5B69FF] peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500 peer-checked:[&_svg]:opacity-100">
                <svg className="h-4 w-4 text-white opacity-0 transition-opacity duration-150 peer-checked:opacity-100" viewBox="0 0 20 20" fill="none">
                  <path d="M5 10l3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span>남은 숙제만 보기</span>

              <span className="w-3 h-3 rounded-full border border-white/20 text-[9px] font-bold flex items-center justify-center text-gray-400 bg-black/20 group-hover:text-white group-hover:border-white/40 transition-colors duration-200 cursor-help">
                ?
              </span>

              {/* ✅ [추가] 툴팁 메시지 (Hover 시 노출) */}
              <div className="pointer-events-none absolute left-6 top-full mt-2.5 w-64 p-4 rounded-2xl bg-gray-900/95 backdrop-blur-xl border border-white/[0.08] shadow-[0_8px_30px_rgb(0,0,0,0.4)] opacity-0 translate-y-1 scale-95 group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-100 transition-all duration-200 ease-out z-[200]">
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
                {/* 툴팁 화살표 */}
                <div className="absolute -top-[5px] left-6 w-2.5 h-2.5 bg-gray-900/95 border-t border-l border-white/[0.08] rotate-45 z-10" />
              </div>
            </label>
          </div>

          {/* 보기 설정 체크박스 */}
          <div className="space-y-3">
            <div className="font-semibold">보기 설정</div>
            <label className="flex items-center gap-2 cursor-pointer text-[#A2A3A5]">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={isCardView}
                onChange={e => setIsCardView(e.target.checked)}
              />
              <span className="grid place-items-center h-5 w-5 rounded-md border border-white/30 transition peer-checked:bg-[#5B69FF] peer-checked:border-[#5B69FF] peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500 peer-checked:[&_svg]:opacity-100">
                <svg className="h-4 w-4 text-white opacity-0 transition-opacity duration-150 peer-checked:opacity-100" viewBox="0 0 20 20" fill="none">
                  <path d="M5 10l3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span>카드로 보기</span>
            </label>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function MyTasksPage() {
  const { data: session, status: authStatus } = useSession();
  const [syncedWithServer, setSyncedWithServer] = useState(false);
  const [syncingServer, setSyncingServer] = useState(false);
  const isAuthed = authStatus === "authenticated" && !!session?.user;

  // 🔥 웹소켓
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
      // ignore
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

  const [visibleByChar, setVisibleByChar] = useState<Record<string, boolean>>({});

  /* ✅ 데모 상태 */
  const [demoEnabled, setDemoEnabled] = useState(true);
  const [demoPrefsByChar, setDemoPrefsByChar] = useState<Record<string, CharacterTaskPrefs>>(() => DEMO_PREFS_BY_CHAR);
  const [demoVisibleByChar, setDemoVisibleByChar] = useState<Record<string, boolean>>(() => DEMO_VISIBLE_BY_CHAR);

  /* ──────────────────────────
   * 웹소켓 실시간 데이터 수신
   * ────────────────────────── */

  useEffect(() => {
    if (!ws || !isAuthed || !session?.user) return;

    const myUserId = (session.user as any).id || (session.user as any).userId;

    const handleMessage = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === "memberUpdated" && msg.userId === myUserId) {
          if (msg.prefsByChar) setPrefsByChar(msg.prefsByChar);
          if (msg.visibleByChar) setVisibleByChar(msg.visibleByChar);
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
      // ignore
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
          next[c.name] = readPrefs(c.name) ?? next[c.name] ?? { raids: {} };
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
    } catch {
      // ignore
    }
  }, [accounts, isAuthed]);

  useEffect(() => {
    if (!accounts.length) {
      setActiveAccountId(null);
      return;
    }

    setActiveAccountId((prev) => {
      if (prev && accounts.some((a) => a.id === prev)) return prev;

      let nextId: string | null = null;
      if (typeof window !== "undefined") {
        try {
          const savedId = localStorage.getItem(ACTIVE_ACCOUNT_KEY);
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
      const payload: SavedFilters = { onlyRemain, isCardView };
      localStorage.setItem(FILTER_KEY, JSON.stringify(payload));
    } catch { }
  }, [onlyRemain, isCardView, isAuthed]);

  /* ──────────────────────────
   * ✅ 로스터/로딩 상태 계산 (여기는 "진짜 데이터" 기준)
   * ────────────────────────── */
  const hasRealRoster = !!activeAccount && !!activeAccount.summary?.roster?.length;

  const isAuthLoading = authStatus === "loading";
  const isAuthAuthed = authStatus === "authenticated";
  const waitingInitialData = isAuthLoading || (isAuthAuthed && !syncedWithServer);

  const showInitialLoading = !hasRealRoster && (waitingInitialData || booting || syncingServer);

  // ✅ 진짜 로스터가 없고, 초기 로딩도 끝났으면 데모를 켠다
  const usingDemo = demoEnabled && !hasRealRoster && !showInitialLoading;

  // ✅ 화면에서 사용할 “effective” 데이터 소스
  const effectiveAccount: SavedAccount | null = usingDemo
    ? {
      id: DEMO_ACCOUNT_ID,
      nickname: "예시 원정대",
      summary: DEMO_SUMMARY,
      isPrimary: true,
    }
    : activeAccount;

  const effectivePrefsByChar = usingDemo ? demoPrefsByChar : prefsByChar;
  const effectiveVisibleByChar = usingDemo ? demoVisibleByChar : visibleByChar;

  const effectiveHasRoster = !!effectiveAccount && !!effectiveAccount.summary?.roster?.length;

  const showEmptyState =
    !showInitialLoading &&
    !hasRealRoster &&
    !usingDemo &&
    (authStatus === "unauthenticated" || (authStatus === "authenticated" && syncedWithServer));

  /* ──────────────────────────
   * ✅ 데모일 때는 저장/웹소켓/로컬스토리지 쓰지 않도록 setCharPrefs를 라우팅
   * ────────────────────────── */
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

  const handleSelectAccount = (id: string) => {
    setActiveAccountId(id);
    try {
      if (typeof window !== "undefined") localStorage.setItem(ACTIVE_ACCOUNT_KEY, id);
    } catch { }

    if (isAuthed && session?.user && sendMessage) {
      const userId = (session.user as any).id || (session.user as any).userId;
      sendMessage({ type: "activeAccountUpdate", userId, activeAccountId: id });
    }
  };

  /* ──────────────────────────
   * 로그인 상태 autosave (그대로)
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
   * 로그인 상태 초기 서버 동기화(그대로)
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
    return () => {
      cancelled = true;
    };
  }, [authStatus, syncedWithServer, booting, accounts, prefsByChar, visibleByChar, onlyRemain, isCardView]);

  /* ──────────────────────────
   * ✅ 빌드 함수들은 effectivePrefsByChar를 사용
   * ────────────────────────── */
  const buildTasksFor = (c: RosterCharacter): TaskItem[] => {
    const prefs = effectivePrefsByChar[c.name];
    if (!prefs) return [];

    const baseRaidNames = prefs.order?.filter((r) => (prefs.raids as any)?.[r]) ?? Object.keys(prefs.raids ?? {});
    const raidNames = prefs.order
      ? baseRaidNames
      : [...baseRaidNames].sort((a, b) => getRaidBaseLevel(b) - getRaidBaseLevel(a));

    const items: TaskItem[] = [];

    for (const raidName of raidNames) {
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

      const totalGold = (p.gates ?? []).reduce((sum: number, gi: number) => {
        const g = diff.gates.find((x: any) => x.index === gi);
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
          const id =
            typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${trimmed}-${Date.now()}`;

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
          try {
            localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(next));
          } catch { }
        }
        return next;
      });

      if (newActiveId) {
        setActiveAccountId(newActiveId);
        try {
          if (typeof window !== "undefined") localStorage.setItem(ACTIVE_ACCOUNT_KEY, newActiveId);
        } catch { }
      }

      // ✅ 검색 성공하면 데모는 자연스럽게 꺼져도 되고(선택)
      // setDemoEnabled(false);

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


  const handleDeleteAccount = () => {
    // 데모 모드이거나 활성 계정이 없으면 실행하지 않음
    if (!activeAccount || usingDemo) return;

    setDeleteConfirmOpen(false);
    setIsCharSettingOpen(false);

    try {
      const namesToRemove = new Set(
        activeAccount.summary?.roster?.map((c) => c.name) ?? []
      );

      // 1. 비로그인 상태라면 개별 캐릭터의 로컬 저장소 데이터 삭제
      if (!isAuthed) {
        for (const name of namesToRemove) {
          clearCharPrefs(name);
        }
      }

      // 2. 현재 메모리 상태(prefs, visible)에서 해당 캐릭터들 제거
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

      // 3. 계정 목록(accounts)에서 제거 및 다음 활성 계정 결정
      let nextActiveId: string | null = null;

      setAccounts((prev) => {
        const without = prev.filter((a) => a.id !== activeAccount.id);

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

      // 4. 활성 계정 ID 업데이트 (localStorage 포함)
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

    } catch (e) {
      console.error("계정 삭제 중 오류 발생:", e);
    }
  };


  const handleAutoSetup = () => {
    if (!effectiveAccount?.summary?.roster || effectiveAccount.summary.roster.length === 0) return;

    const roster = effectiveAccount.summary.roster;
    const { nextPrefsByChar, nextVisibleByChar } = buildAutoSetupForRoster(roster, effectivePrefsByChar);

    // 데모면 데모 state만 변경
    if (usingDemo) {
      setDemoPrefsByChar((prev) => ({ ...prev, ...nextPrefsByChar }));
      setDemoVisibleByChar((prev) => ({ ...prev, ...nextVisibleByChar }));
      return;
    }

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

  const visibleRoster =
    (effectiveAccount?.summary?.roster ?? []).filter((c) => (effectiveVisibleByChar[c.name] ?? true)) ?? [];

  const { totalRemainingTasks, remainingCharacters, totalRemainingGold, totalGold } = useMemo<RaidSummary>(() => {
    return computeRaidSummaryForRoster(visibleRoster, effectivePrefsByChar);
  }, [visibleRoster, effectivePrefsByChar]);

  const isAllCleared = totalRemainingGold === 0 && totalGold > 0;

  const shouldShowAds = effectiveHasRoster && !usingDemo;

  return (
    <div className="w-full text-white py-8 sm:py-12">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 py-0 sm:py-2 px-4 sm:px-0">
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight truncate break-keep">
              내 숙제 {usingDemo ? <span className="ml-2 text-xs text-[#5B69FF]">(데모)</span> : null}
            </h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,210px)_minmax(0,1fr)] gap-5 lg:items-start">
          <div className="space-y-4">
            {usingDemo ? (
              <DemoSidebar
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
            ) : (
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
            )}

            {accountSearchErr && (
              <p className="mt-2 text-[11px] text-red-400 px-1">에러: {accountSearchErr}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:gap-5">
            {/* Stats Bar */}
            <div className="bg-[#16181D] rounded-none sm:rounded-lg border-x-0 px-4 sm:px-5 py-3 sm:py-4">
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
                    <div
                      className={[
                        "inline-flex items-baseline justify-end",
                        "min-w-[50px]",
                        "text-xs sm:text-sm font-semibold",
                        "font-mono tabular-nums",
                        isAllCleared
                          ? "line-through decoration-gray-300 decoration-1 text-gray-400"
                          : "text-gray-400",
                      ].join(" ")}
                    >
                      <AnimatedNumber value={isAllCleared ? totalGold : totalRemainingGold} />
                      <span className="ml-0.5 text-[0.75em]">g</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-row flex-wrap gap-2 sm:gap-3">
                  <button onClick={handleAutoSetup} className="relative group flex items-center justify-center py-2 px-6 rounded-lg bg-white/[.04] border border-white/10 hover:bg-white/5 hover:border-white/20 text-xs sm:text-sm font-medium text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed">
                    <span>자동 세팅</span>
                    <span className="absolute top-1 right-1 w-3 h-3 rounded-full border border-white/20 text-[9px] font-bold flex items-center justify-center text-gray-400 bg-black/20 group-hover:text-white group-hover:border-white/40 transition-colors duration-200 cursor-help">?</span>
                    <div className="pointer-events-none absolute bottom-full left-15 mb-3 w-64 p-3 rounded-xl bg-gray-900/95 backdrop-blur-md border border-white/10 text-xs text-gray-300 leading-relaxed text-center shadow-2xl shadow-black/50 opacity-0 translate-y-2 scale-95 group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-100 transition-all duration-200 ease-out z-20">
                      <p><span className="text-white font-semibold">아이템 레벨 상위 6개 캐릭터</span>와 해당 캐릭터의 <span className="text-indigo-400">Top 3 레이드</span>를 자동으로 세팅합니다.</p>
                      <div className="absolute -bottom-1.5 left-4 w-3 h-3 bg-gray-900/95 border-b border-r border-white/10 rotate-45" />
                    </div>
                  </button>


                  <button
                    onClick={gateAllClear}
                    disabled={!effectiveHasRoster}
                    className="inline-flex items-center justify-center py-2 px-3 sm:px-4 rounded-md bg-white/[.04] border border-white/10 hover:bg-white/5 text-xs sm:text-sm disabled:opacity-50"
                  >
                    <span>관문 초기화</span>
                  </button>

                  <button
                    onClick={() => setIsCharSettingOpen(true)}
                    disabled={!effectiveHasRoster}
                    className="inline-flex items-center justify-center py-2 px-3 sm:px-4 rounded-md bg-white/[.04] border border-white/10 text-xs sm:text-sm font-medium disabled:opacity-50"
                  >
                    캐릭터 설정
                  </button>
                </div>
              </div>
            </div>

            {/* ✅ 데모 안내 + 빠른 검색 */}
            {usingDemo && (
              <div className="w-full px-4 sm:px-6 py-4 rounded-none sm:rounded-2xl border border-white/10 bg-[#16181D]">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="text-sm text-gray-300">
                    지금은 <span className="text-[#5B69FF] font-semibold">예시 데이터</span>로 화면을 보여주고 있어요.
                    <div className="text-[12px] text-gray-500 mt-1">
                      내 캐릭터를 불러오면 예시 데이터 대신 실제 데이터로 자동 전환됩니다.
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsAddAccountOpen(true)}
                      className="px-3 py-2 rounded-lg bg-[#5B69FF] text-white text-xs font-semibold hover:bg-[#4A57E6]"
                      type="button"
                    >
                      내 캐릭터 불러오기
                    </button>
                    <button
                      onClick={() => setDemoEnabled(false)}
                      className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-200 text-xs hover:bg-white/10"
                      type="button"
                    >
                      데모 끄기
                    </button>
                  </div>
                </div>
              </div>
            )}

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


            {/* 초기 로딩 */}
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

            {/* ✅ 실제/데모 로스터가 있으면 테이블/카드 렌더 */}
            {effectiveHasRoster ? (
              !isCardView ? (
                <TaskTable
                  roster={visibleRoster}
                  prefsByChar={effectivePrefsByChar}
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
                            setCharPrefs(char.name, (cur) => ({ ...cur, order: newOrderIds }));
                          }}
                        />
                      );
                    })}
                </div>
              )
            ) : null}

            {/* ───────── 서비스 안내 섹션 (How to use) ───────── */}
            <section className="w-full pt-4 md:pt-4 px-0">
              <div className="relative overflow-hidden rounded-none sm:rounded-2xl border border-white/5 bg-[#16181D] p-6 sm:p-10 shadow-2xl">
                {/* 배경 꾸밈 요소 (은은한 글로우) */}
                <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#5B69FF]/5 blur-[80px] pointer-events-none" />

                <div className="relative z-10">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                    <div className="space-y-2">
                      <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                        로아체크의 숙제 관리 기능은 <br className="sm:hidden" />
                        <span className="text-[#5B69FF]">어떻게 사용하나요?</span>
                      </h2>
                    </div>
                    <div className="hidden md:block">
                      <Check className="h-12 w-12 text-white/5" strokeWidth={3} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10 text-sm sm:text-base">
                    {/* Step 1 */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 text-xs font-bold text-gray-400 border border-white/5">
                          01
                        </div>
                        <h4 className="font-bold text-gray-200">캐릭터 등록 및 자동 동기화</h4>
                      </div>
                      <p className="pl-11 text-gray-400 leading-relaxed break-keep text-[13px] sm:text-[14px]">
                        <strong className="text-gray-200">로아체크(Loacheck)</strong>에 접속하여 캐릭터 닉네임을 등록하세요.
                        로스트아크 공식 API를 통해 원정대의 모든 캐릭터 정보를 즉시 불러오며, 아이템 레벨과 클래스 정보가 실시간으로 반영됩니다.
                      </p>
                    </div>

                    {/* Step 2 */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#5B69FF]/20 text-xs font-bold text-[#5B69FF] border border-[#5B69FF]/20">
                          02
                        </div>
                        <h4 className="font-bold text-gray-200">주간 숙제 선택 및 상태 저장</h4>
                      </div>
                      <p className="pl-11 text-gray-400 leading-relaxed break-keep text-[13px] sm:text-[14px]">
                        매주 수요일 오전 6시에 초기화되는 주간 숙제들을 관리하세요.
                        원하는 레이드를 선택하고, <span className="text-[#5B69FF] font-medium">'내 숙제'</span> 메뉴에서 체크박스를 클릭하는 것만으로 완료 여부가 실시간으로 저장됩니다.
                      </p>
                    </div>
                  </div>


                </div>
              </div>
            </section>

            {shouldShowAds && (
              <div className="block lg:hidden w-full">
                <div
                  className="w-full bg-[#1e2128]/30 border-x-0 sm:border border-white/5 rounded-none sm:rounded-2xl overflow-hidden flex items-center justify-center"
                  style={{ height: "100px", minHeight: "100px", maxHeight: "100px" }}
                >
                  <GoogleAd slot={AD_SLOT_BOTTOM_BANNER} className="!my-0 w-full h-full" responsive={false} />
                </div>
              </div>
            )}
          </div>


        </div>


      </div>



      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-[#1E2028] border border-white/10 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 text-red-500">
                <AlertTriangle className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">계정을 삭제하시겠습니까?</h3>
              <p className="text-sm text-gray-400 leading-relaxed mb-6">
                현재 선택된 계정의 모든 캐릭터와<br />
                숙제 설정 데이터가 삭제됩니다.<br />
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
                  onClick={handleDeleteAccount} // 👈 여기서 위에서 만든 함수를 호출합니다.
                  className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold transition-colors text-sm shadow-lg shadow-red-500/20"
                >
                  삭제하기
                </button>
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
          roster={effectiveAccount?.summary?.roster ?? []}
          onDeleteAccount={() => {
            if (usingDemo) {
              // 데모면 삭제 대신 "내 캐릭터 불러오기"로 유도
              setIsAddAccountOpen(true);
              return;
            }
            setDeleteConfirmOpen(true);
          }}
          onRefreshAccount={() => {
            if (usingDemo) {
              setIsAddAccountOpen(true);
              return;
            }
            // 원래 handleRefreshAccount 로직이 있던 자리 (너 코드 그대로 연결하면 됨)
          }}
          visibleByChar={effectiveVisibleByChar}
          refreshError={accountSearchErr}
          onChangeVisible={(partial) => {
            if (usingDemo) {
              setDemoVisibleByChar((prev) => ({ ...prev, ...partial }));
              return;
            }

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