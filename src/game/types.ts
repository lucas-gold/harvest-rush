import { Direction } from "../pixelart/sprites";

export interface Vec2 {
  x: number;
  y: number;
}

export type EnemyKind = "chicken" | "fox" | "thief";

export interface InputRef {
  vector: Vec2; // normalized -1..1 joystick vector
  scareRequested: boolean; // set true on tap-to-shoo gesture near an enemy
}

export interface PlayerEntityData {
  type: "player";
  position: Vec2;
  direction: Direction;
  walkFrame: 0 | 1;
  moving: boolean;
  speed: number;
  input: InputRef;
  renderer: React.ComponentType<any>;
}

export interface EnemyEntityData {
  type: "enemy";
  kind: EnemyKind;
  position: Vec2;
  spawnEdge: "top" | "bottom" | "left" | "right";
  targetTileIndex: number | null;
  speed: number;
  state: "approaching" | "fleeing" | "stealing";
  walkFrame: 0 | 1;
  stealTimer: number;
  fleeTimer: number;
  renderer: React.ComponentType<any>;
}

export type AnyEntity = PlayerEntityData | EnemyEntityData;
export type EntitiesMap = { [id: string]: AnyEntity };
