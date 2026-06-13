# Harvest Rush Arena Server

Authoritative WebSocket game server for the multiplayer arena. Plain
Node.js + `ws` + `express` — no database, no external services. Everything
lives in memory and resets when the process restarts, which matches the
client's "no accounts, no saving" design.

## Running locally

```bash
npm install
npm run dev        # tsx watch, restarts on file change
```

This starts on `:8787` with a WebSocket endpoint at `/ws` and a health
check at `/health`. Point the client at it with:

```bash
EXPO_PUBLIC_ARENA_WS_URL=ws://localhost:8787/ws npx expo start --web
```

(or just `ws://localhost:8787/ws`, which is the client's default if that
env var is unset.)

## Serving the web client from the same box

To avoid paying for two hosts, this server can serve the Expo web export
as static files from the same process/port:

```bash
# from the repo root
npx expo export --platform web --output-dir server/web-client

cd server
npm run build
npm start
```

If `server/web-client/index.html` doesn't exist, the server just skips
static file serving and runs API/WS-only — handy for local dev where you
usually run the Expo dev server separately instead.

## Deploying for under $5/mo

This is a single long-running Node process holding WebSocket connections
and an in-memory tick loop, so it needs a real (not serverless) host. A
few options that fit the budget:

- **Fly.io** — a `shared-cpu-1x` / 256MB machine is normally free or ~$2-4/mo
  depending on usage; supports WebSockets natively. `fly launch` from this
  directory (it'll pick up the Dockerfile).
- **A small VPS** — Hetzner CX22 (~€4.5/mo), DigitalOcean/Vultr $4-6/mo
  droplet. `docker build -t arena . && docker run -p 8787:8787 arena`, put
  it behind a reverse proxy (Caddy is the least fuss — automatic HTTPS/WSS)
  if you want a real domain.
- **Railway hobby tier** (~$5/mo) also works fine if you'd rather not touch
  a raw VPS.

Whichever you pick, you need `wss://` (TLS) in production — browsers and
mobile OSes increasingly refuse plaintext `ws://` from an https page.
Terminate TLS at a reverse proxy (Caddy/nginx/the platform's built-in
proxy) in front of this process; the app itself only speaks plain HTTP/WS.

### Capacity expectations

The whole simulation is a brute-force loop over players and world objects
per room, ticking at ~15Hz (`TICK_MS` in `src/constants.ts`) — no spatial
partitioning, because at this scale it doesn't need it. Rough numbers on a
single shared-vCPU, 256-512MB box:

- **~150-300 concurrent players** comfortably, split across multiple
  ~40-player rooms (`MAX_PLAYERS_PER_ROOM`).
- Each room is O(players² ) for collision checks and O(players × world
  objects) for pickups — at 40 players / ~260 world objects that's a few
  thousand checks per tick, trivial for one CPU core.
- Bandwidth is the more likely limit before CPU is: full player-state
  broadcasts every tick, batched crop/seedling events otherwise. Rough
  order of magnitude at 40 players/room: a few hundred KB/s per full room.

To go bigger than one box can hold, you'd shard rooms across multiple
processes/machines with a shared matchmaking layer in front — real work,
and well past a $5/mo budget. This server intentionally doesn't attempt
that; `RoomManager` assumes a single process owns all rooms.

## Environment variables

| Variable         | Default                     | Notes                                   |
| ----------------- | ---------------------------- | ---------------------------------------- |
| `PORT`            | `8787`                       | HTTP + WS port                           |
| `WEB_CLIENT_DIR`  | `<repo>/server/web-client`   | Static files to serve, if present        |

## Tuning

Everything that shapes game feel — speeds, arena size, room capacity, boost
cost, ramming thresholds, seedling growth time, bot count — is in
`src/constants.ts` with comments explaining each one.
