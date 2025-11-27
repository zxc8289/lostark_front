// app/api/party-tasks/my-parties/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/db/client";

export async function GET() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        return NextResponse.json({ parties: [] }, { status: 401 });
    }

    const userId = session.user.id;

    try {
        // 1) 내가 속한 파티 목록 + 멤버 수
        const partyRows = db
            .prepare(
                `
                SELECT
                  p.id,
                  p.name,
                  p.memo,
                  p.created_at,
                  COUNT(pm2.user_id) AS memberCount
                FROM parties p
                JOIN party_members pm
                  ON pm.party_id = p.id
                 AND pm.user_id = ?
                LEFT JOIN party_members pm2
                  ON pm2.party_id = p.id
                GROUP BY p.id
                ORDER BY p.created_at DESC
            `
            )
            .all(userId) as {
                id: number;
                name: string;
                memo: string | null;
                created_at: string;
                memberCount: number;
            }[];

        // 2) 파티별 멤버(디스코드 유저) 조회용 쿼리
        const membersStmt = db.prepare(
            `
            SELECT u.id, u.name, u.image, pm.role
            FROM party_members pm
            JOIN users u ON u.id = pm.user_id
            WHERE pm.party_id = ?
            ORDER BY
              CASE WHEN pm.role = 'owner' THEN 0 ELSE 1 END,
              u.name
            LIMIT 5
        `
        );

        const parties = partyRows.map((row) => {
            const members = membersStmt.all(row.id) as {
                id: string;
                name: string | null;
                image: string | null;
                role: string;
            }[];

            return {
                id: String(row.id),
                name: row.name,
                memberCount: row.memberCount ?? members.length,
                raidCount: 0,
                nextResetAt: null,
                members: members.map((m) => ({
                    id: m.id,
                    name: m.name,
                    image: m.image,
                })),
            };
        });

        return NextResponse.json({ parties });
    } catch (err) {
        console.error(err);
        return NextResponse.json(
            { error: "파티 목록을 불러오는 중 오류가 발생했습니다." },
            { status: 500 }
        );
    }
}
