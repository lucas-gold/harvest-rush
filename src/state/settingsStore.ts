import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface SettingsState {
  soundOn: boolean;
  hapticsOn: boolean;
  cloudSyncEnabled: boolean;
  toggleSound: () => void;
  toggleHaptics: () => void;
  toggleCloudSync: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      soundOn: true,
      hapticsOn: true,
      cloudSyncEnabled: true,
      toggleSound: () => set((s) => ({ soundOn: !s.soundOn })),
      toggleHaptics: () => set((s) => ({ hapticsOn: !s.hapticsOn })),
      toggleCloudSync: () => set((s) => ({ cloudSyncEnabled: !s.cloudSyncEnabled })),
    }),
    {
      name: "harvestrush.settings",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
