// raidInformation.ts

export type RaidKind = "군단장" | "카제로스" | "어비스" | "에픽" | "그림자";
export type DifficultyKey = "노말" | "하드" | "나메" | "싱글";

type Gate = {
    index: number;
    name: string;
    gold: number;
    boundGold: number;
    bonusCost: number;
    rewards: string;       // 고정 보상
    bonusRewards: string;  // 더보기 보상
};

type Difficulty = {
    level: number;
    gold: number;
    boundGold: number;
    gates: Gate[]
};

export const raidInformation: Record<
    string,
    {
        kind: RaidKind;
        gates: number;
        difficulty: Partial<Record<DifficultyKey, Difficulty>>;
        releaseDate: string;
    }
> = {
    "발탄": {
        kind: "군단장",
        releaseDate: "2021-01-13",
        gates: 2,
        difficulty: {
            "싱글": {
                level: 1415,
                gold: 0,
                boundGold: 1200,
                gates: [
                    { index: 1, name: "1관문", gold: 0, boundGold: 500, bonusCost: 75, rewards: "정제된 파괴강석 8개, 정제된 수호강석 16개, 찬명돌 1개", bonusRewards: "정제된 파괴강석 11개, 정제된 수호강석 22개, 찬명돌 1개" },
                    { index: 2, name: "2관문", gold: 0, boundGold: 700, bonusCost: 100, rewards: "정제된 파괴강석 10개, 정제된 수호강석 20개, 찬명돌 1개", bonusRewards: "정제된 파괴강석 14개, 정제된 수호강석 28개, 찬명돌 1개" },
                ],
            },
            "노말": {
                level: 1415,
                gold: 0,
                boundGold: 1200,
                gates: [
                    { index: 1, name: "1관문", gold: 0, boundGold: 500, bonusCost: 75, rewards: "정제된 파괴강석 8개, 정제된 수호강석 16개, 찬명돌 1개", bonusRewards: "정제된 파괴강석 11개, 정제된 수호강석 22개, 찬명돌 1개" },
                    { index: 2, name: "2관문", gold: 0, boundGold: 7000, bonusCost: 100, rewards: "정제된 파괴강석 10개, 정제된 수호강석 20개, 찬명돌 1개", bonusRewards: "정제된 파괴강석 14개, 정제된 수호강석 28개, 찬명돌 1개" },
                ],
            },
            "하드": {
                level: 1445,
                gold: 0,
                boundGold: 1800,
                gates: [
                    { index: 1, name: "1관문", gold: 0, boundGold: 700, bonusCost: 175, rewards: "정제된 파괴강석 10개, 정제된 수호강석 20개, 찬명돌 1개", bonusRewards: "정제된 파괴강석 14개, 정제된 수호강석 28개, 찬명돌 1개" },
                    { index: 2, name: "2관문", gold: 0, boundGold: 1100, bonusCost: 275, rewards: "정제된 파괴강석 12개, 정제된 수호강석 24개, 찬명돌 1개", bonusRewards: "정제된 파괴강석 19개, 정제된 수호강석 38개, 찬명돌 1개" },
                ],
            },
        },
    },

    "비아키스": {
        kind: "군단장",
        releaseDate: "2021-02-04",
        gates: 2,
        difficulty: {
            "싱글": {
                level: 1430,
                gold: 0,
                boundGold: 1600,
                gates: [
                    { index: 1, name: "1관문", gold: 0, boundGold: 600, bonusCost: 100, rewards: "정제된 파괴강석 10개, 정제된 수호강석 20개, 찬명돌 1개", bonusRewards: "정제된 파괴강석 14개, 정제된 수호강석 28개, 찬명돌 1개" },
                    { index: 2, name: "2관문", gold: 0, boundGold: 1000, bonusCost: 150, rewards: "정제된 파괴강석 11개, 정제된 수호강석 22개, 찬명돌 1개", bonusRewards: "정제된 파괴강석 17개, 정제된 수호강석 34개, 찬명돌 1개" },
                ],
            },
            "노말": {
                level: 1430,
                gold: 0,
                boundGold: 1600,
                gates: [
                    { index: 1, name: "1관문", gold: 0, boundGold: 600, bonusCost: 100, rewards: "정제된 파괴강석 10개, 정제된 수호강석 20개, 찬명돌 1개", bonusRewards: "정제된 파괴강석 14개, 정제된 수호강석 28개, 찬명돌 1개" },
                    { index: 2, name: "2관문", gold: 0, boundGold: 1000, bonusCost: 150, rewards: "정제된 파괴강석 11개, 정제된 수호강석 22개, 찬명돌 1개", bonusRewards: "정제된 파괴강석 17개, 정제된 수호강석 34개, 찬명돌 1개" },
                ],
            },
            "하드": {
                level: 1460,
                gold: 0,
                boundGold: 2400,
                gates: [
                    { index: 1, name: "1관문", gold: 0, boundGold: 900, bonusCost: 225, rewards: "정제된 파괴강석 11개, 정제된 수호강석 22개, 찬명돌 1개", bonusRewards: "정제된 파괴강석 18개, 정제된 수호강석 36개, 찬명돌 1개" },
                    { index: 2, name: "2관문", gold: 0, boundGold: 1500, bonusCost: 375, rewards: "정제된 파괴강석 14개, 정제된 수호강석 28개, 찬명돌 1개", bonusRewards: "정제된 파괴강석 21개, 정제된 수호강석 42개, 찬명돌 1개" },
                ],
            },
        },
    },

    "쿠크세이튼": {
        kind: "군단장",
        releaseDate: "2021-04-28",
        gates: 3,
        difficulty: {
            "싱글": {
                level: 1475,
                gold: 0,
                boundGold: 3000,
                gates: [
                    { index: 1, name: "1관문", gold: 0, boundGold: 600, bonusCost: 100, rewards: "정제된 파괴강석 10개, 정제된 수호강석 20개, 찬명돌 1개", bonusRewards: "정제된 파괴강석 14개, 정제된 수호강석 28개, 찬명돌 1개" },
                    { index: 2, name: "2관문", gold: 0, boundGold: 900, bonusCost: 150, rewards: "정제된 파괴강석 10개, 정제된 수호강석 20개, 찬명돌 1개", bonusRewards: "정제된 파괴강석 19개, 정제된 수호강석 38개, 찬명돌 1개" },
                    { index: 3, name: "3관문", gold: 0, boundGold: 1500, bonusCost: 200, rewards: "정제된 파괴강석 11개, 정제된 수호강석 22개, 찬명돌 1개", bonusRewards: "정제된 파괴강석 24개, 정제된 수호강석 48개, 찬명돌 1개" },
                ],
            },
            "노말": {
                level: 1475,
                gold: 0,
                boundGold: 3000,
                gates: [
                    { index: 1, name: "1관문", gold: 0, boundGold: 600, bonusCost: 100, rewards: "정제된 파괴강석 10개, 정제된 수호강석 20개, 찬명돌 1개", bonusRewards: "정제된 파괴강석 14개, 정제된 수호강석 28개, 찬명돌 1개" },
                    { index: 2, name: "2관문", gold: 0, boundGold: 900, bonusCost: 150, rewards: "정제된 파괴강석 10개, 정제된 수호강석 20개, 찬명돌 1개", bonusRewards: "정제된 파괴강석 19개, 정제된 수호강석 38개, 찬명돌 1개" },
                    { index: 3, name: "3관문", gold: 0, boundGold: 1500, bonusCost: 200, rewards: "정제된 파괴강석 11개, 정제된 수호강석 22개, 찬명돌 1개", bonusRewards: "정제된 파괴강석 24개, 정제된 수호강석 48개, 찬명돌 1개" },
                ],
            },
        },
    },

    "아브렐슈드": {
        kind: "군단장",
        releaseDate: "2021-07-28",
        gates: 4,
        difficulty: {
            "싱글": {
                level: 1490,
                gold: 0,
                boundGold: 4600,
                gates: [
                    { index: 1, name: "1관문", gold: 0, boundGold: 1000, bonusCost: 100, rewards: "정제된 파괴강석 24개, 정제된 수호강석 48개, 찬명돌 1개", bonusRewards: "정제된 파괴강석 24개, 정제된 수호강석 48개, 찬명돌 1개" },
                    { index: 2, name: "2관문", gold: 0, boundGold: 1000, bonusCost: 150, rewards: "정제된 파괴강석 24개, 정제된 수호강석 48개, 찬명돌 1개", bonusRewards: "정제된 파괴강석 36개, 정제된 수호강석 72개, 찬명돌 2개" },
                    { index: 3, name: "3관문", gold: 0, boundGold: 1000, bonusCost: 200, rewards: "정제된 파괴강석 28개, 정제된 수호강석 56개, 찬명돌 1개", bonusRewards: "정제된 파괴강석 60개, 정제된 수호강석 120개, 찬명돌 3개" },
                    { index: 4, name: "4관문", gold: 0, boundGold: 1600, bonusCost: 375, rewards: "정제된 파괴강석 84개, 정제된 수호강석 168개, 찬명돌 1개", bonusRewards: "정제된 파괴강석 120개, 정제된 수호강석 240개, 찬명돌 5개" },
                ],
            },
            "노말": {
                level: 1490,
                gold: 0,
                boundGold: 4600,
                gates: [
                    { index: 1, name: "1관문", gold: 0, boundGold: 1000, bonusCost: 100, rewards: "정제된 파괴강석 24개, 정제된 수호강석 48개, 찬명돌 1개", bonusRewards: "정제된 파괴강석 24개, 정제된 수호강석 48개, 찬명돌 1개" },
                    { index: 2, name: "2관문", gold: 0, boundGold: 1000, bonusCost: 150, rewards: "정제된 파괴강석 24개, 정제된 수호강석 48개, 찬명돌 1개", bonusRewards: "정제된 파괴강석 36개, 정제된 수호강석 72개, 찬명돌 2개" },
                    { index: 3, name: "3관문", gold: 0, boundGold: 1000, bonusCost: 200, rewards: "정제된 파괴강석 28개, 정제된 수호강석 56개, 찬명돌 1개", bonusRewards: "정제된 파괴강석 60개, 정제된 수호강석 120개, 찬명돌 3개" },
                    { index: 4, name: "4관문", gold: 0, boundGold: 1600, bonusCost: 375, rewards: "정제된 파괴강석 84개, 정제된 수호강석 168개, 찬명돌 1개", bonusRewards: "정제된 파괴강석 120개, 정제된 수호강석 240개, 찬명돌 5개" },
                ],
            },
            "하드": {
                level: 1540,
                gold: 0,
                boundGold: 5600,
                gates: [
                    { index: 1, name: "1관문", gold: 0, boundGold: 1200, bonusCost: 300, rewards: "정제된 파괴강석 56개, 정제된 수호강석 112개, 찬명돌 1개", bonusRewards: "정제된 파괴강석 52개, 정제된 수호강석 104개, 찬명돌 2개" },
                    { index: 2, name: "2관문", gold: 0, boundGold: 1200, bonusCost: 300, rewards: "정제된 파괴강석 64개, 정제된 수호강석 128개, 찬명돌 1개", bonusRewards: "정제된 파괴강석 84개, 정제된 수호강석 168개, 찬명돌 3개" },
                    { index: 3, name: "3관문", gold: 0, boundGold: 1200, bonusCost: 300, rewards: "정제된 파괴강석 80개, 정제된 수호강석 160개, 찬명돌 1개", bonusRewards: "정제된 파괴강석 128개, 정제된 수호강석 256개, 찬명돌 4개" },
                    { index: 4, name: "4관문", gold: 0, boundGold: 2000, bonusCost: 500, rewards: "정제된 파괴강석 160개, 정제된 수호강석 320개, 찬명돌 1개", bonusRewards: "정제된 파괴강석 200개, 정제된 수호강석 400개, 찬명돌 8개" },
                ],
            },
        },
    },

    "일리아칸": {
        kind: "군단장",
        releaseDate: "2022-08-24",
        gates: 3,
        difficulty: {
            "싱글": {
                level: 1580,
                gold: 0,
                boundGold: 4700,
                gates: [
                    { index: 1, name: "1관문", gold: 0, boundGold: 850, bonusCost: 190, rewards: "정제된 파괴강석 140개, 정제된 수호강석 280개, 찬명돌 2개", bonusRewards: "정제된 파괴강석 140개, 정제된 수호강석 280개, 찬명돌 6개" },
                    { index: 2, name: "2관문", gold: 0, boundGold: 1550, bonusCost: 230, rewards: "정제된 파괴강석 180개, 정제된 수호강석 360개, 찬명돌 2개", bonusRewards: "정제된 파괴강석 160개, 정제된 수호강석 320개, 찬명돌 7개" },
                    { index: 3, name: "3관문", gold: 0, boundGold: 2300, bonusCost: 330, rewards: "정제된 파괴강석 260개, 정제된 수호강석 520개, 찬명돌 3개", bonusRewards: "정제된 파괴강석 230개, 정제된 수호강석 460개, 찬명돌 13개" },
                ],
            },
            "노말": {
                level: 1580,
                gold: 0,
                boundGold: 4700,
                gates: [
                    { index: 1, name: "1관문", gold: 0, boundGold: 850, bonusCost: 190, rewards: "정제된 파괴강석 140개, 정제된 수호강석 280개, 찬명돌 2개", bonusRewards: "정제된 파괴강석 140개, 정제된 수호강석 280개, 찬명돌 6개" },
                    { index: 2, name: "2관문", gold: 0, boundGold: 1550, bonusCost: 230, rewards: "정제된 파괴강석 180개, 정제된 수호강석 360개, 찬명돌 2개", bonusRewards: "정제된 파괴강석 160개, 정제된 수호강석 320개, 찬명돌 7개" },
                    { index: 3, name: "3관문", gold: 0, boundGold: 2300, bonusCost: 330, rewards: "정제된 파괴강석 260개, 정제된 수호강석 520개, 찬명돌 3개", bonusRewards: "정제된 파괴강석 230개, 정제된 수호강석 460개, 찬명돌 13개" },
                ],
            },
            "하드": {
                level: 1600,
                gold: 0,
                boundGold: 6000,
                gates: [
                    { index: 1, name: "1관문", gold: 0, boundGold: 1200, bonusCost: 300, rewards: "정제된 파괴강석 180개, 정제된 수호강석 360개, 찬명돌 3개", bonusRewards: "정제된 파괴강석 160개, 정제된 수호강석 320개, 찬명돌 8개" },
                    { index: 2, name: "2관문", gold: 0, boundGold: 2000, bonusCost: 500, rewards: "정제된 파괴강석 200개, 정제된 수호강석 400개, 찬명돌 3개", bonusRewards: "정제된 파괴강석 200개, 정제된 수호강석 400개, 찬명돌 10개" },
                    { index: 3, name: "3관문", gold: 0, boundGold: 2800, bonusCost: 700, rewards: "정제된 파괴강석 320개, 정제된 수호강석 640개, 찬명돌 4개", bonusRewards: "정제된 파괴강석 290개, 정제된 수호강석 580개, 찬명돌 15개" },
                ],
            },
        },
    },

    "카멘": {
        kind: "군단장",
        releaseDate: "2023-09-13",
        gates: 4,
        difficulty: {
            "싱글": {
                level: 1610,
                gold: 0,
                boundGold: 6400,
                gates: [
                    { index: 1, name: "1관문", gold: 0, boundGold: 1600, bonusCost: 360, rewards: "정제된 파괴강석 150개, 정제된 수호강석 300개, 찬명돌 5개", bonusRewards: "정제된 파괴강석 250개, 정제된 수호강석 500개, 찬명돌 9개" },
                    { index: 2, name: "2관문", gold: 0, boundGold: 2000, bonusCost: 440, rewards: "정제된 파괴강석 180개, 정제된 수호강석 360개, 찬명돌 5개", bonusRewards: "정제된 파괴강석 290개, 정제된 수호강석 580개, 찬명돌 12개" },
                    { index: 3, name: "3관문", gold: 0, boundGold: 2800, bonusCost: 640, rewards: "정제된 파괴강석 225개, 정제된 수호강석 450개, 찬명돌 6개", bonusRewards: "정제된 파괴강석 390개, 정제된 수호강석 780개, 찬명돌 13개" },
                ],
            },
            "노말": {
                level: 1610,
                gold: 0,
                boundGold: 6400,
                gates: [
                    { index: 1, name: "1관문", gold: 0, boundGold: 1600, bonusCost: 360, rewards: "정제된 파괴강석 150개, 정제된 수호강석 300개, 찬명돌 5개", bonusRewards: "정제된 파괴강석 250개, 정제된 수호강석 500개, 찬명돌 9개" },
                    { index: 2, name: "2관문", gold: 0, boundGold: 2000, bonusCost: 440, rewards: "정제된 파괴강석 180개, 정제된 수호강석 360개, 찬명돌 5개", bonusRewards: "정제된 파괴강석 290개, 정제된 수호강석 580개, 찬명돌 12개" },
                    { index: 3, name: "3관문", gold: 0, boundGold: 2800, bonusCost: 640, rewards: "정제된 파괴강석 225개, 정제된 수호강석 450개, 찬명돌 6개", bonusRewards: "정제된 파괴강석 390개, 정제된 수호강석 780개, 찬명돌 13개" },
                ],
            },
            "하드": {
                level: 1630,
                gold: 0,
                boundGold: 13000,
                gates: [
                    { index: 1, name: "1관문", gold: 0, boundGold: 2000, bonusCost: 500, rewards: "운명의 파괴석 80개, 운명의 수호석 160개, 운명의 돌파석 1개", bonusRewards: "운명의 파괴석 90개, 운명의 수호석 180개, 운명의 돌파석 1개" },
                    { index: 2, name: "2관문", gold: 0, boundGold: 2400, bonusCost: 600, rewards: "운명의 파괴석 90개, 운명의 수호석 180개, 운명의 돌파석 1개", bonusRewards: "운명의 파괴석 100개, 운명의 수호석 200개, 운명의 돌파석 2개" },
                    { index: 3, name: "3관문", gold: 0, boundGold: 3600, bonusCost: 900, rewards: "운명의 파괴석 100개, 운명의 수호석 200개, 운명의 돌파석 1개", bonusRewards: "운명의 파괴석 130개, 운명의 수호석 260개, 운명의 돌파석 3개" },
                    { index: 4, name: "4관문", gold: 0, boundGold: 5000, bonusCost: 1250, rewards: "운명의 파괴석 110개, 운명의 수호석 220개, 운명의 돌파석 1개", bonusRewards: "운명의 파괴석 180개, 운명의 수호석 360개, 운명의 돌파석 4개" },
                ],
            },
        },
    },

    "베히모스": {
        kind: "에픽",
        releaseDate: "2024-03-27",
        gates: 2,
        difficulty: {
            "노말": {
                level: 1640,
                gold: 7200,
                boundGold: 0,
                gates: [
                    { index: 1, name: "1관문", gold: 2200, boundGold: 0, bonusCost: 720, rewards: "운명의 파괴석 210개, 운명의 수호석 420개, 운명의 돌파석 2개, 베히모스의 비늘 10개", bonusRewards: "운명의 파괴석 240개, 운명의 수호석 480개, 운명의 돌파석 7개, 베히모스의 비늘 20개" },
                    { index: 2, name: "2관문", gold: 5000, boundGold: 0, bonusCost: 1630, rewards: "운명의 파괴석 270개, 운명의 수호석 540개, 운명의 돌파석 3개, 베히모스의 비늘 20개", bonusRewards: "운명의 파괴석 460개, 운명의 수호석 920개, 운명의 돌파석 20개, 베히모스의 비늘 40개" },
                ],
            },
        },
    },

    "서막-에키드나": {
        kind: "카제로스",
        releaseDate: "2024-01-31",
        gates: 2,
        difficulty: {
            "싱글": {
                level: 1620,
                gold: 0,
                boundGold: 6100,
                gates: [
                    { index: 1, name: "1관문", gold: 0, boundGold: 1900, bonusCost: 310, rewards: "운명의 파괴석 80개, 운명의 수호석 160개, 운명의 돌파석 1개, 아그리스의 비늘 6개", bonusRewards: "운명의 파괴석 90개, 운명의 수호석 180개, 운명의 돌파석 2개, 아그리스의 비늘 6개" },
                    { index: 2, name: "2관문", gold: 0, boundGold: 4200, bonusCost: 700, rewards: "운명의 파괴석 110개, 운명의 수호석 220개, 운명의 돌파석 1개, 아그리스의 비늘 12개", bonusRewards: "운명의 파괴석 160개, 운명의 수호석 320개, 운명의 돌파석 3개, 아그리스의 비늘 12개" },
                ],
            },
            "노말": {
                level: 1620,
                gold: 0,
                boundGold: 6100,
                gates: [
                    { index: 1, name: "1관문", gold: 0, boundGold: 1900, bonusCost: 310, rewards: "운명의 파괴석 80개, 운명의 수호석 160개, 운명의 돌파석 1개, 아그리스의 비늘 6개", bonusRewards: "운명의 파괴석 90개, 운명의 수호석 180개, 운명의 돌파석 2개, 아그리스의 비늘 6개" },
                    { index: 2, name: "2관문", gold: 0, boundGold: 4200, bonusCost: 700, rewards: "운명의 파괴석 110개, 운명의 수호석 220개, 운명의 돌파석 1개, 아그리스의 비늘 12개", bonusRewards: "운명의 파괴석 160개, 운명의 수호석 320개, 운명의 돌파석 3개, 아그리스의 비늘 12개" },
                ],
            },
            "하드": {
                level: 1630,
                gold: 7200,
                boundGold: 0,
                gates: [
                    { index: 1, name: "1관문", gold: 2200, boundGold: 0, bonusCost: 720, rewards: "운명의 파괴석 200개, 운명의 수호석 400개, 운명의 돌파석 2개, 알키오네의 눈 6개", bonusRewards: "운명의 파괴석 240개, 운명의 수호석 480개, 운명의 돌파석 7개, 알키오네의 눈 6개" },
                    { index: 2, name: "2관문", gold: 5000, boundGold: 0, bonusCost: 1630, rewards: "운명의 파괴석 260개, 운명의 수호석 520개, 운명의 돌파석 3개, 알키오네의 눈 12개", bonusRewards: "운명의 파괴석 460개, 운명의 수호석 920개, 운명의 돌파석 20개, 알키오네의 눈 12개" },
                ],
            },
        },
    },

    "1막-에기르": {
        kind: "카제로스",
        releaseDate: "2024-07-24",
        gates: 2,
        difficulty: {
            "싱글": {
                level: 1660,
                gold: 5750,
                boundGold: 5750,
                gates: [
                    { index: 1, name: "1관문", gold: 1750, boundGold: 1750, bonusCost: 750, rewards: "운명의 파괴석 480개, 운명의 수호석 960개, 운명의 돌파석 4개, 업화의 쐐기돌 8개", bonusRewards: "운명의 파괴석 310개, 운명의 수호석 620개, 운명의 돌파석 8개, 업화의 쐐기돌 8개" },
                    { index: 2, name: "2관문", gold: 4000, boundGold: 4000, bonusCost: 1780, rewards: "운명의 파괴석 580개, 운명의 수호석 1160개, 운명의 돌파석 5개, 업화의 쐐기돌 12개", bonusRewards: "운명의 파괴석 460개, 운명의 수호석 920개, 운명의 돌파석 15개, 업화의 쐐기돌 12개" },
                ],
            },
            "노말": {
                level: 1660,
                gold: 11500,
                boundGold: 0,
                gates: [
                    { index: 1, name: "1관문", gold: 3500, boundGold: 0, bonusCost: 750, rewards: "운명의 파괴석 480개, 운명의 수호석 960개, 운명의 돌파석 4개, 업화의 쐐기돌 8개", bonusRewards: "운명의 파괴석 310개, 운명의 수호석 620개, 운명의 돌파석 8개, 업화의 쐐기돌 8개" },
                    { index: 2, name: "2관문", gold: 8000, boundGold: 0, bonusCost: 1780, rewards: "운명의 파괴석 580개, 운명의 수호석 1160개, 운명의 돌파석 5개, 업화의 쐐기돌 12개", bonusRewards: "운명의 파괴석 460개, 운명의 수호석 920개, 운명의 돌파석 15개, 업화의 쐐기돌 12개" },
                ],
            },
            "하드": {
                level: 1680,
                gold: 18000,
                boundGold: 0,
                gates: [
                    { index: 1, name: "1관문", gold: 5500, boundGold: 0, bonusCost: 1820, rewards: "운명의 파괴석 580개, 운명의 수호석 1160개, 운명의 돌파석 6개, 업화의 쐐기돌 16개", bonusRewards: "운명의 파괴석 610개, 운명의 수호석 1220개, 운명의 돌파석 18개, 업화의 쐐기돌 16개" },
                    { index: 2, name: "2관문", gold: 12500, boundGold: 0, bonusCost: 4150, rewards: "운명의 파괴석 660개, 운명의 수호석 1320개, 운명의 돌파석 7개, 업화의 쐐기돌 24개", bonusRewards: "운명의 파괴석 940개, 운명의 수호석 1880개, 운명의 돌파석 31개, 업화의 쐐기돌 24개" },
                ],
            },
        },
    },

    "2막-아브렐슈드": {
        kind: "카제로스",
        releaseDate: "2024-09-25",
        gates: 2,
        difficulty: {
            "싱글": {
                level: 1670,
                gold: 8250,
                boundGold: 8250,
                gates: [
                    { index: 1, name: "1관문", gold: 2750, boundGold: 2750, bonusCost: 1820, rewards: "운명의 파괴석 540개, 운명의 수호석 1080개, 운명의 돌파석 5개, 카르마의 잔영 8개", bonusRewards: "운명의 파괴석 610개, 운명의 수호석 1220개, 운명의 돌파석 13개, 카르마의 잔영 8개" },
                    { index: 2, name: "2관문", gold: 5500, boundGold: 5500, bonusCost: 3720, rewards: "운명의 파괴석 640개, 운명의 수호석 1280개, 운명의 돌파석 6개, 카르마의 잔영 12개", bonusRewards: "운명의 파괴석 810개, 운명의 수호석 1620개, 운명의 돌파석 21개, 카르마의 잔영 12개" },
                ],
            },
            "노말": {
                level: 1670,
                gold: 16500,
                boundGold: 0,
                gates: [
                    { index: 1, name: "1관문", gold: 5500, boundGold: 0, bonusCost: 1820, rewards: "운명의 파괴석 540개, 운명의 수호석 1080개, 운명의 돌파석 5개, 카르마의 잔영 8개", bonusRewards: "운명의 파괴석 610개, 운명의 수호석 1220개, 운명의 돌파석 13개, 카르마의 잔영 8개" },
                    { index: 2, name: "2관문", gold: 11000, boundGold: 0, bonusCost: 3720, rewards: "운명의 파괴석 640개, 운명의 수호석 1280개, 운명의 돌파석 6개, 카르마의 잔영 12개", bonusRewards: "운명의 파괴석 810개, 운명의 수호석 1620개, 운명의 돌파석 21개, 카르마의 잔영 12개" },
                ],
            },
            "하드": {
                level: 1690,
                gold: 23000,
                boundGold: 0,
                gates: [
                    { index: 1, name: "1관문", gold: 7500, boundGold: 0, bonusCost: 2400, rewards: "운명의 파괴석 640개, 운명의 수호석 1280개, 운명의 돌파석 7개, 카르마의 잔영 16개", bonusRewards: "운명의 파괴석 720개, 운명의 수호석 1440개, 운명의 돌파석 30개, 카르마의 잔영 16개" },
                    { index: 2, name: "2관문", gold: 15500, boundGold: 0, bonusCost: 5100, rewards: "운명의 파괴석 700개, 운명의 수호석 1400개, 운명의 돌파석 8개, 카르마의 잔영 24개", bonusRewards: "운명의 파괴석 1320개, 운명의 수호석 2640개, 운명의 돌파석 50개, 카르마의 잔영 24개" },
                ],
            },
        },
    },

    "3막-모르둠": {
        kind: "카제로스",
        releaseDate: "2025-01-22",
        gates: 3,
        difficulty: {
            "싱글": {
                level: 1680,
                gold: 10500,
                boundGold: 10500,
                gates: [
                    { index: 1, name: "1관문", gold: 2000, boundGold: 2000, bonusCost: 1300, rewards: "운명의 파괴석 320개, 운명의 수호석 640개, 운명의 돌파석 4개, 낙뢰의 뿔 6개", bonusRewards: "운명의 파괴석 390개, 운명의 수호석 780개, 운명의 돌파석 12개, 낙뢰의 뿔 6개" },
                    { index: 2, name: "2관문", gold: 3500, boundGold: 3500, bonusCost: 2350, rewards: "운명의 파괴석 400개, 운명의 수호석 800개, 운명의 돌파석 4개, 낙뢰의 뿔 10개", bonusRewards: "운명의 파괴석 530개, 운명의 수호석 1060개, 운명의 돌파석 15개, 낙뢰의 뿔 10개" },
                    { index: 3, name: "3관문", gold: 5000, boundGold: 5000, bonusCost: 3360, rewards: "운명의 파괴석 520개, 운명의 수호석 1040개, 운명의 돌파석 6개, 낙뢰의 뿔 20개", bonusRewards: "운명의 파괴석 780개, 운명의 수호석 1560개, 운명의 돌파석 21개, 낙뢰의 뿔 20개" },
                ],
            },
            "노말": {
                level: 1680,
                gold: 21000,
                boundGold: 0,
                gates: [
                    { index: 1, name: "1관문", gold: 4000, boundGold: 0, bonusCost: 1300, rewards: "운명의 파괴석 320개, 운명의 수호석 640개, 운명의 돌파석 4개, 낙뢰의 뿔 6개", bonusRewards: "운명의 파괴석 390개, 운명의 수호석 780개, 운명의 돌파석 12개, 낙뢰의 뿔 6개" },
                    { index: 2, name: "2관문", gold: 7000, boundGold: 0, bonusCost: 2350, rewards: "운명의 파괴석 400개, 운명의 수호석 800개, 운명의 돌파석 4개, 낙뢰의 뿔 10개", bonusRewards: "운명의 파괴석 530개, 운명의 수호석 1060개, 운명의 돌파석 15개, 낙뢰의 뿔 10개" },
                    { index: 3, name: "3관문", gold: 10000, boundGold: 0, bonusCost: 3360, rewards: "운명의 파괴석 520개, 운명의 수호석 1040개, 운명의 돌파석 6개, 낙뢰의 뿔 20개", bonusRewards: "운명의 파괴석 780개, 운명의 수호석 1560개, 운명의 돌파석 21개, 낙뢰의 뿔 20개" },
                ],
            },
            "하드": {
                level: 1700,
                gold: 27000,
                boundGold: 0,
                gates: [
                    { index: 1, name: "1관문", gold: 5000, boundGold: 0, bonusCost: 1650, rewards: "운명의 파괴석 440개, 운명의 수호석 880개, 운명의 돌파석 6개, 우레의 뇌옥 6개", bonusRewards: "운명의 파괴석 600개, 운명의 수호석 1200개, 운명의 돌파석 23개, 우레의 뇌옥 6개" },
                    { index: 2, name: "2관문", gold: 8000, boundGold: 0, bonusCost: 2640, rewards: "운명의 파괴석 520개, 운명의 수호석 1040개, 운명의 돌파석 6개, 우레의 뇌옥 10개", bonusRewards: "운명의 파괴석 830개, 운명의 수호석 1660개, 운명의 돌파석 27개, 우레의 뇌옥 10개" },
                    { index: 3, name: "3관문", gold: 14000, boundGold: 0, bonusCost: 4060, rewards: "운명의 파괴석 640개, 운명의 수호석 1280개, 운명의 돌파석 8개, 우레의 뇌옥 20개", bonusRewards: "운명의 파괴석 1460개, 운명의 수호석 2920개, 운명의 돌파석 45개, 우레의 뇌옥 20개" },
                ],
            },
        },
    },

    "4막-아르모체": {
        kind: "카제로스",
        releaseDate: "2025-08-20",
        gates: 2,
        difficulty: {
            "노말": {
                level: 1700,
                gold: 33000,
                boundGold: 0,
                gates: [
                    { index: 1, name: "1관문", gold: 12500, boundGold: 0, bonusCost: 4000, rewards: "운명의 파괴석 820개, 운명의 수호석 1640개, 운명의 돌파석 9개, 코어(영웅~고대) 1개", bonusRewards: "운명의 파괴석 1400개, 운명의 수호석 2800개, 운명의 돌파석 44개, 코어(영웅~고대) 1개" },
                    { index: 2, name: "2관문", gold: 20500, boundGold: 0, bonusCost: 6560, rewards: "운명의 파괴석 960개, 운명의 수호석 1920개, 운명의 돌파석 12개, 코어(영웅~고대) 1개", bonusRewards: "운명의 파괴석 2400개, 운명의 수호석 4800개, 운명의 돌파석 78개, 코어(영웅~고대) 1개" },
                ],
            },
            "하드": {
                level: 1720,
                gold: 42000,
                boundGold: 0,
                gates: [
                    { index: 1, name: "1관문", gold: 15000, boundGold: 0, bonusCost: 4800, rewards: "운명의 파괴석 980개, 운명의 수호석 1960개, 운명의 돌파석 11개, 코어(전설~고대) 1개", bonusRewards: "운명의 파괴석 1680개, 운명의 수호석 3360개, 운명의 돌파석 53개, 코어(전설~고대) 1개" },
                    { index: 2, name: "2관문", gold: 27000, boundGold: 0, bonusCost: 8640, rewards: "운명의 파괴석 1150개, 운명의 수호석 2300개, 운명의 돌파석 16개, 코어(전설~고대) 1개", bonusRewards: "운명의 파괴석 2880개, 운명의 수호석 5760개, 운명의 돌파석 94개, 코어(전설~고대) 1개" },
                ],
            },
        },
    },

    "종막-카제로스": {
        kind: "카제로스",
        releaseDate: "2025-08-21",
        gates: 2,
        difficulty: {
            "노말": {
                level: 1710,
                gold: 40000,
                boundGold: 0,
                gates: [
                    { index: 1, name: "1관문", gold: 14000, boundGold: 0, bonusCost: 4480, rewards: "운명의 파괴석 880개, 운명의 수호석 1760개, 운명의 돌파석 12개, 코어(영웅~고대) 2개", bonusRewards: "운명의 파괴석 1610개, 운명의 수호석 3220개, 운명의 돌파석 50개, 코어(영웅~고대) 2개" },
                    { index: 2, name: "2관문", gold: 26000, boundGold: 0, bonusCost: 8320, rewards: "운명의 파괴석 1100개, 운명의 수호석 2200개, 운명의 돌파석 15개, 코어(영웅~고대) 2개", bonusRewards: "운명의 파괴석 2760개, 운명의 수호석 5520개, 운명의 돌파석 90개, 코어(영웅~고대) 2개" },
                ],
            },
            "하드": {
                level: 1730,
                gold: 52000,
                boundGold: 0,
                gates: [
                    { index: 1, name: "1관문", gold: 17000, boundGold: 0, bonusCost: 5440, rewards: "운명의 파괴석 결정 385개, 운명의 수호석 결정 770개, 위대한 운명의 돌파석 7개, 코어(전설~고대) 2개", bonusRewards: "운명의 파괴석 결정 750개, 운명의 수호석 결정 1500개, 위대한 운명의 돌파석 30개, 코어(전설~고대) 2개" },
                    { index: 2, name: "2관문", gold: 35000, boundGold: 0, bonusCost: 11200, rewards: "운명의 파괴석 결정 475개, 운명의 수호석 결정 950개, 위대한 운명의 돌파석 10개, 코어(전설~고대) 2개", bonusRewards: "운명의 파괴석 결정 1320개, 운명의 수호석 결정 2640개, 위대한 운명의 돌파석 50개, 코어(전설~고대) 2개" },
                ],
            },
        },
    },

    "카양겔": {
        kind: "어비스",
        releaseDate: "2022-04-27",
        gates: 3,
        difficulty: {
            "싱글": {
                level: 1540,
                gold: 0,
                boundGold: 3300,
                gates: [
                    { index: 1, name: "1관문", gold: 0, boundGold: 750, bonusCost: 180, rewards: "정제된 파괴강석 52개, 정제된 수호강석 104개, 찬명돌 1개", bonusRewards: "정제된 파괴강석 42개, 정제된 수호강석 84개, 찬명돌 2개" },
                    { index: 2, name: "2관문", gold: 0, boundGold: 1100, bonusCost: 200, rewards: "정제된 파괴강석 60개, 정제된 수호강석 120개, 찬명돌 1개", bonusRewards: "정제된 파괴강석 52개, 정제된 수호강석 104개, 찬명돌 2개" },
                    { index: 3, name: "3관문", gold: 0, boundGold: 1450, bonusCost: 270, rewards: "정제된 파괴강석 80개, 정제된 수호강석 160개, 찬명돌 1개", bonusRewards: "정제된 파괴강석 62개, 정제된 수호강석 124개, 찬명돌 3개" },
                ],
            },
            "노말": {
                level: 1540,
                gold: 0,
                boundGold: 3300,
                gates: [
                    { index: 1, name: "1관문", gold: 0, boundGold: 750, bonusCost: 180, rewards: "정제된 파괴강석 52개, 정제된 수호강석 104개, 찬명돌 1개", bonusRewards: "정제된 파괴강석 42개, 정제된 수호강석 84개, 찬명돌 2개" },
                    { index: 2, name: "2관문", gold: 0, boundGold: 1100, bonusCost: 200, rewards: "정제된 파괴강석 60개, 정제된 수호강석 120개, 찬명돌 1개", bonusRewards: "정제된 파괴강석 52개, 정제된 수호강석 104개, 찬명돌 2개" },
                    { index: 3, name: "3관문", gold: 0, boundGold: 1450, bonusCost: 270, rewards: "정제된 파괴강석 80개, 정제된 수호강석 160개, 찬명돌 1개", bonusRewards: "정제된 파괴강석 62개, 정제된 수호강석 124개, 찬명돌 3개" },
                ],
            },
            "하드": {
                level: 1580,
                gold: 0,
                boundGold: 4300,
                gates: [
                    { index: 1, name: "1관문", gold: 0, boundGold: 900, bonusCost: 225, rewards: "정제된 파괴강석 80개, 정제된 수호강석 160개, 찬명돌 2개", bonusRewards: "정제된 파괴강석 70개, 정제된 수호강석 140개, 찬명돌 3개" },
                    { index: 2, name: "2관문", gold: 0, boundGold: 1400, bonusCost: 350, rewards: "정제된 파괴강석 120개, 정제된 수호강석 240개, 찬명돌 2개", bonusRewards: "정제된 파괴강석 80개, 정제된 수호강석 160개, 찬명돌 4개" },
                    { index: 3, name: "3관문", gold: 0, boundGold: 2000, bonusCost: 500, rewards: "정제된 파괴강석 150개, 정제된 수호강석 300개, 찬명돌 3개", bonusRewards: "정제된 파괴강석 110개, 정제된 수호강석 220개, 찬명돌 6개" },
                ],
            },
        },
    },

    "혼돈의 상아탑": {
        kind: "어비스",
        releaseDate: "2023-02-22",
        gates: 3,
        difficulty: {
            "싱글": {
                level: 1600,
                gold: 0,
                boundGold: 5200,
                gates: [
                    { index: 1, name: "1관문", gold: 0, boundGold: 1200, bonusCost: 180, rewards: "정제된 파괴강석 200개, 정제된 수호강석 400개, 찬명돌 3개", bonusRewards: "정제된 파괴강석 150개, 정제된 수호강석 300개, 찬명돌 7개" },
                    { index: 2, name: "2관문", gold: 0, boundGold: 1600, bonusCost: 220, rewards: "정제된 파괴강석 200개, 정제된 수호강석 400개, 찬명돌 3개", bonusRewards: "정제된 파괴강석 160개, 정제된 수호강석 320개, 찬명돌 7개" },
                    { index: 3, name: "3관문", gold: 0, boundGold: 2400, bonusCost: 300, rewards: "정제된 파괴강석 260개, 정제된 수호강석 520개, 찬명돌 4개", bonusRewards: "정제된 파괴강석 230개, 정제된 수호강석 460개, 찬명돌 13개" },
                ],
            },
            "노말": {
                level: 1600,
                gold: 0,
                boundGold: 5200,
                gates: [
                    { index: 1, name: "1관문", gold: 0, boundGold: 1200, bonusCost: 180, rewards: "정제된 파괴강석 200개, 정제된 수호강석 400개, 찬명돌 3개", bonusRewards: "정제된 파괴강석 150개, 정제된 수호강석 300개, 찬명돌 7개" },
                    { index: 2, name: "2관문", gold: 0, boundGold: 1600, bonusCost: 220, rewards: "정제된 파괴강석 200개, 정제된 수호강석 400개, 찬명돌 3개", bonusRewards: "정제된 파괴강석 160개, 정제된 수호강석 320개, 찬명돌 7개" },
                    { index: 3, name: "3관문", gold: 0, boundGold: 2400, bonusCost: 300, rewards: "정제된 파괴강석 260개, 정제된 수호강석 520개, 찬명돌 4개", bonusRewards: "정제된 파괴강석 230개, 정제된 수호강석 460개, 찬명돌 13개" },
                ],
            },
            "하드": {
                level: 1620,
                gold: 0,
                boundGold: 7200,
                gates: [
                    { index: 1, name: "1관문", gold: 0, boundGold: 1400, bonusCost: 350, rewards: "운명의 파괴석 80개, 운명의 수호석 160개, 운명의 돌파석 1개", bonusRewards: "운명의 파괴석 50개, 운명의 수호석 100개, 운명의 돌파석 1개" },
                    { index: 2, name: "2관문", gold: 0, boundGold: 2000, bonusCost: 500, rewards: "운명의 파괴석 80개, 운명의 수호석 160개, 운명의 돌파석 1개", bonusRewards: "운명의 파괴석 60개, 운명의 수호석 120개, 운명의 돌파석 1개" },
                    { index: 3, name: "3관문", gold: 0, boundGold: 3800, bonusCost: 950, rewards: "운명의 파괴석 100개, 운명의 수호석 200개, 운명의 돌파석 1개", bonusRewards: "운명의 파괴석 90개, 운명의 수호석 180개, 운명의 돌파석 3개" },
                ],
            },
        },
    },

    "세르카": {
        kind: "그림자",
        releaseDate: "2026-01-07",
        gates: 2,
        difficulty: {
            "노말": {
                level: 1710,
                gold: 35000,
                boundGold: 0,
                gates: [
                    { index: 1, name: "1관문", gold: 14000, boundGold: 0, bonusCost: 4480, rewards: "운명의 파괴석 880개, 운명의 수호석 1760개, 운명의 돌파석 12개, 코어(영웅~고대) 2개", bonusRewards: "운명의 파괴석 1610개, 운명의 수호석 3220개, 운명의 돌파석 50개, 코어(영웅~고대) 2개" },
                    { index: 2, name: "2관문", gold: 21000, boundGold: 0, bonusCost: 6720, rewards: "운명의 파괴석 1100개, 운명의 수호석 2200개, 운명의 돌파석 15개, 코어(영웅~고대) 2개", bonusRewards: "운명의 파괴석 2480개, 운명의 수호석 4960개, 운명의 돌파석 82개, 코어(영웅~고대) 2개" },
                ],
            },
            "하드": {
                level: 1730,
                gold: 44000,
                boundGold: 0,
                gates: [
                    { index: 1, name: "1관문", gold: 17500, boundGold: 0, bonusCost: 5600, rewards: "운명의 파괴석 결정 385개, 운명의 수호석 결정 770개, 위대한 운명의 돌파석 7개, 코어(전설~고대) 2개, 고통의 가시 10개", bonusRewards: "운명의 파괴석 결정 750개, 운명의 수호석 결정 1500개, 위대한 운명의 돌파석 30개, 코어(전설~고대) 2개, 고통의 가시 10개" },
                    { index: 2, name: "2관문", gold: 26500, boundGold: 0, bonusCost: 8480, rewards: "운명의 파괴석 결정 475개, 운명의 수호석 결정 950개, 위대한 운명의 돌파석 10개, 코어(전설~고대) 2개, 고통의 가시 15개", bonusRewards: "운명의 파괴석 결정 1130개, 운명의 수호석 결정 2260개, 위대한 운명의 돌파석 45개, 코어(전설~고대) 2개, 고통의 가시 15개" },
                ],
            },
            "나메": {
                level: 1740,
                gold: 54000,
                boundGold: 0,
                gates: [
                    { index: 1, name: "1관문", gold: 21000, boundGold: 0, bonusCost: 6720, rewards: "운명의 파괴석 결정 405개, 운명의 수호석 결정 810개, 위대한 운명의 돌파석 8개, 코어(전설~고대) 3개, 고통의 가시 10개", bonusRewards: "운명의 파괴석 결정 860개, 운명의 수호석 결정 1720개, 위대한 운명의 돌파석 36개, 코어(전설~고대) 3개, 고통의 가시 10개" },
                    { index: 2, name: "2관문", gold: 33000, boundGold: 0, bonusCost: 10560, rewards: "운명의 파괴석 결정 500개, 운명의 수호석 결정 1000개, 위대한 운명의 돌파석 12개, 코어(전설~고대) 3개, 고통의 가시 15개", bonusRewards: "운명의 파괴석 결정 1430개, 운명의 수호석 결정 2860개, 위대한 운명의 돌파석 60개, 코어(전설~고대) 3개, 고통의 가시 15개" },
                ],
            },
        },
    },

    "지평의 성당": {
        kind: "어비스",
        releaseDate: "2026-03-18",
        gates: 2,
        difficulty: {
            "노말": {
                level: 1700,
                gold: 0,
                boundGold: 30000,
                gates: [
                    { index: 1, name: "1관문", gold: 0, boundGold: 13500, bonusCost: 4320, rewards: "운명의 파괴석 820개, 운명의 수호석 1640개, 운명의 돌파석 9개, 코어(영웅~고대) 2개, 은총의 파편 4개", bonusRewards: "운명의 파괴석 1400개, 운명의 수호석 2800개, 운명의 돌파석 44개, 코어(영웅~고대) 2개, 은총의 파편 4개" },
                    { index: 2, name: "2관문", gold: 0, boundGold: 16500, bonusCost: 5280, rewards: "운명의 파괴석 960개, 운명의 수호석 1920개, 운명의 돌파석 12개, 코어(영웅~고대) 2개, 은총의 파편 6개", bonusRewards: "운명의 파괴석 2400개, 운명의 수호석 4800개, 운명의 돌파석 78개, 코어(영웅~고대) 2개, 은총의 파편 6개" },
                ],
            },
            "하드": {
                level: 1720,
                gold: 0,
                boundGold: 40000,
                gates: [
                    { index: 1, name: "1관문", gold: 0, boundGold: 16000, bonusCost: 5120, rewards: "운명의 파괴석 980개, 운명의 수호석 1960개, 운명의 돌파석 11개, 코어(전설~고대) 2개, 은총의 파편 12개", bonusRewards: "운명의 파괴석 1680개, 운명의 수호석 3360개, 운명의 돌파석 53개, 코어(전설~고대) 2개, 은총의 파편 12개" },
                    { index: 2, name: "2관문", gold: 0, boundGold: 24000, bonusCost: 7680, rewards: "운명의 파괴석 1150개, 운명의 수호석 2300개, 운명의 돌파석 16개, 코어(전설~고대) 2개, 은총의 파편 18개", bonusRewards: "운명의 파괴석 2880개, 운명의 수호석 5760개, 운명의 돌파석 94개, 코어(전설~고대) 2개, 은총의 파편 18개" },
                ],
            },
            "나메": {
                level: 1750,
                gold: 0,
                boundGold: 50000,
                gates: [
                    { index: 1, name: "1관문", gold: 0, boundGold: 20000, bonusCost: 6400, rewards: "운명의 파괴석 결정 405개, 운명의 수호석 결정 810개, 위대한 운명의 돌파석 8개, 코어(전설~고대) 3개, 은총의 파편 24개", bonusRewards: "운명의 파괴석 결정 860개, 운명의 수호석 결정 1720개, 위대한 운명의 돌파석 36개, 코어(전설~고대) 3개, 은총의 파편 24개" },
                    { index: 2, name: "2관문", gold: 0, boundGold: 30000, bonusCost: 9600, rewards: "운명의 파괴석 결정 500개, 운명의 수호석 결정 1000개, 위대한 운명의 돌파석 12개, 코어(전설~고대) 3개, 은총의 파편 36개", bonusRewards: "운명의 파괴석 결정 1430개, 운명의 수호석 결정 2860개, 위대한 운명의 돌파석 60개, 코어(전설~고대) 3개, 은총의 파편 36개" },
                ],
            },
        },
    },

};