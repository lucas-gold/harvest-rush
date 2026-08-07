// Tuning knobs for the whole simulation. Kept in one place since a lot of
// the "feel" of the game (how punishing a hit is, how fast the map refills)
// comes from how these interact rather than any single value.

/** World units — the arena is a circle centered at (0,0). Radius scales
 * with how many occupants (real players + fill bots) are actually in the
 * room: a sparsely populated room stays tighter so it doesn't feel empty,
 * a full one gets the most room to roam. See arenaRadiusForPopulation(). */
export const ARENA_RADIUS_REFERENCE = 1500; // radius at MAX_PLAYERS_PER_ROOM occupants
export const ARENA_RADIUS_MIN_FRACTION = 0.75; // radius at the smallest realistic occupancy (1 + MAX_BOTS, the floor)
export const ARENA_RADIUS_MAX_FRACTION = 1.0;
/** Crops/seedlings spawn within this fraction of the arena radius, not the
 * full circle, so a few don't land exactly on the boundary. */
export const CROP_SPAWN_RADIUS_FRACTION = 0.95;

/** Players per room before a new lobby is spun up. Keeps a single tiny VPS
 * comfortable — see server/README.md for the capacity math. */
export const MAX_PLAYERS_PER_ROOM = 40;

/** Simulation + broadcast tick. Client-side smoothing (useArenaFrame)
 * handles perceived choppiness independent of tick rate, keeping this low
 * enough to bound tick cost and outbound bandwidth on a small box even at
 * high crop counts. */
export const TICK_MS = 60;

/** Movement speed with zero crops carried. */
export const BASE_SPEED = 164.8;
/** Speed ramps down linearly from BASE_SPEED as crops carried go from 0
 * to SPEED_PENALTY_FULL_AT_CROPS, capping at MAX_SPEED_PENALTY beyond
 * that — see speedFor in Room.ts. */
export const MAX_SPEED_PENALTY = 0.5; // biggest players top out 50% slower
export const SPEED_PENALTY_FULL_AT_CROPS = 300; // crops needed to reach the full penalty
/** Bots have no reaction time, distraction, or aiming imprecision —
 * without a handicap they out-collect any real player just by being
 * mechanically perfect. Slowing them down physically is the most direct
 * lever, leaving aim (see BOT_AGGRO_AIM_JITTER_RAD) reactive rather than
 * a second handicap stacked on top. */
export const BOT_SPEED_MULTIPLIER = 0.861;

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
export const TARGET_COVERAGE_FRACTION = 0.34; // ~34% of the arena's area
export const COVERAGE_FOOTPRINT_RADIUS = 24;
export const SPAWN_MAX_PER_TICK = 14;
/** Mirrors SPAWN_MAX_PER_TICK, but for the other direction: caps how many
 * seedlings can mature into crops in a single tick. Without this, a batch
 * of seedlings planted close together (e.g. everyone eating through the
 * field at once early in a session) all matures in the exact same tick —
 * one broadcast, one render, with a burst of brand-new crops mounting for
 * the first time simultaneously. */
export const SEEDLING_MATURE_MAX_PER_TICK = 14;
export const WORLD_ENTITY_CAP = 2200; // hard safety ceiling on crops+seedlings combined

/** Power-ups: whenever a seedling matures (the normal "a crop appears"
 * moment), there's a small chance it's a power-up instead of a plain
 * crop. Same pickup mechanic as a crop, distinct blue crystal look.
 * Chances are of a maturing seedling, and are independent of each other
 * (checked in order below, first match wins) — 0.45 + 0.21 + 0.27 + 0.27
 * = 1.2% total, ~1 in 83 maturing crops. */
export const POWERUP_SPEED_CHANCE = 0.0045;
export const POWERUP_RAPID_FIRE_CHANCE = 0.0021;
export const POWERUP_SHIELD_CHANCE = 0.0027;
export const POWERUP_LONG_RANGE_CHANCE = 0.0027;
export const POWERUP_MAX_ON_MAP = 6; // safety cap — rare, but shouldn't accumulate forever if left uncollected
export const POWERUP_SPEED_MULTIPLIER = 1.5;
export const POWERUP_SPEED_DURATION_MS = 15_000;
export const POWERUP_RAPID_FIRE_DURATION_MS = 7_500;
/** At least double FIRE_COOLDOWN_MS's rate — well more than double, so it
 * reads as a real burst rather than a marginal speed-up. */
export const POWERUP_RAPID_FIRE_COOLDOWN_MS = 180;
export const POWERUP_LONG_RANGE_DURATION_MS = 15_000;
export const POWERUP_LONG_RANGE_MULTIPLIER = 2; // double SEED_RANGE while active
// Shield has no duration — it's consumed by the next hit, however long
// that takes, so there's no *_DURATION_MS constant for it.

/** Combat: holding the fire button spends a crop per shot on a cooldown
 * and launches a seed in the player's current facing direction —
 * close-ish range, not point-blank, not cross-map. */
export const SEED_COST_CROPS = 1;
export const FIRE_COOLDOWN_MS = 391;
/** Own fire rate slows down the more crops you're carrying too — up to
 * FIRE_RATE_PENALTY_MAX (50%) slower once you're holding
 * FIRE_RATE_PENALTY_FULL_AT_CROPS (300) or more, ramping linearly below
 * that. See tryFire. */
export const FIRE_RATE_PENALTY_MAX = 0.5;
export const FIRE_RATE_PENALTY_FULL_AT_CROPS = 300;
export const SEED_PROJECTILE_SPEED = 480; // world units / sec, before easing near the end
export const SEED_RANGE = 260; // world units
export const SEED_HIT_RADIUS = 20; // how close a seed must pass to a player to land
/** Two seeds passing this close to each other cancel each other out —
 * smaller than SEED_HIT_RADIUS since it's sprite-to-sprite, not
 * sprite-to-player. See the seed-vs-seed pass in updateSeedProjectiles. */
export const SEED_COLLISION_RADIUS = 14;
/** A seed travels at full speed until this fraction of SEED_RANGE, then
 * eases down to SEED_MIN_SPEED_FRACTION of full speed by the time it
 * reaches max range — a constant-velocity dart stopping dead (hit) or
 * vanishing (miss) reads as choppy/abrupt; slowing into the landing
 * point reads as a real object settling. */
export const SEED_DECEL_START_FRACTION = 0.55;
export const SEED_MIN_SPEED_FRACTION = 0.32;
export const SEED_HIT_DROP = 25;
/** A crit drops a random percentage (SEED_HIT_CRIT_PERCENT_MIN to
 * SEED_HIT_CRIT_PERCENT_MAX) of the TARGET's own current crops, clamped
 * to [SEED_HIT_CRIT_MIN_DROP, SEED_HIT_CRIT_MAX_DROP] — proportional to
 * what they're carrying rather than a flat amount, so a crit against a
 * real stack actually hurts, while the floor keeps it meaningfully above
 * a plain hit even against someone light and the ceiling keeps a single
 * crit from ever gutting a huge stack outright. */
export const SEED_HIT_CRIT_PERCENT_MIN = 0.25;
export const SEED_HIT_CRIT_PERCENT_MAX = 0.4;
export const SEED_HIT_CRIT_MIN_DROP = 35;
export const SEED_HIT_CRIT_MAX_DROP = 160;
/** Crit chance scales with the TARGET's crop count — the more someone is
 * carrying, the riskier it is to sit on it. At the base rate alone a
 * player with 0 crops still crits 6% of the time; every 100 crops the
 * target is carrying adds another 3.5 percentage points (200 crops ->
 * 6% + 7% = 13%). */
export const SEED_HIT_CRIT_CHANCE_BASE = 0.06;
export const SEED_HIT_CRIT_CHANCE_PER_CROP = 0.00035; // 3.5% per 100 crops
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
 * danger without bots being real snipers. Only applies while a bot isn't
 * aiming at a threat (see BOT_AGGRO_* below), which takes over. */
export const BOT_FIRE_CHECK_INTERVAL_MS = 4000;
export const BOT_FIRE_CHANCE = 0.2; // rolled once per check interval, per bot
export const BOT_FIRE_CENTER_BIAS = 0.5; // 0 = pure random direction, 1 = always at center

/** Bots react to anyone — another bot or a real player, no distinction —
 * getting close makes a bot aim and fire back (a standoff — it holds its
 * ground), while actually being shot at (hit or just a near-miss) makes
 * it also back off for a short, capped burst before settling back into
 * the standoff. Deliberately not a full retreat — a bot that sprints
 * across the map the instant anyone gets close reads as "parting the red
 * sea," not a reactive opponent. */
export const BOT_AGGRO_APPROACH_RADIUS = 160; // another player this close -> aim & fire, no movement change
export const BOT_AGGRO_NOTICE_RADIUS = 240; // another player's shot fired this close also aggros the bot
export const BOT_AGGRO_AIM_DURATION_MS = 3000; // how long a bot keeps aiming/firing after its last trigger
export const BOT_AGGRO_FIRE_INTERVAL_MS = 850; // faster/more assertive than ambient fire while aiming
// +/- 42 degrees baseline — wide enough that a bot regularly whiffs
// against a fresh, low-value target, tightening up considerably against
// one who's stacked real crops (see BOT_AIM_ACCURACY_BONUS_PER_CROP).
export const BOT_AGGRO_AIM_JITTER_RAD = (42 * Math.PI) / 180;
/** A bot backing away while still firing (see BOT_FLEE_DURATION_MS) is
 * shooting back over its shoulder — meaningfully less accurate than one
 * standing its ground and aiming properly. Multiplies the jitter above
 * while fleeing. */
export const BOT_FLEE_AIM_JITTER_MULTIPLIER = 1.7;
/** A bot noticing someone nearby (see BOT_AGGRO_APPROACH_RADIUS) normally
 * locks aim unconditionally. Against a target carrying under this many
 * crops — likely a fresh spawn with little to lose and no crop yet to
 * fire back with — there's instead a chance the bot lets it go, ramping
 * from BOT_LOW_CROP_LENIENCY_SKIP_CHANCE_MAX at 0 crops down to 0 by this
 * threshold. Only applies to this unprovoked case — a bot that's actually
 * been shot at or hit (see alertNearbyBots / resolveSeedHit) always
 * reacts regardless of the target's crops. */
export const BOT_LOW_CROP_LENIENCY_CROPS = 20;
export const BOT_LOW_CROP_LENIENCY_SKIP_CHANCE_MAX = 0.4;
/** How dangerous the whole room feels scales with the CURRENT LEADER's
 * crop count (see topPlayerId in Room.ts), not just each bot's own
 * target — a match where someone's pulled far ahead should feel tenser
 * for everyone, not just for whoever's currently heaviest. Ramps linearly
 * from 0 (leader at 0 crops) to full at this many leader crops, then
 * holds. */
export const LEADER_AGGRO_FULL_AT_CROPS = 350;
/** Added on top of BOT_FIRE_CHANCE at full leader-crop scaling (see
 * LEADER_AGGRO_FULL_AT_CROPS). */
export const LEADER_AGGRO_FIRE_CHANCE_BONUS_MAX = 0.22;
/** Added on top of BOT_AGGRO_APPROACH_RADIUS at full leader-crop scaling. */
export const LEADER_AGGRO_APPROACH_RADIUS_BONUS_MAX = 90;
/** When picking which nearby player to aim at, a real player's distance
 * counts as this fraction of its actual value — biasing the choice
 * toward real players without making it absolute. At 0.35, a bot roughly
 * a third as close still beats a real player in the comparison, so a bot
 * standing right on top of you can still win out, but otherwise a real
 * player nearby is the usual pick over another bot. See
 * nearestOtherPlayerWithin. */
export const BOT_TARGET_PLAYER_BIAS = 0.35;
export const BOT_FLEE_DURATION_MS = 1100; // short "back away" burst, only from being fired at
/** Bots get more accurate against a juicier (higher-crop) target, with no
 * ceiling — a target who keeps hoarding crops keeps getting easier to
 * hit, for as long as they keep hoarding. Applied as a jitter reduction
 * (see jitteredDirectionToward): jitter is divided by 1 + (crops *
 * this rate), so e.g. a target carrying 200 crops (0.5 bonus) sees
 * jitter divided by 1.5. */
export const BOT_AIM_ACCURACY_BONUS_PER_CROP = 0.0025;
/** Whoever's #1 on the leaderboard (see topPlayerId in Room.ts) is a
 * meaningfully more attractive target — their distance counts as this
 * fraction of its actual value in nearestOtherPlayerWithin, stacking
 * multiplicatively on top of BOT_TARGET_PLAYER_BIAS for a real crowned
 * player (0.35 * 0.5 = 0.175 effective, i.e. roughly 5.7x as likely to
 * win the comparison against an equally-close non-crowned bot) — not a
 * lock, but a real, felt swarm toward whoever's leading, whether that's a
 * real player or another bot. */
export const BOT_CROWN_TARGET_BIAS = 0.5;

/** New players spawn with this many crops so they're not instantly helpless. */
export const STARTING_CROPS = 0;

/** Where a player/bot lands on join: a ring of the arena, not the exact
 * center (too easy to camp/snipe across the whole map from) and not
 * right at the boundary. See Room.pickSpawnPoint. */
export const SPAWN_MIN_RADIUS_FRACTION = 0.2;
export const SPAWN_MAX_RADIUS_FRACTION = 0.85;
export const SPAWN_MIN_SEPARATION = 150; // world units from the nearest other player
export const SPAWN_MAX_ATTEMPTS = 12;

/** Bots: rooms always feel alive. Real players pull in up to this many
 * fill bots regardless of how few real players there are (so even a
 * single real player gets the full 9), shrinking only once real+bots
 * would otherwise exceed MAX_PLAYERS_PER_ROOM — see rebalanceBots. Never
 * spawned in an otherwise-empty room. */
export const MAX_BOTS = 9;
export const BOT_DECISION_INTERVAL_MS = 1200;
export const BOT_PERCEPTION_RADIUS = 500;
/** A bot's next target must be at least this far away — otherwise, with
 * crops this dense, "nearest crop" is often only a few units off and bots
 * just twitch in place instead of actually wandering. */
export const BOT_MIN_TRAVEL_DIST = 60;

/** Arena radius for a room's current total occupancy (real players + fill
 * bots), interpolating between the two fractions above across the
 * [1 + MAX_BOTS, MAX_PLAYERS_PER_ROOM] range -- the smallest a real room
 * ever gets is one real player plus a full set of bots. Occupancy below
 * the floor (shouldn't normally happen) or above the ceiling both clamp
 * rather than extrapolate. */
export function arenaRadiusForPopulation(totalOccupants: number): number {
  const floor = 1 + MAX_BOTS;
  const ceil = MAX_PLAYERS_PER_ROOM;
  const clamped = Math.max(floor, Math.min(ceil, totalOccupants));
  const t = ceil > floor ? (clamped - floor) / (ceil - floor) : 1;
  const fraction = ARENA_RADIUS_MIN_FRACTION + t * (ARENA_RADIUS_MAX_FRACTION - ARENA_RADIUS_MIN_FRACTION);
  return ARENA_RADIUS_REFERENCE * fraction;
}
