import { NextResponse } from "next/server";

export const revalidate = 300;

type GemLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
type GemType = "damage" | "cooldown";
type GemPriceMap = Record<GemLevel, Record<GemType, number>>;
type GemPricePayload = {
    prices: GemPriceMap;
    updatedAt: string;
    cache: {
        hit: boolean;
        stale: boolean;
        expiresAt: string;
    };
};

const CACHE_TTL_MS = 5 * 60 * 1000;
const STALE_TTL_MS = 30 * 60 * 1000;

const GEM_LEVELS: GemLevel[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const GEM_TYPES = [
    { type: "damage" as const, name: "겁화의 보석", optionType: "GEM_SKILL_DAMAGE" },
    { type: "cooldown" as const, name: "작열의 보석", optionType: "GEM_SKILL_COOLDOWN_REDUCTION" },
];

const GEM_TARGETS: { level: GemLevel; type: GemType; name: string; optionType: string }[] = GEM_LEVELS.flatMap((level) =>
    GEM_TYPES.map((gemType) => ({
        level,
        type: gemType.type,
        name: `${level}레벨 ${gemType.name}`,
        optionType: gemType.optionType,
    }))
);

const EMPTY_PRICES: GemPriceMap = {
    1: { damage: 0, cooldown: 0 },
    2: { damage: 0, cooldown: 0 },
    3: { damage: 0, cooldown: 0 },
    4: { damage: 0, cooldown: 0 },
    5: { damage: 0, cooldown: 0 },
    6: { damage: 0, cooldown: 0 },
    7: { damage: 0, cooldown: 0 },
    8: { damage: 0, cooldown: 0 },
    9: { damage: 0, cooldown: 0 },
    10: { damage: 0, cooldown: 0 },
};

let cachedPayload: GemPricePayload | null = null;
let cacheExpiresAt = 0;
let staleUntil = 0;
let refreshPromise: Promise<GemPricePayload> | null = null;

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

function createEmptyPrices(): GemPriceMap {
    return {
        1: { ...EMPTY_PRICES[1] },
        2: { ...EMPTY_PRICES[2] },
        3: { ...EMPTY_PRICES[3] },
        4: { ...EMPTY_PRICES[4] },
        5: { ...EMPTY_PRICES[5] },
        6: { ...EMPTY_PRICES[6] },
        7: { ...EMPTY_PRICES[7] },
        8: { ...EMPTY_PRICES[8] },
        9: { ...EMPTY_PRICES[9] },
        10: { ...EMPTY_PRICES[10] },
    };
}

function withCacheMeta(payload: GemPricePayload, hit: boolean, stale = false): GemPricePayload {
    return {
        ...payload,
        cache: {
            hit,
            stale,
            expiresAt: new Date(cacheExpiresAt).toISOString(),
        },
    };
}

async function fetchGemPrice(tokens: string[], target: (typeof GEM_TARGETS)[number]) {
    const token = pickToken(tokens);
    const response = await fetch("https://developer-lostark.game.onstove.com/auctions/items", {
        method: "POST",
        headers: {
            authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            Sort: "BUY_PRICE",
            CategoryCode: 210000,
            ItemTier: 4,
            ItemName: target.name,
            PageNo: 1,
            SortCondition: "ASC",
        }),
        next: { revalidate },
        signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`LostArk auctions/items failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const items = Array.isArray(data?.Items) ? data.Items : [];
    const matched = items.find((item: any) => {
        const optionType = item?.Options?.[0]?.Type;
        return item?.Name === target.name && optionType === target.optionType;
    });

    if (matched?.AuctionInfo?.BuyPrice) {
        return Number(matched.AuctionInfo.BuyPrice) || 0;
    }

    return 0;
}

async function refreshGemPrices(tokens: string[]) {
    const prices = createEmptyPrices();

    const results = await Promise.all(
        GEM_TARGETS.map(async (target) => ({
            target,
            price: await fetchGemPrice(tokens, target),
        }))
    );

    results.forEach(({ target, price }) => {
        prices[target.level][target.type] = price;
    });

    const now = Date.now();
    cacheExpiresAt = now + CACHE_TTL_MS;
    staleUntil = now + STALE_TTL_MS;

    cachedPayload = {
        prices,
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
        refreshPromise ??= refreshGemPrices(tokens).finally(() => {
            refreshPromise = null;
        });

        const payload = await refreshPromise;
        return NextResponse.json(withCacheMeta(payload, false));
    } catch (error) {
        console.error("[gem-prices] Failed to fetch T4 gem prices", error);

        if (cachedPayload && now < staleUntil) {
            return NextResponse.json(withCacheMeta(cachedPayload, true, true));
        }

        return NextResponse.json({ error: "Failed to fetch gem prices" }, { status: 500 });
    }
}
