"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useMyTasksCtx } from "@/app/my-tasks/MyTasksContext";
import { useGlobalWebSocket } from "@/app/components/WebSocketProvider";
import { Check } from "lucide-react";
import GeneralTaskTable from "../../GeneralTaskTable";
import {
    calculateAllGeneralTasks,
    GeneralTasksData,
    LocalGeneralStorage
} from "@/app/lib/tasks/general-task-utils";

const LOCAL_STORAGE_KEY = "loa_general_tasks";

export default function GeneralTaskTab() {
    const { visibleRoster, isDragEnabled, setRosterOrder } = useMyTasksCtx();
    const { data: session, status } = useSession();
    const isAuthed = status === "authenticated";

    const { ws, sendMessage } = useGlobalWebSocket() || {};

    const [taskColumns, setTaskColumns] = useState([
        "혼돈의 균열", "가디언 토벌", "낙원의 문", "할의 모래시계"
    ]);
    const [tasksByChar, setTasksByChar] = useState<GeneralTasksData>({});
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

        // 🔥 버그 픽스: 오직 '완료 횟수'만 건드립니다.
        const newCompleted = isCurrentlyChecked ? runIndex : runIndex + 1;

        const newTasks = {
            ...tasksByChar,
            [charName]: {
                ...charTasks,
                [taskName]: {
                    ...currentTask,
                    completedRuns: newCompleted
                    // restGauge는 손대지 않음!
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

    if (!isLoaded) return null;

    return (
        <div className="w-full flex flex-col gap-4 animate-in fade-in duration-300">
            <div className="bg-[#16181D] rounded-none sm:rounded-sm border-x-0 px-4 sm:px-5 py-3 sm:py-4 flex justify-between items-center">
                <div className="text-sm font-bold text-gray-200">일일 및 정기 숙제</div>
                <button
                    onClick={() => saveTasks({})}
                    className="text-xs bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded text-gray-300 transition-colors"
                >
                    전체 초기화
                </button>
            </div>

            <GeneralTaskTable
                roster={visibleRoster}
                taskColumns={taskColumns}
                tasksByChar={tasksByChar}
                onToggleTask={handleToggleTask}
                onOpenMemo={(charName) => console.log("Memo", charName)}
                onEdit={(char) => console.log("Edit", char)}
                isDragEnabled={isDragEnabled}
                onReorderTasks={(newOrder) => setTaskColumns(newOrder)}
                onReorderRoster={(newOrder) => setRosterOrder?.(newOrder)}
            />
        </div>
    );
}