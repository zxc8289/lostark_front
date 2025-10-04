import type { Grade, Params, SubType } from "./types";

export const CORE_WILL_BY_GRADE: Record<Grade, number> = {
  heroic: 9, legend: 12, relic: 15, ancient: 17
};

export const FAMILY_LABEL = { order: "질서", chaos: "혼돈" } as const;

export const SUB_TYPES: SubType[] = ["안정", "견고", "불변", "침식", "왜곡", "붕괴"];

// 레벨별 비선형 가중치 (index = Lv, 0은 미사용)
export const DEALER_WEIGHT_BY_LV: Record<string, number[]> = {
  "공격력": [0, 0.029, 0.067, 0.105, 0.134, 0.172],
  "추가 피해": [0, 0.060, 0.119, 0.187, 0.239, 0.299],
  "보스 피해": [0, 0.078, 0.156, 0.244, 0.313, 0.391],
};

export const SUPPORT_WEIGHT_BY_LV: Record<string, number[]> = {
  "아군 피해 강화": [0, 0.052, 0.104, 0.156, 0.208, 0.260],
  "아군 공격 강화": [0, 0.130, 0.260, 0.390, 0.520, 0.650],
  "낙인력": [0, 0.167, 0.334, 0.501, 0.668, 0.835],
};

// export const SUPPORT_WEIGHT_BY_LV: Record<string, number[]> = {
//   "낙인력": [0, 0.167, 0.334, 0.501, 0.668, 0.835],
//   "아군 피해 강화": [0, 0.052, 0.104, 0.156, 0.208, 0.260],
//   "아군 공격 강화": [0, 0.130, 0.260, 0.390, 0.520, 0.650],
// };


export const ROLE_KEYS: Record<Role, readonly string[]> = {
  dealer: ["보스 피해", "추가 피해", "공격력"] as const,
  supporter: ["낙인력", "아군 피해 강화", "아군 공격 강화"] as const,
} as const;

export type Role = "dealer" | "supporter";


export const FLEX_OPTION_POOL = [
  "보스 피해", "추가 피해", "공격력", "낙인력", "아군 피해 강화", "아군 공격 강화"
];



export const DEFAULT_PARAMS: Params = {
  efficiencyReductionByPoint: { 0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5 },
  role: 'dealer',
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
