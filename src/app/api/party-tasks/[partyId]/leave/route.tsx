// src/app/api/party-tasks/[partyId]/leave/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getDb } from "@/db/client";

export const runtime = "nodejs";

/**
 * 파티 나가기(탈퇴)
 * - 본인만 가능
 * - 파티장이 나가면: 남은 멤버 있으면 위임, 없으면 파티 삭제
 * - 마지막 멤버가 나가면: 파티 삭제
 */
export async function POST(
    _req: Request,
    { params }: { params: Promise<{ partyId: string }> } // ✅ Promise로
) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const myUserId =
        ((session.user as any).id as string) ||
        ((session.user as any).discordId as string) ||
        null;

    if (!myUserId) {
        return NextResponse.json({ error: "Invalid session user" }, { status: 401 });
    }

    // ✅ params 먼저 await
    const { partyId } = await params;
    const partyIdNum = Number(partyId);

    if (!Number.isInteger(partyIdNum)) {
        return new NextResponse("Invalid party id", { status: 400 });
    }

    const db = await getDb();
    const partiesCol = db.collection("parties");
    const partyMembersCol = db.collection("party_members");

    const partyRaidTasksCol = db.collection("party_raid_tasks");
    const partyInvitesCol = db.collection("party_invites");

    const party =
        (await partiesCol.findOne<{ id: number; owner_id: string }>(
            { id: partyIdNum },
            { projection: { _id: 0, id: 1, owner_id: 1 } }
        )) || null;

    if (!party) {
        return new NextResponse("Not found", { status: 404 });
    }

    const myMembership =
        (await partyMembersCol.findOne<{ user_id: string; role: string }>(
            { party_id: partyIdNum, user_id: myUserId },
            { projection: { _id: 0, user_id: 1, role: 1 } }
        )) || null;

    if (!myMembership) {
        return new NextResponse("Forbidden", { status: 403 });
    }

    const iAmOwner = party.owner_id === myUserId || myMembership.role === "owner";

    await partyMembersCol.deleteOne({ party_id: partyIdNum, user_id: myUserId });

    await Promise.allSettled([
        partyRaidTasksCol.deleteMany({ party_id: partyIdNum, user_id: myUserId } as any),
    ]);

    const remainingCount = await partyMembersCol.countDocuments({ party_id: partyIdNum });

    if (remainingCount === 0) {
        await Promise.allSettled([
            partiesCol.deleteOne({ id: partyIdNum }),
            partyMembersCol.deleteMany({ party_id: partyIdNum } as any),
            partyRaidTasksCol.deleteMany({ party_id: partyIdNum } as any),
            partyInvitesCol.deleteMany({ party_id: partyIdNum } as any),
        ]);

        return NextResponse.json({
            ok: true,
            deletedParty: true,
            transferred: false,
            newOwnerId: null,
        });
    }

    if (!iAmOwner) {
        return NextResponse.json({
            ok: true,
            deletedParty: false,
            transferred: false,
            newOwnerId: null,
        });
    }

    const nextOwner =
        (await partyMembersCol.findOne<{ user_id: string }>(
            { party_id: partyIdNum },
            {
                sort: { _id: 1 },
                projection: { _id: 0, user_id: 1 },
            } as any
        )) || null;

    if (!nextOwner?.user_id) {
        return NextResponse.json({ error: "Failed to pick next owner" }, { status: 500 });
    }

    await partiesCol.updateOne(
        { id: partyIdNum },
        { $set: { owner_id: nextOwner.user_id } }
    );

    await partyMembersCol.updateMany(
        { party_id: partyIdNum, role: "owner" },
        { $set: { role: "member" } }
    );
    await partyMembersCol.updateOne(
        { party_id: partyIdNum, user_id: nextOwner.user_id },
        { $set: { role: "owner" } }
    );

    return NextResponse.json({
        ok: true,
        deletedParty: false,
        transferred: true,
        newOwnerId: nextOwner.user_id,
    });
}
