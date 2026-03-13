export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getDb } from "@/db/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET() {
    const session = await getServerSession(authOptions);
    // session.user.id가 없을 경우를 대비해 가공
    const userId = (session?.user as any)?.id;

    if (!userId) {
        return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });
    }

    try {
        const db = await getDb();

        // ✨ 핵심 수정: 이름(authorName)이 아니라 고유 ID(authorId)로 내 글을 찾습니다.
        const unreadPosts = await db.collection("support_posts").find({
            authorId: userId,
            hasUnreadAdminReply: true
        }).toArray();

        return NextResponse.json({ ok: true, alerts: unreadPosts });
    } catch (e) {
        return NextResponse.json({ ok: false, error: "DB 에러" }, { status: 500 });
    }
}