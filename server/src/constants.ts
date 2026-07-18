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

/** Movement. */
export const BASE_SPEED = 140; // world units / sec at 0 crops (down from 220 -> 176 -> 140)
export const MAX_SPEED_PENALTY = 0.4; // biggest players top out 40% slower
export const SPEED_PENALTY_PER_CROP = 300; // crops to reach the full penalty
export const BOOST_SPEED_MULTIPLIER = 1.8;

/** Boosting drains your stack and plants what you drop as a seedling. */
export const BOOST_COST_INTERVAL_MS = 350;
export const BOOST_COST_CROPS = 1;

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

/** PvP: colliding with a smaller/lighter player scatters this fraction of
 * their stack; the rest stays with them so a graze isn't a death sentence. */
export const RAM_STEAL_FRACTION = 0.5;
/** Below this many crops post-hit, the loser pops outright instead of just
 * losing a share — keeps the "you got got" moment clean rather than leaving
 * players stuck at 1-2 crops. */
export const POP_THRESHOLD_CROPS = 3;
/** Grace period after any collision before that pair can collide again. */
export const COLLISION_INVULN_MS = 1200;
/** Push-back applied to the loser so the scattered crops are actually
 * contestable instead of sitting right under them. */
export const RAM_KNOCKBACK_DIST = 60;
/** Minimum crop advantage (attacker/defender ratio) required to actually
 * win a collision — prevents near-equal players from constantly trading
 * hits on every graze. */
export const RAM_WIN_RATIO = 1.15;

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

