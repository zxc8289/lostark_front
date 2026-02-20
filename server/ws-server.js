const { WebSocketServer, WebSocket } = require("ws");

const PORT = Number(process.env.WS_PORT ?? 4000);

const rooms = new Map(); // Map<string, Set<WebSocket>>
const wss = new WebSocketServer({ port: PORT });

console.log(`[WS] Server started on port ${PORT}`);

wss.on("connection", (ws, req) => {
    const url = new URL(req.url || "/", "http://localhost");
    const userId = url.searchParams.get("userId");
    const partyIdsParam = url.searchParams.get("partyIds");

    console.log(`[WS] 접속 성공! User: ${userId} / Parties: ${partyIdsParam}`);

    const joinedRooms = new Set();

    if (userId) joinRoom(ws, `user:${userId}`, joinedRooms);

    if (partyIdsParam) {
        const ids = partyIdsParam.split(",");
        ids.forEach((id) => {
            if (id.trim()) joinRoom(ws, `party:${id.trim()}`, joinedRooms);
        });
    }

    ws.on("message", (data) => {
        let msg;
        try {
            msg = JSON.parse(data.toString());
        } catch (e) {
            return;
        }

        // 🔥 추가: 프론트엔드의 생존 신고(ping)를 처리
        if (msg.type === "ping") {
            // "pong"으로 대답해주어 프론트엔드가 서버가 살아있음을 알게 함
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: "pong" }));
            }
            return; // 핑 메시지는 아래의 동기화 로직으로 넘어가지 않도록 즉시 종료
        }

        // 🔥 프론트엔드가 기다리는 이름(memberUpdated / activeAccountUpdated)으로 변환
        if (msg.type === "gateUpdate") {
            const outMsg = { ...msg, type: "memberUpdated" };

            // 🔥 내가 속한 "모든" 파티에 브로드캐스트 (글로벌 동기화의 핵심)
            if (msg.partyIds && Array.isArray(msg.partyIds)) {
                msg.partyIds.forEach(pid => broadcastToRoom(`party:${pid}`, outMsg));
            } else if (msg.partyId) {
                broadcastToRoom(`party:${msg.partyId}`, outMsg);
            }
            if (msg.userId) broadcastToRoom(`user:${msg.userId}`, outMsg);

        } else if (msg.type === "activeAccountUpdate") {
            const outMsg = { ...msg, type: "activeAccountUpdated" };

            if (msg.partyIds && Array.isArray(msg.partyIds)) {
                msg.partyIds.forEach(pid => broadcastToRoom(`party:${pid}`, outMsg));
            } else if (msg.partyId) {
                broadcastToRoom(`party:${msg.partyId}`, outMsg);
            }
            if (msg.userId) broadcastToRoom(`user:${msg.userId}`, outMsg);

        } else if (msg.type === "joinRoom") {
            joinRoom(ws, msg.roomKey, joinedRooms);
        }
    });

    ws.on("close", () => {
        joinedRooms.forEach((roomKey) => {
            const room = rooms.get(roomKey);
            if (room) {
                room.delete(ws);
                if (room.size === 0) rooms.delete(roomKey);
            }
        });
    });
});

function joinRoom(ws, roomKey, joinedRoomsSet) {
    if (!rooms.has(roomKey)) rooms.set(roomKey, new Set());
    rooms.get(roomKey).add(ws);
    joinedRoomsSet.add(roomKey);
}

function broadcastToRoom(roomKey, payload) {
    const room = rooms.get(roomKey);
    if (!room) return;
    const data = JSON.stringify(payload);
    for (const client of room) {
        if (client.readyState === WebSocket.OPEN) client.send(data);
    }
}