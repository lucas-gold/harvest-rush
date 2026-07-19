import { create } from "zustand";

export type ControlScheme = "dragFireButton" | "dragDistanceFire" | "dpadFireButton";

interface SettingsState {
  hapticsOn: boolean;
  toggleHaptics: () => void;
  controlScheme: ControlScheme;
  setControlScheme: (scheme: ControlScheme) => void;
}

export const useSettingsStore = create<SettingsState>()((set) => ({
  hapticsOn: true,
  toggleHaptics: () => set((s) => ({ hapticsOn: !s.hapticsOn })),
  controlScheme: "dragFireButton",
  setControlScheme: (controlScheme) => set({ controlScheme }),
}));
