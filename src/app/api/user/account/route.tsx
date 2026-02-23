import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getDb } from "@/db/client";

export async function DELETE() {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
        }

        const db = await getDb();
        const userId = (session.user as any).id;

        if (!userId) {
            return NextResponse.json({ error: "유저 식별자를 찾을 수 없습니다." }, { status: 400 });
        }

        // ──────────────────────────────────────────────────────────
        // 1. 사용자와 연관된 모든 컬렉션의 데이터 삭제
        // ──────────────────────────────────────────────────────────

        // 1-1. 숙제 상태 데이터 삭제 (raid_task_state 등 컬렉션 명칭 확인 필요)
        await db.collection("raid_task_state").deleteMany({ userId: userId });

        // 1-2. 파티 멤버 참여 정보 삭제
        await db.collection("party_members").deleteMany({ userId: userId });

        // 1-3. 유저가 생성한 파티 삭제 (선택 사항)
        // 만약 방장이 탈퇴할 때 파티도 삭제하고 싶다면 아래 주석을 해제하세요.
        // await db.collection("parties").deleteMany({ ownerId: userId });

        // 1-4. OAuth 계정 정보 및 세션 데이터 삭제 (NextAuth 관련)
        await db.collection("accounts").deleteMany({ userId: userId });
        await db.collection("sessions").deleteMany({ userId: userId });

        // 1-5. 최종적으로 유저 프로필 삭제
        const result = await db.collection("users").deleteOne({ id: userId });

        if (result.deletedCount === 0) {
            // id가 아닌 _id로 저장되어 있을 경우를 대비한 2차 시도 (필요 시)
            // await db.collection("users").deleteOne({ _id: new ObjectId(userId) });
            return NextResponse.json({ error: "사용자를 찾을 수 없거나 이미 삭제되었습니다." }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            message: "회원 탈퇴 및 모든 데이터 삭제가 완료되었습니다."
        });

    } catch (error) {
        console.error("회원 탈퇴 처리 중 오류:", error);
        return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
    }
}