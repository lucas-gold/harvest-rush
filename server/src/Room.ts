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
  SeedProjectileSnapshot,
  PowerUpKind,
  PowerUpSnapshot,
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
  // Last nonzero direction — used to aim a shot when the player currently
  // isn't moving (dirX/dirY zero out at rest, but you should still be able
  // to fire the way you were last facing).
  facingX: number;
  facingY: number;
  firing: boolean;
  lastFireAt: number;
  crops: number;
  invulnUntil: number;
  // bot-only wander state
  nextDecisionAt: number;
  botTargetX: number;
  botTargetY: number;
  nextBotFireCheckAt: number;
  // bot-only reaction state — see BOT_AGGRO_* in constants.ts
  aimTargetId: string | null;
  aimUntil: number;
  fleeUntil: number;
  // power-up state — see POWERUP_* in constants.ts. speedBoostUntil/
  // rapidFireUntil are 0 when inactive; shielded is a plain flag since
  // it's consumed by a hit rather than expiring on a timer.
  speedBoostUntil: number;
  rapidFireUntil: number;
  shielded: boolean;
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

interface InternalSeedProjectile {
  id: string;
  x: number;
  y: number;
  dirX: number;
  dirY: number;
  ownerId: string;
  traveled: number;
}

interface InternalPowerUp {
  id: string;
  x: number;
  y: number;
  kind: PowerUpKind;
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
  private seeds = new Map<string, InternalSeedProjectile>();
  private powerUps = new Map<string, InternalPowerUp>();
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
  private pendingPowerUpSpawn: PowerUpSnapshot[] = [];
  private pendingPowerUpRemove: string[] = [];

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
      facingX: 0,
      facingY: 1, // face "down" by default, matching the client's fallback
      firing: false,
      lastFireAt: 0,
      crops: C.STARTING_CROPS,
      invulnUntil: now + C.HIT_INVULN_MS,
      nextDecisionAt: 0,
      botTargetX: 0,
      botTargetY: 0,
      nextBotFireCheckAt: 0,
      aimTargetId: null,
      aimUntil: 0,
      fleeUntil: 0,
      speedBoostUntil: 0,
      rapidFireUntil: 0,
      shielded: false,
    };
    this.players.set(id, player);
    this.recomputeArenaRadius();
    this.rebalanceBots();

    const spawn = this.pickSpawnPoint(id);
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
      powerUps: [...this.powerUps.values()],
    };
    this.send(player, welcome);
    return id;
  }

  /** A spawn point in the ring between SPAWN_MIN/MAX_RADIUS_FRACTION (not
   * dead center, not right at the boundary), preferring whichever
   * candidate ends up farthest from every other current player — so
   * joining doesn't routinely drop you on top of someone, especially
   * right at room creation when several bots spawn back to back. */
  private pickSpawnPoint(excludeId?: string): { x: number; y: number } {
    const minR = this.arenaRadius * C.SPAWN_MIN_RADIUS_FRACTION;
    const maxR = this.arenaRadius * C.SPAWN_MAX_RADIUS_FRACTION;
    let best: { x: number; y: number } | null = null;
    let bestMinDist = -1;
    for (let attempt = 0; attempt < C.SPAWN_MAX_ATTEMPTS; attempt++) {
      const r = Math.sqrt(minR * minR + Math.random() * (maxR * maxR - minR * minR));
      const theta = Math.random() * Math.PI * 2;
      const candidate = { x: Math.cos(theta) * r, y: Math.sin(theta) * r };
      let minDist = Infinity;
      for (const p of this.players.values()) {
        if (p.id === excludeId) continue;
        const d = Math.hypot(p.x - candidate.x, p.y - candidate.y);
        if (d < minDist) minDist = d;
      }
      if (minDist >= C.SPAWN_MIN_SEPARATION) return candidate;
      if (minDist > bestMinDist) {
        bestMinDist = minDist;
        best = candidate;
      }
    }
    return best ?? { x: 0, y: 0 };
  }

  leave(id: string) {
    if (!this.players.delete(id)) return;
    this.broadcast({ t: "playerLeft", id });
    this.recomputeArenaRadius();
    this.rebalanceBots();
  }

  handleInput(id: string, dirX: number, dirY: number, firing: boolean) {
    const p = this.players.get(id);
    if (!p || p.isBot) return;
    const mag = Math.hypot(dirX, dirY);
    if (mag > 1) {
      dirX /= mag;
      dirY /= mag;
    }
    p.dirX = mag > 0.001 ? dirX : 0;
    p.dirY = mag > 0.001 ? dirY : 0;
    if (p.dirX !== 0 || p.dirY !== 0) {
      p.facingX = p.dirX;
      p.facingY = p.dirY;
    }
    p.firing = firing;
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
    for (const pu of this.powerUps.values()) {
      if (pu.x * pu.x + pu.y * pu.y > r2) {
        this.powerUps.delete(pu.id);
        this.pendingPowerUpRemove.push(pu.id);
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
    const spawn = this.pickSpawnPoint();
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
      facingX: 0,
      facingY: 1,
      firing: false,
      lastFireAt: 0,
      crops: Math.floor(Math.random() * 4),
      invulnUntil: Date.now() + C.HIT_INVULN_MS,
      nextDecisionAt: 0,
      botTargetX: spawn.x,
      botTargetY: spawn.y,
      nextBotFireCheckAt: Date.now() + Math.random() * C.BOT_FIRE_CHECK_INTERVAL_MS,
      aimTargetId: null,
      aimUntil: 0,
      fleeUntil: 0,
      speedBoostUntil: 0,
      rapidFireUntil: 0,
      shielded: false,
    };
    this.players.set(id, bot);
  }

  private updateBots(now: number) {
    for (const p of this.players.values()) {
      if (!p.isBot) continue;

      // A real player just standing nearby is enough to make a bot aim
      // and fire back (a standoff), even without ever having been shot at.
      if (!p.aimTargetId || now >= p.aimUntil) {
        const nearestReal = this.nearestRealPlayerWithin(p, C.BOT_AGGRO_APPROACH_RADIUS);
        if (nearestReal) {
          p.aimTargetId = nearestReal.id;
          p.aimUntil = now + C.BOT_AGGRO_AIM_DURATION_MS;
        }
      }

      const aimTarget = p.aimTargetId ? this.players.get(p.aimTargetId) : undefined;
      if (!aimTarget) p.aimTargetId = null;
      const aiming = !!aimTarget && now < p.aimUntil;

      if (aiming && aimTarget) {
        // Face the threat regardless of movement, so fire aims correctly.
        const tx = aimTarget.x - p.x;
        const ty = aimTarget.y - p.y;
        const tmag = Math.hypot(tx, ty) || 1;
        p.facingX = tx / tmag;
        p.facingY = ty / tmag;

        if (now < p.fleeUntil) {
          // Only from actually being fired at (see alertNearbyBots /
          // resolveSeedHit) — a short, capped backing-away burst, not a
          // full retreat across the map.
          const dx = p.x - aimTarget.x;
          const dy = p.y - aimTarget.y;
          const mag = Math.hypot(dx, dy) || 1;
          p.dirX = dx / mag;
          p.dirY = dy / mag;
        } else {
          // Just approached, never fired at — hold ground and defend
          // rather than scattering the instant anyone gets close.
          p.dirX = 0;
          p.dirY = 0;
        }
        continue;
      }

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
        p.facingX = p.dirX;
        p.facingY = p.dirY;
      } else {
        p.dirX = 0;
        p.dirY = 0;
      }
    }
  }

  /** Nearest non-bot player within `radius`, or null — used to trigger a
   * bot's defensive aim/fire when a real player gets close. */
  private nearestRealPlayerWithin(p: InternalPlayer, radius: number): InternalPlayer | null {
    let best: InternalPlayer | null = null;
    let bestD2 = radius * radius;
    for (const other of this.players.values()) {
      if (other.isBot || other.id === p.id) continue;
      const d2 = dist2(p.x, p.y, other.x, other.y);
      if (d2 <= bestD2) {
        best = other;
        bestD2 = d2;
      }
    }
    return best;
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

  /** Bots take the occasional pot-shot when nothing else is going on —
   * sparse, and roughly toward the arena center rather than at anyone in
   * particular. Once a bot is aiming at a real threat (see updateBots),
   * that takes over instead: faster, aimed fire, but still jittered —
   * reactive, not a laser. */
  private updateBotFiring(now: number) {
    for (const p of this.players.values()) {
      if (!p.isBot) continue;

      const aimTarget = p.aimTargetId ? this.players.get(p.aimTargetId) : undefined;
      if (aimTarget && now < p.aimUntil) {
        if (now - p.lastFireAt < C.BOT_AGGRO_FIRE_INTERVAL_MS) continue;
        const dir = this.jitteredDirectionToward(p, aimTarget);
        this.tryFire(p, now, dir.x, dir.y);
        continue;
      }

      if (now < p.nextBotFireCheckAt) continue;
      p.nextBotFireCheckAt = now + C.BOT_FIRE_CHECK_INTERVAL_MS + Math.random() * 1000;
      if (Math.random() > C.BOT_FIRE_CHANCE) continue;
      const dir = this.centerBiasedDirection(p.x, p.y);
      this.tryFire(p, now, dir.x, dir.y);
    }
  }

  /** Aimed at `target` but with some random spread — bots are reactive,
   * not perfect shots. */
  private jitteredDirectionToward(p: InternalPlayer, target: InternalPlayer): { x: number; y: number } {
    const baseAngle = Math.atan2(target.y - p.y, target.x - p.x);
    const angle = baseAngle + (Math.random() * 2 - 1) * C.BOT_AGGRO_AIM_JITTER_RAD;
    return { x: Math.cos(angle), y: Math.sin(angle) };
  }

  /** A real player firing anywhere near a bot is enough for that bot to
   * notice and react — aim back, and back off a short, capped distance —
   * whether or not the shot actually lands (see resolveSeedHit for the
   * "actually got hit" case, which triggers the same reaction). */
  private alertNearbyBots(shooter: InternalPlayer, now: number) {
    const r2 = C.BOT_AGGRO_NOTICE_RADIUS * C.BOT_AGGRO_NOTICE_RADIUS;
    for (const bot of this.players.values()) {
      if (!bot.isBot) continue;
      if (dist2(bot.x, bot.y, shooter.x, shooter.y) > r2) continue;
      bot.aimTargetId = shooter.id;
      bot.aimUntil = now + C.BOT_AGGRO_AIM_DURATION_MS;
      bot.fleeUntil = now + C.BOT_FLEE_DURATION_MS;
    }
  }

  private centerBiasedDirection(x: number, y: number): { x: number; y: number } {
    const angle = Math.random() * Math.PI * 2;
    const randX = Math.cos(angle);
    const randY = Math.sin(angle);
    const toCenterMag = Math.hypot(x, y) || 1;
    const toCenterX = -x / toCenterMag;
    const toCenterY = -y / toCenterMag;
    const bias = C.BOT_FIRE_CENTER_BIAS;
    const blendX = randX * (1 - bias) + toCenterX * bias;
    const blendY = randY * (1 - bias) + toCenterY * bias;
    const mag = Math.hypot(blendX, blendY) || 1;
    return { x: blendX / mag, y: blendY / mag };
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
    invulnUntil: p.invulnUntil,
    isBot: p.isBot,
    shielded: p.shielded,
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
    this.updateBotFiring(now);
    this.updateMovement(now, dt);
    this.handlePlayerFiring(now);
    this.handleCropPickups();
    this.handlePowerUpPickups(now);
    this.updateSeedlings(now);
    this.spawnAmbientSeedlings();
    this.updateSeedProjectiles(now, dt);
    this.flush();
  }

  private radiusFor(crops: number) {
    return C.PLAYER_BASE_RADIUS + Math.sqrt(Math.max(0, crops)) * C.PLAYER_RADIUS_PER_SQRT_CROP;
  }

  private speedFor(p: InternalPlayer, now: number) {
    const penalty = Math.min(C.MAX_SPEED_PENALTY, p.crops / C.SPEED_PENALTY_PER_CROP);
    let speed = C.BASE_SPEED * (1 - penalty);
    if (now < p.speedBoostUntil) speed *= C.POWERUP_SPEED_MULTIPLIER;
    return p.isBot ? speed * C.BOT_SPEED_MULTIPLIER : speed;
  }

  private updateMovement(now: number, dt: number) {
    for (const p of this.players.values()) {
      const speed = this.speedFor(p, now);
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
    }
  }

  private handlePlayerFiring(now: number) {
    for (const p of this.players.values()) {
      if (p.isBot) continue;
      // Rapid fire shoots on its own — you don't need to be holding the
      // button for it to keep firing.
      if (!p.firing && now >= p.rapidFireUntil) continue;
      this.tryFire(p, now, p.facingX, p.facingY);
    }
  }

  private tryFire(p: InternalPlayer, now: number, dirX: number, dirY: number) {
    if (dirX === 0 && dirY === 0) return;
    const rapid = now < p.rapidFireUntil;
    const cooldown = rapid ? C.POWERUP_RAPID_FIRE_COOLDOWN_MS : C.FIRE_COOLDOWN_MS;
    if (now - p.lastFireAt < cooldown) return;
    if (!rapid) {
      if (p.crops < C.SEED_COST_CROPS) return;
      p.crops -= C.SEED_COST_CROPS;
    }
    p.lastFireAt = now;
    const seed: InternalSeedProjectile = {
      id: randomId("seed"),
      x: p.x,
      y: p.y,
      dirX,
      dirY,
      ownerId: p.id,
      traveled: 0,
    };
    this.seeds.set(seed.id, seed);
    if (!p.isBot) this.alertNearbyBots(p, now);
  }

  private updateSeedProjectiles(now: number, dt: number) {
    for (const seed of [...this.seeds.values()]) {
      const preX = seed.x;
      const preY = seed.y;

      // Ease speed down over the last stretch of the flight instead of
      // travelling at a constant speed and then stopping dead (hit) or
      // vanishing (miss) — slowing into the landing point reads as a real
      // object settling rather than a choppy, abrupt cutoff.
      const rangeFrac = seed.traveled / C.SEED_RANGE;
      let speedMul = 1;
      if (rangeFrac > C.SEED_DECEL_START_FRACTION) {
        const t = Math.min(1, (rangeFrac - C.SEED_DECEL_START_FRACTION) / (1 - C.SEED_DECEL_START_FRACTION));
        speedMul = 1 - t * t * (1 - C.SEED_MIN_SPEED_FRACTION);
      }
      const stepDist = C.SEED_PROJECTILE_SPEED * speedMul * dt;

      const remaining = C.SEED_RANGE - seed.traveled;
      const step = Math.min(stepDist, remaining);
      const nextX = preX + seed.dirX * step;
      const nextY = preY + seed.dirY * step;

      let hit: InternalPlayer | null = null;
      for (const p of this.players.values()) {
        if (p.id === seed.ownerId) continue;
        if (now < p.invulnUntil) continue;
        if (sweptCircleOverlap(preX - p.x, preY - p.y, nextX - p.x, nextY - p.y, C.SEED_HIT_RADIUS)) {
          hit = p;
          break;
        }
      }

      if (hit) {
        this.resolveSeedHit(seed, hit, now);
        this.seeds.delete(seed.id);
        continue;
      }

      seed.x = nextX;
      seed.y = nextY;
      seed.traveled += step;

      if (seed.traveled >= C.SEED_RANGE - 0.01) {
        // Missed everyone — plants where it lands instead of just vanishing.
        this.plantSeedling(seed.x, seed.y, now);
        this.seeds.delete(seed.id);
      }
    }
  }

  private resolveSeedHit(seed: InternalSeedProjectile, target: InternalPlayer, now: number) {
    const shooter = this.players.get(seed.ownerId) ?? null;

    // A shield absorbs the hit entirely — no crop loss, no elimination —
    // and is consumed. Still grants the usual hit-invuln window so the
    // now-unshielded target isn't immediately re-hit by a second seed
    // arriving the same tick.
    if (target.shielded) {
      target.shielded = false;
      target.invulnUntil = now + C.HIT_INVULN_MS;
      return;
    }

    const crit = Math.random() < C.SEED_HIT_CRIT_CHANCE;
    const nominalDrop = crit ? C.SEED_HIT_CRIT_DROP : C.SEED_HIT_DROP;
    const eliminated = target.crops < nominalDrop;
    const actualDrop = eliminated ? target.crops : nominalDrop;

    target.invulnUntil = now + C.HIT_INVULN_MS;

    // Getting actually hit is a stronger version of "noticed gunfire" —
    // make sure it registers even if the shot was fired from just outside
    // BOT_AGGRO_NOTICE_RADIUS at the moment of firing.
    if (target.isBot && shooter && !shooter.isBot) {
      target.aimTargetId = shooter.id;
      target.aimUntil = now + C.BOT_AGGRO_AIM_DURATION_MS;
      target.fleeUntil = now + C.BOT_FLEE_DURATION_MS;
    }

    // Broadcast to the whole room, not just the two involved, so the red
    // "-20"/"-30" is visible to anyone nearby watching, not just the pair.
    this.broadcast({ t: "seedImpact", targetId: target.id, amount: actualDrop, crit });

    const towardX = shooter ? shooter.x : target.x;
    const towardY = shooter ? shooter.y : target.y;
    this.scatterCropsToward(target.x, target.y, actualDrop, towardX, towardY);

    if (eliminated) {
      if (!target.isBot) this.send(target, { t: "popped", byName: shooter?.name ?? "a seed" });
      this.leave(target.id);
    } else {
      target.crops -= actualDrop;
    }

    if (shooter && !shooter.isBot) {
      this.send(shooter, {
        t: "hitConfirm",
        targetName: target.name,
        targetIsBot: target.isBot,
        scattered: actualDrop,
        eliminated,
      });
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

        const powerUpKind = this.rollPowerUpKind();
        if (powerUpKind && this.powerUps.size < C.POWERUP_MAX_ON_MAP) {
          const powerUp: InternalPowerUp = { id: randomId("pu"), x: s.x, y: s.y, kind: powerUpKind };
          this.powerUps.set(powerUp.id, powerUp);
          this.pendingPowerUpSpawn.push(powerUp);
        } else {
          const crop: InternalCrop = { id: randomId("cr"), x: s.x, y: s.y };
          this.addCrop(crop);
          this.pendingCropSpawn.push(crop);
        }
      }
    }
  }

  /** A maturing seedling is a plain crop the overwhelming majority of the
   * time — see POWERUP_*_CHANCE in constants.ts for the (small,
   * independent) odds of each kind instead. */
  private rollPowerUpKind(): PowerUpKind | null {
    const roll = Math.random();
    if (roll < C.POWERUP_SPEED_CHANCE) return "speed";
    if (roll < C.POWERUP_SPEED_CHANCE + C.POWERUP_RAPID_FIRE_CHANCE) return "rapidFire";
    if (roll < C.POWERUP_SPEED_CHANCE + C.POWERUP_RAPID_FIRE_CHANCE + C.POWERUP_SHIELD_CHANCE) return "shield";
    return null;
  }

  /** Same walk-over pickup mechanic as a crop (see handleCropPickups), but
   * power-ups are rare enough that a spatial grid would be overkill — a
   * plain per-tick scan against however few are on the map is cheap. */
  private handlePowerUpPickups(now: number) {
    if (this.powerUps.size === 0) return;
    for (const p of this.players.values()) {
      const r = this.radiusFor(p.crops);
      for (const powerUp of this.powerUps.values()) {
        if (dist2(p.x, p.y, powerUp.x, powerUp.y) > r * r) continue;
        this.powerUps.delete(powerUp.id);
        this.pendingPowerUpRemove.push(powerUp.id);
        this.applyPowerUp(p, powerUp.kind, now);
      }
    }
  }

  private applyPowerUp(p: InternalPlayer, kind: PowerUpKind, now: number) {
    if (kind === "speed") {
      p.speedBoostUntil = now + C.POWERUP_SPEED_DURATION_MS;
    } else if (kind === "rapidFire") {
      p.rapidFireUntil = now + C.POWERUP_RAPID_FIRE_DURATION_MS;
    } else {
      p.shielded = true;
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

  /** Scatters crops around a point shifted partway from the victim toward
   * the shooter (HIT_SCATTER_TOWARD_SHOOTER_FRACTION of the way there,
   * capped at SEED_RANGE so a far-off shooter doesn't pull the drop
   * halfway across the map) rather than centered on the victim, so the
   * shooter can collect the drop more easily than the victim can just
   * immediately re-collect their own loss. */
  private scatterCropsToward(x: number, y: number, count: number, towardX: number, towardY: number) {
    const dx = towardX - x;
    const dy = towardY - y;
    const mag = Math.hypot(dx, dy) || 1;
    const dirX = dx / mag;
    const dirY = dy / mag;
    const centerShift = Math.min(mag, C.SEED_RANGE) * C.HIT_SCATTER_TOWARD_SHOOTER_FRACTION;
    const centerX = x + dirX * centerShift;
    const centerY = y + dirY * centerShift;
    const baseAngle = Math.atan2(dirY, dirX);

    for (let i = 0; i < count; i++) {
      if (this.crops.size + this.seedlings.size >= C.WORLD_ENTITY_CAP) break;
      const spread = (Math.random() - 0.5) * Math.PI * 0.6; // +/- 54 degrees of cone
      const angle = baseAngle + spread;
      const dist = 10 + Math.random() * 40;
      const crop: InternalCrop = {
        id: randomId("cr"),
        x: centerX + Math.cos(angle) * dist,
        y: centerY + Math.sin(angle) * dist,
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

    const seeds: SeedProjectileSnapshot[] = [...this.seeds.values()].map((s) => ({
      id: s.id,
      x: s.x,
      y: s.y,
    }));

    this.broadcast({
      t: "state",
      players: [...this.players.values()].map(this.toSnapshot),
      seeds,
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
    if (this.pendingPowerUpSpawn.length) {
      this.broadcast({ t: "powerUpSpawn", powerUps: this.pendingPowerUpSpawn });
      this.pendingPowerUpSpawn = [];
    }
    if (this.pendingPowerUpRemove.length) {
      this.broadcast({ t: "powerUpRemove", ids: this.pendingPowerUpRemove });
      this.pendingPowerUpRemove = [];
    }
  }
}
