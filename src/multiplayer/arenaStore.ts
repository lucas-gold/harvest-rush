import { create } from "zustand";
import {
  CropSnapshot,
  LeaderboardEntry,
  PlayerSnapshot,
  PowerUpKind,
  PowerUpSnapshot,
  SeedlingSnapshot,
  SeedProjectileSnapshot,
} from "./protocol";

export type ConnectionStatus = "idle" | "connecting" | "connected" | "error";

export interface DamageImpact {
  id: string;
  targetId: string;
  amount: number;
  crit: boolean;
  at: number;
}

const IMPACT_MAX_AGE_MS = 2000; // pruned well after the ~1.2s the toast actually renders for

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
  // Rare (a handful on the map at most) — mutate-in-place isn't load-
  // bearing here the way it is for crops, but the same version-counter
  // pattern keeps every entity type consistent.
  powerUps: Record<string, PowerUpSnapshot>;
  powerUpsVersion: number;
  /** Seeds in flight — short-lived, so just replaced wholesale each tick
   * rather than mutated like crops/seedlings. */
  seeds: SeedProjectileSnapshot[];
  leaderboard: LeaderboardEntry[];
  playerCount: number;
  /** Bumped on every pop so the overlay can key off it even if byName repeats. */
  lastPop: { byName: string | null; at: number } | null;
  /** Recent floating "-20"/"-30" damage numbers, keyed by a unique impact
   * id (not targetId) so more than one can be in flight for the same
   * player at once. Pruned on every add rather than needing a timer. */
  impacts: DamageImpact[];
  /** Bumped on every power-up pickup (self only) so PowerUpToast can key
   * off it even if the same kind is picked up twice in a row. */
  lastPowerUpPickup: { kind: PowerUpKind; at: number } | null;

  _setStatus: (status: ConnectionStatus) => void;
  _setWelcome: (payload: {
    playerId: string;
    arenaRadius: number;
    players: PlayerSnapshot[];
    crops: CropSnapshot[];
    seedlings: SeedlingSnapshot[];
    powerUps: PowerUpSnapshot[];
  }) => void;
  _applyState: (
    players: PlayerSnapshot[],
    seeds: SeedProjectileSnapshot[],
    leaderboard: LeaderboardEntry[],
    playerCount: number,
    arenaRadius: number
  ) => void;
  _addCrops: (crops: CropSnapshot[]) => void;
  _removeCrops: (ids: string[]) => void;
  _addSeedlings: (seedlings: SeedlingSnapshot[]) => void;
  _removeSeedlings: (ids: string[]) => void;
  _addPowerUps: (powerUps: PowerUpSnapshot[]) => void;
  _removePowerUps: (ids: string[]) => void;
  _removePlayer: (id: string) => void;
  _setPopped: (byName: string | null) => void;
  _clearPop: () => void;
  _addImpact: (impact: { targetId: string; amount: number; crit: boolean }) => void;
  _setPowerUpPickup: (kind: PowerUpKind) => void;
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
  powerUps: {} as Record<string, PowerUpSnapshot>,
  powerUpsVersion: 0,
  seeds: [] as SeedProjectileSnapshot[],
  leaderboard: [] as LeaderboardEntry[],
  playerCount: 0,
  lastPop: null as { byName: string | null; at: number } | null,
  impacts: [] as DamageImpact[],
  lastPowerUpPickup: null as { kind: PowerUpKind; at: number } | null,
};

let impactIdCounter = 0;

export const useArenaStore = create<ArenaState>()((set) => ({
  ...initial,
  // Fresh objects, not the module-level `initial`'s nested ones — those
  // get mutated in place from here on (see the comment on `crops` above),
  // and sharing them would mean the "initial" template itself could drift.
  players: {},
  crops: {},
  seedlings: {},
  powerUps: {},

  _setStatus: (status) => set({ status }),

  _setWelcome: ({ playerId, arenaRadius, players, crops, seedlings, powerUps }) =>
    set((s) => ({
      selfId: playerId,
      arenaRadius,
      players: Object.fromEntries(players.map((p) => [p.id, p])),
      crops: Object.fromEntries(crops.map((c) => [c.id, c])),
      cropsVersion: s.cropsVersion + 1,
      seedlings: Object.fromEntries(seedlings.map((sd) => [sd.id, sd])),
      seedlingsVersion: s.seedlingsVersion + 1,
      powerUps: Object.fromEntries(powerUps.map((pu) => [pu.id, pu])),
      powerUpsVersion: s.powerUpsVersion + 1,
      status: "connected",
    })),

  _applyState: (players, seeds, leaderboard, playerCount, arenaRadius) =>
    set((s) => {
      const next: Record<string, PlayerSnapshot> = {};
      for (const p of players) {
        // `p` is a fresh object from JSON.parse on every single network
        // tick (~16.7Hz) — including `avatar`, even though avatar never
        // actually changes after join. Left as-is, that constant identity
        // churn defeats AvatarView's sprite-build memoization for every
        // visible player, every tick, for no reason (nothing about the
        // avatar ever changed). Reusing the previous reference when one
        // exists restores that memoization at zero behavioral cost.
        const existing = s.players[p.id];
        if (existing) p.avatar = existing.avatar;
        next[p.id] = p;
      }
      return { players: next, seeds, leaderboard, playerCount, arenaRadius };
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

  _addPowerUps: (powerUps) =>
    set((s) => {
      for (const pu of powerUps) s.powerUps[pu.id] = pu;
      return { powerUps: s.powerUps, powerUpsVersion: s.powerUpsVersion + 1 };
    }),

  _removePowerUps: (ids) =>
    set((s) => {
      for (const id of ids) delete s.powerUps[id];
      return { powerUps: s.powerUps, powerUpsVersion: s.powerUpsVersion + 1 };
    }),

  _removePlayer: (id) =>
    set((s) => {
      const players = { ...s.players };
      delete players[id];
      return { players };
    }),

  _setPopped: (byName) => set({ lastPop: { byName, at: Date.now() } }),

  _clearPop: () => set({ lastPop: null }),

  _addImpact: (impact) =>
    set((s) => {
      const now = Date.now();
      const next = s.impacts.filter((i) => now - i.at < IMPACT_MAX_AGE_MS);
      next.push({ ...impact, id: `imp${impactIdCounter++}`, at: now });
      return { impacts: next };
    }),

  _setPowerUpPickup: (kind) => set({ lastPowerUpPickup: { kind, at: Date.now() } }),

  _reset: () =>
    set({ ...initial, crops: {}, seedlings: {}, powerUps: {}, players: {}, seeds: [], impacts: [] }),
}));
