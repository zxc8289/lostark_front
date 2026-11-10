"use client";

import { useEffect, useState } from "react";
import { Map, Skull, Swords } from "lucide-react";
import { fetchCalendarDate, getGameDateString, gameTimeMinutes, type CalendarSchedule } from "../lib/calendar";
import IslandScheduleDetails from "./IslandScheduleDetails";

export default function TodaySchedule() {
    const [weekDays, setWeekDays] = useState<{ day: string; dateStr: string; displayDate: string }[]>([]);
    const [selectedDate, setSelectedDate] = useState<string>("");

    const [schedule, setSchedule] = useState<CalendarSchedule | null>(null);
    const [loading, setLoading] = useState(true);
    const [errorDate, setErrorDate] = useState("");
    const [retry, setRetry] = useState(0);
    const [nowTime, setNowTime] = useState(new Date());
    const error = errorDate === selectedDate && !!selectedDate;
    const pending = !error && (loading || schedule?.targetDate !== selectedDate);
    const current = !pending && !error && schedule?.targetDate === selectedDate ? schedule : null;
    const islands = current?.islands ?? [];
    const status = current ?? { hasFieldBoss: false, hasChaosGate: false, bossTimes: [], gateTimes: [], bossImage: null, gateImage: null };
    const gameToday = getGameDateString(nowTime);

    const isToday = (targetDateStr: string) => {
        return targetDateStr === getGameDateString(nowTime);
    };

    const isPastDate = (targetDateStr: string) => {
        return targetDateStr < getGameDateString(nowTime);
    };

    useEffect(() => {
        const days = ["일", "월", "화", "수", "목", "금", "토"];
        const weekData = [];
        for (let i = -3; i <= 3; i++) {
            const date = new Date(`${gameToday}T12:00:00Z`);
            date.setUTCDate(date.getUTCDate() + i);
            weekData.push({ day: days[date.getUTCDay()], dateStr: date.toISOString().slice(0, 10), displayDate: String(date.getUTCDate()) });
        }
        setWeekDays(weekData);
        setSelectedDate(current => current || gameToday);
    }, [gameToday]);

    useEffect(() => {
        if (!selectedDate) return;
        const controller = new AbortController();
        setLoading(true);
        setErrorDate("");
        void fetchCalendarDate(selectedDate, controller.signal).then(data => {
            if (!controller.signal.aborted) setSchedule(data);
        }).catch(() => {
            if (!controller.signal.aborted) setErrorDate(selectedDate);
        }).finally(() => {
            if (!controller.signal.aborted) setLoading(false);
        });
        return () => controller.abort();
    }, [selectedDate, retry]);

    useEffect(() => {
        const timer = setInterval(() => setNowTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const getNextTime = (times: string[]) => {
        if (!times || times.length === 0) return null;
        if (isPastDate(selectedDate)) return "END";

        // 미래 날짜일 경우 무조건 첫 번째 스케줄 반환 (API에서 이미 시간순 정렬해줌)
        if (!isToday(selectedDate)) return times[0];

        const kst = new Date(nowTime.getTime() + 9 * 60 * 60 * 1000);
        const currentTotalMin = gameTimeMinutes(`${kst.getUTCHours()}:${kst.getUTCMinutes()}`);
        const next = times.find(t => {
            const [h, m] = t.split(":").map(Number);
            return gameTimeMinutes(`${h}:${m}`) > currentTotalMin;
        });

        return next || "END";
    };

    const getTimeLeftStr = (targetTimeStr: string | null) => {
        if (!isToday(selectedDate) || !targetTimeStr || targetTimeStr === "END" || targetTimeStr === "종료") return "";

        const dayStart = new Date(`${selectedDate}T06:00:00+09:00`);
        const targetDate = new Date(dayStart.getTime() + (gameTimeMinutes(targetTimeStr) - 360) * 60000);

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
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5 border-b border-[var(--overlay-ink)]/5 pb-5">
                <div className="flex justify-between gap-2 sm:gap-3 md:gap-5 px-1 w-full xl:w-auto">
                    {weekDays.map((item, idx) => {
                        const isActive = item.dateStr === selectedDate;
                        return (
                            <button
                                key={idx}
                                onClick={() => {
                                    if (item.dateStr === selectedDate) setRetry(value => value + 1);
                                    else setSelectedDate(item.dateStr);
                                }}
                                aria-pressed={isActive}
                                className="flex flex-col items-center gap-1 md:gap-1.5 cursor-pointer group w-9 md:w-9 outline-none"
                            >
                                <span className={`text-[13px] md:text-[14px] font-medium transition-colors ${isActive ? "text-blue-400 " : "text-gray-300 group-hover:text-white"}`}>
                                    {item.day}
                                </span>

                                <div className={`w-9.5 h-9.5 md:w-10 md:h-10 flex items-center justify-center rounded-lg text-sm md:text-base font-bold transition-all
                                    ${isActive
                                        ? "bg-[#5B69FF] text-white  scale-100"
                                        : "text-gray-500 bg-[var(--surface-15171c)] border border-[var(--overlay-ink)]/10 hover:border-[var(--overlay-ink)]/30 hover:bg-[var(--surface-252830)]"
                                    }`}>
                                    {item.displayDate}
                                </div>
                            </button>
                        );
                    })}
                </div>
                <div className="flex items-center gap-6 bg-[var(--surface-1a1d24)] px-6 py-3 rounded-xl border border-[var(--overlay-ink)]/5 min-w-[320px] justify-between">
                    {/* 필드보스 */}
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                            {status.bossImage ? (
                                <img src={status.bossImage} alt="보스" className="w-5 h-5 rounded-full object-cover border border-[var(--overlay-ink)]/10" />
                            ) : (
                                <Skull size={15} className={status.hasFieldBoss ? "text-gray-300" : "text-gray-600"} />
                            )}
                            <span className="text-sm font-bold text-gray-400">필드 보스</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={`text-sm sm:text-base font-bold ${status.hasFieldBoss ? "text-white" : "text-white"}`}>
                                {pending ? "불러오는 중" : error ? "확인 불가" : status.hasFieldBoss ? getDisplayTime(status.bossTimes, nextBossTime) : "일정 없음"}
                            </span>
                            {(status.hasFieldBoss && bossTimeLeft) && (
                                <span className="text-[10px] sm:text-[11px] text-gray-500 font-medium">({bossTimeLeft})</span>
                            )}
                        </div>
                    </div>

                    <div className="w-px h-8 bg-[var(--overlay-ink)]/10" />

                    {/* 카오스게이트 */}
                    <div className="flex flex-col gap-1 items-end">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-gray-400">카오스게이트</span>
                            {status.gateImage ? (
                                <img src={status.gateImage} alt="카게" className="w-5 h-5 rounded-full object-cover border border-[var(--overlay-ink)]/10" />
                            ) : (
                                <Swords size={15} className={status.hasChaosGate ? "text-gray-300" : "text-gray-600"} />
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {(status.hasChaosGate && gateTimeLeft) && (
                                <span className="text-[10px] sm:text-[11px] text-gray-500 font-medium">({gateTimeLeft})</span>
                            )}
                            <span className={`text-sm sm:text-base font-bold ${status.hasChaosGate ? "text-white" : "text-white"}`}>
                                {pending ? "불러오는 중" : error ? "확인 불가" : status.hasChaosGate ? getDisplayTime(status.gateTimes, nextGateTime) : "일정 없음"}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
            {/* 섬 목록 or 로딩 */}
            {pending ? (
                <div className="w-full h-[120px] animate-pulse bg-[var(--overlay-ink)]/5 rounded-2xl" />
            ) : error ? (
                <div role="alert" className="flex min-h-[120px] flex-col items-center justify-center gap-3 rounded-2xl border border-[var(--overlay-ink)]/5 bg-[var(--surface-1a1d24)] px-4 text-center text-sm text-gray-400">
                    <p>일정을 불러오지 못했어요.</p>
                    <button type="button" onClick={() => setRetry(value => value + 1)} className="rounded px-3 py-1 text-[#5B69FF] hover:underline">다시 불러오기</button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {islands.length > 0 ? islands.map(item => {
                        const nextIslandTime = getNextTime(item.times);
                        const isFinished = nextIslandTime === "END";
                        const timeLeft = getTimeLeftStr(nextIslandTime);
                        const displayTime = getDisplayTime(item.times, nextIslandTime);

                        const isDimmed = isFinished || isPastDate(selectedDate);

                        return (
                            <IslandScheduleDetails key={`${selectedDate}-${item.name}`} item={item}>
                            <div className={`relative flex flex-col p-4 rounded-2xl border border-[var(--overlay-ink)]/5 bg-[var(--surface-1a1d24)] transition-all h-[115px] group ${isDimmed ? "opacity-50 grayscale" : ""}`}>

                                {/* 1. [상단] 이름/이미지 영역 (flex-1로 남는 공간 차지) */}
                                <div className="flex-1 flex justify-between items-start min-w-0">
                                    <div className="flex items-center gap-3 min-w-0 w-full">
                                        <div className="w-7.5 h-7.5 rounded-lg bg-[var(--surface-252830)] border border-[var(--overlay-ink)]/5 overflow-hidden shrink-0">
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

                                {/* my-3: 위아래 간격, h-px: 1픽셀 높이, bg-[var(--overlay-ink)]/5: 선 색상 */}
                                <div className="w-full h-[0.5px] bg-[var(--overlay-ink)]/5 mb-3 mt-2 shrink-0" />

                                {/* 3. [하단] 보상/시간 영역 (높이 고정 h-[36px]) */}
                                {/* 높이를 고정했기 때문에 내용이 1줄이든 2줄이든 카드 모양이 변하지 않음 */}
                                <div className="h-[36px] flex justify-between items-center shrink-0 w-full">

                                    {/* 보상 아이콘 */}
                                    <div className="flex gap-1.5 overflow-hidden">
                                        {item.rewardItems.slice(0, 5).map((reward, rIdx) => (
                                            <div key={rIdx} className="relative group/reward">
                                                <img
                                                    src={reward.icon}
                                                    alt={reward.name}
                                                    className="w-6 h-6 rounded bg-[var(--surface-252830)] border border-[var(--overlay-ink)]/10 object-cover opacity-80 group-hover/reward:opacity-100 transition-opacity"
                                                />
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
                            </IslandScheduleDetails>
                        );
                    }) : (
                        <div className="md:col-span-3 min-h-[120px] flex items-center justify-center text-gray-500 text-sm bg-[var(--surface-1a1d24)] border border-[var(--overlay-ink)]/5 rounded-2xl">
                            선택한 날짜에 제공된 모험 섬 일정이 없습니다.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
