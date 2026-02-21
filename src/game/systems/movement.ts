import { EntitiesMap, PlayerEntityData } from "../types";
import { FARM_PX_HEIGHT, FARM_PX_WIDTH, PLAYER_SIZE } from "../constants";

const WALK_FRAME_INTERVAL_MS = 160;

export function movementSystem(entities: EntitiesMap, { time }: any): EntitiesMap {
  const player = entities.player as PlayerEntityData | undefined;
  if (!player) return entities;

  const dt = Math.min(64, time.delta || 16) / 1000;
  const { x: vx, y: vy } = player.input.vector;
  const magnitude = Math.hypot(vx, vy);

  if (magnitude > 0.05) {
    const nx = vx / Math.max(magnitude, 1);
    const ny = vy / Math.max(magnitude, 1);
    player.position.x += nx * player.speed * dt * Math.min(magnitude, 1);
    player.position.y += ny * player.speed * dt * Math.min(magnitude, 1);
    player.moving = true;

    if (Math.abs(vx) > Math.abs(vy)) {
      player.direction = vx > 0 ? "right" : "left";
    } else {
      player.direction = vy > 0 ? "down" : "up";
    }

    if (Math.floor(time.current / WALK_FRAME_INTERVAL_MS) % 2 === 0) {
      player.walkFrame = 0;
    } else {
      player.walkFrame = 1;
    }
  } else {
    player.moving = false;
    player.walkFrame = 0;
  }

  const half = PLAYER_SIZE / 2;
  player.position.x = Math.min(FARM_PX_WIDTH - half, Math.max(half, player.position.x));
  player.position.y = Math.min(FARM_PX_HEIGHT - half, Math.max(half, player.position.y));

  return entities;
}
