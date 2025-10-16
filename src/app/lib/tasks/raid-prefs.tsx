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
