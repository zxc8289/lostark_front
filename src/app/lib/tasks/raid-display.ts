export function getRaidDifficultyLabel(raidName: string, difficulty: string) {
    if (raidName === "지평의 성당") {
        if (difficulty === "노말") return "1단계";
        if (difficulty === "하드") return "2단계";
        if (difficulty === "나메") return "3단계";
    }

    return difficulty;
}
