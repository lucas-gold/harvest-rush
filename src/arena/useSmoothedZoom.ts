import { useEffect, useRef, useState } from "react";

const ZOOM_SMOOTHING_HALF_LIFE_MS = 220;
const RENDER_INTERVAL_MS = 40; // matches useSmoothedPlayers' render throttle

/** Zoom recomputes from crop count (see computeZoom), which changes in
 * discrete jumps every time a crop is picked up. Applying that jump to the
 * camera immediately made on-screen speed (world speed × zoom) visibly
 * lurch on every pickup — reported as a "parallaxing"/inconsistent-speed
 * feel even though world-space movement speed never actually changed.
 * Easing toward the target zoom the same way player positions are eased
 * (see useSmoothedPlayers) keeps on-screen speed steady between pickups. */
export function useSmoothedZoom(target: number): number {
  const targetRef = useRef(target);
  targetRef.current = target;
  const renderedRef = useRef(target);
  const [, bump] = useState(0);

  useEffect(() => {
    let rafId: number;
    let lastFrame = Date.now();
    let lastBump = 0;

    function frame() {
      const now = Date.now();
      const dt = Math.max(0, Math.min(0.1, (now - lastFrame) / 1000));
      lastFrame = now;

      const alpha = 1 - Math.pow(0.5, dt / (ZOOM_SMOOTHING_HALF_LIFE_MS / 1000));
      renderedRef.current += (targetRef.current - renderedRef.current) * alpha;

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
