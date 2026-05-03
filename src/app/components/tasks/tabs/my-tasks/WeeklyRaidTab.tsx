"use client";

import { useMyTasksCtx } from "@/app/my-tasks/MyTasksContext";
import AnimatedNumber from "../../AnimatedNumber";
import TaskTable from "../../TaskTable";
import CharacterTaskStrip from "../../CharacterTaskStrip";
import { Check, RefreshCcw, Settings, X } from "lucide-react";
import { closestCenter, DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function SortableCardStripWrapper({ id, character, tasks, onEdit, onReorderTask, isDragEnabled, onAllClear, hasMemo, onOpenMemo }: any) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
        position: isDragging ? ("relative" as const) : ("static" as const),
        zIndex: isDragging ? 10 : 1,
    };

    return (
        <div ref={setNodeRef} style={style}>
            <CharacterTaskStrip
                character={character}
                tasks={tasks}
                onEdit={onEdit}
                onAllClear={onAllClear}
                onReorder={onReorderTask}
                isDragEnabled={isDragEnabled}
                dragHandleProps={{ ...attributes, ...listeners }}
                hasMemo={hasMemo}
                onOpenMemo={onOpenMemo}
            />
        </div>
    );
}

export default function WeeklyRaidTab() {
    const {
        usingDemo, totalRemainingTasks, remainingCharacters, totalRemainingGold, isAllCleared,
        totalGold, totalBoundGold, totalRemainingBoundGold, isAllView, setShowAllViewWarning,
        handleMyRefreshAccount, isRefreshing, setAutoSetupConfirmOpen, showAutoSetupSettings,
        setShowAutoSetupSettings, autoSetupCharCount, setAutoSetupCharCount, autoSetupSortType,
        setAutoSetupSortType, gateAllClear, effectiveHasRoster, setIsCharSettingOpen,
        isCardView, isTableEmpty, isRaidFilterActive, onlyRemain,
        tableRoster, tablePrefsByChar, tableOrderForView, setMemoTarget, setTableOrder,
        handleTableToggleGate, setEditingChar, rosterOrder, isDragEnabled, setRosterOrder,
        visibleRoster, cardRosterOrder, buildTasksFor, effectivePrefsByChar,
        handleSingleCharacterAllClear, setCharPrefs, setCardRosterOrder, currentActiveAccount
    } = useMyTasksCtx();

    const cardSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

    function mergeReorderedSubset(full: string[], subset: string[], subsetNew: string[]) {
        const subsetSet = new Set(subset);
        const baseFull = full.length ? full : subset;
        const result: string[] = [];
        let k = 0;

        for (const name of baseFull) {
            if (subsetSet.has(name)) {
                result.push(subsetNew[k++] ?? name);
            } else {
                result.push(name);
            }
        }

        for (; k < subsetNew.length; k++) {
            if (!result.includes(subsetNew[k])) result.push(subsetNew[k]);
        }
        return result;
    }

    const handleCardDragEnd = (e: DragEndEvent) => {
        const { active, over } = e;
        if (!over || active.id === over.id) return;

        const sortedRoster = [...visibleRoster].sort((a: any, b: any) => {
            const diff = (b.itemLevelNum ?? 0) - (a.itemLevelNum ?? 0);
            if (!cardRosterOrder.length) return diff;
            const idxA = cardRosterOrder.indexOf(a.name);
            const idxB = cardRosterOrder.indexOf(b.name);
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
            return diff;
        });

        const visibleCardStrips = sortedRoster.map(c => ({ character: c, tasks: buildTasksFor(c) }))
            .filter(item => {
                if (onlyRemain && item.tasks.length === 0) return false;
                if (isRaidFilterActive && item.tasks.length === 0) return false;
                return true;
            });

        const subset = visibleCardStrips.map((s) => s.character.name);
        const oldIndex = subset.indexOf(String(active.id));
        const newIndex = subset.indexOf(String(over.id));

        if (oldIndex !== -1 && newIndex !== -1) {
            const newSubsetOrder = arrayMove(subset, oldIndex, newIndex);
            setCardRosterOrder((prev: string[]) => {
                const merged = mergeReorderedSubset(prev, subset, newSubsetOrder);
                try { localStorage.setItem("raidTaskCardRosterOrder", JSON.stringify(merged)); } catch { }
                // 웹소켓 동기화 로직은 Context 안의 setCardRosterOrder 자체에서 처리하게 구성되어 있거나 상위에서 처리해야 함. 
                // 기존 코드 구조상 setCardRosterOrder가 useState의 setState라면 웹소켓 로직은 useEffect로 page.tsx에 있음.
                return merged;
            });
        }
    };

    return (
        <>
            <div className="bg-[#16181D] rounded-none sm:rounded-sm border-x-0 px-4 sm:px-5 py-3 sm:py-4">
                <div className="flex flex-wrap gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between max-[1246px]:flex-col max-[1246px]:items-start max-[1246px]:justify-start">
                    <div className="flex items-center gap-1.5 sm:gap-4 text-[10.5px] sm:text-base min-w-0">
                        {/* 남은 숙제 */}
                        <div className="flex items-baseline gap-1 sm:gap-1.5">
                            <span className="font-semibold text-[10.5px] sm:text-[17px] pr-0.5 sm:pr-1">남은 숙제</span>
                            <AnimatedNumber value={totalRemainingTasks} className="text-gray-400 text-[10.5px] sm:text-sm font-semibold" />
                        </div>

                        <span className="inline sm:hidden h-3 w-px bg-white/10" />
                        <span className="hidden sm:inline h-4 w-px bg-white/10" />

                        {/* 남은 캐릭터 */}
                        <div className="flex items-baseline gap-1 sm:gap-1.5">
                            <span className="font-semibold text-[10.5px] sm:text-[17px] pr-0.5 sm:pr-1">
                                <span className="sm:hidden">남은 캐릭</span>
                                <span className="hidden sm:inline">숙제 남은 캐릭터</span>
                            </span>
                            <AnimatedNumber value={remainingCharacters} className="text-gray-400 text-[10.5px] sm:text-sm font-semibold" />
                        </div>

                        <span className="inline sm:hidden h-3 w-px bg-white/10" />
                        <span className="hidden sm:inline h-4 w-px bg-white/10" />

                        {/* 골드 */}
                        <div className="flex items-baseline gap-1 sm:gap-1.5">
                            <span className="font-semibold text-[10.5px] sm:text-[17px] pr-0.5 sm:pr-1">골드</span>
                            <div className={["inline-flex items-baseline justify-end", "min-w-[38px] sm:min-w-[50px]", "text-[10.5px] sm:text-sm font-semibold", "tabular-nums", isAllCleared ? "line-through decoration-gray-300 decoration-1 text-gray-400" : "text-gray-400"].join(" ")}>
                                <AnimatedNumber value={isAllCleared ? totalGold : totalRemainingGold} />
                                <span className="ml-[1px] text-[8.5px] sm:text-[0.75em]">g</span>
                            </div>
                        </div>

                        <span className="inline sm:hidden h-3 w-px bg-white/10" />
                        <span className="hidden sm:inline h-4 w-px bg-white/10" />

                        {/* 귀속 골드 */}
                        <div className="flex items-baseline gap-1 sm:gap-1.5">
                            <span className="font-semibold text-[10.5px] sm:text-[17px] pr-0.5 sm:pr-1">
                                <span className="sm:hidden">귀속</span>
                                <span className="hidden sm:inline">귀속 골드</span>
                            </span>
                            <div className={["inline-flex items-baseline justify-end", "min-w-[38px] sm:min-w-[50px]", "text-[10.5px] sm:text-sm font-semibold", "tabular-nums", isAllCleared ? "line-through decoration-gray-300 decoration-1 text-gray-400" : "text-gray-400"].join(" ")}>
                                <AnimatedNumber value={isAllCleared ? totalBoundGold : totalRemainingBoundGold} />
                                <span className="ml-[1px] text-[8.5px] sm:text-[0.75em]">g</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-row flex-wrap gap-2 sm:gap-3 items-center">
                        {!usingDemo && (
                            <button
                                onClick={() => { if (isAllView) { setShowAllViewWarning(true); return; } handleMyRefreshAccount(); }}
                                disabled={isRefreshing}
                                className={`p-2 rounded-lg transition-colors ${isRefreshing ? "text-indigo-400 cursor-not-allowed" : isAllView ? "text-gray-600 opacity-50 cursor-pointer" : "text-gray-400 hover:text-white hover:bg-white/5"}`}
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
                            <span>관문 초기화</span>
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
            </div>

            {!isCardView ? (
                isTableEmpty ? (
                    isRaidFilterActive ? null : (
                        onlyRemain ? (
                            <div className="flex flex-col items-center justify-center py-14 rounded-none sm:rounded-xl border-x-0 sm:border border-white/5 bg-white/[0.02] animate-in fade-in zoom-in-95 duration-300">
                                <div className="relative mb-4">
                                    <div className="absolute inset-0 bg-emerald-500 blur-[24px] opacity-20 rounded-full" />
                                    <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[#16181D] border border-emerald-500/30 shadow-lg shadow-emerald-900/20">
                                        <Check className="h-7 w-7 text-emerald-400" strokeWidth={3} />
                                    </div>
                                </div>
                                <h3 className="text-gray-200 font-bold text-base">모든 숙제 완료!</h3>
                                <p className="text-gray-500 text-xs mt-1.5 font-medium">이번 주 숙제를 모두 끝내셨습니다</p>
                            </div>
                        ) : null
                    )
                ) : (
                    <TaskTable
                        key={`table-${isAllView ? 'all' : currentActiveAccount?.id}`}
                        roster={tableRoster}
                        prefsByChar={tablePrefsByChar}
                        tableOrder={tableOrderForView}
                        onOpenMemo={(charName: string, memo: string) => setMemoTarget({ charName, currentMemo: memo })}
                        onReorderTable={setTableOrder}
                        onToggleGate={handleTableToggleGate}
                        onEdit={setEditingChar}
                        rosterOrder={rosterOrder}
                        isDragEnabled={isDragEnabled}
                        onReorderRoster={(newOrder: string[]) => {
                            const subset = tableRoster.map((c: any) => c.name);
                            setRosterOrder((prev: string[]) => mergeReorderedSubset(prev, subset, newOrder));
                        }}
                    />
                )
            ) : (
                <div className="flex flex-col gap-4">
                    {(() => {
                        const sortedRoster = [...visibleRoster].sort((a: any, b: any) => {
                            const diff = (b.itemLevelNum ?? 0) - (a.itemLevelNum ?? 0);
                            if (!cardRosterOrder.length) return diff;
                            const idxA = cardRosterOrder.indexOf(a.name);
                            const idxB = cardRosterOrder.indexOf(b.name);
                            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                            if (idxA !== -1) return -1;
                            if (idxB !== -1) return 1;
                            return diff;
                        });

                        const visibleCardStrips = sortedRoster.map(c => ({
                            character: c,
                            tasks: buildTasksFor(c)
                        })).filter(item => {
                            if (onlyRemain && item.tasks.length === 0) return false;
                            if (isRaidFilterActive && item.tasks.length === 0) return false;
                            return true;
                        });

                        if (visibleCardStrips.length === 0) {
                            if (isRaidFilterActive) return null;
                            if (onlyRemain) {
                                return (
                                    <div className="flex flex-col items-center justify-center py-14 rounded-none sm:rounded-xl border-x-0 sm:border border-white/5 bg-white/[0.02] animate-in fade-in zoom-in-95 duration-300">
                                        <div className="relative mb-4">
                                            <div className="absolute inset-0 bg-emerald-500 blur-[24px] opacity-20 rounded-full" />
                                            <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[#16181D] border border-emerald-500/30 shadow-lg shadow-emerald-900/20">
                                                <Check className="h-7 w-7 text-emerald-400" strokeWidth={3} />
                                            </div>
                                        </div>
                                        <h3 className="text-gray-200 font-bold text-base">모든 숙제 완료!</h3>
                                        <p className="text-gray-500 text-xs mt-1.5 font-medium">이번 주 숙제를 모두 끝내셨습니다</p>
                                    </div>
                                );
                            }
                            return null;
                        }

                        return (
                            <DndContext sensors={cardSensors} collisionDetection={closestCenter} onDragEnd={handleCardDragEnd}>
                                <SortableContext items={visibleCardStrips.map(s => s.character.name)} strategy={verticalListSortingStrategy}>
                                    <div className="flex flex-col gap-4" key={`cards-${isAllView ? 'all' : currentActiveAccount?.id}`}>
                                        {visibleCardStrips.map(({ character, tasks }) => {
                                            const charMemo = effectivePrefsByChar[character.name]?.memo || "";
                                            return (
                                                <SortableCardStripWrapper
                                                    key={character.name}
                                                    id={character.name}
                                                    character={character}
                                                    tasks={tasks}
                                                    isDragEnabled={isDragEnabled}
                                                    onEdit={() => setEditingChar(character)}
                                                    onAllClear={() => handleSingleCharacterAllClear(character.name)}
                                                    onReorderTask={(char: any, newOrderIds: any) => {
                                                        if (isRaidFilterActive) return;
                                                        setCharPrefs(char.name, (cur: any) => ({ ...cur, order: newOrderIds }));
                                                    }}
                                                    hasMemo={!!charMemo}
                                                    onOpenMemo={() => setMemoTarget({ charName: character.name, currentMemo: charMemo })}
                                                />
                                            );
                                        })}
                                    </div>
                                </SortableContext>
                            </DndContext>
                        );
                    })()}
                </div>
            )}
        </>
    );
}