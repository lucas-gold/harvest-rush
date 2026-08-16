import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { webStorage } from "./persistStorage";

export type ControlScheme = "dragFireButton" | "dragDistanceFire" | "dpadFireButton";
export type JoystickSide = "left" | "right";

interface SettingsState {
  hapticsOn: boolean;
  toggleHaptics: () => void;
  controlScheme: ControlScheme;
  setControlScheme: (scheme: ControlScheme) => void;
  /** Which bottom corner the mobile-web joystick sits in -- the minimap
   * takes the other one (see ArenaScreen). Worth remembering across visits
   * the same way name/avatar are, not re-decided every time. */
  joystickSide: JoystickSide;
  setJoystickSide: (side: JoystickSide) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      hapticsOn: true,
      toggleHaptics: () => set((s) => ({ hapticsOn: !s.hapticsOn })),
      controlScheme: "dragFireButton",
      setControlScheme: (controlScheme) => set({ controlScheme }),
      joystickSide: "left",
      setJoystickSide: (joystickSide) => set({ joystickSide }),
    }),
    { name: "harvest-rush-settings", storage: createJSONStorage(() => webStorage) }
  )
);
