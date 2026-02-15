import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DEFAULT_CUSTOMIZATION, FarmerCustomization } from "../pixelart/sprites";

interface PlayerState {
  name: string;
  customization: FarmerCustomization;
  setName: (name: string) => void;
  setCustomization: (patch: Partial<FarmerCustomization>) => void;
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set) => ({
      name: "Farmer",
      customization: DEFAULT_CUSTOMIZATION,
      setName: (name) => set({ name: name.trim().slice(0, 16) || "Farmer" }),
      setCustomization: (patch) =>
        set((s) => ({ customization: { ...s.customization, ...patch } })),
    }),
    {
      name: "harvestrush.player",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
