// src/app/api/party-tasks/[partyId]/kick/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/db/client";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ partyId: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const myUserId = (session.user as any).id as string;

    const { partyId } = await params;
    const partyIdNum = Number(partyId);

    if (!Number.isInteger(partyIdNum)) {
        return new NextResponse("Invalid party id", { status: 400 });
    }

    // 1) 파티 정보 + 내 membership 조회
    const party = db
        .prepare(
            `
      SELECT id, owner_id
      FROM parties
      WHERE id = ?
    `
        )
        .get(partyIdNum) as
        | {
            id: number;
            owner_id: string;
        }
        | undefined;

    if (!party) {
        return new NextResponse("Not found", { status: 404 });
    }

    const membership = db
        .prepare(
            `
      SELECT role
      FROM party_members
      WHERE party_id = ? AND user_id = ?
    `
        )
        .get(partyIdNum, myUserId) as { role: string } | undefined;

    if (!membership) {
        return new NextResponse("Forbidden", { status: 403 });
    }

    // 🔐 파티장만 강퇴 가능
    if (party.owner_id !== myUserId || membership.role !== "owner") {
        return new NextResponse("Only owner can kick members", { status: 403 });
    }

    let body: any;
    try {
        body = await req.json();
    } catch {
        return new NextResponse("Invalid JSON", { status: 400 });
    }

    const targetUserId = body?.userId as string | undefined;
    if (!targetUserId) {
        return new NextResponse("userId is required", { status: 400 });
    }

    // 파티장/본인은 여기서 강퇴 불가
    if (targetUserId === party.owner_id) {
        return new NextResponse("Cannot kick owner", { status: 400 });
    }
    if (targetUserId === myUserId) {
        return new NextResponse("Cannot kick yourself", { status: 400 });
    }

    const targetMembership = db
        .prepare(
            `
      SELECT user_id
      FROM party_members
      WHERE party_id = ? AND user_id = ?
    `
        )
        .get(partyIdNum, targetUserId) as { user_id: string } | undefined;

    if (!targetMembership) {
        return new NextResponse("Target user is not a member", { status: 404 });
    }

    // 2) 파티 멤버 삭제
    db.prepare(
        `
      DELETE FROM party_members
      WHERE party_id = ? AND user_id = ?
    `
    ).run(partyIdNum, targetUserId);

    // (선택) 만약 파티 숙제용 테이블이 따로 있다면 여기서 같이 지워도 됨
    // 예: DELETE FROM party_raid_tasks WHERE party_id = ? AND user_id = ?

    return NextResponse.json({ ok: true });
}
