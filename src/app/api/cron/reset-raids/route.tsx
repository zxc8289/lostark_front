import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db/client";

// Vercel 서버리스 함수 실행 시간 연장 (Hobby 요금제 최대 60초, Pro 요금제 300초)
export const maxDuration = 60;
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
    // 1. 보안 체크 (Vercel Cron Secret)
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // 프로덕션(배포) 환경일 때만 권한 검사 (로컬 테스트 편의를 위해)
    if (
        process.env.NODE_ENV === "production" &&
        authHeader !== `Bearer ${cronSecret}`
    ) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const db = await getDb();
        const raidTaskStateCol = db.collection("raid_task_state");

        // 2. Cursor를 이용해 DB 데이터를 메모리에 조금씩 스트리밍 (1만명 대비 OOM 방지)
        const cursor = raidTaskStateCol.find({});

        const BATCH_SIZE = 1000; // 1000명씩 모아서 DB에 전송
        let bulkOperations = [];
        let totalProcessed = 0;
        const now = new Date().toISOString();

        // 3. 순회하면서 관문(gates) 데이터만 비우기
        for await (const row of cursor) {
            try {
                // DB에서 가져온 문자열을 JSON 객체로 변환
                const state = JSON.parse(row.state_json);
                let isModified = false;

                // 보여주신 구조: state.prefsByChar["다미"].raids["종막-카제로스"].gates
                if (state.prefsByChar) {
                    for (const charName in state.prefsByChar) {
                        const charData = state.prefsByChar[charName];

                        if (charData && charData.raids) {
                            for (const raidName in charData.raids) {
                                const raidPref = charData.raids[raidName];

                                // 배열에 뭔가 들어있을 때만(체크한 관문이 있을 때만) 빈 배열로 덮어씌움
                                if (raidPref && Array.isArray(raidPref.gates) && raidPref.gates.length > 0) {
                                    raidPref.gates = [];
                                    isModified = true; // 변경 사항이 있음을 기록
                                }
                            }
                        }
                    }
                }

                // 🔥 최적화: 변경된 내역이 있는 유저만 DB 업데이트 리스트에 추가 (이미 다 비워져 있는 유저는 스킵)
                if (isModified) {
                    bulkOperations.push({
                        updateOne: {
                            filter: { user_id: row.user_id },
                            update: {
                                $set: {
                                    state_json: JSON.stringify(state), // 다시 문자열로 압축
                                    updated_at: now,
                                }
                            }
                        }
                    });
                }

                // 4. 배열에 BATCH_SIZE(1000)개가 차면 DB에 전송 후 메모리 비우기
                if (bulkOperations.length >= BATCH_SIZE) {
                    await raidTaskStateCol.bulkWrite(bulkOperations);
                    totalProcessed += bulkOperations.length;
                    bulkOperations = [];
                }
            } catch (err) {
                console.error(`User ${row.user_id} 파싱 에러 (스킵됨):`, err);
            }
        }

        // 5. 반복문이 끝나고 남은 자투리 데이터 마저 전송
        if (bulkOperations.length > 0) {
            await raidTaskStateCol.bulkWrite(bulkOperations);
            totalProcessed += bulkOperations.length;
        }

        return NextResponse.json({
            ok: true,
            message: `성공적으로 ${totalProcessed}명의 레이드 관문을 초기화했습니다.`
        });

    } catch (error) {
        console.error("Cron Job Error:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}