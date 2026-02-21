import { FARM_COLS, FARM_ROWS } from "../state/farmStore";

export const TILE_SIZE = 40;
export const FARM_PX_WIDTH = FARM_COLS * TILE_SIZE;
export const FARM_PX_HEIGHT = FARM_ROWS * TILE_SIZE;

export const PLAYER_SIZE = 34;
export const PLAYER_BASE_SPEED = 150; // px/sec
export const ENEMY_HIT_RADIUS = 26; // player-touches-enemy scare distance

export const WAVE_BASE_ENEMY_COUNT = 4;
export const WAVE_ENEMY_GROWTH = 2;
export const WAVE_BASE_SPAWN_INTERVAL_MS = 1800;
export const WAVE_SPAWN_INTERVAL_FLOOR_MS = 500;
export const WAVE_INTERMISSION_MS = 2500;

export function tileCenter(index: number): { x: number; y: number } {
  const col = index % FARM_COLS;
  const row = Math.floor(index / FARM_COLS);
  return { x: col * TILE_SIZE + TILE_SIZE / 2, y: row * TILE_SIZE + TILE_SIZE / 2 };
}

export function tileIndexAt(x: number, y: number): number | null {
  const col = Math.floor(x / TILE_SIZE);
  const row = Math.floor(y / TILE_SIZE);
  if (col < 0 || col >= FARM_COLS || row < 0 || row >= FARM_ROWS) return null;
  return row * FARM_COLS + col;
}

export function nearestTileIndex(x: number, y: number): number {
  const col = Math.min(FARM_COLS - 1, Math.max(0, Math.round((x - TILE_SIZE / 2) / TILE_SIZE)));
  const row = Math.min(FARM_ROWS - 1, Math.max(0, Math.round((y - TILE_SIZE / 2) / TILE_SIZE)));
  return row * FARM_COLS + col;
}
