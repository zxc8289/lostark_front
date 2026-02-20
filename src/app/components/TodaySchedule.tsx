"use client";

import { useEffect, useState, useCallback } from "react";
import { Map, Skull, Swords } from "lucide-react";

type RewardItem = {
    name: string;
    icon: string;
    grade: string;
};

type IslandItem = {
    name: string;
    image: string;
    times: string[];
    isGoldIsland: boolean;
    rewardItems: RewardItem[];
};

export default function TodaySchedule() {
    const [weekDays, setWeekDays] = useState<{ day: string; dateStr: string; displayDate: string }[]>([]);
    const [selectedDate, setSelectedDate] = useState<string>("");

    const [islands, setIslands] = useState<IslandItem[]>([]);
    const [status, setStatus] = useState({
        hasFieldBoss: false,
        hasChaosGate: false,
        bossTimes: [] as string[],
        gateTimes: [] as string[],
        bossImage: null as string | null,
        gateImage: null as string | null
    });

    const [loading, setLoading] = useState(true);
    const [nowTime, setNowTime] = useState(new Date());

    const getGameDateString = (dateObj: Date) => {
        const d = new Date(dateObj);
        if (d.getHours() < 6) d.setDate(d.getDate() - 1);

        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${dd}`;
    };

    const isToday = (targetDateStr: string) => {
        return targetDateStr === getGameDateString(nowTime);
    };

    const isPastDate = (targetDateStr: string) => {
        return targetDateStr < getGameDateString(nowTime);
    };

    const getGameTotalMin = (h: number, m: number) => {
        let gameH = h;
        if (gameH < 6) gameH += 24;
        return gameH * 60 + m;
    };

    useEffect(() => {
        const today = new Date();
        const days = ["일", "월", "화", "수", "목", "금", "토"];
        const weekData = [];

        const gameTodayStr = getGameDateString(today);
        if (!selectedDate) setSelectedDate(gameTodayStr);

        for (let i = -3; i <= 3; i++) {
            const d = new Date();
            d.setDate(today.getDate() + i);
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, "0");
            const dd = String(d.getDate()).padStart(2, "0");
            const dateStr = `${y}-${m}-${dd}`;

            weekData.push({
                day: days[d.getDay()],
                dateStr: dateStr,
                displayDate: String(d.getDate()),
            });
        }
        setWeekDays(weekData);
    }, []);

    const fetchData = useCallback(async (date: string) => {
        if (!date) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/lostark/calendar?date=${date}`);
            if (!res.ok) throw new Error("Failed");
            const data = await res.json();

            setIslands(data.islands || []);
            setStatus({
                hasFieldBoss: data.hasFieldBoss,
                hasChaosGate: data.hasChaosGate,
                bossTimes: data.bossTimes || [],
                gateTimes: data.gateTimes || [],
                bossImage: data.bossImage,
                gateImage: data.gateImage,
            });
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData(selectedDate);
    }, [selectedDate, fetchData]);

    useEffect(() => {
        const timer = setInterval(() => setNowTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const getNextTime = (times: string[]) => {
        if (!times || times.length === 0) return null;
        if (isPastDate(selectedDate)) return "END";

        // 미래 날짜일 경우 무조건 첫 번째 스케줄 반환 (API에서 이미 시간순 정렬해줌)
        if (!isToday(selectedDate)) return times[0];

        const currentTotalMin = getGameTotalMin(nowTime.getHours(), nowTime.getMinutes());
        const next = times.find(t => {
            const [h, m] = t.split(":").map(Number);
            return getGameTotalMin(h, m) > currentTotalMin;
        });

        return next || "END";
    };

    const getTimeLeftStr = (targetTimeStr: string | null) => {
        if (!isToday(selectedDate) || !targetTimeStr || targetTimeStr === "END" || targetTimeStr === "종료") return "";

        const [h, m] = targetTimeStr.split(":").map(Number);
        const targetDate = new Date(nowTime);

        // h가 24인 경우 자바스크립트 Date 객체에서 자동으로 다음날 00:00으로 넘어갑니다.
        targetDate.setHours(h, m, 0, 0);

        // 새벽(01시 등) 일정의 경우, 현재가 6시 이후의 낮/밤이라면 내일 새벽으로 처리
        if (h < 6 && nowTime.getHours() >= 6) {
            targetDate.setDate(targetDate.getDate() + 1);
        }

        const diff = targetDate.getTime() - nowTime.getTime();
        if (diff < 0) return "";

        const totalSec = Math.floor(diff / 1000);
        const hh = String(Math.floor(totalSec / 3600)).padStart(2, "0");
        const mm = String(Math.floor((totalSec % 3600) / 60)).padStart(2, "0");
        const ss = String(totalSec % 60).padStart(2, "0");

        return `${hh}:${mm}:${ss}`;
    };

    const getDisplayTime = (times: string[], nextTime: string | null) => {
        if (!times || times.length === 0) return "일정 없음";
        if (isPastDate(selectedDate)) return "종료";
        if (!isToday(selectedDate)) return times[0];
        if (nextTime === "END") return "종료";
        return nextTime;
    };

    const nextBossTime = getNextTime(status.bossTimes);
    const nextGateTime = getNextTime(status.gateTimes);
    const bossTimeLeft = getTimeLeftStr(nextBossTime);
    const gateTimeLeft = getTimeLeftStr(nextGateTime);

    return (
        <div className="w-full h-full flex flex-col gap-6 p-1">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5 border-b border-white/5 pb-5">
                <div className="flex justify-between gap-2 sm:gap-3 md:gap-5 px-1 w-full xl:w-auto">
                    {weekDays.map((item, idx) => {
                        const isActive = item.dateStr === selectedDate;
                        return (
                            <button
                                key={idx}
                                onClick={() => setSelectedDate(item.dateStr)}
                                className="flex flex-col items-center gap-1 md:gap-1.5 cursor-pointer group w-9 md:w-9 outline-none"
                            >
                                <span className={`text-[13px] md:text-[14px] font-medium transition-colors ${isActive ? "text-blue-400 " : "text-gray-300 group-hover:text-white"}`}>
                                    {item.day}
                                </span>

                                <div className={`w-9.5 h-9.5 md:w-10 md:h-10 flex items-center justify-center rounded-lg text-sm md:text-base font-bold transition-all
                                    ${isActive
                                        ? "bg-[#5B69FF] text-white  scale-100"
                                        : "text-gray-500 bg-[#15171C] border border-white/10 hover:border-white/30 hover:bg-[#252830]"
                                    }`}>
                                    {item.displayDate}
                                </div>
                            </button>
                        );
                    })}
                </div>
                <div className="flex items-center gap-6 bg-[#1A1D24] px-6 py-3 rounded-xl border border-white/5 min-w-[320px] justify-between">
                    {/* 필드보스 */}
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                            {status.bossImage ? (
                                <img src={status.bossImage} alt="보스" className="w-5 h-5 rounded-full object-cover border border-white/10" />
                            ) : (
                                <Skull size={15} className={status.hasFieldBoss ? "text-gray-300" : "text-gray-600"} />
                            )}
                            <span className="text-sm font-bold text-gray-400">필드 보스</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={`text-sm sm:text-base font-bold ${status.hasFieldBoss ? "text-white" : "text-white"}`}>
                                {status.hasFieldBoss ? getDisplayTime(status.bossTimes, nextBossTime) : "일정 없음"}
                            </span>
                            {(status.hasFieldBoss && bossTimeLeft) && (
                                <span className="text-[10px] sm:text-[11px] text-gray-500 font-medium">({bossTimeLeft})</span>
                            )}
                        </div>
                    </div>

                    <div className="w-px h-8 bg-white/10" />

                    {/* 카오스게이트 */}
                    <div className="flex flex-col gap-1 items-end">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-gray-400">카오스게이트</span>
                            {status.gateImage ? (
                                <img src={status.gateImage} alt="카게" className="w-5 h-5 rounded-full object-cover border border-white/10" />
                            ) : (
                                <Swords size={15} className={status.hasChaosGate ? "text-gray-300" : "text-gray-600"} />
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {(status.hasChaosGate && gateTimeLeft) && (
                                <span className="text-[10px] sm:text-[11px] text-gray-500 font-medium">({gateTimeLeft})</span>
                            )}
                            <span className={`text-sm sm:text-base font-bold ${status.hasChaosGate ? "text-white" : "text-white"}`}>
                                {status.hasChaosGate ? getDisplayTime(status.gateTimes, nextGateTime) : "일정 없음"}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
            {/* 섬 목록 or 로딩 */}
            {loading ? (
                <div className="w-full h-[120px] animate-pulse bg-white/5 rounded-2xl" />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {islands.length > 0 ? islands.map((item, idx) => {
                        const nextIslandTime = getNextTime(item.times);
                        const isFinished = nextIslandTime === "END";
                        const timeLeft = getTimeLeftStr(nextIslandTime);
                        const displayTime = getDisplayTime(item.times, nextIslandTime);

                        const isDimmed = isFinished || isPastDate(selectedDate);

                        return (
                            <div key={idx} className={`relative flex flex-col p-4 rounded-2xl border border-white/5 bg-[#1A1D24] transition-all h-[115px] group ${isDimmed ? "opacity-50 grayscale" : ""}`}>

                                {/* 1. [상단] 이름/이미지 영역 (flex-1로 남는 공간 차지) */}
                                <div className="flex-1 flex justify-between items-start min-w-0">
                                    <div className="flex items-center gap-3 min-w-0 w-full">
                                        <div className="w-7.5 h-7.5 rounded-lg bg-[#252830] border border-white/5 overflow-hidden shrink-0">
                                            {item.image ? (
                                                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-500"><Map size={20} /></div>
                                            )}
                                        </div>
                                        <div className="flex flex-col min-w-0 flex-1">
                                            <span className="text-base font-bold text-gray-100 leading-tight truncate w-full">
                                                {item.name}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* my-3: 위아래 간격, h-px: 1픽셀 높이, bg-white/5: 선 색상 */}
                                <div className="w-full h-[0.5px] bg-white/5 mb-3 mt-2 shrink-0" />

                                {/* 3. [하단] 보상/시간 영역 (높이 고정 h-[36px]) */}
                                {/* 높이를 고정했기 때문에 내용이 1줄이든 2줄이든 카드 모양이 변하지 않음 */}
                                <div className="h-[36px] flex justify-between items-center shrink-0 w-full">

                                    {/* 보상 아이콘 */}
                                    <div className="flex gap-1.5 overflow-hidden">
                                        {item.rewardItems.map((reward, rIdx) => (
                                            <div key={rIdx} className="relative group/reward">
                                                <img
                                                    src={reward.icon}
                                                    alt={reward.name}
                                                    className="w-6 h-6 rounded bg-[#252830] border border-white/10 object-cover opacity-80 group-hover/reward:opacity-100 transition-opacity"
                                                />
                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-[10px] text-white bg-black/80 rounded whitespace-nowrap opacity-0 group-hover/reward:opacity-100 transition-opacity pointer-events-none z-10">
                                                    {reward.name}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* 시간 텍스트 (우측 정렬) */}
                                    <div className="flex flex-col items-end justify-center">
                                        {/* 시간 표시 */}
                                        <span className={`text-base font-bold leading-none ${isDimmed ? "text-gray-500" : "text-gray-200"}`}>
                                            {displayTime}
                                        </span>

                                        {/* 텍스트가 없어도 높이 14px을 유지하여 윗줄이 내려오지 않게 함 */}
                                        <div className="flex items-center mt-0.5">
                                            {(!isDimmed && timeLeft) && (
                                                <span className="text-[12px] text-gray-500 font-medium leading-none whitespace-nowrap">
                                                    {timeLeft}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    }) : (
                        <div className="col-span-3 h-[120px] flex items-center justify-center text-gray-500 text-sm bg-[#1A1D24] border border-white/5 rounded-2xl">
                            예정된 모험 섬이 없습니다.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}