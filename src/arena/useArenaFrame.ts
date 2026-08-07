import { useEffect, useRef, useState } from "react";
import { useArenaStore } from "../multiplayer/arenaStore";
import { PlayerSnapshot, SeedProjectileSnapshot } from "../multiplayer/protocol";

// The server broadcasts discrete position updates at its tick rate (see
// TICK_MS in server/src/constants.ts, ~60ms). Rendering those positions
// directly means every player visibly jumps once per tick instead of
// moving smoothly — this exponentially smooths toward the latest known
// position instead, which is framerate-independent and tolerant of
// network jitter (unlike fixed-interval interpolation, it doesn't assume
// updates arrive exactly TICK_MS apart).
const POSITION_HALF_LIFE_MS = 90;
// Seeds move fast and only exist for a few hundred ms, so they get a much
// shorter half-life than players — enough to smooth out the per-tick jump
// without visibly lagging behind the server's actual (now decelerating,
// see SEED_DECEL_START_FRACTION) flight path.
const SEED_HALF_LIFE_MS = 45;
// How long a "poof" stays visible after a seed disappears (hit or missed
// and planted) — see Poof below.
const POOF_MAX_AGE_MS = 380;

// The math above runs every animation frame (for accuracy), but actually
// triggering a React re-render is throttled well below 60fps: the source
// data only updates ~16-17x/sec (the server tick), and each re-render
// forces the whole visible-entity tree to re-evaluate — up to ~40 players,
// each with a backpack stack of up to a dozen separate sprite instances
// for a big one. ~25fps is still visually smooth here.
const RENDER_INTERVAL_MS = 40;

export interface Poof {
  id: string;
  x: number;
  y: number;
  at: number;
}

interface ArenaFrame {
  players: Record<string, PlayerSnapshot>;
  seeds: SeedProjectileSnapshot[];
  poofs: Poof[];
}

let poofIdCounter = 0;

/**
 * Single per-frame source of truth for everything ArenaCanvas needs that
 * changes continuously: smoothed player positions, smoothed seed
 * positions, and "poof" landing effects for seeds that just disappeared
 * (hit a player or reached max range and planted). One hook, one
 * render-triggering bump, decoupled from reading the `seeds` store value
 * directly (`seeds` is a brand-new array reference on every "state"
 * broadcast even when nothing's in flight, unlike crops/seedlings, which
 * use a mutate-in-place + version-counter pattern so a fresh reference
 * isn't the reactive trigger).
 *
 * The smoothing math runs every animation frame (~60x/sec, for accuracy)
 * but only mutates small persistent {x,y} position objects in place —
 * no per-frame allocation of full player/seed objects, which matters
 * under sustained heavy play with up to ~40 players: V8 GC pauses on the
 * main thread are exactly what read as choppy/delayed movement. The full
 * snapshot objects ArenaCanvas actually consumes are only rebuilt at the
 * throttled render rate (~25fps, see RENDER_INTERVAL_MS below).
 */
export function useArenaFrame(): ArenaFrame {
  const players = useArenaStore((s) => s.players);
  const playersRef = useRef(players);
  playersRef.current = players;

  const smoothedPosRef = useRef<Record<string, { x: number; y: number }>>({});
  const smoothedSeedPosRef = useRef<Record<string, { x: number; y: number }>>({});
  const outputPlayersRef = useRef<Record<string, PlayerSnapshot>>(players);
  const seedsArrayRef = useRef<SeedProjectileSnapshot[]>([]);
  const poofsRef = useRef<Poof[]>([]);
  const [, bump] = useState(0);

  useEffect(() => {
    let rafId: number;
    let lastFrame = Date.now();
    let lastBump = 0;

    function frame() {
      const now = Date.now();
      const dt = Math.max(0, Math.min(0.1, (now - lastFrame) / 1000));
      lastFrame = now;

      const target = playersRef.current;
      const smoothedPos = smoothedPosRef.current;
      const posAlpha = 1 - Math.pow(0.5, dt / (POSITION_HALF_LIFE_MS / 1000));

      // Prune positions for players who've since left — otherwise this
      // grows for the lifetime of the tab, one entry per distinct player
      // (real or bot) ever seen this session.
      for (const id in smoothedPos) {
        if (!(id in target)) delete smoothedPos[id];
      }
      for (const id in target) {
        const t = target[id];
        const s = smoothedPos[id];
        if (s) {
          s.x += (t.x - s.x) * posAlpha;
          s.y += (t.y - s.y) * posAlpha;
        } else {
          smoothedPos[id] = { x: t.x, y: t.y };
        }
      }

      const targetSeeds = useArenaStore.getState().seeds;
      const smoothedSeedPos = smoothedSeedPosRef.current;
      const seedAlpha = 1 - Math.pow(0.5, dt / (SEED_HALF_LIFE_MS / 1000));

      // A hit or seed-vs-seed collision comes with the server's exact
      // landing (x, y) for the seed(s) involved — poof there directly
      // instead of at the seed's own smoothed position, which always
      // trails a bit behind the true position while in flight and would
      // otherwise read as the seed stopping short of where it landed.
      // Dropping the entry from smoothedSeedPos here is what keeps the
      // generic "seed vanished" fallback below from also popping a second,
      // less accurate poof for the same seed.
      const landedSeeds = useArenaStore.getState().pendingLandedSeeds;
      if (landedSeeds.length) {
        for (const landed of landedSeeds) {
          delete smoothedSeedPos[landed.seedId];
          poofsRef.current.push({ id: `poof${poofIdCounter++}`, x: landed.x, y: landed.y, at: now });
        }
        useArenaStore.getState()._clearLandedSeeds();
      }

      // A seed present last frame but missing now just missed and planted
      // (the only remaining cause once hits/collisions are handled above)
      // — pop a fading "plop" at its last known position. Seed counts are
      // small (a handful in flight at once), so a linear scan per existing
      // entry is cheap — no need to build a Set of live ids every frame.
      for (const id in smoothedSeedPos) {
        if (!targetSeeds.some((s) => s.id === id)) {
          const last = smoothedSeedPos[id];
          poofsRef.current.push({ id: `poof${poofIdCounter++}`, x: last.x, y: last.y, at: now });
          delete smoothedSeedPos[id];
        }
      }
      for (const s of targetSeeds) {
        const sm = smoothedSeedPos[s.id];
        if (sm) {
          sm.x += (s.x - sm.x) * seedAlpha;
          sm.y += (s.y - sm.y) * seedAlpha;
        } else {
          smoothedSeedPos[s.id] = { x: s.x, y: s.y };
        }
      }
      if (poofsRef.current.length) {
        poofsRef.current = poofsRef.current.filter((p) => now - p.at < POOF_MAX_AGE_MS);
      }

      if (now - lastBump >= RENDER_INTERVAL_MS) {
        lastBump = now;

        const nextPlayers: Record<string, PlayerSnapshot> = {};
        for (const id in target) {
          const t = target[id];
          const s = smoothedPos[id];
          nextPlayers[id] = { ...t, x: s.x, y: s.y };
        }
        outputPlayersRef.current = nextPlayers;

        const nextSeeds: SeedProjectileSnapshot[] = [];
        for (const id in smoothedSeedPos) {
          const sm = smoothedSeedPos[id];
          nextSeeds.push({ id, x: sm.x, y: sm.y });
        }
        seedsArrayRef.current = nextSeeds;

        bump((n) => (n + 1) % 1_000_000);
      }

      rafId = requestAnimationFrame(frame);
    }

    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return { players: outputPlayersRef.current, seeds: seedsArrayRef.current, poofs: poofsRef.current };
}
