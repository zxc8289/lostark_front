// src/app/api/raid-tasks/state/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { db } from "@/db/client";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const userId = (session.user as any).id as string;

    const row = db
        .prepare("SELECT state_json FROM raid_task_state WHERE user_id = ?")
        .get(userId) as { state_json: string } | undefined;

    if (!row) {
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
}



// src/app/api/raid-tasks/state/route.ts

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
        // 1) 기존 state_json 읽기
        const row = db
            .prepare("SELECT state_json FROM raid_task_state WHERE user_id = ?")
            .get(userId) as { state_json: string } | undefined;

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

        const stmt = db.prepare(`
      INSERT INTO raid_task_state (user_id, state_json, updated_at)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(user_id) DO UPDATE SET
        state_json = excluded.state_json,
        updated_at = excluded.updated_at
    `);

        stmt.run(userId, JSON.stringify(next));

        return NextResponse.json({ ok: true });
    } catch (e) {
        console.error("raid_task_state insert failed", e);
        return new NextResponse("DB error", { status: 500 });
    }
}
