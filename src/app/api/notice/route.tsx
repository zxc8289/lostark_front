import { NextResponse } from "next/server";
import { getDb } from "@/db/client";

const SERVER_ADMIN_SECRET = process.env.SUPPORT_ADMIN_SECRET || "default_secret_key";

export async function GET() {
    try {
        const db = await getDb();

        // 생성일 기준 내림차순(최신순) 정렬하여 가져오기
        const notices = await db.collection("notices")
            .find({})
            .sort({ createdAt: -1 })
            .toArray();

        // 프론트엔드 인터페이스에 맞게 _id를 id로 변환
        const formattedNotices = notices.map((n) => ({
            id: n._id.toString(),
            title: n.title,
            content: n.content,
            category: n.category,
            createdAt: n.createdAt,
            updatedAt: n.updatedAt,
        }));

        return NextResponse.json({ ok: true, notices: formattedNotices });
    } catch (error) {
        console.error("[Notice GET] Error:", error);
        return NextResponse.json({ ok: false, error: "서버 오류가 발생했습니다." }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const adminKey = req.headers.get("x-admin-secret");
        if (adminKey !== SERVER_ADMIN_SECRET) {
            return NextResponse.json({ ok: false, error: "권한이 없습니다." }, { status: 401 });
        }

        const body = await req.json();
        const { title, content, category } = body;

        if (!title || !content) {
            return NextResponse.json({ ok: false, error: "제목과 내용은 필수입니다." }, { status: 400 });
        }

        const db = await getDb();

        const now = new Date().toISOString();
        const newNotice = {
            title,
            content,
            category: category || "공지",
            createdAt: now,
            updatedAt: now,
        };

        const result = await db.collection("notices").insertOne(newNotice);

        return NextResponse.json({ ok: true, id: result.insertedId.toString() });
    } catch (error) {
        console.error("[Notice POST] Error:", error);
        return NextResponse.json({ ok: false, error: "생성 중 오류가 발생했습니다." }, { status: 500 });
    }
}