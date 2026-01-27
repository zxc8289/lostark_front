// app/lib/tasks/raid-utils.ts
import { raidInformation, type DifficultyKey } from "@/server/data/raids";
import type { CharacterTaskPrefs } from "@/app/lib/tasks/raid-prefs";
import type { RosterCharacter } from "@/app/components/AddAccount";

/* ─────────────────────────────
 * 공통 유틸: 레벨 / 관문 / 요약
 * ───────────────────────────── */

/** 레이드 기본 입장 레벨(노말/하드/나메 중 최소 레벨) */
export function getRaidBaseLevel(raidId: string): number {
    const info = raidInformation[raidId];
    if (!info) return Number.MAX_SAFE_INTEGER;

    const levels = Object.values(info.difficulty).map(
        (d) => d?.level ?? Number.MAX_SAFE_INTEGER
    );
    if (!levels.length) return Number.MAX_SAFE_INTEGER;

    return Math.min(...levels);
}

/**
 * ✅ 표/카드 공통으로 “레이드 컬럼 정렬”에 쓰기 좋은 키
 * - roster 내에서 해당 raidId가 enabled인 캐릭들의 선택 난이도(level) 중 최대값을 사용
 * - 동률이면 gold(난이도 gold)로 다시 비교 (세르카 하드 1730/44000 vs 종막 하드 1730/52000 같은 케이스 안정화)
 * - 아무도 enabled 아니면 base(level)로 fallback
 */
export type RaidColumnSortKey = {
    level: number;
    gold: number;
};

function getDifficultyTotalGold(raidId: string, diff: DifficultyKey): number {
    const info = raidInformation[raidId];
    const d = info?.difficulty?.[diff];
    if (!d) return 0;

    // gold 필드가 있으면 그걸 쓰고, 없으면 gates 합으로 계산
    if (typeof d.gold === "number") return d.gold;
    return (d.gates ?? []).reduce((sum, g) => sum + (g.gold ?? 0), 0);
}

export function getRaidColumnSortKeyForRoster(
    raidId: string,
    roster: RosterCharacter[],
    prefsByChar: Record<string, CharacterTaskPrefs>
): RaidColumnSortKey {
    const info = raidInformation[raidId];
    if (!info) return { level: Number.MAX_SAFE_INTEGER, gold: 0 };

    let bestLevel = -1;
    let bestGold = 0;

    for (const c of roster) {
        const p = prefsByChar[c.name]?.raids?.[raidId];
        if (!p?.enabled) continue;

        const diffInfo = info.difficulty?.[p.difficulty];
        const lv = diffInfo?.level;

        if (typeof lv !== "number") continue;

        const gold = getDifficultyTotalGold(raidId, p.difficulty);

        if (lv > bestLevel) {
            bestLevel = lv;
            bestGold = gold;
        } else if (lv === bestLevel && gold > bestGold) {
            bestGold = gold;
        }
    }

    if (bestLevel >= 0) {
        return { level: bestLevel, gold: bestGold };
    }

    // enabled가 하나도 없는 경우(이론상 드물지만 방어)
    return { level: getRaidBaseLevel(raidId), gold: 0 };
}

/** 관문 토글 규칙 (my-tasks / party 공통)
 *  - 아무 것도 안 켜져 있을 때 → 클릭한 관문까지 모두 켜기
 *  - 현재 가장 오른쪽보다 더 오른쪽 관문을 클릭 → 거기까지 확장
 *  - 현재 범위 안/왼쪽을 클릭 → 그 관문부터 오른쪽은 모두 끄기
 */
export function calcNextGates(
    clickedGate: number,
    currentGates: number[],
    allGates: number[]
): number[] {
    if (!allGates.length) return [];

    const sortedAll = [...allGates].sort((a, b) => a - b);
    const selectedSet = new Set(currentGates);

    // 현재 선택된 관문들 중 "가장 오른쪽" 인덱스
    let currentMaxIdx = -1;
    sortedAll.forEach((g, idx) => {
        if (selectedSet.has(g) && idx > currentMaxIdx) {
            currentMaxIdx = idx;
        }
    });

    const clickedIdx = sortedAll.indexOf(clickedGate);
    if (clickedIdx === -1) {
        // 정의되지 않은 관문이면 기존 상태 유지
        return currentGates;
    }

    let newMaxIdx: number;

    if (currentMaxIdx === -1) {
        // 1) 아무 것도 안 눌렸을 때 → 클릭한 관문까지 켜기
        newMaxIdx = clickedIdx;
    } else if (clickedIdx > currentMaxIdx) {
        // 2) 현재 선택 범위보다 오른쪽 클릭 → 거기까지 확장
        newMaxIdx = clickedIdx;
    } else {
        // 3) 현재 선택 범위 안/왼쪽 클릭 → 그 관문부터 오른쪽 다 끄기
        newMaxIdx = clickedIdx - 1;
    }

    if (newMaxIdx < 0) {
        return [];
    }

    // 앞에서부터 newMaxIdx 까지의 관문만 켜기
    return sortedAll.slice(0, newMaxIdx + 1);
}

/** 남은 숙제/골드 요약 타입 */
export type RaidSummary = {
    totalRemainingTasks: number;
    remainingCharacters: number;
    totalRemainingGold: number;
    totalGold: number;
};

/**
 * 하나의 roster + prefsByChar 에 대한
 *  - 남은 숙제 수
 *  - 숙제 남은 캐릭 수
 *  - 남은 골드 / 전체 골드
 * 공통 계산 로직
 */
export function computeRaidSummaryForRoster(
    roster: RosterCharacter[],
    prefsByChar: Record<string, CharacterTaskPrefs>
): RaidSummary {
    let taskCount = 0;
    let charCount = 0;
    let goldRemain = 0;
    let goldTotal = 0;

    for (const char of roster) {
        const prefs = prefsByChar[char.name];
        if (!prefs) continue;

        let hasRemainingForChar = false;

        for (const [raidName, p] of Object.entries(prefs.raids)) {
            if (!p?.enabled) continue;

            const info = raidInformation[raidName];
            if (!info) continue;

            const diffInfo = info.difficulty[p.difficulty];
            const gatesDef = diffInfo?.gates ?? [];
            if (!diffInfo || !gatesDef.length) continue;

            const gates = p.gates ?? [];

            // 이 레이드의 "전체 골드"
            const totalGoldForRaid = gatesDef.reduce(
                (sum, g) => sum + (g.gold ?? 0),
                0
            );

            // 이 레이드에서 이미 체크된 관문 골드
            const selectedGoldForRaid = gates.reduce((sum, gi) => {
                const g = gatesDef.find((x) => x.index === gi);
                return sum + (g?.gold ?? 0);
            }, 0);

            // 남은 골드 = 전체 - 체크된
            goldRemain += Math.max(0, totalGoldForRaid - selectedGoldForRaid);

            // 전체 골드
            goldTotal += totalGoldForRaid;

            // 남은 숙제 / 캐릭터 계산
            const lastGateIndex = gatesDef.reduce(
                (max, g) => (g.index > max ? g.index : max),
                gatesDef[0].index
            );
            const isCompleted = gates.includes(lastGateIndex);

            if (!isCompleted) {
                taskCount += 1;
                hasRemainingForChar = true;
            }
        }

        if (hasRemainingForChar) {
            charCount += 1;
        }
    }

    return {
        totalRemainingTasks: taskCount,
        remainingCharacters: charCount,
        totalRemainingGold: goldRemain,
        totalGold: goldTotal,
    };
}

/* ─────────────────────────────
 * 이미 있던 자동 세팅 유틸
 * ───────────────────────────── */

/** 단일 캐릭터 기준 Top3 레이드 자동 선택 */
export function autoSelectTop3Raids(
    ilvl: number,
    prev?: CharacterTaskPrefs
): CharacterTaskPrefs {
    const raidEntries = Object.entries(raidInformation);
    const updatedRaids: CharacterTaskPrefs["raids"] = { ...(prev?.raids ?? {}) };

    const candidates: {
        raidName: string;
        difficulty: DifficultyKey;
        levelReq: number;
        gold: number; // 💰 골드 정보 추가
    }[] = [];

    for (const [raidName, info] of raidEntries) {

        const nightmare = info.difficulty["나메"];
        const hard = info.difficulty["하드"];
        const normal = info.difficulty["노말"];

        let pickedDiff: DifficultyKey | null = null;
        let levelReq = 0;
        let diffInfo = null;

        // 입장 가능한 가장 높은 난이도 선택
        if (nightmare && ilvl >= nightmare.level) {
            pickedDiff = "나메";
            levelReq = nightmare.level;
            diffInfo = nightmare;
        } else if (hard && ilvl >= hard.level) {
            pickedDiff = "하드";
            levelReq = hard.level;
            diffInfo = hard;
        } else if (normal && ilvl >= normal.level) {
            pickedDiff = "노말";
            levelReq = normal.level;
            diffInfo = normal;
        } else {
            continue;
        }

        // 💰 해당 난이도의 총 골드 계산
        const totalGold = (diffInfo.gates ?? []).reduce((sum, g) => sum + (g.gold || 0), 0);

        candidates.push({
            raidName,
            difficulty: pickedDiff,
            levelReq,
            gold: totalGold
        });
    }

    const top3 = candidates.sort((a, b) => {
        const infoA = raidInformation[a.raidName];
        const infoB = raidInformation[b.raidName];

        // 1. 출시일 데이터 가져오기 (없으면 아주 옛날로 취급)
        const dateA = infoA?.releaseDate || "2000-01-01";
        const dateB = infoB?.releaseDate || "2000-01-01";

        if (dateA !== dateB) {
            return dateB.localeCompare(dateA);
        }


        // [2순위] 골드 비교 (돈 많이 주는 순)
        if (b.gold !== a.gold) {
            return b.gold - a.gold;
        }

        // [3순위] 그래도 같으면 레벨 높은 순
        return b.levelReq - a.levelReq;
    }).slice(0, 3);
    // 기존 설정은 다 disable + gates 초기화
    for (const [raidName, pref] of Object.entries(updatedRaids)) {
        updatedRaids[raidName] = {
            ...pref,
            enabled: false,
            gates: [],
        };
    }

    // 상위 3개만 enable
    for (const { raidName, difficulty } of top3) {
        updatedRaids[raidName] = {
            ...(updatedRaids[raidName] ?? { gates: [] }),
            enabled: true,
            difficulty,
        };
    }

    const order = top3.map((x) => x.raidName);

    return { raids: updatedRaids, order };
}

/* 여기부터 새로 추가된 자동 세팅 결과 타입 */

export type AutoSetupResult = {
    nextPrefsByChar: Record<string, CharacterTaskPrefs>;
    nextVisibleByChar: Record<string, boolean>;
};

/**
 * 아이템 레벨 상위 6캐릭 + 각 캐릭터 Top3 레이드 자동 세팅
 * - 공통으로 MyTasks / Party 페이지 양쪽에서 사용
 */
export function buildAutoSetupForRoster(
    roster: RosterCharacter[],
    prevPrefsByChar: Record<string, CharacterTaskPrefs>
): AutoSetupResult {
    if (!roster.length) {
        return {
            nextPrefsByChar: { ...prevPrefsByChar },
            nextVisibleByChar: {},
        };
    }

    // 1) 아이템 레벨 기준 상위 6캐릭
    const sorted = [...roster].sort(
        (a, b) => (b.itemLevelNum ?? 0) - (a.itemLevelNum ?? 0)
    );
    const top6 = sorted.slice(0, 6);
    const top6Names = new Set(top6.map((c) => c.name));

    // 2) visibleByChar: 상위 6만 true
    const nextVisibleByChar: Record<string, boolean> = {};
    for (const c of roster) {
        nextVisibleByChar[c.name] = top6Names.has(c.name);
    }

    // 3) 각 상위 6캐릭에 대해 Top3 레이드 자동 세팅
    const nextPrefsByChar: Record<string, CharacterTaskPrefs> = {
        ...prevPrefsByChar,
    };

    for (const c of top6) {
        const ilvlNum = c.itemLevelNum ?? 0;
        const prevPrefs = nextPrefsByChar[c.name] ?? { raids: {} };
        nextPrefsByChar[c.name] = autoSelectTop3Raids(ilvlNum, prevPrefs);
    }

    return {
        nextPrefsByChar,
        nextVisibleByChar,
    };
}
