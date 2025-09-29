'use client';

import { baseWillBySubType } from "@/app/lib/arcgrid/optimizer";
import { useEffect, useState } from "react";

const NAME_MAP: Record<string, string> = {
    "보": "보스 피해", "보스피해": "보스 피해", "보스 피해": "보스 피해",
    "추": "추가 피해", "추가피해": "추가 피해", "추가 피해": "추가 피해",
    "공": "공격력", "공격": "공격력", "공격력": "공격력",
    "낙": "낙인력", "낙인": "낙인력", "낙인력": "낙인력",
    "아피": "아군 피해 강화", "아군피해강화": "아군 피해 강화", "아군 피해 강화": "아군 피해 강화",
    "아공": "아군 공격 강화", "아군공격강화": "아군 공격 강화", "아군 공격 강화": "아군 공격 강화",
};
const FAMILY_WORD: Record<string, 'order' | 'chaos'> = {
    order: "order", "질서": "order", chaos: "chaos", "혼돈": "chaos"
};

export interface QuickDraft {
    family: 'order' | 'chaos';
    subType: '안정' | '침식';
    base: number;
    effLv: number;
    need: number;
    pts: number;
    opts: { name: string; lv: number }[];
}

export default function QuickAddModal({
    onClose, onConfirm
}: { onClose: () => void; onConfirm: (drafts: QuickDraft[]) => void }) {
    const [text, setText] = useState("");
    const [familyAll, setFamilyAll] = useState<'order' | 'chaos'>('order');
    const [error, setError] = useState<string | null>(null);
    const [preview, setPreview] = useState<QuickDraft[]>([]);

    const selectBase =
        "w-full bg-[#22272e] border border-[#444c56] rounded-md px-3 pr-10 py-1.5 text-sm text-gray-300 " +
        "appearance-none transition-all duration-150 " +
        "focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 focus:shadow-none " +
        "focus:border-[#444c56]"; // 포커스시 보더 유지(파란 테두리/링 제거)

    function normFamily(tok: string | undefined | null, fallback: 'order' | 'chaos') {
        const t = (tok || "").trim().toLowerCase();
        return (FAMILY_WORD as any)[t] ?? fallback;
    }
    function defaultSubType(fam: 'order' | 'chaos') { return fam === 'order' ? '안정' : '침식'; }

    function parseOptionToken(tok: string) {
        if (!tok) return null;
        const raw = tok.replace(/\s+/g, '');
        const m = raw.match(/^([가-힣a-zA-Z]+)(\d)$/);
        if (!m) return null;
        const nm = NAME_MAP[m[1]];
        const lv = Number(m[2]);
        if (!nm || !(lv >= 1 && lv <= 5)) return null;
        return { name: nm, lv };
    }

    function parseLine(line: string, familyDefault: 'order' | 'chaos'): QuickDraft | null {
        const toks = line.trim().split(/\s+/).filter(Boolean);
        if (!toks.length) return null;
        let i = 0;

        let fam = normFamily(toks[i], familyDefault);
        if ((FAMILY_WORD as any)[toks[i]?.trim()?.toLowerCase()]) i++;

        const need = Number(toks[i++]);
        const pts = Number(toks[i++]);
        if (!(need >= 1 && need <= 9)) throw new Error("의지력 need 1~9");
        if (!(pts >= 1 && pts <= 5)) throw new Error("포인트 1~5");

        const opts: { name: string; lv: number }[] = [];
        while (i < toks.length && opts.length < 2) {
            const o = parseOptionToken(toks[i]);
            if (o) opts.push(o);
            i++;
        }

        const subType = defaultSubType(fam);
        const base = baseWillBySubType(subType);
        let effLv = base - need;
        effLv = Math.max(1, Math.min(5, Number.isFinite(effLv) ? effLv : 1));

        return { family: fam, subType, base, effLv, need, pts, opts };
    }

    function tryParseAll() {
        setError(null);
        const lines = text.split(/\r?\n/);
        const out: QuickDraft[] = [];
        for (const ln of lines) {
            if (!ln.trim()) continue;
            try {
                const d = parseLine(ln, familyAll);
                if (d) out.push(d);
            } catch (e: any) {
                setError(`오류: "${ln.trim()}" → ${e.message}`);
                return;
            }
        }
        setPreview(out);
    }

    useEffect(() => { tryParseAll(); }, [text, familyAll]);

    return (
        <div className="fixed inset-0 z-[1000] bg-black/40 flex items-center justify-center p-4" onDragOver={e => e.preventDefault()}>
            <div className="bg-[#2d333b] border border-[#444c56] rounded-2xl shadow-xl w-full max-w-2xl">
                {/* 헤더 */}
                <div className="flex items-center gap-2 p-4 border-b border-[#444c56]">
                    <b className="text-gray-200">젬 추가</b>
                    <div className="grow" />
                    {/* <button className="text-gray-300 hover:text-white" onClick={onClose}>닫기</button> */}
                </div>

                {/* 컨트롤 라인 */}
                <div className="flex items-center gap-2 px-4 pt-3">
                    <span className="text-sm text-gray-300">계열 기본값</span>

                    {/* ▼ 드롭다운(다크 + 커스텀 화살표) */}
                    <div className="relative w-40">
                        <select
                            className={selectBase}
                            value={familyAll}
                            onChange={e => setFamilyAll(e.target.value as any)}
                        >
                            <option value="order">질서</option>
                            <option value="chaos">혼돈</option>
                        </select>
                        <ArrowIcon />
                    </div>

                    <div className="grow" />
                    <div className="text-xs text-gray-400">
                        형식: <code className="text-gray-300">[계열] 의지력 포인트 [옵션1] [옵션2]</code>
                    </div>
                </div>

                {/* 입력 */}
                <div className="px-4 pt-3">
                    <textarea
                        className="w-full h-40 bg-[#22272e] border border-[#444c56] rounded-md px-3 py-2 text-sm text-gray-300
                       focus:outline-none focus:ring-0 focus:border-[#444c56]"
                        placeholder={`예)\n질서 6 4 보2 공1\n혼돈 5 3 낙2`}
                        value={text}
                        onChange={e => setText(e.target.value)}
                    />
                </div>

                {/* 상태 */}
                <div className="px-4 pb-2">
                    {error ? (
                        <div className="border border-amber-500/40 bg-amber-500/10 rounded-xl p-2 text-amber-200 text-sm">
                            {error}
                        </div>
                    ) : (
                        <div className="border border-dashed border-[#444c56] rounded-xl p-2 text-center text-sm text-gray-400">
                            {preview.length ? `인식된 젬 ${preview.length}개` : "줄마다 ‘계열 의지력 포인트 옵션…’ 형식으로 입력하세요."}
                        </div>
                    )}
                </div>

                {/* 프리뷰 */}
                {preview.length > 0 && (
                    <div className="px-4 pb-2 space-y-2 max-h-64 overflow-auto">
                        {preview.map((d, idx) => {
                            const needDisplay = Math.max(1, d.base - d.effLv);
                            return (
                                <div key={idx} className="flex items-center gap-2 text-sm text-gray-200">
                                    <span className={`px-2 py-0.5 rounded-full border ${d.family === 'order'
                                        ? 'bg-rose-900/40 text-rose-200 border-rose-800/60'
                                        : 'bg-blue-900/40 text-blue-200 border-blue-800/60'}`}>
                                        {d.family === 'order' ? '질서' : '혼돈'}
                                    </span>
                                    <span className="border border-[#444c56] rounded px-2 py-0.5">의지력 {needDisplay}</span>
                                    <span className="border border-[#444c56] rounded px-2 py-0.5">포인트 {d.pts}</span>
                                    <span className="text-xs text-gray-400">(기본 {d.base}, 효율 Lv{d.effLv})</span>
                                    <span className="text-xs text-gray-400">
                                        {d.opts.length ? d.opts.map(o => `${o.name} Lv${o.lv}`).join(" · ") : "옵션 없음"}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* 푸터 */}
                <div className="flex items-center gap-2 p-4 border-t border-[#444c56]">
                    <button className="px-3 py-2 rounded-lg border border-[#444c56] bg-[#2d333b] text-gray-200 hover:bg-[#30363d] transition"
                        onClick={onClose}>
                        취소
                    </button>
                    <div className="grow" />
                    <button
                        className="px-3 py-2 rounded-lg border border-[#444c56] bg-[#2d333b] text-gray-200 hover:bg-[#30363d] transition"
                        disabled={!preview.length || !!error}
                        onClick={() => onConfirm(preview)}
                    >
                        {preview.length ? `젬 ${preview.length}개 추가` : "추가할 항목 없음"}
                    </button>
                </div>
            </div>
        </div>
    );
}

/** select 오른쪽 커스텀 화살표 */
function ArrowIcon() {
    return (
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.71a.75.75 0 1 1 1.06 1.06l-4.24 4.24a.75.75 0 0 1-1.06 0L5.21 8.29a.75.75 0 0 1 .02-1.08z"
                    clipRule="evenodd" />
            </svg>
        </span>
    );
}
