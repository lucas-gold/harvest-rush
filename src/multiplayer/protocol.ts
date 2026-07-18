// Mirrors server/src/protocol.ts — keep the two in sync when either changes.
// Duplicated rather than shared across a package boundary to keep the
// client and server independently deployable (the client is a static
// bundle; the server is a long-running Node process).

export type AvatarCustomization = {
  skinTone: "skin1" | "skin2" | "skin3";
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
  boosting: boolean;
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

export interface LeaderboardEntry {
  id: string;
  name: string;
  crops: number;
}

export type ClientMessage =
  | { t: "join"; name: string; avatar: AvatarCustomization }
  | { t: "input"; dirX: number; dirY: number; boost: boolean };

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
      leaderboard: LeaderboardEntry[];
      playerCount: number;
      arenaRadius: number;
    }
  | { t: "cropSpawn"; crops: CropSnapshot[] }
  | { t: "cropRemove"; ids: string[] }
  | { t: "seedlingSpawn"; seedlings: SeedlingSnapshot[] }
  | { t: "seedlingRemove"; ids: string[] }
  | { t: "popped"; byName: string | null }
  | { t: "ramHit"; targetName: string; targetIsBot: boolean; scattered: number; eliminated: boolean }
  | { t: "playerLeft"; id: string };
