import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getDb } from "@/db/client";
import { isSupportAdminForDiscordId } from "@/server/support-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
        return NextResponse.json({ ok: false, error: "invalid id" }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id;
    if (!(await isSupportAdminForDiscordId(userId))) {
        return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const db = await getDb();
    const result = await db.collection("admin_alerts").updateOne(
        { _id: new ObjectId(id), recipientId: userId, readAt: null },
        { $set: { readAt: new Date() } }
    );
    return NextResponse.json({ ok: result.matchedCount === 1 }, { status: result.matchedCount === 1 ? 200 : 404 });
}
