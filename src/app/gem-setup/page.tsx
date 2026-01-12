"use client";

import React, { Fragment, useEffect, useMemo, useRef, useState } from "react";

import { loadState, makeInitialState, saveState } from "../lib/arcgrid/storage";
import type { CoreDef, Gem, Params, PlanPack } from "../lib/arcgrid/types";
import type { Role } from "../lib/arcgrid/constants";
import type { ScoredPlan } from "../lib/arcgrid/optimizer";

// UI Components
import InventoryPanel from "../components/arcgrid/InventoryPanel";
import ResultsPanel from "../components/arcgrid/ResultsPanel";
import ActionBar from "../components/arcgrid/ActionBar";
import QuickAddModal, { type QuickDraft } from "../components/arcgrid/QuickAddModal";
import Select from "../components/arcgrid/ui/Select";
import Input from "../components/arcgrid/ui/Input";

// Icons
import { LayoutGrid, Save, FolderOpen, Trash2, Cpu, Clock, Plus } from "lucide-react";

type Constraints = Record<string, { minPts: number; maxPts: number }>;
type Inventory = { order: Gem[]; chaos: Gem[] };
type WorkerPayload =
  | {
    action: "points";
    cores: CoreDef[];
    params: Params;
    inventory: Inventory;
    constraints: Constraints;
  }
  | {
    action: "statsAtBest";
    cores: CoreDef[];
    params: Params;
    inventory: Inventory;
    constraints: Constraints;
    role: Role;
    topK: number;
    capPerCore: number;
  }
  | {
    action: "statsAny";
    cores: CoreDef[];
    params: Params;
    inventory: Inventory;
    constraints: Constraints;
    role: Role;
    topK: number;
    capPerCore: number;
  };

type WorkerReq = WorkerPayload & { id: string };

type WorkerRes =
  | { id: string; ok: true; action: WorkerPayload["action"]; result: any }
  | { id: string; ok: false; action: WorkerPayload["action"]; error: string };
// Hook: Responsive
function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent | MediaQueryList) =>
      setMatches("matches" in e ? e.matches : (e as MediaQueryList).matches);
    handler(mql);
    mql.addEventListener ? mql.addEventListener("change", handler) : (mql as any).addListener(handler);
    return () => {
      mql.removeEventListener ? mql.removeEventListener("change", handler) : (mql as any).removeListener(handler);
    };
  }, [query]);
  return matches;
}

function safeUUID() {
  try {
    // @ts-ignore
    return crypto?.randomUUID?.() ?? `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  } catch {
    return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }
}

function toConstraints(cores: CoreDef[]): Constraints {
  const out: Constraints = {};
  for (const c of cores) out[c.key] = { minPts: c.minPts, maxPts: c.maxPts };
  return out;
}

export default function ArcGridPage() {
  const [state, setState] = useState(() => makeInitialState());
  const [loaded, setLoaded] = useState(false);

  const [resultPack, setResultPack] = useState<{ plan: PlanPack; focusKey: string | null } | null>(null);
  const [altPlans, setAltPlans] = useState<ScoredPlan[] | null>(null);
  const [showAltList, setShowAltList] = useState(true);

  const [showQuick, setShowQuick] = useState(false);

  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [prog, setProg] = useState<{ v: number | null; msg: string }>({ v: null, msg: "" });

  const fileRef = useRef<HTMLInputElement | null>(null);

  const [fileName, setFileName] = useState(() => {
    const now = new Date();
    return `arcgrid_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(
      2,
      "0"
    )}`;
  });

  // --- derived ---
  const enabledCores = useMemo(() => state.cores.filter((c) => c.enabled) as CoreDef[], [state.cores]);
  const invCount = state.inventory.order.length + state.inventory.chaos.length;
  const selectedCoreCount = enabledCores.length;

  const gemById = useMemo(() => {
    const m = new Map<string, Gem>();
    for (const g of state.inventory.order) m.set(g.id, g);
    for (const g of state.inventory.chaos) m.set(g.id, g);
    return m;
  }, [state.inventory.order, state.inventory.chaos]);

  // --- toast/progress helpers ---
  const showToast = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 1400);
  };
  const startProgress = (msg: string, v: number | null = null) => {
    setProg({ v, msg });
    setBusy(true);
  };
  const updateProgress = (msg: string, v: number | null) => setProg({ v, msg });
  const endProgress = () => {
    setProg({ v: 100, msg: "완료" });
    setTimeout(() => setBusy(false), 250);
  };
  const tick = () => new Promise((r) => setTimeout(r, 0));

  // --- persistence ---
  useEffect(() => {
    const s = loadState();
    setState(s);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const id = setTimeout(() => saveState(state), 100);
    return () => clearTimeout(id);
  }, [state, loaded]);

  // --- Worker RPC ---
  const workerRef = useRef<Worker | null>(null);
  const pendingRef = useRef(
    new Map<
      string,
      {
        resolve: (v: any) => void;
        reject: (e: Error) => void;
      }
    >()
  );

  useEffect(() => {
    // Next/Webpack/Turbopack 기준
    const w = new Worker(new URL("../lib/arcgrid/arcgrid.worker.tsx", import.meta.url), { type: "module" });

    workerRef.current = w;

    w.onmessage = (ev: MessageEvent<WorkerRes>) => {
      const msg = ev.data;
      const pending = pendingRef.current.get(msg.id);
      if (!pending) return;
      pendingRef.current.delete(msg.id);

      if (msg.ok) pending.resolve(msg.result);
      else pending.reject(new Error(msg.error || "worker error"));
    };

    w.onerror = () => {
      // 워커가 죽으면 대기 중인 promise 전부 실패 처리
      for (const [, p] of pendingRef.current) p.reject(new Error("worker crashed"));
      pendingRef.current.clear();
    };

    return () => {
      try {
        w.terminate();
      } catch { }
      workerRef.current = null;
      pendingRef.current.clear();
    };
  }, []);

  function callWorker<T>(payload: WorkerPayload): Promise<T> {
    const w = workerRef.current;
    if (!w) return Promise.reject(new Error("worker not ready"));

    const id = safeUUID();

    return new Promise<T>((resolve, reject) => {
      pendingRef.current.set(id, { resolve, reject });

      const msg: WorkerReq = { id, ...payload };
      w.postMessage(msg);
    });
  }


  // --- inventory update helpers ---
  const updateGem = (family: keyof Inventory, id: string, patch: Partial<Gem>) => {
    setState((st) => ({
      ...st,
      inventory: {
        ...st.inventory,
        [family]: st.inventory[family].map((g) => (g.id === id ? { ...g, ...patch } : g)),
      },
    }));
  };

  const updateGemOption = (family: keyof Inventory, id: string, idx: number, patch: Partial<Gem["options"][number]>) => {
    setState((st) => ({
      ...st,
      inventory: {
        ...st.inventory,
        [family]: st.inventory[family].map((g) => {
          if (g.id !== id) return g;
          const options = g.options.map((o, i) => (i === idx ? { ...o, ...patch } : o));
          return { ...g, options };
        }),
      },
    }));
  };

  const removeGem = (family: keyof Inventory, id: string) => {
    setState((st) => ({
      ...st,
      inventory: { ...st.inventory, [family]: st.inventory[family].filter((g) => g.id !== id) },
    }));
  };

  const addDrafts = (drafts: QuickDraft[]) => {
    if (!drafts.length) return;
    setState((st) => {
      const next: typeof st = {
        ...st,
        inventory: { ...st.inventory, order: [...st.inventory.order], chaos: [...st.inventory.chaos] },
      };

      for (const d of drafts) {
        const g: Gem = {
          id: safeUUID(),
          family: d.family,
          subType: d.subType,
          baseWill: d.base,
          options: [
            { name: "의지력 효율", lv: d.effLv, fixed: true },
            { name: "코어 포인트", lv: d.pts, fixed: true },
            ...d.opts.slice(0, 2).map((o) => ({ name: o.name, lv: o.lv })),
          ],
        };
        (next.inventory as any)[g.family].push(g);
      }
      return next;
    });
    showToast(`젬 ${drafts.length}개 추가 완료`);
  };

  // --- actions ---
  async function runPoints() {
    if (!selectedCoreCount) return showToast("선택된 코어가 없어요");
    if (invCount === 0) return showToast("인벤토리에 젬을 추가해 주세요");

    const constraints = toConstraints(state.cores as CoreDef[]);
    startProgress("최대 포인트 플랜 계산 중...", 15);
    await tick();

    try {
      const plan = await callWorker<PlanPack>({
        action: "points",
        cores: enabledCores,
        params: state.params,
        inventory: state.inventory,
        constraints,
      });

      updateProgress("결과 적용...", 90);
      await tick();

      setAltPlans(null);
      setResultPack({ plan, focusKey: enabledCores[0]?.key ?? null });
      showToast("최적 조합을 계산했어요");
    } catch (e: any) {
      showToast(e?.message ?? "계산 실패");
    } finally {
      endProgress();
    }
  }

  async function runStatsAtBest() {
    if (!selectedCoreCount) return showToast("선택된 코어가 없어요");
    if (invCount === 0) return showToast("인벤토리에 젬을 추가해 주세요");

    const constraints = toConstraints(state.cores as CoreDef[]);
    const role = (state.params.role ?? "dealer") as Role;

    startProgress("스탯 상위(최대P) 계산 중...", 12);
    await tick();

    try {
      const { bestPts, list } = await callWorker<{ bestPts: number; list: ScoredPlan[] }>({
        action: "statsAtBest",
        cores: enabledCores,
        params: state.params,
        inventory: state.inventory,
        constraints,
        role,
        topK: 3,
        capPerCore: 2000,
      });

      updateProgress("결과 정리...", 85);
      await tick();

      setAltPlans(list);
      if (!list.length) showToast("조건을 만족하는 조합이 없어요");
      else showToast(`최대 포인트(${bestPts}) 내 스탯 상위 ${list.length}개`);
    } catch (e: any) {
      showToast(e?.message ?? "계산 실패");
    } finally {
      endProgress();
    }
  }

  async function runStatsAny() {
    if (!selectedCoreCount) return showToast("선택된 코어가 없어요");
    if (invCount === 0) return showToast("인벤토리에 젬을 추가해 주세요");

    const constraints = toConstraints(state.cores as CoreDef[]);
    const role = (state.params.role ?? "dealer") as Role;

    startProgress(`${role === "supporter" ? "서포터" : "딜러"} 스탯 우선 탐색 중...`, 10);
    await tick();

    try {
      const list = await callWorker<ScoredPlan[]>({
        action: "statsAny",
        cores: enabledCores,
        params: state.params,
        inventory: state.inventory,
        constraints,
        role,
        topK: 3,
        capPerCore: 2000,
      });

      if (!list.length) {
        showToast("조건을 만족하는 조합이 없어요");
      } else {
        setAltPlans(list);
        setResultPack({ plan: list[0].plan, focusKey: enabledCores[0]?.key ?? null });
        showToast("스탯 우선 조합을 계산했어요");
      }
    } catch (e: any) {
      showToast(e?.message ?? "계산 실패");
    } finally {
      endProgress();
    }
  }

  function saveToFile() {
    const exportData = { version: 1, params: state.params, cores: state.cores, inventory: state.inventory };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${fileName || "arcgrid_setup"}.json`;
    a.click();
    showToast("파일로 저장했어요");
  }

  function loadFromFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result ?? "{}"));
        setState((st) => ({
          ...st,
          params: parsed.params ?? st.params,
          cores: parsed.cores ?? st.cores,
          inventory: parsed.inventory ?? st.inventory,
        }));
        setAltPlans(null);
        setResultPack(null);
        showToast("파일에서 불러왔어요");
      } catch {
        showToast("불러오기에 실패했습니다");
      }
    };
    reader.readAsText(f);
    e.target.value = "";
  }

  function resetAll() {
    if (confirm("인벤토리와 설정을 모두 초기화할까요?")) {
      setState(makeInitialState());
      setResultPack(null);
      setAltPlans(null);
      showToast("초기화했어요");
    }
  }

  // --- alt list expand ---
  const [expandedSet, setExpandedSet] = useState<Set<number>>(() => new Set());
  const toggleRow = (i: number) => {
    setExpandedSet((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  const isMobile = useMediaQuery("(max-width: 640px)");

  return (
    <div className="space-y-8 py-8 sm:py-12 text-gray-300 w-full">
      {/* 1) Header */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 text-xs font-medium text-[#5B69FF]">
          <LayoutGrid className="h-4 w-4" />
          <span>아크 그리드 최적화</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">젬 세팅</h1>
        <p className="text-sm text-gray-400 max-w-2xl leading-relaxed">
          보유 중인 젬을 기반으로 의지력을 계산하여 최적의 코어 포인트를 찾아냅니다. 원하는 세팅을 저장하고 불러올 수
          있습니다.
        </p>
      </div>

      {/* 2) Save/Load */}
      <div className="bg-[#16181D] border border-white/5 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-6 text-xs sm:text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#5B69FF]" />
              선택 코어 <b className="text-white ml-0.5">{selectedCoreCount}</b>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              보유 젬 <b className="text-white ml-0.5">{invCount}</b>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              className="px-3 py-2 rounded-lg bg-[#0E1015] border border-white/10 text-white text-sm w-full sm:w-48 focus:ring-1 focus:ring-[#5B69FF] outline-none transition-all placeholder-gray-600"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="파일 이름"
            />
            <button
              onClick={saveToFile}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#2d333b] hover:bg-[#383f47] text-white text-xs font-medium transition-all"
            >
              <Save className="h-3.5 w-3.5" /> 저장
            </button>

            <label className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#2d333b] hover:bg-[#383f47] text-white text-xs font-medium cursor-pointer transition-all">
              <FolderOpen className="h-3.5 w-3.5" /> 불러오기
              <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={loadFromFile} />
            </label>

            <button
              onClick={resetAll}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-red-900/10 border border-red-900/20 text-red-400 hover:bg-red-900/20 text-xs font-medium transition-all"
            >
              <Trash2 className="h-3.5 w-3.5" /> 초기화
            </button>
          </div>
        </div>
      </div>

      {/* 3) Core Settings */}
      <div className="bg-[#16181D] border border-white/5 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white">1. 코어 설정</h2>
          </div>

          <div className="w-full sm:w-40">
            <Select
              value={(state.params.role ?? "dealer") as any}
              onChange={(v) => setState((st) => ({ ...st, params: { ...st.params, role: v as any } }))}
              options={[
                { value: "dealer", label: "딜러" },
                { value: "supporter", label: "서포터" },
              ]}
            />
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3 text-[11px] text-gray-500 px-2 pb-2">
          <div>코어</div>
          <div>등급</div>
          <div>최소P</div>
          <div>최대P</div>
        </div>

        <div className="space-y-2">
          {state.cores.map((core) => (
            <div
              key={core.key}
              className={`rounded-xl ${core.enabled ? "bg-white/[0.02] border border-white/5" : "opacity-40"} p-2`}
            >
              <div className="grid [grid-template-columns:1.2fr_1fr_1fr_1fr] gap-3 items-center">
                <Row
                  core={core as CoreDef}
                  onToggle={(b) =>
                    setState((st) => ({
                      ...st,
                      cores: st.cores.map((c) => (c.key === core.key ? { ...c, enabled: b } : c)),
                    }))
                  }
                  onGrade={(g) =>
                    setState((st) => ({
                      ...st,
                      cores: st.cores.map((c) => (c.key === core.key ? { ...c, grade: g } : c)),
                    }))
                  }
                  onMin={(v) =>
                    setState((st) => ({
                      ...st,
                      cores: st.cores.map((c) => (c.key === core.key ? { ...c, minPts: v } : c)),
                    }))
                  }
                  onMax={(v) =>
                    setState((st) => ({
                      ...st,
                      cores: st.cores.map((c) => (c.key === core.key ? { ...c, maxPts: v } : c)),
                    }))
                  }
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4) Inventory */}
      <div className="bg-[#16181D] border border-white/5 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            2. 보유 젬 입력
          </h2>

        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <InventoryPanel
            title="질서 인벤토리"
            family="order"
            list={state.inventory.order}
            params={state.params as any}
            onUpdate={(f, id, p) => updateGem(f as any, id, p)}
            onUpdateOption={(f, id, i, p) => updateGemOption(f as any, id, i, p)}
            onRemove={(f, id) => removeGem(f as any, id)}
            onQuickAddConfirm={(drafts) => addDrafts(drafts)}
          />

          <InventoryPanel
            title="혼돈 인벤토리"
            family="chaos"
            list={state.inventory.chaos}
            params={state.params as any}
            onUpdate={(f, id, p) => updateGem(f as any, id, p)}
            onUpdateOption={(f, id, i, p) => updateGemOption(f as any, id, i, p)}
            onRemove={(f, id) => removeGem(f as any, id)}
            onQuickAddConfirm={(drafts) => addDrafts(drafts)}
          />
        </div>
      </div>

      {/* 5) Results */}
      <div className="bg-[#16181D] border border-white/5 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            3. 결과 확인
          </h2>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={runPoints}
              className="px-3 py-1.5 rounded-lg bg-[#2d333b] border border-[#444c56] text-white text-xs hover:bg-[#383f47] transition-all"
            >
              포인트 우선
            </button>
            <button
              onClick={runStatsAtBest}
              className="px-3 py-1.5 rounded-lg bg-[#2d333b] border border-[#444c56] text-white text-xs hover:bg-[#383f47] transition-all"
            >
              스탯 상위 (최대P)
            </button>
            <button
              onClick={runStatsAny}
              className="px-3 py-1.5 rounded-lg bg-[#5B69FF]/20 border border-[#5B69FF]/30 text-[#5B69FF] text-xs font-bold hover:bg-[#5B69FF]/30 transition-all"
            >
              {state.params.role === "supporter" ? "서포터 스탯 우선" : "딜러 스탯 우선"}
            </button>
          </div>
        </div>

        {!resultPack ? (
          <div className="border border-dashed border-white/10 rounded-xl py-12 text-center text-gray-500 text-sm">
            최적화 버튼을 눌러 조합을 계산해 보세요.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg">
              <ResultsPanel plan={resultPack.plan} cores={state.cores} gemById={gemById} />
            </div>

            {altPlans && altPlans.length > 0 && (
              <div className="pt-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm text-gray-300">
                    스탯 상위 리스트 <span className="text-gray-500">({altPlans.length}개)</span>
                  </div>
                  <button
                    onClick={() => setShowAltList((v) => !v)}
                    className="px-2.5 py-1.5 rounded-md border border-white/10 bg-white/5 hover:bg-white/10 text-xs text-gray-200"
                  >
                    {showAltList ? "접기" : "펼치기"}
                  </button>
                </div>

                {showAltList && (
                  <div className="mt-3 overflow-x-auto rounded-xl border border-[#444c56]">
                    <table className="min-w-[720px] w-full text-xs">
                      <thead className="bg-[#22272e] text-gray-300">
                        <tr>
                          <th className="px-2 sm:px-3 py-2 w-8 sm:w-10"></th>
                          <th className="px-2 sm:px-3 py-2 text-center w-10 sm:w-14">#</th>
                          <th className="px-2 sm:px-3 py-2 text-center w-28 sm:w-32">스탯 점수</th>
                          <th className="px-2 sm:px-3 py-2 text-center w-24 sm:w-28">총 포인트</th>
                          <th className="px-2 sm:px-3 py-2 text-center w-28 sm:w-32">잔여 의지력</th>
                          {enabledCores.map((c) => (
                            <th key={c.key} className="px-2 sm:px-3 py-2 text-center whitespace-nowrap">
                              {c.label}
                            </th>
                          ))}
                          <th className="px-2 sm:px-3 py-2 text-center w-20 sm:w-24"></th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-[#444c56]">
                        {altPlans.map((p, i) => {
                          const colCount = 6 + enabledCores.length;
                          const isOpen = expandedSet.has(i);
                          return (
                            <Fragment key={`plan-${i}`}>
                              <tr className="bg-[#2d333b] hover:bg-[#30363d]">
                                <td className="px-2 sm:px-3 py-2">
                                  <button
                                    aria-label={isOpen ? "접기" : "펼치기"}
                                    className="w-6 h-6 rounded hover:bg-black/20"
                                    onClick={() => toggleRow(i)}
                                  >
                                    <span className="inline-block align-middle">{isOpen ? "▾" : "▸"}</span>
                                  </button>
                                </td>

                                <td className="px-2 sm:px-3 py-2 text-gray-300 text-center">#{i + 1}</td>
                                <td className="px-2 sm:px-3 py-2 text-center">
                                  <b className="text-white">{p.statScore.toFixed(3)}</b>
                                </td>
                                <td className="px-2 sm:px-3 py-2 text-center">
                                  <b className="text-gray-200">{p.sumPts}</b>
                                </td>
                                <td className="px-2 sm:px-3 py-2 text-center">
                                  <b className="text-gray-200">{p.sumRemain}</b>
                                </td>

                                {enabledCores.map((c) => {
                                  const it = p.plan.answer[c.key];
                                  const pts = it?.res?.pts ?? 0;
                                  const stat = typeof it?.res?.flexScore === "number" ? it.res.flexScore : 0;
                                  return (
                                    <td key={c.key} className="px-2 sm:px-3 py-2 text-gray-300 text-center">
                                      <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                                        <span className="px-1.5 sm:px-2 py-0.5 rounded bg-black/20 border border-white/10">
                                          {pts}p
                                        </span>
                                        <span className="text-gray-500">·</span>
                                        <span className="tabular-nums text-gray-200">{stat.toFixed(3)}</span>
                                      </div>
                                    </td>
                                  );
                                })}

                                <td className="px-2 sm:px-3 py-2 text-center">
                                  <button
                                    className="px-2.5 sm:px-3 py-1.5 rounded-md border border-white/10 bg-white/5 hover:bg-white/10 text-[#5B69FF] text-[11px] font-bold transition-all"
                                    onClick={() => {
                                      setResultPack({ plan: p.plan, focusKey: enabledCores[0]?.key ?? null });
                                      setToast(`#${i + 1} 조합을 적용했어요`);
                                      setTimeout(() => setToast(null), 1400);
                                    }}
                                  >
                                    적용
                                  </button>
                                </td>
                              </tr>

                              {isOpen && (
                                <tr className="bg-[#1f242c]">
                                  <td colSpan={colCount} className="px-2 sm:px-3 py-3">
                                    <div className="rounded-lg border border-white/10 bg-[#0E1015]">
                                      <ResultsPanel plan={p.plan} cores={state.cores} gemById={gemById} />
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 기존 하단 액션바 유지 (네 프로젝트에 이미 붙어있던 구성이라면 그대로) */}
      <ActionBar coreCount={selectedCoreCount} invCount={invCount} onRun={runPoints} />

      {/* Quick Add Modal */}
      {showQuick && (
        <QuickAddModal
          onClose={() => setShowQuick(false)}
          onConfirm={(drafts: QuickDraft[]) => {
            addDrafts(drafts);
            setShowQuick(false);
          }}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-24 right-6 z-[100] animate-in fade-in slide-in-from-bottom-2">
          <div className="px-4 py-2 rounded-xl bg-[#5B69FF] text-white text-sm font-bold shadow-2xl">{toast}</div>
        </div>
      )}

      {busy && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-[min(400px,90vw)] bg-[#16181D] border border-white/10 rounded-2xl p-6 shadow-2xl">
            <div className="text-center space-y-4">
              <div className="text-white font-bold">{prog.msg || "작업을 준비하고 있어요"}</div>
              <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden">
                <div className="h-full bg-[#5B69FF] transition-all duration-300" style={{ width: `${Math.max(0, Math.min(100, prog.v ?? 0))}%` }} />
              </div>
              <div className="text-[10px] text-gray-500 uppercase tracking-widest">
                로딩 중입니다. 로딩이 지속되면 질서 코어와 혼돈 코어를 각각 계산해 보세요.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** 코어 한 줄 UI */
function Row({
  core,
  onToggle,
  onGrade,
  onMin,
  onMax,
}: {
  core: CoreDef;
  onToggle: (b: boolean) => void;
  onGrade: (g: CoreDef["grade"]) => void;
  onMin: (v: number) => void;
  onMax: (v: number) => void;
}) {
  const isMobile = useMediaQuery("(max-width: 640px)");

  const gradeOptions = useMemo(() => {
    const showNum = !isMobile;
    return [
      { value: "heroic", label: showNum ? "영웅(9)" : "영웅" },
      { value: "legend", label: showNum ? "전설(12)" : "전설" },
      { value: "relic", label: showNum ? "유물(15)" : "유물" },
      { value: "ancient", label: showNum ? "고대(17)" : "고대" },
    ];
  }, [isMobile]);

  return (
    <>
      <div className="flex items-center gap-3">
        <label className="inline-flex items-center cursor-pointer">
          <input type="checkbox" className="sr-only peer" checked={core.enabled} onChange={(e) => onToggle(e.target.checked)} />
          <div className="relative w-9 h-5 sm:w-11 sm:h-6 bg-gray-700 rounded-full peer peer-checked:bg-[#5B69FF] after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 sm:after:h-5 sm:after:w-5 after:transition-all peer-checked:after:translate-x-full" />
        </label>

        <span
          className={`px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-bold truncate ${core.family === "order" ? "text-rose-400 bg-rose-400/10" : "text-blue-400 bg-blue-400/10"
            }`}
          title={core.label}
        >
          {core.label}
        </span>
      </div>

      <div className="bg-[#0E1015] rounded-md border border-white/5">
        <Select value={core.grade as any} onChange={(v) => onGrade(v as any)} options={gradeOptions as any} />
      </div>

      <div className="bg-[#0E1015] rounded-md border border-white/5">
        <Input
          type="number"
          value={core.minPts}
          onChange={(e: any) => onMin(Number(e.target.value))}
        />
      </div>

      <div className="bg-[#0E1015] rounded-md border border-white/5">
        <Input
          type="number"
          value={core.maxPts}
          onChange={(e: any) => onMax(Number(e.target.value))}
        />
      </div>
    </>
  );
}
