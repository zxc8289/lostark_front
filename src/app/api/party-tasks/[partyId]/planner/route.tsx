import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getDb } from "@/db/client";

export const runtime = "nodejs";

type RouteParams = Promise<{ partyId: string }>;

export async function GET(
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

    try {
        const db = await getDb();
        const partiesCol = db.collection("parties");

        const partyRow = await partiesCol.findOne(
            { id: partyIdNum },
            { projection: { planner_data: 1 } }
        );

        if (!partyRow) {
            return NextResponse.json({ message: "Not found" }, { status: 404 });
        }

        return NextResponse.json({ groups: partyRow.planner_data || [] }, { status: 200 });
    } catch (e) {
        console.error("Planner Load Error:", e);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}

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

    let body: any;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
    }

    const { groups } = body;
    if (!groups || !Array.isArray(groups)) {
        return NextResponse.json({ message: "No groups data" }, { status: 400 });
    }

    try {
        const db = await getDb();
        const partiesCol = db.collection("parties");

        // 🔥 MongoDB는 배열 데이터를 planner_data 필드에 그대로 꽂아넣으면 됩니다.
        await partiesCol.updateOne(
            { id: partyIdNum },
            {
                $set: {
                    planner_data: groups,
                }
            }
        );

        return NextResponse.json({ ok: true }, { status: 200 });
    } catch (e) {
        console.error("Planner Save Error:", e);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}