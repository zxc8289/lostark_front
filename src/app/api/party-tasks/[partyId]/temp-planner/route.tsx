import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getDb } from "@/db/client";

export const runtime = "nodejs";

type RouteParams = Promise<{ partyId: string }>;

// 🔥 만료된 그룹 필터링 함수
function filterExpiredGroups(groups: any[]) {
    const now = Date.now();
    return groups.filter((g) => !g.expiresAt || g.expiresAt > now);
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

        let groups = partyRow.temp_planner_data || [];
        const validGroups = filterExpiredGroups(groups);

        // 🔥 만료된 그룹이 있었다면 DB 조용히 업데이트
        if (groups.length !== validGroups.length) {
            await partiesCol.updateOne({ id: partyIdNum }, { $set: { temp_planner_data: validGroups } });
        }

        return NextResponse.json({ groups: validGroups }, { status: 200 });
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

        // 🔥 저장할 때도 만료된 그룹은 버리고 저장
        const validGroups = filterExpiredGroups(body.groups);

        await partiesCol.updateOne(
            { id: partyIdNum },
            { $set: { temp_planner_data: validGroups } }
        );

        return NextResponse.json({ ok: true }, { status: 200 });
    } catch (e) {
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}