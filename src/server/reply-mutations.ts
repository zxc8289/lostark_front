import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { getDb } from "@/db/client";
import { getReplyActor } from "@/server/reply-permissions";
import { canManageReply } from "@/server/reply-authorization";

type ReplyKind = "notice" | "support";
type ReplyIds = { postId: string; replyId: string };

async function getReplyContext(req: Request, ids: ReplyIds, kind: ReplyKind) {
    if (!ObjectId.isValid(ids.postId) || !ObjectId.isValid(ids.replyId)) {
        return { error: NextResponse.json({ ok: false, error: "invalid id" }, { status: 400 }) };
    }

    const db = await getDb();
    const postId = kind === "notice" ? ids.postId : new ObjectId(ids.postId);
    const replies = db.collection(kind === "notice" ? "replies" : "support_replies");
    const filter = { _id: new ObjectId(ids.replyId), postId };
    const reply = await replies.findOne(filter);
    if (!reply) return { error: NextResponse.json({ ok: false, error: "reply not found" }, { status: 404 }) };

    const actor = await getReplyActor();
    if (!canManageReply(reply, actor, req.headers.get("x-reply-key"))) {
        return { error: NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }) };
    }

    return { db, postId, replies, filter, reply };
}

export async function updateReply(req: Request, ids: ReplyIds, kind: ReplyKind) {
    const context = await getReplyContext(req, ids, kind);
    if (context.error) return context.error;
    const { db, replies, filter } = context;
    if (!db || !replies || !filter) throw new Error("Missing reply context");

    const body = await req.json().catch(() => null);
    const content = typeof body?.content === "string" ? body.content.trim() : "";
    if (!content || content.length > 5000) {
        return NextResponse.json({ ok: false, error: "content must be 1-5000 characters" }, { status: 400 });
    }

    const now = new Date();
    await replies.updateOne(filter, { $set: { content, updatedAt: kind === "notice" ? now.toISOString() : now } });
    if (kind === "support") {
        await db.collection("support_posts").updateOne({ _id: new ObjectId(ids.postId) }, { $set: { updatedAt: now } });
    }
    return NextResponse.json({ ok: true });
}

export async function deleteReply(req: Request, ids: ReplyIds, kind: ReplyKind) {
    const context = await getReplyContext(req, ids, kind);
    if (context.error) return context.error;
    const { db, postId, replies, filter, reply } = context;
    if (!db || !replies || !filter || !reply) throw new Error("Missing reply context");

    const childParentId = kind === "notice" ? ids.replyId : new ObjectId(ids.replyId);
    const hasChildren = await replies.findOne({ postId, parentId: childParentId }, { projection: { _id: 1 } });
    if (hasChildren) {
        await replies.updateOne(filter, {
            $set: {
                content: "",
                author: "삭제된 댓글",
                authorImage: null,
                authorId: null,
                editKeyHash: null,
                isStaff: false,
                isDeleted: true,
                updatedAt: kind === "notice" ? new Date().toISOString() : new Date(),
            },
        });
    } else {
        await replies.deleteOne(filter);
    }

    if (kind === "support") {
        const now = new Date();
        if (reply.isStaff) {
            const hasStaffReply = await replies.findOne({ postId, isStaff: true, isDeleted: { $ne: true } }, { projection: { _id: 1 } });
            await db.collection("support_posts").updateOne(
                { _id: new ObjectId(ids.postId) },
                {
                    $set: hasStaffReply
                        ? { status: "답변완료", updatedAt: now }
                        : { status: "확인", hasUnreadAdminReply: false, updatedAt: now },
                }
            );
        } else {
            await db.collection("support_posts").updateOne({ _id: new ObjectId(ids.postId) }, { $set: { updatedAt: now } });
        }
    }

    return NextResponse.json({ ok: true });
}
