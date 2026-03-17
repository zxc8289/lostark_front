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

    // 🔥 정렬용: 일반 골드와 귀속 골드를 합산해서 계산
    if (typeof d.gold === "number") return d.gold + (d.boundGold ?? 0);
    return (d.gates ?? []).reduce((sum, g) => sum + (g.gold ?? 0) + (g.boundGold ?? 0), 0);
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

export type RaidSummary = {
    totalRemainingTasks: number;
    remainingCharacters: number;
    totalRemainingGold: number;
    totalGold: number;
    totalRemainingBoundGold: number; // 🔥 추가
    totalBoundGold: number;          // 🔥 추가
};

/**
 * 하나의 roster + prefsByChar 에 대한
 * - 남은 숙제 수
 * - 숙제 남은 캐릭 수
 * - 남은 골드 / 전체 골드
 * 공통 계산 로직
 */
export function computeRaidSummaryForRoster(
    roster: RosterCharacter[],
    prefsByChar: Record<string, CharacterTaskPrefs>,
    goldDesignatedByChar?: Record<string, boolean>,
): RaidSummary {
    let taskCount = 0;
    let charCount = 0;
    let goldRemain = 0;
    let goldTotal = 0;
    let boundGoldRemain = 0;
    let boundGoldTotal = 0;

    for (const char of roster) {
        const prefs = prefsByChar[char.name];
        if (!prefs) continue;
        const isGoldEarn = goldDesignatedByChar ? (goldDesignatedByChar[char.name] ?? false) : true;

        let hasRemainingForChar = false;

        for (const [raidName, p] of Object.entries(prefs.raids)) {
            if (!p?.enabled) continue;

            const info = raidInformation[raidName];
            if (!info) continue;

            const diffInfo = info.difficulty[p.difficulty];
            const gatesDef = diffInfo?.gates ?? [];
            if (!diffInfo || !gatesDef.length) continue;

            const gates = p.gates ?? [];
            const isBonus = p.isBonus ?? false;

            // 전체 골드 계산
            let totalGoldForRaid = 0;
            let totalBoundGoldForRaid = 0;
            gatesDef.forEach((g) => {
                // 🔥 수정된 부분: (isGoldEarn && p.isGold) 로 체크
                const baseGold = (isGoldEarn && p.isGold) ? (g.gold ?? 0) : 0;
                const bGold = (isGoldEarn && p.isGold) ? (g.boundGold ?? 0) : 0;
                let cost = isBonus ? (g.bonusCost ?? 0) : 0;

                const netBoundGold = Math.max(0, bGold - cost);
                cost = Math.max(0, cost - bGold);
                const netGold = Math.max(0, baseGold - cost);

                totalGoldForRaid += netGold;
                totalBoundGoldForRaid += netBoundGold;
            });

            // 완료한 관문 골드 계산
            let selectedGoldForRaid = 0;
            let selectedBoundGoldForRaid = 0;
            gates.forEach((gi) => {
                const g = gatesDef.find((x) => x.index === gi);
                if (!g) return;

                // 🔥 수정된 부분: (isGoldEarn && p.isGold) 로 체크
                const baseGold = (isGoldEarn && p.isGold) ? (g.gold ?? 0) : 0;
                const bGold = (isGoldEarn && p.isGold) ? (g.boundGold ?? 0) : 0;
                let cost = isBonus ? (g.bonusCost ?? 0) : 0;

                const netBoundGold = Math.max(0, bGold - cost);
                cost = Math.max(0, cost - bGold);
                const netGold = Math.max(0, baseGold - cost);

                selectedGoldForRaid += netGold;
                selectedBoundGoldForRaid += netBoundGold;
            });

            // 누적 합산 (기존과 동일)
            goldRemain += Math.max(0, totalGoldForRaid - selectedGoldForRaid);
            goldTotal += totalGoldForRaid;

            boundGoldRemain += Math.max(0, totalBoundGoldForRaid - selectedBoundGoldForRaid);
            boundGoldTotal += totalBoundGoldForRaid;

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
        totalRemainingBoundGold: boundGoldRemain,
        totalBoundGold: boundGoldTotal,
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
    // 기존 설정은 다 disable + gates 초기화 + 골드 체크 해제
    for (const [raidName, pref] of Object.entries(updatedRaids)) {
        updatedRaids[raidName] = {
            ...pref,
            enabled: false,
            gates: [],
            isBonus: false,
            isGold: false, // 🔥 초기화할 때 골드 지정도 함께 끕니다.
        };
    }

    // 상위 3개만 enable & 골드 켜기
    for (const { raidName, difficulty } of top3) {
        updatedRaids[raidName] = {
            ...(updatedRaids[raidName] ?? { gates: [] }),
            enabled: true,
            difficulty,
            isGold: true, // 🔥 자동으로 선택된 3개 레이드는 기본적으로 골드 지정(isGold)을 켜줍니다.
        };
    }

    const order = top3.map((x) => x.raidName);

    return { raids: updatedRaids, order };
}

/* 여기부터 새로 추가된 자동 세팅 결과 타입 */


/**
 * 아이템 레벨 상위 N캐릭 + 각 캐릭터 Top3 레이드 자동 세팅
 * - 공통으로 MyTasks / Party 페이지 양쪽에서 사용
 */
export type AutoSetupResult = {
    nextPrefsByChar: Record<string, CharacterTaskPrefs>;
    nextVisibleByChar: Record<string, boolean>;
    nextGoldByChar: Record<string, boolean>; // 🔥 추가
};

export function buildAutoSetupForRoster(
    roster: RosterCharacter[],
    prevPrefsByChar: Record<string, CharacterTaskPrefs>,
    charCount: number = 6
): AutoSetupResult {
    if (!roster.length) {
        return {
            nextPrefsByChar: { ...prevPrefsByChar },
            nextVisibleByChar: {},
            nextGoldByChar: {}, // 🔥 추가
        };
    }

    const sorted = [...roster].sort(
        (a, b) => (b.itemLevelNum ?? 0) - (a.itemLevelNum ?? 0)
    );

    // 1. 화면에 표시할 캐릭터 (예: 12개)
    const targetCharacters = sorted.slice(0, Math.max(0, charCount));
    const targetNames = new Set(targetCharacters.map((c) => c.name));

    // 2. 골드 지정을 켤 캐릭터 (표시 대상 중 최대 6캐릭으로 제한)
    const goldTargetCharacters = targetCharacters.slice(0, 6);
    const goldTargetNames = new Set(goldTargetCharacters.map((c) => c.name));

    const nextVisibleByChar: Record<string, boolean> = {};
    const nextGoldByChar: Record<string, boolean> = {}; // 🔥 추가

    for (const c of roster) {
        nextVisibleByChar[c.name] = targetNames.has(c.name);
        nextGoldByChar[c.name] = goldTargetNames.has(c.name); // 🔥 자동 세팅 시 골드 지정은 최대 6캐릭만
    }

    const nextPrefsByChar: Record<string, CharacterTaskPrefs> = {
        ...prevPrefsByChar,
    };

    for (const c of targetCharacters) {
        const ilvlNum = c.itemLevelNum ?? 0;
        const prevPrefs = nextPrefsByChar[c.name] ?? { raids: {} };
        nextPrefsByChar[c.name] = autoSelectTop3Raids(ilvlNum, prevPrefs);
    }

    return {
        nextPrefsByChar,
        nextVisibleByChar,
        nextGoldByChar, // 🔥 추가
    };
}


/**
 * 기존 유저 데이터 호환(마이그레이션) 함수
 * isGold 속성이 없는 과거 데이터인 경우, 켜져있는 레이드 중 상위 3개를 찾아 isGold: true로 맞춰줍니다.
 */
export function migrateLegacyPrefs(prefs: CharacterTaskPrefs): CharacterTaskPrefs {
    if (!prefs || !prefs.raids) return prefs;

    // 이미 isGold가 명시적으로 true인 레이드가 하나라도 있다면 최신 데이터이므로 그대로 통과
    const hasGoldSet = Object.values(prefs.raids).some((r: any) => r.isGold === true);
    if (hasGoldSet) return prefs;

    // 과거 데이터 처리: 켜져있는(enabled) 레이드 중 골드량이 높은 상위 3개 추출
    const nextRaids: any = { ...prefs.raids };
    const enabledRaids = Object.entries(nextRaids)
        .filter(([_, r]: [string, any]) => r.enabled)
        .map(([raidName, r]: [string, any]) => {
            const info = raidInformation[raidName];
            const diffInfo = info?.difficulty[r.difficulty as DifficultyKey];
            // 난이도별 총 획득 골드 계산
            const totalGold = (diffInfo?.gates ?? []).reduce((sum: number, g: any) => sum + (g.gold || 0), 0);
            return { raidName, totalGold };
        })
        .sort((a, b) => b.totalGold - a.totalGold) // 골드 높은 순 정렬
        .slice(0, 3); // 최대 3개까지만 자르기

    // 추출된 상위 3개는 isGold: true 부여
    enabledRaids.forEach(({ raidName }) => {
        nextRaids[raidName] = { ...nextRaids[raidName], isGold: true };
    });

    // 나머지는 명시적으로 isGold: false 부여하여 데이터 규격 통일
    Object.keys(nextRaids).forEach((raidName) => {
        if (nextRaids[raidName].isGold !== true) {
            nextRaids[raidName] = { ...nextRaids[raidName], isGold: false };
        }
    });

    return { ...prefs, raids: nextRaids };
}