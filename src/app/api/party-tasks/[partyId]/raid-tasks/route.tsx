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
};

type PartyRaidTasksResponse = {
    members: PartyMemberTasks[];
};

// ✅ Next 15 스타일: params 는 Promise 여서 await 해줘야 함
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

    // 유저 정보(users) 조인
    const userDocs = (await usersCol
        .find<{
            id: string;
            name: string | null;
            email: string | null;
            image: string | null;
        }>({
            id: { $in: memberUserIds },
        })
        .toArray()) as {
            id: string;
            name: string | null;
            email: string | null;
            image: string | null;
        }[];

    const userById = new Map<
        string,
        { id: string; name: string | null; email: string | null; image: string | null }
    >();
    for (const u of userDocs) {
        userById.set(u.id, u);
    }

    // users 컬렉션에 문서가 없는 유저(탈퇴 등)는 파티 멤버에서 제외
    const memberRows: PartyMemberRow[] = [];
    for (const m of memberDocs) {
        const u = userById.get(m.user_id);
        if (!u) {
            // 계정 삭제된 유저 → 껍데기 방지용으로 아예 제외
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
        });
    }

    if (memberRows.length === 0) {
        // 필터링 결과 멤버가 없으면 그냥 빈 배열 반환
        return NextResponse.json(
            { members: [] } satisfies PartyRaidTasksResponse,
            { status: 200 }
        );
    }

    // 현재 로그인한 유저가 이 파티의 멤버인지 확인
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

        // 기본값: 옛날 single-summary 구조
        let effectiveSummary: any = parsed?.summary ?? null;
        const accounts = parsed?.accounts ?? [];

        if (accounts.length > 0) {
            // 1순위: 이 파티에서 선택한 대표 계정
            const partyActiveId = parsed?.activeAccountByParty?.[partyKey] ?? null;

            // 2순위: 전역 대표 (activeAccountId)
            const globalActiveId = parsed?.activeAccountId ?? null;

            // 3,4,5순위: isSelected / isPrimary / 첫 번째 계정
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

        // ⭐ 여기서 "껍데기 멤버" 판정
        // - stateRow가 존재하는데도 accounts도 없고 summary도 없으면 → 계정 다 지워진 상태라고 보고 숨김
        if (stateRow) {
            const hasAnyAccount = accounts.length > 0;
            const hasSummary = !!effectiveSummary;

            if (!hasAnyAccount && !hasSummary) {
                // 이 유저는 숙제/계정 정보가 완전히 비어 있으므로 파티 숙제 목록에서 제외
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
        });
    }

    return NextResponse.json(
        { members } satisfies PartyRaidTasksResponse,
        { status: 200 }
    );
}

// ─────────────────────────────
// POST: raid_task_state (전역) 업데이트
//  - 파티원이라면, 같은 파티의 다른 멤버 상태도 수정 가능하게 유지
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
    if (!partyIdNum || Number.isNaN(partyIdNum)) {
        return NextResponse.json({ message: "Invalid party id" }, { status: 400 });
    }

    const me = (session.user as any).id as string;

    let body: {
        userId?: string;
        nickname?: string;
        summary?: any;
        prefsByChar?: any;
        visibleByChar?: Record<string, boolean>;

        accounts?: RaidStateJson["accounts"];
        activeAccountId?: string | null;
        activeAccountByParty?: Record<string, string | null>;
    };

    try {
        body = await req.json();
    } catch {
        return NextResponse.json(
            { message: "Invalid JSON body" },
            { status: 400 }
        );
    }

    const targetUserId = body.userId;
    const prefsByChar = body.prefsByChar;
    const visibleByChar = body.visibleByChar;
    const nickname = body.nickname;
    const summary = body.summary;

    const accounts = body.accounts;
    const activeAccountId = body.activeAccountId;
    const activeAccountByParty = body.activeAccountByParty;

    if (!targetUserId || typeof prefsByChar !== "object") {
        return NextResponse.json(
            { message: "userId, prefsByChar required" },
            { status: 400 }
        );
    }

    const db = await getDb();
    const partyMembersCol = db.collection("party_members");
    const raidTaskStateCol = db.collection("raid_task_state");

    // 1) 내가 이 파티의 멤버인지 확인
    const meRow = await partyMembersCol.findOne({
        party_id: partyIdNum,
        user_id: me,
    });

    if (!meRow) {
        return NextResponse.json(
            { message: "Forbidden: not a party member" },
            { status: 403 }
        );
    }

    // 2) 수정 대상도 이 파티 멤버인지 확인
    const targetRow = await partyMembersCol.findOne({
        party_id: partyIdNum,
        user_id: targetUserId,
    });

    if (!targetRow) {
        return NextResponse.json(
            { message: "Target user is not in this party" },
            { status: 400 }
        );
    }

    // 3) 기존 raid_task_state 가져와서 필드만 부분 업데이트
    const existing = (await raidTaskStateCol.findOne<{
        state_json?: string;
    }>({
        user_id: targetUserId,
    })) as { state_json?: string } | null;

    let nextState: any;
    if (existing?.state_json) {
        try {
            nextState = JSON.parse(existing.state_json);
        } catch {
            nextState = {};
        }
    } else {
        nextState = {};
    }

    // ⬇️ 여기서 필요한 필드만 갈아끼우기
    nextState.prefsByChar = prefsByChar;

    if (visibleByChar && typeof visibleByChar === "object") {
        nextState.visibleByChar = visibleByChar;
    }

    // nickname / summary는 body에 들어온 경우에만 덮어씀
    if (typeof nickname === "string") {
        nextState.nickname = nickname;
    }
    if (summary !== undefined) {
        nextState.summary = summary;
    }

    // 멀티 계정 관련 필드도 body에 들어온 경우만 갱신
    if (Array.isArray(accounts)) {
        nextState.accounts = accounts;
    }
    if (activeAccountId !== undefined) {
        nextState.activeAccountId = activeAccountId;
    }
    if (activeAccountByParty && typeof activeAccountByParty === "object") {
        nextState.activeAccountByParty = activeAccountByParty;
    }

    const stateJson = JSON.stringify(nextState);

    try {
        await raidTaskStateCol.updateOne(
            { user_id: targetUserId }, // 조건
            {
                $set: {
                    user_id: targetUserId,
                    state_json: stateJson,
                    updated_at: new Date().toISOString(),
                },
                $setOnInsert: {
                    created_at: new Date().toISOString(),
                },
            },
            { upsert: true }
        );

        return NextResponse.json({ ok: true });
    } catch (e: any) {
        console.error("[raid_task_state] Unexpected error:", e);
        return NextResponse.json(
            { ok: false, message: "internal error" },
            { status: 500 }
        );
    }
}
