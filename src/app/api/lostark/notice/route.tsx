import { NextResponse } from "next/server";

export const runtime = "nodejs";
// force-dynamic은 유지하되, fetch 캐시가 우선순위를 가집니다.
export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const rawKeys = process.env.LOSTARK_OPENAPI_JWT || "";
        if (!rawKeys) return NextResponse.json({ error: "API Key missing" }, { status: 500 });

        const API_KEYS = rawKeys.split(",").map(k => k.trim()).filter(k => k);
        const randomKey = API_KEYS[Math.floor(Math.random() * API_KEYS.length)];

        // 🔥 [핵심 수정] 600(10분) -> 3600(1시간)으로 변경
        // 하루 최대 호출량: 24회 (사용자가 아무리 많아도 고정)
        const res = await fetch("https://developer-lostark.game.onstove.com/news/notices", {
            headers: {
                "accept": "application/json",
                "authorization": `bearer ${randomKey}`,
            },
            next: { revalidate: 3600 }, // 👈 1시간마다 갱신
        });

        if (!res.ok) {
            console.error(`[API Error] Status: ${res.status}`);
            return NextResponse.json({ error: "Failed to fetch notices" }, { status: res.status });
        }

        const data = await res.json();

        const formattedList = data.slice(0, 5).map((item: any) => {
            const dateObj = new Date(item.Date);
            const year = dateObj.getFullYear();
            const month = String(dateObj.getMonth() + 1).padStart(2, "0");
            const day = String(dateObj.getDate()).padStart(2, "0");
            const formattedDate = `${year}.${month}.${day}`;

            const now = new Date();
            const isToday =
                now.getFullYear() === year &&
                now.getMonth() + 1 === dateObj.getMonth() + 1 &&
                now.getDate() === dateObj.getDate();

            return {
                title: item.Title,
                category: item.Type,
                date: isToday ? "NEW" : formattedDate,
                link: item.Link,
                isNew: isToday,
            };
        });

        return NextResponse.json({ list: formattedList }, { status: 200 });

    } catch (error: any) {
        console.error("[Server Error]", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}