import { raidInformation, type DifficultyKey, type RaidKind } from "@/server/data/raids";

export type WeeklyGoldSortMode = "gold" | "latest";

export type WeeklyGoldRaidOption = {
    id: string;
    raidName: string;
    difficulty: DifficultyKey;
    kind: RaidKind;
    level: number;
    gold: number;
    boundGold: number;
    totalGold: number;
    releaseDate: string;
};

export type WeeklyGoldCharacterInput = {
    id: string;
    name: string;
    itemLevel: number;
    raidIds: string[];
    earnsGold: boolean;
};

export type WeeklyGoldCharacterResult = {
    id: string;
    name: string;
    itemLevel: number;
    earnsGold: boolean;
    raids: WeeklyGoldRaidOption[];
    gold: number;
    boundGold: number;
    totalGold: number;
};

export type WeeklyGoldRosterResult = {
    characters: WeeklyGoldCharacterResult[];
    gold: number;
    boundGold: number;
    totalGold: number;
    countedCharacters: number;
    selectedRaidCount: number;
};

export function makeWeeklyGoldRaidId(raidName: string, difficulty: DifficultyKey) {
    return `${raidName}__${difficulty}`;
}

function sumGateGold(
    gates: { gold?: number; boundGold?: number }[] | undefined,
    key: "gold" | "boundGold"
) {
    return (gates ?? []).reduce((sum, gate) => sum + (gate[key] ?? 0), 0);
}

export function getWeeklyGoldRaidOptions(): WeeklyGoldRaidOption[] {
    return Object.entries(raidInformation)
        .flatMap(([raidName, raid]) =>
            (Object.entries(raid.difficulty) as [DifficultyKey, NonNullable<(typeof raid.difficulty)[DifficultyKey]>][])
                .filter(([, difficulty]) => !!difficulty)
                .map(([difficulty, info]) => {
                    const gold = typeof info.gold === "number" ? info.gold : sumGateGold(info.gates, "gold");
                    const boundGold = typeof info.boundGold === "number" ? info.boundGold : sumGateGold(info.gates, "boundGold");

                    return {
                        id: makeWeeklyGoldRaidId(raidName, difficulty),
                        raidName,
                        difficulty,
                        kind: raid.kind,
                        level: info.level,
                        gold,
                        boundGold,
                        totalGold: gold + boundGold,
                        releaseDate: raid.releaseDate,
                    };
                })
        )
        .filter((option) => option.totalGold > 0)
        .sort((a, b) => {
            if (b.level !== a.level) return b.level - a.level;
            if (b.totalGold !== a.totalGold) return b.totalGold - a.totalGold;
            return b.releaseDate.localeCompare(a.releaseDate);
        });
}

export function recommendWeeklyGoldRaids(
    itemLevel: number,
    options: WeeklyGoldRaidOption[],
    sortMode: WeeklyGoldSortMode = "gold",
    limit = 3
) {
    const bestByRaid = new Map<string, WeeklyGoldRaidOption>();

    options.forEach((option) => {
        if (option.level > itemLevel) return;

        const current = bestByRaid.get(option.raidName);
        if (!current) {
            bestByRaid.set(option.raidName, option);
            return;
        }

        if (option.level > current.level) {
            bestByRaid.set(option.raidName, option);
            return;
        }

        if (option.level === current.level && option.totalGold > current.totalGold) {
            bestByRaid.set(option.raidName, option);
        }
    });

    return Array.from(bestByRaid.values())
        .sort((a, b) => {
            if (sortMode === "latest") {
                if (b.releaseDate !== a.releaseDate) return b.releaseDate.localeCompare(a.releaseDate);
                if (b.level !== a.level) return b.level - a.level;
                return b.totalGold - a.totalGold;
            }

            if (b.totalGold !== a.totalGold) return b.totalGold - a.totalGold;
            if (b.level !== a.level) return b.level - a.level;
            return b.releaseDate.localeCompare(a.releaseDate);
        })
        .slice(0, limit);
}

export function calculateWeeklyGoldRoster(
    characters: WeeklyGoldCharacterInput[],
    options: WeeklyGoldRaidOption[],
    goldLimitEnabled: boolean
): WeeklyGoldRosterResult {
    const optionMap = new Map(options.map((option) => [option.id, option]));
    let gold = 0;
    let boundGold = 0;
    let selectedRaidCount = 0;
    let countedCharacters = 0;

    const results = characters.map((character) => {
        const raids = Array.from(new Set(character.raidIds))
            .map((raidId) => optionMap.get(raidId))
            .filter((option): option is WeeklyGoldRaidOption => !!option)
            .slice(0, 3);
        const earnsGold = goldLimitEnabled ? character.earnsGold : true;
        const characterGold = earnsGold ? raids.reduce((sum, raid) => sum + raid.gold, 0) : 0;
        const characterBoundGold = earnsGold ? raids.reduce((sum, raid) => sum + raid.boundGold, 0) : 0;

        if (earnsGold && raids.length > 0) countedCharacters += 1;
        selectedRaidCount += raids.length;
        gold += characterGold;
        boundGold += characterBoundGold;

        return {
            id: character.id,
            name: character.name,
            itemLevel: character.itemLevel,
            earnsGold,
            raids,
            gold: characterGold,
            boundGold: characterBoundGold,
            totalGold: characterGold + characterBoundGold,
        };
    });

    return {
        characters: results,
        gold,
        boundGold,
        totalGold: gold + boundGold,
        countedCharacters,
        selectedRaidCount,
    };
}
