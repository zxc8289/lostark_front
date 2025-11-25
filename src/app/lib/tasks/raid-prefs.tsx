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

const KEY = (name: string) => `raidPrefs:${encodeURIComponent(name)}`;

export function readPrefs(name: string): CharacterTaskPrefs | null {
    try {
        const raw = localStorage.getItem(KEY(name));
        return raw ? (JSON.parse(raw) as CharacterTaskPrefs) : null;
    } catch {
        return null;
    }
}

export function writePrefs(name: string, prefs: CharacterTaskPrefs) {
    localStorage.setItem(KEY(name), JSON.stringify(prefs));
}

const PREFIX = "raidTaskPrefs:";

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