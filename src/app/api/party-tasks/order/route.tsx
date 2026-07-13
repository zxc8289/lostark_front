import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getDb } from "@/db/client";

export const runtime = "nodejs";

type PartyMemberDoc = {
    party_id: number;
    user_id: string;
};

export async function PATCH(req: Request) {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id;

    if (!userId) {
        return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    try {
        const body = await req.json();
        const rawOrder: unknown[] | null = Array.isArray(body?.partyOrder) ? body.partyOrder : null;

        if (!rawOrder || rawOrder.some((id) => typeof id !== "string")) {
            return NextResponse.json({ error: "잘못된 파티 순서입니다." }, { status: 400 });
        }

        const requestedOrder = rawOrder as string[];
        const db = await getDb();
        const partyMembersCol = db.collection<PartyMemberDoc>("party_members");
        const usersCol = db.collection("users");

        const memberships = await partyMembersCol
            .find({ user_id: userId }, { projection: { _id: 0, party_id: 1, user_id: 1 } })
            .toArray();

        const allowedIds = new Set(memberships.map((m) => String(m.party_id)));
        const nextOrder: string[] = [];
        const seen = new Set<string>();

        for (const id of requestedOrder) {
            if (!allowedIds.has(id) || seen.has(id)) continue;
            seen.add(id);
            nextOrder.push(id);
        }

        for (const id of allowedIds) {
            if (!seen.has(id)) nextOrder.push(id);
        }

        const result = await usersCol.updateOne(
            { id: userId },
            { $set: { partyOrder: nextOrder, updatedAt: new Date() } }
        );

        if (result.matchedCount === 0) {
            return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
        }

        return NextResponse.json({ ok: true, partyOrder: nextOrder });
    } catch (error) {
        console.error("[Party Order PATCH] Error:", error);
        return NextResponse.json({ error: "파티 순서 저장 중 오류가 발생했습니다." }, { status: 500 });
    }
}
