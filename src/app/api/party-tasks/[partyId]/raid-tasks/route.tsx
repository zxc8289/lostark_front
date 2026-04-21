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
    goldDesignatedByChar?: Record<string, boolean>; // ✅ 추가
    powerLockedByChar?: Record<string, boolean>;
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
    goldDesignatedByChar?: Record<string, boolean>; // ✅ 추가
    powerLockedByChar?: Record<string, boolean>;
};

type PartyRaidTasksResponse = {
    members: PartyMemberTasks[];
    plannerData?: any[];
    tempPlannerData?: any[];
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
            planner_data?: any[];
            temp_planner_data?: any[];
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
                    planner_data: 1,
                    temp_planner_data: 1,
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
        return NextResponse.json(
            { members: [] } satisfies PartyRaidTasksResponse,
            { status: 200 }
        );
    }

    const memberUserIds = memberDocs.map((m) => m.user_id);

    const userDocs = (await usersCol
        .find<{
            id: string;
            name: string | null;
            email: string | null;
            image: string | null;
            canOthersEdit?: boolean;
        }>({
            id: { $in: memberUserIds },
        })
        .toArray()) as {
            id: string;
            name: string | null;
            email: string | null;
            image: string | null;
            canOthersEdit?: boolean;
        }[];

    const userById = new Map<
        string,
        { id: string; name: string | null; email: string | null; image: string | null; canOthersEdit?: boolean }
    >();
    for (const u of userDocs) {
        userById.set(u.id, u);
    }

    const memberRows: PartyMemberRow[] = [];
    for (const m of memberDocs) {
        const u = userById.get(m.user_id);
        if (!u) continue;

        memberRows.push({
            party_id: m.party_id,
            user_id: m.user_id,
            role: m.role,
            joined_at: m.joined_at,
            name: u.name ?? null,
            email: u.email ?? null,
            image: u.image ?? null,
            canOthersEdit: u.canOthersEdit,
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

            // 🔥 현재 선택된 계정 ID (파티 기준 우선)
            const activeId = partyActiveId || globalActiveId;

            if (activeId === "ALL") {
                // ✅ 핵심: "ALL"일 경우 모든 계정의 로스터(캐릭터 목록) 병합
                const allRosters = accounts.flatMap((a: any) => a.summary?.roster || []);

                // 이름 기준으로 중복 캐릭터 제거 (동일 캐릭터가 중복 등록된 경우 방지)
                const uniqueRoster = Array.from(
                    new Map(allRosters.map((c: any) => [c.name, c])).values()
                );

                // 첫 번째 계정의 요약 정보를 베이스로 하되 이름과 로스터만 덮어씌움
                const baseSummary = accounts[0]?.summary || {};
                effectiveSummary = {
                    ...baseSummary,
                    name: "통합 원정대",
                    roster: uniqueRoster,
                };
            } else {
                // ✅ 기존 로직: 특정 단일 계정 선택
                const selectedAcc =
                    (activeId && accounts.find((a) => a.id === activeId)) ||
                    accounts.find((a) => a.isSelected) ||
                    accounts.find((a) => a.isPrimary) ||
                    accounts[0];

                if (selectedAcc?.summary) {
                    effectiveSummary = selectedAcc.summary;
                }
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
            summary: effectiveSummary, // 🔥 이제 "ALL"이면 합쳐진 데이터가 들어감!
            prefsByChar: parsed?.prefsByChar ?? {},
            visibleByChar: parsed?.visibleByChar ?? {},
            tableOrder: parsed?.tableOrder ?? [],
            canOthersEdit: m.canOthersEdit ?? true,
            rosterOrder: parsed?.rosterOrder ?? [],
            cardRosterOrder: parsed?.cardRosterOrder ?? [],
            goldDesignatedByChar: parsed?.goldDesignatedByChar ?? {},
            powerLockedByChar: parsed?.powerLockedByChar ?? {},
        });
    }

    return NextResponse.json(
        {
            members,
            plannerData: partyRow.planner_data || [],
            tempPlannerData: partyRow.temp_planner_data || []
        } satisfies PartyRaidTasksResponse,
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

    const { userId: targetUserId, prefsByChar, visibleByChar, tableOrder, nickname, summary, accounts, activeAccountId, activeAccountByParty, rosterOrder, cardRosterOrder, goldDesignatedByChar, powerLockedByChar } = body;
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
    if (Array.isArray(cardRosterOrder)) nextState.cardRosterOrder = cardRosterOrder;
    if (goldDesignatedByChar) nextState.goldDesignatedByChar = goldDesignatedByChar;
    if (powerLockedByChar) nextState.powerLockedByChar = powerLockedByChar;
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