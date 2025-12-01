// app/api/party-tasks/join/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        const userId = session?.user?.id;

        if (!userId) {
            return NextResponse.json(
                { error: "로그인이 필요합니다." },
                { status: 401 }
            );
        }

        const body = await req.json();
        const code = String(body.code ?? "").trim();

        if (!code) {
            return NextResponse.json(
                { error: "초대 코드가 필요합니다." },
                { status: 400 }
            );
        }

        const party = db
            .prepare(`SELECT id FROM parties WHERE invite_code = ?`)
            .get(code) as { id: number } | undefined;

        if (!party) {
            return NextResponse.json(
                { error: "해당 초대 코드를 가진 파티를 찾을 수 없습니다." },
                { status: 404 }
            );
        }

        const insertMember = db.prepare(
            `INSERT OR IGNORE INTO party_members (party_id, user_id, role)
             VALUES (?, ?, 'member')`
        );
        insertMember.run(party.id, userId);

        return NextResponse.json(
            {
                id: String(party.id),
                partyId: String(party.id),
            },
            { status: 200 }
        );
    } catch (err: any) {
        console.error(err);
        return NextResponse.json(
            { error: "파티 참가 중 오류가 발생했습니다." },
            { status: 500 }
        );
    }
}
