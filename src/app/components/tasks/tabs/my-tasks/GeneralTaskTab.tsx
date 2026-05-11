"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useMyTasksCtx } from "@/app/my-tasks/MyTasksContext";
import { useGlobalWebSocket } from "@/app/components/WebSocketProvider";
import { Check, RefreshCcw, Settings, X } from "lucide-react";
import GeneralTaskTable from "../../GeneralTaskTable";
import {
    calculateAllGeneralTasks,
    GeneralTasksData,
    LocalGeneralStorage
} from "@/app/lib/tasks/general-task-utils";

const LOCAL_STORAGE_KEY = "loa_general_tasks";

export default function GeneralTaskTab() {
    const {
        visibleRoster, isDragEnabled, setRosterOrder,
        usingDemo, isAllView, setShowAllViewWarning,
        handleMyRefreshAccount, isRefreshing,
        setAutoSetupConfirmOpen, showAutoSetupSettings, setShowAutoSetupSettings,
        autoSetupCharCount, setAutoSetupCharCount,
        autoSetupSortType, setAutoSetupSortType,
        gateAllClear, effectiveHasRoster, setIsCharSettingOpen,
        // 🔥 메모와 편집 기능에 필요한 데이터와 함수들을 Context에서 꺼내옵니다.
        effectivePrefsByChar, setEditingChar, setMemoTarget
    } = useMyTasksCtx();

    const { data: session, status } = useSession();
    const isAuthed = status === "authenticated";

    const { ws, sendMessage } = useGlobalWebSocket() || {};

    const [taskColumns, setTaskColumns] = useState([
        "혼돈의 균열", "가디언 토벌", "낙원의 문", "할의 모래시계"
    ]);
    const [tasksByChar, setTasksByChar] = useState<GeneralTasksData>({});

    // 상태는 유지하되 렌더링을 막는 용도로는 사용하지 않습니다.
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        if (!ws || !isAuthed || !session?.user) return;
        const myUserId = (session.user as any).id || (session.user as any).userId;

        const handleMessage = (event: MessageEvent) => {
            try {
                const msg = JSON.parse(event.data);
                if (msg.type === "generalTaskUpdate" && msg.userId === myUserId) {
                    setTasksByChar(msg.tasksByChar);
                }
            } catch (e) { }
        };
        ws.addEventListener("message", handleMessage);
        return () => ws.removeEventListener("message", handleMessage);
    }, [ws, isAuthed, session]);

    useEffect(() => {
        if (status === "loading") return;

        const loadData = async () => {
            if (isAuthed) {
                try {
                    const res = await fetch("/api/general-tasks", { cache: 'no-store' });
                    if (res.ok) {
                        const dbData = await res.json();
                        if (dbData && dbData.tasks) {
                            setTasksByChar(dbData.tasks);
                        }
                    }
                } catch (e) {
                    console.error("DB Fetch Error", e);
                }
            } else {
                const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
                if (saved) {
                    try {
                        const parsed: LocalGeneralStorage = JSON.parse(saved);
                        const updatedData = calculateAllGeneralTasks(parsed);
                        setTasksByChar(updatedData.tasks);
                        if (parsed.lastUpdated !== updatedData.lastUpdated) {
                            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedData));
                        }
                    } catch (e) {
                        console.error("Local Storage Parse Error", e);
                    }
                }
            }
            setIsLoaded(true);
        };
        loadData();
    }, [isAuthed, status]);

    const saveTasks = async (newTasks: GeneralTasksData) => {
        setTasksByChar(newTasks);

        if (isAuthed) {
            fetch("/api/general-tasks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tasks: newTasks }),
            }).catch(e => console.error("Save error", e));

            if (session?.user && sendMessage) {
                const userId = (session.user as any).id || (session.user as any).userId;
                sendMessage({
                    type: "generalTaskUpdate",
                    userId,
                    tasksByChar: newTasks,
                });
            }
        } else {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({
                lastUpdated: Date.now(),
                tasks: newTasks
            }));
        }
    };

    const handleToggleTask = (charName: string, taskName: string, runIndex: number) => {
        const charTasks = tasksByChar[charName] || {};
        const isWeekly = ["낙원의 문", "할의 모래시계"].includes(taskName);
        const defaultMax = taskName === "에포나 의뢰" ? 3 : 1;

        const currentTask = charTasks[taskName] || {
            completedRuns: 0,
            maxRuns: defaultMax,
            restGauge: 0,
            period: isWeekly ? "WEEKLY" : "DAILY"
        };

        const isCurrentlyChecked = runIndex < currentTask.completedRuns;
        const newCompleted = isCurrentlyChecked ? runIndex : runIndex + 1;

        const newTasks = {
            ...tasksByChar,
            [charName]: {
                ...charTasks,
                [taskName]: {
                    ...currentTask,
                    completedRuns: newCompleted
                },
            },
        };
        saveTasks(newTasks);
    };

    if (!visibleRoster || visibleRoster.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-14 rounded-xl bg-white/[0.02]">
                <Check className="h-14 w-14 text-emerald-400 mb-2" />
                <h3 className="text-gray-200 font-bold">캐릭터를 먼저 등록해주세요!</h3>
            </div>
        );
    }

    return (
        <div className="w-full flex flex-col gap-4">
            <div className="bg-[#16181D] rounded-none sm:rounded-sm border-x-0 px-4 sm:px-5 py-3 sm:py-4 flex flex-wrap items-center justify-between gap-3 sm:gap-4">
                <div className="text-sm font-bold text-gray-200">
                    일일 및 정기 숙제
                </div>

                <div className="flex flex-row flex-wrap gap-2 sm:gap-3 items-center">
                    {!usingDemo && (
                        <button
                            onClick={() => { if (isAllView) { setShowAllViewWarning(true); return; } handleMyRefreshAccount(); }}
                            disabled={isRefreshing}
                            className={`p-2 rounded-lg tㄴransition-colors ${isRefreshing ? "text-indigo-400 cursor-not-allowed" : isAllView ? "text-gray-600 opacity-50 cursor-pointer" : "text-gray-400 hover:text-white hover:bg-white/5"}`}
                            title="계정 정보 업데이트"
                        >
                            <RefreshCcw className={`w-5 h-5 ${isRefreshing ? "animate-spin" : ""}`} />
                        </button>
                    )}

                    <div className="relative flex items-center">
                        <button
                            onClick={() => { if (isAllView) { setShowAllViewWarning(true); return; } setAutoSetupConfirmOpen(true); }}
                            className={`relative group flex items-center justify-center py-2 px-6 rounded-lg bg-white/[.04] border border-white/10 text-xs sm:text-sm font-medium transition-all duration-200 ${isAllView ? 'text-gray-600 opacity-50 cursor-pointer' : 'hover:bg-white/5 hover:border-white/20 text-white'}`}
                        >
                            <span>자동 세팅</span>
                            {!isAllView && (
                                <div
                                    onClick={(e) => { e.stopPropagation(); setShowAutoSetupSettings(!showAutoSetupSettings); }}
                                    className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors duration-200 cursor-pointer"
                                    title="자동 세팅 설정"
                                >
                                    <Settings className="w-3.5 h-3.5" />
                                </div>
                            )}
                        </button>

                        {showAutoSetupSettings && (
                            <div className="absolute top-full left-0 mt-2 w-56 p-4 rounded-xl bg-[#1E2028] border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.7)] z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-xs font-bold text-white">자동 세팅 설정</h4>
                                    <button onClick={(e) => { e.stopPropagation(); setShowAutoSetupSettings(false); }} className="text-gray-400 hover:text-white">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="flex items-center justify-between gap-4 mb-4">
                                    <span className="text-[11px] text-gray-400">적용할 캐릭터 수</span>
                                    <input
                                        type="number"
                                        min={1} max={24}
                                        value={autoSetupCharCount}
                                        onChange={(e) => setAutoSetupCharCount(Number(e.target.value))}
                                        className="w-12 h-7 bg-[#0F1115] border border-white/10 rounded-md px-1 text-xs text-center text-white focus:outline-none focus:border-[#5B69FF] appearance-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    />
                                </div>

                                <div className="space-y-1.5 mb-5">
                                    <span className="text-[11px] text-gray-400 block">레이드 우선순위</span>
                                    <div className="grid grid-cols-2 gap-1 p-1 bg-[#0F1115] rounded-lg border border-white/5">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setAutoSetupSortType("latest"); }}
                                            className={`py-1.5 text-[10px] font-bold rounded-md transition-all ${autoSetupSortType === "latest" ? "bg-[#5B69FF] text-white" : "text-gray-500 hover:text-gray-300 hover:bg-white/5"}`}
                                        >
                                            최신순
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setAutoSetupSortType("gold"); }}
                                            className={`py-1.5 text-[10px] font-bold rounded-md transition-all ${autoSetupSortType === "gold" ? "bg-[#5B69FF] text-white" : "text-gray-500 hover:text-gray-300 hover:bg-white/5"}`}
                                        >
                                            골드순
                                        </button>
                                    </div>
                                </div>

                                <button
                                    onClick={(e) => { e.stopPropagation(); setAutoSetupConfirmOpen(true); setShowAutoSetupSettings(false); }}
                                    className="w-full py-2 bg-[#5B69FF] hover:bg-[#4A57E6] text-white text-[11px] font-bold rounded-lg transition-colors"
                                >
                                    적용하기
                                </button>
                                <div className="absolute -top-1.5 left-16 w-3 h-3 bg-[#1E2028] border-t border-l border-white/10 rotate-45" />
                            </div>
                        )}
                    </div>

                    <button onClick={gateAllClear} disabled={!effectiveHasRoster} className="inline-flex items-center justify-center py-2 px-3 sm:px-4 rounded-md bg-white/[.04] border border-white/10 hover:bg-white/5 text-xs sm:text-sm disabled:opacity-50">
                        <span>초기화</span>
                    </button>

                    <button
                        onClick={() => { if (isAllView) { setShowAllViewWarning(true); return; } setIsCharSettingOpen(true); }}
                        disabled={!effectiveHasRoster}
                        className={`inline-flex items-center justify-center py-2 px-3 sm:px-4 rounded-md bg-white/[.04] border border-white/10 text-xs sm:text-sm font-medium transition-colors ${isAllView ? 'text-gray-600 opacity-50 cursor-pointer' : 'hover:bg-white/5 text-white disabled:opacity-50'}`}
                    >
                        캐릭터 설정
                    </button>
                </div>
            </div>

            <GeneralTaskTable
                roster={visibleRoster}
                taskColumns={taskColumns}
                tasksByChar={tasksByChar}
                prefsByChar={effectivePrefsByChar} // 🔥 추가: 캐릭터별 메모 데이터 전달
                onToggleTask={handleToggleTask}
                onOpenMemo={(charName, currentMemo) => setMemoTarget({ charName, currentMemo })} // 🔥 수정: 실제 메모 창 열기 연결
                onEdit={setEditingChar} // 🔥 수정: 실제 캐릭터 수정 창 열기 연결
                isDragEnabled={isDragEnabled}
                onReorderTasks={(newOrder) => setTaskColumns(newOrder)}
                onReorderRoster={(newOrder) => setRosterOrder?.(newOrder)}
            />
        </div>
    );
}