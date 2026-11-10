import { NextResponse } from "next/server";
import { buildCalendarSchedule, getGameDateString, isCalendarDate, type CalendarContent } from "@/app/lib/calendar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    const date = new URL(request.url).searchParams.get("date") ?? getGameDateString(new Date());
    if (!isCalendarDate(date)) return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    const keys = (process.env.LOSTARK_OPENAPI_JWT ?? "").split(",").map(key => key.trim()).filter(Boolean);
    if (!keys.length) return NextResponse.json({ error: "API Key missing" }, { status: 500 });

    // Reuse one recent calendar snapshot across selected dates. Random keys
    // fragmented the fetch cache and could return differently aged schedules.
    for (const key of keys) {
        try {
            const response = await fetch("https://developer-lostark.game.onstove.com/gamecontents/calendar", {
                headers: { accept: "application/json", authorization: `bearer ${key}` },
                next: { revalidate: 300 },
                signal: AbortSignal.timeout(10000),
            });
            if (!response.ok) continue;
            const data: unknown = await response.json();
            if (!Array.isArray(data)) continue;
            return NextResponse.json(buildCalendarSchedule(data as CalendarContent[], date), {
                headers: { "Cache-Control": "no-store" },
            });
        } catch {
            // Try the next configured key on network errors or exhausted quota.
        }
    }
    return NextResponse.json({ error: "일정을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요." }, { status: 502 });
}
