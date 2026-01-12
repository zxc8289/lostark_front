/// <reference lib="webworker" />

import {
    optimizeAllByPermutations,
    enumerateTopPlansByStats,
    bestTotalPoints,
} from "./optimizer";

import type { CoreDef, Gem, Params, PlanPack } from "./types";
import type { Role } from "./constants";
import type { ScoredPlan } from "./optimizer";

type Constraints = Record<string, { minPts: number; maxPts: number }>;
type Inventory = { order: Gem[]; chaos: Gem[] };

type Req =
    | {
        id: string;
        action: "points";
        cores: CoreDef[];
        params: Params;
        inventory: Inventory;
        constraints: Constraints;
    }
    | {
        id: string;
        action: "statsAtBest";
        cores: CoreDef[];
        params: Params;
        inventory: Inventory;
        constraints: Constraints;
        role: Role;
        topK: number;
        capPerCore: number;
    }
    | {
        id: string;
        action: "statsAny";
        cores: CoreDef[];
        params: Params;
        inventory: Inventory;
        constraints: Constraints;
        role: Role;
        topK: number;
        capPerCore: number;
    };

type Res =
    | { id: string; ok: true; action: Req["action"]; result: any }
    | { id: string; ok: false; action: Req["action"]; error: string };

function errToMsg(e: unknown) {
    if (e instanceof Error) return e.message;
    try {
        return JSON.stringify(e);
    } catch {
        return String(e);
    }
}

const ctx = self as unknown as DedicatedWorkerGlobalScope;

ctx.onmessage = (ev: MessageEvent<Req>) => {
    const msg = ev.data;

    try {
        if (msg.action === "points") {
            const plan: PlanPack = optimizeAllByPermutations(
                msg.cores,
                msg.params,
                msg.inventory,
                msg.constraints
            );

            const res: Res = { id: msg.id, ok: true, action: msg.action, result: plan };
            ctx.postMessage(res);
            return;
        }

        if (msg.action === "statsAtBest") {
            const bestPts = bestTotalPoints(msg.cores, msg.params, msg.inventory, msg.constraints);

            const list: ScoredPlan[] = enumerateTopPlansByStats(
                msg.cores,
                msg.params,
                msg.inventory,
                msg.constraints,
                msg.role,
                msg.topK,
                bestPts,
                msg.capPerCore
            );

            const res: Res = { id: msg.id, ok: true, action: msg.action, result: { bestPts, list } };
            ctx.postMessage(res);
            return;
        }

        // statsAny
        const list: ScoredPlan[] = enumerateTopPlansByStats(
            msg.cores,
            msg.params,
            msg.inventory,
            msg.constraints,
            msg.role,
            msg.topK,
            null,
            msg.capPerCore
        );

        const res: Res = { id: msg.id, ok: true, action: msg.action, result: list };
        ctx.postMessage(res);
    } catch (e) {
        const res: Res = { id: msg.id, ok: false, action: msg.action, error: errToMsg(e) };
        ctx.postMessage(res);
    }
};

// TS가 워커 파일을 모듈로 취급하게
export { };
