import { NextResponse } from "next/server";
import { getDb } from "@/db/client";

const SERVER_ADMIN_SECRET = process.env.SUPPORT_ADMIN_SECRET || "default_secret_key";

export async function POST(req: Request, { params }: { params: { id: string } }) {
    try {
        const { id: noticeId } = params;
        const { content, isAnonymous, author, authorImage, parentId } = await req.json();

        if (!content || !content.trim()) {
            return NextResponse.json({ ok: false, error: "댓글 내용이 없습니다." }, { status: 400 });
        }

        // 관리자 여부 확인
        const adminKey = req.headers.get("x-admin-secret");
        const isStaff = adminKey === SERVER_ADMIN_SECRET;

        const db = await getDb();

        const newReply = {
            postId: noticeId, // 문의 게시판과 통합하기 위해 postId 필드에 noticeId 저장
            content,
            parentId: parentId || null,
            author: isStaff ? "로아체크 관리자" : (isAnonymous ? "익명" : author),
            authorImage: isStaff ? null : (isAnonymous ? null : authorImage),
            isStaff,
            createdAt: new Date().toISOString(),
        };

        const result = await db.collection("replies").insertOne(newReply);

        return NextResponse.json({ ok: true, id: result.insertedId.toString() });
    } catch (error) {
        console.error("[Notice Reply POST] Error:", error);
        return NextResponse.json({ ok: false, error: "댓글 등록에 실패했습니다." }, { status: 500 });
    }
}