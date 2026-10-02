import { raidInformation, type DifficultyKey } from "@/server/data/raids";

export type GateDifficulties = Partial<Record<number, DifficultyKey>>;
export type RaidDifficultySelection = {
    difficulty: DifficultyKey;
    gateDifficulties?: GateDifficulties;
};

export function getGateDifficulty(selection: RaidDifficultySelection, gate: number): DifficultyKey {
    return selection.gateDifficulties?.[gate] ?? selection.difficulty;
}

export function getRaidGateIndices(raidName: string): number[] {
    const info = raidInformation[raidName];
    if (!info) return [];
    return [...new Set(Object.values(info.difficulty).flatMap(diff => diff?.gates.map(gate => gate.index) ?? []))]
        .sort((a, b) => a - b);
}

export function getSelectedRaidGates(raidName: string, selection: RaidDifficultySelection) {
    const info = raidInformation[raidName];
    if (!info) return [];
    return getRaidGateIndices(raidName).flatMap(index => {
        const difficulty = getGateDifficulty(selection, index);
        const gate = info.difficulty[difficulty]?.gates.find(candidate => candidate.index === index);
        return gate ? [{ ...gate, difficulty }] : [];
    });
}

export function getSelectionLevel(raidName: string, selection: RaidDifficultySelection): number {
    const info = raidInformation[raidName];
    if (!info) return 0;
    return Math.max(0, ...getSelectedRaidGates(raidName, selection).map(gate => info.difficulty[gate.difficulty]?.level ?? 0));
}

export function hasMatchingGateDifficulties(
    raidName: string,
    left: RaidDifficultySelection,
    right: RaidDifficultySelection,
): boolean {
    const leftGates = getSelectedRaidGates(raidName, left);
    const rightGates = getSelectedRaidGates(raidName, right);
    return leftGates.length > 0 && leftGates.length === rightGates.length
        && leftGates.every((gate, index) => gate.index === rightGates[index].index && gate.difficulty === rightGates[index].difficulty);
}

export function getSelectionSignature(raidName: string, selection: RaidDifficultySelection): string {
    return getSelectedRaidGates(raidName, selection).map(gate => `${gate.index}:${gate.difficulty}`).join("|");
}

export function getSelectionLabel(raidName: string, selection: RaidDifficultySelection): string {
    const gates = getSelectedRaidGates(raidName, selection);
    const labels = gates.map(gate => gate.difficulty);
    const display = (difficulty: DifficultyKey) => raidName === "지평의 성당"
        ? ({ 노말: "1단계", 하드: "2단계", 나메: "3단계", 싱글: "싱글" } as const)[difficulty]
        : difficulty;
    if (new Set(labels).size <= 1) return display(labels[0] ?? selection.difficulty);
    return gates.map((gate, index) => `${gate.index}관 ${display(labels[index])}`).join(" · ");
}
