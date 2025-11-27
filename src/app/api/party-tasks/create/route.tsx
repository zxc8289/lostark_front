// app/api/party-tasks/create/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import crypto from "crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

function makeInviteCode() {
    return crypto.randomBytes(4).toString("hex").toUpperCase();
}

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

        const inviteCode = makeInviteCode();

        // 2) parties에 INSERT (owner_id = userId)
        const insertParty = db.prepare(
            `INSERT INTO parties (name, memo, owner_id, invite_code)
       VALUES (?, ?, ?, ?)`
        );
        const result = insertParty.run(name, memo, userId, inviteCode);
        const partyId = Number(result.lastInsertRowid);

        // 3) party_members에도 파티장 본인 추가
        const insertMember = db.prepare(
            `INSERT INTO party_members (party_id, user_id, role)
       VALUES (?, ?, ?)`
        );
        insertMember.run(partyId, userId, "owner");

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
