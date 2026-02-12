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

    // 🔥 선택된 날짜 (YYYY-MM-DD)
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

    // 1. 날짜 초기화 (오늘 기준 -3 ~ +3)
    useEffect(() => {
        const today = new Date();
        const days = ["일", "월", "화", "수", "목", "금", "토"];
        const weekData = [];

        // 오늘 날짜 문자열 (YYYY-MM-DD) 생성 - 로컬 시간 기준
        // (주의: 실제 서비스에서는 KST 보정이 필요할 수 있으나 여기선 브라우저 기준 사용)
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, "0");
        const day = String(today.getDate()).padStart(2, "0");
        const todayStr = `${year}-${month}-${day}`;

        if (!selectedDate) setSelectedDate(todayStr);

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

    // 2. 데이터 페칭 (selectedDate가 변경될 때마다 실행)
    const fetchData = useCallback(async (date: string) => {
        if (!date) return;
        setLoading(true);
        try {
            // 쿼리 파라미터로 선택된 날짜 전달
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

    // 실시간 타이머
    useEffect(() => {
        const timer = setInterval(() => setNowTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);


    // --- 시간 계산 헬퍼 함수들 ---

    // 선택된 날짜가 오늘인지 확인
    const isToday = (targetDateStr: string) => {
        const today = new Date();
        const y = today.getFullYear();
        const m = String(today.getMonth() + 1).padStart(2, "0");
        const d = String(today.getDate()).padStart(2, "0");
        return targetDateStr === `${y}-${m}-${d}`;
    };

    // 선택된 날짜가 과거인지 확인
    const isPastDate = (targetDateStr: string) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const target = new Date(targetDateStr);
        target.setHours(0, 0, 0, 0);
        return target < today;
    };

    const getNextTime = (times: string[]) => {
        if (!times || times.length === 0) return null;

        // 과거 날짜를 보고 있다면 -> 전부 종료
        if (isPastDate(selectedDate)) return "END";

        // 미래 날짜를 보고 있다면 -> 첫 번째 시간 반환
        if (!isToday(selectedDate)) return times[0];

        // 오늘이라면 -> 현재 시간과 비교
        const currentTotalMin = nowTime.getHours() * 60 + nowTime.getMinutes();
        const next = times.find(t => {
            const [h, m] = t.split(":").map(Number);
            return (h * 60 + m) > currentTotalMin;
        });
        return next || "END";
    };

    const getTimeLeftStr = (targetTimeStr: string | null) => {
        // 오늘이 아니거나, 시간이 없거나, 끝났으면 표시 안 함
        if (!isToday(selectedDate) || !targetTimeStr || targetTimeStr === "END") return "";

        const [h, m] = targetTimeStr.split(":").map(Number);
        const targetDate = new Date();
        targetDate.setHours(h, m, 0, 0);

        const diff = targetDate.getTime() - nowTime.getTime();

        // 시간이 지났으면 빈 문자열 반환 (혹은 "0:00:00"으로 표시하려면 수정 가능)
        if (diff < 0) return "";

        const totalSec = Math.floor(diff / 1000);
        const hh = Math.floor(totalSec / 3600);
        const mm = Math.floor((totalSec % 3600) / 60);
        const ss = totalSec % 60;

        // 🔥 [수정] 1:28:27 형식으로 포맷팅
        // 분(mm)과 초(ss)는 항상 두 자리(00)로 맞춤
        const hhStr = String(hh).padStart(2, "0");
        const mmStr = String(mm).padStart(2, "0");
        const ssStr = String(ss).padStart(2, "0");

        // 시간이 0이어도 "0:25:10" 처럼 표시해서 폭을 일정하게 유지하는 것이 좋습니다.
        return `${hhStr}:${mmStr}:${ssStr}`;
    };

    // --- 렌더링 ---

    const nextBossTime = getNextTime(status.bossTimes);
    const nextGateTime = getNextTime(status.gateTimes);
    const bossTimeLeft = getTimeLeftStr(nextBossTime);
    const gateTimeLeft = getTimeLeftStr(nextGateTime);

    // 날짜별 상태 메시지 처리
    const getDisplayTime = (times: string[], nextTime: string | null) => {
        if (!times || times.length === 0) return "일정 없음";

        // 과거 날짜 -> 종료
        if (isPastDate(selectedDate)) {
            const lastTime = times[times.length - 1];
            return `${lastTime}`;
        }

        // 미래 날짜 -> 첫 시간
        if (!isToday(selectedDate)) {
            return times[0];
        }

        // 오늘
        if (nextTime === "END") {
            const lastTime = times[times.length - 1];
            return `${lastTime}`;
        }
        return nextTime;
    };


    return (
        <div className="w-full h-full flex flex-col gap-6 p-1">

            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5 border-b border-white/5 pb-5">
                <div className="flex justify-between gap-5 px-1 w-full xl:w-auto">
                    {weekDays.map((item, idx) => {
                        const isActive = item.dateStr === selectedDate;
                        return (
                            <button
                                key={idx}
                                onClick={() => setSelectedDate(item.dateStr)}
                                className="flex flex-col items-center gap-1.5 cursor-pointer group w-9 outline-none"
                            >
                                <span className={`text-[14px] font-medium transition-colors ${isActive ? "text-blue-400 " : "text-gray-300 group-hover:text-white"}`}>
                                    {item.day}
                                </span>
                                <div className={`w-10 h-10 flex items-center justify-center rounded-lg text-base font-bold transition-all
                                    ${isActive
                                        ? "bg-[#5B69FF] text-white shadow-[0_0_12px_rgba(91,105,255,0.5)] scale-100"
                                        : "text-gray-500 bg-[#15171C] border border-white/10 hover:border-white/30 hover:bg-[#252830]"
                                    }`}>
                                    {item.displayDate}
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* 상태창 */}
                <div className="flex items-center gap-6 bg-[#1A1D24] px-6 py-3 rounded-xl border border-white/5 shadow-inner min-w-[320px] justify-between">
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
                            <span className={`text-base font-bold ${status.hasFieldBoss ? "text-white" : "text-white"}`}>
                                {status.hasFieldBoss ? getDisplayTime(status.bossTimes, nextBossTime) : "일정 없음"}
                            </span>
                            {bossTimeLeft && <span className="text-[11px] text-gray-500 font-medium ">({bossTimeLeft})</span>}
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
                            {gateTimeLeft && <span className="text-[11px] text-gray-500 font-medium">({gateTimeLeft})</span>}
                            <span className={`text-base font-bold ${status.hasChaosGate ? "text-white" : "text-white"}`}>
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
                            <div key={idx} className={`relative flex flex-col p-4 rounded-2xl border border-white/5 bg-[#1A1D24] transition-all h-[115px] shadow-lg group ${isDimmed ? "opacity-50 grayscale" : ""}`}>

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