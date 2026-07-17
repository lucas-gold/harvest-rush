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
  // Mutated in place, not spread-copied — with coverage-based spawning
  // there can be ~1-2k crops in a room, and a full {...crops} clone on
  // every single pickup/spawn tick (which happens continuously while
  // anyone is actively collecting in a field this dense) was the actual
  // source of "laggy, especially once I collect a crop": real, repeated
  // large-object cloning and the GC pressure that comes with it, not
  // rendering cost. cropsVersion/seedlingsVersion are the reactive
  // trigger instead — bump on every mutation, read the (mutated) data
  // itself via getState() or a plain selector at render time.
  crops: Record<string, CropSnapshot>;
  cropsVersion: number;
  seedlings: Record<string, SeedlingSnapshot>;
  seedlingsVersion: number;
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
  cropsVersion: 0,
  seedlings: {} as Record<string, SeedlingSnapshot>,
  seedlingsVersion: 0,
  leaderboard: [] as LeaderboardEntry[],
  playerCount: 0,
  lastPop: null as { byName: string | null; finalCrops: number; at: number } | null,
};

export const useArenaStore = create<ArenaState>()((set, get) => ({
  ...initial,
  // Fresh objects, not the module-level `initial`'s nested ones — those
  // get mutated in place from here on (see the comment on `crops` above),
  // and sharing them would mean the "initial" template itself could drift.
  players: {},
  crops: {},
  seedlings: {},

  _setStatus: (status) => set({ status }),

  _setWelcome: ({ playerId, arenaRadius, players, crops, seedlings }) =>
    set((s) => ({
      selfId: playerId,
      arenaRadius,
      players: Object.fromEntries(players.map((p) => [p.id, p])),
      crops: Object.fromEntries(crops.map((c) => [c.id, c])),
      cropsVersion: s.cropsVersion + 1,
      seedlings: Object.fromEntries(seedlings.map((sd) => [sd.id, sd])),
      seedlingsVersion: s.seedlingsVersion + 1,
      status: "connected",
    })),

  _applyState: (players, leaderboard, playerCount, arenaRadius) =>
    set({
      players: Object.fromEntries(players.map((p) => [p.id, p])),
      leaderboard,
      playerCount,
      arenaRadius,
    }),

  _addCrops: (crops) =>
    set((s) => {
      for (const c of crops) s.crops[c.id] = c;
      return { crops: s.crops, cropsVersion: s.cropsVersion + 1 };
    }),

  _removeCrops: (ids) =>
    set((s) => {
      for (const id of ids) delete s.crops[id];
      return { crops: s.crops, cropsVersion: s.cropsVersion + 1 };
    }),

  _addSeedlings: (seedlings) =>
    set((s) => {
      for (const sd of seedlings) s.seedlings[sd.id] = sd;
      return { seedlings: s.seedlings, seedlingsVersion: s.seedlingsVersion + 1 };
    }),

  _removeSeedlings: (ids) =>
    set((s) => {
      for (const id of ids) delete s.seedlings[id];
      return { seedlings: s.seedlings, seedlingsVersion: s.seedlingsVersion + 1 };
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

  _reset: () => set({ ...initial, crops: {}, seedlings: {}, players: {} }),
}));
