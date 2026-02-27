import { EnemyEntityData, EntitiesMap, PlayerEntityData } from "../types";
import { useFarmStore } from "../../state/farmStore";
import { useRunStore } from "../../state/runStore";
import { useEconomyStore } from "../../state/economyStore";
import { ENEMY_HIT_RADIUS, FARM_PX_HEIGHT, FARM_PX_WIDTH, tileCenter } from "../constants";
import { spawnPositionForEdge } from "../entities/factory";

const WALK_FRAME_INTERVAL_MS = 200;
const STEAL_PAUSE_MS = 550;
const FLEE_SPEED_MULTIPLIER = 1.35;
const SCARE_BONUS_COINS = 3;
const OFFSCREEN_MARGIN = 40;

function isFarOffscreen(x: number, y: number) {
  return (
    x < -OFFSCREEN_MARGIN ||
    x > FARM_PX_WIDTH + OFFSCREEN_MARGIN ||
    y < -OFFSCREEN_MARGIN ||
    y > FARM_PX_HEIGHT + OFFSCREEN_MARGIN
  );
}

export function enemyAISystem(entities: EntitiesMap, { time }: any): EntitiesMap {
  const player = entities.player as PlayerEntityData | undefined;
  const dt = Math.min(64, time.delta || 16) / 1000;
  const run = useRunStore.getState();

  for (const key of Object.keys(entities)) {
    const entity = entities[key] as any;
    if (entity.type !== "enemy") continue;
    const enemy = entity as EnemyEntityData;

    // Player scares an approaching/stealing enemy on contact.
    if (player && enemy.state !== "fleeing") {
      const dx = player.position.x - enemy.position.x;
      const dy = player.position.y - enemy.position.y;
      if (Math.hypot(dx, dy) < ENEMY_HIT_RADIUS) {
        enemy.state = "fleeing";
        useEconomyStore.getState().addCoins(SCARE_BONUS_COINS);
        run.earnCoinsThisRun(SCARE_BONUS_COINS);
      }
    }

    if (enemy.state === "approaching") {
      const dest =
        enemy.targetTileIndex !== null
          ? tileCenter(enemy.targetTileIndex)
          : { x: FARM_PX_WIDTH / 2, y: FARM_PX_HEIGHT / 2 };
      const dx = dest.x - enemy.position.x;
      const dy = dest.y - enemy.position.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 6) {
        if (enemy.targetTileIndex !== null) {
          enemy.state = "stealing";
          enemy.stealTimer = STEAL_PAUSE_MS;
        } else {
          enemy.state = "fleeing";
        }
      } else {
        enemy.position.x += (dx / dist) * enemy.speed * dt;
        enemy.position.y += (dy / dist) * enemy.speed * dt;
      }
    } else if (enemy.state === "stealing") {
      enemy.stealTimer -= dt * 1000;
      if (enemy.stealTimer <= 0) {
        const farm = useFarmStore.getState();
        const tile = enemy.targetTileIndex !== null ? farm.tiles[enemy.targetTileIndex] : null;
        if (tile && tile.crop) {
          farm.clearTile(enemy.targetTileIndex!);
          run.takeDamage(1);
        }
        enemy.state = "fleeing";
      }
    } else if (enemy.state === "fleeing") {
      const dest = spawnPositionForEdge(enemy.spawnEdge);
      const dx = dest.x - enemy.position.x;
      const dy = dest.y - enemy.position.y;
      const dist = Math.hypot(dx, dy) || 1;
      enemy.position.x += (dx / dist) * enemy.speed * FLEE_SPEED_MULTIPLIER * dt;
      enemy.position.y += (dy / dist) * enemy.speed * FLEE_SPEED_MULTIPLIER * dt;

      if (isFarOffscreen(enemy.position.x, enemy.position.y)) {
        delete entities[key];
        run.incrementEnemiesAlive(-1);
        continue;
      }
    }

    enemy.walkFrame = Math.floor(time.current / WALK_FRAME_INTERVAL_MS) % 2 === 0 ? 0 : 1;
  }

  return entities;
}
