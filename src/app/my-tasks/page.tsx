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

export default function MyTasksPage() {
  const [difficulty, setDifficulty] = useState<"normal" | "hard">("normal");
  const [onlyRemain, setOnlyRemain] = useState(false);
  const [goldOnly, setGoldOnly] = useState(false);
  const [tableView, setTableView] = useState(false);

  const resetFilters = () => { setDifficulty("normal"); setOnlyRemain(false); setGoldOnly(false); };

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
      try { setPrefsByChar(JSON.parse(raw)); } catch { }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("raidTaskPrefs", JSON.stringify(prefsByChar));
  }, [prefsByChar]);

  useEffect(() => {
    try {
      localStorage.setItem(VISIBLE_KEY, JSON.stringify(visibleByChar));
    } catch {
    }
  }, [visibleByChar]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LOCAL_KEY);

      if (raw) {
        const saved = JSON.parse(raw) as {
          nickname: string;
          data: CharacterSummary;
        };

        // 🔹 저장된 계정 있으면 상태 복원
        setNickname(saved.nickname);
        setSearchName(saved.nickname);
        setData(saved.data);
      }
    } catch {
      // 파싱 실패하면 무시
    } finally {
      // 🔹 복원 시도 끝났으니 부트 로딩 종료
      setBooting(false);
    }
  }, []);


  function setCharPrefs(name: string, updater: (cur: CharacterTaskPrefs) => CharacterTaskPrefs) {
    setPrefsByChar((prev) => {
      const cur = prev[name] ?? { raids: {} };
      const next = updater(cur);
      writePrefs(name, next);
      return { ...prev, [name]: next };
    });
  }

  const diffKey: DifficultyKey = (difficulty === "hard" ? "하드" : "노말");
  const buildTasksFor = (c: RosterCharacter): TaskItem[] => {
    const prefs = prefsByChar[c.name];
    if (!prefs) return [];

    const raidNames = (prefs.order?.filter((r) => prefs.raids[r]) ?? Object.keys(prefs.raids));

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
        id: raidName, // 캐릭터 내에서 유니크
        element: (
          <TaskCard
            key={`${c.name}-${raidName}-${p.difficulty}`}
            kind={info.kind}
            raidName={raidName}
            difficulty={p.difficulty}
            gates={p.gates}
            right={right}
            onToggleGate={(gate) => {
              const allGateIdx = diff.gates.map((g) => g.index).sort((a, b) => a - b);
              setCharPrefs(c.name, (cur) => {
                const curRaid = cur.raids[raidName] ?? p;
                const sorted = [...(curRaid.gates ?? [])].sort((a, b) => a - b);
                const isMax = sorted.length > 0 && sorted[sorted.length - 1] === gate;
                const next = isMax ? allGateIdx.filter((x) => x < gate) : allGateIdx.filter((x) => x <= gate);
                return { ...cur, raids: { ...cur.raids, [raidName]: { ...curRaid, gates: next } } };
              });
            }}
          />
        ),
      });
    }

    return items;
  };


  const handleDeleteAccount = () => {
    // 1) 로컬스토리지 비우기
    localStorage.removeItem(LOCAL_KEY);
    localStorage.removeItem("raidTaskPrefs");
    localStorage.removeItem(VISIBLE_KEY);

    // 2) 화면 상태 초기화
    setData(null);
    setNickname("");
    setSearchName("");
    setPrefsByChar({});
    setVisibleByChar({});

    // 3) 캐릭터 설정 모달 닫기
    setIsCharSettingOpen(false);
  };


  const handleCharacterSearch = async (name: string): Promise<void> => {
    const trimmed = name.trim();
    if (!trimmed) return;

    setLoading(true);
    setErr(null);
    setIsCharSearchOpen(false);

    try {
      const r = await fetch(`/api/lostark/character/${encodeURIComponent(trimmed)}`, {
        cache: "no-store",
      });

      const json = await r.json();

      // 상태 반영
      setNickname(trimmed);
      setSearchName(trimmed);
      setData(json);

      try {
        localStorage.setItem(
          LOCAL_KEY,
          JSON.stringify({ nickname: trimmed, data: json })
        );
      } catch {
      }
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

  const visibleRoster = data?.roster?.filter((c) => visibleByChar[c.name] ?? true) ?? [];

  const hasRoster = data?.roster && data.roster.length > 0;

  return (
    <div className="space-y-5 py-12 text-gray-300 w-full text-white">
      <div className="mx-auto max-w-7xl ">
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 py-2 sm:py-3">

          {/* 왼쪽: 줄임표 + 한국어 줄바꿈 보정 */}
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <h1 className="text-lg sm:text-xl md:text-3xl font-bold tracking-tight truncate break-keep">
              내 숙제
            </h1>
          </div>


        </div>
      </div>


      {/* 바디 (필터, 캐릭터 정보) */}
      <div className="mx-auto max-w-7xl 
                       grid grid-cols-1 lg:grid-cols-[220px_1fr]
                       gap-5 lg:items-start">
        {/* 필터 */}
        <div className="space-y-4">
          {/* 카드: 필터 */}
          <section className="rounded-sm  bg-[#16181D] shadow-sm">
            <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <h3 className="text-xl font-semibold">필터</h3>
              <button
                onClick={resetFilters}
                className="inline-flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-200"
              >
                초기화 <span className="text-[11px]">⟳</span>
              </button>
            </header>

            <div className="px-5 py-7 space-y-5">
              {/* 난이도 */}
              <div>
                <div className="mb-3 text-sm font-bold">난이도</div>
                <div className="flex items-center gap-4 text-sm">
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
                      peer-checked:[&_svg]:opacity-100"
                    >
                      {/* 체크 아이콘 */}
                      <svg
                        className="h-4 w-4 text-white opacity-0 transition-opacity duration-150 peer-checked:opacity-100"
                        viewBox="0 0 20 20" fill="none"
                      >
                        <path d="M5 10l3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

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
                   peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500  peer-checked:[&_svg]:opacity-100"
                    >
                      <svg
                        className="h-4 w-4 text-white opacity-0 transition-opacity duration-150 peer-checked:opacity-100"
                        viewBox="0 0 20 20" fill="none"
                      >
                        <path d="M5 10l3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    하드
                  </label>
                </div>
              </div>


              {/* 숙제/보상 */}
              <div>
                <div className="mb-3 text-sm font-bold">숙제/보상</div>
                <div className="space-y-3 text-sm">
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
                   peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500  peer-checked:[&_svg]:opacity-100"
                    >
                      <svg
                        className="h-4 w-4 text-white opacity-0 transition-opacity duration-150 peer-checked:opacity-100"
                        viewBox="0 0 20 20" fill="none"
                      >
                        <path d="M5 10l3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
                   peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500  peer-checked:[&_svg]:opacity-100"
                    >
                      <svg
                        className="h-4 w-4 text-white opacity-0 transition-opacity duration-150 peer-checked:opacity-100"
                        viewBox="0 0 20 20" fill="none"
                      >
                        <path d="M5 10l3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    골드 획득 캐릭터만 보기
                  </label>
                </div>
              </div>
            </div>
          </section>

          {/* 카드: 보기 설정 */}
          <section className="rounded-sm  bg-[#16181D] shadow-sm">
            <div className="px-5 py-7 space-y-5">
              <div className="mb-3 text-sm font-semibold">보기 설정</div>
              <label className="flex items-center gap-2 cursor-pointer select-none text-[#A2A3A5]">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={tableView}
                  onChange={(e) => setTableView(e.target.checked)}
                />
                <span
                  className="grid place-items-center h-5 w-5 rounded-md border border-white/30 transition
                   peer-checked:bg-[#5B69FF] peer-checked:border-[#5B69FF]
                   peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500  peer-checked:[&_svg]:opacity-100"
                >
                  <svg
                    className="h-4 w-4 text-white opacity-0 transition-opacity duration-150 peer-checked:opacity-100"
                    viewBox="0 0 20 20" fill="none"
                  >
                    <path d="M5 10l3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                테이블로 보기
              </label>

            </div>
          </section>
        </div>

        <div className="grid grid-cols-1 gap-5">
          <div className="bg-[#16181D] rounded-md px-5 py-4 flex items-center">
            <div className="flex items-center gap-4 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-xl">남은 숙제</span>
                <span className="text-gray-500 text-sm">1</span>
              </div>
              <span className="h-4 w-px bg-white/10" />
              <div className="flex items-center gap-2">
                <span className="font-semibold text-xl">숙제 남은 캐릭터</span>
                <span className="text-gray-500 text-sm">{visibleRoster.length}</span>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <button className="inline-flex items-center justify-center py-2 px-3 sm:px-5 rounded-md bg-white/[.04] border border-white/10  hover:bg-white/5 text-xs sm:text-sm">
                <span className="hidden sm:inline">관문 초기화</span>
              </button>

              <button className="inline-flex items-center justify-center py-2 px-3 sm:px-5 rounded-md bg-white/[.04] border border-white/10  text-xs sm:text-sm font-medium">
                업데이트
              </button>

              <button
                onClick={() => setIsCharSettingOpen(true)}
                className="inline-flex gap-1.5 items-center justify-center py-2 px-3 sm:px-5 rounded-md bg-white/[.04] border border-white/10  text-xs sm:text-sm font-medium">
                캐릭터 설정
                <SquarePen
                  className="inline-block align-middle w-4 h-4  text-[#FFFFFF]/50"
                  strokeWidth={1.75}
                />
              </button>

            </div>
          </div>

          {!loading && !booting && !hasRoster && (
            <div className="w-full py-16 px-6 flex flex-col items-center justify-center text-center bg-[#16181D] border-2 border-dashed border-white/10 rounded-xl animate-in fade-in zoom-in-95 duration-500">
              {/* 아이콘 + 글로우 효과 */}
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-[#5B69FF] blur-[40px] opacity-20 rounded-full" />
                <div className="relative w-20 h-20 bg-[#1E222B] rounded-full flex items-center justify-center border border-white/10 shadow-xl">
                  <UserPlus size={36} className="text-[#5B69FF]" />
                </div>
                <div className="absolute -right-2 -bottom-2 bg-[#16181D] p-1.5 rounded-full border border-white/10">
                  <Search size={16} className="text-gray-400" />
                </div>
              </div>

              <h2 className="text-2xl font-bold text-white mb-3">
                원정대 캐릭터를 불러오세요
              </h2>
              <p className="text-gray-400 max-w-md mb-8 leading-relaxed">
                아직 등록된 캐릭터 데이터가 없습니다.<br />
                <span className="text-gray-500">대표 캐릭터 닉네임을 입력하면 전투정보실에서 정보를 가져옵니다.</span>
              </p>

              {/* 🔹 여기 폼 */}
              <form onSubmit={handleSearchSubmit} className="relative flex items-center w-full max-w-md">
                <input
                  type="text"
                  placeholder="캐릭터 닉네임 입력"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  disabled={loading}
                  className="w-full h-12 pl-4 pr-12 rounded-lg bg-[#0F1115] border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[#5B69FF] focus:ring-1 focus:ring-[#5B69FF] transition-all disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={loading || !searchInput.trim()}
                  className="absolute right-1.5 p-2 rounded-md bg-[#5B69FF] text-white hover:bg-[#4A57E6] disabled:bg-gray-700 disabled:text-gray-500 transition-colors"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Search size={18} />
                  )}
                </button>
              </form>
            </div>
          )}

          {err && <div className="text-sm text-red-400">에러: {err}</div>}


          {(loading || booting) && !hasRoster && (
            <div className="w-full py-24 flex flex-col items-center justify-center animate-in fade-in duration-300">
              <div className="relative w-20 h-20 mb-6">
                {/* 바깥쪽 회전하는 링 */}
                <div className="absolute inset-0 border-4 border-[#5B69FF]/20 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-[#5B69FF] rounded-full border-t-transparent animate-spin"></div>

                {/* 안쪽 펄스 아이콘 */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles
                    size={28}
                    className="text-[#5B69FF] animate-pulse"
                    fill="currentColor"
                    fillOpacity={0.3}
                  />
                </div>
              </div>

              <h3 className="text-xl font-bold text-white mb-2 animate-pulse">
                원정대 정보를 불러오는 중입니다
              </h3>
              <p className="text-sm text-gray-500">
                잠시만 기다려주세요...
              </p>
            </div>
          )}


          {visibleRoster
            .sort((a, b) => (b.itemLevelNum ?? 0) - (a.itemLevelNum ?? 0))
            .map((c) => (
              <CharacterTaskStrip
                key={c.name}
                character={c}
                tasks={buildTasksFor(c)}
                onEdit={() => setEditingChar(c)}
                onReorder={(char, newOrderIds) => {
                  setCharPrefs(char.name, (cur) => ({ ...cur, order: newOrderIds }));
                }}
              />
            ))}


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

