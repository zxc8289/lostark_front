// app/my-tasks/page.tsx
"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import CharacterTaskStrip, { TaskItem } from "../components/tasks/CharacterTaskStrip";
import TaskCard from "../components/tasks/TaskCard";
import EditTasksModal from "../components/tasks/EditTasksModal";
import type { CharacterSummary, RosterCharacter } from "../components/AddAccount";
import { raidInformation, type DifficultyKey } from "@/server/data/raids";
import type { CharacterTaskPrefs } from "@/app/lib/tasks/raid-prefs";
import { readPrefs, writePrefs } from "@/app/lib/tasks/raid-prefs";
import { Search, Sparkles, SquarePen, UserPlus } from "lucide-react";
import CharacterSettingModal from "../components/tasks/CharacterSettingModal";
import EmptyCharacterState from "../components/tasks/EmptyCharacterState";
import TaskTable from "../components/tasks/TaskTable";

export default function MyTasksPage() {
  const [difficulty, setDifficulty] = useState<"normal" | "hard">("normal");
  const [onlyRemain, setOnlyRemain] = useState(false);
  const [goldOnly, setGoldOnly] = useState(false);
  const [tableView, setTableView] = useState(false);

  const resetFilters = () => {
    setDifficulty("normal");
    setOnlyRemain(false);
    setGoldOnly(false);
  };

  const [nickname, setNickname] = useState("");
  const [searchName, setSearchName] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const [data, setData] = useState<CharacterSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [booting, setBooting] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [prefsByChar, setPrefsByChar] = useState<Record<string, CharacterTaskPrefs>>({});
  const [editingChar, setEditingChar] = useState<RosterCharacter | null>(null);
  const [isCharSettingOpen, setIsCharSettingOpen] = useState(false);
  const [isCharSearchOpen, setIsCharSearchOpen] = useState(false);

  const [visibleByChar, setVisibleByChar] = useState<Record<string, boolean>>({});

  const LOCAL_KEY = "raidTaskLastAccount";
  const VISIBLE_KEY = "raidTaskVisibleByChar";

  useEffect(() => {
    if (!data?.roster) return;
    setPrefsByChar((prev) => {
      const next = { ...prev };
      for (const c of data.roster) {
        next[c.name] = readPrefs(c.name) ?? next[c.name] ?? { raids: {} };
      }
      return next;
    });
  }, [data?.roster]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(VISIBLE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Record<string, boolean>;
        setVisibleByChar(saved);
      }
    } catch {
      // 파싱 실패하면 무시
    }
  }, []);

  useEffect(() => {
    if (!data?.roster) return;

    setVisibleByChar((prev) => {
      const next: Record<string, boolean> = {};
      for (const c of data.roster!) {
        // 기존 설정 유지, 없으면 기본 true
        next[c.name] = prev[c.name] ?? true;
      }
      return next;
    });
  }, [data?.roster]);

  useEffect(() => {
    const raw = localStorage.getItem("raidTaskPrefs");
    if (raw) {
      try {
        setPrefsByChar(JSON.parse(raw));
      } catch { }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("raidTaskPrefs", JSON.stringify(prefsByChar));
  }, [prefsByChar]);

  useEffect(() => {
    try {
      localStorage.setItem(VISIBLE_KEY, JSON.stringify(visibleByChar));
    } catch { }
  }, [visibleByChar]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LOCAL_KEY);

      if (raw) {
        const saved = JSON.parse(raw) as {
          nickname: string;
          data: CharacterSummary;
        };

        setNickname(saved.nickname);
        setSearchName(saved.nickname);
        setData(saved.data);
      }
    } catch {
      // 파싱 실패하면 무시
    } finally {
      setBooting(false);
    }
  }, []);


  function calcNextGates(
    clickedGate: number,
    currentGates: number[],
    allGates: number[]
  ): number[] {
    if (!allGates.length) return [];

    const sortedAll = [...allGates].sort((a, b) => a - b);
    const selectedSet = new Set(currentGates);

    // 현재 선택된 관문들 중 "가장 오른쪽" 인덱스
    let currentMaxIdx = -1;
    sortedAll.forEach((g, idx) => {
      if (selectedSet.has(g) && idx > currentMaxIdx) {
        currentMaxIdx = idx;
      }
    });

    const clickedIdx = sortedAll.indexOf(clickedGate);
    if (clickedIdx === -1) {
      // 이상한 값이면 기존 상태 유지
      return currentGates;
    }

    let newMaxIdx: number;

    if (currentMaxIdx === -1) {
      // 1) 아무 것도 안 눌렸을 때 → 클릭한 관문까지 켜기
      //    예) [] 에서 3 → [1,2,3]
      newMaxIdx = clickedIdx;
    } else if (clickedIdx > currentMaxIdx) {
      // 2) 현재 선택 범위보다 오른쪽을 클릭 → 거기까지 확장
      //    예) [1] 에서 3 → [1,2,3]
      newMaxIdx = clickedIdx;
    } else {
      // 3) 현재 선택 범위 안/왼쪽을 클릭 → 그 관문부터 오른쪽 다 끄기
      //    예) [1,2,3] 에서 2 → [1]
      //        [1,2,3] 에서 1 → []
      newMaxIdx = clickedIdx - 1;
    }

    if (newMaxIdx < 0) {
      return [];
    }

    // 앞에서부터 newMaxIdx 까지의 관문만 켜기
    return sortedAll.slice(0, newMaxIdx + 1);
  }


  function setCharPrefs(
    name: string,
    updater: (cur: CharacterTaskPrefs) => CharacterTaskPrefs
  ) {
    setPrefsByChar((prev) => {
      const cur = prev[name] ?? { raids: {} };
      const next = updater(cur);
      writePrefs(name, next);
      return { ...prev, [name]: next };
    });
  }

  const diffKey: DifficultyKey = difficulty === "hard" ? "하드" : "노말";
  const buildTasksFor = (c: RosterCharacter): TaskItem[] => {
    const prefs = prefsByChar[c.name];
    if (!prefs) return [];

    const raidNames =
      prefs.order?.filter((r) => prefs.raids[r]) ?? Object.keys(prefs.raids);

    const items: TaskItem[] = [];

    for (const raidName of raidNames) {
      const p = prefs.raids[raidName];
      if (!p?.enabled) continue;

      const info = raidInformation[raidName];
      if (!info) continue;

      const diff = info.difficulty[p.difficulty];
      if (!diff) continue;

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
    try {
      // 1) 캐릭터별 레이드 prefs 삭제
      //    readPrefs / writePrefs 가 encodeURIComponent(name)으로 저장하고 있다고 가정
      if (data?.roster) {
        for (const c of data.roster) {
          const key = encodeURIComponent(c.name);
          localStorage.removeItem(key);
        }
      }

      // 혹시 대표 닉네임만 따로 쓰는 경우도 대비
      if (nickname) {
        const nickKey = encodeURIComponent(nickname);
        localStorage.removeItem(nickKey);
      }
    } catch {
      // 그냥 실패는 무시
    }

    // 2) 이 페이지에서 쓰는 나머지 키들 삭제
    localStorage.removeItem(LOCAL_KEY);         // raidTaskLastAccount
    localStorage.removeItem("raidTaskPrefs");   // 통짜 prefsByChar 캐시
    localStorage.removeItem(VISIBLE_KEY);       // raidTaskVisibleByChar

    // 3) 리액트 상태 초기화
    setData(null);
    setNickname("");
    setSearchName("");
    setPrefsByChar({});
    setVisibleByChar({});
    setIsCharSettingOpen(false);
  };


  const handleCharacterSearch = async (name: string): Promise<void> => {
    const trimmed = name.trim();
    if (!trimmed) return;

    setLoading(true);
    setErr(null);
    setIsCharSearchOpen(false);

    try {
      const r = await fetch(
        `/api/lostark/character/${encodeURIComponent(trimmed)}`,
        {
          cache: "no-store",
        }
      );

      const json = await r.json();

      setNickname(trimmed);
      setSearchName(trimmed);
      setData(json);

      try {
        localStorage.setItem(
          LOCAL_KEY,
          JSON.stringify({ nickname: trimmed, data: json })
        );
      } catch { }
    } catch (e) {
      setErr(String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    handleCharacterSearch(searchInput);
  };

  const handleRefreshAccount = async () => {
    if (!nickname) return;
    await handleCharacterSearch(nickname);
  };

  const visibleRoster =
    data?.roster?.filter((c) => visibleByChar[c.name] ?? true) ?? [];

  const hasRoster = data?.roster && data.roster.length > 0;


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


  return (
    <div className="w-full text-white text-gray-300 py-8 sm:py-12">
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
            lg:grid-cols-[minmax(0,220px)_minmax(0,1fr)]
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
                {/* 난이도 */}
                <div>
                  <div className="mb-3 text-xs sm:text-sm font-bold">난이도</div>
                  <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm">
                    {/* 노말 */}
                    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="radio"
                        name="difficulty"
                        className="sr-only peer"
                        checked={difficulty === "normal"}
                        onChange={() => setDifficulty("normal")}
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
                      노말
                    </label>

                    {/* 하드 */}
                    <label className="inline-flex items-center gap-2 cursor-pointer select-none text-neutral-400">
                      <input
                        type="radio"
                        name="difficulty"
                        className="sr-only peer"
                        checked={difficulty === "hard"}
                        onChange={() => setDifficulty("hard")}
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
                      하드
                    </label>
                  </div>
                </div>

                {/* 숙제/보상 */}
                <div>
                  <div className="mb-3 text-xs sm:text-sm font-bold">숙제/보상</div>
                  <div className="space-y-3 text-xs sm:text-sm">
                    {/* 남은 숙제만 보기 */}
                    <label className="flex items-center gap-2 cursor-pointer select-none text-[#A2A3A5]">
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
                      남은 숙제만 보기
                    </label>

                    {/* 골드 획득 캐릭터만 보기 */}
                    <label className="flex items-center gap-2 cursor-pointer select-none text-[#A2A3A5]">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={goldOnly}
                        onChange={(e) => setGoldOnly(e.target.checked)}
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
                      골드 획득 캐릭터만 보기
                    </label>
                  </div>
                </div>
              </div>
            </section>

            {/* 보기 설정 카드 */}
            <section className="rounded-sm bg-[#16181D] shadow-sm">
              <div className="px-4 sm:px-5 py-5 sm:py-7 space-y-4 sm:space-y-5">
                <div className="text-xs sm:text-sm font-semibold">보기 설정</div>
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
            {/* 요약 바 */}
            <div className="bg-[#16181D] rounded-md px-4 sm:px-5 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 min-w-0 text-sm sm:text-base">
                <div className="flex items-baseline gap-1.5">
                  <span className="font-semibold text-base sm:text-lg">남은 숙제</span>
                  <span className="text-gray-500 text-xs sm:text-sm">1</span>
                </div>
                <span className="hidden sm:inline h-4 w-px bg-white/10" />
                <div className="flex items-baseline gap-1.5">
                  <span className="font-semibold text-base sm:text-lg">
                    숙제 남은 캐릭터
                  </span>
                  <span className="text-gray-500 text-xs sm:text-sm">
                    {visibleRoster.length}
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:ml-auto gap-2 sm:gap-3">
                <button className="inline-flex items-center justify-center py-2 px-3 sm:px-4 rounded-md bg-white/[.04] border border-white/10 hover:bg-white/5 text-xs sm:text-sm">
                  <span className="inline">관문 초기화</span>
                </button>

                <button
                  onClick={() => setIsCharSettingOpen(true)}
                  className="inline-flex gap-1.5 items-center justify-center py-2 px-3 sm:px-4 rounded-md bg-white/[.04] border border-white/10 text-xs sm:text-sm font-medium"
                >
                  캐릭터 설정
                  <SquarePen
                    className="inline-block align-middle w-4 h-4 text-[#FFFFFF]/50"
                    strokeWidth={1.75}
                  />
                </button>
              </div>
            </div>

            {/* 캐릭터 없을 때 빈 상태 */}
            {!loading && !booting && !hasRoster && (
              <div className="w-full py-10 sm:py-16 px-4 sm:px-6 flex flex-col items-center justify-center text-center bg-[#16181D] border-2 border-dashed border-white/10 rounded-xl animate-in fade-in zoom-in-95 duration-500">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-[#5B69FF] blur-[40px] opacity-20 rounded-full" />
                  <div className="relative w-16 h-16 sm:w-20 sm:h-20 bg-[#1E222B] rounded-full flex items-center justify-center border border-white/10 shadow-xl">
                    <UserPlus size={30} className="sm:hidden text-[#5B69FF]" />
                    <UserPlus size={36} className="hidden sm:block text-[#5B69FF]" />
                  </div>
                  <div className="absolute -right-2 -bottom-2 bg-[#16181D] p-1.5 rounded-full border border-white/10">
                    <Search size={16} className="text-gray-400" />
                  </div>
                </div>

                <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 sm:mb-3">
                  원정대 캐릭터를 불러오세요
                </h2>
                <p className="text-gray-400 max-w-md mb-6 sm:mb-8 leading-relaxed text-sm sm:text-base">
                  아직 등록된 캐릭터 데이터가 없습니다.
                  <br />
                  <span className="text-gray-500">
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
                    className="absolute right-1.5 p-2 rounded-md bg-[#5B69FF] text-white hover:bg-[#4A57E6] disabled:bg-gray-700 disabled:text-gray-500 transition-colors"
                  >
                    {loading ? (
                      <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Search size={16} className="sm:hidden" />
                    )}
                    {!loading && <Search size={18} className="hidden sm:block" />}
                  </button>
                </form>
              </div>
            )}

            {err && <div className="text-sm text-red-400">에러: {err}</div>}

            {(loading || booting) && !hasRoster && (
              <div className="w-full py-16 sm:py-24 flex flex-col items-center justify-center animate-in fade-in duration-300">
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 mb-5 sm:mb-6">
                  <div className="absolute inset-0 border-4 border-[#5B69FF]/20 rounded-full" />
                  <div className="absolute inset-0 border-4 border-[#5B69FF] rounded-full border-t-transparent animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles
                      size={24}
                      className="text-[#5B69FF] animate-pulse"
                      fill="currentColor"
                      fillOpacity={0.3}
                    />
                  </div>
                </div>

                <h3 className="text-lg sm:text-xl font-bold text-white mb-1 sm:mb-2 animate-pulse">
                  원정대 정보를 불러오는 중입니다
                </h3>
                <p className="text-xs sm:text-sm text-gray-500">
                  잠시만 기다려주세요...
                </p>
              </div>
            )}

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
                  .map((c) => (
                    <CharacterTaskStrip
                      key={c.name}
                      character={c}
                      tasks={buildTasksFor(c)}
                      onEdit={() => setEditingChar(c)}
                      onReorder={(char, newOrderIds) => {
                        setCharPrefs(char.name, (cur) => ({
                          ...cur,
                          order: newOrderIds,
                        }));
                      }}
                    />
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>

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

      {isCharSettingOpen && (
        <CharacterSettingModal
          open
          onClose={() => setIsCharSettingOpen(false)}
          roster={data?.roster ?? []}
          onDeleteAccount={handleDeleteAccount}
          onRefreshAccount={handleRefreshAccount}
          visibleByChar={visibleByChar}
          onChangeVisible={(next) => setVisibleByChar(next)}
        />
      )}

      {isCharSearchOpen && (
        <EmptyCharacterState
          open
          onClose={() => setIsCharSearchOpen(false)}
          onSearch={handleCharacterSearch}
        />
      )}
    </div>
  );
}
