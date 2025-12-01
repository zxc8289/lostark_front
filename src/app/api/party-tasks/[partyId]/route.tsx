// src/app/api/party-tasks/[partyId]/route.tsx
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/db/client";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ partyId: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id as string;

    const { partyId } = await params;
    const partyIdNum = Number(partyId);

    if (!Number.isInteger(partyIdNum)) {
        return new NextResponse("Invalid party id", { status: 400 });
    }

    // 1) 파티 정보 조회
    const party = db
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

    if (!party) {
        return new NextResponse("Not found", { status: 404 });
    }

    // 2) 내가 이 파티 멤버인지 확인
    const membership = db
        .prepare(
            `
      SELECT role
      FROM party_members
      WHERE party_id = ? AND user_id = ?
    `
        )
        .get(partyIdNum, userId) as { role: string } | undefined;

    if (!membership) {
        return new NextResponse("Forbidden", { status: 403 });
    }

    // 3) 멤버 목록
    const members = db
        .prepare(
            `
      SELECT
        u.id,
        u.name,
        u.image,
        m.role
      FROM party_members m
      JOIN users u ON u.id = m.user_id
      WHERE m.party_id = ?
      ORDER BY
        CASE m.role WHEN 'owner' THEN 0 ELSE 1 END,
        u.name
    `
        )
        .all(partyIdNum) as {
            id: string;
            name: string | null;
            image: string | null;
            role: string;
        }[];

    // 🔹 4) 이 유저의 raid_task_state도 같이 가져오기
    const raidStateRow = db
        .prepare(
            `
      SELECT state_json
      FROM raid_task_state
      WHERE user_id = ?
      LIMIT 1
    `
        )
        .get(userId) as { state_json: string } | undefined;

    let raidState: any = null;
    if (raidStateRow?.state_json) {
        try {
            raidState = JSON.parse(raidStateRow.state_json);
        } catch (e) {
            console.error("Invalid raid_task_state JSON", e);
        }
    }

    // 5) 응답
    return NextResponse.json({
        id: party.id,
        name: party.name,
        memo: party.memo,
        ownerId: party.owner_id,
        createdAt: party.created_at,
        myRole: membership.role,
        members,
        raidCount: 0,
        nextResetAt: null,

        // ✅ 여기 추가
        raidState,
    });
}
