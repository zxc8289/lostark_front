export type GeneralTaskStatus = {
    maxRuns: number;
    completedRuns: number;
    restGauge: number;
    period: "DAILY" | "WEEKLY";
};

export type GeneralTasksData = Record<string, Record<string, GeneralTaskStatus>>;

export type LocalGeneralStorage = {
    lastUpdated: number;
    tasks: GeneralTasksData;
};

// 🔥 [핵심 추가] 현재 화면에 보여줄 남은 휴식 게이지 계산
export function getVisualRestGauge(baseGauge: number, completedRuns: number): number {
    let currentGauge = baseGauge || 0;
    for (let i = 0; i < completedRuns; i++) {
        if (currentGauge >= 40) {
            currentGauge -= 40;
        }
    }
    return currentGauge;
}

export function getPassedResetDays(lastUpdatedMs: number, currentMs: number): number {
    const KST_OFFSET = 9 * 60 * 60 * 1000;
    const RESET_OFFSET = 6 * 60 * 60 * 1000;

    const lastDate = new Date(lastUpdatedMs + KST_OFFSET - RESET_OFFSET);
    const currentDate = new Date(currentMs + KST_OFFSET - RESET_OFFSET);

    lastDate.setUTCHours(0, 0, 0, 0);
    currentDate.setUTCHours(0, 0, 0, 0);

    const diffTime = currentDate.getTime() - lastDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    return diffDays > 0 ? diffDays : 0;
}

export function hasWednesdayResetPassed(lastUpdatedMs: number, currentMs: number): boolean {
    const KST_OFFSET = 9 * 60 * 60 * 1000;
    const RESET_OFFSET = 6 * 60 * 60 * 1000;

    const lastDate = new Date(lastUpdatedMs + KST_OFFSET - RESET_OFFSET);
    const currentDate = new Date(currentMs + KST_OFFSET - RESET_OFFSET);

    const lastWednesday = new Date(lastDate);
    lastWednesday.setDate(lastDate.getDate() - ((lastDate.getDay() + 4) % 7));
    lastWednesday.setUTCHours(0, 0, 0, 0);

    const nextWednesday = new Date(lastWednesday);
    nextWednesday.setDate(lastWednesday.getDate() + 7);

    return currentDate.getTime() >= nextWednesday.getTime();
}

export function calculateAllGeneralTasks(savedData: LocalGeneralStorage): LocalGeneralStorage {
    const now = Date.now();
    const passedDays = getPassedResetDays(savedData.lastUpdated, now);
    const isWeeklyReset = hasWednesdayResetPassed(savedData.lastUpdated, now);

    if (passedDays === 0 && !isWeeklyReset) return savedData;

    const nextTasks = JSON.parse(JSON.stringify(savedData.tasks)) as GeneralTasksData;

    for (const charName in nextTasks) {
        for (const taskName in nextTasks[charName]) {
            const task = nextTasks[charName][taskName];

            if (task.period === "DAILY" && passedDays > 0) {
                if (taskName === "에포나 의뢰") {
                    task.completedRuns = 0;
                    continue;
                }

                // 🔥 어제 소모하고 "최종적으로 남았던 게이지"를 베이스로 잡음
                const leftoverGauge = getVisualRestGauge(task.restGauge, task.completedRuns);

                const missedRunsYesterday = Math.max(0, task.maxRuns - task.completedRuns);
                const totalMissedRuns = missedRunsYesterday + ((passedDays - 1) * task.maxRuns);
                const addedGauge = totalMissedRuns * 20;

                // 남은 게이지 + 새로 추가될 게이지 (최대 200)
                task.restGauge = Math.min(200, leftoverGauge + addedGauge);
                task.completedRuns = 0;
            }

            if (task.period === "WEEKLY" && isWeeklyReset) {
                task.completedRuns = 0;
            }
        }
    }

    return {
        lastUpdated: now,
        tasks: nextTasks,
    };
}