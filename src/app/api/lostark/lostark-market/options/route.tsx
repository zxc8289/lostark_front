// src/app/api/lostark/lostark-market/options/route.ts
import { NextResponse } from "next/server";
import { getDb } from "@/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type OptionsDoc = {
    _id: string; // "markets/options"
    data: any;
    updatedAt: string;
};

export async function GET() {
    const db = await getDb();
    const col = db.collection<OptionsDoc>("loa_market_options");

    const doc = await col.findOne({ _id: "markets/options" });
    if (!doc) {
        return NextResponse.json(
            { error: "cache_miss", hint: "옵션 캐시가 아직 없습니다. 크론 수집기를 먼저 실행하세요." },
            { status: 404 }
        );
    }

    const payload =
        doc.data && typeof doc.data === "object"
            ? { ...doc.data, __meta: { cached: true, updatedAt: doc.updatedAt } }
            : { data: doc.data, __meta: { cached: true, updatedAt: doc.updatedAt } };

    return NextResponse.json(payload);
}
