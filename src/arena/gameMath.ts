import { Direction } from "../pixelart/sprites";

// Mirrors server/src/constants.ts PLAYER_BASE_RADIUS / PLAYER_RADIUS_PER_SQRT_CROP
// — keep in sync so avatars are drawn the size the server actually collides at.
const PLAYER_BASE_RADIUS = 16;
const PLAYER_RADIUS_PER_SQRT_CROP = 2.4;

export function radiusForCrops(crops: number): number {
  return PLAYER_BASE_RADIUS + Math.sqrt(Math.max(0, crops)) * PLAYER_RADIUS_PER_SQRT_CROP;
}

export function directionFromVector(dirX: number, dirY: number, fallback: Direction): Direction {
  if (dirX === 0 && dirY === 0) return fallback;
  return Math.abs(dirX) > Math.abs(dirY) ? (dirX > 0 ? "right" : "left") : dirY > 0 ? "down" : "up";
}
