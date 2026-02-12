import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getDb } from "@/db/client";

export async function PATCH(req: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
        }

        const body = await req.json();
        const { nickname } = body;

        // 1. 공백 제거
        const cleanNickname = nickname ? nickname.trim() : "";

        // 2. 유효성 검사 (빈 값)
        if (!cleanNickname) {
            return NextResponse.json({ error: "닉네임을 입력해주세요." }, { status: 400 });
        }

        // 3. 유효성 검사 (길이 제한: 1자 이상 10자 이하)
        if (cleanNickname.length > 12) {
            return NextResponse.json({ error: "닉네임은 10자 이내여야 합니다." }, { status: 400 });
        }

        // 4. (선택사항) 특수문자 제한 정규식 (한글, 영문, 숫자, 밑줄, 하이픈만 허용)
        // 필요 없으면 이 부분은 지우셔도 됩니다.
        // if (!/^[가-힣a-zA-Z0-9_-]+$/.test(cleanNickname)) {
        //    return NextResponse.json({ error: "특수문자는 사용할 수 없습니다." }, { status: 400 });
        // }

        const db = await getDb();
        const usersCol = db.collection("users");
        const userId = (session.user as any).id;

        const result = await usersCol.updateOne(
            { id: userId },
            {
                $set: {
                    name: cleanNickname,
                    updatedAt: new Date()
                }
            }
        );

        if (result.matchedCount === 0) {
            return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
        }

        return NextResponse.json({ success: true, name: cleanNickname });

    } catch (error) {
        console.error("닉네임 변경 중 오류:", error);
        return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
    }
}