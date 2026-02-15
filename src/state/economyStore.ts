import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type UpgradeId =
  | "growthSpeed" // faster crop growth
  | "wateringRange" // water multiple tiles at once
  | "plantSpeed" // plant multiple seeds at once
  | "tractor" // unlocks multi-tile planting/harvesting
  | "irrigation" // auto-waters planted tiles over time
  | "fence"; // slows / blocks thieves and animals

export interface UpgradeDef {
  id: UpgradeId;
  label: string;
  description: string;
  maxLevel: number;
  baseCost: number;
  costGrowth: number; // multiplier per level
}

export const UPGRADES: Record<UpgradeId, UpgradeDef> = {
  growthSpeed: {
    id: "growthSpeed",
    label: "Crop Speed",
    description: "Crops grow faster through each stage.",
    maxLevel: 8,
    baseCost: 50,
    costGrowth: 1.6,
  },
  wateringRange: {
    id: "wateringRange",
    label: "Watering Can+",
    description: "Water a wider area with one tap.",
    maxLevel: 5,
    baseCost: 80,
    costGrowth: 1.8,
  },
  plantSpeed: {
    id: "plantSpeed",
    label: "Seed Pouch+",
    description: "Plant multiple tiles per tap.",
    maxLevel: 5,
    baseCost: 80,
    costGrowth: 1.8,
  },
  tractor: {
    id: "tractor",
    label: "Tractor",
    description: "Till, plant, and harvest whole rows instantly.",
    maxLevel: 3,
    baseCost: 500,
    costGrowth: 2.5,
  },
  irrigation: {
    id: "irrigation",
    label: "Irrigation",
    description: "Planted tiles water themselves over time.",
    maxLevel: 3,
    baseCost: 350,
    costGrowth: 2.2,
  },
  fence: {
    id: "fence",
    label: "Fencing",
    description: "Slows animals and thieves approaching your crops.",
    maxLevel: 5,
    baseCost: 120,
    costGrowth: 1.7,
  },
};

export function upgradeCost(id: UpgradeId, currentLevel: number): number {
  const def = UPGRADES[id];
  return Math.round(def.baseCost * Math.pow(def.costGrowth, currentLevel));
}

interface EconomyState {
  coins: number;
  gems: number;
  totalCoinsEarned: number;
  upgradeLevels: Record<UpgradeId, number>;
  addCoins: (amount: number) => void;
  spendCoins: (amount: number) => boolean;
  addGems: (amount: number) => void;
  spendGems: (amount: number) => boolean;
  buyUpgrade: (id: UpgradeId) => boolean;
  levelOf: (id: UpgradeId) => number;
}

const initialLevels: Record<UpgradeId, number> = {
  growthSpeed: 0,
  wateringRange: 0,
  plantSpeed: 0,
  tractor: 0,
  irrigation: 0,
  fence: 0,
};

export const useEconomyStore = create<EconomyState>()(
  persist(
    (set, get) => ({
      coins: 100,
      gems: 20,
      totalCoinsEarned: 0,
      upgradeLevels: initialLevels,
      addCoins: (amount) =>
        set((s) => ({
          coins: s.coins + amount,
          totalCoinsEarned: s.totalCoinsEarned + Math.max(0, amount),
        })),
      spendCoins: (amount) => {
        const { coins } = get();
        if (coins < amount) return false;
        set({ coins: coins - amount });
        return true;
      },
      addGems: (amount) => set((s) => ({ gems: s.gems + amount })),
      spendGems: (amount) => {
        const { gems } = get();
        if (gems < amount) return false;
        set({ gems: gems - amount });
        return true;
      },
      buyUpgrade: (id) => {
        const def = UPGRADES[id];
        const level = get().upgradeLevels[id];
        if (level >= def.maxLevel) return false;
        const cost = upgradeCost(id, level);
        if (!get().spendCoins(cost)) return false;
        set((s) => ({ upgradeLevels: { ...s.upgradeLevels, [id]: level + 1 } }));
        return true;
      },
      levelOf: (id) => get().upgradeLevels[id],
    }),
    {
      name: "harvestrush.economy",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
