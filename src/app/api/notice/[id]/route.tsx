import { NextResponse } from "next/server";
import { getDb } from "@/db/client";
import { ObjectId } from "mongodb";

const SERVER_ADMIN_SECRET = process.env.SUPPORT_ADMIN_SECRET || "default_secret_key";

export async function GET(req: Request, { params }: { params: { id: string } }) {
    try {
        const { id } = params;

        // 유효한 ObjectId 형식인지 검사
        if (!ObjectId.isValid(id)) {
            return NextResponse.json({ ok: false, error: "잘못된 ID 형식입니다." }, { status: 400 });
        }

        const db = await getDb();
        const notice = await db.collection("notices").findOne({ _id: new ObjectId(id) });

        if (!notice) {
            return NextResponse.json({ ok: false, error: "공지사항을 찾을 수 없습니다." }, { status: 404 });
        }

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
        });
    } catch (error) {
        console.error("[Notice Detail GET] Error:", error);
        return NextResponse.json({ ok: false, error: "서버 오류가 발생했습니다." }, { status: 500 });
    }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
    try {
        const adminKey = req.headers.get("x-admin-secret");
        if (adminKey !== SERVER_ADMIN_SECRET) {
            return NextResponse.json({ ok: false, error: "권한이 없습니다." }, { status: 401 });
        }

        const { id } = params;
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

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
    try {
        const adminKey = req.headers.get("x-admin-secret");
        if (adminKey !== SERVER_ADMIN_SECRET) {
            return NextResponse.json({ ok: false, error: "권한이 없습니다." }, { status: 401 });
        }

        const { id } = params;
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