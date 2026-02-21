import { useFarmStore, FARM_COLS, FARM_ROWS } from "../state/farmStore";
import { useEconomyStore } from "../state/economyStore";
import { useRunStore } from "../state/runStore";
import { CROPS } from "./crops";
import { computeStage } from "./growth";

export type TileActionResult =
  | { kind: "tilled"; count: number }
  | { kind: "planted"; count: number }
  | { kind: "watered"; count: number }
  | { kind: "harvested"; count: number; coins: number }
  | { kind: "blocked"; reason: "not-ready" | "cant-afford" | "invalid" };

function rowExtension(index: number, level: number): number[] {
  const row = Math.floor(index / FARM_COLS);
  const col = index % FARM_COLS;
  const out: number[] = [];
  for (let c = col; c <= Math.min(FARM_COLS - 1, col + level); c++) {
    out.push(row * FARM_COLS + c);
  }
  return out;
}

function plusShape(index: number, level: number): number[] {
  if (level <= 0) return [index];
  const row = Math.floor(index / FARM_COLS);
  const col = index % FARM_COLS;
  const out = new Set<number>([index]);
  const neighbors: [number, number][] =
    level >= 3
      ? [
          [0, -1], [0, 1], [-1, 0], [1, 0],
          [-1, -1], [1, -1], [-1, 1], [1, 1],
        ]
      : [[0, -1], [0, 1], [-1, 0], [1, 0]];
  for (const [dc, dr] of neighbors) {
    const nc = col + dc;
    const nr = row + dr;
    if (nc >= 0 && nc < FARM_COLS && nr >= 0 && nr < FARM_ROWS) {
      out.add(nr * FARM_COLS + nc);
    }
  }
  return Array.from(out);
}

export function performTileTap(index: number): TileActionResult {
  const farm = useFarmStore.getState();
  const eco = useEconomyStore.getState();
  const run = useRunStore.getState();
  const tile = farm.tiles[index];
  if (!tile) return { kind: "blocked", reason: "invalid" };

  // Till bare grass
  if (!tile.tilled && !tile.crop) {
    const targets = rowExtension(index, eco.upgradeLevels.tractor);
    let count = 0;
    for (const i of targets) {
      const t = farm.tiles[i];
      if (t && !t.tilled && !t.crop) {
        farm.tillTile(i);
        count++;
      }
    }
    return { kind: "tilled", count };
  }

  // Plant on tilled, empty soil
  if (tile.tilled && !tile.crop) {
    const targets = rowExtension(index, eco.upgradeLevels.plantSpeed);
    const plantable = targets.filter((i) => {
      const t = farm.tiles[i];
      return t && t.tilled && !t.crop;
    });
    const cropDef = CROPS[run.selectedCrop];
    const totalCost = cropDef.seedCost * plantable.length;
    if (plantable.length === 0) return { kind: "blocked", reason: "invalid" };
    if (!eco.spendCoins(totalCost)) return { kind: "blocked", reason: "cant-afford" };
    plantable.forEach((i) => farm.plantTile(i, run.selectedCrop));
    return { kind: "planted", count: plantable.length };
  }

  // Water a growing, unwatered crop
  if (tile.crop && !tile.crop.wateredAt) {
    const targets = plusShape(index, eco.upgradeLevels.wateringRange);
    let count = 0;
    for (const i of targets) {
      const t = farm.tiles[i];
      if (t && t.crop && !t.crop.wateredAt) {
        farm.waterTile(i);
        count++;
      }
    }
    return { kind: "watered", count };
  }

  // Harvest a ready crop
  if (tile.crop) {
    const stage = computeStage(
      tile.crop.plantedAt,
      tile.crop.wateredAt,
      eco.upgradeLevels.growthSpeed
    );
    if (stage < 3) return { kind: "blocked", reason: "not-ready" };

    const targets = rowExtension(index, eco.upgradeLevels.tractor);
    let coins = 0;
    let count = 0;
    for (const i of targets) {
      const t = farm.tiles[i];
      if (!t || !t.crop) continue;
      const s = computeStage(t.crop.plantedAt, t.crop.wateredAt, eco.upgradeLevels.growthSpeed);
      if (s < 3) continue;
      coins += CROPS[t.crop.type].sellPrice;
      farm.clearTile(i);
      count++;
    }
    if (count === 0) return { kind: "blocked", reason: "not-ready" };
    eco.addCoins(coins);
    run.earnCoinsThisRun(coins);
    return { kind: "harvested", count, coins };
  }

  return { kind: "blocked", reason: "invalid" };
}
