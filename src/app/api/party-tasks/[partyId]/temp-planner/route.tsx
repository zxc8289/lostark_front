import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getDb } from "@/db/client";

export const runtime = "nodejs";

type RouteParams = Promise<{ partyId: string }>;


// 백엔드: api/party-tasks/[partyId]/temp-planner/route.ts (또는 해당하는 API 파일)

function processPlannerData(groups: any[]) {
    const now = Date.now();

    // 1. 만료된 일반 그룹 필터링
    const validGroups = groups.filter((g) => !g.expiresAt || g.expiresAt > now);

    // 2. 고정 그룹의 파티원 초기화 체크
    return validGroups.map((g) => {
        if (g.isPinned && g.resetAt && g.resetAt <= now) {
            return {
                ...g,
                // 🔥 수정됨: 모든 슬롯을 비우는 대신, isSlotPinned가 true인 캐릭터는 남김
                slots: g.slots.map((slot: any) => slot?.isSlotPinned ? slot : null),
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