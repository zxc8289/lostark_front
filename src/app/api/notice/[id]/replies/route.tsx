import { NextResponse } from "next/server";
import { getDb } from "@/db/client";
import { ObjectId } from "mongodb";
import { getReplyActor } from "@/server/reply-permissions";
import { createGuestReplyKey } from "@/server/reply-authorization";
import { createAdminAlerts } from "@/server/admin-alerts";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: noticeId } = await params;
        const { content, isAnonymous, parentId } = await req.json();

        if (typeof content !== "string" || !content.trim() || content.trim().length > 5000) {
            return NextResponse.json({ ok: false, error: "댓글 내용이 없습니다." }, { status: 400 });
        }
        if (!ObjectId.isValid(noticeId) || (parentId && !ObjectId.isValid(parentId))) {
            return NextResponse.json({ ok: false, error: "잘못된 ID 형식입니다." }, { status: 400 });
        }

        const actor = await getReplyActor();
        const isStaff = actor.isAdmin;

        const db = await getDb();
        const notice = await db.collection("notices").findOne({ _id: new ObjectId(noticeId) }, { projection: { title: 1 } });
        if (!notice) return NextResponse.json({ ok: false, error: "공지사항을 찾을 수 없습니다." }, { status: 404 });
        if (parentId) {
            const parent = await db.collection("replies").findOne({ _id: new ObjectId(parentId), postId: noticeId, isDeleted: { $ne: true } }, { projection: { parentId: 1 } });
            if (!parent || parent.parentId) return NextResponse.json({ ok: false, error: "잘못된 답글 대상입니다." }, { status: 400 });
        }

        const guestReplyKey = !actor.userId && !isStaff ? createGuestReplyKey() : null;

        const newReply = {
            postId: noticeId, // 문의 게시판과 통합하기 위해 postId 필드에 noticeId 저장
            content: content.trim(),
            parentId: parentId || null,
            author: isStaff ? "로아체크 관리자" : (isAnonymous ? "익명" : (actor.name || "사용자")),
            authorImage: isStaff || isAnonymous ? null : actor.image,
            authorId: actor.userId,
            editKeyHash: guestReplyKey?.hash || null,
            isStaff,
            createdAt: new Date().toISOString(),
        };

        const result = await db.collection("replies").insertOne(newReply);
        if (!isStaff) {
            await createAdminAlerts(db, {
                type: "notice_comment",
                sourceId: result.insertedId.toString(),
                postId: noticeId,
                postTitle: String(notice.title || "공지사항"),
            });
        }

        return NextResponse.json({ ok: true, id: result.insertedId.toString(), guestReplyKey: guestReplyKey?.key || null });
    } catch (error) {
        console.error("[Notice Reply POST] Error:", error);
        return NextResponse.json({ ok: false, error: "댓글 등록에 실패했습니다." }, { status: 500 });
    }
}
