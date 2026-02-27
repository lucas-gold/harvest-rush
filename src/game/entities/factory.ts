import { PlayerRenderer } from "./PlayerRenderer";
import { EnemyRenderer } from "./EnemyRenderer";
import { EnemyEntityData, EnemyKind, InputRef, PlayerEntityData } from "../types";
import { FARM_PX_HEIGHT, FARM_PX_WIDTH, PLAYER_BASE_SPEED, tileCenter } from "../constants";

export function createPlayerEntity(input: InputRef): PlayerEntityData {
  return {
    type: "player",
    position: { x: FARM_PX_WIDTH / 2, y: FARM_PX_HEIGHT / 2 },
    direction: "down",
    walkFrame: 0,
    moving: false,
    speed: PLAYER_BASE_SPEED,
    input,
    renderer: PlayerRenderer as any,
  };
}

const EDGE_OPTIONS: EnemyEntityData["spawnEdge"][] = ["top", "bottom", "left", "right"];

const KIND_SPEED: Record<EnemyKind, number> = {
  chicken: 70,
  fox: 105,
  thief: 85,
};

export function pickSpawnEdge(): EnemyEntityData["spawnEdge"] {
  return EDGE_OPTIONS[Math.floor(Math.random() * EDGE_OPTIONS.length)];
}

export function spawnPositionForEdge(edge: EnemyEntityData["spawnEdge"]) {
  const margin = 30;
  switch (edge) {
    case "top":
      return { x: Math.random() * FARM_PX_WIDTH, y: -margin };
    case "bottom":
      return { x: Math.random() * FARM_PX_WIDTH, y: FARM_PX_HEIGHT + margin };
    case "left":
      return { x: -margin, y: Math.random() * FARM_PX_HEIGHT };
    case "right":
    default:
      return { x: FARM_PX_WIDTH + margin, y: Math.random() * FARM_PX_HEIGHT };
  }
}

export function createEnemyEntity(
  kind: EnemyKind,
  targetTileIndex: number | null,
  speedMultiplier: number = 1
): EnemyEntityData {
  const edge = pickSpawnEdge();
  return {
    type: "enemy",
    kind,
    position: spawnPositionForEdge(edge),
    spawnEdge: edge,
    targetTileIndex,
    speed: KIND_SPEED[kind] * speedMultiplier,
    state: "approaching",
    walkFrame: 0,
    stealTimer: 0,
    fleeTimer: 0,
    renderer: EnemyRenderer as any,
  };
}

export function randomEnemyKind(wave: number): EnemyKind {
  const r = Math.random();
  if (wave >= 4 && r < 0.25) return "thief";
  if (r < 0.55) return "chicken";
  return "fox";
}

export { tileCenter };
