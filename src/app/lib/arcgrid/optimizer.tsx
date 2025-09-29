import { CORE_WILL_BY_GRADE, DPS_WEIGHTS, GRADE_THRESHOLDS } from "./constants";
import type { CoreDef, Gem, OptimizeItem, Params, PlanPack } from "./types";
import { DEALER_WEIGHT_BY_LV, SUPPORT_WEIGHT_BY_LV, ROLE_KEYS } from "./constants";

function weightForOption(name: string, lv: number, role: "dealer" | "supporter"): number {
  const L = Math.max(0, Math.min(5, Math.floor(lv || 0)));
  if (L <= 0) return 0;
  const table =
    role === "supporter" ? SUPPORT_WEIGHT_BY_LV : DEALER_WEIGHT_BY_LV;
  const arr = table[name];
  return arr ? (arr[L] || 0) : 0;
}


const NAME_ALIASES: Record<string, string> = {
  "보": "보스 피해", "보피": "보스 피해", "보스피해": "보스 피해",
  "추": "추가 피해", "아피": "추가 피해",
  "공": "공격력", "아공": "공격력",

  // 서포터 약어
  "낙": "낙인력", "낙인": "낙인력",
  "아피강": "아군 피해 강화", "피강": "아군 피해 강화",
  "아공강": "아군 공격 강화", "공강": "아군 공격 강화",
};

const norm = (name?: string) => NAME_ALIASES[(name||"").trim()] ?? (name||"").trim();

export function baseWillBySubType(subType: string | number) {
  const s = String(subType).trim();
  if (s === "안정" || s === "침식" || s === "4") return 8;
  if (s === "견고" || s === "왜곡" || s === "5") return 9;
  if (s === "6") return 10;
  return 10;
}

export function getGemOption(g: Gem, name: string) {
    return (g.options || []).find(o => o?.name === name);
}

export function effectiveWillRequired(g: Gem, params: Params) {
  const eff = getGemOption(g, "의지력 효율");
  const reduce = eff ? params.efficiencyReductionByPoint[eff.lv] || 0 : 0;

  const auto = baseWillBySubType(g.subType);
  const custom =
    typeof (g as any).baseWill === "number" && !Number.isNaN((g as any).baseWill)
      ? (g as any).baseWill
      : null;

  const base = custom ?? auto;
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

export function computeActivation(core: Pick<CoreDef,'family'|'grade'>, gems:(Gem|null)[], params: Params) {
    const role = params.role === "supporter" ? "supporter" : "dealer";
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
    let flexScore = 0; // ⬅️ 누적 점수

    activated.forEach((on, i) => {
        if (!on) return;
        const g = gems[i]!;
        pts += gemCorePoints(g);

        for (const o of g.options || []) {
        const key = norm(o?.name);
        const lv  = Number(o?.lv ?? 0) || 0;

        // (A) UI용 카운트(딜러 3종만 유지)
        if (key in flex) flex[key] += lv;

        // (B) 역할 가중치 적용 (서포터/딜러 모두)
        flexScore += weightForOption(key, lv, role);
        }
    });

  return { activated, spent: available - remain, remain, pts, flex, flexScore };
}

const ROLE_MAIN_KEYS = {
  dealer: ["보스 피해", "추가 피해", "공격력"],
  supporter: ["낙인력", "아군 피해 강화", "아군 공격 강화"],
} as const;

const optLv = (g: Gem, key: string) =>
  (g.options || []).find(o => o && norm(o.name) === key)?.lv || 0;

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


// 사전 정렬된 추가 포인트 상한 계산을 재사용 (원래 maxAdditionalPts와 같은 정렬 기준)
type PreLite = { id: string; need: number; pts: number };

function buildPreLite(
  pool: Gem[],
  params: Params,
  usedIds: Set<string>,
  needOf: (g: Gem) => number,
  ptsOf: (g: Gem) => number,
  family: CoreDef["family"]
): PreLite[] {
  const items: PreLite[] = [];
  for (const g of pool) {
    if (g.family !== family) continue;
    if (usedIds.has(g.id)) continue;
    const need = needOf(g);
    const pts = ptsOf(g);
    items.push({ id: g.id, need, pts });
  }
  // 원래 함수와 동일: need 오름차순, need 같으면 pts 내림차순
  items.sort((a, b) => (a.need - b.need) || (b.pts - a.pts));
  return items;
}

function maxAdditionalPtsCached(
  remainingWill: number,
  preLite: PreLite[],
  usedIds: Set<string>,
  taken: Set<string>
): number {
  let w = remainingWill, add = 0;
  for (const it of preLite) {
    if (usedIds.has(it.id) || taken.has(it.id)) continue;
    if (w < it.need) continue;
    w -= it.need;
    add += it.pts;
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
  const role = params.role === "supporter" ? "supporter" : "dealer";
  // ── (1) 캐시 준비: need/pts/dpsLv
  const needById = new Map<string, number>();
  const ptsById  = new Map<string, number>();
  const dpsById  = new Map<string, number>();

  const needOf = (g: Gem) => {
    let v = needById.get(g.id);
    if (v === undefined) {
      v = effectiveWillRequired(g, params);
      needById.set(g.id, v);
    }
    return v;
  };
  const ptsOf = (g: Gem) => {
    let v = ptsById.get(g.id);
    if (v === undefined) {
      v = gemCorePoints(g);
      ptsById.set(g.id, v);
    }
    return v;
  };
  const dpsLvOf = (g: Gem) => {
    let v = dpsById.get(g.id);
    if (v === undefined) {
      v = (optLv(g, "보스 피해") + optLv(g, "추가 피해") + optLv(g, "공격력")) | 0;
      dpsById.set(g.id, v);
    }
    return v;
  };

    const candidates = pool
    .filter(g => g.family === core.family && !usedIds.has(g.id))
    .map(g => {
        const keys = ROLE_MAIN_KEYS[role];
        const dpsLv =
        (optLv(g, keys[0]) | 0) + (optLv(g, keys[1]) | 0) + (optLv(g, keys[2]) | 0);
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

  // ── (3) maxAdditionalPts용 사전 정렬 리스트 1회 생성(원래 정렬 그대로)
  const preLite = buildPreLite(pool, params, usedIds, needOf, ptsOf, core.family);

  function evalChosen(chosen: Gem[], remaining: number) {
    const arr: (Gem | null)[] = [null, null, null, null];
    for (let i = 0; i < chosen.length; i++) arr[i] = chosen[i];

    const res = computeActivation(core, arr, params);
    const t = thresholdScore(res.pts, core.grade);
    const nxt = nextThreshold(core.grade, t);

    // taken 집합을 Set으로 빠르게
    const taken = new Set<string>(chosen.map(g => g.id));

    // ⬇ 원래 함수와 동일한 상한 계산 (정렬/필터 재사용)
    const upper = nxt ? (res.pts + maxAdditionalPtsCached(remaining, preLite, usedIds, taken)) : res.pts;
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
    if (remaining <= 0) return;

    // 후보 순회 (원래 로직 그대로)
    const chosenIds = new Set<string>(chosen.map(g => g.id));
    for (const g of candidates) {
      if (usedIds.has(g.id)) continue;
      if (chosenIds.has(g.id)) continue;

      const need = needOf(g);               // 캐시 사용
      if (remaining < need) continue;

      chosen.push(g);
      dfs(chosen, remaining - need);
      chosen.pop();
    }
  }

  dfs([], avail);

  if (bestInRange) return { ...bestInRange, reason: null };
  if (bestAny) {
    const r = bestAny.res!;
    const reason =
      r.pts < minPts ? `포인트 미달 (${r.pts}/${minPts}, ${minPts - r.pts}p 부족)` :
      r.pts > maxPts ? `포인트 초과 (${r.pts}/${maxPts})` : null;
    return { ...bestAny, reason };
  }
  return { ids: [null, null, null, null], res: null, reason: "조합 없음" };
}


// 1) 전역 스코어러: (1) 제약 충족 우선 → (2) 임계치 합 → (3) 딜 점수 → (4) 잔여 의지력
function planScore(
  plan: PlanPack["answer"],
  cores: CoreDef[],
  constraints: Record<string, { minPts: number; maxPts: number }>
) {
  let meetsAll = true;
  let sumT = 0;
  let sumFlex = 0;
  let sumRemain = 0;

  for (const c of cores) {
    const it = plan[c.key];
    const t = it.t ?? 0;
    const pts = it.res?.pts ?? 0;
    const cons = constraints[c.key] || { minPts: 0, maxPts: 999 };

    // 모든 코어가 자신의 minPts를 만족하는지
    if (pts < cons.minPts || pts > cons.maxPts) meetsAll = false;

    sumT += t;
    sumFlex += it.res?.flexScore ?? 0;
    sumRemain += it.res?.remain ?? 0;
  }
  return { meetsAll, sumT, sumFlex, sumRemain };
}

function betterPlan(
  A: { plan: PlanPack["answer"]; used: string[] } | null,
  B: { plan: PlanPack["answer"]; used: string[] },
  cores: CoreDef[],
  constraints: Record<string, { minPts: number; maxPts: number }>
) {
  if (!A) return true;
  const sa = planScore(A.plan, cores, constraints);
  const sb = planScore(B.plan, cores, constraints);

  // 1) 전 코어 minPts 충족 계획을 무조건 우선
  if (sa.meetsAll !== sb.meetsAll) return sb.meetsAll;

  // 2) 임계치 합이 큰 쪽
  if (sb.sumT !== sa.sumT) return sb.sumT > sa.sumT;

  // 3) 딜 점수 합
  if (sb.sumFlex !== sa.sumFlex) return sb.sumFlex > sa.sumFlex;

  // 4) 잔여 의지력 합(많을수록 좋음)
  if (sb.sumRemain !== sa.sumRemain) return sb.sumRemain > sa.sumRemain;

  return false;
}

// 2) 코어 순서 전수검사
export function optimizeAllByPermutations(
  cores: CoreDef[],
  params: Params,
  inventory: { order: Gem[]; chaos: Gem[] },
  constraints: Record<string, { minPts: number; maxPts: number }>
): PlanPack {
  const ids = cores.map((_, i) => i);

  // 순열 생성
  const perms: number[][] = [];
  const used: boolean[] = new Array(ids.length).fill(false);
  const cur: number[] = [];
  (function dfs() {
    if (cur.length === ids.length) { perms.push([...cur]); return; }
    for (let i = 0; i < ids.length; i++) {
      if (used[i]) continue;
      used[i] = true; cur.push(i);
      dfs(); cur.pop(); used[i] = false;
    }
  })();

  let best: { plan: PlanPack["answer"]; used: string[] } | null = null;

  for (const order of perms) {
    const ordered = order.map(i => cores[i]);
    // 기존 optimizeAllByPermutations을 “이 순서대로” 돌리게 만듭니다.
    const usedSet = new Set<string>();
    const answer: Record<string, OptimizeItem> = {};

    for (const c of ordered) {
      const pool = [...(inventory[c.family] || [])];
      const { minPts = 10, maxPts = 20 } = constraints[c.key] || {};
      const bestForCore = optimizeForCore(c, params, pool, usedSet, minPts, maxPts);
      answer[c.key] = bestForCore;
      bestForCore.ids.forEach(id => id && usedSet.add(id));
    }

    const candidate = { plan: answer, used: Array.from(usedSet) };
    if (betterPlan(best, candidate, cores, constraints)) best = candidate;
  }

  // 최종 선택
  return { answer: best!.plan, used: best!.used };
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

        const a1 = optimizeAllByPermutations([focus], params, inventory, over);
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
        const a2 = optimizeAllByPermutations([c], params, inventory, over2);
        answer[c.key] = a2.answer[c.key];
        a2.used.forEach(id => used.add(id));
    }

    const others = cores.filter(c => !seqKeys.includes(c.key));
    if (others.length) {
        const over3: Record<string, { minPts: number; maxPts: number }> = {};
        for (const c of cores) over3[c.key] = userConstraints[c.key] || { minPts: 10, maxPts: 20 };
        for (const c of others) {
            const a3 = optimizeAllByPermutations([c], params, inventory, over3);
            answer[c.key] = a3.answer[c.key];
            a3.used.forEach(id => used.add(id));
        }
    }

    return { plan: { answer, used: Array.from(used) }, focusKey: focus.key };
}