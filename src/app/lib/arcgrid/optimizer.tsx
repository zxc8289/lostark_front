// optimizer.tsx
import { CORE_WILL_BY_GRADE, DEALER_WEIGHT_BY_LV, Role, ROLE_KEYS, STAT_ALIAS, SUPPORT_WEIGHT_BY_LV } from "./constants";
import type { CoreDef, Gem, OptimizeItem, Params, PlanPack } from "./types";


// ---- fast caches / sets
const STAT_NAME_CACHE = new Map<string, string>();
const GEM_SCORE_CACHE = new Map<string, { d: number; s: number }>();
const ALLOWED_SET = {
  dealer: new Set(ROLE_KEYS.dealer),
  supporter: new Set(ROLE_KEYS.supporter),
};


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

  // 1) 같은 패밀리 + 유효 아이템만 미리 가공
  const raw = pool
    .filter((g) => g.family === core.family)
    .map((g) => {
      const need = effectiveWillRequired(g, params);
      const pts  = gemCorePoints(g);
      return { g, need, pts };
    })
    .filter((x) => x.pts > 0 && x.need >= 1 && x.need <= avail);

  if (raw.length === 0) return [emptyCandidateForCore(core, params)];

  // 2) DP: dp[k][w] = 상위 L개 조합
  type Combo = { pts: number; need: number; idxs: number[] }; // idxs = raw 인덱스들
  const K = 4, W = avail, L = Math.max(16, cap); // 셀마다 cap 수준 유지(여유분 포함)

  const mkCell = () => ({ list: [] as Combo[], sig: new Set<string>() });
  const dp = Array.from({ length: K + 1 }, () =>
    Array.from({ length: W + 1 }, mkCell)
  );

  // 시작 상태
  dp[0][0].list.push({ pts: 0, need: 0, idxs: [] });
  dp[0][0].sig.add("");

  // 셀 리스트에 top-L 유지 삽입
  const pushTop = (cell: { list: Combo[]; sig: Set<string> }, c: Combo) => {
    const sig = c.idxs.slice().sort((a, b) => a - b).join("-");
    if (cell.sig.has(sig)) return;

    // cap이 찼고, 현재 최하위보다 명확히 못하면 컷
    const Lfull = cell.list.length >= L;
    if (Lfull) {
      const worst = cell.list[cell.list.length - 1];
      if (c.pts < worst.pts) return;
      if (c.pts === worst.pts && c.need > worst.need) return;
    }

    cell.list.push(c);
    cell.list.sort(
      (A, B) =>
        (B.pts - A.pts) ||
        (A.need - B.need) ||
        (B.idxs.length - A.idxs.length)
    );
    if (cell.list.length > L) {
      const removed = cell.list.pop()!;
      const rSig = removed.idxs.slice().sort((a, b) => a - b).join("-");
      cell.sig.delete(rSig);
    }
    cell.sig.add(sig);
  };


  // 3) 전개(아이템 1개씩, 역순 k, w)
  for (let i = 0; i < raw.length; i++) {
    const need = raw[i].need;
    const pts  = raw[i].pts;
    if (need > W) continue;

    for (let k = K - 1; k >= 0; k--) {
      for (let w = 0; w + need <= W; w++) {
        const src = dp[k][w];
        if (!src.list.length) continue;
        const dst = dp[k + 1][w + need];

        // src의 상위 L개만 이어붙이면 충분
        for (const base of src.list) {
          pushTop(dst, {
            pts: base.pts + pts,
            need: base.need + need,
            idxs: [...base.idxs, i],
          });
        }
      }
    }
  }

  // 4) 결과 수집 & 기존 버킷 정책(inRange/underMax/any) 그대로
  const inRange: OptimizeItem[] = [];
  const underMax: OptimizeItem[] = [];
  const any: OptimizeItem[] = [];

  const seen = new Set<string>(); // 최종 중복 방지
  const offer = (bucket: OptimizeItem[], it: OptimizeItem, limit: number) => {
    bucket.push(it);
    bucket.sort((A, B) => {
      const pA = A.res?.pts ?? 0, pB = B.res?.pts ?? 0;
      if (pB !== pA) return pB - pA;
      const rA = A.res?.remain ?? 0, rB = B.res?.remain ?? 0;
      return rB - rA;
    });
    if (bucket.length > limit) bucket.pop();
  };

  // 모든 k=1..4, w=0..W 셀을 훑어 조합 만들기
  for (let k = 1; k <= K; k++) {
    for (let w = 0; w <= W; w++) {
      const cell = dp[k][w];
      if (!cell.list.length) continue;

      for (const c of cell.list) {
        // 조합 → Gem 배열(need 오름차순으로 정렬: 연속 활성 보장)
        // const gems = c.idxs.map((idx) => raw[idx].g)
        //   .sort((a, b) => effectiveWillRequired(a, params) - effectiveWillRequired(b, params));
        // const arr: (Gem | null)[] = [gems[0] ?? null, gems[1] ?? null, gems[2] ?? null, gems[3] ?? null];

        // const res = computeActivation(core, arr, params);
        // // computeActivation 상 모든 젬이 켜지도록 구성되어 pts는 합산치
        // const ids = arr.map((x, i) => (res.activated[i] && x ? x.id : null));
        const sortedIdxs = c.idxs.slice().sort((a, b) => raw[a].need - raw[b].need);
        const gems = sortedIdxs.map((idx) => raw[idx].g);
        const arr: (Gem | null)[] = [gems[0] ?? null, gems[1] ?? null, gems[2] ?? null, gems[3] ?? null];

        // DP 상 보장: c.need <= avail
        const res = {
          activated: [!!arr[0], !!arr[1], !!arr[2], !!arr[3]],
          spent: c.need,
          remain: avail - c.need,
          pts: c.pts,
          flex: {} as Record<string, number>,
          flexScore: 0,
        };

        const ids = [
          arr[0]?.id ?? null,
          arr[1]?.id ?? null,
          arr[2]?.id ?? null,
          arr[3]?.id ?? null,
        ];

        const sig = ids.filter(Boolean).sort().join(",");
        if (seen.has(sig)) continue;
        seen.add(sig);

        const opt: OptimizeItem = {
          ids,
          res,
          t: undefined as any,
          overshoot: 0,
          canReachNext: false,
          reason: null,
        };

        const p = res.pts;
        if (p >= minPts && p <= maxPts)       offer(inRange,  opt, cap);
        else if (p <= maxPts)                 offer(underMax, opt, cap);
        else                                  offer(any,      opt, cap);
      }
    }
  }

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
  capPerCore = 80,
  role?: Role,                      // 👈 추가
  invMap?: Map<string, Gem>         // 👈 추가
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

  // 👇 후보 스탯 계산기
  const statOf = (it: OptimizeItem): number => {
    if (!role || !invMap) return 0;
    return scoreCandidateByIds((it.ids || []) as (string | null)[], invMap, role);
  };

  let bestAnswer: Record<string, OptimizeItem> = {} as Record<string, OptimizeItem>;
  let bestFound = false;
  let bestPts = -1;
  let bestStat = -1;   // 👈 추가: 누적 스탯
  let bestRemain = -1;

  function dfs(
    idx: number,
    used: Set<string>,
    cur: Record<string, OptimizeItem>,
    sumPts: number,
    sumStat: number,   // 👈 추가
    sumRemain: number
  ): void {
    if (idx === order.length) {
      // 비교 순서: 포인트 > 스탯 > 잔여
      if (
        (sumPts > bestPts) ||
        (sumPts === bestPts && sumStat > bestStat) ||
        (sumPts === bestPts && sumStat === bestStat && sumRemain > bestRemain)
      ) {
        bestPts = sumPts;
        bestStat = sumStat;
        bestRemain = sumRemain;
        bestAnswer = { ...cur };
        bestFound = true;
      }
      return;
    }

    // 포인트 상계
    let ub = sumPts;
    for (let i = idx; i < order.length; i++) ub += maxByCore.get(order[i].key) || 0;
    if (ub < bestPts) return; 

    const core = order[idx];
    const list = candMap.get(core.key) || [];

    for (const it of list) {
      const ids = (it.ids ?? []).filter(Boolean) as string[];
      if (ids.some((id: string) => used.has(id))) continue;

      const nextUsed = new Set<string>(used);
      for (const id of ids) nextUsed.add(id);

      const nextCur: Record<string, OptimizeItem> = { ...cur, [core.key]: it };

      const pts = it.res?.pts ?? 0;
      const rem = it.res?.remain ?? 0;
      const st  = statOf(it);

      dfs(idx + 1, nextUsed, nextCur, sumPts + pts, sumStat + st, sumRemain + rem);
    }
  }

  dfs(0, new Set<string>(), {} as Record<string, OptimizeItem>, 0, 0, 0);

  // 완전 매칭 성공
  if (bestFound && Object.keys(bestAnswer).length === order.length) {
    const used = new Set<string>();
    for (const k of Object.keys(bestAnswer)) {
      const it = bestAnswer[k];
      for (const id of (it.ids ?? []) as (string | null)[]) if (id) used.add(id);
    }
    return { answer: bestAnswer, used };
  }

  // 일부만 골라졌다면 나머지 코어는 pts 동률 시 스탯으로 보완 선택
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

    const chosen = list.reduce((best, it) => {
      if (!best) return it;
      const pA = best.res?.pts ?? 0, pB = it.res?.pts ?? 0;
      if (pB !== pA) return pB > pA ? it : best;                // 1) 포인트
      const sA = statOf(best), sB = statOf(it);
      if (sB !== sA) return sB > sA ? it : best;                // 2) 스탯
      const rA = best.res?.remain ?? 0, rB = it.res?.remain ?? 0;
      return rB > rA ? it : best;                               // 3) 잔여
    }, null as OptimizeItem | null) || emptyCandidateForCore(c, params);

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
  GEM_SCORE_CACHE.clear();
  STAT_NAME_CACHE.clear();

  const orderCores = cores.filter((c) => c.family === "order");
  const chaosCores = cores.filter((c) => c.family === "chaos");

  const role: Role = (params.role as Role) ?? "dealer";        // ✅ 역할
  const invMap = new Map<string, Gem>();                        // ✅ invMap
  for (const g of inventory.order || []) invMap.set(g.id, g);
  for (const g of inventory.chaos || []) invMap.set(g.id, g);

  const orderPack = optimizeFamilyMaxPoints(orderCores, params, inventory.order || [], constraints, 1000, role, invMap);
  const chaosPack = optimizeFamilyMaxPoints(chaosCores, params, inventory.chaos || [], constraints, 1000, role, invMap);

  const answer: Record<string, OptimizeItem> = {};
  for (const c of orderCores) answer[c.key] = orderPack.answer[c.key] || emptyCandidateForCore(c, params);
  for (const c of chaosCores) answer[c.key] = chaosPack.answer[c.key] || emptyCandidateForCore(c, params);

  const used = new Set<string>();
  orderPack.used.forEach((id) => used.add(id));
  chaosPack.used.forEach((id) => used.add(id));

  const result: PlanPack = { answer, used: Array.from(used) };
  return decoratePlanWithStats(result, inventory, role).plan;   // 표시용 flexScore 주입
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




const STAT_ALIAS_REV: Record<string, string> = Object.fromEntries(
  Object.entries(STAT_ALIAS).map(([full, short]) => [short, full])
);

/** 옵션 이름을 정식 키로 정규화 (약어 → 정식명) */
function normalizeStatName(name: string): string {
  const raw = String(name || "").trim();
  const hit = STAT_NAME_CACHE.get(raw);
  if (hit) return hit;

  let out = raw;
  if (DEALER_WEIGHT_BY_LV[out] || SUPPORT_WEIGHT_BY_LV[out]) {
    // already full name
  } else if ((STAT_ALIAS as any)[out]) {
    out = (STAT_ALIAS as any)[out];
  }
  STAT_NAME_CACHE.set(raw, out);
  return out;
}


/** 역할별 스탯 가중치 (역할에 해당하지 않는 스탯은 0점) */
function optionWeight(role: Role, name: string, lv: number): number {
  // 스탯 제외
  if (name === "의지력 효율" || name === "코어 포인트") return 0;

  const key = normalizeStatName(name);

  // 역할별 허용 스탯(정식명)만 가중치 부여
  const allowed = ROLE_KEYS[role as "dealer" | "supporter"];
  if (!allowed.includes(key)) return 0;

  const table = role === "dealer" ? DEALER_WEIGHT_BY_LV : SUPPORT_WEIGHT_BY_LV;
  const arr = table[key as keyof typeof table];
  if (!arr) return 0;

  const idx = Math.max(0, Math.min(arr.length - 1, Number(lv || 0)));
  return arr[idx] || 0;
}

// ---------- [추가] 젬 하나의 스탯 점수 ----------
function scoreGemForRole(g: Gem, role: Role): number {
  // 캐시 히트면 O(1)
  const cached = GEM_SCORE_CACHE.get(g.id);
  if (cached) return role === "dealer" ? cached.d : cached.s;

  // 미스면 두 역할 모두 한 번에 계산해서 저장
  let d = 0, s = 0;
  for (const o of g.options || []) {
    if (!o || o.lv == null) continue;
    const nm = normalizeStatName(o.name);
    if (nm === "의지력 효율" || nm === "코어 포인트") continue;
    // 허용 스탯만 반영 (Set으로 O(1))
    if (ALLOWED_SET.dealer.has(nm)) {
      const arr = DEALER_WEIGHT_BY_LV[nm as keyof typeof DEALER_WEIGHT_BY_LV];
      if (arr) d += arr[Math.max(0, Math.min(arr.length - 1, Number(o.lv || 0)))] || 0;
    }
    if (ALLOWED_SET.supporter.has(nm)) {
      const arr = SUPPORT_WEIGHT_BY_LV[nm as keyof typeof SUPPORT_WEIGHT_BY_LV];
      if (arr) s += arr[Math.max(0, Math.min(arr.length - 1, Number(o.lv || 0)))] || 0;
    }
  }
  GEM_SCORE_CACHE.set(g.id, { d, s });
  return role === "dealer" ? d : s;
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
  onlyAtTotalPts: number | null = null,   // 총 포인트 '정확히' 고정
  capPerCore = 2000                        // 👈 추가: 후보 cap 주입
): ScoredPlan[] {
  GEM_SCORE_CACHE.clear();
  STAT_NAME_CACHE.clear();
  const enabled = cores.filter((c) => c.enabled);
  const invMap = new Map<string, Gem>();
  for (const g of inventory.order || []) invMap.set(g.id, g);
  for (const g of inventory.chaos || []) invMap.set(g.id, g);

  const candMap = new Map<
    string,
    Array<{ item: OptimizeItem; stat: number; pts: number; remain: number }>
  >();

  for (const c of enabled) {
    const cons = constraints[c.key] || { minPts: 0, maxPts: 999 };
    // 🔽 capPerCore 반영
    const raw = enumerateCandidatesForCorePoints(
      c, params, (inventory as any)[c.family] || [], cons.minPts, cons.maxPts, capPerCore
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
          res: { ...(it.res as any), flexScore: stat }
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

// 1) util 추가
function decoratePlanWithStats(
  plan: PlanPack,
  inventory: { order: Gem[]; chaos: Gem[] },
  role: Role
): { plan: PlanPack; statTotal: number } {
  const invMap = new Map<string, Gem>();
  for (const g of inventory.order || []) invMap.set(g.id, g);
  for (const g of inventory.chaos || []) invMap.set(g.id, g);

  let total = 0;
  for (const key of Object.keys(plan.answer)) {
    const it = plan.answer[key];
    const ids = (it.ids || []) as (string | null)[];
    let stat = 0;
    for (const id of ids) {
      if (!id) continue;
      const g = invMap.get(id);
      if (g) stat += scoreGemForRole(g, role);
    }
    (it.res as any).flexScore = stat;
    total += stat;
  }
  return { plan, statTotal: total };
}


// utils: 총 포인트 합
export function getPlanSumPoints(plan: PlanPack): number {
  return Object.values(plan.answer).reduce((s, it) => s + (it?.res?.pts ?? 0), 0);
}

// 1단계: 포인트 합 최대 플랜의 합을 구함(포인트 우선 탐색 사용)
export function bestTotalPoints(
  cores: CoreDef[],
  params: Params,
  inventory: { order: Gem[]; chaos: Gem[] },
  constraints: Record<string, { minPts: number; maxPts: number }>
): number {
  const bestPlan = optimizeAllByPermutations(cores, params, inventory, constraints);
  return getPlanSumPoints(bestPlan);
}


// 2단계: 포인트 합을 최대치로 '고정'하고 스탯 상위 플랜 나열
export function enumerateTopPlansAtBestPoints(
  cores: CoreDef[],
  params: Params,
  inventory: { order: Gem[]; chaos: Gem[] },
  constraints: Record<string, { minPts: number; maxPts: number }>,
  role: "dealer" | "supporter",
  topK = 10,
  capPerCore = 2000
) {
  const bestPts = bestTotalPoints(cores, params, inventory, constraints);
  return enumerateTopPlansByStats(
    cores, params, inventory, constraints, role, topK, /*onlyAtTotalPts*/ bestPts, capPerCore
  );
}


// 정확 포인트 분포로 코어별 min=max 고정
export function exactPointConstraints(
  pointsByKey: Record<string, number>
): Record<string, {minPts:number; maxPts:number}> {
  const out: Record<string, {minPts:number; maxPts:number}> = {};
  for (const k of Object.keys(pointsByKey)) {
    const v = pointsByKey[k];
    out[k] = { minPts: v, maxPts: v };
  }
  return out;
}

// 정확 분포에서 스탯 Top-K (역할별)
export function enumerateTopPlansAtExactPoints(
  cores: CoreDef[],
  params: Params,
  inventory: { order: Gem[]; chaos: Gem[] },
  pointsByKey: Record<string, number>,   // 예: { order_sun:17, order_moon:17, order_star:14 }
  role: "dealer" | "supporter",
  topK = 10,
  capPerCore = 2000
) {
  const cons = exactPointConstraints(pointsByKey);
  const totalPts = Object.values(pointsByKey).reduce((a,b)=>a+b,0);
  return enumerateTopPlansByStats(
    cores, params, inventory, cons, role,
    topK, /*onlyAtTotalPts*/ totalPts, capPerCore
  );
}


// 진행률 콜백 타입
export type ProgressInfo = {
  phase: "build" | "dfs" | "finalize" | "order" | "chaos";
  done: number;     // 처리 개수
  total: number;    // 추정 전체 개수(없으면 0)
  percent: number;  // 0~100
};

// 렌더 양보용
const microYield = () => new Promise((r) => setTimeout(r, 0));

