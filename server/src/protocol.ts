// Wire protocol between client and server. Kept as small, flat JSON
// messages — at this scale (≤40 players/room) full per-tick player state is
// simpler and cheap enough that delta-compression isn't worth the
// complexity; crops/seedlings (numerous but slow-changing) are sent as
// snapshot + incremental add/remove instead to keep bandwidth down.
//
// IMPORTANT: this file is hand-mirrored at src/multiplayer/protocol.ts in
// the client. Keep the two in sync when changing shapes here.

export type AvatarCustomization = {
  skinTone: "skin1" | "skin2" | "skin3" | "skin4";
  hairColor: "hairBrown" | "hairBlack" | "hairBlonde" | "hairRed";
  shirtColor: "shirtRed" | "shirtBlue" | "shirtGreen" | "shirtYellow";
  hat: boolean;
};

export interface PlayerSnapshot {
  id: string;
  name: string;
  avatar: AvatarCustomization;
  x: number;
  y: number;
  dirX: number;
  dirY: number;
  crops: number;
  invulnUntil: number;
  isBot: boolean;
}

export interface CropSnapshot {
  id: string;
  x: number;
  y: number;
}

export interface SeedlingSnapshot {
  id: string;
  x: number;
  y: number;
  plantedAt: number;
}

/** A seed in flight — short-lived (well under a second at typical range),
 * so unlike players these aren't interpolated client-side, just rendered
 * at their latest broadcast position. */
export interface SeedProjectileSnapshot {
  id: string;
  x: number;
  y: number;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  crops: number;
}

// ---- Client -> Server ----
export type ClientMessage =
  | { t: "join"; name: string; avatar: AvatarCustomization }
  | { t: "input"; dirX: number; dirY: number; firing: boolean };

// ---- Server -> Client ----
export type ServerMessage =
  | {
      t: "welcome";
      playerId: string;
      arenaRadius: number;
      tickMs: number;
      players: PlayerSnapshot[];
      crops: CropSnapshot[];
      seedlings: SeedlingSnapshot[];
    }
  | {
      t: "state";
      players: PlayerSnapshot[];
      seeds: SeedProjectileSnapshot[];
      leaderboard: LeaderboardEntry[];
      playerCount: number;
      arenaRadius: number;
    }
  | { t: "cropSpawn"; crops: CropSnapshot[] }
  | { t: "cropRemove"; ids: string[] }
  | { t: "seedlingSpawn"; seedlings: SeedlingSnapshot[] }
  | { t: "seedlingRemove"; ids: string[] }
  | { t: "popped"; byName: string | null }
  | { t: "hitConfirm"; targetName: string; targetIsBot: boolean; scattered: number; eliminated: boolean }
  | { t: "seedImpact"; targetId: string; amount: number; crit: boolean }
  | { t: "playerLeft"; id: string };
