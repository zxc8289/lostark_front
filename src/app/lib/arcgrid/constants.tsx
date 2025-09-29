import type { Grade, SubType } from "./types";

export const CORE_WILL_BY_GRADE: Record<Grade, number> = {
    heroic: 9, legend: 12, relic: 15, ancient: 17
};

export const FAMILY_LABEL = { order: "질서", chaos: "혼돈" } as const;

export const SUB_TYPES: SubType[] = ["안정", "견고", "불변", "침식", "왜곡", "붕괴"];

export const FLEX_OPTION_POOL = [
    "보스 피해", "추가 피해", "공격력", "낙인력", "아군 피해 강화", "아군 공격 강화"
];

export const DPS_WEIGHTS: Record<string, number> = {
    "보스 피해": 1.0, "추가 피해": 0.6, "공격력": 0.4
};

export const DEFAULT_PARAMS = {
    efficiencyReductionByPoint: { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5 }
};

export const CORES6 = [
    { family: "order", key: "order_sun", label: "질서의 해", grade: "ancient" },
    { family: "order", key: "order_moon", label: "질서의 달", grade: "ancient" },
    { family: "order", key: "order_star", label: "질서의 별", grade: "ancient" },
    { family: "chaos", key: "chaos_sun", label: "혼돈의 해", grade: "ancient" },
    { family: "chaos", key: "chaos_moon", label: "혼돈의 달", grade: "ancient" },
    { family: "chaos", key: "chaos_star", label: "혼돈의 별", grade: "ancient" },
] as const;

export const GRADE_THRESHOLDS: Record<Grade, number[]> = {
    heroic: [10],
    legend: [10, 14],
    relic: [10, 14, 17, 18, 19, 20],
    ancient: [10, 14, 17, 18, 19, 20],
};

export const STAT_ALIAS: Record<string, string> = {
    "보스 피해": "보", "추가 피해": "추", "공격력": "공", "낙인력": "낙", "아군 피해 강화": "아피", "아군 공격 강화": "아공"
};

export const ORDER_PERMS: string[][] = [
    ["order_sun", "order_moon", "order_star"],
    ["order_moon", "order_sun", "order_star"],
    ["order_moon", "order_star", "order_sun"],
    ["order_star", "order_sun", "order_moon"],
    ["order_star", "order_moon", "order_sun"],
    ["order_sun", "order_star", "order_moon"],
];
