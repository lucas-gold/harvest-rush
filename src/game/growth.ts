import { CropStage } from "../pixelart/sprites";

// Base time (ms) a crop needs to progress from stage 0 -> 3, before upgrades.
// Deliberately short: this is a fast-paced arcade farming loop, not a
// real-time simulator — growthSpeed upgrades push this toward "instant".
export const BASE_GROW_MS = 9000;
export const WATER_BONUS_MULTIPLIER = 0.5; // watered crops grow at half the remaining time
export const GROWTH_SPEED_STEP = 0.14; // -14% grow time per upgrade level

export function growthSpeedMultiplier(growthSpeedLevel: number): number {
  return Math.max(0.12, 1 - GROWTH_SPEED_STEP * growthSpeedLevel);
}

/**
 * Given when a crop was planted, whether/when it was watered, and the
 * player's growth-speed upgrade level, returns its current stage (0-3).
 */
export function computeStage(
  plantedAt: number,
  wateredAt: number | null,
  growthSpeedLevel: number,
  now: number = Date.now()
): CropStage {
  const speedMul = growthSpeedMultiplier(growthSpeedLevel);
  let totalMs = BASE_GROW_MS * speedMul;
  let elapsed = now - plantedAt;

  if (wateredAt !== null && wateredAt >= plantedAt) {
    const beforeWater = wateredAt - plantedAt;
    const afterWater = Math.max(0, now - wateredAt);
    elapsed = beforeWater + afterWater / WATER_BONUS_MULTIPLIER;
  }

  const ratio = Math.min(1, Math.max(0, elapsed / totalMs));
  if (ratio >= 1) return 3;
  if (ratio >= 0.66) return 2;
  if (ratio >= 0.33) return 1;
  return 0;
}

export function isReadyToHarvest(
  plantedAt: number,
  wateredAt: number | null,
  growthSpeedLevel: number,
  now: number = Date.now()
): boolean {
  return computeStage(plantedAt, wateredAt, growthSpeedLevel, now) === 3;
}
