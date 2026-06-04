// Tuning knobs for the whole simulation. Kept in one place since a lot of
// the "feel" of the game (how punishing a hit is, how fast the map refills)
// comes from how these interact rather than any single value.

/** World units — the arena is a circle of this radius, centered at (0,0). */
export const ARENA_RADIUS = 1500;

/** Players per room before a new lobby is spun up. Keeps a single tiny VPS
 * comfortable — see server/README.md for the capacity math. */
export const MAX_PLAYERS_PER_ROOM = 40;

/** Simulation + broadcast tick. ~15Hz is plenty smooth for this game's pace
 * and keeps bandwidth/CPU low enough for a <$5/mo box. */
export const TICK_MS = 66;

/** Movement. */
export const BASE_SPEED = 220; // world units / sec at 0 crops
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
export const SEEDLING_GROW_MS = 30_000;

/** Ambient seedling spawning: every tick we compare how many crops+seedlings
 * currently exist against a target density that scales with room population,
 * and spawn toward that target. */
export const SPAWN_BASE_TARGET = 40;
export const SPAWN_TARGET_PER_PLAYER = 4;
export const SPAWN_MAX_PER_TICK = 3;
export const WORLD_ENTITY_CAP = 260; // hard ceiling on crops+seedlings combined

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

