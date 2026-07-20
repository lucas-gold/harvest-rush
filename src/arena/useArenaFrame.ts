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
 * render-triggering bump — not a separate reactive `seeds` store
 * subscription, which used to force a full ArenaCanvas re-render on every
 * single server tick (`seeds` is a brand-new array reference every
 * "state" broadcast even when nothing's in flight, unlike crops/
 * seedlings, which use a mutate-in-place + version-counter pattern
 * specifically to avoid this).
 */
export function useArenaFrame(): ArenaFrame {
  const players = useArenaStore((s) => s.players);
  const playersRef = useRef(players);
  playersRef.current = players;

  const renderedPlayersRef = useRef<Record<string, PlayerSnapshot>>(players);
  const renderedSeedsRef = useRef<Record<string, SeedProjectileSnapshot>>({});
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
      const renderedPlayers = renderedPlayersRef.current;
      const posAlpha = 1 - Math.pow(0.5, dt / (POSITION_HALF_LIFE_MS / 1000));

      const nextPlayers: Record<string, PlayerSnapshot> = {};
      for (const id in target) {
        const t = target[id];
        const r = renderedPlayers[id];
        nextPlayers[id] =
          r ? { ...t, x: r.x + (t.x - r.x) * posAlpha, y: r.y + (t.y - r.y) * posAlpha } : t;
      }
      renderedPlayersRef.current = nextPlayers;

      const targetSeeds = useArenaStore.getState().seeds;
      const renderedSeeds = renderedSeedsRef.current;
      const seedAlpha = 1 - Math.pow(0.5, dt / (SEED_HALF_LIFE_MS / 1000));

      const nextSeeds: Record<string, SeedProjectileSnapshot> = {};
      for (const s of targetSeeds) {
        const r = renderedSeeds[s.id];
        nextSeeds[s.id] = r ? { x: r.x + (s.x - r.x) * seedAlpha, y: r.y + (s.y - r.y) * seedAlpha, id: s.id } : s;
      }
      // A seed present last frame but missing now just landed (hit or
      // planted) — pop a fading "plop" at its last known position instead
      // of just having it vanish outright.
      for (const id in renderedSeeds) {
        if (!(id in nextSeeds)) {
          const last = renderedSeeds[id];
          poofsRef.current.push({ id: `poof${poofIdCounter++}`, x: last.x, y: last.y, at: now });
        }
      }
      if (poofsRef.current.length) {
        poofsRef.current = poofsRef.current.filter((p) => now - p.at < POOF_MAX_AGE_MS);
      }
      renderedSeedsRef.current = nextSeeds;
      seedsArrayRef.current = Object.values(nextSeeds);

      if (now - lastBump >= RENDER_INTERVAL_MS) {
        lastBump = now;
        bump((n) => (n + 1) % 1_000_000);
      }

      rafId = requestAnimationFrame(frame);
    }

    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return { players: renderedPlayersRef.current, seeds: seedsArrayRef.current, poofs: poofsRef.current };
}
