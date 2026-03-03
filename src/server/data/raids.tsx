// raidInformation.ts

export type RaidKind = "군단장" | "카제로스" | "어비스" | "에픽" | "그림자";
export type DifficultyKey = "노말" | "하드" | "나메";

type Gate = { index: number; name: string; gold: number; bonusCost: number; };
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
                    { index: 1, name: "1관문", gold: 500, bonusCost: 300 },
                    { index: 2, name: "2관문", gold: 700, bonusCost: 300 },
                ],
            },
            "하드": {
                level: 1445,
                gold: 1800,
                gates: [
                    { index: 1, name: "1관문", gold: 700, bonusCost: 300 },
                    { index: 2, name: "2관문", gold: 1100, bonusCost: 300 },
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
                    { index: 1, name: "1관문", gold: 600, bonusCost: 300 },
                    { index: 2, name: "2관문", gold: 1000, bonusCost: 300 },
                ],
            },
            "하드": {
                level: 1460,
                gold: 2400,
                gates: [
                    { index: 1, name: "1관문", gold: 900, bonusCost: 300 },
                    { index: 2, name: "2관문", gold: 1500, bonusCost: 300 },
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
                    { index: 1, name: "1관문", gold: 600, bonusCost: 300 },
                    { index: 2, name: "2관문", gold: 900, bonusCost: 300 },
                    { index: 3, name: "3관문", gold: 1500, bonusCost: 300 },
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
                    { index: 1, name: "1관문", gold: 1000, bonusCost: 300 },
                    { index: 2, name: "2관문", gold: 1000, bonusCost: 300 },
                    { index: 3, name: "3관문", gold: 1000, bonusCost: 300 },
                    { index: 4, name: "4관문", gold: 1600, bonusCost: 300 },
                ],
            },
            "하드": {
                level: 1540,
                gold: 5600,
                gates: [
                    { index: 1, name: "1관문", gold: 1200, bonusCost: 300 },
                    { index: 2, name: "2관문", gold: 1200, bonusCost: 300 },
                    { index: 3, name: "3관문", gold: 1200, bonusCost: 300 },
                    { index: 4, name: "4관문", gold: 2000, bonusCost: 300 },
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
                    { index: 1, name: "1관문", gold: 850, bonusCost: 300 },
                    { index: 2, name: "2관문", gold: 1550, bonusCost: 300 },
                    { index: 3, name: "3관문", gold: 2300, bonusCost: 300 },
                ],
            },
            "하드": {
                level: 1600,
                gold: 6000,
                gates: [
                    { index: 1, name: "1관문", gold: 1200, bonusCost: 300 },
                    { index: 2, name: "2관문", gold: 2000, bonusCost: 300 },
                    { index: 3, name: "3관문", gold: 2800, bonusCost: 300 },
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
                    { index: 1, name: "1관문", gold: 1600, bonusCost: 360 },
                    { index: 2, name: "2관문", gold: 2000, bonusCost: 440 },
                    { index: 3, name: "3관문", gold: 2800, bonusCost: 640 },
                ],
            },
            "하드": {
                level: 1630,
                gold: 13000,
                gates: [
                    { index: 1, name: "1관문", gold: 2000, bonusCost: 500 },
                    { index: 2, name: "2관문", gold: 2400, bonusCost: 600 },
                    { index: 3, name: "3관문", gold: 3600, bonusCost: 900 },
                    { index: 4, name: "4관문", gold: 5000, bonusCost: 1250 },
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
                    { index: 1, name: "1관문", gold: 2200, bonusCost: 720 },
                    { index: 2, name: "2관문", gold: 5000, bonusCost: 1630 },
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
                    { index: 1, name: "1관문", gold: 1900, bonusCost: 310 },
                    { index: 2, name: "2관문", gold: 4200, bonusCost: 700 },
                ],
            },
            "하드": {
                level: 1630,
                gold: 7200,
                gates: [
                    { index: 1, name: "1관문", gold: 2200, bonusCost: 720 },
                    { index: 2, name: "2관문", gold: 5000, bonusCost: 1630 },
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
                    { index: 1, name: "1관문", gold: 3500, bonusCost: 750 },
                    { index: 2, name: "2관문", gold: 8000, bonusCost: 1780 },
                ],
            },
            "하드": {
                level: 1680,
                gold: 18000,
                gates: [
                    { index: 1, name: "1관문", gold: 5500, bonusCost: 1820 },
                    { index: 2, name: "2관문", gold: 12500, bonusCost: 4150 },
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
                    { index: 1, name: "1관문", gold: 5500, bonusCost: 1820 },
                    { index: 2, name: "2관문", gold: 11000, bonusCost: 3720 },
                ],
            },
            "하드": {
                level: 1690,
                gold: 23000,
                gates: [
                    { index: 1, name: "1관문", gold: 7500, bonusCost: 2400 },
                    { index: 2, name: "2관문", gold: 15500, bonusCost: 5100 },
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
                    { index: 1, name: "1관문", gold: 4000, bonusCost: 1300 },
                    { index: 2, name: "2관문", gold: 7000, bonusCost: 2350 },
                    { index: 3, name: "3관문", gold: 10000, bonusCost: 3360 },
                ],
            },
            "하드": {
                level: 1700,
                gold: 27000,
                gates: [
                    { index: 1, name: "1관문", gold: 5000, bonusCost: 1650 },
                    { index: 2, name: "2관문", gold: 8000, bonusCost: 2640 },
                    { index: 3, name: "3관문", gold: 14000, bonusCost: 4060 },
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
                    { index: 1, name: "1관문", gold: 12500, bonusCost: 4000 },
                    { index: 2, name: "2관문", gold: 20500, bonusCost: 6560 },
                ],
            },
            "하드": {
                level: 1720,
                gold: 42000,
                gates: [
                    { index: 1, name: "1관문", gold: 15000, bonusCost: 4800 },
                    { index: 2, name: "2관문", gold: 27000, bonusCost: 8640 },
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
                gates: [
                    { index: 1, name: "1관문", gold: 14000, bonusCost: 4480 },
                    { index: 2, name: "2관문", gold: 26000, bonusCost: 8320 },
                ],
            },
            "하드": {
                level: 1730,
                gold: 52000,
                gates: [
                    { index: 1, name: "1관문", gold: 17000, bonusCost: 5440 },
                    { index: 2, name: "2관문", gold: 35000, bonusCost: 11200 },
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
                    { index: 1, name: "1관문", gold: 750, bonusCost: 180 },
                    { index: 2, name: "2관문", gold: 1100, bonusCost: 200 },
                    { index: 3, name: "3관문", gold: 1450, bonusCost: 270 },
                ],
            },
            "하드": {
                level: 1580,
                gold: 4300,
                gates: [
                    { index: 1, name: "1관문", gold: 900, bonusCost: 225 },
                    { index: 2, name: "2관문", gold: 1400, bonusCost: 350 },
                    { index: 3, name: "3관문", gold: 2000, bonusCost: 500 },
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
                    { index: 1, name: "1관문", gold: 1200, bonusCost: 180 },
                    { index: 2, name: "2관문", gold: 1600, bonusCost: 220 },
                    { index: 3, name: "3관문", gold: 2400, bonusCost: 300 },
                ],
            },
            "하드": {
                level: 1620,
                gold: 7200,
                gates: [
                    { index: 1, name: "1관문", gold: 1400, bonusCost: 350 },
                    { index: 2, name: "2관문", gold: 2000, bonusCost: 500 },
                    { index: 3, name: "3관문", gold: 3800, bonusCost: 950 },
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
                    { index: 1, name: "1관문", gold: 14000, bonusCost: 4480 },
                    { index: 2, name: "2관문", gold: 21000, bonusCost: 6720 },
                ],
            },
            "하드": {
                level: 1730,
                gold: 44000,
                gates: [
                    { index: 1, name: "1관문", gold: 17500, bonusCost: 5600 },
                    { index: 2, name: "2관문", gold: 26500, bonusCost: 8480 },
                ],
            },
            "나메": {
                level: 1740,
                gold: 54000,
                gates: [
                    { index: 1, name: "1관문", gold: 21000, bonusCost: 6720 },
                    { index: 2, name: "2관문", gold: 33000, bonusCost: 10560 },
                ],
            },
        },
    },
};