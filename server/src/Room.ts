import type { WebSocket } from "ws";
import * as C from "./constants";
import { randomId, randomPointInCircle, dist2, clampToCircle, sweptCircleOverlap } from "./util";
import { randomBotAvatar, randomBotName } from "./bots";
import { SpatialGrid } from "./SpatialGrid";
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
  // Cell size well above typical pickup/perception radii so a query only
  // ever touches a small, constant-ish number of cells regardless of how
  // many crops exist in the room.
  private cropGrid = new SpatialGrid<InternalCrop>(120);
  private seedlings = new Map<string, InternalSeedling>();
  private timer: ReturnType<typeof setInterval> | null = null;

  // Recomputed on join/leave from realPlayerCount() alone — bots always
  // top up to exactly MIN_LOBBY_POPULATION whenever there's >=1 real
  // player, so clamping realPlayerCount() into
  // [MIN_LOBBY_POPULATION, MAX_PLAYERS_PER_ROOM] gives the same answer as
  // clamping total occupancy would, without an ordering dependency on
  // whether bots have been (re)spawned yet this call.
  private arenaRadius = C.arenaRadiusForPopulation(0);

  // events accumulated during a tick, flushed once at the end of it
  private pendingCropSpawn: CropSnapshot[] = [];
  private pendingCropRemove: string[] = [];
  private pendingSeedlingSpawn: SeedlingSnapshot[] = [];
  private pendingSeedlingRemove: string[] = [];

  constructor(id: string) {
    this.id = id;
    this.seedInitialCrops();
  }

  /** A brand-new room starts already at target coverage with fully mature
   * crops — not empty, growing up from nothing over the next
   * SEEDLING_GROW_MS. Nobody's connected yet so there's no one to notify;
   * these just show up in the first join's welcome payload. */
  private seedInitialCrops() {
    const target = Math.min(C.WORLD_ENTITY_CAP, this.coverageTarget());
    for (let i = 0; i < target; i++) {
      const { x, y } = randomPointInCircle(this.arenaRadius * 0.95);
      const crop: InternalCrop = { id: randomId("cr"), x, y };
      this.crops.set(crop.id, crop);
      this.cropGrid.add(crop);
    }
  }

  private addCrop(crop: InternalCrop) {
    this.crops.set(crop.id, crop);
    this.cropGrid.add(crop);
  }

  private removeCrop(id: string) {
    this.crops.delete(id);
    this.cropGrid.remove(id);
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
    const now = Date.now();
    const player: InternalPlayer = {
      id,
      ws,
      isBot: false,
      name: name.slice(0, 16) || "Farmer",
      avatar,
      x: 0,
      y: 0,
      dirX: 0,
      dirY: 0,
      boostRequested: false,
      crops: C.STARTING_CROPS,
      lastBoostCostAt: 0,
      invulnUntil: now + C.COLLISION_INVULN_MS,
      nextDecisionAt: 0,
      botTargetX: 0,
      botTargetY: 0,
    };
    this.players.set(id, player);
    this.recomputeArenaRadius();
    this.rebalanceBots();

    const spawn = randomPointInCircle(this.arenaRadius * 0.6);
    player.x = spawn.x;
    player.y = spawn.y;
    player.botTargetX = spawn.x;
    player.botTargetY = spawn.y;

    const welcome: ServerMessage = {
      t: "welcome",
      playerId: id,
      arenaRadius: this.arenaRadius,
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
    this.recomputeArenaRadius();
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

  // ---- arena sizing ----

  /** Bigger, busier rooms get more room to roam; a sparse room stays
   * tighter so it doesn't feel empty. Shrinking prunes anything now
   * outside the new boundary — growing never needs to (nothing was ever
   * placed beyond the old, smaller radius). */
  private recomputeArenaRadius() {
    const next = C.arenaRadiusForPopulation(this.realPlayerCount());
    if (next === this.arenaRadius) return;
    const shrinking = next < this.arenaRadius;
    this.arenaRadius = next;
    if (shrinking) this.pruneEntitiesOutsideArena();
  }

  private pruneEntitiesOutsideArena() {
    const r2 = this.arenaRadius * this.arenaRadius;
    for (const crop of this.crops.values()) {
      if (crop.x * crop.x + crop.y * crop.y > r2) {
        this.removeCrop(crop.id);
        this.pendingCropRemove.push(crop.id);
      }
    }
    for (const s of this.seedlings.values()) {
      if (s.x * s.x + s.y * s.y > r2) {
        this.seedlings.delete(s.id);
        this.pendingSeedlingRemove.push(s.id);
      }
    }
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
    const spawn = randomPointInCircle(this.arenaRadius * 0.6);
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

      // Retarget on arrival, not just on a timer — with crops this dense,
      // "nearest crop" is often only a few units away, and waiting out the
      // full decision interval after already reaching it just makes the
      // bot sit there. The timer is now a backstop (e.g. got knocked off
      // course) rather than the normal retarget trigger.
      const arrived = Math.hypot(p.botTargetX - p.x, p.botTargetY - p.y) <= 4;
      if (now >= p.nextDecisionAt || arrived) {
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
    // Always beelining for the literal nearest crop reads as "circling in
    // place" once the field is dense enough that the nearest crop is
    // basically wherever the bot already is. Requiring real distance and
    // picking randomly among what qualifies (not just the closest match)
    // gives bots continuous, varied movement instead.
    const candidates: InternalCrop[] = [];
    for (const crop of this.cropGrid.near(p.x, p.y, C.BOT_PERCEPTION_RADIUS)) {
      const d2 = dist2(p.x, p.y, crop.x, crop.y);
      if (d2 <= C.BOT_PERCEPTION_RADIUS * C.BOT_PERCEPTION_RADIUS && d2 >= C.BOT_MIN_TRAVEL_DIST * C.BOT_MIN_TRAVEL_DIST) {
        candidates.push(crop);
      }
    }
    if (candidates.length > 0) {
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      return { x: pick.x, y: pick.y };
    }
    // Nothing far enough away nearby — wander instead of stalling.
    return randomPointInCircle(this.arenaRadius * 0.9);
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

    const preMove = new Map<string, { x: number; y: number }>();
    for (const p of this.players.values()) preMove.set(p.id, { x: p.x, y: p.y });

    this.updateMovementAndBoost(now, dt);
    this.handleCropPickups();
    this.updateSeedlings(now);
    this.spawnAmbientSeedlings();
    this.handleCollisions(now, preMove);
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
      }

      // Clamp every tick regardless of movement, not just while moving —
      // otherwise a stationary player sitting right at the boundary when
      // the arena shrinks (someone left) stays stranded outside it until
      // they happen to move again.
      const clamped = clampToCircle(p.x, p.y, this.arenaRadius - this.radiusFor(p.crops));
      p.x = clamped.x;
      p.y = clamped.y;

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
      // Grid query already narrows this to nearby cells; still need the
      // exact-distance check since cells are square and queries are cell-
      // granular, not a precise circle.
      for (const crop of this.cropGrid.near(p.x, p.y, r)) {
        if (dist2(p.x, p.y, crop.x, crop.y) <= r * r) {
          this.removeCrop(crop.id);
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
        this.addCrop(crop);
        this.pendingCropSpawn.push(crop);
      }
    }
  }

  /** Target entity count is ~TARGET_COVERAGE_FRACTION of the arena's area,
   * so density stays visually consistent as the arena itself grows/shrinks
   * with population instead of drifting sparse or overcrowded. */
  private coverageTarget(): number {
    const arenaArea = Math.PI * this.arenaRadius * this.arenaRadius;
    const footprintArea = Math.PI * C.COVERAGE_FOOTPRINT_RADIUS * C.COVERAGE_FOOTPRINT_RADIUS;
    return Math.floor((C.TARGET_COVERAGE_FRACTION * arenaArea) / footprintArea);
  }

  private spawnAmbientSeedlings() {
    const target = Math.min(C.WORLD_ENTITY_CAP, this.coverageTarget());
    const current = this.crops.size + this.seedlings.size;
    if (current >= target) return;
    const toSpawn = Math.min(C.SPAWN_MAX_PER_TICK, target - current);
    const now = Date.now();
    for (let i = 0; i < toSpawn; i++) {
      if (this.crops.size + this.seedlings.size >= C.WORLD_ENTITY_CAP) break;
      const { x, y } = randomPointInCircle(this.arenaRadius * 0.95);
      this.plantSeedling(x, y, now);
    }
  }

  private handleCollisions(now: number, preMove: Map<string, { x: number; y: number }>) {
    const list = [...this.players.values()];
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        // `list` is a snapshot from the start of this tick — if either was
        // eliminated by an earlier pair's resolution this same tick, it's
        // still sitting in `list` but no longer actually in the room.
        if (!this.players.has(a.id) || !this.players.has(b.id)) continue;
        if (now < a.invulnUntil || now < b.invulnUntil) continue;

        const ra = this.radiusFor(a.crops);
        const rb = this.radiusFor(b.crops);
        const rSum = ra + rb;

        // Swept check across this whole tick's movement, not just the
        // end-of-tick position — a point check misses fast-moving pairs
        // (especially boosting) that cross paths within a single tick.
        const preA = preMove.get(a.id) ?? { x: a.x, y: a.y };
        const preB = preMove.get(b.id) ?? { x: b.x, y: b.y };
        const overlapped = sweptCircleOverlap(
          preA.x - preB.x,
          preA.y - preB.y,
          a.x - b.x,
          a.y - b.y,
          rSum
        );
        if (!overlapped) continue;

        // Require a real crop advantage — at 0-vs-0 the ratio check alone
        // (0 >= 0 * RATIO) would call it a "win" and pop someone for no
        // reason, which reads as a bug the first time two empty players
        // bump into each other.
        let winner: InternalPlayer | null = null;
        let loser: InternalPlayer | null = null;
        if (a.crops > 0 && a.crops >= b.crops * C.RAM_WIN_RATIO) [winner, loser] = [a, b];
        else if (b.crops > 0 && b.crops >= a.crops * C.RAM_WIN_RATIO) [winner, loser] = [b, a];
        if (!winner || !loser) continue; // too close in size — harmless bump

        // Bots can win or lose like anyone else here — they're just never
        // the ones picking the fight. pickBotTarget() only ever aims a bot
        // at the nearest crop, never at a player, so any collision
        // involving a bot is an incidental crossing of paths while it was
        // out collecting, not a deliberate attack.
        this.resolveRam(winner, loser, now);
      }
    }
  }

  private resolveRam(winner: InternalPlayer, loser: InternalPlayer, now: number) {
    const stolen = Math.round(loser.crops * C.RAM_STEAL_FRACTION);
    const remaining = loser.crops - stolen;

    winner.invulnUntil = now + C.COLLISION_INVULN_MS;

    // Knock the loser back so the scattered pile isn't just sitting under
    // them for an instant, free re-pickup.
    const dx = loser.x - winner.x;
    const dy = loser.y - winner.y;
    const mag = Math.hypot(dx, dy) || 1;
    const pushed = clampToCircle(
      loser.x + (dx / mag) * C.RAM_KNOCKBACK_DIST,
      loser.y + (dy / mag) * C.RAM_KNOCKBACK_DIST,
      this.arenaRadius - this.radiusFor(remaining)
    );
    loser.x = pushed.x;
    loser.y = pushed.y;

    // Scattered (not silently transferred) so bystanders can dive in too.
    this.scatterCrops(loser.x, loser.y, stolen);

    if (remaining <= C.POP_THRESHOLD_CROPS) {
      // Dying is final, not a stumble — the loser is eliminated outright
      // (same as leave(), which also broadcasts playerLeft, resizes the
      // arena, and — for a bot — immediately spawns its replacement via
      // rebalanceBots()) rather than respawned in place to keep playing.
      // The client shows a game-over overlay on "popped" and only gets
      // back in by reconnecting fresh (see connectToArena on Play Again).
      this.scatterCrops(loser.x, loser.y, remaining);
      if (!loser.isBot) this.send(loser, { t: "popped", byName: winner.name });
      this.leave(loser.id);
    } else {
      loser.invulnUntil = now + C.COLLISION_INVULN_MS;
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
      this.addCrop(crop);
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
      arenaRadius: this.arenaRadius,
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
