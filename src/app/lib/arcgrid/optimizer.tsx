import { CORE_WILL_BY_GRADE, DPS_WEIGHTS, GRADE_THRESHOLDS } from "./constants";
import type { CoreDef, Gem, OptimizeItem, Params, PlanPack } from "./types";

export function baseWillBySubType(subType: string) {
    if (subType === "안정" || subType === "침식") return 8;
    if (subType === "견고" || subType === "왜곡") return 9;
    return 10;
}
export function getGemOption(g: Gem, name: string) {
    return (g.options || []).find(o => o?.name === name);
}
export function effectiveWillRequired(g: Gem, params: Params) {
    const eff = getGemOption(g, "의지력 효율");
    const reduce = eff ? params.efficiencyReductionByPoint[eff.lv] || 0 : 0;
    const base = g.baseWill ?? baseWillBySubType(g.subType);
    return Math.max(1, base - reduce);
}
export function gemCorePoints(g: Gem) {
    const cp = getGemOption(g, "코어 포인트");
    return Math.max(0, Math.floor(cp?.lv || 0));
}
export function thresholdScore(pts: number, grade: keyof typeof GRADE_THRESHOLDS) {
    const T = GRADE_THRESHOLDS[grade] || [];
    let s = 0;
    for (const t of T) if (pts >= t) s = t;
    return s;
}

export function computeActivation(core: Pick<CoreDef, 'family' | 'grade'>, gems: (Gem | null)[], params: Params) {
    const available = CORE_WILL_BY_GRADE[core.grade] || 0;
    let remain = available;
    const activated = [false, false, false, false];

    for (let i = 0; i < 4; i++) {
        const g = gems[i];
        if (!g) break;
        if (g.family !== core.family) break;
        const need = effectiveWillRequired(g, params);
        if (remain >= need) { remain -= need; activated[i] = true; } else break;
    }

    let pts = 0;
    const flex: Record<string, number> = { "보스 피해": 0, "추가 피해": 0, "공격력": 0 };

    activated.forEach((on, i) => {
        if (!on) return;
        const g = gems[i]!;
        pts += gemCorePoints(g);
        for (const o of g.options || []) {
            const key = (o?.name || "").trim();
            const lv = Number(o?.lv ?? 0) || 0;
            if (key in flex) flex[key] += lv;
        }
    });

    const flexScore =
        flex["보스 피해"] * DPS_WEIGHTS["보스 피해"] +
        flex["추가 피해"] * DPS_WEIGHTS["추가 피해"] +
        flex["공격력"] * DPS_WEIGHTS["공격력"];

    return { activated, spent: available - remain, remain, pts, flex, flexScore };
}

const optLv = (g: Gem, key: string) =>
    (g.options || []).find(o => o && o.name === key)?.lv || 0;

function nextThreshold(grade: keyof typeof GRADE_THRESHOLDS, t: number) {
    const T = GRADE_THRESHOLDS[grade] || [];
    for (const x of T) if (x > t) return x;
    return null;
}

function maxAdditionalPts(remainingWill: number, pool: Gem[], params: Params, usedIds: Set<string>, chosen: Gem[]) {
    const taken = new Set(chosen.map(g => g?.id).filter(Boolean) as string[]);
    const items = pool
        .filter(g => !usedIds.has(g.id) && !taken.has(g.id))
        .map(g => ({ need: effectiveWillRequired(g, params), pts: gemCorePoints(g) }))
        .sort((a, b) => (a.need - b.need) || (b.pts - a.pts));
    let w = remainingWill, add = 0;
    for (const it of items) {
        if (w < it.need) continue;
        w -= it.need; add += it.pts;
    }
    return add;
}

export function optimizeForCore(
    core: CoreDef,
    params: Params,
    pool: Gem[],
    usedIds: Set<string>,
    minPts = 10,
    maxPts = 20
): OptimizeItem {
    const avail = CORE_WILL_BY_GRADE[core.grade] || 0;

    const candidates = pool
        .filter(g => g.family === core.family && !usedIds.has(g.id))
        .map(g => {
            const dpsLv = optLv(g, "보스 피해") + optLv(g, "추가 피해") + optLv(g, "공격력");
            const rank = (gemCorePoints(g) + 0.05 * dpsLv) / Math.max(1, effectiveWillRequired(g, params));
            return { g, rank };
        })
        .sort((a, b) => b.rank - a.rank)
        .map(x => x.g);

    let bestInRange: OptimizeItem | undefined;
    let bestAny: OptimizeItem | undefined;

    const better = (A: OptimizeItem | null, B: OptimizeItem) => {
        if (!A) return true;
        const tA = A.t ?? thresholdScore(A.res?.pts ?? 0, core.grade);
        const tB = B.t ?? thresholdScore(B.res?.pts ?? 0, core.grade);
        if (tB !== tA) return tB > tA;

        const cA = !!A.canReachNext, cB = !!B.canReachNext;
        if (cA !== cB) return cB;

        const sA = A.res?.flexScore ?? 0, sB = B.res?.flexScore ?? 0;
        if (sB !== sA) return sB > sA;

        const rA = A.res?.remain ?? 0, rB = B.res?.remain ?? 0;
        if (rB !== rA) return rB > rA;

        const pA = A.res?.pts ?? 0, pB = B.res?.pts ?? 0;
        if (pB !== pA) return pB > pA;
        return false;
    };

    function evalChosen(chosen: Gem[], remaining: number) {
        const arr: (Gem | null)[] = [null, null, null, null];
        for (let i = 0; i < chosen.length; i++) arr[i] = chosen[i];
        const res = computeActivation(core, arr, params);
        const t = thresholdScore(res.pts, core.grade);
        const nxt = nextThreshold(core.grade, t);
        const upper = nxt ? (res.pts + maxAdditionalPts(remaining, pool, params, usedIds, chosen)) : res.pts;
        const canReachNext = !!(nxt && upper >= nxt);

        const ids = arr.map((x, i) => (res.activated[i] && x ? x.id : null));
        const cand: OptimizeItem = { ids, res, t, canReachNext };

        if (better(bestAny ?? null, cand)) bestAny = cand;
        if (res.pts >= minPts && res.pts <= maxPts) {
            if (better(bestInRange ?? null, cand)) bestInRange = cand;
        }
    }

    function dfs(chosen: Gem[], remaining: number) {
        evalChosen(chosen, remaining);
        if (chosen.length === 4) return;
        for (const g of candidates) {
            if (usedIds.has(g.id)) continue;
            if (chosen.includes(g)) continue;
            const need = effectiveWillRequired(g, params);
            if (remaining < need) continue;
            chosen.push(g);
            dfs(chosen, remaining - need);
            chosen.pop();
        }
    }

    dfs([], avail);

    if (bestInRange) {
        return { ...bestInRange, reason: null };
    }
    if (bestAny) {
        const r = bestAny.res!;
        const reason =
            r.pts < minPts
                ? `포인트 미달 (${r.pts}/${minPts}, ${minPts - r.pts}p 부족)`
                : r.pts > maxPts
                    ? `포인트 초과 (${r.pts}/${maxPts})`
                    : null;
        return { ...bestAny, reason };
    }
    return { ids: [null, null, null, null], res: null, reason: "조합 없음" };
}

export function optimizeAll(
    cores: CoreDef[],
    params: Params,
    inventory: { order: Gem[]; chaos: Gem[] },
    constraints: Record<string, { minPts: number; maxPts: number }>,
    usedArg?: Set<string>
): PlanPack {
    const used = usedArg ?? new Set<string>();
    const answer: Record<string, OptimizeItem> = {};
    for (const c of cores) {
        const pool = [...(inventory[c.family] || [])];
        const { minPts = 10, maxPts = 20 } = constraints[c.key] || {};
        const best = optimizeForCore(c, params, pool, used, minPts, maxPts);
        answer[c.key] = best;
        best.ids.forEach(id => id && used.add(id));
    }
    return { used: Array.from(used), answer };
}

export function optimizeExtremeBySequence(
    seqKeys: string[],
    cores: CoreDef[],
    params: Params,
    inventory: { order: Gem[]; chaos: Gem[] },
    userConstraints: Record<string, { minPts: number; maxPts: number }>
) {
    const byKey = new Map(cores.map(c => [c.key, c]));
    const seq = seqKeys.map(k => byKey.get(k)).filter(Boolean) as CoreDef[];
    if (seq.length === 0) return null;

    const used = new Set<string>();
    const answer: Record<string, OptimizeItem> = {};

    const focus = seq[0];
    const thresholds = (GRADE_THRESHOLDS[focus.grade] || []).slice().sort((a, b) => b - a);
    let focusBest: null | { answer: Record<string, OptimizeItem>; used: Set<string>; item: OptimizeItem } = null;

    for (const t of thresholds) {
        const over: Record<string, { minPts: number; maxPts: number }> = {};
        for (const c of cores) {
            const base = userConstraints[c.key] || { minPts: 10, maxPts: 20 };
            over[c.key] = { ...base };
        }
        over[focus.key].minPts = Math.max(over[focus.key].minPts || 0, t);

        const a1 = optimizeAll([focus], params, inventory, over);
        const item = a1.answer[focus.key];
        const achieved = item?.t || 0;
        if (!focusBest || (achieved > (focusBest.item?.t || 0))) {
            focusBest = { answer: a1.answer, used: new Set(a1.used), item };
        }
        if (achieved >= t) break;
    }
    if (focusBest) {
        answer[focus.key] = focusBest.item;
        focusBest.used.forEach(id => used.add(id));
    }

    const rest = seq.slice(1);
    const over2: Record<string, { minPts: number; maxPts: number }> = {};
    for (const c of cores) over2[c.key] = userConstraints[c.key] || { minPts: 10, maxPts: 20 };
    for (const c of rest) {
        const a2 = optimizeAll([c], params, inventory, over2, used);
        answer[c.key] = a2.answer[c.key];
        a2.used.forEach(id => used.add(id));
    }

    const others = cores.filter(c => !seqKeys.includes(c.key));
    if (others.length) {
        const over3: Record<string, { minPts: number; maxPts: number }> = {};
        for (const c of cores) over3[c.key] = userConstraints[c.key] || { minPts: 10, maxPts: 20 };
        for (const c of others) {
            const a3 = optimizeAll([c], params, inventory, over3, used);
            answer[c.key] = a3.answer[c.key];
            a3.used.forEach(id => used.add(id));
        }
    }

    return { plan: { answer, used: Array.from(used) }, focusKey: focus.key };
}