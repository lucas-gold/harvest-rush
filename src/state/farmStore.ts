import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CropType } from "../pixelart/sprites";
import { FARM_COLS, FARM_ROWS } from "../game/constants";

export { FARM_COLS, FARM_ROWS };

export interface FarmCrop {
  type: CropType;
  plantedAt: number;
  wateredAt: number | null;
}

export interface FarmTile {
  crop: FarmCrop | null;
}

function emptyTile(): FarmTile {
  return { crop: null };
}

interface FarmState {
  tiles: FarmTile[];
  plantTile: (index: number, type: CropType) => void;
  waterTile: (index: number) => void;
  clearTile: (index: number) => void; // harvest or theft
  resetFarm: () => void;
}

export const useFarmStore = create<FarmState>()(
  persist(
    (set, get) => ({
      tiles: Array.from({ length: FARM_COLS * FARM_ROWS }, emptyTile),
      plantTile: (index, type) =>
        set((s) => {
          const tiles = s.tiles.slice();
          const t = tiles[index];
          if (!t || t.crop) return s;
          tiles[index] = { crop: { type, plantedAt: Date.now(), wateredAt: null } };
          return { tiles };
        }),
      waterTile: (index) =>
        set((s) => {
          const tiles = s.tiles.slice();
          const t = tiles[index];
          if (!t || !t.crop || t.crop.wateredAt) return s;
          tiles[index] = { crop: { ...t.crop, wateredAt: Date.now() } };
          return { tiles };
        }),
      clearTile: (index) =>
        set((s) => {
          const tiles = s.tiles.slice();
          if (!tiles[index]) return s;
          tiles[index] = emptyTile();
          return { tiles };
        }),
      resetFarm: () => set({ tiles: Array.from({ length: FARM_COLS * FARM_ROWS }, emptyTile) }),
    }),
    {
      name: "harvestrush.farm",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
