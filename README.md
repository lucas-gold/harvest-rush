# Harvest Rush

A fast-paced multiplayer arena game as a farmer collecting crops. Run around a big circular field with everyone else currently in your lobby, scoop up crops just by running over them, and shoot seeds at other players to knock crops off their stack. No account necessary — pick a name and an avatar and play on mobile or desktop. Play anytime against AI bots or real players.

<https://harvestrush.fennel.garden>

## How it plays

- **Movement**: mouse (web) or touch-drag (mobile) — point where you want to go.
- **Collecting**: walk over a crop, it joins the stack on your back. More crops = more visible
  size = a bigger target, but also slower movement and a slower fire rate — there's a real cost to
  hoarding.
- **Combat**: hold the fire button to shoot a seed in the direction you're facing. Each shot costs
  a crop. A landed hit knocks a chunk of the target's stack loose — mostly toward you, so it pays
  to land the hit rather than just tag someone — with a chance of a critical (or super-critical)
  hit that scales with how many crops the target is carrying. A shield power-up blocks the next
  hit entirely. Drop to 0 and you pop — a quick respawn, not a hard reset, so you're back in it in
  seconds.
- **Bots**: every lobby fills up to 9 bots regardless of how many real players are around, so it
  never feels empty. Bots wander and collect crops, and will aim and fire back if you get close or
  shoot at them — not full AI opponents, but not free kills either. Bots are labeled as bots
  (`.bot` suffix), not disguised as players.
- **Power-ups**: rare pickups that occasionally replace a regular crop when a seedling matures —
  a speed boost, rapid fire, a shield, or extended shot range. Same pickup mechanic as a crop
  (walk over it), distinct blue crystal look so it stands out.
- **Crown**: whoever's #1 on the leaderboard wears a gold crown, visible to everyone in the arena
  and on the minimap.
- **Seeds that miss**: a shot that doesn't land plants a seedling where it comes to rest, which
  matures into a fresh crop after 15 seconds — on top of the ambient spawning that keeps the field
  stocked as players consume it, so the map never fully dries up.

## Architecture

Two independent pieces:

```
server/     Authoritative Node/TS WebSocket game server (the real simulation)
src/        Expo/React Native client — runs as iOS, Android, and a website from one codebase
```

The **server** owns all game state (positions, crops, seedlings, seeds in flight, hits) and ticks
the simulation every 60ms (~17 times/sec), broadcasting to everyone in that lobby (room). Clients
are not trusted — they only send "here's the direction I want to move" and "am I firing," and
render whatever the server tells them is true. This is what keeps combat and collection fair
regardless of a client's own performance or a modified app.

The **client** is the same Expo app for iOS, Android, and web (`npx expo start --web` / `expo
export --platform web`) — one avatar/movement/rendering codebase, no separate web build to
maintain.

### Multiplayer connection flow, end to end

1. You pick a name + avatar on the entry screen (kept in memory only — nothing is persisted).
2. On pressing Play, the client opens a WebSocket to the server's `/ws` endpoint and sends a
   `join` message with your name/avatar.
3. The server's `RoomManager` puts you in the first lobby (`Room`) that has space (< 40 real
   players), or spins up a new one if all existing ones are full. If you're the first real player
   in that room, it also spawns bots up to the 9-bot fill target.
4. The server replies with a `welcome` message: your player id, the arena size, and a full
   snapshot of everyone/everything currently in that room.
5. From then on: the client sends its current move direction + firing state (throttled to match
   the server's tick rate) any time it changes; the server sends back full player and seed
   positions every tick, plus crop/seedling/power-up add/remove events only when something
   actually changes (crops don't move, so there's no reason to resend the whole list every tick).
6. Movement, collisions, seed flight, hits, pickups, seedling growth, and bot behavior are all
   decided **only** on the server; the client just renders the results. If you get popped, the
   server tells you who did it; the client shows that as an overlay without dropping your
   connection — you're already respawned by the time you dismiss it.
7. Closing the tab/app (or losing connection) tells the server to drop you from the room; if that
   empties the room of real players, its bots are cleared and the room itself is torn down.

### Why a real server instead of peer-to-peer

Peer-to-peer (each player's device talking directly to others) is the other common approach for
casual multiplayer, but it falls apart for this game specifically: crop pickups and hit outcomes
need one shared source of truth, and P2P makes that either laggy (waiting for consensus between
many peers) or exploitable (a modified client just claims it won every exchange). An authoritative
server is more work up front but is the only version of this that stays fair once strangers are
playing each other for score.

## Cost considerations

This needs one always-on server process (not something that fits a free static host or serverless
functions, since it holds live WebSocket connections and a continuous tick loop). The good news:
at this game's scale, that server is cheap.

- **What it costs**: a small always-on VM. Fly.io's smallest shared-CPU machine, a Hetzner CX22
  (~€4.5/mo), or a $4-6/mo DigitalOcean/Vultr droplet are all realistic under-$5/mo options — see
  `server/README.md` for specifics. One box also serves the website itself (the server can host
  the built web client as static files), so there's no separate hosting bill for the site.
- **What that buys you**: roughly 150-300 concurrent players comfortably, split across several
  ~40-player lobbies, at the tick rate/broadcast approach this server uses. The simulation is
  brute-force (no spatial partitioning for player-vs-player checks) because at this scale it
  doesn't need to be — that's a deliberate simplicity-over-scale tradeoff, not an oversight.
- **What doesn't scale on this budget**: going meaningfully past that (thousands of concurrent
  players, one truly massive shared arena instead of many capped lobbies) needs multiple server
  processes/machines and a real matchmaking layer in front of them — a different, more expensive
  project. This server assumes a single process owns everything, on purpose.
- **Bandwidth**: the biggest per-player ongoing cost driver is the state broadcast, not CPU. Most
  cheap VM/PaaS tiers include enough bandwidth that this isn't a practical concern at the player
  counts above; it would matter more if lobby size or tick rate were pushed much higher.
- **No other recurring costs**: no database, no third-party APIs, no per-user billing — the whole
  backend is this one process.

See `server/README.md` for exact deploy steps.

## Project structure

```
server/
  src/
    constants.ts      every tuning knob (arena size, speeds, combat, bot count, spawn rates)
    protocol.ts        the wire format (mirrored in src/multiplayer/protocol.ts on the client)
    Room.ts             the simulation: movement, pickups, seed combat, seedlings, bots
    RoomManager.ts      matchmaking across lobbies
    bots.ts             bot names/avatars
    index.ts             HTTP + WebSocket bootstrap, optionally serves the built web client
  Dockerfile
  README.md            deploy steps + capacity/cost math

src/
  multiplayer/         protocol types, the WebSocket connection, and the reactive arena store
  arena/                 camera/viewport math, the world renderer, minimap, leaderboard, HUD
    controls/               every input scheme (web keyboard/mouse, and the 3 selectable mobile
                              schemes) plus the settings picker for the mobile ones
  avatar/                 avatar picker + the shared avatar view (same model in the picker and
                            in-arena — there's only one)
  pixelart/               palette-indexed sprite matrices rendered via react-native-svg — no
                            binary art assets
  theme/                  color palette, and the Pixelify Sans / PixelText split — that font is
                            used for words (titles, labels, names, buttons); numbers you need to
                            read at a glance (crop counts, leaderboard scores) stay in the
                            platform's default font on purpose, since pixel fonts get hard to
                            parse as digits quickly
  screens/                Entry (name + avatar) and Arena (the game itself)
  state/                  in-memory-only player/settings stores (nothing persists)
```

## Live server

Deployed on Fly.io (`iad` region, single always-on 256MB machine, ~$2/mo): **`wss://harvest-rush-arena.fly.dev/ws`**
— health check at <https://harvest-rush-arena.fly.dev/health>. Redeploy after server changes with
`cd server && flyctl deploy`.

To point any client build at it instead of a local server:

```bash
EXPO_PUBLIC_ARENA_WS_URL=wss://harvest-rush-arena.fly.dev/ws npx expo start --web
```

## Running locally

```bash
# terminal 1 — the game server
cd server
npm install
npm run dev

# terminal 2 — the client (web is fastest for iterating; also runs on iOS/Android)
npm install
npx expo start --web
```

The client defaults to `ws://localhost:8787/ws` when `EXPO_PUBLIC_ARENA_WS_URL` isn't set, so
local runs hit your local server, not production, unless you explicitly point them at it (see
above). To try real multiplayer locally, open the web client in two browser tabs (or a phone on
the same network pointed at your machine's LAN IP) — each is a separate connection/player against
the same local server.

For iOS/Android native builds:

```bash
npx expo prebuild
npx expo run:ios      # or: npx expo run:android
```

## Known limitations / deliberate simplifications

- **Controls**: on web, mouse, WASD/arrow keys, click, and space all work simultaneously — no mode
  to pick, whichever you reach for just works. On mobile, pick a control scheme from the entry
  screen: drag-to-steer with a fire button (default), drag-to-steer where dragging far enough
  auto-fires (no button), or a D-pad with a fire button. See `src/arena/controls/`.
- **State broadcast is full, not delta-compressed**: every tick sends every player's full
  position rather than just what changed. Simpler and correct; would need revisiting well before
  hitting the player counts where it'd matter.
- **No reconnect-with-state**: losing connection mid-game currently just surfaces an error and
  sends you back to the entry screen rather than resuming your run — there's nothing to resume
  server-side once your socket drops.
