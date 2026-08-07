import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  AvatarCustomization,
  HAIR_OPTIONS,
  SHIRT_OPTIONS,
  SKIN_OPTIONS,
} from "../pixelart/sprites";
import { webStorage } from "./persistStorage";

function randomCustomization(): AvatarCustomization {
  return {
    skinTone: SKIN_OPTIONS[Math.floor(Math.random() * SKIN_OPTIONS.length)],
    hairColor: HAIR_OPTIONS[Math.floor(Math.random() * HAIR_OPTIONS.length)],
    shirtColor: SHIRT_OPTIONS[Math.floor(Math.random() * SHIRT_OPTIONS.length)],
    hat: Math.random() < 0.3,
  };
}

const STORAGE_KEY = "harvest-rush-player";

interface PlayerState {
  name: string;
  customization: AvatarCustomization;
  setName: (name: string) => void;
  setCustomization: (patch: Partial<AvatarCustomization>) => void;
}

// Read before the store exists so we can tell "genuinely never opened
// this app before" apart from "returning visitor, hydration just hasn't
// run yet" -- both look identical once the store is live.
const isFirstEverVisit = typeof localStorage === "undefined" || localStorage.getItem(STORAGE_KEY) === null;

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set) => ({
      name: "",
      // Only ever meant for the very first time someone opens the app --
      // any returning visitor's actual choice overwrites this on
      // hydration, so a fresh, random combo each first visit beats
      // everyone starting from the exact same look.
      customization: randomCustomization(),
      setName: (name) => set({ name: name.trim().slice(0, 16) }),
      setCustomization: (patch) => set((s) => ({ customization: { ...s.customization, ...patch } })),
    }),
    { name: STORAGE_KEY, storage: createJSONStorage(() => webStorage) }
  )
);

// The initializer above runs outside `set`, so persist's own storage
// write never fires for the randomized first-visit default on its own --
// without this, it'd silently re-roll on every reload instead of sticking.
if (isFirstEverVisit) usePlayerStore.getState().setCustomization({});
