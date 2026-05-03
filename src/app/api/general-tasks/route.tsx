import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getDb } from "@/db/client"; // 🔥 에러가 나던 부분을 삭제하고 이걸로 교체했습니다!
import { calculateAllGeneralTasks, LocalGeneralStorage } from "@/app/lib/tasks/general-task-utils";

// Mongo driver 사용을 위해 nodejs 런타임 필수
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
    const session = await getServerSession();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id || (session.user as any).userId;

    try {
        const db = await getDb();
        const collection = db.collection("general_task_state");

        let data = await collection.findOne({ userId });

        if (!data) {
            return NextResponse.json({ tasks: {}, lastUpdated: Date.now() });
        }

        const calculated = calculateAllGeneralTasks(data as any as LocalGeneralStorage);

        if (calculated.lastUpdated !== data.lastUpdated) {
            await collection.updateOne(
                { userId },
                { $set: { tasks: calculated.tasks, lastUpdated: calculated.lastUpdated } }
            );
        }

        return NextResponse.json(calculated);
    } catch (error) {
        console.error("General tasks GET error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const session = await getServerSession();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id || (session.user as any).userId;

    try {
        const { tasks } = await req.json();

        const db = await getDb();
        const collection = db.collection("general_task_state");

        await collection.updateOne(
            { userId },
            {
                $set: {
                    userId,
                    tasks,
                    lastUpdated: Date.now()
                }
            },
            { upsert: true }
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("General tasks POST error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}