import { NextResponse } from "next/server";
import { getDb } from "@/db/client";
import { ObjectId } from "mongodb";

const SERVER_ADMIN_SECRET = process.env.SUPPORT_ADMIN_SECRET || "default_secret_key";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;

        if (!ObjectId.isValid(id)) {
            return NextResponse.json({ ok: false, error: "잘못된 ID 형식입니다." }, { status: 400 });
        }
        const db = await getDb();

        const notice = await db.collection("notices").findOne({ _id: new ObjectId(id) });

        if (!notice) {
            return NextResponse.json({ ok: false, error: "공지사항을 찾을 수 없습니다." }, { status: 404 });
        }

        // 2. 해당 공지사항의 댓글(Replies) 가져오기 
        // (postId 필드에 공지사항 id가 저장된다고 가정합니다)
        const repliesDocs = await db.collection("replies").find({ postId: id }).sort({ createdAt: 1 }).toArray();

        const replies = repliesDocs.map(r => ({
            id: r._id.toString(),
            postId: r.postId,
            content: r.content,
            parentId: r.parentId || null,
            author: r.author,
            authorImage: r.authorImage,
            isStaff: r.isStaff || false,
            createdAt: r.createdAt,
        }));

        return NextResponse.json({
            ok: true,
            notice: {
                id: notice._id.toString(),
                title: notice.title,
                content: notice.content,
                category: notice.category,
                createdAt: notice.createdAt,
                updatedAt: notice.updatedAt,
            },
            replies, // 💡 프론트엔드로 댓글 데이터 함께 반환
        });
    } catch (error) {
        console.error("[Notice Detail GET] Error:", error);
        return NextResponse.json({ ok: false, error: "서버 오류가 발생했습니다." }, { status: 500 });
    }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const adminKey = req.headers.get("x-admin-secret");
        if (adminKey !== SERVER_ADMIN_SECRET) {
            return NextResponse.json({ ok: false, error: "권한이 없습니다." }, { status: 401 });
        }

        const { id } = await params;

        if (!ObjectId.isValid(id)) {
            return NextResponse.json({ ok: false, error: "잘못된 ID 형식입니다." }, { status: 400 });
        }

        const { title, content, category } = await req.json();
        const db = await getDb();

        const result = await db.collection("notices").updateOne(
            { _id: new ObjectId(id) },
            {
                $set: {
                    title,
                    content,
                    category,
                    updatedAt: new Date().toISOString()
                }
            }
        );

        if (result.matchedCount === 0) {
            return NextResponse.json({ ok: false, error: "수정할 공지사항이 없습니다." }, { status: 404 });
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("[Notice PATCH] Error:", error);
        return NextResponse.json({ ok: false, error: "수정 중 오류가 발생했습니다." }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const adminKey = req.headers.get("x-admin-secret");
        if (adminKey !== SERVER_ADMIN_SECRET) {
            return NextResponse.json({ ok: false, error: "권한이 없습니다." }, { status: 401 });
        }

        const { id } = await params;

        if (!ObjectId.isValid(id)) {
            return NextResponse.json({ ok: false, error: "잘못된 ID 형식입니다." }, { status: 400 });
        }

        const db = await getDb();
        const result = await db.collection("notices").deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount === 0) {
            return NextResponse.json({ ok: false, error: "삭제할 공지사항이 없습니다." }, { status: 404 });
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("[Notice DELETE] Error:", error);
        return NextResponse.json({ ok: false, error: "삭제 중 오류가 발생했습니다." }, { status: 500 });
    }
}