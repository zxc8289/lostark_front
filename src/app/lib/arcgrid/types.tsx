import { Role } from "./constants";

export type Family = 'order' | 'chaos';
export type Grade = 'heroic' | 'legend' | 'relic' | 'ancient';
export type SubType = '안정' | '견고' | '불변' | '침식' | '왜곡' | '붕괴';

export interface GemOption { name: string; lv: number; fixed?: boolean }
export interface Gem {
    id: string;
    family: Family;
    subType: SubType;
    baseWill: number;
    options: GemOption[];
}

export interface AppState {
    params: Params;
    cores: CoreDef[];
    inventory: { order: Gem[]; chaos: Gem[] };
}

export interface CoreDef {
    family: Family;
    key: string;
    label: string;
    grade: Grade;
    enabled: boolean;
    minPts: number;
    maxPts: number;
}

export interface Params {
    efficiencyReductionByPoint: Record<number, number>;
    role?: Role;
}

export interface OptimizeItem {
    ids: (string | null)[];
    res: null | {
        activated: boolean[];
        spent: number;
        remain: number;
        pts: number;
        flex: Record<string, number>;
        flexScore: number;
    };
    t?: number;
    canReachNext?: boolean;
    reason?: string | null;
}

export interface PlanPack {
    answer: Record<string, OptimizeItem>;
    used: string[];
}

export interface ExtremePlan {
    plan: PlanPack;
    focusKey: string;
}
