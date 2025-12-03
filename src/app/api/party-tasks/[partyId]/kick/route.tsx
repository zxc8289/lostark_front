// src/app/api/party-tasks/[partyId]/kick/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getDb } from "@/db/client";

export const runtime = "nodejs";

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

    const db = await getDb();
    const partiesCol = db.collection("parties");
    const partyMembersCol = db.collection("party_members");

    // 1) 파티 정보 조회
    const party =
        (await partiesCol.findOne<{
            id: number;
            owner_id: string;
        }>(
            { id: partyIdNum },
            {
                projection: {
                    _id: 0,
                    id: 1,
                    owner_id: 1,
                },
            }
        )) || undefined;

    if (!party) {
        return new NextResponse("Not found", { status: 404 });
    }

    // 내 membership 조회
    const membership =
        (await partyMembersCol.findOne<{
            role: string;
        }>({
            party_id: partyIdNum,
            user_id: myUserId,
        })) || undefined;

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

    // 파티장/본인은 강퇴 불가
    if (targetUserId === party.owner_id) {
        return new NextResponse("Cannot kick owner", { status: 400 });
    }
    if (targetUserId === myUserId) {
        return new NextResponse("Cannot kick yourself", { status: 400 });
    }

    // 대상 멤버 존재 여부 확인
    const targetMembership =
        (await partyMembersCol.findOne<{
            user_id: string;
        }>({
            party_id: partyIdNum,
            user_id: targetUserId,
        })) || undefined;

    if (!targetMembership) {
        return new NextResponse("Target user is not a member", { status: 404 });
    }

    // 2) 파티 멤버 삭제
    await partyMembersCol.deleteOne({
        party_id: partyIdNum,
        user_id: targetUserId,
    });

    // (선택) 파티 숙제용 컬렉션 있으면 여기서 같이 deleteOne / deleteMany 해도 됨
    // 예: await db.collection("party_raid_tasks").deleteMany({ party_id: partyIdNum, user_id: targetUserId });

    return NextResponse.json({ ok: true });
}
