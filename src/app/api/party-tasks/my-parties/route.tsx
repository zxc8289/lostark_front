// app/api/party-tasks/my-parties/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getDb } from "@/db/client";

export const runtime = "nodejs";

type PartyDoc = {
    id: number;
    name: string;
    memo: string | null;
    created_at: string;
};

type PartyMemberDoc = {
    party_id: number;
    user_id: string;
    role: string;
    joined_at?: string;
};

type UserDoc = {
    id: string;
    name: string | null;
    image: string | null;
};

export async function GET() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        return NextResponse.json({ parties: [] }, { status: 401 });
    }

    const userId = (session.user as any).id as string;

    try {
        const db = await getDb();
        const partiesCol = db.collection("parties");
        const partyMembersCol = db.collection<PartyMemberDoc>("party_members");
        const usersCol = db.collection<UserDoc>("users");

        // 1) 내가 속한 파티 목록 (party_members 기준)
        const myMemberships = (await partyMembersCol
            .find({ user_id: userId })
            .toArray()) as PartyMemberDoc[];

        if (!myMemberships.length) {
            return NextResponse.json({ parties: [] });
        }

        const partyIds = Array.from(
            new Set(myMemberships.map((m) => m.party_id))
        );

        // 2) 파티 정보들 가져오기 (created_at DESC)
        const partyDocs = (await partiesCol
            .find<PartyDoc>(
                { id: { $in: partyIds } },
                {
                    projection: {
                        _id: 0,
                        id: 1,
                        name: 1,
                        memo: 1,
                        created_at: 1,
                    },
                }
            )
            .sort({ created_at: -1 })
            .toArray()) as PartyDoc[];

        if (!partyDocs.length) {
            return NextResponse.json({ parties: [] });
        }

        // 3) 해당 파티들의 모든 멤버 가져오기
        const allMembers = (await partyMembersCol
            .find({ party_id: { $in: partyIds } })
            .toArray()) as PartyMemberDoc[];

        // 파티별 멤버 그룹핑
        const membersByParty = new Map<number, PartyMemberDoc[]>();
        for (const m of allMembers) {
            const arr = membersByParty.get(m.party_id) ?? [];
            arr.push(m);
            membersByParty.set(m.party_id, arr);
        }

        // 4) 필요한 유저 정보만 모아서 users 조회
        const userIdSet = new Set<string>();
        for (const m of allMembers) {
            userIdSet.add(m.user_id);
        }
        const memberUserIds = Array.from(userIdSet);

        const userDocs = (await usersCol
            .find(
                { id: { $in: memberUserIds } },
                {
                    projection: {
                        _id: 0,
                        id: 1,
                        name: 1,
                        image: 1,
                    },
                }
            )
            .toArray()) as UserDoc[];

        const userById = new Map<string, UserDoc>();
        for (const u of userDocs) {
            userById.set(u.id, u);
        }

        // 5) 최종 parties 응답 구성
        const parties = partyDocs.map((row) => {
            const membersForParty = membersByParty.get(row.id) ?? [];

            // users와 조인 + 역할/이름 기준 정렬
            let richMembers = membersForParty.map((m) => {
                const u = userById.get(m.user_id);
                return {
                    id: m.user_id,
                    name: u?.name ?? null,
                    image: u?.image ?? null,
                    role: m.role,
                };
            });

            // ORDER BY owner 먼저, 그 다음 이름
            richMembers = richMembers.sort((a, b) => {
                const aOwner = a.role === "owner" ? 0 : 1;
                const bOwner = b.role === "owner" ? 0 : 1;
                if (aOwner !== bOwner) return aOwner - bOwner;

                const aName = (a.name ?? "").toLowerCase();
                const bName = (b.name ?? "").toLowerCase();
                if (aName < bName) return -1;
                if (aName > bName) return 1;
                return 0;
            });

            const previewMembers = richMembers;

            return {
                id: String(row.id),
                name: row.name,
                memberCount: membersForParty.length || previewMembers.length,
                raidCount: 0,
                nextResetAt: null,
                members: previewMembers.map((m) => ({
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
