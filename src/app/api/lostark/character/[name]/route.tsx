import { NextResponse } from "next/server";
import { getDb } from "@/db/client";
import { headers } from "next/headers";

// ─────────────────────────────────────────────────────────────────
// [설정]
// ─────────────────────────────────────────────────────────────────
const CACHE_MINUTES = 10;
const RATE_LIMIT_WINDOW = 60 * 1000; // 1분
const MAX_REQUESTS_PER_IP = 30;      // 1분에 30회

const rateLimitMap = new Map<string, { count: number; lastTime: number }>();

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    image?: string;         // 추가됨
    combatPower?: string;   // 추가됨
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

// 🌟 개별 캐릭터 프로필 조회용 헬퍼 함수
async function fetchCharacterProfile(charName: string, keys: string[]) {
    // 요청마다 키를 랜덤으로 뽑아서 트래픽을 골고루 분산!
    const randomKey = keys[Math.floor(Math.random() * keys.length)];
    const url = `https://developer-lostark.game.onstove.com/armories/characters/${encodeURIComponent(charName)}/profiles`;

    try {
        const res = await fetch(url, {
            method: "GET",
            headers: { Authorization: `bearer ${randomKey}`, Accept: "application/json" },
            cache: "no-store",
        });

        if (!res.ok) return null;
        const data = await res.json();
        return {
            combatPower: data?.CombatPower || "0",
            image: data?.CharacterImage || undefined,
            guild: data?.GuildName || undefined,
        };
    } catch (error) {
        console.error(`❌ Profile Fetch Error (${charName}):`, error);
        return null;
    }
}

export async function GET(
    _req: Request,
    ctx: { params: Promise<{ name: string }> }
) {
    try {
        // 🛡️ 1. 도배 방지 로직
        const headerList = await headers();
        const ip = headerList.get("x-forwarded-for") || "unknown";
        const nowTime = Date.now();
        const userHistory = rateLimitMap.get(ip) || { count: 0, lastTime: nowTime };

        if (nowTime - userHistory.lastTime > RATE_LIMIT_WINDOW) {
            userHistory.count = 0;
            userHistory.lastTime = nowTime;
        }

        userHistory.count++;
        rateLimitMap.set(ip, userHistory);

        if (userHistory.count > MAX_REQUESTS_PER_IP) {
            return NextResponse.json(
                { error: "TOO_MANY_REQUESTS", message: "요청이 너무 많습니다." },
                { status: 429 }
            );
        }

        // 🔍 2. 정상 로직 시작
        const { name } = await ctx.params;
        const nickname = decodeURIComponent(name || "").trim();

        console.log(`\n──────────────────────────────────────────────`);
        console.log(`🔍 [System] 캐릭터 검색 요청: "${nickname}" (IP: ${ip})`);

        const db = await getDb();
        const collection = db.collection("characters");
        const dbCharacter = await collection.findOne({ name: nickname });
        const now = new Date();

        if (dbCharacter) {
            const lastUpdate = new Date(dbCharacter.updatedAt);
            const diffMinutes = (now.getTime() - lastUpdate.getTime()) / (1000 * 60);

            if (diffMinutes < CACHE_MINUTES) {
                console.log(`✅ [Cache Hit] DB 데이터 반환 (${diffMinutes.toFixed(1)}분 경과)`);
                return NextResponse.json(
                    { ...dbCharacter.data, source: `Database Cache (${diffMinutes.toFixed(0)}분 전)` },
                    { status: 200 }
                );
            }
        }

        // 🔑 3. API 키 파싱 (엔터, 쉼표 모두 완벽 대응)
        const rawKeys = process.env.LOSTARK_OPENAPI_JWT || "";
        if (!rawKeys) {
            return NextResponse.json({ error: "API_KEY_MISSING" }, { status: 500 });
        }
        const API_KEYS = rawKeys.split(/[\n,]+/).map(k => k.trim().replace(/^Bearer\s+/i, "")).filter(k => k);

        // 📡 4. 형제(원정대) 캐릭터 목록 조회
        const siblingsUrl = `https://developer-lostark.game.onstove.com/characters/${encodeURIComponent(nickname)}/siblings`;
        const siblingsKey = API_KEYS[Math.floor(Math.random() * API_KEYS.length)];

        console.log(`📡 [API Call] Siblings 리스트 요청 중...`);
        const siblingsRes = await fetch(siblingsUrl, {
            method: "GET",
            headers: { Authorization: `bearer ${siblingsKey}`, Accept: "application/json" },
            cache: "no-store",
        });

        if (!siblingsRes.ok) {
            return NextResponse.json({ error: `API_ERROR_${siblingsRes.status}` }, { status: siblingsRes.status });
        }

        const siblingsData: ApiSibling[] = await siblingsRes.json();
        if (!siblingsData || siblingsData.length === 0) {
            return NextResponse.json({ error: "CHARACTER_NOT_FOUND" }, { status: 404 });
        }

        // 🌟 5. 원정대 "모든" 캐릭터의 프로필(전투력/이미지) 병렬로 가져오기 (제한 없음!)
        console.log(`📡 [API Call] 원정대 전체 캐릭터(${siblingsData.length}개) 프로필 요청 시작...`);

        const rosterPromises = siblingsData.map(async (c) => {
            const itemLevelNum = parseFloat((c.ItemMaxLevel || c.ItemAvgLevel || "0").replace(/,/g, ""));

            // 기본 세팅
            const charData: RosterCharacter = {
                name: c.CharacterName,
                server: c.ServerName,
                level: c.CharacterLevel,
                className: c.CharacterClassName,
                itemLevel: c.ItemMaxLevel || c.ItemAvgLevel || "0.00",
                itemLevelNum: itemLevelNum,
                profileUrl: `https://lostark.game.onstove.com/Profile/Character/${encodeURIComponent(c.CharacterName)}`
            };

            // 무조건 모든 캐릭터 프로필 조회!
            const profile = await fetchCharacterProfile(c.CharacterName, API_KEYS);
            if (profile) {
                charData.combatPower = profile.combatPower;
                charData.image = profile.image;
                // 메인 캐릭터 판별을 위해 길드명 임시 보관
                (charData as any)._tempGuild = profile.guild;
            } else {
                charData.combatPower = "0";
            }

            return charData;
        });

        // Promise.all로 동시에 쫙 긁어옴
        const roster = await Promise.all(rosterPromises);
        roster.sort((a, b) => b.itemLevelNum - a.itemLevelNum);

        // 본캐(검색한 캐릭터) 정보 뽑기
        const mainChar = roster.find(c => c.name === nickname) || roster[0];

        const resultData: CharacterSummary = {
            name: mainChar.name,
            server: mainChar.server,
            itemLevel: mainChar.itemLevel,
            itemLevelNum: mainChar.itemLevelNum,
            className: mainChar.className,
            combatPower: mainChar.combatPower || "0",
            guild: (mainChar as any)._tempGuild,
            img: mainChar.image,
            roster: roster.map(c => {
                // 클라이언트 내려보낼때 임시데이터 삭제
                const { _tempGuild, ...rest } = c as any;
                return rest;
            }),
            source: "Official API (Fresh)"
        };

        // 💾 6. DB 저장
        console.log(`💾 [DB Save] 데이터 저장 완료`);
        await collection.updateOne(
            { name: nickname },
            { $set: { name: nickname, data: resultData, updatedAt: new Date() } },
            { upsert: true }
        );

        return NextResponse.json(resultData, { status: 200 });

    } catch (err: any) {
        console.error("🔥 [Server Error]", err);
        return NextResponse.json({ error: "SERVER_INTERNAL_ERROR", msg: err.message }, { status: 500 });
    }
}