import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    try {
        const rawKeys = process.env.LOSTARK_OPENAPI_JWT || "";
        if (!rawKeys) return NextResponse.json({ error: "API Key missing" }, { status: 500 });

        const API_KEYS = rawKeys.split(",").map((k) => k.trim()).filter((k) => k);
        const randomKey = API_KEYS[Math.floor(Math.random() * API_KEYS.length)];

        const { searchParams } = new URL(request.url);
        const dateParam = searchParams.get("date");

        let targetDateStr = "";
        if (dateParam) {
            targetDateStr = dateParam;
        } else {
            const now = new Date();
            const utc = now.getTime() + now.getTimezoneOffset() * 60000;
            const kstObj = new Date(utc + 9 * 60 * 60 * 1000);
            targetDateStr = kstObj.toISOString().split("T")[0];
        }

        const res = await fetch("https://developer-lostark.game.onstove.com/gamecontents/calendar", {
            headers: {
                accept: "application/json",
                authorization: `bearer ${randomKey}`,
            },
            next: { revalidate: 3600 },
        });

        if (!res.ok) return NextResponse.json({ error: "Failed" }, { status: res.status });

        const data = await res.json();

        const islandsMap = new Map();
        let hasFieldBoss = false;
        let hasChaosGate = false;

        let bossImage = null;
        let gateImage = null;
        let bossTimes: string[] = [];
        let gateTimes: string[] = [];

        // 🟢 [추가] 시간을 보정해주는 헬퍼 함수 (50분 -> 다음 시간 00분)
        const formatTimeRoundUp = (timeStr: string) => {
            // timeStr 예시: "2024-02-15T10:50:00"
            const timePart = timeStr.split("T")[1].substring(0, 5); // "10:50"
            let [hh, mm] = timePart.split(":").map(Number);

            // 40분 이상이면 다음 시간 정각으로 올림 처리
            if (mm >= 40) {
                hh += 1;
                mm = 0;
            }

            // 24시는 00시로 표기 (선택사항, 보통 24시로 넘어가면 다음날이지만 당일 일정 표기용)
            if (hh === 24) hh = 0;

            return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
        };

        for (const content of data) {
            const targetTimes = content.StartTimes?.filter((time: string) => time.startsWith(targetDateStr));
            if (!targetTimes || targetTimes.length === 0) continue;

            // 🔥 [수정] 단순 파싱 대신 formatTimeRoundUp 함수 적용
            const timeStrs = targetTimes.map((t: string) => formatTimeRoundUp(t)).sort();

            if (content.CategoryName === "필드보스") {
                hasFieldBoss = true;
                bossTimes = timeStrs;
                if (!bossImage) bossImage = content.ContentsIcon;
            }
            else if (content.CategoryName === "카오스게이트") {
                hasChaosGate = true;
                gateTimes = timeStrs;
                if (!gateImage) gateImage = content.ContentsIcon;
            }
            else if (content.CategoryName === "모험 섬") {
                if (islandsMap.has(content.ContentsName)) continue;

                const rawItems = content.RewardItems?.flatMap((group: any) => group.Items) || [];
                const rewardItems = rawItems.map((item: any) => ({
                    name: item.Name,
                    icon: item.Icon,
                    grade: item.Grade,
                })).slice(0, 5);

                const isGoldIsland = rawItems.some((item: any) => item.Name.includes("골드"));

                islandsMap.set(content.ContentsName, {
                    name: content.ContentsName,
                    image: content.ContentsIcon,
                    times: timeStrs,
                    rewardItems: rewardItems,
                    isGoldIsland: isGoldIsland,
                });
            }
        }

        return NextResponse.json({
            targetDate: targetDateStr,
            islands: Array.from(islandsMap.values()),
            hasFieldBoss,
            hasChaosGate,
            bossTimes: [...new Set(bossTimes)].sort(),
            gateTimes: [...new Set(gateTimes)].sort(),
            bossImage,
            gateImage,
        }, { status: 200 });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}