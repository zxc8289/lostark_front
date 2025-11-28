// app/my-tasks/page.tsx
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


type SavedFilters = {
  // 현재는 "남은 숙제만 보기", "테이블로 보기" 두 옵션만 사용
  onlyRemain?: boolean;
  tableView?: boolean;
};

const FILTER_KEY = "raidTaskFilters";
const LOCAL_KEY = "raidTaskLastAccount";
const VISIBLE_KEY = "raidTaskVisibleByChar";

/** 좌측 필터 영역에서 쓸 필터 값 localStorage에서 복원 */
function loadSavedFilters(): SavedFilters | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(FILTER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SavedFilters;
  } catch {
    return null;
  }
}




export default function MyTasksPage() {
  const { data: session, status: authStatus } = useSession();
  const [syncedWithServer, setSyncedWithServer] = useState(false);
  const [syncingServer, setSyncingServer] = useState(false);
  const isAuthed = authStatus === "authenticated" && !!session?.user;
  const [onlyRemain, setOnlyRemain] = useState<boolean>(() => {
    const saved = loadSavedFilters();
    return typeof saved?.onlyRemain === "boolean" ? saved.onlyRemain : false;
  });

  const [tableView, setTableView] = useState<boolean>(() => {
    const saved = loadSavedFilters();
    return typeof saved?.tableView === "boolean" ? saved.tableView : false;
  });

  /** 필터 초기화 버튼 */
  const resetFilters = () => {
    setOnlyRemain(false);
    setTableView(false);
  };

  const clearClientStorage = () => {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem(LOCAL_KEY);
      localStorage.removeItem(FILTER_KEY);
      localStorage.removeItem(VISIBLE_KEY);
      clearAllPrefs(); // 캐릭터별 raidPrefs:* 다 지움
    } catch {
      // 무시
    }
  };

  /* ──────────────────────────
   *  계정/검색 관련 상태
   * ────────────────────────── */
  const [nickname, setNickname] = useState(""); // 현재 불러온 대표 캐릭터 닉네임
  const [searchInput, setSearchInput] = useState(""); // 빈 상태에서 입력하는 검색어

  const [data, setData] = useState<CharacterSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [booting, setBooting] = useState(true); // 첫 로딩 중인지 여부
  const [err, setErr] = useState<string | null>(null);

  /* ──────────────────────────
   *  캐릭터별 레이드 설정 상태
   * ────────────────────────── */
  const [prefsByChar, setPrefsByChar] = useState<Record<string, CharacterTaskPrefs>>({});
  const [editingChar, setEditingChar] = useState<RosterCharacter | null>(null); // EditTasksModal용
  const [isCharSettingOpen, setIsCharSettingOpen] = useState(false); // 캐릭터 설정 모달

  /** 캐릭터별 표시 여부 (왼쪽 설정 모달에서 제어) */
  const [visibleByChar, setVisibleByChar] = useState<Record<string, boolean>>({});

  /* ──────────────────────────
   *  캐릭터별 prefs 초기 로드
   *  (전투정보실에서 roster를 받아온 뒤 수행)
   * ────────────────────────── */
  useEffect(() => {
    if (isAuthed) return;
    if (!data?.roster) return;
    setPrefsByChar((prev) => {
      const next = { ...prev };
      for (const c of data.roster) {
        next[c.name] = readPrefs(c.name) ?? next[c.name] ?? { raids: {} };
      }
      return next;
    });
  }, [data?.roster]);

  /* ──────────────────────────
   *  visibleByChar 초기 로드
   *  - localStorage에 저장된 값 우선 사용
   *  - 새로운 캐릭터는 기본 true
   * ────────────────────────── */
  useEffect(() => {
    if (isAuthed) return;
    if (!data?.roster) return;

    try {
      const raw = localStorage.getItem(VISIBLE_KEY);
      const saved = raw ? (JSON.parse(raw) as Record<string, boolean>) : {};

      const next: Record<string, boolean> = {};
      for (const c of data.roster) {
        next[c.name] = saved[c.name] ?? true;
      }

      setVisibleByChar(next);
      localStorage.setItem(VISIBLE_KEY, JSON.stringify(next));
    } catch {
      // 로컬스토리지 에러는 무시
    }
  }, [data?.roster]);

  /* ──────────────────────────
   *  첫 진입 시 마지막 계정 복원
   * ────────────────────────── */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LOCAL_KEY);

      if (raw) {
        const saved = JSON.parse(raw) as {
          nickname: string;
          data: CharacterSummary;
        };

        setNickname(saved.nickname);
        setData(saved.data);
      }
    } catch {
      // 파싱 실패하면 무시
    } finally {
      setBooting(false);
    }
  }, []);

  /* ──────────────────────────
   *  필터 상태를 localStorage에 저장
   * ────────────────────────── */
  useEffect(() => {
    if (isAuthed) return; // 🔽 로그인 상태면 localStorage 쓰지 않음

    try {
      const payload: SavedFilters = {
        onlyRemain,
        tableView,
      };
      localStorage.setItem(FILTER_KEY, JSON.stringify(payload));
    } catch {
      // 로컬스토리지 에러는 무시
    }
  }, [onlyRemain, tableView, isAuthed]);

  function setCharPrefs(
    name: string,
    updater: (cur: CharacterTaskPrefs) => CharacterTaskPrefs
  ) {
    setPrefsByChar((prev) => {
      const cur = prev[name] ?? { raids: {} };
      const next = updater(cur);

      if (!isAuthed) {
        writePrefs(name, next);
      }

      return { ...prev, [name]: next };
    });
  }



  function buildServerStatePayload() {
    return {
      nickname,
      summary: data,
      prefsByChar,
      visibleByChar,
      filters: {
        onlyRemain,
        tableView,
      } as SavedFilters,
    };
  }


  function applyServerState(state: any) {
    try {
      if (state.nickname) setNickname(state.nickname);
      if (state.summary) setData(state.summary);

      if (state.prefsByChar) setPrefsByChar(state.prefsByChar);
      if (state.visibleByChar) setVisibleByChar(state.visibleByChar);

      if (state.filters) {
        if (typeof state.filters.onlyRemain === "boolean") {
          setOnlyRemain(state.filters.onlyRemain);
        }
        if (typeof state.filters.tableView === "boolean") {
          setTableView(state.filters.tableView);
        }
      }

    } catch {
    }
  }

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
        if (e?.name === "AbortError") {
          // 자동 저장 중간에 취소된 건 그냥 무시
          return;
        }
        console.error("raid-tasks autosave failed", e);
      });
    }, 400); // 디바운스 줄이고 싶으면 여기 숫자 줄이면 됨

    return () => {
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, [
    authStatus,
    syncedWithServer,
    booting,
    nickname,
    data,
    prefsByChar,
    visibleByChar,
    onlyRemain,
    tableView,
  ]);




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
          // ✅ 서버에 이미 저장된 상태가 있으면 그걸 기준으로 씀
          const serverState = await res.json();
          applyServerState(serverState);
          didSync = true;
        } else if (res.status === 204 || res.status === 404) {
          // 🆕 서버에 아무것도 없으면 → 현재 상태를 서버로 업로드
          const hasSomethingLocal =
            !!data ||
            !!nickname ||
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
            // 로컬에도 아무 상태가 없으면, "동기화 할 게 없음" 상태로 간주
            didSync = true;
          }
        }

        else if (res.status === 401) {
          console.warn("raid-tasks state: Unauthorized");
        }
      } catch (e) {
        console.error("raid-tasks state sync failed", e);
      } finally {
        if (!cancelled && didSync) {
          clearClientStorage();
          setSyncedWithServer(true);
        }
        if (!cancelled) {
          setSyncingServer(false);     // ✅ 서버 동기화 종료
        }
      }
    }

    syncWithServer();

    return () => {
      cancelled = true;
    };
  }, [
    authStatus,
    syncedWithServer,
    booting,
    data,
    nickname,
    prefsByChar,
    visibleByChar,
    onlyRemain,
    tableView,
  ]);




  /** 카드 뷰에서 한 캐릭터에 대한 TaskCard 리스트 생성 */
  const buildTasksFor = (c: RosterCharacter): TaskItem[] => {
    const prefs = prefsByChar[c.name];
    if (!prefs) return [];

    // 1) 기본 순서 후보 만들기
    const baseRaidNames =
      prefs.order?.filter((r) => prefs.raids[r]) ?? Object.keys(prefs.raids);

    // 2) order가 없는 경우에만 레이드 레벨 낮은순 → 높은순 정렬
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

      // 카드 뷰에서만 "남은 숙제만 보기" 필터 적용
      if (onlyRemain) {
        const gatesDef = diff.gates ?? [];
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

  /** 계정 삭제(데이터/설정 모두 초기화) */
  const handleDeleteAccount = () => {
    try {
      if (data?.roster) {
        for (const c of data.roster) {
          clearCharPrefs(c.name);
        }
      }
    } catch {
      // localStorage 오류는 무시
    }

    localStorage.removeItem(LOCAL_KEY);
    localStorage.removeItem(VISIBLE_KEY);

    setData(null);
    setNickname("");
    setPrefsByChar({});
    setVisibleByChar({});
    setIsCharSettingOpen(false);
  };

  /** 원정대 정보 불러오기(검색/새로고침 공통 사용) */
  const handleCharacterSearch = async (name: string): Promise<void> => {
    const trimmed = name.trim();
    if (!trimmed) return;

    setLoading(true);
    setErr(null);

    try {
      const r = await fetch(
        `/api/lostark/character/${encodeURIComponent(trimmed)}`,
        {
          cache: "no-store",
        }
      );

      const json = await r.json();

      setNickname(trimmed);
      setData(json);

      try {
        if (!isAuthed) {
          localStorage.setItem(
            LOCAL_KEY,
            JSON.stringify({ nickname: trimmed, data: json })
          );
        }
      } catch {
        // localStorage 저장 실패는 무시
      }
    } catch (e) {
      setErr(String(e));
    } finally {
      setLoading(false);
    }
  };

  /** 빈 상태에서 검색 폼 submit */
  const handleSearchSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    handleCharacterSearch(searchInput);
  };

  /** 캐릭터 정보 새로고침(현재 닉네임 기준) */
  const handleRefreshAccount = async () => {
    if (!nickname) return;
    await handleCharacterSearch(nickname);
  };

  /** 표시 대상 캐릭터 목록 (visibleByChar 적용) */
  const visibleRoster =
    data?.roster?.filter((c) => visibleByChar[c.name] ?? true) ?? [];

  /* ──────────────────────────
   *  남은 숙제/캐릭터 수 계산
   * ────────────────────────── */
  const {
    totalRemainingTasks,
    remainingCharacters,
    totalRemainingGold,
    totalGold,
  } = useMemo<RaidSummary>(() => {
    return computeRaidSummaryForRoster(visibleRoster, prefsByChar);
  }, [visibleRoster, prefsByChar]);


  const isAllCleared = totalRemainingGold === 0 && totalGold > 0;



  const hasRoster = !!(data?.roster && data.roster.length > 0);

  const isAuthLoading = authStatus === "loading";
  const isAuthAuthed = authStatus === "authenticated";

  const waitingInitialData =
    isAuthLoading || (isAuthAuthed && !syncedWithServer);

  const showInitialLoading =
    !hasRoster && (waitingInitialData || loading || booting || syncingServer);

  const showEmptyState =
    !showInitialLoading &&
    !hasRoster &&
    (
      // ① 아예 비로그인(게스트)일 때
      authStatus === "unauthenticated" ||
      // ② 로그인 유저인데, 서버 동기화까지 끝난 뒤에야 비로소 "진짜로 비어있다" 판단
      (authStatus === "authenticated" && syncedWithServer)
    );



  /** 테이블 뷰에서 관문 토글 */
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

  const handleAutoSetup = () => {
    if (!data?.roster || data.roster.length === 0) return;

    const roster = data.roster;

    // 1) 공통 유틸로 새 상태 계산
    const { nextPrefsByChar, nextVisibleByChar } = buildAutoSetupForRoster(
      roster,
      prefsByChar
    );

    // 2) 상태 반영
    setPrefsByChar(nextPrefsByChar);
    setVisibleByChar(nextVisibleByChar);

    // 3) 게스트 모드일 때만 localStorage 반영
    try {
      if (!isAuthed) {
        // visibleByChar 저장
        localStorage.setItem(VISIBLE_KEY, JSON.stringify(nextVisibleByChar));

        // 각 캐릭 prefs 저장
        for (const [name, prefs] of Object.entries(nextPrefsByChar)) {
          writePrefs(name, prefs);
        }
      }
    } catch {
      // 로컬스토리지 에러는 무시
    }
  };



  /** 모든 캐릭터의 관문 체크만 초기화 (enable/difficulty/order는 유지) */
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
          if (!isAuthed) {
            writePrefs(name, updated);
          }
        } catch {
          // localStorage 에러는 무시
        }

      }

      return next;
    });
  };

  return (
    <div className="w-full text-white py-8 sm:py-12">
      {/* 공통 좌우 패딩 */}
      <div className="mx-auto max-w-7xl space-y-5">
        {/* 상단 헤더 */}
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 py-1 sm:py-2">
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight truncate break-keep">
              내 숙제

            </h1>
          </div>
        </div>

        {/* 바디 (필터 + 메인 영역) */}
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
                {/* 숙제/보상 섹션 */}
                <div>
                  <div className="mb-3 text-xs sm:text-sm font-bold">숙제/보상</div>
                  <div className="space-y-3 text-xs sm:text-sm">
                    {/* 남은 숙제만 보기 (카드 뷰 전용) */}
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

                      <span className="text-xs sm:text-sm">남은 숙제만 보기</span>

                      {/* 물음표 텍스트 아이콘(디자인용) */}
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
                <div className="mb-3 text-xs sm:text-sm font-semibold">보기 설정</div>
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
            <div className="bg-[#16181D] rounded-md px-4 sm:px-5 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 min-w-0 text-sm sm:text-base">
                <div className="flex items-baseline gap-1.5">
                  <span className="font-semibold text-sm sm:text-lg pr-1">남은 숙제</span>
                  <span className="text-gray-400 text-xs sm:text-sm font-semibold">
                    {totalRemainingTasks}
                  </span>
                </div>

                <span className="hidden sm:inline h-4 w-px bg-white/10" />

                <div className="flex items-baseline gap-1.5">
                  <span className="font-semibold text-sm sm:text-lg pr-1">
                    숙제 남은 캐릭터
                  </span>
                  <span className="text-gray-400 text-xs sm:text-sm font-semibold">
                    {remainingCharacters}
                  </span>
                </div>

                <span className="hidden sm:inline h-4 w-px bg-white/10" />

                <div className="flex items-baseline gap-1.5">
                  <span className="font-semibold text-sm sm:text-lg pr-1">
                    남은 골드
                  </span>
                  <span
                    className={`
                      text-xs sm:text-sm font-semibold
                      ${isAllCleared ? "line-through decoration-gray-300 decoration-1 text-gray-400" : "text-gray-400"}
                    `}
                  >
                    {isAllCleared
                      ? `${totalGold.toLocaleString()}g`
                      : `${totalRemainingGold.toLocaleString()}g`
                    }
                  </span>
                </div>

              </div>



              <div className="flex flex-row flex-wrap gap-2 sm:gap-3 sm:ml-auto">
                {/* 자동 세팅 버튼 (상위 6캐릭 + 각 캐릭 top3 레이드 자동 선택) */}
                <button
                  onClick={handleAutoSetup}
                  disabled={!hasRoster}
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

                  {/* 오른쪽 위 물음표 (텍스트) */}
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

                  {/* 설명 툴팁 */}
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
                      <span className="text-white font-semibold">아이템 레벨 상위 6개 캐릭터</span>와
                      해당 캐릭터의 <span className="text-indigo-400">Top 3 레이드</span>를
                      자동으로 세팅합니다.
                    </p>

                    <div
                      className="
                        absolute -bottom-1.5 left-4  {/* right-4를 left-4로 변경 */}
                        w-3 h-3 
                        bg-gray-900/95 border-b border-r border-white/10 
                        rotate-45
                      "
                    />
                  </div>
                </button>

                {/* 관문 전체 초기화 */}
                <button
                  onClick={gateAllClear}
                  className="inline-flex items-center justify-center py-2 px-3 sm:px-4 rounded-md bg-white/[.04] border border-white/10 hover:bg-white/5 text-xs sm:text-sm"
                >
                  <span>관문 초기화</span>
                </button>

                {/* 캐릭터 설정 모달 열기 */}
                <button
                  onClick={() => setIsCharSettingOpen(true)}
                  className="inline-flex items-center justify-center py-2 px-3 sm:px-4 rounded-md bg-white/[.04] border border-white/10 text-xs sm:text-sm font-medium"
                >
                  캐릭터 설정
                </button>
              </div>
            </div>

            {/* 캐릭터가 전혀 없을 때 빈 상태 표시 */}
            {showEmptyState && (
              <div className="w-full py-10 sm:py-16 px-4 sm:px-6 flex flex-col items-center justify-center text-center bg-[#16181D] border-2 border-dashed border-white/10 rounded-xl animate-in fade-in zoom-in-95 duration-500">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-[#5B69FF] blur-[40px] opacity-20 rounded-full" />
                  <div className="relative w-16 h-16 sm:w-20 sm:h-20 bg-[#1E222B] rounded-full flex items-center justify-center border border-white/10 shadow-xl">
                    <span className="text-sm sm:text-base font-semibold text-[#5B69FF]">s
                      LOA
                    </span>
                  </div>
                  <div className="absolute -right-2 -bottom-2 bg-[#16181D] px-2 py-0.5 rounded-full border border-white/10">
                    <span className="text-[10px] text-gray-400">검색</span>
                  </div>
                </div>

                <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 sm:mb-3">
                  원정대 캐릭터를 불러오세요
                </h2>
                <p className="text-gray-400 max-w-md mb-6 sm:mb-8 leading-relaxed text-[12px] sm:text-base">
                  아직 등록된 캐릭터 데이터가 없습니다.
                  <br />
                  <span className="text-gray-400">
                    대표 캐릭터 닉네임을 입력하면 전투정보실에서 정보를 가져옵니다.
                  </span>
                </p>

                <form
                  onSubmit={handleSearchSubmit}
                  className="relative flex items-center w-full max-w-md"
                >
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
                    {loading ? (
                      <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      "검색"
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* 에러 메시지 */}
            {err && <div className="text-sm text-red-400">에러: {err}</div>}

            {/* 초기 부팅/로딩 중 + 아직 roster 없음 */}
            {showInitialLoading && (
              <div className="w-full py-16 sm:py-24 flex flex-col items-center justify-center animate-in fade-in duration-300">
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 mb-5 sm:mb-6">
                  <div className="absolute inset-0 border-4 border-[#5B69FF]/20 rounded-full" />
                  <div className="absolute inset-0 border-4 border-[#5B69FF] rounded-full border-t-transparent animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs sm:text-sm font-semibold text-[#5B69FF]">
                      LOA
                    </span>
                  </div>
                </div>

                <h3 className="text-lg sm:text-xl font-bold text-white mb-1 sm:mb-2 animate-pulse">
                  원정대 정보를 불러오는 중입니다
                </h3>
                <p className="text-xs sm:text-sm text-gray-400">잠시만 기다려주세요...</p>
              </div>
            )}

            {/* 실제 데이터가 있을 때: 카드 뷰 / 테이블 뷰 스위치 */}
            {tableView && hasRoster ? (
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

                    if (onlyRemain && tasks.length === 0) {
                      return null;
                    }

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
          </div>
        </div>
      </div>

      {/* 레이드 편집 모달 */}
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

      {/* 캐릭터 표시 여부 / 계정 관리 모달 */}
      {isCharSettingOpen && (
        <CharacterSettingModal
          open
          onClose={() => setIsCharSettingOpen(false)}
          roster={data?.roster ?? []}
          onDeleteAccount={handleDeleteAccount}
          onRefreshAccount={handleRefreshAccount}
          visibleByChar={visibleByChar}
          onChangeVisible={(next) => {
            setVisibleByChar(next);
            try {
              if (!isAuthed) {
                localStorage.setItem(VISIBLE_KEY, JSON.stringify(next));
              }
            } catch {
              // 로컬스토리지 에러는 무시
            }
          }}

        />
      )}
    </div>
  );
}
