import { create } from "zustand";

export type ControlScheme = "dragBoostButton" | "dragDistanceBoost" | "dpadBoostButton";

interface SettingsState {
  hapticsOn: boolean;
  toggleHaptics: () => void;
  controlScheme: ControlScheme;
  setControlScheme: (scheme: ControlScheme) => void;
}

export const useSettingsStore = create<SettingsState>()((set) => ({
  hapticsOn: true,
  toggleHaptics: () => set((s) => ({ hapticsOn: !s.hapticsOn })),
  controlScheme: "dragBoostButton",
  setControlScheme: (controlScheme) => set({ controlScheme }),
}));
