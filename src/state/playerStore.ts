import { create } from "zustand";
import { AvatarCustomization, DEFAULT_CUSTOMIZATION } from "../pixelart/sprites";

// Deliberately not persisted — accounts are session-only for now. Pick a
// name and an avatar each time you open the app.
interface PlayerState {
  name: string;
  customization: AvatarCustomization;
  setName: (name: string) => void;
  setCustomization: (patch: Partial<AvatarCustomization>) => void;
}

export const usePlayerStore = create<PlayerState>()((set) => ({
  name: "",
  customization: DEFAULT_CUSTOMIZATION,
  setName: (name) => set({ name: name.trim().slice(0, 16) }),
  setCustomization: (patch) => set((s) => ({ customization: { ...s.customization, ...patch } })),
}));
