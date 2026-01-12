// src/app/api/lostark/lostark-market/route.ts
import { NextResponse } from "next/server";
import { getDb } from "@/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MarketCacheDoc = {
    _id: string;
    query: any;
    data: any;
    updatedAt: string;
};

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

function stableKey(obj: Record<string, any>) {
    const sorted = Object.fromEntries(
        Object.entries(obj).sort(([a], [b]) => a.localeCompare(b))
    );
    return JSON.stringify(sorted);
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);

    // ✅ 프론트는 읽기 전용: watch=1일 때만 watchlist 기록
    const watch = searchParams.get("watch") === "1";

    // ✅ 전체(생활 재료 전체) 기본값 90000
    const CategoryCode = Number(searchParams.get("categoryCode") || "90000");
    const ItemName = (searchParams.get("itemName") || "").trim();
    const PageNo = Number(searchParams.get("pageNo") || "1");
    const Sort = (searchParams.get("sort") || "RECENT_PRICE").trim();
    const SortCondition = (searchParams.get("sortCondition") || "DESC").trim();

    const queryBody: Record<string, any> = { PageNo };

    // (0이나 NaN 방어)
    if (Number.isFinite(CategoryCode) && CategoryCode > 0) queryBody.CategoryCode = CategoryCode;
    if (ItemName) queryBody.ItemName = ItemName;
    if (Sort) queryBody.Sort = Sort;
    if (SortCondition) queryBody.SortCondition = SortCondition;

    const key = stableKey(queryBody);
    const nowIso = new Date().toISOString();

    const db = await getDb();
    const cacheCol = db.collection<MarketCacheDoc>("loa_market_items_cache");
    const watchCol = db.collection<WatchDoc>("loa_market_watchlist");

    // ✅ watch=1일 때만 기록 (기본은 프론트가 절대 수집 파이프라인에 영향 X)
    if (watch) {
        await watchCol.updateOne(
            { _id: key },
            {
                $setOnInsert: { createdAt: nowIso, enabled: true },
                $set: { query: queryBody, lastSeenAt: nowIso },
            },
            { upsert: true }
        );
    }

    const doc = await cacheCol.findOne({ _id: key });

    if (!doc) {
        return NextResponse.json(
            {
                error: "cache_miss",
                hint: "해당 조건 캐시가 아직 없습니다. (크론이 저장한 조건만 조회 가능합니다)",
                query: queryBody,
            },
            { status: 404 }
        );
    }

    return NextResponse.json({
        cached: true,
        updatedAt: doc.updatedAt,
        query: doc.query,
        data: doc.data,
    });
}
