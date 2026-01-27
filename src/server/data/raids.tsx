// raidInformation.ts

export type RaidKind = "군단장" | "카제로스" | "어비스" | "에픽" | "그림자";
export type DifficultyKey = "노말" | "하드" | "나메";

type Gate = { index: number; name: string; gold: number };
type Difficulty = { level: number; gold: number; gates: Gate[] };

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
            "노말": {
                level: 1415,
                gold: 1200,
                gates: [
                    { index: 1, name: "1관문", gold: 500 },
                    { index: 2, name: "2관문", gold: 700 },
                ],
            },
            "하드": {
                level: 1445,
                gold: 1800,
                gates: [
                    { index: 1, name: "1관문", gold: 700 },
                    { index: 2, name: "2관문", gold: 1100 },
                ],
            },
        },
    },

    "비아키스": {
        kind: "군단장",
        releaseDate: "2021-02-04",
        gates: 2,
        difficulty: {
            "노말": {
                level: 1430,
                gold: 1600,
                gates: [
                    { index: 1, name: "1관문", gold: 600 },
                    { index: 2, name: "2관문", gold: 1000 },
                ],
            },
            "하드": {
                level: 1460,
                gold: 2400,
                gates: [
                    { index: 1, name: "1관문", gold: 900 },
                    { index: 2, name: "2관문", gold: 1500 },
                ],
            },
        },
    },

    "쿠크세이튼": {
        kind: "군단장",
        releaseDate: "2021-04-28",
        gates: 3,
        difficulty: {
            "노말": {
                level: 1475,
                gold: 3000,
                gates: [
                    { index: 1, name: "1관문", gold: 600 },
                    { index: 2, name: "2관문", gold: 900 },
                    { index: 3, name: "3관문", gold: 1500 },
                ],
            },
        },
    },

    "아브렐슈드": {
        kind: "군단장",
        releaseDate: "2021-07-28",
        gates: 4,
        difficulty: {
            "노말": {
                level: 1490,
                gold: 4600,
                gates: [
                    { index: 1, name: "1관문", gold: 1000 },
                    { index: 2, name: "2관문", gold: 1000 },
                    { index: 3, name: "3관문", gold: 1000 },
                    { index: 4, name: "4관문", gold: 1600 },
                ],
            },
            "하드": {
                level: 1540,
                gold: 5600,
                gates: [
                    { index: 1, name: "1관문", gold: 1200 },
                    { index: 2, name: "2관문", gold: 1200 },
                    { index: 3, name: "3관문", gold: 1200 },
                    { index: 4, name: "4관문", gold: 2000 },
                ],
            },
        },
    },

    "일리아칸": {
        kind: "군단장",
        releaseDate: "2022-08-24",
        gates: 3,
        difficulty: {
            "노말": {
                level: 1580,
                gold: 4700,
                gates: [
                    { index: 1, name: "1관문", gold: 850 },
                    { index: 2, name: "2관문", gold: 1550 },
                    { index: 3, name: "3관문", gold: 2300 },
                ],
            },
            "하드": {
                level: 1600,
                gold: 6000,
                gates: [
                    { index: 1, name: "1관문", gold: 1200 },
                    { index: 2, name: "2관문", gold: 2000 },
                    { index: 3, name: "3관문", gold: 2800 },
                ],
            },
        },
    },

    "카멘": {
        kind: "군단장",
        releaseDate: "2023-09-13",
        gates: 4,
        difficulty: {
            "노말": {
                level: 1610,
                gold: 6400,
                gates: [
                    { index: 1, name: "1관문", gold: 1600 },
                    { index: 2, name: "2관문", gold: 2000 },
                    { index: 3, name: "3관문", gold: 2800 },
                ],
            },
            "하드": {
                level: 1630,
                gold: 13000,
                gates: [
                    { index: 1, name: "1관문", gold: 2000 },
                    { index: 2, name: "2관문", gold: 2400 },
                    { index: 3, name: "3관문", gold: 3600 },
                    { index: 4, name: "4관문", gold: 5000 },
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
                gates: [
                    { index: 1, name: "1관문", gold: 2200 },
                    { index: 2, name: "2관문", gold: 5000 },
                ],
            },
        },
    },

    "서막-에키드나": {
        kind: "카제로스",
        releaseDate: "2024-01-31",
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
        releaseDate: "2024-07-24",
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
        releaseDate: "2024-09-25",
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
        releaseDate: "2025-01-22",
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
        releaseDate: "2025-08-20",
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
        releaseDate: "2025-08-20",
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
        releaseDate: "2022-04-27",
        gates: 3,
        difficulty: {
            "노말": {
                level: 1540,
                gold: 3300,
                gates: [
                    { index: 1, name: "1관문", gold: 750 },
                    { index: 2, name: "2관문", gold: 1100 },
                    { index: 3, name: "3관문", gold: 1450 },
                ],
            },
            "하드": {
                level: 1580,
                gold: 4300,
                gates: [
                    { index: 1, name: "1관문", gold: 900 },
                    { index: 2, name: "2관문", gold: 1400 },
                    { index: 3, name: "3관문", gold: 2000 },
                ],
            },
        },
    },

    "혼돈의 상아탑": {
        kind: "어비스",
        releaseDate: "2023-02-22",
        gates: 3,
        difficulty: {
            "노말": {
                level: 1600,
                gold: 5200,
                gates: [
                    { index: 1, name: "1관문", gold: 1200 },
                    { index: 2, name: "2관문", gold: 1600 },
                    { index: 3, name: "3관문", gold: 2400 },
                ],
            },
            "하드": {
                level: 1620,
                gold: 7200,
                gates: [
                    { index: 1, name: "1관문", gold: 1400 },
                    { index: 2, name: "2관문", gold: 2000 },
                    { index: 3, name: "3관문", gold: 3800 },
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
                gates: [
                    { index: 1, name: "1관문", gold: 14000 },
                    { index: 2, name: "2관문", gold: 21000 },
                ],
            },
            "하드": {
                level: 1730,
                gold: 44000,
                gates: [
                    { index: 1, name: "1관문", gold: 17500 },
                    { index: 2, name: "2관문", gold: 26500 },
                ],
            },
            "나메": {
                level: 1740,
                gold: 54000,
                gates: [
                    { index: 1, name: "1관문", gold: 21000 },
                    { index: 2, name: "2관문", gold: 33000 },
                ],
            },
        },
    },
};



