import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { nickname } = await req.json();
        if (!nickname || typeof nickname !== "string") {
            return NextResponse.json({ ok: false, error: "nickname required" }, { status: 400 });
        }

        const backend = process.env.BACKEND_URL || "http://localhost:4000";
        const res = await fetch(`${backend}/api/scrape/character`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nickname }),
            cache: "no-store",
        });

        const data = await res.json(); // { ok, data, error? }
        return NextResponse.json(data, { status: res.status });
    } catch (e: any) {
        return NextResponse.json({ ok: false, error: e?.message ?? "proxy_failed" }, { status: 500 });
    }
}
