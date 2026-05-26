"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useMyTasksCtx } from "@/app/my-tasks/MyTasksContext";
import { useGlobalWebSocket } from "@/app/components/WebSocketProvider";
import { Check, RefreshCcw, Settings, X } from "lucide-react";
import GeneralTaskTable from "../../GeneralTaskTable";
import {
    calculateAllGeneralTasks,
    GeneralTasksData,
    LocalGeneralStorage,
} from "@/app/lib/tasks/general-task-utils";

const LOCAL_STORAGE_KEY = "loa_general_tasks";

const REST_GAUGE_TASKS = ["혼돈의 균열", "가디언 토벌"];
const REST_GAUGE_OPTIONS = [0, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200];

const REST_COST_PER_RUN = 40;
const MIN_REST_GAUGE = 0;
const MAX_REST_GAUGE = 200;

type RestGaugeEditorTarget = {
    charName: string;
    taskName: string;
};

const isRestGaugeTask = (taskName: string) =>
    REST_GAUGE_TASKS.includes(taskName);

const clampRestGauge = (value: number) =>
    Math.max(MIN_REST_GAUGE, Math.min(MAX_REST_GAUGE, value));

const getDefaultTaskStatus = (taskName: string) => {
    const isWeekly = ["낙원의 문", "할의 모래시계"].includes(taskName);
    const defaultMax = taskName === "에포나 의뢰" ? 3 : 1;

    return {
        completedRuns: 0,
        maxRuns: defaultMax,
        restGauge: 0,
        usedRestGauge: 0,
        period: isWeekly ? "WEEKLY" as const : "DAILY" as const,
    };
};

const normalizeLastUpdated = (value: unknown): number => {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }

    if (typeof value === "string") {
        const parsed = new Date(value).getTime();
        if (Number.isFinite(parsed)) {
            return parsed;
        }
    }

    return Date.now();
};

export default function GeneralTaskTab() {
    const {
        visibleRoster,
        isDragEnabled,
        setRosterOrder,
        usingDemo,
        isAllView,
        setShowAllViewWarning,
        showInitialLoading,
        handleMyRefreshAccount,
        isRefreshing,
        setAutoSetupConfirmOpen,
        showAutoSetupSettings,
        setShowAutoSetupSettings,
        autoSetupCharCount,
        setAutoSetupCharCount,
        autoSetupSortType,
        setAutoSetupSortType,
        gateAllClear,
        effectiveHasRoster,
        setIsCharSettingOpen,
        effectivePrefsByChar,
        setEditingChar,
        setMemoTarget,
    } = useMyTasksCtx();

    const { data: session, status } = useSession();
    const isAuthed = status === "authenticated";

    const { ws, sendMessage } = useGlobalWebSocket() || {};

    const [taskColumns, setTaskColumns] = useState([
        "혼돈의 균열",
        "가디언 토벌",
        "낙원의 문",
        "할의 모래시계",
    ]);

    const [tasksByChar, setTasksByChar] = useState<GeneralTasksData>({});
    const [isLoaded, setIsLoaded] = useState(false);

    const [restGaugeEditor, setRestGaugeEditor] =
        useState<RestGaugeEditorTarget | null>(null);

    const saveTasks = useCallback(
        async (newTasks: GeneralTasksData) => {
            const now = Date.now();

            setTasksByChar(newTasks);

            if (isAuthed) {
                fetch("/api/general-tasks", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        lastUpdated: now,
                        tasks: newTasks,
                    }),
                }).catch((e) => console.error("Save error", e));

                if (session?.user && sendMessage) {
                    const userId =
                        (session.user as any).id ||
                        (session.user as any).userId;

                    sendMessage({
                        type: "generalTaskUpdate",
                        userId,
                        tasksByChar: newTasks,
                    });
                }
            } else {
                localStorage.setItem(
                    LOCAL_STORAGE_KEY,
                    JSON.stringify({
                        lastUpdated: now,
                        tasks: newTasks,
                    })
                );
            }
        },
        [isAuthed, session, sendMessage]
    );

    useEffect(() => {
        if (!ws || !isAuthed || !session?.user) return;

        const myUserId =
            (session.user as any).id ||
            (session.user as any).userId;

        const handleMessage = (event: MessageEvent) => {
            try {
                const msg = JSON.parse(event.data);

                if (
                    msg.type === "generalTaskUpdate" &&
                    msg.userId === myUserId
                ) {
                    setTasksByChar(msg.tasksByChar);
                }
            } catch (e) {
                console.error("General task websocket parse error", e);
            }
        };

        ws.addEventListener("message", handleMessage);

        return () => {
            ws.removeEventListener("message", handleMessage);
        };
    }, [ws, isAuthed, session]);

    useEffect(() => {
        if (status === "loading") return;

        const loadData = async () => {
            if (isAuthed) {
                try {
                    const res = await fetch("/api/general-tasks", {
                        cache: "no-store",
                    });

                    if (res.ok) {
                        const dbData = await res.json();

                        if (dbData && dbData.tasks) {
                            const parsed: LocalGeneralStorage = {
                                lastUpdated: normalizeLastUpdated(
                                    dbData.lastUpdated ??
                                    dbData.updatedAt ??
                                    dbData.updated_at
                                ),
                                tasks: dbData.tasks,
                            };

                            const updatedData = calculateAllGeneralTasks(parsed);

                            setTasksByChar(updatedData.tasks);

                            if (parsed.lastUpdated !== updatedData.lastUpdated) {
                                await saveTasks(updatedData.tasks);
                            }
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
                            localStorage.setItem(
                                LOCAL_STORAGE_KEY,
                                JSON.stringify(updatedData)
                            );
                        }
                    } catch (e) {
                        console.error("Local Storage Parse Error", e);
                    }
                }
            }

            setIsLoaded(true);
        };

        loadData();
    }, [isAuthed, status, saveTasks]);

    const handleToggleTask = (
        charName: string,
        taskName: string,
        runIndex: number
    ) => {
        const charTasks = tasksByChar[charName] || {};

        const currentTask =
            charTasks[taskName] || getDefaultTaskStatus(taskName);

        const isCurrentlyChecked = runIndex < currentTask.completedRuns;
        const newCompleted = isCurrentlyChecked ? runIndex : runIndex + 1;

        let nextRestGauge = currentTask.restGauge ?? 0;
        let nextUsedRestGauge = currentTask.usedRestGauge ?? 0;

        if (isRestGaugeTask(taskName)) {
            if (isCurrentlyChecked) {
                // 체크해제 시 실제로 소모했던 휴식게이지만 복구
                nextRestGauge = clampRestGauge(nextRestGauge + nextUsedRestGauge);
                nextUsedRestGauge = 0;
            } else {
                // 휴식게이지가 40 이상일 때만 40 소모
                // 0~39면 인게임에서도 휴식게이지 소모가 없으므로 그대로 둠
                const consumeGauge =
                    nextRestGauge >= REST_COST_PER_RUN ? REST_COST_PER_RUN : 0;

                nextRestGauge = clampRestGauge(nextRestGauge - consumeGauge);
                nextUsedRestGauge = consumeGauge;
            }
        }

        const newTasks: GeneralTasksData = {
            ...tasksByChar,
            [charName]: {
                ...charTasks,
                [taskName]: {
                    ...currentTask,
                    completedRuns: newCompleted,
                    restGauge: nextRestGauge,
                    usedRestGauge: nextUsedRestGauge,
                },
            },
        };

        saveTasks(newTasks);
    };

    const handleOpenRestGaugeEditor = (
        charName: string,
        taskName: string,
        _newGaugeFromTable?: number
    ) => {
        if (!isRestGaugeTask(taskName)) return;

        setRestGaugeEditor({
            charName,
            taskName,
        });
    };

    const handleApplyRestGauge = (newGauge: number) => {
        if (!restGaugeEditor) return;

        const { charName, taskName } = restGaugeEditor;

        const charTasks = tasksByChar[charName] || {};
        const currentTask =
            charTasks[taskName] || getDefaultTaskStatus(taskName);

        const normalizedGauge = clampRestGauge(newGauge);

        const newTasks: GeneralTasksData = {
            ...tasksByChar,
            [charName]: {
                ...charTasks,
                [taskName]: {
                    ...currentTask,
                    restGauge: normalizedGauge,

                    // 수동 보정 시 이전 체크 소모값 제거
                    // 예: usedRestGauge 40이 남아있으면 체크해제 때 40이 잘못 복구될 수 있음
                    usedRestGauge: 0,
                },
            },
        };

        saveTasks(newTasks);
        setRestGaugeEditor(null);
    };

    const isDataLoading = status === "loading" || !isLoaded || showInitialLoading;

    if (isDataLoading) {
        return (
            <div className="w-full flex flex-col gap-4">
                <div className="bg-[#16181D] rounded-none mb-[2px] sm:rounded-sm border-x-0 px-4 sm:px-5 py-3 sm:py-4 flex flex-wrap items-center justify-between gap-3 sm:gap-4">
                    <div className="font-semibold text-[10.5px] sm:text-[17px] pr-0.5 sm:pr-1">
                        일일 및 주간 숙제
                    </div>

                    <div className="flex flex-row flex-wrap gap-2 sm:gap-3 items-center">
                        <div className="h-9 w-9 rounded-lg bg-white/[.04] border border-white/10 animate-pulse" />
                        <div className="h-9 w-[92px] rounded-lg bg-white/[.04] border border-white/10 animate-pulse" />
                        <div className="h-9 w-[72px] rounded-md bg-white/[.04] border border-white/10 animate-pulse" />
                        <div className="h-9 w-[96px] rounded-md bg-white/[.04] border border-white/10 animate-pulse" />
                    </div>
                </div>

                <TaskTableOnlySkeleton />
            </div>
        );
    }

    if (!visibleRoster || visibleRoster.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-14 rounded-xl bg-white/[0.02]">
                <Check className="h-14 w-14 text-emerald-400 mb-2" />
                <h3 className="text-gray-200 font-bold">
                    캐릭터를 먼저 등록해주세요!
                </h3>
            </div>
        );
    }

    const editingTask =
        restGaugeEditor
            ? tasksByChar[restGaugeEditor.charName]?.[restGaugeEditor.taskName]
            : null;

    const editingGauge = clampRestGauge(editingTask?.restGauge ?? 0);

    return (
        <div className="w-full flex flex-col gap-4">
            <div className="bg-[#16181D] rounded-none mb-[2px] sm:rounded-sm border-x-0 px-4 sm:px-5 py-3 sm:py-4 flex flex-wrap items-center justify-between gap-3 sm:gap-4">
                <div className="font-semibold text-[10.5px] sm:text-[17px] pr-0.5 sm:pr-1">
                    일일 및 주간 숙제
                </div>

                <div className="flex flex-row flex-wrap gap-2 sm:gap-3 items-center">
                    {!usingDemo && (
                        <button
                            onClick={() => {
                                if (isAllView) {
                                    setShowAllViewWarning(true);
                                    return;
                                }

                                handleMyRefreshAccount();
                            }}
                            disabled={isRefreshing}
                            className={`p-2 rounded-lg transition-colors ${isRefreshing
                                ? "text-indigo-400 cursor-not-allowed"
                                : isAllView
                                    ? "text-gray-600 opacity-50 cursor-pointer"
                                    : "text-gray-400 hover:text-white hover:bg-white/5"
                                }`}
                            title="계정 정보 업데이트"
                        >
                            <RefreshCcw
                                className={`w-5 h-5 ${isRefreshing ? "animate-spin" : ""
                                    }`}
                            />
                        </button>
                    )}

                    <div className="relative flex items-center">
                        <button
                            onClick={() => {
                                if (isAllView) {
                                    setShowAllViewWarning(true);
                                    return;
                                }

                                setAutoSetupConfirmOpen(true);
                            }}
                            className={`relative group flex items-center justify-center py-2 px-6 rounded-lg bg-white/[.04] border border-white/10 text-xs sm:text-sm font-medium transition-all duration-200 ${isAllView
                                ? "text-gray-600 opacity-50 cursor-pointer"
                                : "hover:bg-white/5 hover:border-white/20 text-white"
                                }`}
                        >
                            <span>자동 세팅</span>

                            {!isAllView && (
                                <div
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowAutoSetupSettings(
                                            !showAutoSetupSettings
                                        );
                                    }}
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
                                    <h4 className="text-xs font-bold text-white">
                                        자동 세팅 설정
                                    </h4>

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowAutoSetupSettings(false);
                                        }}
                                        className="text-gray-400 hover:text-white"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="flex items-center justify-between gap-4 mb-4">
                                    <span className="text-[11px] text-gray-400">
                                        적용할 캐릭터 수
                                    </span>

                                    <input
                                        type="number"
                                        min={1}
                                        max={24}
                                        value={autoSetupCharCount}
                                        onChange={(e) =>
                                            setAutoSetupCharCount(
                                                Number(e.target.value)
                                            )
                                        }
                                        className="w-12 h-7 bg-[#0F1115] border border-white/10 rounded-md px-1 text-xs text-center text-white focus:outline-none focus:border-[#5B69FF] appearance-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    />
                                </div>

                                <div className="space-y-1.5 mb-5">
                                    <span className="text-[11px] text-gray-400 block">
                                        레이드 우선순위
                                    </span>

                                    <div className="grid grid-cols-2 gap-1 p-1 bg-[#0F1115] rounded-lg border border-white/5">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setAutoSetupSortType("latest");
                                            }}
                                            className={`py-1.5 text-[10px] font-bold rounded-md transition-all ${autoSetupSortType === "latest"
                                                ? "bg-[#5B69FF] text-white"
                                                : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                                                }`}
                                        >
                                            최신순
                                        </button>

                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setAutoSetupSortType("gold");
                                            }}
                                            className={`py-1.5 text-[10px] font-bold rounded-md transition-all ${autoSetupSortType === "gold"
                                                ? "bg-[#5B69FF] text-white"
                                                : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                                                }`}
                                        >
                                            골드순
                                        </button>
                                    </div>
                                </div>

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setAutoSetupConfirmOpen(true);
                                        setShowAutoSetupSettings(false);
                                    }}
                                    className="w-full py-2 bg-[#5B69FF] hover:bg-[#4A57E6] text-white text-[11px] font-bold rounded-lg transition-colors"
                                >
                                    적용하기
                                </button>

                                <div className="absolute -top-1.5 left-16 w-3 h-3 bg-[#1E2028] border-t border-l border-white/10 rotate-45" />
                            </div>
                        )}
                    </div>


                    <button
                        onClick={() => {
                            if (isAllView) {
                                setShowAllViewWarning(true);
                                return;
                            }

                            setIsCharSettingOpen(true);
                        }}
                        disabled={!effectiveHasRoster}
                        className={`inline-flex items-center justify-center py-2 px-3 sm:px-4 rounded-md bg-white/[.04] border border-white/10 text-xs sm:text-sm font-medium transition-colors ${isAllView
                            ? "text-gray-600 opacity-50 cursor-pointer"
                            : "hover:bg-white/5 text-white disabled:opacity-50"
                            }`}
                    >
                        캐릭터 설정
                    </button>
                </div>
            </div>

            <GeneralTaskTable
                roster={visibleRoster}
                taskColumns={taskColumns}
                tasksByChar={tasksByChar}
                prefsByChar={effectivePrefsByChar}
                onToggleTask={handleToggleTask}
                onOpenMemo={(charName, currentMemo) =>
                    setMemoTarget({ charName, currentMemo })
                }
                onEdit={setEditingChar}
                isDragEnabled={isDragEnabled}
                onReorderTasks={(newOrder) => setTaskColumns(newOrder)}
                onReorderRoster={(newOrder) => setRosterOrder?.(newOrder)}
                onUpdateRestGauge={handleOpenRestGaugeEditor}
            />

            {restGaugeEditor && (
                <div
                    className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
                    onClick={() => setRestGaugeEditor(null)}
                >
                    <div
                        className="w-full max-w-[390px] rounded-2xl border border-white/10 bg-[#181B22] shadow-[0_20px_80px_rgba(0,0,0,0.65)] overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="px-5 py-4 border-b border-white/10 bg-white/[0.03]">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <div className="text-sm font-bold text-white">
                                        휴식게이지 수정
                                    </div>
                                    <div className="mt-1 text-xs text-gray-400">
                                        {restGaugeEditor.charName} · {restGaugeEditor.taskName}
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setRestGaugeEditor(null)}
                                    className="h-8 w-8 rounded-full inline-flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                                    aria-label="휴식게이지 수정 닫기"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="px-5 py-5">
                            <div className="mb-4 rounded-xl bg-[#101218] border border-white/10 px-4 py-3">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs text-gray-400">
                                        현재 설정값
                                    </span>

                                    <span className="text-lg font-black text-white tabular-nums">
                                        {editingGauge}
                                        <span className="text-sm text-gray-500 font-bold">
                                            {" "} / 200
                                        </span>
                                    </span>
                                </div>

                                <div className="flex gap-1.5">
                                    {[0, 1, 2, 3, 4].map((i) => {
                                        const barMax = (i + 1) * 40;
                                        const barMin = i * 40;
                                        const isFilled = editingGauge >= barMax;
                                        const isPartial =
                                            editingGauge >= barMin + 10 &&
                                            editingGauge < barMax;

                                        return (
                                            <div
                                                key={i}
                                                className={`h-2 flex-1 rounded-full transition-colors ${isFilled
                                                    ? "bg-[#4ade80]"
                                                    : isPartial
                                                        ? "bg-[#4ade80]/40"
                                                        : "bg-[#2A2D36]"
                                                    }`}
                                            />
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="grid grid-cols-4 gap-2">
                                {REST_GAUGE_OPTIONS.map((value) => {
                                    const active = editingGauge === value;

                                    return (
                                        <button
                                            key={value}
                                            type="button"
                                            onClick={() => handleApplyRestGauge(value)}
                                            className={`h-11 rounded-xl border text-sm font-bold transition-all ${active
                                                ? "bg-[#5B69FF] border-[#5B69FF] text-white shadow-[0_0_0_3px_rgba(91,105,255,0.18)]"
                                                : "bg-white/[0.04] border-white/10 text-gray-300 hover:bg-white/[0.08] hover:border-white/20 hover:text-white"
                                                }`}
                                        >
                                            {value}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="px-5 py-4 border-t border-white/10 bg-black/10 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setRestGaugeEditor(null)}
                                className="h-9 px-4 rounded-lg bg-white/[0.05] border border-white/10 text-sm font-medium text-gray-300 hover:bg-white/[0.08] hover:text-white transition-colors"
                            >
                                닫기
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function TaskTableOnlySkeleton() {
    return (
        <div className="bg-[#16181D] rounded-sm relative animate-pulse">
            <div className="flex items-center px-5 py-[17px]">
                <div className="h-5 w-[120px] sm:w-[220px] rounded bg-white/5" />
                <div className="ml-auto flex items-center gap-2">
                    <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-white/5" />
                    <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-white/5" />
                </div>
            </div>

            <div className="w-full overflow-hidden rounded-b-md border border-t-0 border-white/10 bg-[#111217]">
                <div className="overflow-hidden">
                    <table className="w-full text-center text-[11px] sm:text-sm text-gray-400 border-collapse table-fixed">
                        <thead className="bg-[#1E222B]">
                            <tr>
                                <th className="px-3 py-3 sm:py-4 sticky left-0 bg-[#1E222B] border-r border-white/5 w-[140px] sm:w-[210px] min-w-[120px] sm:min-w-[180px]">
                                    <div className="h-3 w-14 mx-auto rounded bg-white/5" />
                                </th>

                                {[1, 2, 3, 4, 5].map((i) => (
                                    <th key={i} className="px-2 py-3 sm:py-4">
                                        <div className="h-3 w-16 mx-auto rounded bg-white/5" />
                                    </th>
                                ))}
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-white/5">
                            {[1, 2, 3, 4, 5].map((row) => (
                                <tr key={row}>
                                    <td className="h-[60px] sm:h-[72px] px-2 sm:px-3 py-1.5 sm:py-2 sticky left-0 bg-[#111217] border-r border-white/5 w-[140px] sm:w-[210px] min-w-[120px] sm:min-w-[180px]">
                                        <div className="flex items-center justify-center w-full h-full">
                                            <div className="inline-flex items-center gap-1 sm:gap-2">
                                                <div className="w-8 h-8 sm:w-[42px] sm:h-[42px] rounded-md bg-white/5" />
                                                <div className="flex flex-col gap-[5px] sm:gap-[7px]">
                                                    <div className="h-3 w-[72px] sm:w-[110px] rounded bg-white/5" />
                                                    <div className="h-2.5 w-[58px] sm:w-[90px] rounded bg-white/5" />
                                                </div>
                                            </div>
                                        </div>
                                    </td>

                                    {[1, 2, 3, 4, 5].map((col) => (
                                        <td key={col} className="px-2 py-3 sm:py-4 align-middle">
                                            <div className="flex items-center justify-center gap-[4px] sm:gap-[5px]">
                                                <div className="w-6.5 h-6.5 sm:w-7 sm:h-7 rounded-full bg-white/5" />
                                                <div className="w-6.5 h-6.5 sm:w-7 sm:h-7 rounded-full bg-white/5" />
                                            </div>
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}