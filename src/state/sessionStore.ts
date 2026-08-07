import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { webStorage } from "./persistStorage";

interface SessionState {
  /** False until a life has actually ended -- gates the stats corner on
   * EntryScreen so a brand-new visitor doesn't see a wall of zeros. */
  hasPlayed: boolean;
  highestScore: number;
  mostKills: number;
  totalKills: number;
  totalCropsCollected: number;
  recordGameEnd: (result: { kills: number; peakCrops: number; cropsCollected: number }) => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      hasPlayed: false,
      highestScore: 0,
      mostKills: 0,
      totalKills: 0,
      totalCropsCollected: 0,
      recordGameEnd: ({ kills, peakCrops, cropsCollected }) =>
        set((s) => ({
          hasPlayed: true,
          highestScore: Math.max(s.highestScore, peakCrops),
          mostKills: Math.max(s.mostKills, kills),
          totalKills: s.totalKills + kills,
          totalCropsCollected: s.totalCropsCollected + cropsCollected,
        })),
    }),
    { name: "harvest-rush-session", storage: createJSONStorage(() => webStorage) }
  )
);
