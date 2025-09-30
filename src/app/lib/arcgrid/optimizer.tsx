// optimizer.tsx
import { CORE_WILL_BY_GRADE, DEALER_WEIGHT_BY_LV, Role, SUPPORT_WEIGHT_BY_LV } from "./constants";
import type { CoreDef, Gem, OptimizeItem, Params, PlanPack } from "./types";

/* ─────────────────────────────────────────────────────────────
 *  공통 유틸
 * ────────────────────────────────────────────────────────────*/
export function baseWillBySubType(subType: string | number) {
  const s = String(subType).trim();
  if (s === "안정" || s === "침식" || s === "4") return 8;
  if (s === "견고" || s === "왜곡" || s === "5") return 9;
  if (s === "6") return 10;
  return 10;
}

export function getGemOption(g: Gem, name: string) {
  return (g.options || []).find((o) => o?.name === name);
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

/* ─────────────────────────────────────────────────────────────
 *  한 코어 활성 (포인트/의지력만)
 *  - 앞 슬롯부터 연속만
 * ────────────────────────────────────────────────────────────*/
export function computeActivation(
  core: Pick<CoreDef, "family" | "grade">,
  gems: (Gem | null)[],
  params: Params
) {
  const available = CORE_WILL_BY_GRADE[core.grade] || 0;
  let remain = available;
  const activated = [false, false, false, false];

  for (let i = 0; i < 4; i++) {
    const g = gems[i];
    if (!g) break; // 연속만
    if (g.family !== core.family) break;
    const need = effectiveWillRequired(g, params);
    if (remain >= need) {
      remain -= need;
      activated[i] = true;
    } else break;
  }

  let pts = 0;
  activated.forEach((on, i) => {
    if (!on) return;
    const g = gems[i]!;
    pts += gemCorePoints(g);
  });

  const flex: Record<string, number> = {};
  const flexScore = 0;

  return { activated, spent: available - remain, remain, pts, flex, flexScore };
}


function emptyCandidateForCore(core: CoreDef, params: Params): OptimizeItem {
  const res = computeActivation(core, [null, null, null, null], params);
  return {
    ids: [null, null, null, null],
    res,
    t: undefined as any,
    overshoot: 0,
    canReachNext: false,
    reason: "가능한 조합이 없어 0p로 대체",
  };
}


function enumerateCandidatesForCorePoints(
  core: CoreDef,
  params: Params,
  pool: Gem[],
  minPts: number,
  maxPts: number,
  cap = 60
): OptimizeItem[] {
  const avail = CORE_WILL_BY_GRADE[core.grade] || 0;
  const familyPool = pool.filter((g) => g.family === core.family);

  const needOf = (g: Gem) => effectiveWillRequired(g, params);
  const ptsOf = (g: Gem) => gemCorePoints(g);

  const sortedPool = familyPool.slice().sort((a, b) => {
    // 효율 우선: pts/need ↑ → need ↓ → pts ↑
    const ra = ptsOf(a) / Math.max(1, needOf(a));
    const rb = ptsOf(b) / Math.max(1, needOf(b));
    if (rb !== ra) return rb - ra;
    const na = needOf(a), nb = needOf(b);
    if (na !== nb) return na - nb;
    return ptsOf(b) - ptsOf(a);
  });

  const inRange: OptimizeItem[] = [];
  const underMax: OptimizeItem[] = [];
  const any: OptimizeItem[] = [];

  const seenIn = new Set<string>();
  const seenUnder = new Set<string>();
  const seenAny = new Set<string>();

  const pushSorted = (bucket: OptimizeItem[], it: OptimizeItem, limit: number) => {
    bucket.push(it);
    bucket.sort((A, B) => {
      const pA = A.res?.pts ?? 0, pB = B.res?.pts ?? 0;
      if (pB !== pA) return pB - pA;
      const rA = A.res?.remain ?? 0, rB = B.res?.remain ?? 0;
      return rB - rA;
    });
    if (bucket.length > limit) bucket.pop();
  };

  function evalChosen(chosen: Gem[]) {
    const by = chosen.slice().sort((a, b) => {
      const na = needOf(a), nb = needOf(b);
      if (na !== nb) return na - nb;
      return ptsOf(b) - ptsOf(a);
    });

    const arr: (Gem | null)[] = [null, null, null, null];
    for (let i = 0; i < by.length && i < 4; i++) arr[i] = by[i];

    const res = computeActivation(core, arr, params);
    const pts = res.pts;
    const ids = arr.map((x, i) => (res.activated[i] && x ? x.id : null));
    const sig = ids.filter(Boolean).join(",");

    if (pts >= minPts && pts <= maxPts) {
      if (!sig || seenIn.has(sig)) return;
      seenIn.add(sig);
      pushSorted(inRange, { ids, res, t: undefined as any, overshoot: 0, canReachNext: false, reason: null }, cap);
      return;
    }
    if (pts <= maxPts) {
      if (sig && !seenUnder.has(sig)) {
        seenUnder.add(sig);
        pushSorted(
          underMax,
          { ids, res, t: undefined as any, overshoot: 0, canReachNext: false, reason: minPts > 0 ? `최소 ${minPts} 미달 (${pts}/${minPts})` : null },
          cap
        );
      }
      return;
    }
    if (sig && !seenAny.has(sig)) {
      seenAny.add(sig);
      pushSorted(any, { ids, res, t: undefined as any, overshoot: 0, canReachNext: false, reason: `최대 ${maxPts} 초과 (${pts})` }, cap);
    }
  }

  function dfs(idx: number, chosen: Gem[], remain: number) {
    if (chosen.length) evalChosen(chosen);
    if (chosen.length === 4 || idx >= sortedPool.length || remain <= 0) return;
    for (let i = idx; i < sortedPool.length; i++) {
      const g = sortedPool[i];
      const need = needOf(g);
      if (need > remain) continue;
      chosen.push(g);
      dfs(i + 1, chosen, remain - need);
      chosen.pop();
    }
  }

  dfs(0, [], avail);

  if (inRange.length) return inRange;
  if (underMax.length) return underMax;
  if (any.length) return any;

  return [emptyCandidateForCore(core, params)];
}

function optimizeFamilyMaxPoints(
  familyCores: CoreDef[],
  params: Params,
  pool: Gem[],
  constraints: Record<string, { minPts: number; maxPts: number }>,
  capPerCore = 80
): { answer: Record<string, OptimizeItem>; used: Set<string> } {
  if (familyCores.length === 0) return { answer: {}, used: new Set<string>() };

  const candMap = new Map<string, OptimizeItem[]>();
  for (const c of familyCores) {
    const cons = constraints[c.key] || { minPts: 0, maxPts: 999 };
    const list = enumerateCandidatesForCorePoints(c, params, pool, cons.minPts, cons.maxPts, capPerCore);
    candMap.set(c.key, list);
  }

  const maxByCore = new Map<string, number>();
  for (const c of familyCores) {
    const maxP = (candMap.get(c.key) || []).reduce((m, it) => Math.max(m, it.res?.pts ?? 0), 0);
    maxByCore.set(c.key, maxP);
  }
  const order = familyCores.slice().sort((a, b) => (maxByCore.get(b.key)! - maxByCore.get(a.key)!));

  let bestAnswer: Record<string, OptimizeItem> = {} as Record<string, OptimizeItem>;
  let bestFound = false;
  let bestPts = -1;
  let bestRemain = -1;

  function dfs(
    idx: number,
    used: Set<string>,
    cur: Record<string, OptimizeItem>,
    sumPts: number,
    sumRemain: number
  ): void {
    if (idx === order.length) {
      if (sumPts > bestPts || (sumPts === bestPts && sumRemain > bestRemain)) {
        bestPts = sumPts;
        bestRemain = sumRemain;
        bestAnswer = { ...cur };
        bestFound = true;
      }
      return;
    }

    // 상계 가지치기
    let ub = sumPts;
    for (let i = idx; i < order.length; i++) ub += maxByCore.get(order[i].key) || 0;
    if (ub <= bestPts) return;

    const core = order[idx];
    const list = candMap.get(core.key) || [];

    for (const it of list) {
      const ids = (it.ids ?? []).filter(Boolean) as string[];
      if (ids.some((id: string) => used.has(id))) continue;

      const nextUsed = new Set<string>(used);
      for (const id of ids) nextUsed.add(id);

      const nextCur: Record<string, OptimizeItem> = { ...cur };
      nextCur[core.key] = it;

      const pts = it.res?.pts ?? 0;
      const rem = it.res?.remain ?? 0;

      dfs(idx + 1, nextUsed, nextCur, sumPts + pts, sumRemain + rem);
    }
  }

  dfs(0, new Set<string>(), {} as Record<string, OptimizeItem>, 0, 0);

  // 완전 매칭 성공
  if (bestFound && Object.keys(bestAnswer).length === order.length) {
    const used = new Set<string>();
    for (const k of Object.keys(bestAnswer)) {
      const it = bestAnswer[k];
      for (const id of (it.ids ?? []) as (string | null)[]) if (id) used.add(id);
    }
    return { answer: bestAnswer, used };
  }

  const answer: Record<string, OptimizeItem> = bestFound ? { ...bestAnswer } : ({} as Record<string, OptimizeItem>);
  const used = new Set<string>();
  for (const k of Object.keys(answer)) {
    const it = answer[k];
    for (const id of (it.ids ?? []) as (string | null)[]) if (id) used.add(id);
  }

  for (const c of order) {
    if (answer[c.key]) continue;
    const cons = constraints[c.key] || { minPts: 0, maxPts: 999 };
    const remainingPool = pool.filter((g) => !used.has(g.id));
    const list = enumerateCandidatesForCorePoints(c, params, remainingPool, cons.minPts, cons.maxPts, capPerCore);
    const chosen = list[0] ?? emptyCandidateForCore(c, params);
    answer[c.key] = chosen;
    for (const id of (chosen.ids ?? []) as (string | null)[]) if (id) used.add(id);
  }

  return { answer, used };
}


export function optimizeForCore(
  core: CoreDef,
  params: Params,
  pool: Gem[],
  usedIds: Set<string>,
  minPts = 0,
  maxPts = 999
): OptimizeItem {
  const filtered = pool.filter((g) => !usedIds.has(g.id));
  const cands = enumerateCandidatesForCorePoints(core, params, filtered, minPts, maxPts, 80);
  cands.sort((A, B) => {
    const pA = A.res?.pts ?? 0, pB = B.res?.pts ?? 0;
    if (pB !== pA) return pB - pA;
    const rA = A.res?.remain ?? 0, rB = B.res?.remain ?? 0;
    return rB - rA;
  });
  return cands[0] || emptyCandidateForCore(core, params);
}


export function optimizeAllByPermutations(
  cores: CoreDef[],
  params: Params,
  inventory: { order: Gem[]; chaos: Gem[] },
  constraints: Record<string, { minPts: number; maxPts: number }>
): PlanPack {
  const orderCores = cores.filter((c) => c.family === "order");
  const chaosCores = cores.filter((c) => c.family === "chaos");

  const orderPack = optimizeFamilyMaxPoints(orderCores, params, inventory.order || [], constraints, 80);
  const chaosPack = optimizeFamilyMaxPoints(chaosCores, params, inventory.chaos || [], constraints, 80);

  const answer: Record<string, OptimizeItem> = {};
  for (const c of orderCores) answer[c.key] = orderPack.answer[c.key] || emptyCandidateForCore(c, params);
  for (const c of chaosCores) answer[c.key] = chaosPack.answer[c.key] || emptyCandidateForCore(c, params);

  const used = new Set<string>();
  orderPack.used.forEach((id) => used.add(id));
  chaosPack.used.forEach((id) => used.add(id));

  return { answer, used: Array.from(used) };
}


export function optimizeExtremeBySequence(
  _seqKeys: string[],
  cores: CoreDef[],
  params: Params,
  inventory: { order: Gem[]; chaos: Gem[] },
  userConstraints: Record<string, { minPts: number; maxPts: number }>
) {
  const plan = optimizeAllByPermutations(cores, params, inventory, userConstraints);
  return { plan, focusKey: _seqKeys?.[0] ?? null };
}



function optionWeight(role: Role, name: string, lv: number): number {
  const table = role === "dealer" ? DEALER_WEIGHT_BY_LV : SUPPORT_WEIGHT_BY_LV;
  const arr = table[name as keyof typeof table];
  if (!arr) return 0;
  const idx = Math.max(0, Math.min(arr.length - 1, Number(lv || 0)));
  return arr[idx] || 0;
}

// ---------- [추가] 젬 하나의 스탯 점수 ----------
function scoreGemForRole(g: Gem, role: Role): number {
  let s = 0;
  for (const o of g.options || []) {
    if (!o || o.lv == null) continue;
    if (o.name === "의지력 효율" || o.name === "코어 포인트") continue; // 스탯 제외
    s += optionWeight(role, o.name, o.lv);
  }
  return s;
}

// ---------- [추가] 후보(OptimizeItem) 스탯 점수 ----------
function scoreCandidateByIds(
  ids: (string | null)[],
  invMap: Map<string, Gem>,
  role: Role
): number {
  let s = 0;
  for (const id of ids) {
    if (!id) continue;
    const g = invMap.get(id);
    if (!g) continue;
    s += scoreGemForRole(g, role);
  }
  return s;
}

// 상위 조합 타입 (스탯 점수 포함)
export type ScoredPlan = {
  plan: PlanPack;
  statScore: number;
  sumPts: number;
  sumRemain: number;
};

// ---------- [추가] 스탯 기준 상위 K개 나열 ----------
// optimizer.tsx (기존 함수 대체)
export function enumerateTopPlansByStats(
  cores: CoreDef[],
  params: Params,
  inventory: { order: Gem[]; chaos: Gem[] },
  constraints: Record<string, { minPts: number; maxPts: number }>,
  role: "dealer" | "supporter",
  topK = 10,
  onlyAtTotalPts: number | null = null,   // 👈 추가: 총 포인트를 이 값으로 '고정'
): ScoredPlan[] {
  const enabled = cores.filter((c) => c.enabled);
  const invMap = new Map<string, Gem>();
  for (const g of inventory.order || []) invMap.set(g.id, g);
  for (const g of inventory.chaos || []) invMap.set(g.id, g);

  // 코어별 후보(범위 우선) + 후보 스탯 계산
  const candMap = new Map<
    string,
    Array<{ item: OptimizeItem; stat: number; pts: number; remain: number }>
  >();

  for (const c of enabled) {
    const cons = constraints[c.key] || { minPts: 0, maxPts: 999 };
    const raw = enumerateCandidatesForCorePoints(
      c, params, (inventory as any)[c.family] || [], cons.minPts, cons.maxPts, 80
    );

    const strict = raw.filter((it) => {
      const p = it.res?.pts ?? 0;
      return p >= cons.minPts && p <= cons.maxPts;
    });

    const list = (strict.length ? strict : raw)
      .map((it) => {
        const stat = scoreCandidateByIds((it.ids || []) as (string | null)[], invMap, role);
        const itemWithStat: OptimizeItem = {
          ...it,
          res: { ...(it.res as any), flexScore: stat }   // ← 스탯 점수를 flexScore로
        };
        return {
          item: itemWithStat,
          stat,
          pts: itemWithStat.res?.pts ?? 0,
          remain: itemWithStat.res?.remain ?? 0,
        };
      })
      .sort((a, b) => (b.stat - a.stat) || (b.pts - a.pts) || (b.remain - a.remain));

    candMap.set(c.key, list);
  }

  for (const c of enabled) if ((candMap.get(c.key) || []).length === 0) return [];

  // 정렬 기준: 해당 코어에서 낼 수 있는 최대 '스탯'이 큰 코어부터
  const order = enabled
    .slice()
    .sort((a, b) => {
      const la = (candMap.get(a.key) || [])[0]?.stat ?? 0;
      const lb = (candMap.get(b.key) || [])[0]?.stat ?? 0;
      return lb - la;
    });

  // 상계 계산용: 남은 코어 최대 스탯/포인트
  const maxStatByCore = new Map<string, number>();
  const maxPtsByCore = new Map<string, number>();
  for (const c of order) {
    const arr = candMap.get(c.key) || [];
    maxStatByCore.set(c.key, arr.length ? arr[0].stat : 0);
    maxPtsByCore.set(c.key, arr.reduce((m, x) => Math.max(m, x.pts), 0));
  }

  // ▼ 동일 스탯 dedup (같은 점수면 포인트↑, 잔여↑ 우선)
  const results: ScoredPlan[] = [];
  const dedupByScore = new Map<string, ScoredPlan>();
  const scoreKey = (x: number) => x.toFixed(6);

  const pushResult = (plan: PlanPack, statScore: number, sumPts: number, sumRemain: number) => {
    const key = scoreKey(statScore);
    const candidate: ScoredPlan = { plan, statScore, sumPts, sumRemain };
    const existing = dedupByScore.get(key);

    if (!existing || sumPts > existing.sumPts || (sumPts === existing.sumPts && sumRemain > existing.sumRemain)) {
      dedupByScore.set(key, candidate);
      const idx = results.findIndex((r) => scoreKey(r.statScore) === key);
      if (idx >= 0) results[idx] = candidate; else results.push(candidate);
      results.sort((A, B) => (B.statScore - A.statScore) || (B.sumPts - A.sumPts) || (B.sumRemain - A.sumRemain));
      if (results.length > topK) {
        const removed = results.pop()!;
        const rkey = scoreKey(removed.statScore);
        if (dedupByScore.get(rkey) === removed) dedupByScore.delete(rkey);
      }
    }
  };

  const worstKeptScore = (): number =>
    results.length < topK ? -Infinity : results[results.length - 1].statScore;

  function dfs(
    idx: number,
    used: Set<string>,
    cur: Record<string, OptimizeItem>,
    curStat: number,
    curPts: number,
    curRemain: number
  ) {
    if (idx === order.length) {
      // 총 포인트를 '정확히' 맞춰야 하는 모드면 여기서 필터
      if (onlyAtTotalPts != null && curPts !== onlyAtTotalPts) return;

      const usedArr: string[] = [];
      for (const k of Object.keys(cur)) {
        for (const id of (cur[k].ids || []) as (string | null)[]) if (id) usedArr.push(id);
      }
      pushResult({ answer: { ...cur }, used: usedArr }, curStat, curPts, curRemain);
      return;
    }

    // 상계(스탯)로 가지치기
    let ubStat = curStat;
    for (let i = idx; i < order.length; i++) ubStat += maxStatByCore.get(order[i].key) || 0;
    if (ubStat <= worstKeptScore()) return;

    // 상계(포인트)로 가지치기 (총 포인트 고정이 걸린 경우)
    if (onlyAtTotalPts != null) {
      // 현재까지 포인트가 이미 초과면 컷
      if (curPts > onlyAtTotalPts) return;

      // 남은 코어에서 얻을 수 있는 최대 포인트를 더해도 목표에 못 미치면 컷
      let ubPts = curPts;
      for (let i = idx; i < order.length; i++) ubPts += maxPtsByCore.get(order[i].key) || 0;
      if (ubPts < onlyAtTotalPts) return;
    }

    const core = order[idx];
    const cand = candMap.get(core.key) || [];

    for (const c of cand) {
      const ids = (c.item.ids || []).filter(Boolean) as string[];
      let clash = false;
      for (const id of ids) if (used.has(id)) { clash = true; break; }
      if (clash) continue;

      const nextUsed = new Set<string>(used);
      for (const id of ids) nextUsed.add(id);

      const nextCur: Record<string, OptimizeItem> = { ...cur, [core.key]: c.item };
      dfs(idx + 1, nextUsed, nextCur, curStat + c.stat, curPts + c.pts, curRemain + c.remain);
    }
  }

  dfs(0, new Set<string>(), {} as Record<string, OptimizeItem>, 0, 0, 0);
  return results;
}
