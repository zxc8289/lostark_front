"use client";

import { useSession } from "next-auth/react";
import React, { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo } from "react";

type WSContextType = {
    ws: WebSocket | null;
    sendMessage: (msg: any) => void;
    joinRoom: (roomKey: string) => void;
    addPartyId: (partyId: number | string) => void;
};

const WebSocketContext = createContext<WSContextType | null>(null);

export const useGlobalWebSocket = () => {
    return useContext(WebSocketContext);
};

export default function WebSocketProvider({ children }: { children: React.ReactNode }) {
    const { data: session, status } = useSession();
    const wsRef = useRef<WebSocket | null>(null);
    const [ws, setWs] = useState<WebSocket | null>(null);
    const myPartyIdsRef = useRef<string[]>([]);
    const messageQueue = useRef<any[]>([]);
    // 🔥 추가: ping 타이머를 관리할 Ref
    const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const userId = (session?.user as any)?.id || (session?.user as any)?.userId;

    // 🔥 추가: sendMessage를 위로 올려서 다른 함수들(joinRoom 등)에서 에러 없이 참조하도록 함
    const sendMessage = useCallback((msg: any) => {
        const finalMsg = { ...msg };

        const isMyUpdate = finalMsg.userId === userId;
        const isTargetType = finalMsg.type === "gateUpdate" || finalMsg.type === "activeAccountUpdate";

        // 내 데이터를 보낼 때 무조건 브라우저가 기억하는 '모든 파티방' 아이디를 쑤셔 넣음
        if (isTargetType && isMyUpdate) {
            if (myPartyIdsRef.current && myPartyIdsRef.current.length > 0) {
                finalMsg.partyIds = Array.from(new Set(myPartyIdsRef.current));
            }
        }

        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(finalMsg));
        } else {
            messageQueue.current.push(finalMsg);
        }
    }, [userId]);

    const joinRoom = useCallback((roomKey: string) => {
        sendMessage({ type: "joinRoom", roomKey });
    }, [sendMessage]);


    useEffect(() => {
        if (status !== "authenticated" || !userId) return;

        let socket: WebSocket | null = null;
        // 🔥 추가: 재연결 타이머 관리를 위한 변수
        let reconnectTimeout: NodeJS.Timeout | null = null;

        async function connect() {
            try {
                let partyIds = "";

                try {
                    const savedIds = localStorage.getItem(`ws_party_ids_${userId}`);
                    if (savedIds) {
                        myPartyIdsRef.current = JSON.parse(savedIds);
                    }
                } catch (e) { }

                try {
                    const res = await fetch("/api/party-tasks", { cache: "no-store" });
                    if (res.ok) {
                        const text = await res.text();
                        const data = text ? JSON.parse(text) : null;
                        if (data) {
                            let extracted: any[] = [];
                            if (Array.isArray(data)) extracted = data;
                            else if (data.parties && Array.isArray(data.parties)) extracted = data.parties;
                            else if (data.list && Array.isArray(data.list)) extracted = data.list;
                            else if (data.data && Array.isArray(data.data)) extracted = data.data;

                            const pIds = extracted.map(p => p.id || p.partyId || p).filter(Boolean);

                            // 로컬 캐시와 API 결과를 합침 (중복 제거)
                            const merged = Array.from(new Set([...myPartyIdsRef.current, ...pIds.map(String)]));
                            myPartyIdsRef.current = merged;

                            localStorage.setItem(`ws_party_ids_${userId}`, JSON.stringify(merged));
                        }
                    }
                } catch (e) {
                    // console.warn("[WS] 파티 목록 API 로드 실패 (로컬 캐시를 대신 사용합니다)", e);
                }

                partyIds = myPartyIdsRef.current.join(",");

                const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:4000";
                const connectUrl = `${wsUrl}/ws?userId=${userId}&partyIds=${partyIds}`;

                socket = new WebSocket(connectUrl);

                socket.onopen = () => {
                    // console.log("[WS] 전역 연결 성공! 🟢 동기화 대상 파티:", partyIds || "없음");
                    wsRef.current = socket;
                    setWs(socket);

                    while (messageQueue.current.length > 0) {
                        const queuedMsg = messageQueue.current.shift();
                        socket?.send(JSON.stringify(queuedMsg));
                    }

                    // 🔥 추가: 30초마다 서버로 생존 신고(ping) 전송
                    if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
                    pingIntervalRef.current = setInterval(() => {
                        if (socket?.readyState === WebSocket.OPEN) {
                            socket.send(JSON.stringify({ type: "ping" }));
                        }
                    }, 30000);
                };

                // 🔥 추가: 핑에 대한 퐁(pong) 응답 확인 (선택적 구현이지만 혹시 모를 로깅을 위해 남겨둠)
                socket.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        if (data.type === "pong") {
                            // 핑퐁 정상 작동 확인 (필요시 주석 해제하여 테스트)
                            // console.log("서버로부터 pong 수신 성공!");
                        }
                    } catch (e) { }
                };

                socket.onclose = () => {
                    // console.warn("[WS] 연결 끊김. 3초 후 재연결 시도...");
                    wsRef.current = null;
                    setWs(null);

                    // 🔥 추가: 끊어졌을 때 핑 타이머 제거
                    if (pingIntervalRef.current) {
                        clearInterval(pingIntervalRef.current);
                        pingIntervalRef.current = null;
                    }

                    // 🔥 추가: 자동 재연결 로직
                    reconnectTimeout = setTimeout(() => {
                        connect();
                    }, 3000);
                };
            } catch (e) {
                console.error("WS Connect Error", e);
                // 연결 실패 시에도 3초 후 재시도
                reconnectTimeout = setTimeout(() => {
                    connect();
                }, 3000);
            }
        }

        connect();

        return () => {
            if (socket) socket.close();
            if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
            if (reconnectTimeout) clearTimeout(reconnectTimeout);
        };
    }, [status, userId]);

    // 🔥 수정: 페이지 이동 시마다 방 번호를 기억하고 동시에 웹소켓 방 입장 메시지(joinRoom)도 서버로 전송
    const addPartyId = useCallback((partyId: string | number) => {
        const idStr = String(partyId);
        if (!myPartyIdsRef.current.includes(idStr)) {
            myPartyIdsRef.current.push(idStr);
            try {
                localStorage.setItem(`ws_party_ids_${userId}`, JSON.stringify(myPartyIdsRef.current));
            } catch (e) { }

            // 🔥 추가된 부분: SPA 환경에서 새 방 번호가 생겼을 때 바로 서버에 알려줌
            joinRoom(`party:${idStr}`);
        }
    }, [userId, joinRoom]);

    const contextValue = useMemo(() => ({ ws, sendMessage, joinRoom, addPartyId }), [ws, sendMessage, joinRoom, addPartyId]);

    return (
        <WebSocketContext.Provider value={contextValue}>
            {children}
        </WebSocketContext.Provider>
    );
}