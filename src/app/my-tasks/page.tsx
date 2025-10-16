// app/my-tasks/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import CharacterTaskStrip, { TaskItem } from "../components/tasks/CharacterTaskStrip";
import TaskCard from "../components/tasks/TaskCard";
import EditTasksModal from "../components/tasks/EditTasksModal";
import type { CharacterSummary, RosterCharacter } from "../components/AddAccount";
import { raidInformation, type DifficultyKey } from "@/server/data/raids";
import type { CharacterTaskPrefs } from "@/app/lib/tasks/raid-prefs";
import { readPrefs, writePrefs } from "@/app/lib/tasks/raid-prefs";

export default function MyTasksPage() {
  const [difficulty, setDifficulty] = useState<"normal" | "hard">("normal");
  const [onlyRemain, setOnlyRemain] = useState(false);
  const [goldOnly, setGoldOnly] = useState(false);
  const [tableView, setTableView] = useState(false);

  const resetFilters = () => { setDifficulty("normal"); setOnlyRemain(false); setGoldOnly(false); };

  const nickname = "끼러꾸";
  const [data, setData] = useState<CharacterSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // ✅ 캐릭터별 저장된 숙제 설정
  const [prefsByChar, setPrefsByChar] = useState<Record<string, CharacterTaskPrefs>>({});
  const [editingChar, setEditingChar] = useState<RosterCharacter | null>(null);

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

  // (선택) 로컬 저장/복원
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
    let abort = false;
    setLoading(true);
    fetch(`/api/lostark/character/${encodeURIComponent(nickname)}`, { cache: "no-store" })
      .then(r => r.json())
      .then(json => { if (!abort) setData(json); })
      .catch(e => { if (!abort) setErr(String(e)); })
      .finally(() => { if (!abort) setLoading(false); });
    return () => { abort = true; };
  }, [nickname]);

  function setCharPrefs(name: string, updater: (cur: CharacterTaskPrefs) => CharacterTaskPrefs) {
    setPrefsByChar((prev) => {
      const cur = prev[name] ?? { raids: {} };
      const next = updater(cur);
      writePrefs(name, next);
      return { ...prev, [name]: next };
    });
  }



  const diffKey: DifficultyKey = (difficulty === "hard" ? "하드" : "노말");

  // app/my-tasks/page.tsx (발췌)
  // ...중략...

  const buildTasksFor = (c: RosterCharacter): TaskItem[] => {
    const prefs = prefsByChar[c.name];
    if (!prefs) return [];

    // order가 있으면 그 순서대로, 없으면 기본 키 순서
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
            // (옵션) prefix 선택 토글 계속 유지
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

          {/* 오른쪽: 모바일에선 축약/숨김, 한 줄 유지 */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 whitespace-nowrap">
            <button className="inline-flex items-center justify-center h-9 sm:h-10 px-3 sm:px-5 rounded-md border border-white/10 bg-[#16181D] hover:bg-white/5 text-xs sm:text-sm">
              {/* xs에선 짧게, sm부터 풀레이블 */}
              <span className="sm:hidden">초기화</span>
              <span className="hidden sm:inline">관문 초기화</span>
            </button>

            <button className="inline-flex items-center justify-center h-9 sm:h-10 px-3 sm:px-5 rounded-md border border-white/10 bg-[#16181D] text-xs sm:text-sm font-medium">
              업데이트
            </button>

            {/* 편집 버튼은 md 이상에서만 노출 */}
            <button className="hidden md:inline-flex items-center justify-center h-9 md:h-10 px-3 rounded-md text-xs md:text-sm text-neutral-400 hover:text-neutral-200">
              캐릭터 설정
            </button>
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
          {/* 요약 바 */}
          <div className="bg-[#16181D] rounded-md px-5 py-4 flex items-center">
            <div className="flex items-center gap-4 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-xl">남은 숙제</span>
                <span className="text-gray-500 text-sm">1</span>
              </div>
              <span className="h-4 w-px bg-white/10" />
              <div className="flex items-center gap-2">
                <span className="font-semibold text-xl">숙제 남은 캐릭터</span>
                <span className="text-gray-500 text-sm">{data?.roster?.length ?? 0}</span>
              </div>
            </div>
            <button className="ml-auto inline-flex items-center gap-1 h-8 px-3 rounded-md border border-white/10 text-xs text-gray-300 hover:bg-white/5">
              숙제 편집
              <svg className="h-3.5 w-3.5 opacity-80" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M14.5 2.9a1.4 1.4 0 0 1 2 2L8.5 13.9 5 14.5l.6-3.5L14.5 2.9z" stroke="currentColor" strokeWidth="1.2" />
                <path d="M3 17h14" stroke="currentColor" strokeWidth="1.2" />
              </svg>
            </button>
          </div>

          {err && <div className="text-sm text-red-400">에러: {err}</div>}
          {loading && <div className="text-sm text-gray-400">불러오는 중…</div>}

          {data?.roster
            ?.sort((a, b) => (b.itemLevelNum ?? 0) - (a.itemLevelNum ?? 0))
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

    </div>
  );
}

