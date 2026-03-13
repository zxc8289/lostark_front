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

    // ✅ 관리자 여부 및 프론트에서 보낸 정보 받기
    const isStaffUser = isAdmin(req);
    const isAnonymous = body.isAnonymous === true;
    const parentId = body.parentId ? new ObjectId(body.parentId) : null;

    let finalAuthor = "익명 사용자";
    let finalImage = null;

    // ✅ 우선순위에 따라 작성자 정보 결정
    if (isStaffUser) {
        finalAuthor = "관리자";
        // 관리자는 프사가 필요 없거나 고정 아이콘을 쓰므로 null
    } else if (isAnonymous) {
        finalAuthor = "비공개 회원";
        // 비공개 회원이므로 프사 숨김
    } else {
        // 둘 다 아니면 디스코드 세션 정보(닉네임, 프사) 적용
        finalAuthor = body.author || "사용자";
        finalImage = body.authorImage || null;
    }

    const db = await getDb();
    const now = new Date();

    await db.collection("support_replies").insertOne({
        postId,
        parentId,
        content,
        author: finalAuthor,
        authorImage: finalImage, // 디스코드 프사 URL 저장
        isStaff: isStaffUser,
        createdAt: now,
    });

    // (기존 코드에서) 관리자가 답변을 달았을 때 상태 변경하는 부분에 `hasUnreadAdminReply: true`를 추가합니다!
    if (isStaffUser) {
        await db.collection("support_posts").updateOne(
            { _id: postId },
            { $set: { status: "답변완료", updatedAt: now, hasUnreadAdminReply: true } }
        );
    } else {
        await db.collection("support_posts").updateOne(
            { _id: postId },
            { $set: { updatedAt: now } }
        );
    }

    return NextResponse.json({ ok: true });
}