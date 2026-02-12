import { NextResponse } from "next/server";
import { getDb } from "@/db/client";
import { headers } from "next/headers"; // 👈 [필수] IP 확인용

// ─────────────────────────────────────────────────────────────────
// [설정]
// 1. 캐시 시간 (기본 10분)
// 2. 도배 방지 (IP당 1분에 30회 제한 - 2초에 1번 꼴)
// ─────────────────────────────────────────────────────────────────
const CACHE_MINUTES = 0;
const RATE_LIMIT_WINDOW = 60 * 1000; // 1분
const MAX_REQUESTS_PER_IP = 30;      // 1분에 30회까지만 허용

// 🛡️ [메모리 캐시] 서버가 켜져있는 동안 접속 기록을 저장 (DB 안 씀)
const rateLimitMap = new Map<string, { count: number; lastTime: number }>();

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ... (타입 정의는 그대로) ...
interface ApiSibling {
    ServerName: string;
    CharacterName: string;
    CharacterLevel: number;
    CharacterClassName: string;
    ItemAvgLevel: string;
    ItemMaxLevel: string;
}

type RosterCharacter = {
    name: string;
    server: string;
    level: number;
    className: string;
    itemLevel: string;
    itemLevelNum: number;
    image?: string;
    profileUrl?: string;
};

type CharacterSummary = {
    name: string;
    server: string;
    itemLevel: string;
    itemLevelNum: number;
    combatPower: string;
    className: string;
    guild?: string;
    img?: string;
    roster: RosterCharacter[];
    source: string;
};

export async function GET(
    _req: Request,
    ctx: { params: Promise<{ name: string }> }
) {
    try {
        // ─────────────────────────────────────────────────────────────────
        // 🛡️ [1. 도배 방지 로직] - DB 가기 전에 여기서 막음!
        // ─────────────────────────────────────────────────────────────────
        const headerList = await headers();
        // 실제 유저 IP 가져오기 (x-forwarded-for는 프록시 거칠 때 진짜 IP)
        const ip = headerList.get("x-forwarded-for") || "unknown";
        const nowTime = Date.now();

        // 이 IP의 기록 가져오기
        const userHistory = rateLimitMap.get(ip) || { count: 0, lastTime: nowTime };

        // 1분이 지났으면 카운트 초기화
        if (nowTime - userHistory.lastTime > RATE_LIMIT_WINDOW) {
            userHistory.count = 0;
            userHistory.lastTime = nowTime;
        }

        userHistory.count++;
        rateLimitMap.set(ip, userHistory);

        // 🚨 제한 횟수 넘으면 바로 429 에러 리턴 (DB 접근 X, API 접근 X)
        if (userHistory.count > MAX_REQUESTS_PER_IP) {
            console.warn(`🚨 [Rate Limit] IP(${ip}) 차단됨. (요청: ${userHistory.count}/${MAX_REQUESTS_PER_IP})`);
            return NextResponse.json(
                { error: "TOO_MANY_REQUESTS", message: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
                { status: 429 }
            );
        }

        // ─────────────────────────────────────────────────────────────────
        // 🔍 [2. 정상 로직 시작]
        // ─────────────────────────────────────────────────────────────────

        const { name } = await ctx.params;
        const nickname = decodeURIComponent(name || "").trim();

        console.log(`\n──────────────────────────────────────────────`);
        console.log(`🔍 [System] 캐릭터 검색 요청: "${nickname}" (IP: ${ip})`);

        // 1. DB 연결
        const db = await getDb();
        const collection = db.collection("characters");

        // 2. DB 검색
        const dbCharacter = await collection.findOne({ name: nickname });
        const now = new Date();

        // 3. 캐시 유효성 검사
        if (dbCharacter) {
            const lastUpdate = new Date(dbCharacter.updatedAt);
            const diffMs = now.getTime() - lastUpdate.getTime();
            const diffMinutes = diffMs / (1000 * 60);

            console.log(`⏱️ [Time Check] 경과: ${diffMinutes.toFixed(2)}분 (기준: ${CACHE_MINUTES}분)`);

            if (diffMinutes < CACHE_MINUTES) {
                console.log(`✅ [Cache Hit] DB 데이터 반환`);
                const cachedData = { ...dbCharacter.data, source: `Database Cache (${diffMinutes.toFixed(0)}분 전)` };
                return NextResponse.json(cachedData, { status: 200 });
            } else {
                console.log(`⌛ [Cache Expired] 갱신 필요`);
            }
        } else {
            console.log(`🆕 [Cache Miss] DB 없음 -> API 호출`);
        }

        // ─────────────────────────────────────────────────────────────────
        // [API 호출 로직]
        // ─────────────────────────────────────────────────────────────────

        const rawKeys = process.env.LOSTARK_OPENAPI_JWT || "";
        if (!rawKeys) {
            console.error("❌ [Error] .env.local API Key 누락");
            return NextResponse.json({ error: "API_KEY_MISSING" }, { status: 500 });
        }

        const API_KEYS = rawKeys.split(",").map(k => k.trim().replace(/^Bearer\s+/i, "")).filter(k => k);
        const randomKey = API_KEYS[Math.floor(Math.random() * API_KEYS.length)];

        console.log(`📡 [API Call] 로스트아크 서버 요청...`);
        const url = `https://developer-lostark.game.onstove.com/characters/${encodeURIComponent(nickname)}/siblings`;

        const res = await fetch(url, {
            method: "GET",
            headers: { Authorization: `bearer ${randomKey}`, Accept: "application/json" },
            cache: "no-store",
        });

        if (!res.ok) {
            if (res.status === 404) return NextResponse.json({ error: "CHARACTER_NOT_FOUND" }, { status: 404 });
            return NextResponse.json({ error: `API_ERROR_${res.status}` }, { status: res.status });
        }

        const siblingsData: ApiSibling[] = await res.json();

        if (!siblingsData || siblingsData.length === 0) {
            return NextResponse.json({ error: "CHARACTER_NOT_FOUND" }, { status: 404 });
        }

        const mainChar = siblingsData.find(c => c.CharacterName === nickname) || siblingsData[0];
        const safeItemLevel = mainChar.ItemMaxLevel || mainChar.ItemAvgLevel || "0.00";
        const mainItemLevelNum = parseFloat(safeItemLevel.replace(/,/g, ""));

        const roster: RosterCharacter[] = siblingsData.map((c) => {
            const subSafeLevel = c.ItemMaxLevel || c.ItemAvgLevel || "0.00";
            return {
                name: c.CharacterName,
                server: c.ServerName,
                level: c.CharacterLevel,
                className: c.CharacterClassName,
                itemLevel: subSafeLevel,
                itemLevelNum: parseFloat(subSafeLevel.replace(/,/g, "")),
                image: undefined,
                profileUrl: `https://lostark.game.onstove.com/Profile/Character/${encodeURIComponent(c.CharacterName)}`
            };
        });

        roster.sort((a, b) => b.itemLevelNum - a.itemLevelNum);

        const resultData: CharacterSummary = {
            name: mainChar.CharacterName,
            server: mainChar.ServerName,
            itemLevel: safeItemLevel,
            itemLevelNum: mainItemLevelNum,
            className: mainChar.CharacterClassName,
            combatPower: "0",
            guild: undefined,
            img: undefined,
            roster: roster,
            source: "Official API (Fresh)"
        };

        // DB 저장
        console.log(`💾 [DB Save] 데이터 저장`);
        await collection.updateOne(
            { name: nickname },
            {
                $set: {
                    name: nickname,
                    data: resultData,
                    updatedAt: new Date()
                }
            },
            { upsert: true }
        );

        return NextResponse.json(resultData, { status: 200 });

    } catch (err: any) {
        console.error("🔥 [Server Error]", err);
        return NextResponse.json({ error: "SERVER_INTERNAL_ERROR", msg: err.message }, { status: 500 });
    }
}