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

/**
 * Did two circles overlap at any point while moving linearly from their
 * tick-start to tick-end positions? A single end-of-tick distance check
 * misses fast-moving pairs that cross paths entirely within one tick (e.g.
 * a seed at SEED_PROJECTILE_SPEED against a player's collision radius can
 * cover most of that radius in a single tick) — this solves for the
 * closest approach across the whole tick instead.
 */
export function sweptCircleOverlap(
  relStartX: number,
  relStartY: number,
  relEndX: number,
  relEndY: number,
  radiusSum: number
): boolean {
  const px = relStartX;
  const py = relStartY;
  const vx = relEndX - relStartX;
  const vy = relEndY - relStartY;

  const c = px * px + py * py - radiusSum * radiusSum;
  if (c <= 0) return true; // already overlapping at the start of this tick

  const a = vx * vx + vy * vy;
  if (a < 1e-9) return false; // no relative motion this tick, and not already overlapping

  const b = 2 * (px * vx + py * vy);
  const disc = b * b - 4 * a * c;
  if (disc < 0) return false; // relative path never comes within radiusSum

  const sqrtDisc = Math.sqrt(disc);
  const t1 = (-b - sqrtDisc) / (2 * a);
  const t2 = (-b + sqrtDisc) / (2 * a);
  return t2 >= 0 && t1 <= 1; // overlap window intersects this tick's [0,1]
}
