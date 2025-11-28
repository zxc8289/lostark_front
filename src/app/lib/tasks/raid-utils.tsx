// app/lib/tasks/raid-utils.ts
import { raidInformation, type DifficultyKey } from "@/server/data/raids";
import type { CharacterTaskPrefs } from "@/app/lib/tasks/raid-prefs";
import type { RosterCharacter } from "@/app/components/AddAccount";

/* ─────────────────────────────
 * 공통 유틸: 레벨 / 관문 / 요약
 * ───────────────────────────── */

/** 레이드 기본 입장 레벨(노말/하드 중 최소 레벨) */
export function getRaidBaseLevel(raidId: string): number {
    const info = raidInformation[raidId];
    if (!info) return Number.MAX_SAFE_INTEGER;

    const levels = Object.values(info.difficulty).map(
        (d) => d?.level ?? Number.MAX_SAFE_INTEGER
    );
    if (!levels.length) return Number.MAX_SAFE_INTEGER;

    return Math.min(...levels);
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
    }[] = [];

    for (const [raidName, info] of raidEntries) {
        const hard = info.difficulty["하드"];
        const normal = info.difficulty["노말"];

        let pickedDiff: DifficultyKey | null = null;
        let levelReq = 0;

        if (hard && ilvl >= hard.level) {
            pickedDiff = "하드";
            levelReq = hard.level;
        } else if (normal && ilvl >= normal.level) {
            pickedDiff = "노말";
            levelReq = normal.level;
        } else {
            continue;
        }

        candidates.push({ raidName, difficulty: pickedDiff, levelReq });
    }

    const top3 = candidates.sort((a, b) => b.levelReq - a.levelReq).slice(0, 3);

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
