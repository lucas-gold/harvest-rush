import { useEffect, useRef, useState } from "react";
import { useArenaStore } from "../multiplayer/arenaStore";
import { PlayerSnapshot } from "../multiplayer/protocol";

// The server broadcasts discrete position updates at its tick rate (see
// TICK_MS in server/src/constants.ts, ~60ms). Rendering those positions
// directly means every player visibly jumps once per tick instead of
// moving smoothly — this exponentially smooths toward the latest known
// position instead, which is framerate-independent and tolerant of
// network jitter (unlike fixed-interval interpolation, it doesn't assume
// updates arrive exactly TICK_MS apart).
const SMOOTHING_HALF_LIFE_MS = 90; // time to close half the remaining gap to the target

// The math above runs every animation frame (for accuracy), but actually
// triggering a React re-render is throttled well below 60fps: the source
// data only updates ~16-17x/sec (the server tick), and each re-render
// forces the whole visible-player tree to re-evaluate — up to ~40
// players, each with a backpack stack of up to a dozen separate sprite
// instances for a big one. Re-rendering at 60fps for a 60ms-interval data
// source was pure waste and the actual dominant cost behind "still very
// laggy" after the other fixes; ~25fps is still visually smooth here.
const RENDER_INTERVAL_MS = 40;

/** Player positions eased toward the latest server snapshot every frame,
 * instead of snapping straight to it. Non-position fields (crops, name,
 * etc.) pass through unsmoothed from the latest snapshot. */
export function useSmoothedPlayers(): Record<string, PlayerSnapshot> {
  const players = useArenaStore((s) => s.players);
  const playersRef = useRef(players);
  playersRef.current = players;

  const renderedRef = useRef<Record<string, PlayerSnapshot>>(players);
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
      const rendered = renderedRef.current;
      const alpha = 1 - Math.pow(0.5, dt / (SMOOTHING_HALF_LIFE_MS / 1000));

      const next: Record<string, PlayerSnapshot> = {};
      for (const id in target) {
        const t = target[id];
        const r = rendered[id];
        next[id] = r ? { ...t, x: r.x + (t.x - r.x) * alpha, y: r.y + (t.y - r.y) * alpha } : t;
      }
      renderedRef.current = next;

      if (now - lastBump >= RENDER_INTERVAL_MS) {
        lastBump = now;
        bump((n) => (n + 1) % 1_000_000);
      }

      rafId = requestAnimationFrame(frame);
    }

    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return renderedRef.current;
}
