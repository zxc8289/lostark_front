// raidInformation.ts

export type RaidKind = "군단장" | "카제로스" | "어비스" | "에픽" | "그림자";
export type DifficultyKey = "노말" | "하드" | "나메" | "싱글"; // 싱글 추가

type Gate = {
    index: number;
    name: string;
    gold: number;
    boundGold: number; // 귀속 골드 추가
    bonusCost: number;
};

type Difficulty = {
    level: number;
    gold: number;
    boundGold: number; // 귀속 골드 추가
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
                    { index: 1, name: "1관문", gold: 0, boundGold: 500, bonusCost: 75 },
                    { index: 2, name: "2관문", gold: 0, boundGold: 700, bonusCost: 100 },
                ],
            },
            "노말": {
                level: 1415,
                gold: 0,
                boundGold: 1200,
                gates: [
                    { index: 1, name: "1관문", gold: 0, boundGold: 500, bonusCost: 75 },
                    { index: 2, name: "2관문", gold: 0, boundGold: 7000, bonusCost: 100 },
                ],
            },
            "하드": {
                level: 1445,
                gold: 0,
                boundGold: 1800,
                gates: [
                    { index: 1, name: "1관문", gold: 0, boundGold: 700, bonusCost: 175 },
                    { index: 2, name: "2관문", gold: 0, boundGold: 1100, bonusCost: 275 },
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
                    { index: 1, name: "1관문", gold: 0, boundGold: 600, bonusCost: 100 },
                    { index: 2, name: "2관문", gold: 0, boundGold: 1000, bonusCost: 150 },
                ],
            },
            "노말": {
                level: 1430,
                gold: 0,
                boundGold: 1600,
                gates: [
                    { index: 1, name: "1관문", gold: 0, boundGold: 600, bonusCost: 100 },
                    { index: 2, name: "2관문", gold: 0, boundGold: 1000, bonusCost: 150 },
                ],
            },
            "하드": {
                level: 1460,
                gold: 0,
                boundGold: 2400,
                gates: [
                    { index: 1, name: "1관문", gold: 0, boundGold: 900, bonusCost: 225 },
                    { index: 2, name: "2관문", gold: 0, boundGold: 1500, bonusCost: 375 },
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
                    { index: 1, name: "1관문", gold: 0, boundGold: 600, bonusCost: 100 },
                    { index: 2, name: "2관문", gold: 0, boundGold: 900, bonusCost: 150 },
                    { index: 3, name: "3관문", gold: 0, boundGold: 1500, bonusCost: 200 },
                ],
            },
            "노말": {
                level: 1475,
                gold: 0,
                boundGold: 3000,
                gates: [
                    { index: 1, name: "1관문", gold: 0, boundGold: 600, bonusCost: 100 },
                    { index: 2, name: "2관문", gold: 0, boundGold: 900, bonusCost: 150 },
                    { index: 3, name: "3관문", gold: 0, boundGold: 1500, bonusCost: 200 },
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
                    { index: 1, name: "1관문", gold: 0, boundGold: 1000, bonusCost: 100 },
                    { index: 2, name: "2관문", gold: 0, boundGold: 1000, bonusCost: 150 },
                    { index: 3, name: "3관문", gold: 0, boundGold: 1000, bonusCost: 200 },
                    { index: 4, name: "4관문", gold: 0, boundGold: 1600, bonusCost: 375 },
                ],
            },
            "노말": {
                level: 1490,
                gold: 0,
                boundGold: 4600,
                gates: [
                    { index: 1, name: "1관문", gold: 0, boundGold: 1000, bonusCost: 100 },
                    { index: 2, name: "2관문", gold: 0, boundGold: 1000, bonusCost: 150 },
                    { index: 3, name: "3관문", gold: 0, boundGold: 1000, bonusCost: 200 },
                    { index: 4, name: "4관문", gold: 0, boundGold: 1600, bonusCost: 375 },
                ],
            },
            "하드": {
                level: 1540,
                gold: 0,
                boundGold: 5600,
                gates: [
                    { index: 1, name: "1관문", gold: 0, boundGold: 1200, bonusCost: 300 },
                    { index: 2, name: "2관문", gold: 0, boundGold: 1200, bonusCost: 300 },
                    { index: 3, name: "3관문", gold: 0, boundGold: 1200, bonusCost: 300 },
                    { index: 4, name: "4관문", gold: 0, boundGold: 2000, bonusCost: 500 },
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
                    { index: 1, name: "1관문", gold: 0, boundGold: 850, bonusCost: 190 },
                    { index: 2, name: "2관문", gold: 0, boundGold: 1550, bonusCost: 230 },
                    { index: 3, name: "3관문", gold: 0, boundGold: 2300, bonusCost: 330 },
                ],
            },
            "노말": {
                level: 1580,
                gold: 0,
                boundGold: 4700,
                gates: [
                    { index: 1, name: "1관문", gold: 0, boundGold: 850, bonusCost: 190 },
                    { index: 2, name: "2관문", gold: 0, boundGold: 1550, bonusCost: 230 },
                    { index: 3, name: "3관문", gold: 0, boundGold: 2300, bonusCost: 330 },
                ],
            },
            "하드": {
                level: 1600,
                gold: 0,
                boundGold: 6000,
                gates: [
                    { index: 1, name: "1관문", gold: 0, boundGold: 1200, bonusCost: 300 },
                    { index: 2, name: "2관문", gold: 0, boundGold: 2000, bonusCost: 500 },
                    { index: 3, name: "3관문", gold: 0, boundGold: 2800, bonusCost: 700 },
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
                    { index: 1, name: "1관문", gold: 0, boundGold: 1600, bonusCost: 360 },
                    { index: 2, name: "2관문", gold: 0, boundGold: 2000, bonusCost: 440 },
                    { index: 3, name: "3관문", gold: 0, boundGold: 2800, bonusCost: 640 },
                ],
            },
            "노말": {
                level: 1610,
                gold: 0,
                boundGold: 6400,
                gates: [
                    { index: 1, name: "1관문", gold: 0, boundGold: 1600, bonusCost: 360 },
                    { index: 2, name: "2관문", gold: 0, boundGold: 2000, bonusCost: 440 },
                    { index: 3, name: "3관문", gold: 0, boundGold: 2800, bonusCost: 640 },
                ],
            },
            "하드": {
                level: 1630,
                gold: 0,
                boundGold: 13000,
                gates: [
                    { index: 1, name: "1관문", gold: 0, boundGold: 2000, bonusCost: 500 },
                    { index: 2, name: "2관문", gold: 0, boundGold: 2400, bonusCost: 600 },
                    { index: 3, name: "3관문", gold: 0, boundGold: 3600, bonusCost: 900 },
                    { index: 4, name: "4관문", gold: 0, boundGold: 5000, bonusCost: 1250 },
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
                    { index: 1, name: "1관문", gold: 2200, boundGold: 0, bonusCost: 720 },
                    { index: 2, name: "2관문", gold: 5000, boundGold: 0, bonusCost: 1630 },
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
                    { index: 1, name: "1관문", gold: 0, boundGold: 1900, bonusCost: 310 },
                    { index: 2, name: "2관문", gold: 0, boundGold: 4200, bonusCost: 700 },
                ],
            },
            "노말": {
                level: 1620,
                gold: 0,
                boundGold: 6100,
                gates: [
                    { index: 1, name: "1관문", gold: 0, boundGold: 1900, bonusCost: 310 },
                    { index: 2, name: "2관문", gold: 0, boundGold: 4200, bonusCost: 700 },
                ],
            },
            "하드": {
                level: 1630,
                gold: 7200,
                boundGold: 0,
                gates: [
                    { index: 1, name: "1관문", gold: 2200, boundGold: 0, bonusCost: 720 },
                    { index: 2, name: "2관문", gold: 5000, boundGold: 0, bonusCost: 1630 },
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
                    { index: 1, name: "1관문", gold: 1750, boundGold: 1750, bonusCost: 750 },
                    { index: 2, name: "2관문", gold: 4000, boundGold: 4000, bonusCost: 1780 },
                ],
            },
            "노말": {
                level: 1660,
                gold: 11500,
                boundGold: 0,
                gates: [
                    { index: 1, name: "1관문", gold: 3500, boundGold: 0, bonusCost: 750 },
                    { index: 2, name: "2관문", gold: 8000, boundGold: 0, bonusCost: 1780 },
                ],
            },
            "하드": {
                level: 1680,
                gold: 18000,
                boundGold: 0,
                gates: [
                    { index: 1, name: "1관문", gold: 5500, boundGold: 0, bonusCost: 1820 },
                    { index: 2, name: "2관문", gold: 12500, boundGold: 0, bonusCost: 4150 },
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
                    { index: 1, name: "1관문", gold: 2750, boundGold: 2750, bonusCost: 1820 },
                    { index: 2, name: "2관문", gold: 5500, boundGold: 5500, bonusCost: 3720 },
                ],
            },
            "노말": {
                level: 1670,
                gold: 16500,
                boundGold: 0,
                gates: [
                    { index: 1, name: "1관문", gold: 5500, boundGold: 0, bonusCost: 1820 },
                    { index: 2, name: "2관문", gold: 11000, boundGold: 0, bonusCost: 3720 },
                ],
            },
            "하드": {
                level: 1690,
                gold: 23000,
                boundGold: 0,
                gates: [
                    { index: 1, name: "1관문", gold: 7500, boundGold: 0, bonusCost: 2400 },
                    { index: 2, name: "2관문", gold: 15500, boundGold: 0, bonusCost: 5100 },
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
                    { index: 1, name: "1관문", gold: 2000, boundGold: 2000, bonusCost: 1300 },
                    { index: 2, name: "2관문", gold: 3500, boundGold: 3500, bonusCost: 2350 },
                    { index: 3, name: "3관문", gold: 5000, boundGold: 5000, bonusCost: 3360 },
                ],
            },
            "노말": {
                level: 1680,
                gold: 21000,
                boundGold: 0,
                gates: [
                    { index: 1, name: "1관문", gold: 4000, boundGold: 0, bonusCost: 1300 },
                    { index: 2, name: "2관문", gold: 7000, boundGold: 0, bonusCost: 2350 },
                    { index: 3, name: "3관문", gold: 10000, boundGold: 0, bonusCost: 3360 },
                ],
            },
            "하드": {
                level: 1700,
                gold: 27000,
                boundGold: 0,
                gates: [
                    { index: 1, name: "1관문", gold: 5000, boundGold: 0, bonusCost: 1650 },
                    { index: 2, name: "2관문", gold: 8000, boundGold: 0, bonusCost: 2640 },
                    { index: 3, name: "3관문", gold: 14000, boundGold: 0, bonusCost: 4060 },
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
                    { index: 1, name: "1관문", gold: 12500, boundGold: 0, bonusCost: 4000 },
                    { index: 2, name: "2관문", gold: 20500, boundGold: 0, bonusCost: 6560 },
                ],
            },
            "하드": {
                level: 1720,
                gold: 42000,
                boundGold: 0,
                gates: [
                    { index: 1, name: "1관문", gold: 15000, boundGold: 0, bonusCost: 4800 },
                    { index: 2, name: "2관문", gold: 27000, boundGold: 0, bonusCost: 8640 },
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
                    { index: 1, name: "1관문", gold: 14000, boundGold: 0, bonusCost: 4480 },
                    { index: 2, name: "2관문", gold: 26000, boundGold: 0, bonusCost: 8320 },
                ],
            },
            "하드": {
                level: 1730,
                gold: 52000,
                boundGold: 0,
                gates: [
                    { index: 1, name: "1관문", gold: 17000, boundGold: 0, bonusCost: 5440 },
                    { index: 2, name: "2관문", gold: 35000, boundGold: 0, bonusCost: 11200 },
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
                    { index: 1, name: "1관문", gold: 0, boundGold: 750, bonusCost: 180 },
                    { index: 2, name: "2관문", gold: 0, boundGold: 1100, bonusCost: 200 },
                    { index: 3, name: "3관문", gold: 0, boundGold: 1450, bonusCost: 270 },
                ],
            },
            "노말": {
                level: 1540,
                gold: 0,
                boundGold: 3300,
                gates: [
                    { index: 1, name: "1관문", gold: 0, boundGold: 750, bonusCost: 180 },
                    { index: 2, name: "2관문", gold: 0, boundGold: 1100, bonusCost: 200 },
                    { index: 3, name: "3관문", gold: 0, boundGold: 1450, bonusCost: 270 },
                ],
            },
            "하드": {
                level: 1580,
                gold: 0,
                boundGold: 4300,
                gates: [
                    { index: 1, name: "1관문", gold: 0, boundGold: 900, bonusCost: 225 },
                    { index: 2, name: "2관문", gold: 0, boundGold: 1400, bonusCost: 350 },
                    { index: 3, name: "3관문", gold: 0, boundGold: 2000, bonusCost: 500 },
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
                    { index: 1, name: "1관문", gold: 0, boundGold: 1200, bonusCost: 180 },
                    { index: 2, name: "2관문", gold: 0, boundGold: 1600, bonusCost: 220 },
                    { index: 3, name: "3관문", gold: 0, boundGold: 2400, bonusCost: 300 },
                ],
            },
            "노말": {
                level: 1600,
                gold: 0,
                boundGold: 5200,
                gates: [
                    { index: 1, name: "1관문", gold: 0, boundGold: 1200, bonusCost: 180 },
                    { index: 2, name: "2관문", gold: 0, boundGold: 1600, bonusCost: 220 },
                    { index: 3, name: "3관문", gold: 0, boundGold: 2400, bonusCost: 300 },
                ],
            },
            "하드": {
                level: 1620,
                gold: 0,
                boundGold: 7200,
                gates: [
                    { index: 1, name: "1관문", gold: 0, boundGold: 1400, bonusCost: 350 },
                    { index: 2, name: "2관문", gold: 0, boundGold: 2000, bonusCost: 500 },
                    { index: 3, name: "3관문", gold: 0, boundGold: 3800, bonusCost: 950 },
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
                    { index: 1, name: "1관문", gold: 14000, boundGold: 0, bonusCost: 4480 },
                    { index: 2, name: "2관문", gold: 21000, boundGold: 0, bonusCost: 6720 },
                ],
            },
            "하드": {
                level: 1730,
                gold: 44000,
                boundGold: 0,
                gates: [
                    { index: 1, name: "1관문", gold: 17500, boundGold: 0, bonusCost: 5600 },
                    { index: 2, name: "2관문", gold: 26500, boundGold: 0, bonusCost: 8480 },
                ],
            },
            "나메": {
                level: 1740,
                gold: 54000,
                boundGold: 0,
                gates: [
                    { index: 1, name: "1관문", gold: 21000, boundGold: 0, bonusCost: 6720 },
                    { index: 2, name: "2관문", gold: 33000, boundGold: 0, bonusCost: 10560 },
                ],
            },
        },
    },

    "지평의 성당": {
        kind: "어비스",
        releaseDate: "2026-03-18",
        gates: 3,
        difficulty: {
            "노말": {
                level: 1700,
                gold: 0,
                boundGold: 30000,
                gates: [
                    { index: 1, name: "1관문", gold: 0, boundGold: 13500, bonusCost: 4320 },
                    { index: 2, name: "2관문", gold: 0, boundGold: 16500, bonusCost: 5280 },
                ],
            },
            "하드": {
                level: 1720,
                gold: 0,
                boundGold: 40000,
                gates: [
                    { index: 1, name: "1관문", gold: 0, boundGold: 16000, bonusCost: 5120 },
                    { index: 2, name: "2관문", gold: 0, boundGold: 24000, bonusCost: 7680 },
                ],
            },
            "나메": {
                level: 1750,
                gold: 0,
                boundGold: 50000,
                gates: [
                    { index: 1, name: "1관문", gold: 0, boundGold: 20000, bonusCost: 6400 },
                    { index: 2, name: "2관문", gold: 0, boundGold: 30000, bonusCost: 9600 },
                ],
            },
        },
    },

};