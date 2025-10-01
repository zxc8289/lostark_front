// src/app/lib/arcgrid/storage.ts
import type { Gem, CoreDef } from "./types";

const STORAGE_KEY = "arcgrid_state:v1";

/** 앱이 브라우저에서만 localStorage를 만지도록 보호 */
const isBrowser = () => typeof window !== "undefined";

/** 초기 상태(네가 쓰는 기본값과 일치하게 작성) */
export function makeInitialState() {
    return {
        params: { role: "dealer" as "dealer" | "supporter", efficiencyReductionByPoint: { 0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5 } },
        cores: [
            { family: "order", key: "order_sun", label: "질서의 해", grade: "ancient", enabled: true, minPts: 10, maxPts: 17 },
            { family: "order", key: "order_moon", label: "질서의 달", grade: "ancient", enabled: true, minPts: 10, maxPts: 17 },
            { family: "order", key: "order_star", label: "질서의 별", grade: "ancient", enabled: true, minPts: 10, maxPts: 14 },
            { family: "chaos", key: "chaos_sun", label: "혼돈의 해", grade: "ancient", enabled: true, minPts: 10, maxPts: 17 },
            { family: "chaos", key: "chaos_moon", label: "혼돈의 달", grade: "ancient", enabled: true, minPts: 10, maxPts: 17 },
            { family: "chaos", key: "chaos_star", label: "혼돈의 별", grade: "ancient", enabled: true, minPts: 10, maxPts: 14 },
        ] as CoreDef[],
        inventory: { order: [] as Gem[], chaos: [] as Gem[] },
    };
}

/** 저장 시 필요한 필드만 추려서 용량/호환성 확보 */
function pickPersistable(state: any) {
    return {
        params: state?.params,
        cores: (state?.cores || []).map((c: any) => ({
            family: c.family, key: c.key, label: c.label,
            grade: c.grade, enabled: !!c.enabled,
            minPts: Number(c.minPts || 0), maxPts: Number(c.maxPts || 0),
        })),
        inventory: {
            order: (state?.inventory?.order || []),
            chaos: (state?.inventory?.chaos || []),
        },
    };
}

/** 저장 */
export function saveState(state: any) {
    if (!isBrowser()) return;
    try {
        const data = JSON.stringify(pickPersistable(state));
        localStorage.setItem(STORAGE_KEY, data);
    } catch (e) {
        // 용량 초과/순환참조 등 예외는 무시(콘솔만)
        console.warn("[arcgrid] saveState failed:", e);
    }
}

/** 불러오기 + 기본값 머지(새 필드 추가해도 안전하게) */
export function loadState() {
    const base = makeInitialState();
    if (!isBrowser()) return base;

    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return base;

        const saved = JSON.parse(raw);

        // cores는 key 기준으로 머지해서 누락/새 필드 보완
        const baseCoreByKey = new Map(base.cores.map((c: CoreDef) => [c.key, c]));
        const mergedCores: CoreDef[] = base.cores.map((c: CoreDef) => {
            const s = (saved.cores || []).find((x: any) => x.key === c.key);
            return s ? { ...c, ...s } : c;
        });
        // 혹시 저장본에만 있고 기본엔 없는 코어가 있으면 뒤에 덧붙임
        for (const sc of saved.cores || []) {
            if (!baseCoreByKey.has(sc.key)) mergedCores.push(sc);
        }

        return {
            ...base,
            params: { ...base.params, ...(saved.params || {}) },
            cores: mergedCores,
            inventory: {
                order: saved.inventory?.order || base.inventory.order,
                chaos: saved.inventory?.chaos || base.inventory.chaos,
            },
        };
    } catch (e) {
        console.warn("[arcgrid] loadState failed:", e);
        return base;
    }
}

/** 필요하면 초기화 버튼에서 사용 */
export function clearState() {
    if (!isBrowser()) return;
    localStorage.removeItem(STORAGE_KEY);
}
