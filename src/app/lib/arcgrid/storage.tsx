'use client';

import type { CoreDef, Gem } from "./types";
import { CORES6, DEFAULT_PARAMS } from "./constants";

export interface AppState {
    params: { efficiencyReductionByPoint: Record<number, number> };
    cores: CoreDef[];
    inventory: { order: Gem[]; chaos: Gem[] };
}

const skey = "arcgrid:explorer";

export function makeInitialState(): AppState {
    return {
        params: DEFAULT_PARAMS,
        cores: (CORES6 as any).map((c: any) => ({
            ...c, enabled: true, minPts: 10, maxPts: 20
        })) as CoreDef[],
        inventory: { order: [], chaos: [] },
    };
}

export function loadState(): AppState {
    try {
        const raw = localStorage.getItem(skey);
        return raw ? JSON.parse(raw) : makeInitialState();
    } catch {
        return makeInitialState();
    }
}

export function saveState(st: AppState) {
    localStorage.setItem(skey, JSON.stringify(st));
}
