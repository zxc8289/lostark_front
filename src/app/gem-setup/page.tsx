'use client';

import { useEffect, useMemo, useRef, useState, Fragment } from "react";
import { loadState, makeInitialState, saveState } from "../lib/arcgrid/storage";
import { baseWillBySubType, enumerateTopPlansByStats, optimizeAllByPermutations, optimizeExtremeBySequence, ScoredPlan } from "../lib/arcgrid/optimizer";
import { CoreDef, Gem } from "../lib/arcgrid/types";
import { ORDER_PERMS, Role } from "../lib/arcgrid/constants";
import Step from "../components/arcgrid/Step";
import InventoryPanel from "../components/arcgrid/InventoryPanel";
import ResultsPanel from "../components/arcgrid/ResultsPanel";
import ActionBar from "../components/arcgrid/ActionBar";
import QuickAddModal, { QuickDraft } from "../components/arcgrid/QuickAddModal";
import Card from "../components/Card";
import Select from "../components/arcgrid/ui/Select";
import Input from "../components/arcgrid/ui/Input";

export default function ArcGridPage() {
    const [state, setState] = useState(makeInitialState);
    const [resultPack, setResultPack] = useState<ReturnType<typeof optimizeExtremeBySequence> | null>(null);
    const [mode, setMode] = useState<'default' | 'extreme'>('default');
    const [orderPermIndex, setOrderPermIndex] = useState(0);
    const [showQuick, setShowQuick] = useState(false);
    const fileRef = useRef<HTMLInputElement | null>(null);
    const [toast, setToast] = useState<string | null>(null);
    const [altPlans, setAltPlans] = useState<ScoredPlan[] | null>(null);
    const enabledCores = useMemo(() => state.cores.filter(c => c.enabled) as CoreDef[], [state.cores]);

    // 행 펼침 상태
    const [expandedSet, setExpandedSet] = useState<Set<number>>(new Set());
    const toggleRow = (i: number) => {
        setExpandedSet(prev => {
            const next = new Set(prev);
            if (next.has(i)) next.delete(i);
            else next.add(i);
            return next;
        });
    };
    const expandAll = () => altPlans && setExpandedSet(new Set(altPlans.map((_, i) => i)));
    const collapseAll = () => setExpandedSet(new Set());
    useEffect(() => { setExpandedSet(new Set()); }, [altPlans]); // 목록 바뀌면 접기

    function runStatsList() {
        const cores = state.cores.filter(c => c.enabled) as CoreDef[];
        if (!cores.length) return showToast("선택된 코어가 없어요");
        if (invCount === 0) return showToast("인벤토리에 젬을 추가해 주세요");

        const constraints = Object.fromEntries(
            state.cores.map(c => [c.key, { minPts: c.minPts, maxPts: c.maxPts }])
        );

        const role = (state.params.role ?? "dealer") as Role;
        const list = enumerateTopPlansByStats(cores, state.params, state.inventory, constraints, role, 10);
        setAltPlans(list);
        if (list.length === 0) showToast("조건을 만족하는 조합이 없어요");
        else showToast(`스탯 상위 조합 ${list.length}개`);
    }

    useEffect(() => { setState(loadState()); }, []);
    useEffect(() => { saveState(state); }, [state]);

    const roleOptions = [
        { value: "dealer", label: "딜러" },
        { value: "supporter", label: "서포터" },
    ] as const;

    const invCount = state.inventory.order.length + state.inventory.chaos.length;
    const selectedCoreCount = state.cores.filter(c => c.enabled).length;
    const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 1400); };

    function addGem(family: 'order' | 'chaos') {
        const g: Gem = {
            id: crypto?.randomUUID?.() || Math.random().toString(36).slice(2),
            family,
            subType: family === 'order' ? '안정' : '침식',
            baseWill: baseWillBySubType(family === 'order' ? '안정' : '침식'),
            options: [
                { name: '의지력 효율', lv: 4, fixed: true },
                { name: '코어 포인트', lv: 3, fixed: true },
                { name: '보스 피해', lv: 5 },
                { name: '공격력', lv: 3 },
            ],
        };
        setState(st => ({ ...st, inventory: { ...st.inventory, [family]: [...st.inventory[family], g] } }));
    }
    function updateGem(family: 'order' | 'chaos', id: string, patch: Partial<Gem>) {
        setState(st => ({
            ...st,
            inventory: {
                ...st.inventory,
                [family]: st.inventory[family].map(g => g.id === id ? { ...g, ...patch } : g)
            }
        }));
    }
    function updateGemOption(
        family: 'order' | 'chaos', id: string, idx: number, patch: Partial<Gem['options'][number]>
    ) {
        setState(st => ({
            ...st,
            inventory: {
                ...st.inventory,
                [family]: st.inventory[family].map(g => {
                    if (g.id !== id) return g;
                    const opts = g.options.slice();
                    const next: any = { ...opts[idx], ...patch };
                    if (Object.prototype.hasOwnProperty.call(patch, 'name') && next.lv == null) next.lv = 1;
                    if (next.lv != null) next.lv = Number(next.lv) || 1;
                    opts[idx] = next;
                    return { ...g, options: opts };
                })
            }
        }));
    }
    function removeGem(family: 'order' | 'chaos', id: string) {
        setState(st => ({ ...st, inventory: { ...st.inventory, [family]: st.inventory[family].filter(g => g.id !== id) } }));
    }
    function resetInventory() {
        setState(st => ({ ...st, inventory: { order: [], chaos: [] } }));
        // showToast("초기화했어요");
    }
    function saveToFile() {
        const data = JSON.stringify({ inventory: state.inventory }, null, 2);
        const blob = new Blob([data], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "arcgrid_inventory.json";
        a.click();
        URL.revokeObjectURL(a.href);
        showToast("파일로 저장했어요");
    }
    function loadFromFile(e: React.ChangeEvent<HTMLInputElement>) {
        const f = e.target.files?.[0]; { }
        if (!f) return;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const parsed = JSON.parse(String(reader.result));
                setState(st => ({ ...st, inventory: parsed.inventory || st.inventory }));
                showToast("파일에서 불러왔어요");
            } catch {
                showToast("불러오기에 실패했습니다");
            }
        };
        reader.readAsText(f);
    }

    // ArcGridPage.tsx (run() 내부만 수정)
    function run() {
        const cores = state.cores.filter(c => c.enabled);
        if (!cores.length) return showToast("선택된 코어가 없어요");
        if (invCount === 0) return showToast("인벤토리에 젬을 추가해 주세요");

        const constraints = Object.fromEntries(
            state.cores.map(c => [c.key, { minPts: c.minPts, maxPts: c.maxPts }])
        ) as Record<string, { minPts: number; maxPts: number }>;
        const role = (state.params.role ?? "dealer") as "dealer" | "supporter";

        // 1) '포인트 합' 최대 플랜 계산
        const pointPack = optimizeAllByPermutations(cores as CoreDef[], state.params, state.inventory, constraints);
        const bestTotalPts = Object.values(pointPack.answer).reduce((sum, it) => sum + (it?.res?.pts ?? 0), 0);

        // 2) 그 '총 포인트'에서 스탯 합이 가장 높은 플랜들 탐색 → 1위 선택
        const topAtTarget = enumerateTopPlansByStats(
            cores as CoreDef[],
            state.params,
            state.inventory,
            constraints,
            role,
            10,
            bestTotalPts            // 👈 총 포인트를 고정
        );

        const finalPack = topAtTarget[0]?.plan ?? pointPack; // 혹시 없으면 포인트 플랜 사용(안전)

        setResultPack({ plan: finalPack, focusKey: cores[0].key });
        showToast("최적 조합을 계산했어요");
    }


    const gemById = useMemo(() => {
        const m = new Map<string, Gem>();
        for (const g of state.inventory.order) m.set(g.id, g);
        for (const g of state.inventory.chaos) m.set(g.id, g);
        return m;
    }, [state.inventory]);

    return (
        <div className="space-y-8 py-6 text-gray-300 w-full">

            <Card title="젬 세팅 저장">
                <div className="w-full flex items-center justify-between gap-3">
                    <div className="text-sm text-gray-400 whitespace-nowrap">
                        선택 코어  {'\u00A0'}<b className="text-gray-200">{selectedCoreCount}</b>
                        {'\u00A0\u00A0\u00A0\u00A0'}
                        보유 젬  {'\u00A0'}<b className="text-gray-200">{invCount}</b>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            className="px-3.5 py-2 rounded-lg border border-[#444c56] bg-[#2d333b] text-gray-200 hover:bg-[#30363d] transition"
                            onClick={saveToFile}
                        >
                            젬 세팅 저장
                        </button>
                        <label
                            className="relative px-3.5 py-2 rounded-lg border border-[#444c56] bg-[#2d333b] text-gray-200 hover:bg-[#30363d] transition cursor-pointer"
                        >
                            젬 세팅 불러오기
                            <input
                                ref={fileRef}
                                type="file"
                                accept="application/json"
                                className="absolute opacity-0 w-0 h-0 pointer-events-none"
                                onChange={loadFromFile}
                            />
                        </label>
                        <button
                            className="px-3.5 py-2 rounded-lg border border-[#8b2e2e] bg-[#3a2626] text-red-200 hover:bg-[#472b2b] transition"
                            onClick={resetInventory}
                            title="인벤토리를 비웁니다"
                        >
                            젬 비우기
                        </button>
                    </div>
                </div>
            </Card>

            {/* Step 1 */}
            <Card title="1. 코어 선택">

                <div className="w-full">
                    <div className="flex items-center gap-3 mb-2">
                        <label className="text-sm text-gray-400">역할</label>
                        <div className="w-40">
                            <Select
                                value={state.params.role ?? "dealer"}
                                onChange={(v) =>
                                    setState((st) => ({
                                        ...st,
                                        params: { ...st.params, role: v as "dealer" | "supporter" },
                                    }))
                                }
                                options={roleOptions as any} // (컴포넌트 시그니처에 맞춰 캐스트)
                                placeholder="역할 선택"
                            />
                        </div>
                    </div>

                    <div className="grid [grid-template-columns:1.1fr_.9fr_.8fr_.8fr] gap-2 items-center mt-1 text-sm">

                        <div className="text-[14px] text-gray-400">코어</div>
                        <div className="text-[14px] text-gray-400">등급</div>
                        <div className="text-[14px] text-gray-400">최소 포인트</div>
                        <div className="text-[14px] text-gray-400">최대 포인트</div>
                        {state.cores.map((c, idx) => (
                            <Row
                                key={c.key}
                                core={c}
                                onToggle={(checked) =>
                                    setState(st => {
                                        const cs = st.cores.slice();
                                        cs[idx] = { ...c, enabled: checked };
                                        return { ...st, cores: cs };
                                    })
                                }
                                onGrade={(g) =>
                                    setState(st => {
                                        const cs = st.cores.slice();
                                        cs[idx] = { ...c, grade: g };
                                        return { ...st, cores: cs };
                                    })
                                }
                                onMin={(v) =>
                                    setState(st => {
                                        const cs = st.cores.slice();
                                        cs[idx] = { ...c, minPts: Number(v || 0) };
                                        return { ...st, cores: cs };
                                    })
                                }
                                onMax={(v) =>
                                    setState(st => {
                                        const cs = st.cores.slice();
                                        cs[idx] = { ...c, maxPts: Number(v || 0) };
                                        return { ...st, cores: cs };
                                    })
                                }
                            />
                        ))}
                    </div>
                </div>
            </Card>

            <Card title="2. 보유 젬 입력">
                <div className="w-full">
                    <div className="grid md:grid-cols-2 gap-6 mt-3">
                        <InventoryPanel
                            title="질서 인벤토리"
                            family="order"
                            list={state.inventory.order}
                            params={state.params as any}
                            onUpdate={updateGem}
                            onUpdateOption={updateGemOption}
                            onRemove={removeGem}
                            onQuickAddConfirm={(drafts) => {
                                setState(st => {
                                    const next = { ...st, inventory: { ...st.inventory } };
                                    for (const d of drafts) {
                                        const g: Gem = {
                                            id: crypto?.randomUUID?.() || Math.random().toString(36).slice(2),
                                            family: d.family,               // 모달에서 선택한 계열 기준
                                            subType: d.subType,
                                            baseWill: d.base,
                                            options: [
                                                { name: '의지력 효율', lv: d.effLv, fixed: true },
                                                { name: '코어 포인트', lv: d.pts, fixed: true },
                                                ...d.opts.slice(0, 2).map(o => ({ name: o.name, lv: o.lv })),
                                            ],
                                        };
                                        (next.inventory as any)[g.family] = [...(next.inventory as any)[g.family], g];
                                    }
                                    return next;
                                });
                                showToast(`젬 ${drafts.length}개 추가`);
                            }}
                        />
                        <InventoryPanel
                            title="혼돈 인벤토리"
                            family="chaos"
                            list={state.inventory.chaos}
                            params={state.params as any}
                            onUpdate={updateGem}
                            onUpdateOption={updateGemOption}
                            onRemove={removeGem}
                            onQuickAddConfirm={(drafts) => {
                                setState(st => {
                                    const next = { ...st, inventory: { ...st.inventory } };
                                    for (const d of drafts) {
                                        const g: Gem = {
                                            id: crypto?.randomUUID?.() || Math.random().toString(36).slice(2),
                                            family: d.family,
                                            subType: d.subType,
                                            baseWill: d.base,
                                            options: [
                                                { name: '의지력 효율', lv: d.effLv, fixed: true },
                                                { name: '코어 포인트', lv: d.pts, fixed: true },
                                                ...d.opts.slice(0, 2).map(o => ({ name: o.name, lv: o.lv })),
                                            ],
                                        };
                                        (next.inventory as any)[g.family] = [...(next.inventory as any)[g.family], g];
                                    }
                                    return next;
                                });
                                showToast(`젬 ${drafts.length}개 추가`);
                            }}
                        />
                    </div>


                </div>
            </Card>


            <Card title="3. 결과 확인">
                <div className="w-full">
                    {!resultPack ? (
                        <div className="border border-dashed border-[#444c56] rounded-lg p-4 text-center text-gray-400">
                            아래 오른쪽의 <b className="text-gray-200">최적화</b> 버튼을 눌러 조합을 계산해 보세요.
                        </div>
                    ) : (
                        <div className="rounded-lg bg-[#2d333b]">
                            <ResultsPanel
                                plan={resultPack.plan}
                                cores={state.cores}
                                gemById={gemById}
                                {...(mode === "extreme"
                                    ? { orderPermIndex, onChangeOrderPerm: (i: number) => setOrderPermIndex(i) }
                                    : {})}
                            />
                        </div>
                    )}

                    <div className="mt-3 flex items-center gap-2">
                        <button
                            className="px-3.5 py-2 rounded-lg border border-[#444c56] bg-[#2d333b] text-gray-200 hover:bg-[#30363d] transition"
                            onClick={runStatsList}
                        >
                            상위 조합
                        </button>

                    </div>
                    {altPlans && altPlans.length > 0 && (
                        <div className="mt-4">
                            <div className="overflow-x-auto rounded-lg border border-[#444c56] ">
                                <table className="w-full text-sm ">
                                    <thead className="bg-[#22272e] text-gray-300">
                                        <tr>
                                            <th className="px-3 py-2 w-10"></th>{/* expander */}
                                            <th className="px-3 py-2 text-left w-14">#</th>
                                            <th className="px-3 py-2 text-left w-32">스탯 점수</th>
                                            <th className="px-3 py-2 text-left w-28">총 포인트</th>
                                            <th className="px-3 py-2 text-left w-32">잔여 의지력</th>
                                            {enabledCores.map(c => (
                                                <th key={c.key} className="px-3 py-2 text-left whitespace-nowrap">{c.label}</th>
                                            ))}
                                            <th className="px-3 py-2 text-right w-24"> </th>
                                        </tr>
                                    </thead>

                                    <tbody className="divide-y divide-[#444c56]">
                                        {altPlans.map((p, i) => {
                                            const colCount = 7 + enabledCores.length; // ⬅️ 아래에서 설명
                                            const isOpen = expandedSet.has(i);
                                            return (
                                                <Fragment key={`plan-${i}`}>
                                                    <tr className="bg-[#2d333b] hover:bg-[#30363d]">
                                                        <td className="px-3 py-2">
                                                            <button
                                                                aria-label={isOpen ? "접기" : "펼치기"}
                                                                className="w-6 h-6 rounded hover:bg-black/20"
                                                                onClick={() => toggleRow(i)}
                                                            >
                                                                <span className="inline-block align-middle">{isOpen ? "▾" : "▸"}</span>
                                                            </button>
                                                        </td>

                                                        <td className="px-3 py-2 text-gray-300">#{i + 1}</td>
                                                        <td className="px-3 py-2"><b className="text-white">{p.statScore.toFixed(3)}</b></td>
                                                        <td className="px-3 py-2"><b className="text-gray-200">{p.sumPts}</b></td>
                                                        <td className="px-3 py-2"><b className="text-gray-200">{p.sumRemain}</b></td>

                                                        {enabledCores.map(c => {
                                                            const it = p.plan.answer[c.key];
                                                            const pts = it?.res?.pts ?? 0;
                                                            const stat = typeof it?.res?.flexScore === "number" ? it.res.flexScore : 0;
                                                            return (
                                                                <td key={c.key} className="px-3 py-2 text-gray-300">
                                                                    <span className="inline-flex items-center gap-2">
                                                                        <span className="px-2 py-0.5 rounded bg-black/20 border border-white/10">{pts}p</span>
                                                                        <span className="text-gray-400">·</span>
                                                                        <span className="tabular-nums">{stat.toFixed(3)}</span>
                                                                    </span>
                                                                </td>
                                                            );
                                                        })}

                                                        <td className="px-3 py-2 text-right">
                                                            <button
                                                                className="px-3 py-1.5 rounded-md border border-[#444c56] bg-[#1f242c] text-gray-200 hover:bg-[#262c35] transition"
                                                                onClick={() => {
                                                                    setResultPack({ plan: p.plan, focusKey: enabledCores[0]?.key });
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
                                                            <td colSpan={colCount} className="px-3 py-3">
                                                                <div className="rounded-lg border border-[#444c56] bg-[#2d333b]">
                                                                    <ResultsPanel
                                                                        plan={p.plan}
                                                                        cores={state.cores}
                                                                        gemById={gemById}
                                                                    />
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </Fragment >
                                            );
                                        })}
                                    </tbody>

                                </table>
                            </div>
                        </div>
                    )}


                </div>
            </Card>


            <ActionBar coreCount={selectedCoreCount} invCount={invCount} onRun={run} />

            {toast && (
                <div className="fixed bottom-24 right-5 px-3 py-2 rounded-xl bg-zinc-900 text-white text-sm shadow opacity-95">
                    {toast}
                </div>
            )}

            {showQuick && (
                <QuickAddModal
                    onClose={() => setShowQuick(false)}
                    onConfirm={(drafts: QuickDraft[]) => {
                        setState(st => {
                            const next = { ...st, inventory: { ...st.inventory } };
                            for (const d of drafts) {
                                const g: Gem = {
                                    id: crypto?.randomUUID?.() || Math.random().toString(36).slice(2),
                                    family: d.family,
                                    subType: d.subType,
                                    baseWill: d.base,
                                    options: [
                                        { name: '의지력 효율', lv: d.effLv, fixed: true },
                                        { name: '코어 포인트', lv: d.pts, fixed: true },
                                        ...d.opts.slice(0, 2).map(o => ({ name: o.name, lv: o.lv })),
                                    ],
                                };
                                (next.inventory as any)[g.family] = [...(next.inventory as any)[g.family], g];
                            }
                            return next;
                        });
                        setShowQuick(false);
                        showToast(`젬 ${drafts.length}개 추가`);
                    }}
                />
            )}
        </div>
    );
}





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
    return (
        <>
            {/* 활성화 토글 + 라벨 */}
            <div className="flex items-center gap-3 py-1.5">
                <label className="inline-flex items-center cursor-pointer">
                    <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={core.enabled}
                        onChange={(e) => onToggle(e.target.checked)}
                    />
                    <div className="relative w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
                <span
                    className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${core.family === "order"
                        ? "bg-rose-900/50 text-rose-300 border border-rose-800/50"
                        : "bg-blue-900/50 text-blue-300 border border-blue-800/50"
                        }`}
                >
                    {core.label}
                </span>
            </div>

            {/* 등급 Select (커스텀) */}
            <div>
                <Select
                    value={core.grade}
                    onChange={(v) => onGrade(v as CoreDef["grade"])}
                    options={[
                        { value: "heroic", label: "영웅(9)" },
                        { value: "legend", label: "전설(12)" },
                        { value: "relic", label: "유물(15)" },
                        { value: "ancient", label: "고대(17)" },
                    ]}
                />
            </div>

            {/* 최소 포인트 Input (커스텀) */}
            <div>
                <Input
                    type="number"
                    value={core.minPts}
                    onChange={(e) => onMin(Number(e.target.value || 0))}
                />
            </div>

            {/* 최대 포인트 Input (커스텀) */}
            <div>
                <Input
                    type="number"
                    value={core.maxPts}
                    onChange={(e) => onMax(Number(e.target.value || 0))}
                />
            </div>
        </>
    );
}
