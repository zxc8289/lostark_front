export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getDb } from "@/db/client";
import { ObjectId } from "mongodb";
import { getReplyActor } from "@/server/reply-permissions";
import { createGuestReplyKey } from "@/server/reply-authorization";
import { createAdminAlerts } from "@/server/admin-alerts";

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

    const actor = await getReplyActor();
    const isStaffUser = actor.isAdmin;
    const isAnonymous = body.isAnonymous === true;
    if (body.parentId && !ObjectId.isValid(body.parentId)) {
        return NextResponse.json({ ok: false, error: "invalid parent id" }, { status: 400 });
    }
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
        finalAuthor = actor.name || "사용자";
        finalImage = actor.image;
    }

    const db = await getDb();
    const post = await db.collection("support_posts").findOne({ _id: postId }, { projection: { title: 1 } });
    if (!post) return NextResponse.json({ ok: false, error: "post not found" }, { status: 404 });
    if (parentId) {
        const parent = await db.collection("support_replies").findOne({ _id: parentId, postId, isDeleted: { $ne: true } }, { projection: { parentId: 1 } });
        if (!parent || parent.parentId) return NextResponse.json({ ok: false, error: "invalid parent reply" }, { status: 400 });
    }

    const guestReplyKey = !actor.userId && !isStaffUser ? createGuestReplyKey() : null;
    const now = new Date();

    const result = await db.collection("support_replies").insertOne({
        postId,
        parentId,
        content,
        author: finalAuthor,
        authorImage: finalImage, // 디스코드 프사 URL 저장
        authorId: actor.userId,
        editKeyHash: guestReplyKey?.hash || null,
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
        await createAdminAlerts(db, {
            type: "support_comment",
            sourceId: result.insertedId.toString(),
            postId: id,
            postTitle: String(post.title || "문의글"),
        });
    }

    return NextResponse.json({ ok: true, id: result.insertedId.toString(), guestReplyKey: guestReplyKey?.key || null });
}
