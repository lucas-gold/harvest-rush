// Tuning knobs for the whole simulation. Kept in one place since a lot of
// the "feel" of the game (how punishing a hit is, how fast the map refills)
// comes from how these interact rather than any single value.

/** World units — the arena is a circle centered at (0,0). Radius scales
 * with how many occupants (real players + fill bots) are actually in the
 * room: a sparsely populated room stays tighter so it doesn't feel empty,
 * a full one gets the most room to roam. See arenaRadiusForPopulation(). */
export const ARENA_RADIUS_REFERENCE = 1500; // radius at MAX_PLAYERS_PER_ROOM occupants
export const ARENA_RADIUS_MIN_FRACTION = 0.75; // radius at MIN_LOBBY_POPULATION occupants (the floor)
export const ARENA_RADIUS_MAX_FRACTION = 1.0;

/** Players per room before a new lobby is spun up. Keeps a single tiny VPS
 * comfortable — see server/README.md for the capacity math. */
export const MAX_PLAYERS_PER_ROOM = 40;

/** Simulation + broadcast tick. Client-side smoothing (useSmoothedPlayers)
 * handles perceived choppiness independent of tick rate, so this doesn't
 * need to be pushed as high as it would without that — dialed back from
 * 50ms/20Hz to keep tick cost + outbound bandwidth down at higher crop
 * counts on a <$5/mo box. */
export const TICK_MS = 60;

/** Movement. No more speed boost (see seed combat below) — base is a
 * little higher than it was pre-removal to compensate for losing that
 * burst-speed utility entirely. */
export const BASE_SPEED = 155;
export const MAX_SPEED_PENALTY = 0.4; // biggest players top out 40% slower
export const SPEED_PENALTY_PER_CROP = 300; // crops to reach the full penalty
/** Bots have no reaction time, distraction, or aiming imprecision — without
 * a handicap they out-collect any real player just by being mechanically
 * perfect. Slowing them down physically is the most direct lever. */
export const BOT_SPEED_MULTIPLIER = 0.72;

/** Sizing — radius grows with the sqrt of crop count (area-proportional,
 * agar.io-style) so it doesn't blow up linearly at high scores. */
export const PLAYER_BASE_RADIUS = 16;
export const PLAYER_RADIUS_PER_SQRT_CROP = 2.4;

/** Seedlings mature into a collectible crop after this long. */
export const SEEDLING_GROW_MS = 15_000;

/** Ambient seedling spawning: every tick we compare how many crops+seedlings
 * currently exist against a target derived from ground coverage (not a flat
 * headcount), so density stays consistent as the arena itself grows/shrinks
 * with population. Each crop/seedling "claims" a personal-space circle of
 * COVERAGE_FOOTPRINT_RADIUS for this purpose — bigger than its sprite so a
 * fully-covered board still reads as scattered plants, not solid noise. */
export const TARGET_COVERAGE_FRACTION = 0.4; // ~40% of the arena's area
export const COVERAGE_FOOTPRINT_RADIUS = 24;
export const SPAWN_MAX_PER_TICK = 14;
export const WORLD_ENTITY_CAP = 2200; // hard safety ceiling on crops+seedlings combined

/** PvP: the old "ram into someone" mechanic is gone entirely, replaced by
 * seed combat. Holding the fire button (formerly boost) spends a crop per
 * shot on a cooldown and launches a seed in the player's current facing
 * direction — close-ish range, not point-blank, not cross-map. */
export const SEED_COST_CROPS = 1;
export const FIRE_COOLDOWN_MS = 450;
export const SEED_PROJECTILE_SPEED = 480; // world units / sec
export const SEED_RANGE = 260; // world units
export const SEED_HIT_RADIUS = 20; // how close a seed must pass to a player to land
export const SEED_HIT_DROP = 20;
export const SEED_HIT_CRIT_DROP = 30;
export const SEED_HIT_CRIT_CHANCE = 0.04;
/** A hit's dropped crops land biased toward the shooter, not the victim —
 * otherwise the victim could just immediately re-collect their own drop.
 * 0 = scatters at the victim, 1 = scatters right at the shooter. */
export const HIT_SCATTER_TOWARD_SHOOTER_FRACTION = 0.7;
/** Grace period after spawning or getting hit before that player can be
 * hit again — prevents an instant second hit from the same or a
 * still-overlapping seed. */
export const HIT_INVULN_MS = 500;

/** Bots take the occasional shot too — sparse, and roughly aimed toward
 * the arena center rather than at a specific target, for a bit of ambient
 * danger without bots being real snipers. */
export const BOT_FIRE_CHECK_INTERVAL_MS = 4000;
export const BOT_FIRE_CHANCE = 0.2; // rolled once per check interval, per bot
export const BOT_FIRE_CENTER_BIAS = 0.5; // 0 = pure random direction, 1 = always at center

/** New players spawn with this many crops so they're not instantly helpless. */
export const STARTING_CROPS = 0;

/** Bots: rooms always feel alive. Real players pull bots in to top the room
 * up to this many total occupants; once real players alone reach it, bots
 * are cleared out to make room. Never spawned in an otherwise-empty room. */
export const MIN_LOBBY_POPULATION = 8;
export const BOT_DECISION_INTERVAL_MS = 1500;
export const BOT_PERCEPTION_RADIUS = 500;
/** A bot's next target must be at least this far away — otherwise, with
 * crops this dense, "nearest crop" is often only a few units off and bots
 * just twitch in place instead of actually wandering. */
export const BOT_MIN_TRAVEL_DIST = 60;

/** Arena radius for a room's current total occupancy (real players + fill
 * bots), interpolating between the two fractions above across the
 * [MIN_LOBBY_POPULATION, MAX_PLAYERS_PER_ROOM] range. Occupancy below the
 * floor (shouldn't normally happen — bots top up to it) or above the
 * ceiling both clamp rather than extrapolate. */
export function arenaRadiusForPopulation(totalOccupants: number): number {
  const floor = MIN_LOBBY_POPULATION;
  const ceil = MAX_PLAYERS_PER_ROOM;
  const clamped = Math.max(floor, Math.min(ceil, totalOccupants));
  const t = ceil > floor ? (clamped - floor) / (ceil - floor) : 1;
  const fraction = ARENA_RADIUS_MIN_FRACTION + t * (ARENA_RADIUS_MAX_FRACTION - ARENA_RADIUS_MIN_FRACTION);
  return ARENA_RADIUS_REFERENCE * fraction;
}
