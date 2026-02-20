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
        let targetDateObj: Date;

        if (dateParam) {
            targetDateStr = dateParam;
            targetDateObj = new Date(targetDateStr);
        } else {
            const now = new Date();
            const utc = now.getTime() + now.getTimezoneOffset() * 60000;
            // KST는 UTC+9
            const kstObj = new Date(utc + 9 * 60 * 60 * 1000);

            // 새벽 0~5시는 게임상 전날로 취급
            if (kstObj.getHours() < 6) {
                kstObj.setDate(kstObj.getDate() - 1);
            }
            targetDateStr = kstObj.toISOString().split("T")[0];
            targetDateObj = kstObj;
        }

        // 🔥 [핵심 1] 로아의 "하루" 기준 완벽 분리 (오전 6시 ~ 다음날 오전 5시 59분)
        const nextDateObj = new Date(targetDateObj);
        nextDateObj.setDate(nextDateObj.getDate() + 1);
        const nextDateStr = nextDateObj.toISOString().split("T")[0];

        const gameDayStart = `${targetDateStr}T06:00:00`;
        const gameDayEnd = `${nextDateStr}T05:59:59`;

        // 🔥 [핵심 2] 요일별 고정 스케줄 교차 검증용 플래그 (0:일, 1:월, 2:화, 3:수, 4:목, 5:금, 6:토)
        const dayOfWeek = targetDateObj.getDay();
        const expectedHasGate = [0, 1, 4, 6].includes(dayOfWeek); // 일, 월, 목, 토 카게
        const expectedHasBoss = [0, 2, 5].includes(dayOfWeek);    // 일, 화, 금 필보

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

        // 🔥 [핵심 3] 시간 보정 (23:50 -> 24:00으로 표기하여 00:00 역계산 오류 방지)
        const formatTimeRoundUp = (timeStr: string) => {
            const timePart = timeStr.split("T")[1].substring(0, 5);
            let [hh, mm] = timePart.split(":").map(Number);

            if (mm >= 40) {
                hh += 1;
                mm = 0;
            }
            // 24시는 00:00이 아닌 24:00으로 반환해야 클라이언트에서 당일 밤으로 정상 인식함
            if (hh === 24) return "24:00";
            return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
        };

        for (const content of data) {
            // 딱 해당 게임 일자(오전 6시 ~ 다음날 오전 5시 59분)에 포함되는 일정만 추출
            const targetTimes = content.StartTimes?.filter((time: string) => time >= gameDayStart && time <= gameDayEnd);
            if (!targetTimes || targetTimes.length === 0) continue;

            const timeStrs = targetTimes.map((t: string) => formatTimeRoundUp(t)).sort();

            if (content.CategoryName === "필드보스") {
                hasFieldBoss = true;
                bossTimes = bossTimes.concat(timeStrs);
                if (!bossImage) bossImage = content.ContentsIcon;
            }
            else if (content.CategoryName === "카오스게이트") {
                hasChaosGate = true;
                gateTimes = gateTimes.concat(timeStrs);
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

                islandsMap.set(content.ContentsName, {
                    name: content.ContentsName,
                    image: content.ContentsIcon,
                    times: timeStrs,
                    rewardItems,
                    isGoldIsland: rawItems.some((item: any) => item.Name.includes("골드")),
                });
            }
        }

        // 요일 규칙 기반으로 최종 보정 (API에서 잘못된 데이터가 넘어와도 요일 규칙이 우선)
        hasFieldBoss = hasFieldBoss && expectedHasBoss;
        hasChaosGate = hasChaosGate && expectedHasGate;

        // 🔥 [핵심 4] 모험 섬 정렬 (시간순 정렬 시 UI의 grid-cols-3 속성에 의해 오전 3개가 첫 줄, 오후 3개가 둘째 줄에 자연스럽게 배치됨)
        const sortedIslands = Array.from(islandsMap.values()).sort((a, b) => {
            const getSortVal = (t: string) => {
                let [h, m] = (t || "24:00").split(':').map(Number);
                if (h < 6) h += 24; // 새벽 1시를 25시로 변환
                return h * 60 + m;
            };
            return getSortVal(a.times[0]) - getSortVal(b.times[0]);
        });

        // 보스/카게 시간도 시간순으로 안전하게 정렬 후 중복 제거
        const sortTimes = (times: string[]) => [...new Set(times)].sort((a, b) => {
            let valA = parseInt(a.split(':')[0], 10);
            let valB = parseInt(b.split(':')[0], 10);
            if (valA < 6) valA += 24;
            if (valB < 6) valB += 24;
            return valA - valB;
        });

        return NextResponse.json({
            targetDate: targetDateStr,
            islands: sortedIslands,
            hasFieldBoss,
            hasChaosGate,
            bossTimes: sortTimes(bossTimes),
            gateTimes: sortTimes(gateTimes),
            bossImage,
            gateImage,
        }, { status: 200 });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}