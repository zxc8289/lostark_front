import { NextResponse } from "next/server";
// npm i cheerio undici
import * as cheerio from "cheerio";
import { request } from "undici";

export const revalidate = 60; // (선택) 60초 캐시 - 과도한 트래픽 방지

const LIST_URL = "https://lostark.game.onstove.com/News/Notice/List";

type NoticeItem = {
    title: string;
    link: string;
    date?: string | null;
    type?: string | null; // 공지/점검/이벤트/상점 등
};

export async function GET() {
    // 1) HTML 가져오기 (서버에서만)
    const res = await request(LIST_URL, {
        method: "GET",
        headers: {
            // 적당한 UA를 넣어두면 일부 WAF가 덜 까다롭게 굽니다.
            "user-agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
            "accept-language": "ko,en;q=0.9",
            accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
    });

    if (res.statusCode !== 200) {
        return NextResponse.json(
            { error: "Failed to fetch list", status: res.statusCode },
            { status: 502 }
        );
    }

    const html = await res.body.text();
    const $ = cheerio.load(html);

    // 2) 목록 파싱
    // 페이지 구조상 공지 목록은 ‘공지사항’ 섹션 아래 li > a 로 반복됩니다.
    // (구조는 바뀔 수 있으니, a[href^="/News/Notice/"] 를 기준으로 최대한 탄탄하게 잡습니다)
    const candidates: NoticeItem[] = [];
    $('a[href^="/News/Notice/"]').each((_, a) => {
        const $a = $(a);
        const href = $a.attr("href") || "";
        const link = href.startsWith("http")
            ? href
            : `https://lostark.game.onstove.com${href}`;

        // li 블록을 기준으로 title/type/date 를 추출
        const $li = $a.closest("li");
        const rawText = $li.text().replace(/\s+/g, " ").trim(); // 공백 정리

        // 제목: 링크 텍스트가 가장 정확
        const title = $a.text().replace(/\s+/g, " ").trim();

        // 타입(공지/점검/이벤트/상점 …)은 li 안쪽의 배지/텍스트 앞머리에 보통 노출됨
        // 예: "공지 알려진 이슈를 안내해 드립니다. 2025.09.17"
        const typeMatch = rawText.match(/^(공지|점검|이벤트|상점)/);
        const type = typeMatch?.[1] ?? null;

        // 날짜: "YYYY.MM.DD" 패턴 추출
        const dateMatch = rawText.match(/\b(20\d{2}\.\d{2}\.\d{2})\b/);
        const date = dateMatch?.[1] ?? null;

        candidates.push({ title, link, date, type });
    });

    // 3) 최신순 정렬(링크 블록은 최신부터 노출되지만, 안전하게 날짜 파싱해서 보정)
    const byDate = (x: NoticeItem) =>
        x.date ? new Date(x.date.replace(/\./g, "-")).getTime() : 0;

    candidates.sort((a, b) => byDate(b) - byDate(a));

    // 4) 최상단(최신) 1건만
    const latest = candidates[0] ?? null;

    return NextResponse.json({ latest, totalParsed: candidates.length });
}
