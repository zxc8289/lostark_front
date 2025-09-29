// src/app/api/lostark/character/[name]/route.ts
import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

/** ─────────────────────────────────────────────────────────────────
 *  타입 (백엔드 모듈과 동일/유사 구조)
 *  ───────────────────────────────────────────────────────────────── */
type RosterCharacter = {
    name: string;
    server: string;            // 예: 카마인
    level?: number;            // 전투 레벨 (Lv.70)
    className?: string;        // 직업 (img alt)
    image?: string;            // 직업 아이콘 URL
    profileUrl?: string;       // 절대 URL
    // ─ 상세
    itemLevel?: string;        // "1,730.00"
    itemLevelNum?: number;     // 1730
    combatPower?: string;      // "2,624.41"
    error?: string;
};

type CharacterSummary = {
    name: string;              // 대표 캐릭터(검색한 캐릭터)
    server?: string;
    itemLevel?: string;
    itemLevelNum?: number;
    combatPower?: string;
    roster: RosterCharacter[]; // 전체 보유 캐릭터(상세 포함)
    source: string;

    // 추가로 원하면 쓰는 필드들(옵션)
    className?: string;
    guild?: string;
    img?: string;
};

/** ─────────────────────────────────────────────────────────────────
 *  유틸: httpGet (fetch 래핑)
 *  ───────────────────────────────────────────────────────────────── */
async function httpGet(url: string, init?: RequestInit): Promise<string> {
    const res = await fetch(url, {
        cache: "no-store",
        headers: {
            "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
            "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
            Referer: "https://lostark.game.onstove.com/",
            ...(init?.headers || {}),
        },
        ...init,
    });
    if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${res.statusText} | ${url} | ${txt.slice(0, 200)}`);
    }
    return res.text();
}

/** ─────────────────────────────────────────────────────────────────
 *  파서: 프로필 HTML → 기본 요약
 *  ───────────────────────────────────────────────────────────────── */
function parseProfileBasic(html: string) {
    const $ = cheerio.load(html);

    const name =
        $('[class*="profile-character-info__name"]').first().text().trim() ||
        $('[class*="profile-character-info"]').find("h3,.name").first().text().trim();

    const serverRaw =
        $('[class*="profile-character-info__server"]').first().text().trim() ||
        $('[class*="profile-character-info"]').find('[class*="server"]').first().text().trim();
    const server = serverRaw || undefined;

    // 아이템 레벨
    let itemLevelText = "";
    const expLabel = $('.level-info2__expedition span:contains("장착 아이템 레벨")').first();
    if (expLabel.length) itemLevelText = expLabel.next("span").text().trim();
    if (!itemLevelText) {
        const bodyText = $("body").text().replace(/\s+/g, " ");
        const m = bodyText.match(/아이템\s*레벨\s*([0-9][0-9,\.]*)/);
        if (m) itemLevelText = m[1];
    }
    itemLevelText = itemLevelText.replace(/\s+/g, "").replace(/^Lv\./i, "");
    const itemLevelNum = itemLevelText ? Number(itemLevelText.replace(/,/g, "")) : undefined;

    // 전투력(있으면)
    const combatPower =
        $('.level-info2__item span').eq(1).text().trim().replace(/\s+/g, "") || undefined;

    // 클래스/이미지/길드(있으면)
    const className =
        $(".profile-character-info__img img").attr("alt") ||
        $(".profile-character-info__img").attr("title") ||
        undefined;

    const imgRaw =
        $(".profile-character-info__img img").attr("src") ||
        $(".profile-character-info__img").css("background-image") ||
        "";
    const img = imgRaw ? imgRaw.replace(/^url\(["']?/, "").replace(/["']?\)$/, "") : undefined;

    const bodyText = $("body").text().replace(/\s+/g, " ");
    const guild = bodyText.match(/길드\s*([^\s]+)/)?.[1];

    // 각인/기본/전투 특성(옵션)
    const engravings: string[] = [];
    $(".profile-ability-engrave li, .profile-ability__engrave li").each((_i, li) => {
        const t = $(li).text().replace(/\s+/g, " ").trim();
        if (t) engravings.push(t);
    });

    const basicStats: Record<string, string> = {};
    $(".profile-ability-basic .profile-ability-item, .profile-ability__basic .profile-ability__item").each((_i, el) => {
        const key = $(el).find("span,em,strong,b").first().text().trim();
        const val = $(el).find("strong,b").last().text().trim();
        if (key && val) basicStats[key] = val;
    });

    const battleStats: Record<string, string> = {};
    $(".profile-ability-battle .profile-ability-item, .profile-ability__battle .profile-ability__item").each((_i, el) => {
        const key = $(el).find("span,em,strong,b").first().text().trim();
        const val = $(el).find("strong,b").last().text().trim();
        if (key && val) battleStats[key] = val;
    });

    return {
        name,
        server,
        itemLevel: itemLevelText || undefined,
        itemLevelNum,
        combatPower,
        className,
        img,
        guild,
        engravings,
        basicStats,
        battleStats,
    };
}

/** ─────────────────────────────────────────────────────────────────
 *  보유 캐릭터 목록(서버별) 파싱
 *  ───────────────────────────────────────────────────────────────── */
function parseRosterBase($: cheerio.CheerioAPI) {
    const rosterBase: Omit<RosterCharacter, "itemLevel" | "itemLevelNum" | "combatPower" | "error">[] = [];
    const base = "https://lostark.game.onstove.com";

    $('#expand-character-list .profile-character-list__server').each((_, srvEl) => {
        const serverName = $(srvEl).text().trim();
        const $list = $(srvEl).next('ul.profile-character-list__char');

        $list.find('li > span > button').each((__, btn) => {
            const $btn = $(btn);
            const img = $btn.find("img").attr("src") || undefined;
            const className = $btn.find("img").attr("alt")?.trim() || undefined;
            const charName = $btn.find("span").last().text().trim();

            const fullText = $btn.text().trim(); // "Lv.70이름"
            const levelMatch = fullText.replace(charName, "").match(/Lv\.?\s*([0-9]+)/i);
            const level = levelMatch ? parseInt(levelMatch[1], 10) : undefined;

            const onclick = $btn.attr("onclick") || "";
            const pathMatch = onclick.match(/location\.href='([^']+)'/);
            const profilePath = pathMatch?.[1] || "";
            const profileUrl = profilePath ? new URL(profilePath, base).toString() : undefined;

            rosterBase.push({ name: charName, server: serverName, level, className, image: img, profileUrl });
        });
    });

    return rosterBase;
}

/** ─────────────────────────────────────────────────────────────────
 *  개별 캐릭터 상세 fetch
 *  ───────────────────────────────────────────────────────────────── */
async function fetchProfileByName(nickname: string) {
    const url = `https://lostark.game.onstove.com/Profile/Character/${encodeURIComponent(nickname)}`;
    const html = await httpGet(url);
    return { url, ...parseProfileBasic(html) };
}

/** 간단 동시성 제한 */
async function mapWithConcurrency<T, R>(
    items: T[],
    limit: number,
    fn: (x: T, i: number) => Promise<R>
): Promise<R[]> {
    const out: R[] = new Array(items.length) as R[];
    let i = 0;
    const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
        while (true) {
            const idx = i++;
            if (idx >= items.length) break;
            try {
                out[idx] = await fn(items[idx], idx);
            } catch (e: any) {
                out[idx] = (null as unknown) as R;
            }
            // 과도한 요청 방지용 살짝 쉬기
            await new Promise((r) => setTimeout(r, 150));
        }
    });
    await Promise.all(workers);
    return out;
}

/** 메인 수집 함수 (예전 백엔드 모듈 스타일) */
async function fetchCharacterAll(nickname: string): Promise<CharacterSummary> {
    const source = `https://lostark.game.onstove.com/Profile/Character/${encodeURIComponent(nickname)}`;
    const html = await httpGet(source);
    const $ = cheerio.load(html);

    // 대표 캐릭터(검색 대상)
    const primary = parseProfileBasic(html);
    const name = primary.name || nickname;

    // 보유 캐릭터 목록 베이스
    const rosterBase = parseRosterBase($);

    // 이름 기준 중복 제거
    const uniqueNames = Array.from(new Set(rosterBase.map((r) => r.name)));

    // 상세 동시 크롤링(동시 3개)
    const detailed = await mapWithConcurrency(uniqueNames, 3, async (charName) => {
        try {
            const prof = await fetchProfileByName(charName);
            return {
                name: charName,
                itemLevel: prof.itemLevel,
                itemLevelNum: prof.itemLevelNum,
                combatPower: prof.combatPower,
                server: prof.server || rosterBase.find((r) => r.name === charName)?.server || "",
            };
        } catch (e: any) {
            return { name: charName, error: e?.message || "FETCH_FAILED" };
        }
    });

    const detailedMap = new Map(detailed.map((d) => [d.name, d]));
    const roster: RosterCharacter[] = rosterBase.map((baseEntry) => {
        const extra = detailedMap.get(baseEntry.name) || {};
        return { ...baseEntry, ...extra } as RosterCharacter;
    });

    return {
        name,
        server: primary.server,
        itemLevel: primary.itemLevel,
        itemLevelNum: primary.itemLevelNum,
        combatPower: primary.combatPower,
        roster,
        source,
        // 선택: 원하면 프론트에서 쓰세요
        className: primary.className,
        guild: primary.guild,
        img: primary.img,
    };
}

/** ─────────────────────────────────────────────────────────────────
 *  Next.js 15 Route Handler
 *  ───────────────────────────────────────────────────────────────── */
export const runtime = "nodejs";          // 크롤링은 Node 런타임 권장
export const dynamic = "force-dynamic";   // 매번 새로

export async function GET(
    _req: Request,
    ctx: { params: Promise<{ name: string }> } // Next.js 15: params는 Promise
) {
    const { name } = await ctx.params; // 반드시 await
    const nickname = decodeURIComponent(name || "").trim();
    if (!nickname) {
        return NextResponse.json({ error: "닉네임이 필요합니다." }, { status: 400 });
    }

    try {
        const data = await fetchCharacterAll(nickname);
        return NextResponse.json(data, { status: 200 });
    } catch (err: any) {
        return NextResponse.json(
            { error: "FETCH_FAILED", detail: err?.message ?? String(err) },
            { status: 500 }
        );
    }
}
