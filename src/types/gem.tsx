// types/gem.ts

export interface GemOption {
    name: string;
    lv: number;
    fixed?: boolean;
}

export interface Gem {
    id: string;
    family: 'order' | 'chaos';
    subType: string;
    baseWill: number;
    options: GemOption[];
}

export interface Core {
    family: 'order' | 'chaos';
    key: string;
    label: string;
    enabled: boolean;
    grade: 'heroic' | 'legend' | 'relic' | 'ancient';
    minPts: number;
    maxPts: number;
}

export interface OptimizationParams {
    efficiencyReductionByPoint: Record<number, number>;
}

export interface ActivationResult {
    activated: boolean[];
    spent: number;
    remain: number;
    pts: number;
    flex: Record<string, number>;
    flexScore: number;
}

export interface OptimizedItem {
    ids: (string | null)[];
    res: ActivationResult | null;
    t?: number;
    canReachNext?: boolean;
    reason?: string | null;
}

export interface OptimizationPlan {
    answer: Record<string, OptimizedItem>;
    used: Set<string>;
}