// app/my-tasks/page.tsx
"use client";

import { useMemo, useState } from "react";


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

  return (
    <div className="space-y-5 py-12 text-gray-300 w-full text-white">
      <div className="mx-auto max-w-7xl ">
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 py-2 sm:py-3">

          {/* 왼쪽: 줄임표 + 한국어 줄바꿈 보정 */}
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <h1 className="text-base sm:text-lg md:text-xl font-bold tracking-tight truncate break-keep">
              내 숙제
            </h1>
            <span className="text-[11px] sm:text-xs text-neutral-400 shrink-0">남은 숙제 1</span>
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
              캐릭터 목록 편집
            </button>
          </div>
        </div>
      </div>


      {/* 바디 (필터, 캐릭터 정보) */}
      <div className="mx-auto max-w-7xl 
                       grid grid-cols-1 lg:grid-cols-[200px_1fr]
                        gap-5 
                       ">
        {/* 필터 */}
        <div className="space-y-4">
          {/* 카드: 필터 */}
          <section className="rounded-sm  bg-[#16181D] shadow-sm">
            <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <h3 className="text-base font-semibold">필터</h3>
              <button
                onClick={resetFilters}
                className="inline-flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-200"
              >
                초기화 <span className="text-[11px]">⟳</span>
              </button>
            </header>

            <div className="px-5 py-7 space-y-5">
              {/* 난이도 */}
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
                   peer-checked:bg-blue-600 peer-checked:border-blue-600
                   peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500"
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
                   peer-checked:bg-blue-600 peer-checked:border-blue-600
                   peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500"
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
                      className="grid place-items-center h-5 w-5 rounded-md border border-white/25 transition
                   peer-checked:bg-blue-600 peer-checked:border-blue-600
                   peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500"
                    >
                      <svg
                        className="h-3.5 w-3.5 text-white opacity-0 transition-opacity duration-150 peer-checked:opacity-100"
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
                      className="grid place-items-center h-5 w-5 rounded-md border border-white/25 transition
                   peer-checked:bg-blue-600 peer-checked:border-blue-600
                   peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500"
                    >
                      <svg
                        className="h-3.5 w-3.5 text-white opacity-0 transition-opacity duration-150 peer-checked:opacity-100"
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
            <div className="px-4 py-3">
              <div className="mb-3 text-sm font-semibold">보기 설정</div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-blue-500"
                  checked={tableView}
                  onChange={(e) => setTableView(e.target.checked)}
                />
                테이블로 보기
              </label>
            </div>
          </section>
        </div>


        {/* 캐릭터 정보 */}
        <div className="bg-[#16181D]">
          <div>dd</div>
        </div>
      </div>
    </div>
  );
}
