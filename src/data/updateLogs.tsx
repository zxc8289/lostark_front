// src/data/updateLogs.ts

export type UpdateLogType = "New" | "Fix" | "Update";

export interface UpdateLog {
    id: number;
    date: string;
    type: UpdateLogType;
    content: string;
}

export const UPDATE_LOGS: UpdateLog[] = [
    { id: 1, date: "26.01.07", type: "Update", content: "세르카 추가 및 레이드 골드 보상 최신화" },
    { id: 2, date: "26.01.18", type: "Update", content: "레이드 테이블 넘김 방식을 페이지 단위로 개선" },
    { id: 3, date: "26.01.19", type: "Update", content: "레이드 자동 세팅 정렬 기준 변경 (레벨순 → 골드순)" },

];