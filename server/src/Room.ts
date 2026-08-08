import type { WebSocket } from "ws";
import * as C from "./constants";
import { randomId, randomPointInCircle, dist2, clampToCircle, sweptCircleOverlap } from "./util";
import { randomBotAvatar, randomBotName } from "./bots";
import { SpatialGrid } from "./SpatialGrid";
import { trackSessionEnd } from "./analytics";
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
  // Brief cooldown before re-checking for an unprovoked aggro lock after
  // letting a low-crop target go (see BOT_LOW_CROP_LENIENCY_CROPS) —
  // without it, the next tick's check just re-rolls immediately.
  nextAggroEligibleAt: number;
  // power-up state — see POWERUP_* in constants.ts. speedBoostUntil/
  // rapidFireUntil/longRangeUntil are 0 when inactive; shielded is a
  // plain flag since it's consumed by a hit rather than expiring on a
  // timer.
  speedBoostUntil: number;
  rapidFireUntil: number;
  shielded: boolean;
  longRangeUntil: number;
  doubleDamageUntil: number;
  // Next time this player's stack leaks a crop (see updateCropLeak /
  // CROP_LEAK_* in constants.ts).
  nextSeedDropAt: number;
  // Analytics only (see analytics.ts) -- when this session started, the
  // highest crops ever held at once this life, and eliminations landed.
  // analyticsId is the client's own persisted PostHog id when it sent one
  // (see the "join" message), so a lobby visit and the games that follow
  // it link up as one person instead of disconnected anonymous events --
  // falls back to this player's own per-session id otherwise.
  joinedAt: number;
  peakCrops: number;
  kills: number;
  analyticsId: string;
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
  /** Captured at fire time rather than looked up live off ownerId — in a
   * mutual-kill tick the shooter can already be removed from `players`
   * (via a different seed resolving first) by the time this one lands,
   * which would otherwise blank out the "who popped me" name. */
  ownerName: string;
  traveled: number;
  /** Captured at fire time from the shooter's long-range buff state —
   * doubled range shouldn't change mid-flight just because the buff
   * happens to expire while this exact seed is still in the air. */
  range: number;
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
  // Whoever's #1 on the leaderboard right now (crown holder), or null if
  // nobody has any crops yet. Set once per tick in flush() from the same
  // sort the leaderboard broadcast uses, and read by
  // nearestOtherPlayerWithin for the crown-target bot bias.
  private topPlayerId: string | null = null;
  // Crops held by the current #1, regardless of whether that's enough to
  // count as a real crown (topPlayerId is null at 0) — drives
  // leaderAggroFraction, which scales overall bot pressure with how far
  // the match has escalated. Set alongside topPlayerId in flush().
  private topPlayerCrops = 0;

  // Recomputed on join/leave from realPlayerCount() alone — bot count is
  // itself derived from realPlayerCount() (see rebalanceBots), so total
  // occupancy is always realPlayerCount() + min(MAX_BOTS, MAX_PLAYERS_PER_
  // ROOM - realPlayerCount()), without an ordering dependency on whether
  // bots have been (re)spawned yet this call.
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
      const { x, y } = randomPointInCircle(this.arenaRadius * C.CROP_SPAWN_RADIUS_FRACTION);
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

  join(ws: WebSocket, name: string, avatar: AvatarCustomization, analyticsId?: string): string {
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
      nextAggroEligibleAt: 0,
      speedBoostUntil: 0,
      rapidFireUntil: 0,
      shielded: false,
      longRangeUntil: 0,
      doubleDamageUntil: 0,
      nextSeedDropAt: 0,
      joinedAt: now,
      peakCrops: C.STARTING_CROPS,
      kills: 0,
      analyticsId: analyticsId || id,
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
    const player = this.players.get(id);
    if (!player) return;
    this.players.delete(id);
    if (!player.isBot) {
      trackSessionEnd({
        distinctId: player.analyticsId,
        name: player.name,
        joinedAt: player.joinedAt,
        peakCrops: player.peakCrops,
        kills: player.kills,
      });
    }
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
    // Always up to MAX_BOTS regardless of how few real players there are
    // (1 real player still gets the full 9), shrinking only once
    // real+bots would otherwise exceed room capacity.
    const desiredBots = real > 0 ? Math.max(0, Math.min(C.MAX_BOTS, C.MAX_PLAYERS_PER_ROOM - real)) : 0;
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
    // Bot names carry a ".bot" suffix (see randomBotName) that the bare
    // BOT_NAMES pool doesn't -- strip it so the membership check actually
    // matches instead of silently missing every name.
    const usedNames = new Set(
      [...this.players.values()]
        .filter((p) => p.isBot)
        .map((p) => p.name.replace(/\.bot$/, ""))
    );
    const bot: InternalPlayer = {
      id,
      ws: null,
      isBot: true,
      name: randomBotName(usedNames),
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
      nextAggroEligibleAt: 0,
      speedBoostUntil: 0,
      rapidFireUntil: 0,
      shielded: false,
      longRangeUntil: 0,
      doubleDamageUntil: 0,
      nextSeedDropAt: 0,
      joinedAt: 0,
      peakCrops: 0,
      kills: 0,
      analyticsId: id,
    };
    this.players.set(id, bot);
  }

  private updateBots(now: number) {
    for (const p of this.players.values()) {
      if (!p.isBot) continue;

      // Anyone (bot or real player) just standing nearby is enough to
      // make a bot aim and fire back (a standoff), even without ever
      // having been shot at. The radius itself grows with how far the
      // match has escalated (see leaderAggroFraction). Against a target
      // carrying very few crops, there's a chance the bot lets it go
      // instead (see BOT_LOW_CROP_LENIENCY_CROPS) — gated by
      // nextAggroEligibleAt so a skip actually sticks for a bit instead
      // of re-rolling next tick.
      if ((!p.aimTargetId || now >= p.aimUntil) && now >= p.nextAggroEligibleAt) {
        const approachRadius =
          C.BOT_AGGRO_APPROACH_RADIUS + C.LEADER_AGGRO_APPROACH_RADIUS_BONUS_MAX * this.leaderAggroFraction();
        const nearestThreat = this.nearestOtherPlayerWithin(p, approachRadius);
        if (nearestThreat) {
          const leniencyFraction = Math.max(
            0,
            1 - nearestThreat.crops / C.BOT_LOW_CROP_LENIENCY_CROPS
          );
          const skipChance = C.BOT_LOW_CROP_LENIENCY_SKIP_CHANCE_MAX * leniencyFraction;
          if (skipChance > 0 && Math.random() < skipChance) {
            p.nextAggroEligibleAt = now + C.BOT_DECISION_INTERVAL_MS;
          } else {
            p.aimTargetId = nearestThreat.id;
            p.aimUntil = now + C.BOT_AGGRO_AIM_DURATION_MS;
          }
        }
      }

      const aimTarget = p.aimTargetId ? this.players.get(p.aimTargetId) : undefined;
      if (!aimTarget) p.aimTargetId = null;
      const aiming = !!aimTarget && now < p.aimUntil;

      if (aiming && aimTarget) {
        // Face the threat regardless of whether it's actively firing back
        // or just been noticed — updateBotFiring aims using facingX/Y, so
        // this needs to stay locked on the threat even while the bot
        // keeps foraging below, not wherever movement happens to point.
        const tx = aimTarget.x - p.x;
        const ty = aimTarget.y - p.y;
        const tmag = Math.hypot(tx, ty) || 1;
        p.facingX = tx / tmag;
        p.facingY = ty / tmag;

        if (now < p.fleeUntil) {
          // Actually being fired at (see alertNearbyBots / resolveSeedHit)
          // — a short, capped backing-away burst, not a full retreat
          // across the map. The one case that overrides movement outright.
          const dx = p.x - aimTarget.x;
          const dy = p.y - aimTarget.y;
          const mag = Math.hypot(dx, dy) || 1;
          p.dirX = dx / mag;
          p.dirY = dy / mag;
          continue;
        }
        // Noticed a threat but hasn't actually been fired at — fall
        // through to normal crop-targeting movement below instead of
        // grinding to a halt just because someone (very often another
        // bot, foraging the same crop-dense patch) is nearby.
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
        // Don't clobber the threat-locked facing set above while aiming.
        if (!aiming) {
          p.facingX = p.dirX;
          p.facingY = p.dirY;
        }
      } else {
        p.dirX = 0;
        p.dirY = 0;
      }
    }
  }

  /** Nearest other player (bot or real) within `radius`, or null — used
   * to trigger a bot's defensive aim/fire when anyone gets close. Bots
   * react to bots the same way they react to real players, but with a
   * bias toward real players when both are around: a real player's
   * distance is scaled down (BOT_TARGET_PLAYER_BIAS) for comparison
   * purposes, so a nearby real player usually wins the pick over a
   * similarly-close bot — but a bot that's dramatically closer can still
   * win. Whoever's currently #1 on the leaderboard (see topPlayerId, set
   * in flush) gets a further bias on top of that. Both are biases, not
   * absolute rules; still gated on the real (unscaled) distance being
   * within `radius` at all. */
  private nearestOtherPlayerWithin(p: InternalPlayer, radius: number): InternalPlayer | null {
    const r2 = radius * radius;
    let best: InternalPlayer | null = null;
    let bestScore = Infinity;
    for (const other of this.players.values()) {
      if (other.id === p.id) continue;
      const d2 = dist2(p.x, p.y, other.x, other.y);
      if (d2 > r2) continue;
      let score = other.isBot ? d2 : d2 * C.BOT_TARGET_PLAYER_BIAS;
      if (other.id === this.topPlayerId) score *= C.BOT_CROWN_TARGET_BIAS;
      if (score < bestScore) {
        best = other;
        bestScore = score;
      }
    }
    return best;
  }

  /** How far the match has escalated, 0-1, based on the current leader's
   * crop count (see topPlayerCrops) — used to scale overall bot pressure
   * (ambient fire chance, approach-aggro radius) up as someone pulls
   * ahead, on top of the per-target scaling elsewhere (aim accuracy, crit
   * chance). */
  private leaderAggroFraction(): number {
    return Math.min(1, this.topPlayerCrops / C.LEADER_AGGRO_FULL_AT_CROPS);
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
        const dir = this.jitteredDirectionToward(p, aimTarget, now);
        this.tryFire(p, now, dir.x, dir.y);
        continue;
      }

      if (now < p.nextBotFireCheckAt) continue;
      p.nextBotFireCheckAt = now + C.BOT_FIRE_CHECK_INTERVAL_MS + Math.random() * 1000;
      const fireChance = C.BOT_FIRE_CHANCE + C.LEADER_AGGRO_FIRE_CHANCE_BONUS_MAX * this.leaderAggroFraction();
      if (Math.random() > fireChance) continue;
      const dir = this.centerBiasedDirection(p.x, p.y);
      this.tryFire(p, now, dir.x, dir.y);
    }
  }

  /** Aimed at `target` but with random spread — bots are reactive, not
   * perfect shots. The spread tightens the more crops the target is
   * carrying, with no ceiling (see BOT_AIM_ACCURACY_BONUS_PER_CROP), and
   * widens again while this bot is actively backing away (see
   * BOT_FLEE_AIM_JITTER_MULTIPLIER) — shooting over your shoulder while
   * retreating is harder than standing your ground. */
  private jitteredDirectionToward(p: InternalPlayer, target: InternalPlayer, now: number): { x: number; y: number } {
    const baseAngle = Math.atan2(target.y - p.y, target.x - p.x);
    const accuracyBonus = target.crops * C.BOT_AIM_ACCURACY_BONUS_PER_CROP;
    let jitter = C.BOT_AGGRO_AIM_JITTER_RAD / (1 + accuracyBonus);
    if (now < p.fleeUntil) jitter *= C.BOT_FLEE_AIM_JITTER_MULTIPLIER;
    const angle = baseAngle + (Math.random() * 2 - 1) * jitter;
    return { x: Math.cos(angle), y: Math.sin(angle) };
  }

  /** Anyone firing anywhere near a bot — another bot or a real player —
   * is enough for that bot to notice and react — aim back, and back off
   * a short, capped distance — whether or not the shot actually lands
   * (see resolveSeedHit for the "actually got hit" case, which triggers
   * the same reaction).
   *
   * A real player's shot always registers. A bot's shot doesn't override
   * another bot that's already actively engaged with a real player —
   * without this, two nearby bots that both fire at a real player end up
   * alerting each other back and forth every time either one shoots,
   * repeatedly yanking their aim onto each other and defeating the
   * real-player targeting bias in nearestOtherPlayerWithin entirely. */
  private alertNearbyBots(shooter: InternalPlayer, now: number) {
    const r2 = C.BOT_AGGRO_NOTICE_RADIUS * C.BOT_AGGRO_NOTICE_RADIUS;
    for (const bot of this.players.values()) {
      if (!bot.isBot || bot.id === shooter.id) continue;
      if (dist2(bot.x, bot.y, shooter.x, shooter.y) > r2) continue;
      if (shooter.isBot) {
        const currentTarget = bot.aimTargetId ? this.players.get(bot.aimTargetId) : undefined;
        if (currentTarget && !currentTarget.isBot && now < bot.aimUntil) continue;
      }
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
    this.updateCropLeak(now);
    this.updateSeedlings(now);
    this.spawnAmbientSeedlings();
    this.updateSeedProjectiles(now, dt);
    this.flush();
  }

  private radiusFor(crops: number) {
    return C.PLAYER_BASE_RADIUS + Math.sqrt(Math.max(0, crops)) * C.PLAYER_RADIUS_PER_SQRT_CROP;
  }

  private speedFor(p: InternalPlayer, now: number) {
    const rampFraction = Math.min(1, p.crops / C.SPEED_PENALTY_FULL_AT_CROPS);
    const penalty = rampFraction * C.MAX_SPEED_PENALTY;
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
    const baseCooldown = rapid ? C.POWERUP_RAPID_FIRE_COOLDOWN_MS : C.FIRE_COOLDOWN_MS;
    // Carrying a lot of crops slows your own trigger finger too, not just
    // your legs — up to FIRE_RATE_PENALTY_MAX slower once you're holding
    // FIRE_RATE_PENALTY_FULL_AT_CROPS or more, ramping linearly below
    // that. Applies to rapid fire too, same as the speed penalty still
    // applies under the speed boost power-up (see speedFor).
    const rateRampFraction = Math.min(1, p.crops / C.FIRE_RATE_PENALTY_FULL_AT_CROPS);
    const cooldown = baseCooldown / (1 - C.FIRE_RATE_PENALTY_MAX * rateRampFraction);
    if (now - p.lastFireAt < cooldown) return;
    if (!rapid) {
      if (p.crops < C.SEED_COST_CROPS) return;
      p.crops -= C.SEED_COST_CROPS;
    }
    p.lastFireAt = now;
    const range = now < p.longRangeUntil ? C.SEED_RANGE * C.POWERUP_LONG_RANGE_MULTIPLIER : C.SEED_RANGE;
    const seed: InternalSeedProjectile = {
      id: randomId("seed"),
      x: p.x,
      y: p.y,
      dirX,
      dirY,
      ownerId: p.id,
      ownerName: p.name,
      traveled: 0,
      range,
    };
    this.seeds.set(seed.id, seed);
    // Any shot alerts nearby bots — a bot's own shot alerts other bots
    // just like a real player's would (see alertNearbyBots).
    this.alertNearbyBots(p, now);
  }

  private updateSeedProjectiles(now: number, dt: number) {
    // This tick's straight-line step for every seed, computed once and
    // shared between the seed-vs-seed collision pass and the per-seed
    // resolution pass below — both need the same start/end points.
    const steps = new Map<
      string,
      { preX: number; preY: number; nextX: number; nextY: number; step: number; hitWall: boolean }
    >();
    // Same boundary a player at rest (zero crops) is clamped to — see
    // updateMovement — so a shot dies at roughly the same edge a player
    // standing there would, instead of flying past it toward the true
    // (invisible) arena bound.
    const wallRadius = this.arenaRadius - C.PLAYER_BASE_RADIUS;
    for (const seed of this.seeds.values()) {
      // Ease speed down over the last stretch of the flight instead of
      // travelling at a constant speed and then stopping dead (hit) or
      // vanishing (miss) — slowing into the landing point reads as a real
      // object settling rather than a choppy, abrupt cutoff. Uses this
      // seed's own range (see tryFire), not the base SEED_RANGE, so a
      // long-range shot eases in over its full doubled distance instead
      // of decelerating at the normal-range point and coasting the rest.
      const rangeFrac = seed.traveled / seed.range;
      let speedMul = 1;
      if (rangeFrac > C.SEED_DECEL_START_FRACTION) {
        const t = Math.min(1, (rangeFrac - C.SEED_DECEL_START_FRACTION) / (1 - C.SEED_DECEL_START_FRACTION));
        speedMul = 1 - t * t * (1 - C.SEED_MIN_SPEED_FRACTION);
      }
      const stepDist = C.SEED_PROJECTILE_SPEED * speedMul * dt;
      const remaining = seed.range - seed.traveled;
      const step = Math.min(stepDist, remaining);
      let nextX = seed.x + seed.dirX * step;
      let nextY = seed.y + seed.dirY * step;
      let hitWall = false;
      if (nextX * nextX + nextY * nextY > wallRadius * wallRadius) {
        const clamped = clampToCircle(nextX, nextY, wallRadius);
        nextX = clamped.x;
        nextY = clamped.y;
        hitWall = true;
      }
      steps.set(seed.id, { preX: seed.x, preY: seed.y, nextX, nextY, step, hitWall });
    }

    // Two seeds whose paths cross this tick cancel each other out. Seed
    // counts in flight are always small (a handful per room at once), so
    // an all-pairs pass here is cheap — no spatial index needed the way
    // crops/seedlings use one. Closest approach between the two straight-
    // line steps above, parametrized by the same [0,1] fraction of this
    // tick for both, since both start/end points span the same real time.
    const collided = new Set<string>();
    const allSeeds = [...this.seeds.values()];
    for (let i = 0; i < allSeeds.length; i++) {
      const a = allSeeds[i];
      if (collided.has(a.id)) continue;
      const sa = steps.get(a.id)!;
      for (let j = i + 1; j < allSeeds.length; j++) {
        const b = allSeeds[j];
        if (collided.has(b.id)) continue;
        const sb = steps.get(b.id)!;
        const px = sa.preX - sb.preX;
        const py = sa.preY - sb.preY;
        const vx = sa.nextX - sa.preX - (sb.nextX - sb.preX);
        const vy = sa.nextY - sa.preY - (sb.nextY - sb.preY);
        const vv = vx * vx + vy * vy;
        const t = Math.max(0, Math.min(1, vv > 0 ? -(px * vx + py * vy) / vv : 0));
        const dx = px + vx * t;
        const dy = py + vy * t;
        if (dx * dx + dy * dy > C.SEED_COLLISION_RADIUS * C.SEED_COLLISION_RADIUS) continue;
        collided.add(a.id);
        collided.add(b.id);
        const ax = sa.preX + t * (sa.nextX - sa.preX);
        const ay = sa.preY + t * (sa.nextY - sa.preY);
        const bx = sb.preX + t * (sb.nextX - sb.preX);
        const by = sb.preY + t * (sb.nextY - sb.preY);
        const cx = (ax + bx) / 2;
        const cy = (ay + by) / 2;
        this.broadcast({ t: "seedCollision", id1: a.id, id2: b.id, x: cx, y: cy });
        this.seeds.delete(a.id);
        this.seeds.delete(b.id);
        break;
      }
    }

    for (const seed of allSeeds) {
      if (collided.has(seed.id)) continue;
      const { preX, preY, nextX, nextY, step, hitWall } = steps.get(seed.id)!;

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
        seed.x = nextX;
        seed.y = nextY;
        this.resolveSeedHit(seed, hit, now);
        this.seeds.delete(seed.id);
        continue;
      }

      seed.x = nextX;
      seed.y = nextY;
      seed.traveled += step;

      if (hitWall || seed.traveled >= seed.range - 0.01) {
        // Missed everyone (or hit the wall) — plants where it lands
        // instead of just vanishing.
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

    // Crit chance scales with how many crops the target is carrying —
    // the more they're holding, the riskier it is to get caught.
    const critChance = Math.min(
      1,
      C.SEED_HIT_CRIT_CHANCE_BASE + target.crops * C.SEED_HIT_CRIT_CHANCE_PER_CROP
    );
    const crit = Math.random() < critChance;
    const critPercent =
      C.SEED_HIT_CRIT_PERCENT_MIN + Math.random() * (C.SEED_HIT_CRIT_PERCENT_MAX - C.SEED_HIT_CRIT_PERCENT_MIN);
    let nominalDrop = crit
      ? Math.min(C.SEED_HIT_CRIT_MAX_DROP, Math.max(C.SEED_HIT_CRIT_MIN_DROP, Math.round(target.crops * critPercent)))
      : Math.max(C.SEED_HIT_MIN_DROP, Math.round(target.crops * C.SEED_HIT_PERCENT));
    if (shooter && now < shooter.doubleDamageUntil) nominalDrop *= 2;
    const eliminated = target.crops < nominalDrop;
    const actualDrop = eliminated ? target.crops : nominalDrop;
    // Only a fraction of the damage actually lands as pickupable crops —
    // the rest is destroyed outright (see HIT_DROP_SURVIVAL_FRACTION),
    // so combat is a real sink instead of just moving the same crops
    // back and forth between whoever's shooting at each other.
    const scatterCount = Math.round(actualDrop * C.HIT_DROP_SURVIVAL_FRACTION);

    target.invulnUntil = now + C.HIT_INVULN_MS;

    // Getting actually hit is a stronger version of "noticed gunfire" —
    // make sure it registers even if the shot was fired from just outside
    // BOT_AGGRO_NOTICE_RADIUS at the moment of firing. Applies whether
    // the shooter was a bot or a real player.
    if (target.isBot && shooter && shooter.id !== target.id) {
      target.aimTargetId = shooter.id;
      target.aimUntil = now + C.BOT_AGGRO_AIM_DURATION_MS;
      target.fleeUntil = now + C.BOT_FLEE_DURATION_MS;
    }

    // Broadcast to the whole room, not just the two involved, so the red
    // "-20"/"-30" is visible to anyone nearby watching, not just the pair.
    // x/y is the target's own (already known-accurate) position rather
    // than the seed's — the landing effect should appear exactly on
    // whoever got hit, and the client would otherwise place it using the
    // seed's smoothed, lagging rendered position instead.
    this.broadcast({
      t: "seedImpact",
      targetId: target.id,
      amount: actualDrop,
      crit,
      seedId: seed.id,
      x: target.x,
      y: target.y,
    });

    const towardX = shooter ? shooter.x : target.x;
    const towardY = shooter ? shooter.y : target.y;
    const dropCenter = this.scatterCropsToward(target.x, target.y, scatterCount, towardX, towardY);

    // A bot that just landed a hit would otherwise keep heading toward
    // whatever crop it was already after before the fight — send it after
    // its own drop instead, so kills actually pay off instead of the
    // scattered crops just sitting there for someone else (often the
    // recovering victim) to walk over first.
    if (shooter && shooter.isBot && scatterCount > 0) {
      shooter.botTargetX = dropCenter.x;
      shooter.botTargetY = dropCenter.y;
      shooter.nextDecisionAt = now + 1200;
    }

    if (eliminated) {
      if (shooter) shooter.kills += 1;
      if (!target.isBot) this.send(target, { t: "popped", byName: shooter?.name ?? seed.ownerName });
      this.leave(target.id);
    } else {
      target.crops -= actualDrop;
    }

    if (shooter && !shooter.isBot) {
      this.send(shooter, {
        t: "hitConfirm",
        targetName: target.name,
        targetIsBot: target.isBot,
        scattered: scatterCount,
        eliminated,
      });
    }
  }

  private plantSeedling(x: number, y: number, now: number) {
    if (this.crops.size + this.seedlings.size >= C.WORLD_ENTITY_CAP) return;
    // A seed that misses everyone plants wherever it runs out of range —
    // which, fired from near the boundary, can be well outside the arena
    // circle. Clamp so nothing ever takes root out of bounds.
    const clamped = clampToCircle(x, y, this.arenaRadius);
    const id = randomId("sd");
    const seedling: InternalSeedling = { id, x: clamped.x, y: clamped.y, plantedAt: now };
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
          if (p.crops > p.peakCrops) p.peakCrops = p.crops;
        }
      }
    }
  }

  /** A real stack slowly leaks crops over time (see CROP_LEAK_* in
   * constants.ts) — a seedling drops at the player's own feet, same as a
   * missed shot planting where it lands. Nothing leaks below
   * CROP_LEAK_MIN_CROPS; the interval between drops shortens as crops
   * climb toward CROP_LEAK_FULL_AT_CROPS, so a bigger stack visibly leaks
   * faster rather than just losing a bigger chunk each time. */
  private updateCropLeak(now: number) {
    for (const p of this.players.values()) {
      if (p.crops < C.CROP_LEAK_MIN_CROPS || now < p.nextSeedDropAt) continue;
      const rampFraction = Math.min(
        1,
        (p.crops - C.CROP_LEAK_MIN_CROPS) / (C.CROP_LEAK_FULL_AT_CROPS - C.CROP_LEAK_MIN_CROPS)
      );
      const interval =
        C.CROP_LEAK_INTERVAL_MAX_MS - rampFraction * (C.CROP_LEAK_INTERVAL_MAX_MS - C.CROP_LEAK_INTERVAL_MIN_MS);
      p.nextSeedDropAt = now + interval;
      p.crops -= C.CROP_LEAK_DROP_AMOUNT;
      this.plantSeedling(p.x, p.y, now);
    }
  }

  /** Ambient planting is capped per tick (SPAWN_MAX_PER_TICK) so a big
   * deficit fills in gradually instead of all at once — but maturing back
   * out had no equivalent cap, so a burst of seedlings planted close
   * together (e.g. several real/bot players eating through the field at
   * once right after connecting) would all mature in the very same tick:
   * one broadcast, one render, with potentially dozens of brand-new crops
   * mounting for the first time simultaneously. Capping maturation the
   * same way spreads that out too. Oldest-planted matures first so nothing
   * waits indefinitely behind newer plantings. */
  private updateSeedlings(now: number) {
    let ready: InternalSeedling[] | null = null;
    for (const s of this.seedlings.values()) {
      if (now - s.plantedAt < C.SEEDLING_GROW_MS) continue;
      (ready ??= []).push(s);
    }
    if (!ready) return;
    if (ready.length > C.SEEDLING_MATURE_MAX_PER_TICK) {
      ready.sort((a, b) => a.plantedAt - b.plantedAt);
      ready.length = C.SEEDLING_MATURE_MAX_PER_TICK;
    }
    for (const s of ready) {
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

  /** A maturing seedling is a plain crop the overwhelming majority of the
   * time — see POWERUP_*_CHANCE in constants.ts for the (small,
   * independent) odds of each kind instead. */
  private rollPowerUpKind(): PowerUpKind | null {
    const roll = Math.random();
    let threshold = C.POWERUP_SPEED_CHANCE;
    if (roll < threshold) return "speed";
    threshold += C.POWERUP_RAPID_FIRE_CHANCE;
    if (roll < threshold) return "rapidFire";
    threshold += C.POWERUP_SHIELD_CHANCE;
    if (roll < threshold) return "shield";
    threshold += C.POWERUP_LONG_RANGE_CHANCE;
    if (roll < threshold) return "longRange";
    threshold += C.POWERUP_DOUBLE_DAMAGE_CHANCE;
    if (roll < threshold) return "doubleDamage";
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
    } else if (kind === "longRange") {
      p.longRangeUntil = now + C.POWERUP_LONG_RANGE_DURATION_MS;
    } else if (kind === "doubleDamage") {
      p.doubleDamageUntil = now + C.POWERUP_DOUBLE_DAMAGE_DURATION_MS;
    } else {
      p.shielded = true;
    }
    // Bots don't have a socket (send() no-ops for them), but this is
    // purely feedback for whoever picked it up, not something bots need.
    if (!p.isBot) this.send(p, { t: "powerUpPickup", kind });
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
      const { x, y } = randomPointInCircle(this.arenaRadius * C.CROP_SPAWN_RADIUS_FRACTION);
      this.plantSeedling(x, y, now);
    }
  }

  /** Scatters crops around a point shifted partway from the victim toward
   * the shooter (HIT_SCATTER_TOWARD_SHOOTER_FRACTION of the way there,
   * capped at SEED_RANGE so a far-off shooter doesn't pull the drop
   * halfway across the map) rather than centered on the victim, so the
   * shooter can collect the drop more easily than the victim can just
   * immediately re-collect their own loss. */
  private scatterCropsToward(
    x: number,
    y: number,
    count: number,
    towardX: number,
    towardY: number
  ): { x: number; y: number } {
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
    return { x: centerX, y: centerY };
  }

  private flush() {
    const leaderboard: LeaderboardEntry[] = [...this.players.values()]
      .sort((a, b) => b.crops - a.crops)
      .slice(0, 10)
      .map((p) => ({ id: p.id, name: p.name, crops: p.crops }));
    // No crown when everyone's still at 0 -- an arbitrary "#1 with
    // nothing" at round start isn't a real leader.
    this.topPlayerId = leaderboard.length > 0 && leaderboard[0].crops > 0 ? leaderboard[0].id : null;
    this.topPlayerCrops = leaderboard.length > 0 ? leaderboard[0].crops : 0;

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
