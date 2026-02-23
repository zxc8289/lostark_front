import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getDb } from "@/db/client";

export async function PATCH(req: Request) {
    try {
        const session = await getServerSession(authOptions);

        // 1. 로그인 체크
        if (!session || !session.user) {
            return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
        }

        const body = await req.json();
        const { canOthersEdit } = body;

        // 2. 유효성 검사 (boolean 타입인지 확인)
        if (typeof canOthersEdit !== "boolean") {
            return NextResponse.json({ error: "잘못된 데이터 형식입니다." }, { status: 400 });
        }

        const db = await getDb();
        const usersCol = db.collection("users");
        // session.user.id는 NextAuth 설정에 따라 문자열이므로 그대로 사용
        const userId = (session.user as any).id;

        // 3. DB 업데이트 ($set 사용)
        const result = await usersCol.updateOne(
            { id: userId },
            {
                $set: {
                    canOthersEdit: canOthersEdit,
                    updatedAt: new Date()
                }
            }
        );

        if (result.matchedCount === 0) {
            return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
        }

        return NextResponse.json({ success: true, canOthersEdit });

    } catch (error) {
        console.error("설정 저장 중 서버 오류:", error);
        return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
    }
}