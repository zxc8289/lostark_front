import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getDb } from "@/db/client";

export const runtime = "nodejs";

type RouteParams = Promise<{ partyId: string }>;

/**
 * 🔥 플래너 데이터 통합 처리 함수
 * 1. 일반 그룹: expiresAt이 지났으면 삭제
 * 2. 고정 그룹: resetAt이 지났으면 파티원(slots) 초기화
 */
function processPlannerData(groups: any[]) {
    const now = Date.now();

    // 1. 만료된 일반 그룹 필터링 (기존 로직)
    const validGroups = groups.filter((g) => !g.expiresAt || g.expiresAt > now);

    // 2. 고정 그룹의 파티원 초기화 체크 (새 로직)
    return validGroups.map((g) => {
        if (g.isPinned && g.resetAt && g.resetAt <= now) {
            return {
                ...g,
                slots: Array(g.maxMembers).fill(null), // 모든 슬롯 비우기
                resetAt: undefined, // 초기화 완료 후 타이머 제거
            };
        }
        return g;
    });
}

export async function GET(
    req: NextRequest,
    { params }: { params: RouteParams }
) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { partyId } = await params;
    const partyIdNum = Number(partyId);

    try {
        const db = await getDb();
        const partiesCol = db.collection("parties");

        const partyRow = await partiesCol.findOne(
            { id: partyIdNum },
            { projection: { temp_planner_data: 1 } }
        );

        if (!partyRow) return NextResponse.json({ message: "Not found" }, { status: 404 });

        const originalGroups = partyRow.temp_planner_data || [];
        // 🔥 통합 처리 로직 적용
        const processedGroups = processPlannerData(originalGroups);

        // 변경 사항이 있을 때만 DB 업데이트
        if (JSON.stringify(originalGroups) !== JSON.stringify(processedGroups)) {
            await partiesCol.updateOne(
                { id: partyIdNum },
                { $set: { temp_planner_data: processedGroups } }
            );
        }

        return NextResponse.json({ groups: processedGroups }, { status: 200 });
    } catch (e) {
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(
    req: NextRequest,
    { params }: { params: RouteParams }
) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { partyId } = await params;
    const partyIdNum = Number(partyId);

    const body = await req.json();
    if (!body.groups || !Array.isArray(body.groups)) return NextResponse.json({ message: "No groups data" }, { status: 400 });

    try {
        const db = await getDb();
        const partiesCol = db.collection("parties");

        // 🔥 저장 전에도 한번 더 처리해서 깨끗한 상태로 저장
        const processedGroups = processPlannerData(body.groups);

        await partiesCol.updateOne(
            { id: partyIdNum },
            { $set: { temp_planner_data: processedGroups } }
        );

        return NextResponse.json({ ok: true }, { status: 200 });
    } catch (e) {
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}