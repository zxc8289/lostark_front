// src/app/api/party-tasks/[partyId]/route.tsx
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/db/client";



export async function GET(
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

    // 1) 파티 정보 조회
    const party = db
        .prepare(
            `
      SELECT id, name, memo, owner_id, created_at
      FROM parties
      WHERE id = ?
    `
        )
        .get(partyIdNum) as
        | {
            id: number;
            name: string;
            memo: string | null;
            owner_id: string;
            created_at: string;
        }
        | undefined;

    if (!party) {
        return new NextResponse("Not found", { status: 404 });
    }

    // 2) 내가 이 파티 멤버인지 확인
    const membership = db
        .prepare(
            `
      SELECT role
      FROM party_members
      WHERE party_id = ? AND user_id = ?
    `
        )
        .get(partyIdNum, userId) as { role: string } | undefined;

    if (!membership) {
        // 파티에 속하지 않은 사람은 열람 불가
        return new NextResponse("Forbidden", { status: 403 });
    }

    // 3) 멤버 목록
    const members = db
        .prepare(
            `
      SELECT
        u.id,
        u.name,
        u.image,
        m.role
      FROM party_members m
      JOIN users u ON u.id = m.user_id
      WHERE m.party_id = ?
      ORDER BY
        CASE m.role WHEN 'owner' THEN 0 ELSE 1 END,
        u.name
    `
        )
        .all(partyIdNum) as {
            id: string;
            name: string | null;
            image: string | null;
            role: string;
        }[];

    // TODO: 나중에 파티 숙제(레이드) 정보도 여기에서 계산해서 내려줄 예정
    // 지금은 일단 껍데기만
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
    });
}
