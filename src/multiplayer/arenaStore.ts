import { create } from "zustand";
import {
  CropSnapshot,
  LeaderboardEntry,
  PlayerSnapshot,
  SeedlingSnapshot,
} from "./protocol";

export type ConnectionStatus = "idle" | "connecting" | "connected" | "error";

interface ArenaState {
  status: ConnectionStatus;
  selfId: string | null;
  arenaRadius: number;
  players: Record<string, PlayerSnapshot>;
  crops: Record<string, CropSnapshot>;
  seedlings: Record<string, SeedlingSnapshot>;
  leaderboard: LeaderboardEntry[];
  playerCount: number;
  /** Bumped on every pop so the overlay can key off it even if byName repeats. */
  lastPop: { byName: string | null; finalCrops: number; at: number } | null;

  _setStatus: (status: ConnectionStatus) => void;
  _setWelcome: (payload: {
    playerId: string;
    arenaRadius: number;
    players: PlayerSnapshot[];
    crops: CropSnapshot[];
    seedlings: SeedlingSnapshot[];
  }) => void;
  _applyState: (
    players: PlayerSnapshot[],
    leaderboard: LeaderboardEntry[],
    playerCount: number,
    arenaRadius: number
  ) => void;
  _addCrops: (crops: CropSnapshot[]) => void;
  _removeCrops: (ids: string[]) => void;
  _addSeedlings: (seedlings: SeedlingSnapshot[]) => void;
  _removeSeedlings: (ids: string[]) => void;
  _removePlayer: (id: string) => void;
  _setPopped: (byName: string | null) => void;
  _clearPop: () => void;
  _reset: () => void;
}

const initial = {
  status: "idle" as ConnectionStatus,
  selfId: null as string | null,
  arenaRadius: 1500,
  players: {} as Record<string, PlayerSnapshot>,
  crops: {} as Record<string, CropSnapshot>,
  seedlings: {} as Record<string, SeedlingSnapshot>,
  leaderboard: [] as LeaderboardEntry[],
  playerCount: 0,
  lastPop: null as { byName: string | null; finalCrops: number; at: number } | null,
};

export const useArenaStore = create<ArenaState>()((set, get) => ({
  ...initial,

  _setStatus: (status) => set({ status }),

  _setWelcome: ({ playerId, arenaRadius, players, crops, seedlings }) =>
    set({
      selfId: playerId,
      arenaRadius,
      players: Object.fromEntries(players.map((p) => [p.id, p])),
      crops: Object.fromEntries(crops.map((c) => [c.id, c])),
      seedlings: Object.fromEntries(seedlings.map((s) => [s.id, s])),
      status: "connected",
    }),

  _applyState: (players, leaderboard, playerCount, arenaRadius) =>
    set({
      players: Object.fromEntries(players.map((p) => [p.id, p])),
      leaderboard,
      playerCount,
      arenaRadius,
    }),

  _addCrops: (crops) =>
    set((s) => ({ crops: { ...s.crops, ...Object.fromEntries(crops.map((c) => [c.id, c])) } })),

  _removeCrops: (ids) =>
    set((s) => {
      const crops = { ...s.crops };
      for (const id of ids) delete crops[id];
      return { crops };
    }),

  _addSeedlings: (seedlings) =>
    set((s) => ({
      seedlings: { ...s.seedlings, ...Object.fromEntries(seedlings.map((sd) => [sd.id, sd])) },
    })),

  _removeSeedlings: (ids) =>
    set((s) => {
      const seedlings = { ...s.seedlings };
      for (const id of ids) delete seedlings[id];
      return { seedlings };
    }),

  _removePlayer: (id) =>
    set((s) => {
      const players = { ...s.players };
      delete players[id];
      return { players };
    }),

  _setPopped: (byName) => {
    // Read synchronously, before the next "state" message (which will have
    // already reset crops to 0 server-side) can be processed — WS messages
    // are handled in order, one onmessage call at a time, so this is safe.
    const finalCrops = get().selfId ? get().players[get().selfId!]?.crops ?? 0 : 0;
    set({ lastPop: { byName, finalCrops, at: Date.now() } });
  },

  _clearPop: () => set({ lastPop: null }),

  _reset: () => set({ ...initial }),
}));
