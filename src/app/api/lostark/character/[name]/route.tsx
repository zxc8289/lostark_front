import { NextResponse } from "next/server";
import { getDb } from "@/db/client";
import { headers } from "next/headers";

const CACHE_MINUTES = 10;
const RATE_LIMIT_WINDOW = 60 * 1000;
const MAX_REQUESTS_PER_IP = 15;

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
    image?: string;
    combatPower?: string;
    jobEngraving?: string; // 🔥 추가
    profileUrl?: string;
};

type CharacterSummary = {
    name: string;
    server: string;
    itemLevel: string;
    itemLevelNum: number;
    jobEngraving?: string; // 🔥 추가
    combatPower: string;
    className: string;
    guild?: string;
    img?: string;
    roster: RosterCharacter[];
    source: string;
};

// 🌟 통합 정보 조회 (전투력 + 아크패시브 Title)
async function fetchCharacterProfile(charName: string, keys: string[]) {
    const randomKey = keys[Math.floor(Math.random() * keys.length)];
    // 통합 엔드포인트 호출
    const url = `https://developer-lostark.game.onstove.com/armories/characters/${encodeURIComponent(charName)}`;

    try {
        const res = await fetch(url, {
            method: "GET",
            headers: { Authorization: `bearer ${randomKey}`, Accept: "application/json" },
            cache: "no-store",
        });

        if (!res.ok) return null;
        const data = await res.json();

        const profile = data?.ArmoryProfile;
        const arkPassive = data?.ArkPassive;


        return {
            combatPower: profile?.CombatPower || "0",
            image: profile?.CharacterImage || undefined,
            guild: profile?.GuildName || undefined,
            jobEngraving: arkPassive?.IsArkPassive ? arkPassive?.Title : undefined,
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
            return NextResponse.json({ error: "TOO_MANY_REQUESTS" }, { status: 429 });
        }

        const { name } = await ctx.params;
        const nickname = decodeURIComponent(name || "").trim();

        console.log(`\n🔍 [Request] "${nickname}" 캐릭터 검색 (IP: ${ip})`);

        const db = await getDb();
        const collection = db.collection("characters");
        const dbCharacter = await collection.findOne({ name: nickname });

        if (dbCharacter) {
            const lastUpdate = new Date(dbCharacter.updatedAt);
            const diffMinutes = (Date.now() - lastUpdate.getTime()) / (1000 * 60);

            if (diffMinutes < CACHE_MINUTES) {
                console.log(`✅ [Cache Hit] DB 데이터 반환`);
                return NextResponse.json({ ...dbCharacter.data, source: `Cache` }, { status: 200 });
            }
        }

        const rawKeys = process.env.LOSTARK_OPENAPI_JWT || "";
        const API_KEYS = rawKeys.split(/[\n,]+/).map(k => k.trim()).filter(k => k);

        const siblingsUrl = `https://developer-lostark.game.onstove.com/characters/${encodeURIComponent(nickname)}/siblings`;
        const siblingsKey = API_KEYS[Math.floor(Math.random() * API_KEYS.length)];

        const siblingsRes = await fetch(siblingsUrl, {
            method: "GET",
            headers: { Authorization: `bearer ${siblingsKey}`, Accept: "application/json" },
        });

        const siblingsData: ApiSibling[] = await siblingsRes.json();
        if (!siblingsData || siblingsData.length === 0) {
            return NextResponse.json({ error: "CHARACTER_NOT_FOUND" }, { status: 404 });
        }

        console.log(`📡 원정대 ${siblingsData.length}개 캐릭터 상세 정보 요청...`);

        const rosterPromises = siblingsData.map(async (c) => {
            const itemLevelNum = parseFloat((c.ItemMaxLevel || c.ItemAvgLevel || "0").replace(/,/g, ""));
            const charData: RosterCharacter = {
                name: c.CharacterName,
                server: c.ServerName,
                level: c.CharacterLevel,
                className: c.CharacterClassName,
                itemLevel: c.ItemMaxLevel || c.ItemAvgLevel || "0.00",
                itemLevelNum: itemLevelNum,
                profileUrl: `https://lostark.game.onstove.com/Profile/Character/${encodeURIComponent(c.CharacterName)}`
            };

            const profile = await fetchCharacterProfile(c.CharacterName, API_KEYS);
            if (profile) {
                charData.combatPower = profile.combatPower;
                charData.image = profile.image;
                charData.jobEngraving = profile.jobEngraving; // 🔥 여기에 데이터를 넣어줘야 합니다!
                (charData as any)._tempGuild = profile.guild;
            }
            return charData;
        });

        const roster = await Promise.all(rosterPromises);
        roster.sort((a, b) => b.itemLevelNum - a.itemLevelNum);

        const mainChar = roster.find(c => c.name === nickname) || roster[0];

        const resultData: CharacterSummary = {
            name: mainChar.name,
            server: mainChar.server,
            itemLevel: mainChar.itemLevel,
            itemLevelNum: mainChar.itemLevelNum,
            className: mainChar.className,
            combatPower: mainChar.combatPower || "0",
            jobEngraving: mainChar.jobEngraving, // 🔥 최종 결과물에도 포함
            guild: (mainChar as any)._tempGuild,
            img: mainChar.image,
            roster: roster.map(({ _tempGuild, ...rest }: any) => rest),
            source: "Official API"
        };

        console.log(`💾 DB 저장 완료: ${nickname} (${resultData.jobEngraving || "각인없음"})`);
        await collection.updateOne(
            { name: nickname },
            { $set: { name: nickname, data: resultData, updatedAt: new Date() } },
            { upsert: true }
        );

        return NextResponse.json(resultData, { status: 200 });

    } catch (err: any) {
        console.error("🔥 서버 에러:", err);
        return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
    }
}