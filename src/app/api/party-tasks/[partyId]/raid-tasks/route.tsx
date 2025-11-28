// app/api/party-tasks/[partyId]/raid-tasks/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/db/client";
import type { Session } from "next-auth";

export const runtime = "nodejs"; // better-sqlite3 쓰니까 node 런타임 강제

// 타입들
type PartyMemberRow = {
    party_id: number;
    user_id: string;
    role: string;
    joined_at: string;
    name: string | null;
    email: string | null;
    image: string | null;
};

type RaidTaskStateRow = {
    user_id: string;
    state_json: string;
    updated_at: string;
};

type PartyMemberTasks = {
    userId: string;
    name: string | null;
    image: string | null;
    nickname: string;
    summary: any | null;
    prefsByChar: Record<string, any>;
    visibleByChar: Record<string, boolean>;
};

type PartyRaidTasksResponse = {
    members: PartyMemberTasks[];
};

// ✅ Next 15 스타일: params 는 Promise 여서 await 해줘야 함
type RouteParams = Promise<{ partyId: string }>;

export async function GET(
    req: NextRequest,
    { params }: { params: RouteParams }
) {
    const session = (await getServerSession(authOptions)) as Session | null;
    if (!session || !session.user) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id as string;

    const { partyId } = await params; // ✅ 여기 추가
    const partyIdNum = Number(partyId);
    if (!partyIdNum || Number.isNaN(partyIdNum)) {
        return NextResponse.json({ message: "Invalid party id" }, { status: 400 });
    }

    // 1) 파티 존재 여부 체크
    const partyRow = db
        .prepare(
            `
      SELECT id, name, memo, owner_id, created_at
      FROM parties
      WHERE id = ?
    `
        )
        .get(partyIdNum) as
        | {
            id: number;
            name: string;
            memo: string | null;
            owner_id: string;
            created_at: string;
        }
        | undefined;

    if (!partyRow) {
        return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    // 2) 파티 멤버 목록 + 유저 정보 join
    const memberRows = db
        .prepare(
            `
      SELECT 
        pm.party_id,
        pm.user_id,
        pm.role,
        pm.joined_at,
        u.name,
        u.email,
        u.image
      FROM party_members pm
      JOIN users u ON u.id = pm.user_id
      WHERE pm.party_id = ?
    `
        )
        .all(partyIdNum) as PartyMemberRow[];

    if (!memberRows || memberRows.length === 0) {
        // 파티는 있는데 멤버가 하나도 없는 극단상황
        return NextResponse.json(
            { members: [] } satisfies PartyRaidTasksResponse,
            { status: 200 }
        );
    }

    // 현재 로그인한 유저가 이 파티의 멤버인지 확인
    const isMember = memberRows.some((m) => m.user_id === userId);
    if (!isMember) {
        return NextResponse.json(
            { message: "Forbidden: not a member" },
            { status: 403 }
        );
    }

    // 3) 파티 멤버들의 raid_task_state 조회
    const memberUserIds = memberRows.map((m) => m.user_id);
    const placeholders = memberUserIds.map(() => "?").join(","); // "?,?,?,..."

    const stateRows = db
        .prepare(
            `
      SELECT user_id, state_json, updated_at
      FROM raid_task_state
      WHERE user_id IN (${placeholders})
    `
        )
        .all(...memberUserIds) as RaidTaskStateRow[];

    const stateByUserId = new Map<string, RaidTaskStateRow>();
    for (const s of stateRows) {
        stateByUserId.set(s.user_id, s);
    }

    // 4) PartyMemberTasks 형태로 변환
    const members: PartyMemberTasks[] = memberRows.map((m) => {
        const stateRow = stateByUserId.get(m.user_id);
        let parsed: any = null;

        if (stateRow) {
            try {
                parsed = JSON.parse(stateRow.state_json);
            } catch {
                parsed = null;
            }
        }

        return {
            userId: m.user_id,
            name: m.name,
            image: m.image,
            nickname: parsed?.nickname ?? "",
            summary: parsed?.summary ?? null,
            prefsByChar: parsed?.prefsByChar ?? {},
            visibleByChar: parsed?.visibleByChar ?? {},
        };
    });

    // 아무도 raid_task_state를 저장한 적이 없으면 빈 배열
    const hasAnySummary = members.some((m) => m.summary);
    if (!hasAnySummary) {
        return NextResponse.json(
            { members: [] } satisfies PartyRaidTasksResponse,
            { status: 200 }
        );
    }

    return NextResponse.json(
        { members } satisfies PartyRaidTasksResponse,
        { status: 200 }
    );
}

export async function POST(
    req: NextRequest,
    { params }: { params: RouteParams }
) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { partyId } = await params;
    const partyIdNum = Number(partyId);
    if (!partyIdNum || Number.isNaN(partyIdNum)) {
        return NextResponse.json({ message: "Invalid party id" }, { status: 400 });
    }

    const me = (session.user as any).id as string;

    // ⬇️ visibleByChar 도 같이 받기
    let body: {
        userId?: string;
        prefsByChar?: any;
        visibleByChar?: Record<string, boolean>;
    };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json(
            { message: "Invalid JSON body" },
            { status: 400 }
        );
    }

    const targetUserId = body.userId;
    const prefsByChar = body.prefsByChar;
    const visibleByChar = body.visibleByChar;

    if (!targetUserId || typeof prefsByChar !== "object") {
        return NextResponse.json(
            { message: "userId, prefsByChar required" },
            { status: 400 }
        );
    }

    // 1) 내가 이 파티의 멤버인지 확인
    const meRow = db
        .prepare(
            `SELECT 1 FROM party_members WHERE party_id = ? AND user_id = ? LIMIT 1`
        )
        .get(partyIdNum, me) as { 1: number } | undefined;

    if (!meRow) {
        return NextResponse.json(
            { message: "Forbidden: not a party member" },
            { status: 403 }
        );
    }

    // 2) 수정 대상도 이 파티 멤버인지 확인
    const targetRow = db
        .prepare(
            `SELECT 1 FROM party_members WHERE party_id = ? AND user_id = ? LIMIT 1`
        )
        .get(partyIdNum, targetUserId) as { 1: number } | undefined;

    if (!targetRow) {
        return NextResponse.json(
            { message: "Target user is not in this party" },
            { status: 400 }
        );
    }

    // 3) 기존 raid_task_state 가져와서 prefsByChar / visibleByChar만 교체
    const existing = db
        .prepare(
            `SELECT state_json FROM raid_task_state WHERE user_id = ? LIMIT 1`
        )
        .get(targetUserId) as { state_json: string } | undefined;

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

    // ⬇️ 여기서 부분 업데이트
    nextState.prefsByChar = prefsByChar;
    if (visibleByChar && typeof visibleByChar === "object") {
        nextState.visibleByChar = visibleByChar;
    }

    const stateJson = JSON.stringify(nextState);

    db.prepare(
        `
        INSERT INTO raid_task_state (user_id, state_json, updated_at)
        VALUES (@user_id, @state_json, datetime('now'))
        ON CONFLICT(user_id) DO UPDATE SET
          state_json = excluded.state_json,
          updated_at = datetime('now')
      `
    ).run({
        user_id: targetUserId,
        state_json: stateJson,
    });

    return NextResponse.json({ ok: true });
}
