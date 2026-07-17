import { Direction } from "../pixelart/sprites";

// Mirrors server/src/constants.ts PLAYER_BASE_RADIUS / PLAYER_RADIUS_PER_SQRT_CROP
// — keep in sync so the collision hitbox (invisible, server-authoritative)
// and the backpack stack's visual growth stay proportional to each other.
export const PLAYER_BASE_RADIUS = 16;
const PLAYER_RADIUS_PER_SQRT_CROP = 2.4;

/** The actual (server-authoritative) collision radius — used for backpack
 * stack sizing, not for the avatar sprite itself, which stays a fixed
 * size regardless of crop count. */
export function radiusForCrops(crops: number): number {
  return PLAYER_BASE_RADIUS + Math.sqrt(Math.max(0, crops)) * PLAYER_RADIUS_PER_SQRT_CROP;
}

const WORLD_UNITS_PER_BUNDLE = 5;
// Each bundle is its own sprite instance; with up to ~40 players visible
// and rendering happening dozens of times/sec, this is a real render-cost
// lever, not just a visual one.
const MAX_BUNDLES = 8;

/** How many wheat bundles to show in a player's backpack pile — scaled
 * off the same growth curve as the real hitbox, so a taller pile is an
 * honest read of "how much bigger a target this player actually is." */
export function bundleCountForCrops(crops: number): number {
  const growth = radiusForCrops(crops) - PLAYER_BASE_RADIUS;
  return Math.min(MAX_BUNDLES, Math.floor(growth / WORLD_UNITS_PER_BUNDLE));
}

export function directionFromVector(dirX: number, dirY: number, fallback: Direction): Direction {
  if (dirX === 0 && dirY === 0) return fallback;
  return Math.abs(dirX) > Math.abs(dirY) ? (dirX > 0 ? "right" : "left") : dirY > 0 ? "down" : "up";
}
