import { create } from "zustand";
import { CropType } from "../pixelart/sprites";

export type GameStatus = "playing" | "paused" | "gameover";

interface RunState {
  status: GameStatus;
  wave: number;
  health: number;
  maxHealth: number;
  enemiesRemainingToSpawn: number;
  enemiesAlive: number;
  selectedCrop: CropType;
  coinsEarnedThisRun: number;
  wavesCleared: number;
  startRun: () => void;
  setStatus: (status: GameStatus) => void;
  setSelectedCrop: (crop: CropType) => void;
  takeDamage: (amount?: number) => void;
  earnCoinsThisRun: (amount: number) => void;
  setSpawnPlan: (remaining: number) => void;
  decrementSpawnRemaining: () => void;
  incrementEnemiesAlive: (delta: number) => void;
  advanceWave: () => void;
}

const STARTING_HEALTH = 10;

export const useRunStore = create<RunState>()((set, get) => ({
  status: "playing",
  wave: 1,
  health: STARTING_HEALTH,
  maxHealth: STARTING_HEALTH,
  enemiesRemainingToSpawn: 0,
  enemiesAlive: 0,
  selectedCrop: "wheat",
  coinsEarnedThisRun: 0,
  wavesCleared: 0,
  startRun: () =>
    set({
      status: "playing",
      wave: 1,
      health: STARTING_HEALTH,
      maxHealth: STARTING_HEALTH,
      enemiesRemainingToSpawn: 0,
      enemiesAlive: 0,
      coinsEarnedThisRun: 0,
      wavesCleared: 0,
    }),
  setStatus: (status) => set({ status }),
  setSelectedCrop: (crop) => set({ selectedCrop: crop }),
  takeDamage: (amount = 1) =>
    set((s) => {
      const health = Math.max(0, s.health - amount);
      return { health, status: health <= 0 ? "gameover" : s.status };
    }),
  earnCoinsThisRun: (amount) => set((s) => ({ coinsEarnedThisRun: s.coinsEarnedThisRun + amount })),
  setSpawnPlan: (remaining) => set({ enemiesRemainingToSpawn: remaining }),
  decrementSpawnRemaining: () =>
    set((s) => ({ enemiesRemainingToSpawn: Math.max(0, s.enemiesRemainingToSpawn - 1) })),
  incrementEnemiesAlive: (delta) => set((s) => ({ enemiesAlive: Math.max(0, s.enemiesAlive + delta) })),
  advanceWave: () =>
    set((s) => ({
      wave: s.wave + 1,
      wavesCleared: s.wavesCleared + 1,
    })),
}));
