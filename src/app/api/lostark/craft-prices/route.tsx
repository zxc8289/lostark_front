import { NextResponse } from "next/server";

export const revalidate = 600;

type CraftPricePayload = {
    prices: Record<string, number>;
    updatedAt: string;
    cache: {
        hit: boolean;
        stale: boolean;
        expiresAt: string;
    };
};

const CACHE_TTL_MS = 10 * 60 * 1000;
const STALE_TTL_MS = 30 * 60 * 1000;

const TARGET_ITEMS = [
    { name: "최상급 오레하 융화 재료", categoryCode: 50000 },
    { name: "아비도스 융화 재료", categoryCode: 50000 },
    { name: "상급 아비도스 융화 재료", categoryCode: 50000 },
    { name: "목재", categoryCode: 90000 },
    { name: "부드러운 목재", categoryCode: 90000 },
    { name: "튼튼한 목재", categoryCode: 90000 },
    { name: "아비도스 목재", categoryCode: 90000 },
    { name: "고대 유물", categoryCode: 90000 },
    { name: "희귀한 유물", categoryCode: 90000 },
    { name: "오레하 유물", categoryCode: 90000 },
    { name: "아비도스 유물", categoryCode: 90000 },
    { name: "철광석", categoryCode: 90000 },
    { name: "묵직한 철광석", categoryCode: 90000 },
    { name: "단단한 철광석", categoryCode: 90000 },
    { name: "아비도스 철광석", categoryCode: 90000 },
    { name: "들꽃", categoryCode: 90000 },
    { name: "수줍은 들꽃", categoryCode: 90000 },
    { name: "화사한 들꽃", categoryCode: 90000 },
    { name: "아비도스 들꽃", categoryCode: 90000 },
    { name: "생선", categoryCode: 90000 },
    { name: "붉은 살 생선", categoryCode: 90000 },
    { name: "오레하 태양 잉어", categoryCode: 90000 },
    { name: "아비도스 태양 잉어", categoryCode: 90000 },
    { name: "두툼한 생고기", categoryCode: 90000 },
    { name: "다듬은 생고기", categoryCode: 90000 },
    { name: "오레하 두툼한 생고기", categoryCode: 90000 },
    { name: "아비도스 두툼한 생고기", categoryCode: 90000 },
];

let cachedPayload: CraftPricePayload | null = null;
let cacheExpiresAt = 0;
let staleUntil = 0;
let refreshPromise: Promise<CraftPricePayload> | null = null;

function getTokens() {
    const rawToken = process.env.LOSTARK_OPENAPI_JWT || "";
    return rawToken
        .split(",")
        .map((token) => token.replace(/[\r\n\s"]/g, "").trim())
        .filter(Boolean);
}

function pickToken(tokens: string[]) {
    return tokens[Math.floor(Math.random() * tokens.length)];
}

function withCacheMeta(payload: CraftPricePayload, hit: boolean, stale = false): CraftPricePayload {
    return {
        ...payload,
        cache: {
            hit,
            stale,
            expiresAt: new Date(cacheExpiresAt).toISOString(),
        },
    };
}

async function fetchMarketPrice(tokens: string[], itemName: string, categoryCode: number) {
    const token = pickToken(tokens);
    const response = await fetch("https://developer-lostark.game.onstove.com/markets/items", {
        method: "POST",
        headers: {
            authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            Sort: "CURRENT_MIN_PRICE",
            CategoryCode: categoryCode,
            ItemName: itemName,
            PageNo: 1,
            SortCondition: "ASC",
        }),
        next: { revalidate },
        signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`LostArk markets/items failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const items = Array.isArray(data?.Items) ? data.Items : [];
    const matched = items.find((item: any) => item?.Name === itemName) ?? items[0];

    if (!matched?.CurrentMinPrice) return 0;

    const bundleCount = Number(matched.BundleCount) || 1;
    return Math.max(0, Number(matched.CurrentMinPrice) / bundleCount);
}

async function refreshCraftPrices(tokens: string[]) {
    const results = await Promise.all(
        TARGET_ITEMS.map(async (item) => ({
            itemName: item.name,
            price: await fetchMarketPrice(tokens, item.name, item.categoryCode),
        }))
    );

    const now = Date.now();
    cacheExpiresAt = now + CACHE_TTL_MS;
    staleUntil = now + STALE_TTL_MS;

    cachedPayload = {
        prices: Object.fromEntries(results.map((item) => [item.itemName, item.price])),
        updatedAt: new Date(now).toISOString(),
        cache: {
            hit: false,
            stale: false,
            expiresAt: new Date(cacheExpiresAt).toISOString(),
        },
    };

    return cachedPayload;
}

export async function GET() {
    const now = Date.now();

    if (cachedPayload && now < cacheExpiresAt) {
        return NextResponse.json(withCacheMeta(cachedPayload, true));
    }

    const tokens = getTokens();

    if (tokens.length === 0) {
        if (cachedPayload && now < staleUntil) {
            return NextResponse.json(withCacheMeta(cachedPayload, true, true));
        }

        return NextResponse.json({ error: "API Key is missing" }, { status: 500 });
    }

    try {
        refreshPromise ??= refreshCraftPrices(tokens).finally(() => {
            refreshPromise = null;
        });

        const payload = await refreshPromise;
        return NextResponse.json(withCacheMeta(payload, false));
    } catch (error) {
        console.error("[craft-prices] Failed to fetch craft prices", error);

        if (cachedPayload && now < staleUntil) {
            return NextResponse.json(withCacheMeta(cachedPayload, true, true));
        }

        return NextResponse.json({ error: "Failed to fetch craft prices" }, { status: 500 });
    }
}
