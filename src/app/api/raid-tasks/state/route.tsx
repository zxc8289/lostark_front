import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { getDb } from "@/db/client";

export const runtime = "nodejs";

// ─────────────────────────────
// GET: 내 raid_task_state 조회
// ─────────────────────────────
export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const userId = (session.user as any).id as string;

    try {
        const db = await getDb();
        const raidTaskStateCol = db.collection<{
            user_id: string;
            state_json: string;
            updated_at?: string;
            created_at?: string;
        }>("raid_task_state");

        const row = await raidTaskStateCol.findOne(
            { user_id: userId },
            {
                projection: {
                    _id: 0,
                    state_json: 1,
                },
            }
        );

        if (!row?.state_json) {
            // 서버에 아직 아무것도 없을 때
            return new NextResponse(null, { status: 204 });
        }

        try {
            const state = JSON.parse(row.state_json);
            return NextResponse.json(state);
        } catch {
            // 혹시 파싱 실패하면 그냥 초기화해버리기
            return new NextResponse(null, { status: 204 });
        }
    } catch (e) {
        console.error("raid_task_state select failed", e);
        return new NextResponse("DB error", { status: 500 });
    }
}

// ─────────────────────────────
// POST: raid_task_state 병합 저장
// ─────────────────────────────
export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const userId = (session.user as any).id as string;

    let body: any;
    try {
        body = await req.json();
    } catch {
        return new NextResponse("Invalid JSON", { status: 400 });
    }

    try {
        const db = await getDb();
        const raidTaskStateCol = db.collection<{
            user_id: string;
            state_json: string;
            updated_at?: string;
            created_at?: string;
        }>("raid_task_state");

        // 1) 기존 state_json 읽기
        const row = await raidTaskStateCol.findOne(
            { user_id: userId },
            {
                projection: {
                    _id: 0,
                    state_json: 1,
                },
            }
        );

        let prev: any = {};
        if (row?.state_json) {
            try {
                prev = JSON.parse(row.state_json);
            } catch {
                prev = {};
            }
        }

        // 2) 기존 값 + 새 값 병합 (shallow merge)
        const next = {
            ...prev,
            ...body, // 또는 ...bodyWithoutParty
        };

        const stateJson = JSON.stringify(next);
        const now = new Date().toISOString();

        // 3) upsert (SQLite의 INSERT ... ON CONFLICT(user_id) DO UPDATE 와 동일)
        await raidTaskStateCol.updateOne(
            { user_id: userId },
            {
                $set: {
                    user_id: userId,
                    state_json: stateJson,
                    updated_at: now,
                },
                $setOnInsert: {
                    created_at: now,
                },
            },
            { upsert: true }
        );

        return NextResponse.json({ ok: true });
    } catch (e) {
        console.error("raid_task_state insert/update failed", e);
        return new NextResponse("DB error", { status: 500 });
    }
}
