// app/api/party-tasks/join/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getDb } from "@/db/client";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        const userId = (session?.user as any)?.id as string | undefined;

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

        const db = await getDb();
        const partiesCol = db.collection("parties");
        const partyMembersCol = db.collection("party_members");

        // 1) 초대코드로 파티 찾기
        const party =
            (await partiesCol.findOne<{
                id: number;
                invite_code: string | null;
            }>(
                { invite_code: code },
                {
                    projection: {
                        _id: 0,
                        id: 1,
                        invite_code: 1,
                    },
                }
            )) || undefined;

        if (!party) {
            return NextResponse.json(
                { error: "해당 초대 코드를 가진 파티를 찾을 수 없습니다." },
                { status: 404 }
            );
        }

        const now = new Date().toISOString();

        // 2) party_members에 멤버 추가 (이미 있으면 무시)
        //    SQLite: INSERT OR IGNORE 와 동일한 효과
        await partyMembersCol.updateOne(
            { party_id: party.id, user_id: userId }, // 이미 있으면
            {
                $setOnInsert: {
                    party_id: party.id,
                    user_id: userId,
                    role: "member",
                    joined_at: now,
                },
            },
            { upsert: true } // 없으면 insert, 있으면 아무 변경 없음
        );

        return NextResponse.json(
            {
                id: String(party.id),
                partyId: String(party.id),
            },
            { status: 200 }
        );
    } catch (err) {
        console.error(err);
        return NextResponse.json(
            { error: "파티 참가 중 오류가 발생했습니다." },
            { status: 500 }
        );
    }
}
