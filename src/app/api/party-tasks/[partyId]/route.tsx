import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getDb } from "@/db/client";

export const runtime = "nodejs";

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

    const db = await getDb();
    const partiesCol = db.collection("parties");
    const partyMembersCol = db.collection("party_members");
    const usersCol = db.collection("users");
    const raidTaskStateCol = db.collection("raid_task_state");

    // 1) 파티 정보 조회
    const party =
        (await partiesCol.findOne<{
            id: number;
            name: string;
            memo: string | null;
            owner_id: string;
            created_at: string;
        }>(
            { id: partyIdNum },
            {
                projection: {
                    _id: 0,
                    id: 1,
                    name: 1,
                    memo: 1,
                    owner_id: 1,
                    created_at: 1,
                },
            }
        )) || undefined;

    if (!party) {
        return new NextResponse("Not found", { status: 404 });
    }

    // 2) 내가 이 파티 멤버인지 확인
    const membership =
        (await partyMembersCol.findOne<{
            role: string;
        }>({
            party_id: partyIdNum,
            user_id: userId,
        })) || undefined;

    if (!membership) {
        return new NextResponse("Forbidden", { status: 403 });
    }

    // 3) 멤버 목록 (party_members + users JOIN 흉내)
    const memberDocs = (await partyMembersCol
        .find<{
            party_id: number;
            user_id: string;
            role: string;
        }>({
            party_id: partyIdNum,
        })
        .toArray()) as {
            party_id: number;
            user_id: string;
            role: string;
        }[];

    const memberUserIds = memberDocs.map((m) => m.user_id);

    const userDocs = (await usersCol
        .find<{
            id: string;
            name: string | null;
            image: string | null;
        }>({
            id: { $in: memberUserIds },
        })
        .toArray()) as {
            id: string;
            name: string | null;
            image: string | null;
        }[];

    const userById = new Map<
        string,
        { id: string; name: string | null; image: string | null }
    >();
    for (const u of userDocs) {
        userById.set(u.id, u);
    }

    let members = memberDocs.map((m) => {
        const u = userById.get(m.user_id);
        return {
            id: m.user_id,
            name: u?.name ?? null,
            image: u?.image ?? null,
            role: m.role,
        };
    });

    // ORDER BY CASE role WHEN 'owner' THEN 0 ELSE 1 END, name
    members = members.sort((a, b) => {
        const aOwner = a.role === "owner" ? 0 : 1;
        const bOwner = b.role === "owner" ? 0 : 1;
        if (aOwner !== bOwner) return aOwner - bOwner;
        const aName = (a.name ?? "").toLowerCase();
        const bName = (b.name ?? "").toLowerCase();
        if (aName < bName) return -1;
        if (aName > bName) return 1;
        return 0;
    });

    // 4) 이 유저의 raid_task_state도 같이 가져오기
    const raidStateRow =
        (await raidTaskStateCol.findOne<{
            user_id: string;
            state_json: string;
        }>({
            user_id: userId,
        })) || undefined;

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
        raidState,
    });
}

/* ─────────────────────────────
 * PATCH: 파티 이름 + 파티장(owner) 변경
 * ───────────────────────────── */

export async function PATCH(
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

    // 1) 현재 파티 정보 + 내 membership 조회
    const party =
        (await partiesCol.findOne<{
            id: number;
            name: string;
            memo: string | null;
            owner_id: string;
            created_at: string;
        }>(
            { id: partyIdNum },
            {
                projection: {
                    _id: 0,
                    id: 1,
                    name: 1,
                    memo: 1,
                    owner_id: 1,
                    created_at: 1,
                },
            }
        )) || undefined;

    if (!party) {
        return new NextResponse("Not found", { status: 404 });
    }

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

    // 🔐 파티장만 수정 가능
    if (party.owner_id !== myUserId || membership.role !== "owner") {
        return new NextResponse("Only owner can modify party", { status: 403 });
    }

    let body: any;
    try {
        body = await req.json();
    } catch {
        return new NextResponse("Invalid JSON", { status: 400 });
    }

    const nextNameRaw = body?.name as string | undefined;
    const nextOwnerId = body?.ownerId as string | undefined;

    if (!nextNameRaw && !nextOwnerId) {
        return new NextResponse("Nothing to update", { status: 400 });
    }

    const updates: { name?: string; ownerId?: string } = {};

    // 2) 이름 변경
    if (typeof nextNameRaw === "string") {
        const trimmed = nextNameRaw.trim();
        if (!trimmed) {
            return new NextResponse("Party name cannot be empty", { status: 400 });
        }

        await partiesCol.updateOne(
            { id: partyIdNum },
            { $set: { name: trimmed } }
        );

        updates.name = trimmed;
    }

    // 3) 파티장 변경
    if (
        typeof nextOwnerId === "string" &&
        nextOwnerId &&
        nextOwnerId !== party.owner_id
    ) {
        // 새 owner가 실제 멤버인지 확인
        const newOwnerMembership = await partyMembersCol.findOne({
            party_id: partyIdNum,
            user_id: nextOwnerId,
        });

        if (!newOwnerMembership) {
            return new NextResponse("New owner must be a party member", {
                status: 400,
            });
        }

        // Mongo에서는 트랜잭션 없이 순차 업데이트 (필요하면 나중에 session/transaction 적용)
        // 1) parties 테이블 owner 변경
        await partiesCol.updateOne(
            { id: partyIdNum },
            { $set: { owner_id: nextOwnerId } }
        );

        // 2) 기존 owner의 role을 member로 내리고
        await partyMembersCol.updateOne(
            { party_id: partyIdNum, user_id: party.owner_id },
            { $set: { role: "member" } }
        );

        // 3) 새 owner의 role을 owner로 올리기
        await partyMembersCol.updateOne(
            { party_id: partyIdNum, user_id: nextOwnerId },
            { $set: { role: "owner" } }
        );

        updates.ownerId = nextOwnerId;
    }

    return NextResponse.json({
        ok: true,
        ...updates,
    });
}
