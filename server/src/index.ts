import path from "path";
import fs from "fs";
import http from "http";
import express from "express";
import { WebSocketServer, WebSocket } from "ws";
import { RoomManager } from "./RoomManager";
import { parseClientMessage } from "./validate";
import { Room } from "./Room";
import { shutdownAnalytics, SessionEndReason } from "./analytics";

// How often to ping each open connection, and how long to wait for a pong
// before assuming it's dead. Browsers reliably send a clean close frame on
// tab close/navigation, but a network drop, a sleeping laptop, or a phone
// losing signal doesn't -- without this, that connection (and the
// session-end event tied to it) could sit unresolved indefinitely, since
// plain TCP has no built-in "the other end vanished" signal on its own.
const HEARTBEAT_INTERVAL_MS = 20_000;

const PORT = Number(process.env.PORT) || 8787;
// The Expo web export (`expo export --platform web`), if present, is served
// as static files so one box hosts both the site and the game server.
const WEB_CLIENT_DIR = process.env.WEB_CLIENT_DIR || path.join(__dirname, "../web-client");

const app = express();

const webClientIndex = path.join(WEB_CLIENT_DIR, "index.html");
if (fs.existsSync(webClientIndex)) {
  app.use(express.static(WEB_CLIENT_DIR));
  app.get("*", (_req, res) => {
    res.sendFile(webClientIndex);
  });
  console.log(`[web] serving client build from ${WEB_CLIENT_DIR}`);
} else {
  console.log(`[web] no client build at ${WEB_CLIENT_DIR} — API/WS only (fine for local dev)`);
}

const roomManager = new RoomManager();

app.get("/health", (_req, res) => {
  res.json({ ok: true, rooms: roomManager.stats() });
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });

interface ConnectionState {
  room: Room | null;
  playerId: string | null;
}

// Tracked directly on each socket rather than a separate registry -- the
// heartbeat loop below already has wss.clients to iterate, it just needs
// somewhere to remember "did this one pong back last round."
type HeartbeatSocket = WebSocket & { isAlive?: boolean };

wss.on("connection", (ws: WebSocket) => {
  const state: ConnectionState = { room: null, playerId: null };
  (ws as HeartbeatSocket).isAlive = true;
  ws.on("pong", () => {
    (ws as HeartbeatSocket).isAlive = true;
  });

  ws.on("message", (raw) => {
    const msg = parseClientMessage(raw.toString());
    if (!msg) return;

    if (msg.t === "join") {
      if (state.room) return; // already joined
      const room = roomManager.assignRoom();
      const playerId = room.join(ws, msg.name, msg.avatar, msg.analyticsId);
      state.room = room;
      state.playerId = playerId;
      return;
    }

    if (msg.t === "input" && state.room && state.playerId) {
      state.room.handleInput(state.playerId, msg.dirX, msg.dirY, msg.firing);
    }
  });

  // code disambiguates why this connection ended: 1000 is a deliberate
  // clean close (Exit button, or the old connection closing right before
  // a Play Again reconnect), 1001 is the browser's own close on tab/page
  // close, anything else (including no code at all, or one supplied by
  // ws.terminate() in the heartbeat loop below) is treated as an abrupt
  // disconnect.
  ws.on("close", (code) => {
    if (state.room && state.playerId) {
      const reason: SessionEndReason = code === 1000 ? "left" : code === 1001 ? "closed_tab" : "disconnected";
      state.room.leave(state.playerId, reason);
      roomManager.reapIfEmpty(state.room);
    }
  });

  ws.on("error", () => {
    ws.close();
  });
});

// A network drop, a sleeping laptop, or a phone losing signal doesn't send
// a close frame -- without this, that connection (and the session-end
// event tied to it) could sit unresolved indefinitely. Ping everyone every
// HEARTBEAT_INTERVAL_MS; anyone who didn't pong back since the last round
// gets forcibly closed, which still runs the same "close" handling above.
const heartbeat = setInterval(() => {
  for (const client of wss.clients) {
    const ws = client as HeartbeatSocket;
    if (ws.isAlive === false) {
      ws.terminate();
      continue;
    }
    ws.isAlive = false;
    ws.ping();
  }
}, HEARTBEAT_INTERVAL_MS);

server.listen(PORT, () => {
  console.log(`[server] listening on :${PORT} (ws path: /ws)`);
});

// Fly sends SIGTERM before killing the old machine on a rolling deploy --
// end every still-active session with an explicit reason (instead of that
// data just disappearing along with the process) and flush whatever
// hasn't gone out yet before actually exiting.
process.on("SIGTERM", () => {
  clearInterval(heartbeat);
  roomManager.shutdownAll("server_restart");
  shutdownAnalytics().finally(() => process.exit(0));
});
