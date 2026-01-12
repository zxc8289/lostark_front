import { NextRequest, NextResponse } from "next/server";
import { request } from "undici";
import { getDb } from "@/db/client";
import type { Collection } from "mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const JWT = process.env.LOSTARK_OPENAPI_JWT;
const CRON_SECRET = process.env.MARKET_CRON_SECRET;

const OPTIONS_URL = "https://developer-lostark.game.onstove.com/markets/options";
const ITEMS_URL = "https://developer-lostark.game.onstove.com/markets/items";

// ---- Mongo docs ----
type OptionsDoc = { _id: string; data: any; updatedAt: string };

type MarketCacheDoc = { _id: string; query: any; data: any; updatedAt: string };

type WatchDoc = {
    _id: string;
    query: any;
    createdAt: string;
    lastSeenAt: string;
    enabled?: boolean;
    lastOkAt?: string;
    lastRunAt?: string;
    lastError?: string;
    seeded?: boolean;
};

type FlatCategory = { code: number; name: string };

// ---- 호출 간격(분당 100회쯤 방어) ----
let lastCallAt = 0;
async function throttle(ms = 650) {
    const now = Date.now();
    const wait = Math.max(0, ms - (now - lastCallAt));
    if (wait) await new Promise((r) => setTimeout(r, wait));
    lastCallAt = Date.now();
}

async function fetchJson(method: "GET" | "POST", url: string, body?: any) {
    if (!JWT) throw new Error("Missing env LOSTARK_OPENAPI_JWT");

    const ac = new AbortController();
    const timeout = setTimeout(() => ac.abort(), 10_000);

    try {
        await throttle();

        const res = await request(url, {
            method,
            headers: {
                accept: "application/json",
                ...(method === "POST" ? { "content-type": "application/json" } : {}),
                authorization: `bearer ${JWT}`,
            },
            body: method === "POST" ? JSON.stringify(body ?? {}) : undefined,
            signal: ac.signal,
        });

        const text = await res.body.text();
        let json: any = null;
        try {
            json = text ? JSON.parse(text) : null;
        } catch {
            json = { raw: text };
        }

        if (res.statusCode !== 200) {
            throw new Error(`Upstream status ${res.statusCode}`);
        }
        return json;
    } finally {
        clearTimeout(timeout);
    }
}

// ---- stable key (items route와 반드시 동일해야 cache hit) ----
function stableKey(obj: Record<string, any>) {
    const sorted = Object.fromEntries(
        Object.entries(obj).sort(([a], [b]) => a.localeCompare(b))
    );
    return JSON.stringify(sorted);
}

// ---- options tree -> flat ----
function flattenCategories(root: any): FlatCategory[] {
    const out: FlatCategory[] = [];
    const uniq = new Map<number, string>();

    function visit(node: any) {
        if (!node) return;
        const code = Number(node.Code ?? node.code ?? node.CategoryCode ?? node.categoryCode ?? 0);
        const name = String(node.Name ?? node.name ?? "").trim();

        if (code > 0 && name && !uniq.has(code)) {
            uniq.set(code, name);
            out.push({ code, name });
        }

        const kids = node.Children ?? node.children ?? node.Categories ?? node.categories ?? [];
        if (Array.isArray(kids)) kids.forEach(visit);
    }

    const top = root?.Categories ?? root?.categories ?? root?.data?.Categories ?? root?.data?.categories;
    if (Array.isArray(top)) top.forEach(visit);
    else visit(root);

    return out;
}

// ---- 생활 5종 코드 찾기(옵션에서 이름 매칭) ----
function pickLifeSeedCodes(flat: FlatCategory[]) {
    const want = [
        { skill: "채집", rx: /(채집)/ },
        { skill: "벌목", rx: /(벌목)/ },
        { skill: "채광", rx: /(채광)/ },
        { skill: "수렵", rx: /(수렵)/ },
        { skill: "낚시", rx: /(낚시)/ },
    ];

    const picked: Array<{ skill: string; code: number; name: string }> = [];
    for (const w of want) {
        const hit = flat.find((c) => w.rx.test(c.name));
        if (hit) picked.push({ skill: w.skill, code: hit.code, name: hit.name });
    }
    return picked;
}

// ✅ 여기: watchCol 타입을 Collection<WatchDoc>로 박고, 반환 타입도 명시
async function upsertWatch(
    watchCol: Collection<WatchDoc>,
    query: Record<string, any>,
    nowIso: string,
    extra?: Partial<WatchDoc>
): Promise<string> {
    const key = stableKey(query);

    await watchCol.updateOne(
        { _id: key },
        {
            $setOnInsert: { createdAt: nowIso, enabled: true },
            $set: { query, lastSeenAt: nowIso, ...(extra ?? {}) },
        },
        { upsert: true }
    );

    return key;
}

type Seed = { code: number; name: string; query: Record<string, any> };

export async function GET(req: NextRequest) {
    // ---- 크론 보호 ----
    const secret =
        req.nextUrl.searchParams.get("secret") ||
        req.headers.get("x-cron-secret") ||
        "";

    if (!CRON_SECRET || secret !== CRON_SECRET) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const db = await getDb();
    const optionsCol = db.collection<OptionsDoc>("loa_market_options");
    const cacheCol = db.collection<MarketCacheDoc>("loa_market_items_cache");
    const watchCol = db.collection<WatchDoc>("loa_market_watchlist"); // ✅ Collection<WatchDoc>로 추론됨

    const nowIso = new Date().toISOString();

    const report: any = {
        ok: true,
        updatedAt: nowIso,
        seeds: { total: 0, list: [] as any[] },
        options: { ok: false },
        items: { ok: false, total: 0, success: 0, fail: 0 },
    };

    // 1) options 갱신 & 저장
    let optionsJson: any = null;
    try {
        optionsJson = await fetchJson("GET", OPTIONS_URL);
        await optionsCol.updateOne(
            { _id: "markets/options" },
            { $set: { data: optionsJson, updatedAt: nowIso } },
            { upsert: true }
        );
        report.options.ok = true;
    } catch (e: any) {
        report.options.ok = false;
        report.options.error = String(e?.message || e);
    }

    // 2) 생활 5종 + 전체(90000) seed watchlist 등록 (page 1~3)
    const flat = optionsJson ? flattenCategories(optionsJson) : [];
    const life = optionsJson ? pickLifeSeedCodes(flat) : [];
    const lifeCodes = life.map((x) => x.code);

    const seeds: Seed[] = [];

    const ALL_LIFE_CODE = 90000;
    const pages = [1, 2, 3];

    // 전체(90000)
    for (const p of pages) {
        const q = {
            PageNo: p,
            CategoryCode: ALL_LIFE_CODE,
            Sort: "RECENT_PRICE",
            SortCondition: "DESC",
        };
        seeds.push({ code: ALL_LIFE_CODE, name: "생활 재료 전체", query: q });
    }

    // 5종
    for (const it of life) {
        for (const p of pages) {
            const q = {
                PageNo: p,
                CategoryCode: it.code,
                Sort: "RECENT_PRICE",
                SortCondition: "DESC",
            };
            seeds.push({ code: it.code, name: `${it.skill} (${it.name})`, query: q });
        }
    }

    // 옵션 파싱 실패 시 최소 낚시(90600) 폴백
    if (lifeCodes.length === 0) {
        for (const p of pages) {
            seeds.push({
                code: 90600,
                name: "낚시(폴백)",
                query: {
                    PageNo: p,
                    CategoryCode: 90600,
                    Sort: "RECENT_PRICE",
                    SortCondition: "DESC",
                },
            });
        }
    }

    // ✅ 여기: for (const s of seeds) 오류 해결(Seed[]로 타입 고정됨)
    for (const s of seeds) {
        await upsertWatch(watchCol, s.query, nowIso, { seeded: true });
    }

    report.seeds.total = seeds.length;
    report.seeds.list = seeds.map((s) => ({ code: s.code, name: s.name, query: s.query }));

    // 3) watchlist 갱신
    const targets = await watchCol
        .find({ enabled: { $ne: false } })
        .sort({ lastSeenAt: -1 })
        .limit(40)
        .toArray();

    report.items.total = targets.length;

    for (const t of targets) {
        const key = t._id;
        const query = t.query;

        try {
            const json = await fetchJson("POST", ITEMS_URL, query);

            await cacheCol.updateOne(
                { _id: key },
                { $set: { query, data: json, updatedAt: nowIso } },
                { upsert: true }
            );

            await watchCol.updateOne(
                { _id: key },
                { $set: { lastOkAt: nowIso, lastRunAt: nowIso }, $unset: { lastError: "" } }
            );

            report.items.success++;
        } catch (e: any) {
            report.items.fail++;
            await watchCol.updateOne(
                { _id: key },
                { $set: { lastRunAt: nowIso, lastError: String(e?.message || e) } }
            );
        }
    }

    report.items.ok = true;
    return NextResponse.json(report);
}
