import path from "path";
import fs from "fs";
import http from "http";
import express from "express";
import { WebSocketServer, WebSocket } from "ws";
import { RoomManager } from "./RoomManager";
import { parseClientMessage } from "./validate";
import { Room } from "./Room";
import { shutdownAnalytics } from "./analytics";

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

wss.on("connection", (ws: WebSocket) => {
  const state: ConnectionState = { room: null, playerId: null };

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

  ws.on("close", () => {
    if (state.room && state.playerId) {
      state.room.leave(state.playerId);
      roomManager.reapIfEmpty(state.room);
    }
  });

  ws.on("error", () => {
    ws.close();
  });
});

server.listen(PORT, () => {
  console.log(`[server] listening on :${PORT} (ws path: /ws)`);
});

// Fly sends SIGTERM before killing the old machine on a rolling deploy --
// flush whatever session-end events haven't gone out yet instead of
// silently dropping them.
process.on("SIGTERM", () => {
  shutdownAnalytics().finally(() => process.exit(0));
});
