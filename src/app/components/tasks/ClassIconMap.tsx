export const classIconMap: Record<string, string> = {
    "버서커": "berserker.svg",
    "디스트로이어": "destroyer.svg",
    "워로드": "warlord.svg",
    "홀리나이트": "holyknight.svg",
    "슬레이어": "slayer.svg",

    "배틀마스터": "battlemaster.svg",
    "인파이터": "infighter.svg",
    "기공사": "soulmaster.svg",
    "창술사": "lancemaster.svg",
    "스트라이커": "striker.svg",
    "브레이커": "Breaker.svg",

    "데빌헌터": "devilhunter.svg",
    "블래스터": "blaster.svg",
    "호크아이": "hawkeye.svg",
    "스카우터": "scouter.svg",
    "건슬링어": "gunslinger.svg",

    "바드": "bard.svg",
    "서머너": "summoner.svg",
    "아르카나": "arcana.svg",
    "소서리스": "elementalmaster.svg",

    "블레이드": "blade.svg",
    "데모닉": "demonic.svg",
    "리퍼": "reaper.svg",
    "소울이터": "souleater.svg",

    "도화가": "artist.svg",
    "기상술사": "aeromancer.svg",
    "발키리": "valkyrie.svg",
    "환수사": "wildsoul.svg",
    "가디언나이트": "dragon_knight.svg",
};

export function getClassIconUrl(className?: string | null) {
    const iconFileName = classIconMap[className || ""] || "default.svg";
    return `/icons/classes/${iconFileName}`;
}

export function isSupporterEngraving(jobEngraving?: string | null) {
    return ["절실한 구원", "축복의 오라", "만개", "해방자"].includes(jobEngraving ?? "");
}
