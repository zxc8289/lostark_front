'use client';

import { useState } from 'react';
import type { Gem } from "@/app/lib/arcgrid/types";
import Field from "./Field";
import { baseWillBySubType, effectiveWillRequired, gemCorePoints, getGemOption } from "@/app/lib/arcgrid/optimizer";
import { FAMILY_LABEL, FLEX_OPTION_POOL, SUB_TYPES } from "@/app/lib/arcgrid/constants";
import QuickAddModal, { QuickDraft } from "@/app/components/arcgrid/QuickAddModal";
import Select from './ui/Select';
import Input from './ui/Input';

export default function InventoryPanel({
    title, family, list, params,
    onUpdate, onUpdateOption, onRemove,
    onQuickAddConfirm,  // ✅ 새 콜백
}: {
    title: string;
    family: 'order' | 'chaos';
    list: Gem[];
    params: any;
    onUpdate: (family: 'order' | 'chaos', id: string, patch: Partial<Gem>) => void;
    onUpdateOption: (family: 'order' | 'chaos', id: string, idx: number, patch: Partial<Gem['options'][number]>) => void;
    onRemove: (family: 'order' | 'chaos', id: string) => void;
    onQuickAddConfirm: (drafts: QuickDraft[]) => void; // ✅ 새 콜백
}) {
    const [showQuick, setShowQuick] = useState(false);

    return (
        <div>
            <div className="flex items-center justify-between mb-2">
                <div className="font-bold">{title}</div>
                <button
                    className="px-3 py-1.5 rounded-lg border border-[#444c56] bg-[#2d333b] text-gray-200 hover:bg-[#30363d] transition"
                    onClick={() => setShowQuick(true)}   // ✅ 내부에서 모달 열기
                >
                    젬추가
                </button>
            </div>

            {list.length === 0 && (
                <div className="border border-dashed border-[#444c56] rounded-lg p-3 text-center text-gray-400">
                    아직 젬이 없습니다
                </div>
            )}

            <div className="flex flex-col gap-3 mt-2">
                {list.map(g => (
                    <GemCard
                        key={g.id}
                        gem={g}
                        family={family}
                        params={params}
                        onUpdate={onUpdate}
                        onUpdateOption={onUpdateOption}
                        onRemove={onRemove}
                    />
                ))}
            </div>

            {/* ✅ 패널 내부 모달 */}
            {showQuick && (
                <QuickAddModal
                    onClose={() => setShowQuick(false)}
                    onConfirm={(drafts) => { onQuickAddConfirm(drafts); setShowQuick(false); }}
                />
            )}
        </div>
    );
}


function GemCard({
    gem, family, params, onUpdate, onUpdateOption, onRemove
}: {
    gem: Gem;
    family: 'order' | 'chaos';
    params: any;
    onUpdate: (family: 'order' | 'chaos', id: string, patch: Partial<Gem>) => void;
    onUpdateOption: (family: 'order' | 'chaos', id: string, idx: number, patch: Partial<Gem['options'][number]>) => void;
    onRemove: (family: 'order' | 'chaos', id: string) => void;
}) {
    const [isEdit, setIsEdit] = useState(false);

    const need = effectiveWillRequired(gem, params);
    const pts = gemCorePoints(gem);

    const effLv = getGemOption(gem, '의지력 효율')?.lv ?? 1;
    const ptsLv = getGemOption(gem, '코어 포인트')?.lv ?? 1;
    const opt1 = gem.options[2];
    const opt2 = gem.options[3];

    return (
        <div className="border border-[#444c56] rounded-lg p-3 bg-[#2d333b]">
            {/* 헤더 */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${family === 'order' ? 'bg-rose-500' : 'bg-blue-500'}`} />
                    <div className="font-semibold text-gray-200">
                        {FAMILY_LABEL[family]} 젬
                    </div>
                    <span className="text-xs text-gray-300 border border-[#444c56] rounded px-2 py-0.5">
                        의지력 {need}
                    </span>
                    <span className="text-xs text-gray-300 border border-[#444c56] rounded px-2 py-0.5">
                        포인트 {pts}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    {!isEdit ? (
                        <button
                            className="text-xs px-2 py-1 rounded border border-[#444c56] bg-[#1f242c] text-gray-200 hover:bg-[#262c35] transition"
                            onClick={() => setIsEdit(true)}
                            title="수정"
                        >
                            수정
                        </button>
                    ) : (
                        <button
                            className="text-xs px-2 py-1 rounded border border-[#3a5e2a] bg-[#22301f] text-green-200 hover:bg-[#2a3c23] transition"
                            onClick={() => setIsEdit(false)}
                            title="완료"
                        >
                            완료
                        </button>
                    )}

                    <button
                        className="text-xs px-2 py-1 rounded border border-[#8b2e2e] bg-[#3a2626] text-red-200 hover:bg-[#472b2b] transition"
                        onClick={() => onRemove(family, gem.id)}
                    >
                        삭제
                    </button>
                </div>
            </div>

            {/* 본문 */}
            {!isEdit ? (
                /* ==== 보기 전용 레이아웃 ==== */
                <div className="space-y-2">
                    {/* 1줄 요약 */}
                    <div className="text-sm text-gray-200">
                        <span className="inline-flex items-center gap-2">
                            <Badge>{(opt1?.name ?? FLEX_OPTION_POOL[0])} · Lv{opt1?.lv ?? 1}</Badge>
                            <Badge>{(opt2?.name ?? FLEX_OPTION_POOL[0])} · Lv{opt2?.lv ?? 1}</Badge>
                        </span>
                    </div>

                </div>
            ) : (
                <div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Field label="효율">
                            <Select
                                value={effLv}
                                onChange={(v) => onUpdateOption(family, gem.id, 0, { lv: Number(v) })}
                                options={[1, 2, 3, 4, 5].map(lv => ({ value: lv, label: `${lv}Lv` }))}
                            />
                        </Field>

                        <Field label="코어 포인트">
                            <Select
                                value={ptsLv}
                                onChange={(v) => onUpdateOption(family, gem.id, 1, { lv: Number(v) })}
                                options={[1, 2, 3, 4, 5].map(lv => ({ value: lv, label: `${lv}Lv` }))}
                            />
                        </Field>

                        <Field label="세부타입">
                            <Select
                                value={gem.subType}
                                onChange={(v) =>
                                    onUpdate(family, gem.id, { subType: v as any, baseWill: baseWillBySubType(String(v)) })
                                }
                                options={SUB_TYPES.map(st => ({ value: st, label: st }))}
                            />
                        </Field>

                        <Field label="기본 의지력">
                            <Input
                                type="number"
                                value={gem.baseWill}
                                onChange={(e) => onUpdate(family, gem.id, { baseWill: Number(e.target.value || 0) })}
                            />
                        </Field>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                        <Field label="옵션1">
                            <div className="flex gap-2">
                                <Select
                                    className="flex-1"
                                    value={opt1?.name ?? FLEX_OPTION_POOL[0]}
                                    onChange={(v) => onUpdateOption(family, gem.id, 2, { name: String(v) })}
                                    options={FLEX_OPTION_POOL.map(n => ({ value: n, label: n }))}
                                />
                                <Select
                                    className="w-28"
                                    value={opt1?.lv ?? 1}
                                    onChange={(v) => onUpdateOption(family, gem.id, 2, { lv: Number(v) })}
                                    options={[1, 2, 3, 4, 5].map(lv => ({ value: lv, label: `Lv${lv}` }))}
                                />
                            </div>
                        </Field>

                        <Field label="옵션2">
                            <div className="flex gap-2">
                                <Select
                                    className="flex-1"
                                    value={opt2?.name ?? FLEX_OPTION_POOL[0]}
                                    onChange={(v) => onUpdateOption(family, gem.id, 3, { name: String(v) })}
                                    options={FLEX_OPTION_POOL.map(n => ({ value: n, label: n }))}
                                />
                                <Select
                                    className="w-28"
                                    value={opt2?.lv ?? 1}
                                    onChange={(v) => onUpdateOption(family, gem.id, 3, { lv: Number(v) })}
                                    options={[1, 2, 3, 4, 5].map(lv => ({ value: lv, label: `Lv${lv}` }))}
                                />
                            </div>
                        </Field>
                    </div>
                </div>
            )}
        </div>
    );
}

/* 작은 뱃지/태그 컴포넌트들 */
function Badge({ children }: { children: React.ReactNode }) {
    return (
        <span className="inline-flex items-center px-2 py-0.5 rounded bg-black/20 border border-white/10 text-gray-200 text-xs">
            {children}
        </span>
    );
}
function Tag({ children }: { children: React.ReactNode }) {
    return (
        <span className="inline-flex items-center px-2 py-0.5 rounded bg-[#1f242c] border border-[#444c56] text-gray-200 text-xs">
            {children}
        </span>
    );
}
function Dot() {
    return <span className="mx-1 text-gray-500">·</span>;
}
