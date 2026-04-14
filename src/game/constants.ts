import { Dimensions } from "react-native";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Tile size picked to be touch-friendly (~48pt) while filling the screen
// width exactly; rows extend to cover the full screen height (edge to
// edge — the farm is the entire gameplay backdrop, HUD/buttons float on
// top of it) even if that slightly overshoots below the fold.
const TARGET_TILE_SIZE = 48;

export const FARM_COLS = Math.max(4, Math.round(SCREEN_WIDTH / TARGET_TILE_SIZE));
export const TILE_SIZE = SCREEN_WIDTH / FARM_COLS;
export const FARM_ROWS = Math.max(6, Math.ceil(SCREEN_HEIGHT / TILE_SIZE));

export const FARM_PX_WIDTH = FARM_COLS * TILE_SIZE;
export const FARM_PX_HEIGHT = FARM_ROWS * TILE_SIZE;

export const PLAYER_SIZE = TILE_SIZE * 0.82;
export const PLAYER_BASE_SPEED = TILE_SIZE * 3.6; // px/sec — ~3.6 tiles/sec
export const ENEMY_HIT_RADIUS = TILE_SIZE * 0.65; // player-touches-enemy scare distance

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
