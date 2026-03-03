// app/api/party-tasks/[partyId]/raid-tasks/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getDb } from "@/db/client";

export const runtime = "nodejs"; // MongoDB 드라이버도 node 런타임에서만 사용

// ─────────────────────────────
// 타입들
// ─────────────────────────────
type PartyMemberRow = {
    party_id: number;
    user_id: string;
    role: string;
    joined_at: string;
    name: string | null;
    email: string | null;
    image: string | null;
    canOthersEdit?: boolean; // 🔥 추가
};

type RaidStateJson = {
    // 멀티 계정 정보
    accounts?: {
        id: string;
        nickname: string;
        summary: any | null; // CharacterSummary
        isPrimary?: boolean;
        isSelected?: boolean;
    }[];

    // 옛날 전역 대표 (안 써도 되지만 남겨두기)
    activeAccountId?: string | null;

    // 새로 쓰는: 파티별 대표 계정 id
    activeAccountByParty?: Record<string, string | null>;

    // 기존 필드들
    nickname?: string;
    summary?: any | null;
    prefsByChar?: Record<string, any>;
    visibleByChar?: Record<string, boolean>;
    tableOrder?: string[]; // 테이블 레이드 순서 저장용
    rosterOrder?: string[]; // ✅ 추가
    cardRosterOrder?: string[];
};

type RaidTaskStateRow = {
    user_id: string;
    state_json: string;
    updated_at: string;
};

type PartyMemberTasks = {
    userId: string;
    name: string | null;
    image: string | null;
    nickname: string;
    summary: any | null; // CharacterSummary
    prefsByChar: Record<string, any>;
    visibleByChar: Record<string, boolean>;
    tableOrder?: string[];
    canOthersEdit?: boolean; // 🔥 추가
    rosterOrder?: string[]; // ✅ 추가
    cardRosterOrder?: string[];
};

type PartyRaidTasksResponse = {
    members: PartyMemberTasks[];
};

type RouteParams = Promise<{ partyId: string }>;

// ─────────────────────────────
// GET: 파티원들의 "내 숙제 상태" 조회
// ─────────────────────────────
export async function GET(
    req: NextRequest,
    { params }: { params: RouteParams }
) {
    const session = (await getServerSession(authOptions)) as Session | null;
    if (!session || !session.user) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id as string;
    const { partyId } = await params;
    const partyIdNum = Number(partyId);

    if (!partyIdNum || Number.isNaN(partyIdNum)) {
        return NextResponse.json({ message: "Invalid party id" }, { status: 400 });
    }

    const db = await getDb();
    const partiesCol = db.collection("parties");
    const partyMembersCol = db.collection("party_members");
    const usersCol = db.collection("users");
    const raidTaskStateCol = db.collection("raid_task_state");

    // 1) 파티 존재 여부 체크
    const partyRow =
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

    if (!partyRow) {
        return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    // 2) 파티 멤버 목록
    const memberDocs = (await partyMembersCol
        .find<{
            party_id: number;
            user_id: string;
            role: string;
            joined_at: string;
        }>({
            party_id: partyIdNum,
        })
        .toArray()) as {
            party_id: number;
            user_id: string;
            role: string;
            joined_at: string;
        }[];

    if (!memberDocs || memberDocs.length === 0) {
        // 파티는 있는데 멤버가 하나도 없는 극단상황
        return NextResponse.json(
            { members: [] } satisfies PartyRaidTasksResponse,
            { status: 200 }
        );
    }

    const memberUserIds = memberDocs.map((m) => m.user_id);

    // 🔥 유저 정보(users) 조인할 때 canOthersEdit 필드도 가져오기
    const userDocs = (await usersCol
        .find<{
            id: string;
            name: string | null;
            email: string | null;
            image: string | null;
            canOthersEdit?: boolean; // 🔥 추가
        }>({
            id: { $in: memberUserIds },
        })
        .toArray()) as {
            id: string;
            name: string | null;
            email: string | null;
            image: string | null;
            canOthersEdit?: boolean; // 🔥 추가
        }[];

    const userById = new Map<
        string,
        { id: string; name: string | null; email: string | null; image: string | null; canOthersEdit?: boolean } // 🔥 추가
    >();
    for (const u of userDocs) {
        userById.set(u.id, u);
    }

    // users 컬렉션에 문서가 없는 유저(탈퇴 등)는 파티 멤버에서 제외
    const memberRows: PartyMemberRow[] = [];
    for (const m of memberDocs) {
        const u = userById.get(m.user_id);
        if (!u) {
            continue;
        }
        memberRows.push({
            party_id: m.party_id,
            user_id: m.user_id,
            role: m.role,
            joined_at: m.joined_at,
            name: u.name ?? null,
            email: u.email ?? null,
            image: u.image ?? null,
            canOthersEdit: u.canOthersEdit, // 🔥 추가: DB에 있는 권한 값 매핑
        });
    }

    if (memberRows.length === 0) {
        return NextResponse.json(
            { members: [] } satisfies PartyRaidTasksResponse,
            { status: 200 }
        );
    }

    const isMember = memberRows.some((m) => m.user_id === userId);
    if (!isMember) {
        return NextResponse.json(
            { message: "Forbidden: not a member" },
            { status: 403 }
        );
    }

    // 3) 파티 멤버들의 raid_task_state 조회
    const memberUserIdsForState = memberRows.map((m) => m.user_id);
    const stateDocs = (await raidTaskStateCol
        .find<{
            user_id: string;
            state_json: string;
            updated_at: string;
        }>({
            user_id: { $in: memberUserIdsForState },
        })
        .toArray()) as {
            user_id: string;
            state_json: string;
            updated_at: string;
        }[];

    const stateByUserId = new Map<string, RaidTaskStateRow>();
    for (const s of stateDocs) {
        stateByUserId.set(s.user_id, {
            user_id: s.user_id,
            state_json: s.state_json,
            updated_at: s.updated_at,
        });
    }

    // 4) PartyMemberTasks 형태로 변환
    const partyKey = String(partyIdNum);
    const members: PartyMemberTasks[] = [];

    for (const m of memberRows) {
        const stateRow = stateByUserId.get(m.user_id);
        let parsed: RaidStateJson | null = null;

        if (stateRow) {
            try {
                parsed = JSON.parse(stateRow.state_json) as RaidStateJson;
            } catch {
                parsed = null;
            }
        }

        let effectiveSummary: any = parsed?.summary ?? null;
        const accounts = parsed?.accounts ?? [];

        if (accounts.length > 0) {
            const partyActiveId = parsed?.activeAccountByParty?.[partyKey] ?? null;
            const globalActiveId = parsed?.activeAccountId ?? null;

            const selectedAcc =
                (partyActiveId && accounts.find((a) => a.id === partyActiveId)) ||
                (globalActiveId && accounts.find((a) => a.id === globalActiveId)) ||
                accounts.find((a) => a.isSelected) ||
                accounts.find((a) => a.isPrimary) ||
                accounts[0];

            if (selectedAcc?.summary) {
                effectiveSummary = selectedAcc.summary;
            }
        }

        if (stateRow) {
            const hasAnyAccount = accounts.length > 0;
            const hasSummary = !!effectiveSummary;

            if (!hasAnyAccount && !hasSummary) {
                continue;
            }
        }

        members.push({
            userId: m.user_id,
            name: m.name,
            image: m.image,
            nickname: parsed?.nickname ?? "",
            summary: effectiveSummary,
            prefsByChar: parsed?.prefsByChar ?? {},
            visibleByChar: parsed?.visibleByChar ?? {},
            tableOrder: parsed?.tableOrder ?? [],
            canOthersEdit: m.canOthersEdit ?? true, // 🔥 프론트엔드로 전달! (DB에 값이 없으면 기본적으로 true)
            rosterOrder: parsed?.rosterOrder ?? [], // ✅ 추가
            cardRosterOrder: parsed?.cardRosterOrder ?? [], // 🔥 DB에서 읽어와서 응답에 추가
        });
    }

    return NextResponse.json(
        { members } satisfies PartyRaidTasksResponse,
        { status: 200 }
    );
}

// ─────────────────────────────
// POST: 파티원들의 "내 숙제 상태" 저장
// ─────────────────────────────
export async function POST(
    req: NextRequest,
    { params }: { params: RouteParams }
) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { partyId } = await params;
    const partyIdNum = Number(partyId);
    const me = (session.user as any).id as string;

    let body: any;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
    }

    const { userId: targetUserId, prefsByChar, visibleByChar, tableOrder, nickname, summary, accounts, activeAccountId, activeAccountByParty, rosterOrder, cardRosterOrder } = body;
    if (!targetUserId) {
        return NextResponse.json({ message: "userId required" }, { status: 400 });
    }

    const db = await getDb();
    const raidTaskStateCol = db.collection("raid_task_state");
    const partyMembersCol = db.collection("party_members");

    // 권한 체크 (내가 파티원인지, 대상이 파티원인지)
    const [meRow, targetRow] = await Promise.all([
        partyMembersCol.findOne({ party_id: partyIdNum, user_id: me }),
        partyMembersCol.findOne({ party_id: partyIdNum, user_id: targetUserId })
    ]);

    if (!meRow || !targetRow) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    // 기존 데이터 가져오기
    const existing = await raidTaskStateCol.findOne({ user_id: targetUserId });
    let nextState: any = existing?.state_json ? JSON.parse(existing.state_json) : {};

    // 1. 기본 필드 업데이트
    if (prefsByChar) nextState.prefsByChar = prefsByChar;
    if (visibleByChar) nextState.visibleByChar = visibleByChar;
    if (tableOrder) nextState.tableOrder = tableOrder;
    if (Array.isArray(rosterOrder)) nextState.rosterOrder = rosterOrder;
    if (Array.isArray(cardRosterOrder)) nextState.cardRosterOrder = cardRosterOrder; // 🔥 이 줄을 추가합니다.
    if (typeof nickname === "string") nextState.nickname = nickname;

    // 2. 핵심: summary(캐릭터 목록) 업데이트 로직
    if (summary !== undefined) {
        nextState.summary = summary;

        if (Array.isArray(nextState.accounts)) {
            const targetNickname = nickname || nextState.nickname;

            const accIdx = nextState.accounts.findIndex(
                (a: any) => a.nickname.toLowerCase() === targetNickname?.toLowerCase()
            );

            if (accIdx >= 0) {
                nextState.accounts[accIdx].summary = summary;
            } else if (nextState.accounts.length > 0) {
                const selectedIdx = nextState.accounts.findIndex((a: any) => a.isSelected);
                const finalIdx = selectedIdx >= 0 ? selectedIdx : 0;
                nextState.accounts[finalIdx].summary = summary;
            }
        }
    }

    // 3. 멀티 계정 관련 필드가 통째로 들어온 경우 처리
    if (Array.isArray(accounts)) nextState.accounts = accounts;
    if (activeAccountId !== undefined) nextState.activeAccountId = activeAccountId;
    if (activeAccountByParty) nextState.activeAccountByParty = activeAccountByParty;

    try {
        await raidTaskStateCol.updateOne(
            { user_id: targetUserId },
            {
                $set: {
                    state_json: JSON.stringify(nextState),
                    updated_at: new Date().toISOString(),
                },
                $setOnInsert: { created_at: new Date().toISOString() }
            },
            { upsert: true }
        );
        return NextResponse.json({ ok: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ ok: false }, { status: 500 });
    }
}