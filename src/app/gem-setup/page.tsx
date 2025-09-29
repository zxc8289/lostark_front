'use client';

import { useEffect, useMemo, useRef, useState } from "react";
import { loadState, makeInitialState, saveState } from "../lib/arcgrid/storage";
import { baseWillBySubType, optimizeAll, optimizeExtremeBySequence } from "../lib/arcgrid/optimizer";
import { Gem } from "@/types/gem";
import { CoreDef } from "../lib/arcgrid/types";
import { ORDER_PERMS } from "../lib/arcgrid/constants";
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

    useEffect(() => { setState(loadState()); }, []);
    useEffect(() => { saveState(state); }, [state]);

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
        const f = e.target.files?.[0];
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

    function run() {
        const cores = state.cores.filter(c => c.enabled);
        if (!cores.length) return showToast("선택된 코어가 없어요");
        if (invCount === 0) return showToast("인벤토리에 젬을 추가해 주세요");

        const constraints = Object.fromEntries(state.cores.map(c => [c.key, { minPts: c.minPts, maxPts: c.maxPts }]));

        if (mode === 'default') {
            const pack = optimizeAll(cores as CoreDef[], state.params, state.inventory, constraints);
            setResultPack({ plan: pack, focusKey: cores[0].key });
        } else {
            const seq = ORDER_PERMS[orderPermIndex];
            const ext = optimizeExtremeBySequence(seq, cores as CoreDef[], state.params, state.inventory, constraints);
            setResultPack(ext);
        }
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

            {/* Step 3 */}
            <Card title="3. 결과 확인">
                <div className="w-full">
                    {!resultPack ? (
                        <div className="border border-dashed border-[#444c56] rounded-lg p-4 text-center text-gray-400">
                            아래 오른쪽의 <b className="text-gray-200">최적화</b> 버튼을 눌러 조합을 계산해 보세요.
                        </div>
                    ) : (
                        <div className="rounded-lg  bg-[#2d333b]">
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
