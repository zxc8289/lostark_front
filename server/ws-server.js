// server/ws-server.js
const { WebSocketServer, WebSocket } = require("ws");

const PORT = Number(process.env.WS_PORT ?? 4000);

// 파티별 접속자 관리: roomKey = partyId
const partyRooms = new Map(); // Map<string, Set<WebSocket>>

const wss = new WebSocketServer({ port: PORT });

wss.on("connection", (ws, req) => {
    // 예: ws://localhost:4000/ws/party-tasks?partyId=1
    const url = new URL(req.url || "/", "http://localhost");
    const partyId = url.searchParams.get("partyId");
    const roomKey = partyId || "global";

    if (!partyRooms.has(roomKey)) {
        partyRooms.set(roomKey, new Set());
    }
    partyRooms.get(roomKey).add(ws);

    console.log("[WS] client connected to party", roomKey);

    ws.on("message", (data) => {
        // console.log("[WS] raw message:", data.toString());
        let msg;
        try {
            msg = JSON.parse(data.toString());
        } catch (e) {
            console.error("[WS] invalid JSON:", e);
            return;
        }

        if (msg.type === "gateUpdate") {
            // msg: { type, partyId, userId, prefsByChar, visibleByChar? }
            handleGateUpdate(roomKey, msg);
        }

        if (msg.type === "activeAccountUpdate") {
            handleActiveAccountUpdate(roomKey, msg);
        }
    });

    ws.on("close", () => {
        const room = partyRooms.get(roomKey);
        if (room) {
            room.delete(ws);
            if (room.size === 0) {
                partyRooms.delete(roomKey);
            }
        }
        console.log("[WS] client disconnected from party", roomKey);
    });
});

/**
 * 관문 변경 이벤트 처리
 * - 여기서는 DB 저장은 하지 않고
 * - 같은 파티 room에 브로드캐스트만 해줌
 *   (실제 DB 저장은 기존 REST API에서 계속 처리)
 */
function handleGateUpdate(roomKey, msg) {
    const { partyId, userId, prefsByChar, visibleByChar } = msg;

    if (!userId || !prefsByChar) {
        console.warn("[WS] gateUpdate: missing userId or prefsByChar");
        return;
    }

    console.log("[WS] broadcasting memberUpdated:", {
        roomKey,
        partyId,
        userId,
    });

    const payload = JSON.stringify({
        type: "memberUpdated",
        partyId,
        userId,
        prefsByChar,
        visibleByChar,
    });

    const room = partyRooms.get(roomKey);
    if (!room) return;

    for (const client of room) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(payload);
        }
    }
}

function handleActiveAccountUpdate(roomKey, msg) {
    const { partyId, userId, activeAccountId } = msg;

    const payload = JSON.stringify({
        type: "activeAccountUpdated",
        partyId,
        userId,          // 어떤 유저의 계정이 바뀌었는지
        activeAccountId, // 그 유저가 선택한 계정 ID
    });

    const room = partyRooms.get(roomKey);
    if (!room) return;

    for (const client of room) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(payload);
        }
    }
}



console.log(`[WS] listening on ws://localhost:${PORT}`);
