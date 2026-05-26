import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getToken } from "next-auth/jwt";
import { getDb } from "@/db/client";
import {
    calculateAllGeneralTasks,
    LocalGeneralStorage,
    GeneralTasksData,
} from "@/app/lib/tasks/general-task-utils";

export const runtime = "nodejs";

function normalizeLastUpdated(value: unknown): number {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }

    if (typeof value === "string") {
        const parsed = new Date(value).getTime();
        if (Number.isFinite(parsed)) {
            return parsed;
        }
    }

    if (value instanceof Date) {
        const parsed = value.getTime();
        if (Number.isFinite(parsed)) {
            return parsed;
        }
    }

    return Date.now();
}

async function getAuthUserId(req: NextRequest): Promise<string | null> {
    const session = await getServerSession();

    const sessionUserId =
        (session?.user as any)?.id ||
        (session?.user as any)?.userId;

    if (typeof sessionUserId === "string" && sessionUserId.trim()) {
        return sessionUserId;
    }

    const token = await getToken({
        req,
        secret: process.env.NEXTAUTH_SECRET,
    });

    const tokenUserId =
        (token as any)?.id ||
        (token as any)?.userId ||
        token?.sub;

    if (typeof tokenUserId === "string" && tokenUserId.trim()) {
        return tokenUserId;
    }

    console.error("Missing userId in general-tasks auth:", {
        session,
        token,
    });

    return null;
}

export async function GET(req: NextRequest) {
    const userId = await getAuthUserId(req);

    if (!userId) {
        return NextResponse.json(
            { error: "Unauthorized or missing userId" },
            { status: 401 }
        );
    }

    try {
        const db = await getDb();
        const collection = db.collection("general_task_state");

        const data = await collection.findOne({ userId });

        if (!data) {
            const emptyData: LocalGeneralStorage = {
                tasks: {},
                lastUpdated: Date.now(),
            };

            return NextResponse.json(emptyData);
        }

        const savedData: LocalGeneralStorage = {
            tasks: (data.tasks || {}) as GeneralTasksData,
            lastUpdated: normalizeLastUpdated(data.lastUpdated),
        };

        const calculated = calculateAllGeneralTasks(savedData);

        if (calculated.lastUpdated !== savedData.lastUpdated) {
            await collection.updateOne(
                { userId },
                {
                    $set: {
                        userId,
                        tasks: calculated.tasks,
                        lastUpdated: calculated.lastUpdated,
                    },
                },
                { upsert: true }
            );
        }

        return NextResponse.json(calculated);
    } catch (error) {
        console.error("General tasks GET error:", error);

        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    const userId = await getAuthUserId(req);

    if (!userId) {
        return NextResponse.json(
            { error: "Unauthorized or missing userId" },
            { status: 401 }
        );
    }

    try {
        const body = await req.json();
        const tasks = (body?.tasks || {}) as GeneralTasksData;
        const now = Date.now();

        const db = await getDb();
        const collection = db.collection("general_task_state");

        await collection.updateOne(
            { userId },
            {
                $set: {
                    userId,
                    tasks,
                    lastUpdated: now,
                },
            },
            { upsert: true }
        );

        return NextResponse.json({
            success: true,
            userId,
            tasks,
            lastUpdated: now,
        });
    } catch (error) {
        console.error("General tasks POST error:", error);

        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}