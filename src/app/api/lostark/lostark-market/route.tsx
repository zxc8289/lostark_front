import { NextResponse } from 'next/server';

export const revalidate = 600;

const CACHE_TTL_MS = 10 * 60 * 1000;
const STALE_TTL_MS = 30 * 60 * 1000;

type MarketPriceMap = Record<string, number>;
type MarketCacheState = "HIT" | "MISS" | "STALE";

let cachedMarketPrices: MarketPriceMap | null = null;
let cacheExpiresAt = 0;
let staleUntil = 0;
let cachedAt = "";
let marketRefreshPromise: Promise<MarketPriceMap> | null = null;

function hasFreshCache(now: number) {
    return cachedMarketPrices !== null && now < cacheExpiresAt;
}

function hasStaleCache(now: number) {
    return cachedMarketPrices !== null && now < staleUntil;
}

function storeMarketCache(priceMap: MarketPriceMap) {
    const now = Date.now();
    cachedMarketPrices = priceMap;
    cacheExpiresAt = now + CACHE_TTL_MS;
    staleUntil = now + STALE_TTL_MS;
    cachedAt = new Date(now).toISOString();
}

function marketResponse(priceMap: MarketPriceMap, cacheState: MarketCacheState) {
    return NextResponse.json(priceMap, {
        headers: {
            "Cache-Control": "public, max-age=60, s-maxage=600, stale-while-revalidate=1800",
            "X-Loacheck-Cache": cacheState,
            "X-Loacheck-Cache-At": cachedAt,
        },
    });
}

export async function GET() {
    const now = Date.now();

    if (hasFreshCache(now)) {
        return marketResponse(cachedMarketPrices!, "HIT");
    }

    const rawToken = process.env.LOSTARK_OPENAPI_JWT;

    if (!rawToken) {
        if (hasStaleCache(now)) {
            return marketResponse(cachedMarketPrices!, "STALE");
        }

        console.error("❌ [서버 에러] 환경변수가 설정되지 않았습니다.");
        return NextResponse.json({ error: "API Key is missing" }, { status: 500 });
    }

    // 1. 쉼표나 줄바꿈으로 구분된 토큰들을 깔끔한 배열로 만듭니다.
    const tokenArray = rawToken
        .split(',')
        .map(t => t.replace(/[\r\n\s]/g, '').trim())
        .filter(t => t.length > 0);

    // 2. 배열 중 하나를 무작위로 선택하여 API 호출 부하를 분산시킵니다.
    const randomIndex = Math.floor(Math.random() * tokenArray.length);
    const selectedToken = tokenArray[randomIndex];

    const fetchPrices = async (itemName: string) => {
        const res = await fetch('https://developer-lostark.game.onstove.com/markets/items', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${selectedToken}`, // 선택된 단일 키 사용
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                Sort: "CURRENT_MIN_PRICE",
                CategoryCode: 50000,
                ItemName: itemName,
                PageNo: 1,
                SortCondition: "DESC"
            })
        });

        if (!res.ok) {
            const errorText = await res.text();
            console.error(`❌ [로아 API 에러] ${itemName} 검색 실패 - 상태 코드: ${res.status}, 내용: ${errorText}`);
            throw new Error(`LostArk API Request Failed: ${res.status}`);
        }

        const data = await res.json();
        return data.Items || [];
    };

    try {
        if (marketRefreshPromise) {
            const priceMap = await marketRefreshPromise;
            return marketResponse(priceMap, "HIT");
        }

        marketRefreshPromise = (async () => {
        // ✨ 파편 주머니(대) 검색 추가
        const [destRes, guardRes, leapRes, shardRes] = await Promise.all([
            fetchPrices("파괴"),
            fetchPrices("수호"),
            fetchPrices("돌파"),
            fetchPrices("파편 주머니(대)")
        ]);

        const allItems = [...destRes, ...guardRes, ...leapRes];
        const priceMap: Record<string, number> = {};

        // 일반 재료들 1개당 가격 계산 (보통 번들 10개 단위)
        allItems.forEach((item: any) => {
            const pricePerOne = item.CurrentMinPrice / item.BundleCount;
            priceMap[item.Name] = pricePerOne;
        });

        shardRes.forEach((item: any) => {
            if (item.Name === "명예의 파편 주머니(대)") {
                priceMap["명예의 파편"] = item.CurrentMinPrice / 1500;
            } else if (item.Name === "운명의 파편 주머니(대)") {
                priceMap["운명의 파편"] = item.CurrentMinPrice / 3000;
            }
        });

        storeMarketCache(priceMap);
        return priceMap;
        })();

        const priceMap = await marketRefreshPromise;
        return marketResponse(priceMap, "MISS");

    } catch (error) {
        if (hasStaleCache(Date.now())) {
            return marketResponse(cachedMarketPrices!, "STALE");
        }

        console.error("❌ [서버 내부 에러] API 통신 중 문제가 발생했습니다:", error);
        return NextResponse.json({ error: "Failed to fetch market prices" }, { status: 500 });
    } finally {
        marketRefreshPromise = null;
    }
}
