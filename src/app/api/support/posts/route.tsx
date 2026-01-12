export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getDb } from "@/db/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import crypto from "crypto";

type PostStatus = "대기중" | "확인" | "답변완료";

const GUEST_SALT = process.env.SUPPORT_GUEST_SALT || "dev-guest-salt";

function makeGuestKey() {
    return crypto.randomBytes(24).toString("hex"); // 48 chars
}
function hashGuestKey(key: string) {
    return crypto.createHash("sha256").update(`${GUEST_SALT}:${key}`).digest("hex");
}

function safePost(p: any) {
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
        isGuestPost: !!p.isGuest,
    };
}

export async function GET() {
    const db = await getDb();
    const rows = await db
        .collection("support_posts")
        .find({})
        .sort({ createdAt: -1 })
        .limit(100)
        .toArray();

    return NextResponse.json({ ok: true, posts: rows.map(safePost) });
}

export async function POST(req: Request) {
    const body = await req.json().catch(() => null);
    if (!body?.title || !body?.content) {
        return NextResponse.json({ ok: false, error: "title/content required" }, { status: 400 });
    }

    const title = String(body.title).trim().slice(0, 120);
    const content = String(body.content).trim().slice(0, 5000);
    const isAnonymous = !!body.isAnonymous;

    if (!title || !content) {
        return NextResponse.json({ ok: false, error: "empty title/content" }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id || null;
    const userName = session?.user?.name || null;
    const userImage = (session?.user as any)?.image || null;

    const isGuest = !userId;
    const guestKey = isGuest ? makeGuestKey() : null;
    const guestKeyHash = guestKey ? hashGuestKey(guestKey) : null;

    const authorName = isAnonymous ? "비공개 회원" : (userName ? String(userName).slice(0, 30) : "비회원");

    const now = new Date();
    const doc = {
        title,
        content,
        authorName,
        authorId: userId,          // 로그인 사용자만
        authorImage: userImage,
        isAnonymous,
        isGuest,
        guestKeyHash,              // 비회원만
        status: "대기중" as PostStatus,
        createdAt: now,
        updatedAt: now,
    };

    const db = await getDb();
    const result = await db.collection("support_posts").insertOne(doc);

    return NextResponse.json({
        ok: true,
        id: String(result.insertedId),
        guestKey, // 비회원이면 프론트에서 저장해서 수정/삭제에 사용
    });
}
