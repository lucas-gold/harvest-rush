import type { WebSocket } from "ws";
import * as C from "./constants";
import { randomId, randomPointInCircle, dist2, clampToCircle } from "./util";
import { randomBotAvatar, randomBotName } from "./bots";
import {
  AvatarCustomization,
  ServerMessage,
  PlayerSnapshot,
  CropSnapshot,
  SeedlingSnapshot,
  LeaderboardEntry,
} from "./protocol";

interface InternalPlayer {
  id: string;
  ws: WebSocket | null; // null for bots
  isBot: boolean;
  name: string;
  avatar: AvatarCustomization;
  x: number;
  y: number;
  dirX: number;
  dirY: number;
  boostRequested: boolean;
  crops: number;
  lastBoostCostAt: number;
  invulnUntil: number;
  // bot-only wander state
  nextDecisionAt: number;
  botTargetX: number;
  botTargetY: number;
}

interface InternalCrop {
  id: string;
  x: number;
  y: number;
}

interface InternalSeedling {
  id: string;
  x: number;
  y: number;
  plantedAt: number;
}

export class Room {
  readonly id: string;
  private players = new Map<string, InternalPlayer>();
  private crops = new Map<string, InternalCrop>();
  private seedlings = new Map<string, InternalSeedling>();
  private timer: ReturnType<typeof setInterval> | null = null;

  // events accumulated during a tick, flushed once at the end of it
  private pendingCropSpawn: CropSnapshot[] = [];
  private pendingCropRemove: string[] = [];
  private pendingSeedlingSpawn: SeedlingSnapshot[] = [];
  private pendingSeedlingRemove: string[] = [];

  constructor(id: string) {
    this.id = id;
  }

  realPlayerCount(): number {
    let n = 0;
    for (const p of this.players.values()) if (!p.isBot) n++;
    return n;
  }

  get isFull() {
    return this.realPlayerCount() >= C.MAX_PLAYERS_PER_ROOM;
  }

  get isEmpty() {
    return this.realPlayerCount() === 0;
  }

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => this.tick(), C.TICK_MS);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  join(ws: WebSocket, name: string, avatar: AvatarCustomization): string {
    const id = randomId("p");
    const spawn = randomPointInCircle(C.ARENA_RADIUS * 0.6);
    const now = Date.now();
    const player: InternalPlayer = {
      id,
      ws,
      isBot: false,
      name: name.slice(0, 16) || "Farmer",
      avatar,
      x: spawn.x,
      y: spawn.y,
      dirX: 0,
      dirY: 0,
      boostRequested: false,
      crops: C.STARTING_CROPS,
      lastBoostCostAt: 0,
      invulnUntil: now + C.COLLISION_INVULN_MS,
      nextDecisionAt: 0,
      botTargetX: spawn.x,
      botTargetY: spawn.y,
    };
    this.players.set(id, player);
    this.rebalanceBots();

    const welcome: ServerMessage = {
      t: "welcome",
      playerId: id,
      arenaRadius: C.ARENA_RADIUS,
      tickMs: C.TICK_MS,
      players: [...this.players.values()].map(this.toSnapshot),
      crops: [...this.crops.values()],
      seedlings: [...this.seedlings.values()],
    };
    this.send(player, welcome);
    return id;
  }

  leave(id: string) {
    if (!this.players.delete(id)) return;
    this.broadcast({ t: "playerLeft", id });
    this.rebalanceBots();
  }

  handleInput(id: string, dirX: number, dirY: number, boost: boolean) {
    const p = this.players.get(id);
    if (!p || p.isBot) return;
    const mag = Math.hypot(dirX, dirY);
    if (mag > 1) {
      dirX /= mag;
      dirY /= mag;
    }
    p.dirX = mag > 0.001 ? dirX : 0;
    p.dirY = mag > 0.001 ? dirY : 0;
    p.boostRequested = boost;
  }

  // ---- bots ----

  private rebalanceBots() {
    const real = this.realPlayerCount();
    const desiredBots = real > 0 ? Math.max(0, C.MIN_LOBBY_POPULATION - real) : 0;
    const currentBots = [...this.players.values()].filter((p) => p.isBot);

    if (currentBots.length < desiredBots) {
      for (let i = currentBots.length; i < desiredBots; i++) this.spawnBot();
    } else if (currentBots.length > desiredBots) {
      const excess = currentBots.slice(0, currentBots.length - desiredBots);
      for (const bot of excess) this.players.delete(bot.id);
    }
  }

  private spawnBot() {
    const id = randomId("bot");
    const spawn = randomPointInCircle(C.ARENA_RADIUS * 0.6);
    const bot: InternalPlayer = {
      id,
      ws: null,
      isBot: true,
      name: randomBotName(),
      avatar: randomBotAvatar(),
      x: spawn.x,
      y: spawn.y,
      dirX: 0,
      dirY: 0,
      boostRequested: false,
      crops: Math.floor(Math.random() * 4),
      lastBoostCostAt: 0,
      invulnUntil: Date.now() + C.COLLISION_INVULN_MS,
      nextDecisionAt: 0,
      botTargetX: spawn.x,
      botTargetY: spawn.y,
    };
    this.players.set(id, bot);
  }

  private updateBots(now: number) {
    for (const p of this.players.values()) {
      if (!p.isBot) continue;
      if (now >= p.nextDecisionAt) {
        p.nextDecisionAt = now + C.BOT_DECISION_INTERVAL_MS + Math.random() * 500;
        const target = this.pickBotTarget(p);
        p.botTargetX = target.x;
        p.botTargetY = target.y;
      }
      const dx = p.botTargetX - p.x;
      const dy = p.botTargetY - p.y;
      const mag = Math.hypot(dx, dy);
      if (mag > 4) {
        p.dirX = dx / mag;
        p.dirY = dy / mag;
      } else {
        p.dirX = 0;
        p.dirY = 0;
      }
    }
  }

  private pickBotTarget(p: InternalPlayer): { x: number; y: number } {
    let nearest: InternalCrop | null = null;
    let nearestD2 = C.BOT_PERCEPTION_RADIUS * C.BOT_PERCEPTION_RADIUS;
    for (const crop of this.crops.values()) {
      const d2 = dist2(p.x, p.y, crop.x, crop.y);
      if (d2 < nearestD2) {
        nearestD2 = d2;
        nearest = crop;
      }
    }
    if (nearest) return { x: nearest.x, y: nearest.y };
    return randomPointInCircle(C.ARENA_RADIUS * 0.9);
  }

  // ---- snapshot / networking ----

  private toSnapshot = (p: InternalPlayer): PlayerSnapshot => ({
    id: p.id,
    name: p.name,
    avatar: p.avatar,
    x: p.x,
    y: p.y,
    dirX: p.dirX,
    dirY: p.dirY,
    crops: p.crops,
    boosting: p.boostRequested && p.crops > 0,
    invulnUntil: p.invulnUntil,
    isBot: p.isBot,
  });

  private send(p: InternalPlayer, msg: ServerMessage) {
    if (p.ws && p.ws.readyState === p.ws.OPEN) p.ws.send(JSON.stringify(msg));
  }

  private broadcast(msg: ServerMessage) {
    const data = JSON.stringify(msg);
    for (const p of this.players.values()) {
      if (p.ws && p.ws.readyState === p.ws.OPEN) p.ws.send(data);
    }
  }

  // ---- simulation ----

  private tick() {
    const now = Date.now();
    const dt = C.TICK_MS / 1000;

    this.updateBots(now);
    this.updateMovementAndBoost(now, dt);
    this.handleCropPickups();
    this.updateSeedlings(now);
    this.spawnAmbientSeedlings();
    this.handleCollisions(now);
    this.flush();
  }

  private radiusFor(crops: number) {
    return C.PLAYER_BASE_RADIUS + Math.sqrt(Math.max(0, crops)) * C.PLAYER_RADIUS_PER_SQRT_CROP;
  }

  private speedFor(p: InternalPlayer) {
    const penalty = Math.min(C.MAX_SPEED_PENALTY, p.crops / C.SPEED_PENALTY_PER_CROP);
    let speed = C.BASE_SPEED * (1 - penalty);
    if (p.boostRequested && p.crops > 0) speed *= C.BOOST_SPEED_MULTIPLIER;
    return speed;
  }

  private updateMovementAndBoost(now: number, dt: number) {
    for (const p of this.players.values()) {
      const speed = this.speedFor(p);
      if (p.dirX !== 0 || p.dirY !== 0) {
        p.x += p.dirX * speed * dt;
        p.y += p.dirY * speed * dt;
        const clamped = clampToCircle(p.x, p.y, C.ARENA_RADIUS - this.radiusFor(p.crops));
        p.x = clamped.x;
        p.y = clamped.y;
      }

      // bots never boost — they just wander and collect.
      const boosting = !p.isBot && p.boostRequested && p.crops > 0;
      if (boosting && now - p.lastBoostCostAt >= C.BOOST_COST_INTERVAL_MS) {
        p.lastBoostCostAt = now;
        p.crops = Math.max(0, p.crops - C.BOOST_COST_CROPS);
        this.plantSeedling(p.x, p.y, now);
      }
    }
  }

  private plantSeedling(x: number, y: number, now: number) {
    if (this.crops.size + this.seedlings.size >= C.WORLD_ENTITY_CAP) return;
    const id = randomId("sd");
    const seedling: InternalSeedling = { id, x, y, plantedAt: now };
    this.seedlings.set(id, seedling);
    this.pendingSeedlingSpawn.push(seedling);
  }

  private handleCropPickups() {
    for (const p of this.players.values()) {
      const r = this.radiusFor(p.crops);
      for (const crop of this.crops.values()) {
        if (dist2(p.x, p.y, crop.x, crop.y) <= r * r) {
          this.crops.delete(crop.id);
          this.pendingCropRemove.push(crop.id);
          p.crops += 1;
        }
      }
    }
  }

  private updateSeedlings(now: number) {
    for (const s of this.seedlings.values()) {
      if (now - s.plantedAt >= C.SEEDLING_GROW_MS) {
        this.seedlings.delete(s.id);
        this.pendingSeedlingRemove.push(s.id);
        const crop: InternalCrop = { id: randomId("cr"), x: s.x, y: s.y };
        this.crops.set(crop.id, crop);
        this.pendingCropSpawn.push(crop);
      }
    }
  }

  private spawnAmbientSeedlings() {
    const target = C.SPAWN_BASE_TARGET + this.players.size * C.SPAWN_TARGET_PER_PLAYER;
    const current = this.crops.size + this.seedlings.size;
    if (current >= target) return;
    const toSpawn = Math.min(C.SPAWN_MAX_PER_TICK, target - current);
    const now = Date.now();
    for (let i = 0; i < toSpawn; i++) {
      if (this.crops.size + this.seedlings.size >= C.WORLD_ENTITY_CAP) break;
      const { x, y } = randomPointInCircle(C.ARENA_RADIUS * 0.95);
      this.plantSeedling(x, y, now);
    }
  }

  private handleCollisions(now: number) {
    const list = [...this.players.values()];
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        if (now < a.invulnUntil || now < b.invulnUntil) continue;

        const ra = this.radiusFor(a.crops);
        const rb = this.radiusFor(b.crops);
        const rSum = ra + rb;
        if (dist2(a.x, a.y, b.x, b.y) > rSum * rSum) continue;

        let winner: InternalPlayer | null = null;
        let loser: InternalPlayer | null = null;
        if (a.crops >= b.crops * C.RAM_WIN_RATIO) [winner, loser] = [a, b];
        else if (b.crops >= a.crops * C.RAM_WIN_RATIO) [winner, loser] = [b, a];
        if (!winner || !loser) continue; // too close in size — harmless bump

        // Bots never attack: if a bot would "win" the exchange, just ignore
        // it rather than let a bot cost a real player their crops.
        if (winner.isBot) continue;

        this.resolveRam(winner, loser, now);
      }
    }
  }

  private resolveRam(winner: InternalPlayer, loser: InternalPlayer, now: number) {
    const stolen = Math.round(loser.crops * C.RAM_STEAL_FRACTION);
    const remaining = loser.crops - stolen;

    winner.invulnUntil = now + C.COLLISION_INVULN_MS;
    loser.invulnUntil = now + C.COLLISION_INVULN_MS;

    // Knock the loser back so the scattered pile isn't just sitting under
    // them for an instant, free re-pickup.
    const dx = loser.x - winner.x;
    const dy = loser.y - winner.y;
    const mag = Math.hypot(dx, dy) || 1;
    const pushed = clampToCircle(
      loser.x + (dx / mag) * C.RAM_KNOCKBACK_DIST,
      loser.y + (dy / mag) * C.RAM_KNOCKBACK_DIST,
      C.ARENA_RADIUS - this.radiusFor(remaining)
    );
    loser.x = pushed.x;
    loser.y = pushed.y;

    // Scattered (not silently transferred) so bystanders can dive in too.
    this.scatterCrops(loser.x, loser.y, stolen);

    if (remaining <= C.POP_THRESHOLD_CROPS) {
      this.scatterCrops(loser.x, loser.y, remaining);
      loser.crops = C.STARTING_CROPS;
      const respawn = randomPointInCircle(C.ARENA_RADIUS * 0.6);
      loser.x = respawn.x;
      loser.y = respawn.y;
      loser.invulnUntil = now + C.COLLISION_INVULN_MS * 2;
      if (!loser.isBot) this.send(loser, { t: "popped", byName: winner.name });
    } else {
      loser.crops = remaining;
    }
  }

  private scatterCrops(x: number, y: number, count: number) {
    for (let i = 0; i < count; i++) {
      if (this.crops.size + this.seedlings.size >= C.WORLD_ENTITY_CAP) break;
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * 40;
      const crop: InternalCrop = {
        id: randomId("cr"),
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
      };
      this.crops.set(crop.id, crop);
      this.pendingCropSpawn.push(crop);
    }
  }

  private flush() {
    const leaderboard: LeaderboardEntry[] = [...this.players.values()]
      .sort((a, b) => b.crops - a.crops)
      .slice(0, 10)
      .map((p) => ({ id: p.id, name: p.name, crops: p.crops }));

    this.broadcast({
      t: "state",
      players: [...this.players.values()].map(this.toSnapshot),
      leaderboard,
      playerCount: this.realPlayerCount(),
    });

    if (this.pendingCropSpawn.length) {
      this.broadcast({ t: "cropSpawn", crops: this.pendingCropSpawn });
      this.pendingCropSpawn = [];
    }
    if (this.pendingCropRemove.length) {
      this.broadcast({ t: "cropRemove", ids: this.pendingCropRemove });
      this.pendingCropRemove = [];
    }
    if (this.pendingSeedlingSpawn.length) {
      this.broadcast({ t: "seedlingSpawn", seedlings: this.pendingSeedlingSpawn });
      this.pendingSeedlingSpawn = [];
    }
    if (this.pendingSeedlingRemove.length) {
      this.broadcast({ t: "seedlingRemove", ids: this.pendingSeedlingRemove });
      this.pendingSeedlingRemove = [];
    }
  }
}
