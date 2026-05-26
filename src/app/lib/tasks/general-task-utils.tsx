export type GeneralTaskStatus = {
    maxRuns: number;
    completedRuns: number;
    restGauge: number;
    period: "DAILY" | "WEEKLY";

    // 체크할 때 실제로 소모한 휴식게이지
    // 예: restGauge 20에서 체크하면 0, restGauge 40 이상에서 체크하면 40
    usedRestGauge?: number;
};

export type GeneralTasksData = Record<string, Record<string, GeneralTaskStatus>>;

export type LocalGeneralStorage = {
    lastUpdated: number;
    tasks: GeneralTasksData;
};

const REST_GAUGE_TASKS = ["혼돈의 균열", "가디언 토벌"];

const DAILY_REST_GAIN = 20;
const MIN_REST_GAUGE = 0;
const MAX_REST_GAUGE = 200;

const DAY_MS = 24 * 60 * 60 * 1000;
const KST_OFFSET = 9 * 60 * 60 * 1000;
const RESET_OFFSET = 6 * 60 * 60 * 1000;

// 1970-01-01은 목요일.
// 1970-01-07은 수요일이므로 dayIndex 기준 수요일 offset은 6.
const EPOCH_WEDNESDAY_DAY_INDEX = 6;

function isRestGaugeTask(taskName: string) {
    return REST_GAUGE_TASKS.includes(taskName);
}

function clampRestGauge(value: number) {
    return Math.max(MIN_REST_GAUGE, Math.min(MAX_REST_GAUGE, value));
}

// KST 오전 6시를 하루 시작점으로 보는 날짜 번호
function getKstResetDayIndex(ms: number): number {
    return Math.floor((ms + KST_OFFSET - RESET_OFFSET) / DAY_MS);
}

// KST 수요일 오전 6시를 주간 시작점으로 보는 주차 번호
function getKstWednesdayResetWeekIndex(ms: number): number {
    const resetDayIndex = getKstResetDayIndex(ms);
    return Math.floor((resetDayIndex - EPOCH_WEDNESDAY_DAY_INDEX) / 7);
}

// restGauge는 "현재 실제 휴식게이지"로 저장함.
// 그래서 completedRuns 기준으로 여기서 또 40을 빼면 안 됨.
export function getVisualRestGauge(
    baseGauge: number,
    completedRuns?: number
): number {
    return clampRestGauge(baseGauge || 0);
}

// KST 기준 매일 오전 6시가 몇 번 지났는지 계산
export function getPassedResetDays(
    lastUpdatedMs: number,
    currentMs: number
): number {
    const lastDayIndex = getKstResetDayIndex(lastUpdatedMs);
    const currentDayIndex = getKstResetDayIndex(currentMs);

    const diffDays = currentDayIndex - lastDayIndex;

    return diffDays > 0 ? diffDays : 0;
}

// KST 기준 수요일 오전 6시 주간 초기화 여부 계산
export function hasWednesdayResetPassed(
    lastUpdatedMs: number,
    currentMs: number
): boolean {
    const lastWeekIndex = getKstWednesdayResetWeekIndex(lastUpdatedMs);
    const currentWeekIndex = getKstWednesdayResetWeekIndex(currentMs);

    return currentWeekIndex > lastWeekIndex;
}

export function calculateAllGeneralTasks(
    savedData: LocalGeneralStorage
): LocalGeneralStorage {
    const now = Date.now();

    const lastUpdated =
        typeof savedData.lastUpdated === "number" &&
            Number.isFinite(savedData.lastUpdated)
            ? savedData.lastUpdated
            : now;

    const passedDays = getPassedResetDays(lastUpdated, now);
    const isWeeklyReset = hasWednesdayResetPassed(lastUpdated, now);

    if (passedDays === 0 && !isWeeklyReset) {
        return savedData;
    }

    const nextTasks = JSON.parse(
        JSON.stringify(savedData.tasks || {})
    ) as GeneralTasksData;

    for (const charName in nextTasks) {
        for (const taskName in nextTasks[charName]) {
            const task = nextTasks[charName][taskName];

            if (task.period === "DAILY" && passedDays > 0) {
                // 에포나는 휴식게이지 없이 일일 체크만 초기화
                if (taskName === "에포나 의뢰") {
                    task.completedRuns = 0;
                    task.usedRestGauge = 0;
                    continue;
                }

                // 혼돈의 균열 / 가디언 토벌 휴식게이지 처리
                if (isRestGaugeTask(taskName)) {
                    const currentGauge = clampRestGauge(task.restGauge || 0);

                    /*
                     * 1. 체크한 상태로 오전 6시가 지나면:
                     *    - completedRuns만 0으로 초기화
                     *    - 체크할 때 소모된 휴식게이지는 복구하지 않음
                     *    - usedRestGauge만 0으로 비움
                     *
                     * 2. 안 돌고 오전 6시가 지나면:
                     *    - 하루당 +20
                     */

                    const didRunBeforeFirstReset = task.completedRuns > 0;

                    const firstResetMissedDays = didRunBeforeFirstReset ? 0 : 1;
                    const additionalMissedDays = Math.max(0, passedDays - 1);

                    const totalMissedDays =
                        firstResetMissedDays + additionalMissedDays;

                    task.restGauge = clampRestGauge(
                        currentGauge + totalMissedDays * DAILY_REST_GAIN
                    );

                    task.completedRuns = 0;
                    task.usedRestGauge = 0;
                    continue;
                }

                // 그 외 일일 숙제는 체크만 초기화
                task.completedRuns = 0;
                task.usedRestGauge = 0;
            }

            // 낙원의 문 / 할의 모래시계 같은 주간 숙제는
            // 수요일 오전 6시가 지나야만 초기화
            if (task.period === "WEEKLY" && isWeeklyReset) {
                task.completedRuns = 0;
                task.usedRestGauge = 0;
            }
        }
    }

    return {
        lastUpdated: now,
        tasks: nextTasks,
    };
}