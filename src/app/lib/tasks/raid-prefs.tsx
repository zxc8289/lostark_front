// lib/raid-prefs.ts
import type { DifficultyKey } from "@/server/data/raids";

export type CharacterTaskPrefs = {
    raids: Record<
        string, // raidName
        {
            enabled: boolean;
            difficulty: DifficultyKey;
            gates: number[];
        }
    >;
    order?: string[];
};

const PREFIX = "raidPrefs:";
const KEY = (name: string) => `${PREFIX}${encodeURIComponent(name)}`;

// ✅ 기본 read/write
export function readPrefs(name: string): CharacterTaskPrefs | null {
    try {
        const raw = localStorage.getItem(KEY(name));
        return raw ? (JSON.parse(raw) as CharacterTaskPrefs) : null;
    } catch {
        return null;
    }
}

export function writePrefs(name: string, prefs: CharacterTaskPrefs) {
    try {
        localStorage.setItem(KEY(name), JSON.stringify(prefs));
    } catch {
        // quota 문제 등 나면 그냥 무시
    }
}

export function clearCharPrefs(name: string) {
    try {
        localStorage.removeItem(KEY(name));
    } catch { }
}
// ✅ 전체 raidPrefs:* 삭제 (필요할 때만 사용)
export function clearAllPrefs() {
    if (typeof window === "undefined") return;
    try {
        Object.keys(localStorage).forEach((key) => {
            if (key.startsWith(PREFIX)) {
                localStorage.removeItem(key);
            }
        });
    } catch { }
}
