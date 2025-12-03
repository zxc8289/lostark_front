// app/api/party-tasks/create/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { getDb } from "@/db/client";

export const runtime = "nodejs";

function makeInviteCode() {
    return crypto.randomBytes(4).toString("hex").toUpperCase();
}

// counters 컬렉션용 타입 정의
type CounterDoc = {
    _id: string; // 예: "parties"
    seq: number;
};

export async function POST(req: NextRequest) {
    // 1) 로그인 체크
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id as string | undefined;

    if (!userId) {
        return NextResponse.json(
            { error: "로그인이 필요합니다." },
            { status: 401 }
        );
    }

    try {
        const body = await req.json();
        const name = String(body.name ?? "").trim();
        const memo = body.memo ? String(body.memo).trim() : null;

        if (!name) {
            return NextResponse.json(
                { error: "파티 이름은 필수입니다." },
                { status: 400 }
            );
        }

        const db = await getDb();
        const partiesCol = db.collection("parties");
        const partyMembersCol = db.collection("party_members");
        const countersCol = db.collection<CounterDoc>("counters"); // ⬅ 여기!

        const inviteCode = makeInviteCode();
        const createdAt = new Date().toISOString();

        const counterDoc = await countersCol.findOneAndUpdate(
            { _id: "parties" },
            { $inc: { seq: 1 } },
            {
                upsert: true,
                returnDocument: "after",
            }
        );

        // counterDoc: WithId<CounterDoc> | null 이라고 타입이 잡히는 상태
        const partyId = counterDoc?.seq ?? 1;


        // 3) parties에 INSERT (owner_id = userId)
        await partiesCol.insertOne({
            id: partyId,
            name,
            memo,
            owner_id: userId,
            invite_code: inviteCode,
            created_at: createdAt,
        });

        // 4) party_members에도 파티장 본인 추가
        await partyMembersCol.insertOne({
            party_id: partyId,
            user_id: userId,
            role: "owner",
            joined_at: createdAt,
        });

        return NextResponse.json(
            {
                id: String(partyId),
                name,
                memo,
                inviteCode,
            },
            { status: 201 }
        );
    } catch (err) {
        console.error(err);
        return NextResponse.json(
            { error: "파티 생성 중 오류가 발생했습니다." },
            { status: 500 }
        );
    }
}
