'use client';

import { useState } from 'react';
import { Gem } from "@/types/gem";
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
    const need = effectiveWillRequired(gem, params);
    const pts = gemCorePoints(gem);

    const selectBase =
        "w-full bg-transparent px-3 pr-10 py-1.5 text-sm text-gray-300" +
        "outline - none focus: outline - none focus - visible: outline - none" +
        "ring - 0 focus: ring - 0 focus - visible: ring - 0" +
        "border - 0 focus: border - 0 appearance - none"


    return (
        <div className="border border-[#444c56] rounded-lg p-3 bg-[#2d333b]">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <div
                        className={`w-2.5 h-2.5 rounded-full ${family === 'order' ? 'bg-rose-500' : 'bg-blue-500'
                            }`}
                    />
                    <div className="font-semibold text-gray-200">{FAMILY_LABEL[family]} 젬</div>
                    <span className="text-xs text-gray-300 border border-[#444c56] rounded px-2 py-0.5">
                        의지력 {need}
                    </span>
                    <span className="text-xs text-gray-300 border border-[#444c56] rounded px-2 py-0.5">
                        포인트 {pts}
                    </span>
                </div>
                <button
                    className="text-xs px-2 py-1 rounded border border-[#8b2e2e] bg-[#3a2626] text-red-200 hover:bg-[#472b2b] transition"
                    onClick={() => onRemove(family, gem.id)}
                >
                    삭제
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* 효율 */}
                <Field label="효율">
                    <Select
                        value={getGemOption(gem, '의지력 효율')?.lv || 1}
                        onChange={(v) => onUpdateOption(family, gem.id, 0, { lv: Number(v) })}
                        options={[1, 2, 3, 4, 5].map(lv => ({ value: lv, label: `${lv}Lv` }))}
                    />
                </Field>

                {/* 코어 포인트 */}
                <Field label="코어 포인트">
                    <Select
                        value={getGemOption(gem, '코어 포인트')?.lv || 1}
                        onChange={(v) => onUpdateOption(family, gem.id, 1, { lv: Number(v) })}
                        options={[1, 2, 3, 4, 5].map(lv => ({ value: lv, label: `${lv}Lv` }))}
                    />
                </Field>

                {/* 세부타입 */}
                <Field label="세부타입">
                    <Select
                        value={gem.subType}
                        onChange={(v) => onUpdate(family, gem.id, { subType: v as any, baseWill: baseWillBySubType(String(v)) })}
                        options={SUB_TYPES.map(st => ({ value: st, label: st }))}
                    />
                </Field>

                {/* 기본 의지력 */}
                <Field label="기본 의지력">
                    <Input
                        type="number"
                        value={gem.baseWill}
                        onChange={(e) =>
                            onUpdate(family, gem.id, { baseWill: Number(e.target.value || 0) })
                        }
                    />
                </Field>
            </div>

            {/* 전투 옵션 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                {/* 옵션1 */}
                <Field label="옵션1">
                    <div className="flex gap-2">
                        {/* 이름 */}
                        <Select
                            className="flex-1"
                            value={gem.options[2]?.name ?? FLEX_OPTION_POOL[0]}
                            onChange={(v) => onUpdateOption(family, gem.id, 2, { name: String(v) })}
                            options={FLEX_OPTION_POOL.map(n => ({ value: n, label: n }))}
                        />
                        {/* 레벨 */}
                        <Select
                            className="w-28"
                            value={gem.options[2]?.lv ?? 1}
                            onChange={(v) => onUpdateOption(family, gem.id, 2, { lv: Number(v) })}
                            options={[1, 2, 3, 4, 5].map(lv => ({ value: lv, label: `Lv${lv}` }))}
                        />
                    </div>
                </Field>

                {/* 옵션2 */}
                <Field label="옵션2">
                    <div className="flex gap-2">
                        {/* 이름 */}
                        <Select
                            className="flex-1"
                            value={gem.options[3]?.name ?? FLEX_OPTION_POOL[0]}
                            onChange={(v) => onUpdateOption(family, gem.id, 3, { name: String(v) })}
                            options={FLEX_OPTION_POOL.map(n => ({ value: n, label: n }))}
                        />
                        {/* 레벨 */}
                        <Select
                            className="w-28"
                            value={gem.options[3]?.lv ?? 1}
                            onChange={(v) => onUpdateOption(family, gem.id, 3, { lv: Number(v) })}
                            options={[1, 2, 3, 4, 5].map(lv => ({ value: lv, label: `Lv${lv}` }))}
                        />
                    </div>
                </Field>
            </div>

        </div>
    );
}

/** 공통 커스텀 화살표 아이콘 (select 오른쪽) */
function ArrowIcon() {
    return (
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.71a.75.75 0 1 1 1.06 1.06l-4.24 4.24a.75.75 0 0 1-1.06 0L5.21 8.29a.75.75 0 0 1 .02-1.08z"
                    clipRule="evenodd"
                />
            </svg>
        </span>
    );
}
