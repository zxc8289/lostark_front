import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getDb } from "@/db/client";
import { isSupportAdminForDiscordId } from "@/server/support-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id;
    if (!(await isSupportAdminForDiscordId(userId))) {
        return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const db = await getDb();
    const rows = await db.collection("admin_alerts")
        .find({ recipientId: userId, readAt: null })
        .sort({ createdAt: -1 })
        .limit(50)
        .toArray();
    const alerts = rows.map((row) => ({
        id: String(row._id),
        type: row.type,
        postId: row.postId,
        postTitle: row.postTitle,
        createdAt: row.createdAt,
    }));
    return NextResponse.json({ ok: true, alerts }, { headers: { "Cache-Control": "no-store" } });
}
