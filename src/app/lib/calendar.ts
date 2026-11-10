export type RewardItem = { name: string; icon: string; grade: string };
export type IslandItem = { name: string; image: string; times: string[]; isGoldIsland: boolean; rewardItems: RewardItem[] };
export type CalendarSchedule = {
    targetDate: string;
    islands: IslandItem[];
    hasFieldBoss: boolean;
    hasChaosGate: boolean;
    bossTimes: string[];
    gateTimes: string[];
    bossImage: string | null;
    gateImage: string | null;
};
export type CalendarContent = {
    CategoryName: string;
    ContentsName: string;
    ContentsIcon: string;
    StartTimes?: string[] | null;
    RewardItems?: { Items?: { Name: string; Icon: string; Grade: string }[] | null }[] | null;
};

export function getGameDateString(now: Date) {
    // Korean game days reset at 06:00 KST, regardless of the browser/server zone.
    return new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function gameTimeMinutes(time: string) {
    const [hours, minutes] = time.split(":").map(Number);
    return (hours < 6 ? hours + 24 : hours) * 60 + minutes;
}

export function sortGameTimes(times: string[]) {
    return [...new Set(times)].sort((a, b) => gameTimeMinutes(a) - gameTimeMinutes(b));
}

export function isCalendarDate(date: string) {
    return /^\d{4}-\d{2}-\d{2}$/.test(date)
        && Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date;
}

export function buildCalendarSchedule(data: CalendarContent[], date: string): CalendarSchedule {
    const nextDate = new Date(`${date}T00:00:00Z`);
    nextDate.setUTCDate(nextDate.getUTCDate() + 1);
    const start = `${date}T06:00:00`;
    const end = `${nextDate.toISOString().slice(0, 10)}T06:00:00`;
    const result: CalendarSchedule = { targetDate: date, islands: [], hasFieldBoss: false, hasChaosGate: false, bossTimes: [], gateTimes: [], bossImage: null, gateImage: null };
    const islands = new Map<string, IslandItem>();

    for (const content of data) {
        const times = sortGameTimes((content.StartTimes ?? [])
            .filter(time => time >= start && time < end)
            .map(time => {
                let [hours, minutes] = time.slice(11, 16).split(":").map(Number);
                // Preserve the existing spawn-time display adjustment.
                if (minutes >= 40) { hours++; minutes = 0; }
                return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
            }));
        if (!times.length) continue;
        if (content.CategoryName === "필드보스") {
            result.bossTimes.push(...times);
            result.bossImage ||= content.ContentsIcon;
        } else if (content.CategoryName === "카오스게이트") {
            result.gateTimes.push(...times);
            result.gateImage ||= content.ContentsIcon;
        } else if (content.CategoryName === "모험 섬") {
            const existing = islands.get(content.ContentsName);
            const rewards = (content.RewardItems ?? []).flatMap(group => group.Items ?? []);
            const rewardItems = [...new Map([
                ...(existing?.rewardItems ?? []),
                ...rewards.map(item => ({ name: item.Name, icon: item.Icon, grade: item.Grade })),
            ].map(item => [`${item.name}-${item.icon}`, item])).values()];
            islands.set(content.ContentsName, {
                name: content.ContentsName, image: content.ContentsIcon,
                times: sortGameTimes([...(existing?.times ?? []), ...times]),
                rewardItems,
                isGoldIsland: rewardItems.some(item => item.name.includes("골드")),
            });
        }
    }
    result.islands = [...islands.values()].sort((a, b) => gameTimeMinutes(a.times[0]) - gameTimeMinutes(b.times[0]));
    result.bossTimes = sortGameTimes(result.bossTimes);
    result.gateTimes = sortGameTimes(result.gateTimes);
    // Use the official dates directly; fixed weekday rules can hide special schedules.
    result.hasFieldBoss = result.bossTimes.length > 0;
    result.hasChaosGate = result.gateTimes.length > 0;
    return result;
}

export async function fetchCalendarDate(date: string, signal: AbortSignal): Promise<CalendarSchedule> {
    for (let attempt = 0; ; attempt++) {
        try {
            signal.throwIfAborted();
            const response = await fetch(`/api/lostark/calendar?date=${encodeURIComponent(date)}`, { signal, cache: "no-store" });
            if (!response.ok) {
                if (attempt === 0 && (response.status === 429 || response.status >= 500)) continue;
                throw new Error("일정을 불러오지 못했습니다.");
            }
            const data: CalendarSchedule = await response.json();
            signal.throwIfAborted();
            if (data.targetDate !== date || !Array.isArray(data.islands) || !Array.isArray(data.bossTimes) || !Array.isArray(data.gateTimes)) throw new Error("잘못된 일정 응답입니다.");
            return data;
        } catch (error) {
            if (signal.aborted || attempt > 0) throw error;
        }
    }
}
