'use client';

import { CORES6 } from "./constants";
import type { AppState, CoreDef, Gem, Params } from "./types";

export const DEFAULT_PARAMS: Params = {
    efficiencyReductionByPoint: { 0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5 },
    role: 'dealer',
};


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
