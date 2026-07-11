# Harvest Rush

A fast-paced multiplayer arena game — think agar.io/slither.io, but you're a farmer collecting
crops instead of blobs. Run around a big circular field with everyone else currently in your
lobby, scoop up crops just by running over them, and watch your back: bigger players can ram
smaller ones and scatter their stack. No accounts, no saving — pick a name and an avatar, jump in.

## How it plays

- **Movement**: mouse (web) or touch-drag (mobile) — point where you want to go.
- **Collecting**: walk over a crop, it joins the stack on your back. More crops = more visible
  size = a bigger target, but also a bigger threat to smaller players.
- **Boost**: hold the boost button to move faster at the cost of crops — each one you burn gets
  planted as a seedling right where you were standing, which matures into a fresh crop after 30
  seconds. Burning your own stack to escape (or to chase someone) also feeds the map.
- **Attacking**: run into a smaller player — if you're enough bigger, you scatter a chunk of their
  stack on the ground (for anyone, including bystanders, to grab) and knock them back with a brief
  grace period before either of you can collide again. Drop low enough and you pop — a quick
  respawn, not a hard reset, so you're back in it in seconds.
- **Bots**: lobbies always have at least 8 people. If fewer than 8 real players are around, the
  rest of the slots fill with bots that wander and collect crops but never attack — easy,
  low-risk targets rather than real threats. Bots are labeled as bots, not disguised as players.
- **Seedlings**: pop up on their own around the map, faster when there are more players or fewer
  crops currently available, so the field never fully dries up or gets oversaturated.

## Architecture

Two independent pieces:

```
server/     Authoritative Node/TS WebSocket game server (the real simulation)
src/        Expo/React Native client — runs as iOS, Android, and a website from one codebase
```

The **server** owns all game state (positions, crops, seedlings, collisions) and ticks the
simulation ~15 times/sec, broadcasting to everyone in that lobby (room). Clients are not trusted —
they only send "here's the direction I want to move" and "am I boosting," and render whatever the
server tells them is true. This is what keeps ramming/collection fair regardless of a client's own
performance or a modified app.

The **client** is the same Expo app for iOS, Android, and web (`npx expo start --web` / `expo
export --platform web`) — one avatar/movement/rendering codebase, no separate web build to
maintain.

### Multiplayer connection flow, end to end

1. You pick a name + avatar on the entry screen (kept in memory only — nothing is persisted).
2. On pressing Play, the client opens a WebSocket to the server's `/ws` endpoint and sends a
   `join` message with your name/avatar.
3. The server's `RoomManager` puts you in the first lobby (`Room`) that has space (< 40 real
   players), or spins up a new one if all existing ones are full. If you're the first real player
   in that room, it also spawns bots up to the 8-person minimum.
4. The server replies with a `welcome` message: your player id, the arena size, and a full
   snapshot of everyone/everything currently in that room.
5. From then on: the client sends its current move direction + boost state (throttled to match
   the server's tick rate, ~15/sec) any time it changes; the server sends back full player
   positions every tick, plus crop/seedling add/remove events only when something actually
   changes (crops don't move, so there's no reason to resend the whole list 15x/sec).
6. Collisions, pickups, seedling growth, and bot movement are all decided **only** on the server;
   the client just renders the results. If you get popped, the server tells you who did it and
   your pre-reset score; the client shows that as an overlay without dropping your connection —
   you're already respawned by the time you dismiss it.
7. Closing the tab/app (or losing connection) tells the server to drop you from the room; if that
   empties the room of real players, its bots are cleared and the room itself is torn down.

### Why a real server instead of peer-to-peer

Peer-to-peer (each player's device talking directly to others) is the other common approach for
casual multiplayer, but it falls apart for this game specifically: crop pickups and ramming
outcomes need one shared source of truth, and P2P makes that either laggy (waiting for consensus
between many peers) or exploitable (a modified client just claims it won every collision). An
authoritative server is more work up front but is the only version of this that stays fair once
strangers are playing each other for score.

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
  brute-force (no spatial partitioning) because at this scale it doesn't need to be — that's a
  deliberate simplicity-over-scale tradeoff, not an oversight.
- **What doesn't scale on this budget**: going meaningfully past that (thousands of concurrent
  players, one truly massive shared arena instead of many capped lobbies) needs multiple server
  processes/machines and a real matchmaking layer in front of them — a different, more expensive
  project. This server assumes a single process owns everything, on purpose.
- **Bandwidth**: the biggest per-player ongoing cost driver is the state broadcast, not CPU. Most
  cheap VM/PaaS tiers include enough bandwidth that this isn't a practical concern at the player
  counts above; it would matter more if lobby size or tick rate were pushed much higher.
- **No other recurring costs**: no database, no third-party APIs, no per-user billing — the whole
  backend is this one process.

I can't create or pay for the hosting account myself (that's a real financial commitment only you
can make) — `server/README.md` has exact deploy steps once you've picked a host.

## Project structure

```
server/
  src/
    constants.ts      every tuning knob (arena size, speeds, ramming rules, bot count, spawn rates)
    protocol.ts        the wire format (mirrored in src/multiplayer/protocol.ts on the client)
    Room.ts             the simulation: movement, pickups, seedlings, collisions, bots
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

- **Controls**: on web, mouse, WASD/arrow keys, click, space, and the on-screen boost button all
  work simultaneously — no mode to pick, whichever you reach for just works. On mobile, pick a
  control scheme from the entry screen: drag-to-steer with a boost button (default), drag-to-steer
  where dragging far enough auto-boosts (no button), or a D-pad with a boost button. See
  `src/arena/controls/`.
- **State broadcast is full, not delta-compressed**: every tick sends every player's full
  position rather than just what changed. Simpler and correct; would need revisiting well before
  hitting the player counts where it'd matter.
- **No reconnect-with-state**: losing connection mid-game currently just surfaces an error and
  sends you back to the entry screen rather than resuming your run — there's nothing to resume
  server-side once your socket drops.
- **Traps as a future mechanic**: ramming was chosen as the sole attack for now since it needs no
  extra input beyond move + boost; a deliberate area-denial mechanic (a plantable trap that costs
  crops) would be a natural follow-up but adds a second control.
