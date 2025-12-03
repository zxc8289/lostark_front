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
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const userId = (session.user as any).id as string;

    const { partyId } = await params;
    const partyIdNum = Number(partyId);

    if (!Number.isInteger(partyIdNum)) {
        return new NextResponse("Invalid party id", { status: 400 });
    }

    const db = await getDb();
    const partiesCol = db.collection("parties");
    const partyMembersCol = db.collection("party_members");

    // 1) 파티 정보 조회
    const party = (await partiesCol.findOne<{
        id: number;
        name: string;
        memo: string | null;
        owner_id: string;
        invite_code: string | null;
        created_at: string;
    }>(
        { id: partyIdNum },
        {
            projection: {
                _id: 0, // _id는 안 써서 제외
                id: 1,
                name: 1,
                memo: 1,
                owner_id: 1,
                invite_code: 1,
                created_at: 1,
            },
        }
    )) || undefined;

    if (!party) {
        return new NextResponse("Not found", { status: 404 });
    }

    // 2) 내가 이 파티 멤버인지 확인
    const membership = (await partyMembersCol.findOne<{
        role: string;
    }>({
        party_id: partyIdNum,
        user_id: userId,
    })) || undefined;

    if (!membership) {
        return new NextResponse("Forbidden", { status: 403 });
    }

    if (!party.invite_code) {
        return NextResponse.json(
            {
                code: null,
                url: null,
                createdAt: party.created_at,
                expiresAt: null as string | null,
            },
            { status: 200 }
        );
    }

    const origin = req.nextUrl.origin;
    // 예: http://localhost:3000/party-tasks/join?code=ABCDEFG
    const url = `${origin}/party-tasks/join?code=${encodeURIComponent(
        party.invite_code
    )}`;

    return NextResponse.json({
        code: party.invite_code,
        url,
        createdAt: party.created_at,
        expiresAt: null as string | null,
    });
}
