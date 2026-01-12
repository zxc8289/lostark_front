export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getDb } from "@/db/client";
import { ObjectId } from "mongodb";

function isAdmin(req: Request) {
    const secret = req.headers.get("x-admin-secret") || "";
    return !!process.env.SUPPORT_ADMIN_SECRET && secret === process.env.SUPPORT_ADMIN_SECRET;
}

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> } 
) {
    const { id } = await params;                    

    if (!isAdmin(req)) {
        return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    if (!body?.content) {
        return NextResponse.json({ ok: false, error: "content required" }, { status: 400 });
    }

    if (!ObjectId.isValid(id)) {            
        return NextResponse.json({ ok: false, error: "invalid id" }, { status: 400 });
    }

    const postId = new ObjectId(id);
    const content = String(body.content).trim().slice(0, 5000);
    if (!content) {
        return NextResponse.json({ ok: false, error: "empty content" }, { status: 400 });
    }

    const db = await getDb();
    const now = new Date();

    await db.collection("support_replies").insertOne({
        postId,
        content,
        author: "관리자",
        isStaff: true,
        createdAt: now,
    });

    await db.collection("support_posts").updateOne(
        { _id: postId },
        { $set: { status: "답변완료", updatedAt: now } }
    );

    return NextResponse.json({ ok: true });
}
