import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getDb } from "@/db/client";

export const runtime = "nodejs";

type RouteParams = Promise<{ partyId: string }>;

export async function POST(
    req: NextRequest,
    { params }: { params: RouteParams }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const me = (session.user as any).id as string;

    const { partyId } = await params;
    const partyIdNum = Number(partyId);

    if (!partyIdNum || Number.isNaN(partyIdNum)) {
        return NextResponse.json(
            { message: "Invalid party id" },
            { status: 400 }
        );
    }

    let body: { activeAccountId?: string | null };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json(
            { message: "Invalid JSON body" },
            { status: 400 }
        );
    }

    const activeAccountId = body.activeAccountId ?? null;
    const partyKey = String(partyIdNum);

    const db = await getDb();
    const partyMembersCol = db.collection("party_members");
    const raidTaskStateCol = db.collection("raid_task_state");

    // 1) 내가 이 파티 멤버인지 확인
    const meRow = await partyMembersCol.findOne({
        party_id: partyIdNum,
        user_id: me,
    });

    if (!meRow) {
        return NextResponse.json(
            { message: "Forbidden: not a party member" },
            { status: 403 }
        );
    }

    // 2) 기존 raid_task_state 읽기
    const existing = (await raidTaskStateCol.findOne<{
        state_json?: string;
    }>({
        user_id: me,
    })) as { state_json?: string } | null;

    let nextState: any;
    if (existing?.state_json) {
        try {
            nextState = JSON.parse(existing.state_json);
        } catch {
            nextState = {};
        }
    } else {
        nextState = {};
    }

    // 🔹 파티별 대표 계정 맵 업데이트
    if (!nextState.activeAccountByParty) {
        nextState.activeAccountByParty = {};
    }
    nextState.activeAccountByParty[partyKey] = activeAccountId;

    // (선택) MyTasks 전역 대표도 같이 바꾸고 싶으면 이 줄 켜기
    // nextState.activeAccountId = activeAccountId;

    const stateJson = JSON.stringify(nextState);

    // 3) upsert (SQLite의 ON CONFLICT(user_id) DO UPDATE 와 동일한 동작)
    await raidTaskStateCol.updateOne(
        { user_id: me }, // 조건
        {
            $set: {
                user_id: me,
                state_json: stateJson,
                updated_at: new Date().toISOString(),
            },
            $setOnInsert: {
                created_at: new Date().toISOString(),
            },
        },
        { upsert: true }
    );

    return NextResponse.json({ ok: true });
}
