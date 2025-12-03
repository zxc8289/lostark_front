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
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    // 🔹 4) 이 유저의 raid_task_state도 같이 가져오기
    const raidStateRow = db
        .prepare(
            `
      SELECT state_json
      FROM raid_task_state
      WHERE user_id = ?
      LIMIT 1
    `
        )
        .get(userId) as { state_json: string } | undefined;

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

    // 1) 현재 파티 정보 + 내 membership 조회
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

    const membership = db
        .prepare(
            `
      SELECT role
      FROM party_members
      WHERE party_id = ? AND user_id = ?
    `
        )
        .get(partyIdNum, myUserId) as { role: string } | undefined;

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

        db.prepare(
            `
        UPDATE parties
        SET name = ?
        WHERE id = ?
      `
        ).run(trimmed, partyIdNum);

        updates.name = trimmed;
    }

    // 3) 파티장 변경
    if (typeof nextOwnerId === "string" && nextOwnerId && nextOwnerId !== party.owner_id) {
        // 새 owner가 실제 멤버인지 확인
        const newOwnerMembership = db
            .prepare(
                `
        SELECT user_id
        FROM party_members
        WHERE party_id = ? AND user_id = ?
      `
            )
            .get(partyIdNum, nextOwnerId) as { user_id: string } | undefined;

        if (!newOwnerMembership) {
            return new NextResponse("New owner must be a party member", { status: 400 });
        }

        // better-sqlite3 트랜잭션 사용
        const tx = db.transaction(() => {
            // parties 테이블 owner 변경
            db.prepare(
                `
          UPDATE parties
          SET owner_id = ?
          WHERE id = ?
        `
            ).run(nextOwnerId, partyIdNum);

            // 기존 owner의 role을 member로 내리고
            db.prepare(
                `
          UPDATE party_members
          SET role = 'member'
          WHERE party_id = ? AND role = 'owner'
        `
            ).run(partyIdNum);

            // 새 owner의 role을 owner로 올리기
            db.prepare(
                `
          UPDATE party_members
          SET role = 'owner'
          WHERE party_id = ? AND user_id = ?
        `
            ).run(partyIdNum, nextOwnerId);
        });

        tx();
        updates.ownerId = nextOwnerId;
    }

    return NextResponse.json({
        ok: true,
        ...updates,
    });
}
