let counter = 0;

/** Short, collision-safe-enough id for a single room's lifetime — no need
 * for a real UUID dependency at this scale. */
export function randomId(prefix: string): string {
  counter = (counter + 1) % Number.MAX_SAFE_INTEGER;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${Math.random()
    .toString(36)
    .slice(2, 6)}`;
}

export function randomPointInCircle(radius: number): { x: number; y: number } {
  // sqrt(random) keeps points uniformly distributed by area, not bunched
  // toward the center.
  const r = radius * Math.sqrt(Math.random());
  const theta = Math.random() * Math.PI * 2;
  return { x: Math.cos(theta) * r, y: Math.sin(theta) * r };
}

export function dist2(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

export function clampToCircle(x: number, y: number, radius: number): { x: number; y: number } {
  const d = Math.hypot(x, y);
  if (d <= radius) return { x, y };
  const scale = radius / d;
  return { x: x * scale, y: y * scale };
}
