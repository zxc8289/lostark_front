'use client';

import { CoreDef, PlanPack } from "@/app/lib/arcgrid/types";
import Stat from "./Stat";
import type { Gem } from "@/app/lib/arcgrid/types";
import { CORE_WILL_BY_GRADE, ORDER_PERMS, STAT_ALIAS } from "@/app/lib/arcgrid/constants";
import { effectiveWillRequired, gemCorePoints } from "@/app/lib/arcgrid/optimizer";

export default function ResultsPanel({
    plan, cores, gemById, orderPermIndex, onChangeOrderPerm
}: {
    plan: PlanPack;
    cores: CoreDef[];
    gemById: Map<string, Gem>;
    orderPermIndex?: number;
    onChangeOrderPerm?: (idx: number) => void;
}) {
    const enabled = cores.filter(c => c.enabled);

    // 공통 셀렉트 스타일 (다크 + 포커스 효과 제거)
    const selectBase =
        "w-full bg-[#22272e] border border-[#444c56] rounded-md px-3 pr-10 py-1.5 text-sm text-gray-300 " +
        "appearance-none transition-all duration-150 " +
        "focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 focus:shadow-none " +
        "focus:border-[#444c56]";

    return (
        <>
            {/* 상단 툴바 (1번 카드와 동일 톤) */}
            {typeof orderPermIndex === "number" && onChangeOrderPerm && (
                <div className="flex items-center justify-between mb-2">
                    <div className="text-[14px] text-gray-400">최적 조합</div>

                    <div className="flex items-center gap-2">
                        <div className="relative w-[320px] max-w-[80vw]">
                            <select
                                className={selectBase}
                                value={orderPermIndex}
                                onChange={e => onChangeOrderPerm(Number(e.target.value))}
                            >
                                {ORDER_PERMS.map((perm, idx) => (
                                    <option key={idx} value={idx}>
                                        {perm.map(k => cores.find(c => c.key === k)?.label).filter(Boolean).join(" > ")}
                                    </option>
                                ))}
                            </select>
                            <ArrowIcon />
                        </div>
                    </div>
                </div>
            )}

            {/* 결과 리스트 컨테이너 (1번 카드 느낌으로 보더 박스) */}
            <div className="grid grid-cols-1 gap-3">
                {enabled.map(c => {
                    const item = plan.answer[c.key];
                    const ids = (item?.ids || []).filter(Boolean) as string[];

                    return (
                        <div key={c.key} className="border border-[#444c56] rounded-lg p-3 bg-[#2d333b]">
                            {/* 헤더 라인 */}
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <span
                                        className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${c.family === "order"
                                            ? "bg-rose-900/50 text-rose-300 border border-rose-800/50"
                                            : "bg-blue-900/50 text-blue-300 border border-blue-800/50"
                                            }`}
                                    >
                                        {c.label}
                                    </span>
                                    <span className="text-[12px] text-gray-400">
                                        의지력 {CORE_WILL_BY_GRADE[c.grade]} · 포인트 {c.minPts}~{c.maxPts}
                                    </span>
                                </div>
                            </div>

                            {/* 채택 젬 태그들 */}
                            <div className="flex flex-wrap gap-2 mb-2">
                                {ids.length ? (
                                    ids.map((id, i) => {
                                        const g = gemById.get(id);
                                        if (!g) return null;
                                        const need = effectiveWillRequired(
                                            g,
                                            { efficiencyReductionByPoint: { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5 } } as any
                                        );
                                        const pts = gemCorePoints(g);
                                        const statText = formatDpsStats(g);
                                        return (
                                            <span
                                                key={id}
                                                className="inline-flex items-center rounded-full px-2.5 py-1 text-xs border border-[#444c56] bg-[#22272e] text-gray-300"
                                            >
                                                {`(${need},${pts})`}
                                                {statText && <span className="mx-1 opacity-60">·</span>}
                                                {statText}
                                                <small className="ml-1 opacity-60">#{i + 1}</small>
                                            </span>
                                        );
                                    })
                                ) : (
                                    <span className="text-sm text-gray-400">선정된 젬 없음</span>
                                )}

                                {item?.reason && (
                                    <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs border border-amber-500/50 bg-amber-900/20 text-amber-300">
                                        {item.reason}
                                    </span>
                                )}
                            </div>

                            {/* 지표 카드 */}
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                                <Stat title="코어 포인트 합" value={item?.res?.pts ?? "-"} />
                                <Stat title="달성 임계치" value={item?.t ?? "-"} />
                                <Stat title="의지력 잔여" value={item?.res ? item.res.remain : "-"} />
                                <Stat title="활성 슬롯" value={item?.res?.activated?.filter(Boolean).length ?? "-"} />
                                <Stat title="스탯 점수(딜러)" value={item?.res ? Number(item.res.flexScore).toFixed(2) : "-"} />
                            </div>

                            {/* 플렉스 세부 수치 */}
                            {item?.res && (
                                <div className="text-[12px] text-gray-400 mt-2">
                                    보스:{item.res.flex?.["보스 피해"] ?? 0} / 추가:{item.res.flex?.["추가 피해"] ?? 0} / 공:
                                    {item.res.flex?.["공격력"] ?? 0}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </>
    );
}

function formatDpsStats(gem: Gem) {
    const o2 = gem.options?.[2];
    const o3 = gem.options?.[3];
    const show = (o?: { name: string; lv: number }) => {
        if (!o?.name) return null;
        const key = (o.name || "").trim();
        const lv = Number(o.lv ?? 1) || 1;
        return `${STAT_ALIAS[key] ?? key}${lv}`;
    };
    return [show(o2), show(o3)].filter(Boolean).join(" ");
}

/** 공통 커스텀 화살표 (다크 드롭다운용) */
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
