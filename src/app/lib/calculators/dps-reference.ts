export type RaidCategory = "카제로스" | "그림자" | "어비스 던전";
export type DiffKey = "노말" | "하드" | "나메";

type GateRow = {
    gate: number;
    hp: number;
    range: [number, number]; // [강투 컷, 잔혈 컷]
};

// 8인 레이드: 잔혈 20% / 강투 15%
// 4인 레이드(세르카, 지평의 성당): 잔혈 40% / 강투 30%
export const RAID_DATA: Record<RaidCategory, Record<string, Record<DiffKey, GateRow[]>>> = {
    "카제로스": {
        "1막": {
            노말: [
                { gate: 1, hp: 1615, range: [270, 365] },
                { gate: 2, hp: 2132, range: [335, 450] },
            ],
            하드: [
                { gate: 1, hp: 2698, range: [450, 600] },
                { gate: 2, hp: 3985, range: [600, 800] },
            ],
            나메: [],
        },
        "2막": {
            노말: [
                { gate: 1, hp: 2754, range: [450, 600] },
                { gate: 2, hp: 3994, range: [610, 810] },
            ],
            하드: [
                { gate: 1, hp: 5163, range: [900, 1200] },
                { gate: 2, hp: 8253, range: [1200, 1600] },
            ],
            나메: [],
        },
        "3막": {
            노말: [
                { gate: 1, hp: 3687, range: [525, 700] },
                { gate: 2, hp: 3346, range: [460, 620] },
                { gate: 3, hp: 7319, range: [1000, 1360] },
            ],
            하드: [
                { gate: 1, hp: 5872, range: [846, 1125] },
                { gate: 2, hp: 5968, range: [873, 1170] },
                { gate: 3, hp: 12527, range: [1828, 2508] },
            ],
            나메: [],
        },
        "종막 익스트림": {
            노말: [],
            하드: [],
            나메: [],
        },
        "4막": {
            노말: [
                { gate: 1, hp: 4750, range: [740, 990] },
                { gate: 2, hp: 5250, range: [950, 1270] },
            ],
            하드: [
                { gate: 1, hp: 9500, range: [1425, 1900] },
                { gate: 2, hp: 10500, range: [1575, 2250] },
            ],
            나메: [],
        },
        종막: {
            노말: [
                { gate: 1, hp: 8041, range: [1190, 1590] },
                { gate: 2, hp: 7629, range: [1050, 1400] },
            ],
            하드: [
                { gate: 1, hp: 13719, range: [2030, 2706] },
                { gate: 2, hp: 19619, range: [3433, 4577] },
            ],
            나메: [],
        },
    },
    "그림자": {
        "세르카": {
            노말: [
                { gate: 1, hp: 3699, range: [1100, 1480] },
                { gate: 2, hp: 4768, range: [1430, 1900] },
            ],
            하드: [
                { gate: 1, hp: 7695, range: [2300, 3070] },
                { gate: 2, hp: 9919, range: [2980, 3970] },
            ],
            나메: [
                { gate: 1, hp: 11941, range: [3580, 4770] },
                { gate: 2, hp: 15392, range: [4620, 6160] },
            ],
        },
        "벨가르딘": {
            노말: [
                { gate: 1, hp: 17393, range: [2609, 3479] },
                { gate: 2, hp: 19506, range: [2926, 3901] },
            ],
            하드: [
                { gate: 1, hp: 27686, range: [4153, 5537] },
                { gate: 2, hp: 31340, range: [4701, 6268] },
            ],
            나메: [
                { gate: 1, hp: 49516, range: [7427, 9903] },
                { gate: 2, hp: 56051, range: [8408, 11210] },
            ],
        },
    },
    "어비스 던전": {
        "지평의 성당": {
            노말: [
                { gate: 1, hp: 3112, range: [990, 1330] },
                { gate: 2, hp: 3125, range: [938, 1250] },
            ],
            하드: [
                { gate: 1, hp: 6765, range: [2157, 2876] },
                { gate: 2, hp: 6964, range: [2089, 2785] },
            ],
            나메: [
                { gate: 1, hp: 11400, range: [3602, 4854] },
                { gate: 2, hp: 11900, range: [3570, 4760] },
            ],
        },
    },
};

