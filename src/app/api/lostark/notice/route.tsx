// app/api/lostark-notice/route.ts
import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { request } from "undici";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // 캐시/ISR 간섭 제거 (디버그용)
export const revalidate = 0;            // 디버그 동안 비활성

const LIST_URL = "https://lostark.game.onstove.com/News/Notice/List";

type NoticeItem = {
    title: string;
    link: string;
    date?: string | null;
    type?: string | null;
};

export async function GET() {
    console.log("[lostark-notice] start fetch:", LIST_URL);

    const ac = new AbortController();
    const timeout = setTimeout(() => {
        console.warn("[lostark-notice] aborting due to timeout (10s)");
        ac.abort();
    }, 10_000);

    let res: any;
    try {
        res = await request(LIST_URL, {
            method: "GET",
            headers: {
                "user-agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
                "accept-language": "ko,en;q=0.9",
                accept:
                    "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                referer: "https://lostark.game.onstove.com/",
                "sec-fetch-site": "same-origin",
                "sec-fetch-mode": "navigate",
                "sec-fetch-dest": "document",
            },
            signal: ac.signal,
        });
    } catch (e: any) {
        clearTimeout(timeout);
        console.error("[lostark-notice] request error:", e?.message || e);
        return NextResponse.json(
            { error: "request failed", detail: String(e?.message || e) },
            { status: 500 }
        );
    }
    clearTimeout(timeout);

    console.log("[lostark-notice] status:", res.statusCode);

    if (res.statusCode !== 200) {
        // 응답 헤더도 좀 찍자
        // @ts-ignore
        console.log("[lostark-notice] headers:", Object.fromEntries(res.headers || []));
        return NextResponse.json(
            { error: "Failed to fetch list", status: res.statusCode },
            { status: 502 }
        );
    }

    // 본문 읽기
    let html = "";
    try {
        html = await res.body.text();
    } catch (e: any) {
        console.error("[lostark-notice] body read error:", e?.message || e);
        return NextResponse.json(
            { error: "read body failed", detail: String(e?.message || e) },
            { status: 500 }
        );
    }

    console.log("[lostark-notice] html length:", html.length);
    console.log("[lostark-notice] html head <<<");
    console.log(html.slice(0, 500)); // 앞부분만
    console.log("[lostark-notice] html head >>>");

    const $ = cheerio.load(html);

    // 페이지 구조 상단 요약
    const listCnt = $(".list li").length;
    const anchorCnt = $('a[href^="/News/Notice/"]').length;
    console.log("[lostark-notice] .list li count:", listCnt);
    console.log('[lostark-notice] anchor "/News/Notice/" count:', anchorCnt);

    const candidates: NoticeItem[] = [];

    // 1차: 구조 기반
    $('.list li a[href^="/News/Notice/"]').each((_, el) => {
        const $a = $(el);
        const href = $a.attr("href") || "";
        const link = href.startsWith("http")
            ? href
            : `https://lostark.game.onstove.com${href}`;

        const $root = $a.closest("li");

        const title =
            $root.find(".list__title").text().trim() ||
            $a.text().replace(/\s+/g, " ").trim();

        const date = $root.find(".list__date").text().trim() || null;
        const type = $root.find(".list__category .icon").first().text().trim() || null;

        if (title && link) {
            candidates.push({ title, link, date, type });
        }
    });

    console.log("[lostark-notice] after primary parse, candidates:", candidates.length);

    // 2차: fallback (혹시 구조가 또 다를 때)
    if (candidates.length === 0) {
        $('a[href^="/News/Notice/"]').each((_, a) => {
            const $a = $(a);
            const href = $a.attr("href") || "";
            const link = href.startsWith("http")
                ? href
                : `https://lostark.game.onstove.com${href}`;
            const $li = $a.closest("li");
            const rawText = $li.text().replace(/\s+/g, " ").trim();
            const title = $a.text().replace(/\s+/g, " ").trim();
            const typeMatch = rawText.match(/^(공지|점검|이벤트|상점)/);
            const type = typeMatch?.[1] ?? null;
            const dateMatch = rawText.match(/\b(20\d{2}\.\d{2}\.\d{2})\b/);
            const date = dateMatch?.[1] ?? null;
            if (title) candidates.push({ title, link, date, type });
        });
        console.log("[lostark-notice] after fallback parse, candidates:", candidates.length);
    }

    // 후보 샘플 로그
    console.log(
        "[lostark-notice] sample candidates:",
        candidates.slice(0, 3)
    );

    // 정렬/최신
    const byDate = (x: NoticeItem) =>
        x.date ? new Date(x.date.replace(/\./g, "-")).getTime() : 0;
    candidates.sort((a, b) => byDate(b) - byDate(a));

    const latest = candidates[0] ?? null;
    console.log("[lostark-notice] latest:", latest);

    return NextResponse.json({
        latest,
        totalParsed: candidates.length,
        debug: { listCnt, anchorCnt, htmlLen: html.length }, // 프론트에서 잠깐 볼 수 있게
    });
}
