import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { getDb } from "@/db/client";

export const runtime = "nodejs";

// ─────────────────────────────
// GET: 내 raid_task_state 조회
// ─────────────────────────────
export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const userId = (session.user as any).id as string;

    try {
        const db = await getDb();
        const raidTaskStateCol = db.collection<{
            user_id: string;
            state_json: string;
            updated_at?: string;
            created_at?: string;
        }>("raid_task_state");

        const row = await raidTaskStateCol.findOne(
            { user_id: userId },
            {
                projection: {
                    _id: 0,
                    state_json: 1,
                },
            }
        );

        if (!row?.state_json) {
            // 서버에 아직 아무것도 없을 때
            return new NextResponse(null, { status: 204 });
        }

        try {
            const state = JSON.parse(row.state_json);
            return NextResponse.json(state);
        } catch {
            // 혹시 파싱 실패하면 그냥 초기화해버리기
            return new NextResponse(null, { status: 204 });
        }
    } catch (e) {
        console.error("raid_task_state select failed", e);
        return new NextResponse("DB error", { status: 500 });
    }
}

// ─────────────────────────────
// POST: raid_task_state 병합 저장
// ─────────────────────────────
export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const userId = (session.user as any).id as string;

    let body: any;
    try {
        body = await req.json();
    } catch {
        return new NextResponse("Invalid JSON", { status: 400 });
    }

    // 🔹 deleteAccountId는 patch에서 분리해서 따로 처리
    const { deleteAccountId, ...patch } = body ?? {};

    try {
        const db = await getDb();
        const raidTaskStateCol = db.collection<{
            user_id: string;
            state_json: string;
            updated_at?: string;
            created_at?: string;
        }>("raid_task_state");

        // 1) 기존 state_json 읽기
        const row = await raidTaskStateCol.findOne(
            { user_id: userId },
            {
                projection: {
                    _id: 0,
                    state_json: 1,
                },
            }
        );

        let prev: any = {};
        if (row?.state_json) {
            try {
                prev = JSON.parse(row.state_json);
            } catch {
                prev = {};
            }
        }

        // 2) 기본 병합 (shallow)
        let next: any = {
            ...prev,
            ...patch,
        };

        // 3) deleteAccountId가 있으면, 그 계정 관련 데이터 정리
        if (deleteAccountId) {
            try {
                const prevAccounts: any[] = Array.isArray(prev.accounts)
                    ? prev.accounts
                    : [];

                const deletedAcc = prevAccounts.find(
                    (a) => a && a.id === deleteAccountId
                );

                // 이 계정이 가지고 있던 캐릭터 이름들
                const namesToRemove = new Set<string>(
                    (deletedAcc?.summary?.roster ?? [])
                        .map((c: any) => c?.name)
                        .filter((n: any): n is string => typeof n === "string")
                );

                if (namesToRemove.size > 0) {
                    // 🔹 prefsByChar 정리 (기존 코드)
                    if (prev.prefsByChar && typeof prev.prefsByChar === "object") {
                        const cleanedPrefs: Record<string, any> = {};
                        for (const [charName, value] of Object.entries(prev.prefsByChar)) {
                            if (!namesToRemove.has(charName)) {
                                cleanedPrefs[charName] = value;
                            }
                        }
                        next.prefsByChar = cleanedPrefs;
                    }

                    // 🔹 visibleByChar 정리 (기존 코드)
                    if (prev.visibleByChar && typeof prev.visibleByChar === "object") {
                        const cleanedVisible: Record<string, any> = {};
                        for (const [charName, value] of Object.entries(prev.visibleByChar)) {
                            if (!namesToRemove.has(charName)) {
                                cleanedVisible[charName] = value;
                            }
                        }
                        next.visibleByChar = cleanedVisible;
                    }

                    // 🔥 [여기서부터 추가!] 🔹 goldDesignatedByChar 정리
                    if (prev.goldDesignatedByChar && typeof prev.goldDesignatedByChar === "object") {
                        const cleanedGold: Record<string, any> = {};
                        for (const [charName, value] of Object.entries(prev.goldDesignatedByChar)) {
                            if (!namesToRemove.has(charName)) {
                                cleanedGold[charName] = value;
                            }
                        }
                        next.goldDesignatedByChar = cleanedGold;
                    }

                    // 🔥 [여기서부터 추가!] 🔹 powerLockedByChar 정리
                    if (prev.powerLockedByChar && typeof prev.powerLockedByChar === "object") {
                        const cleanedLocked: Record<string, any> = {};
                        for (const [charName, value] of Object.entries(prev.powerLockedByChar)) {
                            if (!namesToRemove.has(charName)) {
                                cleanedLocked[charName] = value;
                            }
                        }
                        next.powerLockedByChar = cleanedLocked;
                    }
                }

                // 🔹 계정 목록 기반으로 nickname / summary / activeAccountId 재정리
                const nextAccounts: any[] = Array.isArray(next.accounts)
                    ? next.accounts
                    : [];

                if (nextAccounts.length === 0) {
                    // 더 이상 계정이 없으면 루트 필드도 비워줌
                    delete next.nickname;
                    delete next.summary;
                    next.activeAccountId = null;
                } else {
                    const activeId =
                        next.activeAccountId ||
                        nextAccounts.find((a) => a.isPrimary)?.id ||
                        nextAccounts[0]?.id;

                    const activeAcc = nextAccounts.find((a) => a.id === activeId);

                    if (activeAcc) {
                        next.activeAccountId = activeId;
                        if (activeAcc.nickname) {
                            next.nickname = activeAcc.nickname;
                        }
                        if (activeAcc.summary) {
                            next.summary = activeAcc.summary;
                        }
                    }
                }
            } catch (e) {
                console.error("raid_task_state deleteAccountId merge failed", e);
            }
        }

        const finalAccounts = Array.isArray(next.accounts) ? next.accounts : [];
        if (finalAccounts.length === 0) {
            await raidTaskStateCol.deleteOne({ user_id: userId });
            return NextResponse.json({ ok: true, status: "deleted" });
        } else {
            const stateJson = JSON.stringify(next);
            const now = new Date().toISOString();

            await raidTaskStateCol.updateOne(
                { user_id: userId },
                {
                    $set: {
                        user_id: userId,
                        state_json: stateJson,
                        updated_at: now,
                    },
                    $setOnInsert: {
                        created_at: now,
                    },
                },
                { upsert: true }
            );
            return NextResponse.json({ ok: true, status: "updated" });
        }

    } catch (e) {
        console.error("raid_task_state insert/update failed", e);
        return new NextResponse("DB error", { status: 500 });
    }
}