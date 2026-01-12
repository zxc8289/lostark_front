export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getDb } from "@/db/client";
import { ObjectId } from "mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import crypto from "crypto";

type PostStatus = "대기중" | "확인" | "답변완료";

const GUEST_SALT = process.env.SUPPORT_GUEST_SALT || "dev-guest-salt";

function toObjectId(id: string) {
    if (!ObjectId.isValid(id)) return null;
    return new ObjectId(id);
}
function hashGuestKey(key: string) {
    return crypto.createHash("sha256").update(`${GUEST_SALT}:${key}`).digest("hex");
}
function safePostWithPerm(p: any, canEdit: boolean) {
    const isAnon = !!p.isAnonymous;

    return {
        id: String(p._id),
        title: p.title,
        content: p.content,
        author: p.authorName,
        authorImage: isAnon ? null : (p.authorImage ?? null),
        isAnonymous: !!p.isAnonymous,
        status: (p.status as PostStatus) || "대기중",
        createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : null,
        updatedAt: p.updatedAt ? new Date(p.updatedAt).toISOString() : null,

        // 프론트 편의 필드
        isGuestPost: !!p.isGuest,
        canEdit,
        canDelete: canEdit,
    };
}

async function getPerm(req: Request, post: any) {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id || null;

    // 로그인 사용자 글 소유권
    if (userId && post?.authorId && String(post.authorId) === String(userId)) return true;

    // 비회원 글 소유권 (x-guest-key)
    if (post?.isGuest && post?.guestKeyHash) {
        const key = (req.headers.get("x-guest-key") || "").trim();
        if (!key) return false;
        const hashed = hashGuestKey(key);
        return hashed === post.guestKeyHash;
    }

    return false;
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const _id = toObjectId(id);
    if (!_id) return NextResponse.json({ ok: false, error: "invalid id" }, { status: 400 });

    const db = await getDb();
    const post = await db.collection("support_posts").findOne({ _id });
    if (!post) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });

    const repliesRows = await db
        .collection("support_replies")
        .find({ postId: _id })
        .sort({ createdAt: 1 })
        .toArray();

    const canEdit = await getPerm(req, post);

    const replies = repliesRows.map((r: any) => ({
        id: String(r._id),
        postId: String(r.postId),
        content: r.content,
        author: r.author || "관리자",
        isStaff: !!r.isStaff,
        createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : null,
    }));

    return NextResponse.json({ ok: true, post: safePostWithPerm(post, canEdit), replies });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const _id = toObjectId(id);
    if (!_id) {
        return NextResponse.json({ ok: false, error: "invalid id" }, { status: 400 });
    }

    const body = await req.json().catch(() => null);

    const title = body?.title != null ? String(body.title).trim().slice(0, 120) : null;
    const content = body?.content != null ? String(body.content).trim().slice(0, 5000) : null;
    const isAnonymous = body?.isAnonymous != null ? !!body.isAnonymous : null;

    if (title === null && content === null && isAnonymous === null) {
        return NextResponse.json({ ok: false, error: "nothing to update" }, { status: 400 });
    }

    const db = await getDb();
    const post = await db.collection("support_posts").findOne({ _id });
    if (!post) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });

    const canEdit = await getPerm(req, post);
    if (!canEdit) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });

    // 작성자명 규칙 유지 (익명 토글 시 갱신)
    let authorName = post.authorName;
    if (isAnonymous !== null) {
        if (isAnonymous) authorName = "비공개 회원";
        else authorName = post.isGuest ? "비회원" : (post.authorName === "비공개 회원" ? "회원" : post.authorName);
    }

    const $set: any = { updatedAt: new Date(), authorName };
    if (title !== null) $set.title = title;
    if (content !== null) $set.content = content;
    if (isAnonymous !== null) $set.isAnonymous = isAnonymous;

    await db.collection("support_posts").updateOne({ _id }, { $set });
    return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;          // ✅
    const _id = toObjectId(id);
    if (!_id) return NextResponse.json({ ok: false, error: "invalid id" }, { status: 400 });

    const db = await getDb();
    const post = await db.collection("support_posts").findOne({ _id });
    if (!post) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });

    const canDelete = await getPerm(req, post);
    if (!canDelete) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });

    await db.collection("support_posts").deleteOne({ _id });
    await db.collection("support_replies").deleteMany({ postId: _id });

    return NextResponse.json({ ok: true });
}
