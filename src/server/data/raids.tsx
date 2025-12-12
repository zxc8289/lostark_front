// raidInformation.ts

export type RaidKind = "군단장" | "카제로스" | "어비스" | "에픽";
export type DifficultyKey = "노말" | "하드";

type Gate = { index: number; name: string; gold: number };
type Difficulty = { level: number; gold: number; gates: Gate[] };

export const raidInformation: Record<
    string,
    {
        kind: RaidKind;
        gates: number;
        difficulty: Partial<Record<DifficultyKey, Difficulty>>;
    }
> = {
    // ─────────────────── 군단장 ───────────────────
    "발탄": {
        kind: "군단장",
        gates: 2,
        difficulty: {
            "노말": {
                level: 1415,
                gold: 600,
                gates: [
                    { index: 1, name: "1관문", gold: 250 },
                    { index: 2, name: "2관문", gold: 350 },
                ],
            },
            "하드": {
                level: 1445,
                gold: 900,
                gates: [
                    { index: 1, name: "1관문", gold: 350 },
                    { index: 2, name: "2관문", gold: 550 },
                ],
            },
        },
    },

    "비아키스": {
        kind: "군단장",
        gates: 2,
        difficulty: {
            "노말": {
                level: 1430,
                gold: 800,
                gates: [
                    { index: 1, name: "1관문", gold: 300 },
                    { index: 2, name: "2관문", gold: 500 },
                ],
            },
            "하드": {
                level: 1460,
                gold: 1200,
                gates: [
                    { index: 1, name: "1관문", gold: 450 },
                    { index: 2, name: "2관문", gold: 750 },
                ],
            },
        },
    },

    "쿠크세이튼": {
        kind: "군단장",
        gates: 3,
        difficulty: {
            "노말": {
                level: 1475,
                gold: 1500,
                gates: [
                    { index: 1, name: "1관문", gold: 300 },
                    { index: 2, name: "2관문", gold: 450 },
                    { index: 3, name: "3관문", gold: 750 },
                ],
            },
        },
    },

    "아브렐슈드": {
        kind: "군단장",
        gates: 4,
        difficulty: {
            "노말": {
                level: 1490,
                gold: 2300,
                gates: [
                    { index: 1, name: "1관문", gold: 500 },
                    { index: 2, name: "2관문", gold: 500 },
                    { index: 3, name: "3관문", gold: 500 },
                    { index: 4, name: "4관문", gold: 800 },
                ],
            },
            "하드": {
                level: 1540,
                gold: 2800,
                gates: [
                    { index: 1, name: "1관문", gold: 600 },
                    { index: 2, name: "2관문", gold: 600 },
                    { index: 3, name: "3관문", gold: 600 },
                    { index: 4, name: "4관문", gold: 1000 },
                ],
            },
        },
    },

    "일리아칸": {
        kind: "군단장",
        gates: 3,
        difficulty: {
            "노말": {
                level: 1580,
                gold: 2350,
                gates: [
                    { index: 1, name: "1관문", gold: 425 },
                    { index: 2, name: "2관문", gold: 775 },
                    { index: 3, name: "3관문", gold: 1150 },
                ],
            },
            "하드": {
                level: 1600,
                gold: 3000,
                gates: [
                    { index: 1, name: "1관문", gold: 600 },
                    { index: 2, name: "2관문", gold: 1000 },
                    { index: 3, name: "3관문", gold: 1400 },
                ],
            },
        },
    },

    "카멘": {
        kind: "군단장",
        gates: 4,
        difficulty: {
            "노말": {
                level: 1610,
                gold: 3200,
                gates: [
                    { index: 1, name: "1관문", gold: 800 },
                    { index: 2, name: "2관문", gold: 1000 },
                    { index: 3, name: "3관문", gold: 1400 },
                ],
            },
            "하드": {
                level: 1630,
                gold: 6500,
                gates: [
                    { index: 1, name: "1관문", gold: 1000 },
                    { index: 2, name: "2관문", gold: 1200 },
                    { index: 3, name: "3관문", gold: 1800 },
                    { index: 4, name: "4관문", gold: 2500 },
                ],
            },
        },
    },

    "베히모스": {
        kind: "에픽",
        gates: 2,
        difficulty: {
            "노말": {
                level: 1640,
                gold: 7200,
                gates: [
                    { index: 1, name: "1관문", gold: 2200 },
                    { index: 2, name: "2관문", gold: 5000 },
                ],
            },
        },
    },

    "서막-에키드나": {
        kind: "카제로스",
        gates: 2,
        difficulty: {
            "노말": {
                level: 1620,
                gold: 6100,
                gates: [
                    { index: 1, name: "1관문", gold: 1900 },
                    { index: 2, name: "2관문", gold: 4200 },
                ],
            },
            "하드": {
                level: 1630,
                gold: 7200,
                gates: [
                    { index: 1, name: "1관문", gold: 2200 },
                    { index: 2, name: "2관문", gold: 5000 },
                ],
            },
        },
    },

    "1막-에기르": {
        kind: "카제로스",
        gates: 2,
        difficulty: {
            "노말": {
                level: 1660,
                gold: 11500,
                gates: [
                    { index: 1, name: "1관문", gold: 3500 },
                    { index: 2, name: "2관문", gold: 8000 },
                ],
            },
            "하드": {
                level: 1680,
                gold: 18000,
                gates: [
                    { index: 1, name: "1관문", gold: 5500 },
                    { index: 2, name: "2관문", gold: 12500 },
                ],
            },
        },
    },
    "2막-아브렐슈드": {
        kind: "카제로스",
        gates: 2,
        difficulty: {
            "노말": {
                level: 1670,
                gold: 16500,
                gates: [
                    { index: 1, name: "1관문", gold: 5500 },
                    { index: 2, name: "2관문", gold: 11000 },
                ],
            },
            "하드": {
                level: 1690,
                gold: 23000,
                gates: [
                    { index: 1, name: "1관문", gold: 7500 },
                    { index: 2, name: "2관문", gold: 15500 },
                ],
            },
        },
    },
    "3막-모르둠": {
        kind: "카제로스",
        gates: 3,
        difficulty: {
            "노말": {
                level: 1680,
                gold: 21000,
                gates: [
                    { index: 1, name: "1관문", gold: 4000 },
                    { index: 2, name: "2관문", gold: 7000 },
                    { index: 3, name: "3관문", gold: 10000 },
                ],
            },
            "하드": {
                level: 1700,
                gold: 27000,
                gates: [
                    { index: 1, name: "1관문", gold: 5000 },
                    { index: 2, name: "2관문", gold: 8000 },
                    { index: 3, name: "3관문", gold: 14000 },
                ],
            },
        },
    },
    "4막-아르모체": {
        kind: "카제로스",
        gates: 2,
        difficulty: {
            "노말": {
                level: 1700,
                gold: 33000,
                gates: [
                    { index: 1, name: "1관문", gold: 12500 },
                    { index: 2, name: "2관문", gold: 20500 },
                ],
            },
            "하드": {
                level: 1720,
                gold: 42000,
                gates: [
                    { index: 1, name: "1관문", gold: 15000 },
                    { index: 2, name: "2관문", gold: 27000 },
                ],
            },
        },
    },
    "종막-카제로스": {
        kind: "카제로스",
        gates: 2,
        difficulty: {
            "노말": {
                level: 1710,
                gold: 40000,
                gates: [
                    { index: 1, name: "1관문", gold: 14000 },
                    { index: 2, name: "2관문", gold: 26000 },
                ],
            },
            "하드": {
                level: 1730,
                gold: 52000,
                gates: [
                    { index: 1, name: "1관문", gold: 17000 },
                    { index: 2, name: "2관문", gold: 35000 },
                ],
            },
        },
    },


    "카양겔": {
        kind: "어비스",
        gates: 3,
        difficulty: {
            "노말": {
                level: 1540,
                gold: 1650,
                gates: [
                    { index: 1, name: "1관문", gold: 375 },
                    { index: 2, name: "2관문", gold: 550 },
                    { index: 3, name: "3관문", gold: 725 },
                ],
            },
            "하드": {
                level: 1580,
                gold: 2150,
                gates: [
                    { index: 1, name: "1관문", gold: 450 },
                    { index: 2, name: "2관문", gold: 700 },
                    { index: 3, name: "3관문", gold: 1000 },
                ],
            },
        },
    },

    "혼돈의 상아탑": {
        kind: "어비스",
        gates: 3,
        difficulty: {
            "노말": {
                level: 1600,
                gold: 2600,
                gates: [
                    { index: 1, name: "1관문", gold: 600 },
                    { index: 2, name: "2관문", gold: 800 },
                    { index: 3, name: "3관문", gold: 1200 },
                ],
            },
            "하드": {
                level: 1620,
                gold: 3600,
                gates: [
                    { index: 1, name: "1관문", gold: 700 },
                    { index: 2, name: "2관문", gold: 1000 },
                    { index: 3, name: "3관문", gold: 1900 },
                ],
            },
        },
    },
};



