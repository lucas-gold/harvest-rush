import { EntitiesMap } from "../types";
import { useRunStore } from "../../state/runStore";
import { useFarmStore } from "../../state/farmStore";
import { useEconomyStore } from "../../state/economyStore";
import { createEnemyEntity, randomEnemyKind } from "../entities/factory";
import {
  WAVE_BASE_ENEMY_COUNT,
  WAVE_BASE_SPAWN_INTERVAL_MS,
  WAVE_ENEMY_GROWTH,
  WAVE_INTERMISSION_MS,
  WAVE_SPAWN_INTERVAL_FLOOR_MS,
} from "../constants";

export interface WaveStateEntity {
  type: "waveState";
  phase: "intermission" | "spawning";
  intermissionUntil: number; // -1 = not yet set (waiting for first tick's time base)
  lastSpawnAt: number;
}

export function createWaveState(): WaveStateEntity {
  return {
    type: "waveState",
    phase: "intermission",
    intermissionUntil: -1,
    lastSpawnAt: 0,
  };
}

let spawnCounter = 0;

export function waveSpawnerSystem(entities: EntitiesMap, { time }: any): EntitiesMap {
  const waveState = (entities as any).waveState as WaveStateEntity | undefined;
  const run = useRunStore.getState();
  if (!waveState || run.status !== "playing") return entities;

  // GameEngine's `time.current` comes from requestAnimationFrame, which is
  // relative to app start — not Date.now(). Seed the first deadline off the
  // engine's own clock rather than assuming a value up front.
  if (waveState.intermissionUntil < 0) {
    waveState.intermissionUntil = time.current + WAVE_INTERMISSION_MS;
  }

  if (waveState.phase === "intermission") {
    if (time.current >= waveState.intermissionUntil) {
      const count = WAVE_BASE_ENEMY_COUNT + (run.wave - 1) * WAVE_ENEMY_GROWTH;
      run.setSpawnPlan(count);
      waveState.phase = "spawning";
      waveState.lastSpawnAt = 0;
    }
    return entities;
  }

  // phase === "spawning"
  if (run.enemiesRemainingToSpawn > 0) {
    const interval = Math.max(
      WAVE_SPAWN_INTERVAL_FLOOR_MS,
      WAVE_BASE_SPAWN_INTERVAL_MS - run.wave * 120
    );
    if (time.current - waveState.lastSpawnAt >= interval) {
      waveState.lastSpawnAt = time.current;

      const farm = useFarmStore.getState();
      const plantedIndices: number[] = [];
      farm.tiles.forEach((t, i) => {
        if (t.crop) plantedIndices.push(i);
      });
      const target =
        plantedIndices.length > 0
          ? plantedIndices[Math.floor(Math.random() * plantedIndices.length)]
          : null;

      const kind = randomEnemyKind(run.wave);
      const fenceLevel = useEconomyStore.getState().upgradeLevels.fence;
      const speedMul = Math.max(0.45, 1 - fenceLevel * 0.08);

      const id = `enemy-${++spawnCounter}`;
      (entities as any)[id] = createEnemyEntity(kind, target, speedMul);

      run.decrementSpawnRemaining();
      run.incrementEnemiesAlive(1);
    }
  } else if (run.enemiesAlive === 0) {
    run.advanceWave();
    waveState.phase = "intermission";
    waveState.intermissionUntil = time.current + WAVE_INTERMISSION_MS;
  }

  return entities;
}
