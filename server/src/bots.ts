import { AvatarCustomization } from "./protocol";

// The ".bot" suffix is the "honestly labeled, not a real player" marker,
// baked directly into the name so it shows up identically in-arena and
// on the leaderboard with no client-side special-casing needed.
//
// Exactly MAX_BOTS long (see constants.ts) -- randomBotName is handed the
// room's currently-in-use names and avoids repeats, so a full room shows
// every name here exactly once rather than randomly doubling up.
const BOT_NAMES = ["sage", "clover", "maple", "sprout", "fern", "willow", "basil", "hazel", "ivy"];

const SKINS: AvatarCustomization["skinTone"][] = ["skin1", "skin2", "skin3", "skin4"];
const HAIRS: AvatarCustomization["hairColor"][] = [
  "hairBrown",
  "hairBlack",
  "hairBlonde",
  "hairRed",
];
const SHIRTS: AvatarCustomization["shirtColor"][] = [
  "shirtRed",
  "shirtBlue",
  "shirtGreen",
  "shirtYellow",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Avoids any name currently in use in the room when possible, falling
 * back to a plain random pick only if every name is already taken (can't
 * happen at MAX_BOTS bots against a list this length, but a future bump
 * to MAX_BOTS shouldn't be able to throw here). */
export function randomBotName(usedNames: ReadonlySet<string>): string {
  const available = BOT_NAMES.filter((n) => !usedNames.has(n));
  return `${pick(available.length > 0 ? available : BOT_NAMES)}.bot`;
}

export function randomBotAvatar(): AvatarCustomization {
  return {
    skinTone: pick(SKINS),
    hairColor: pick(HAIRS),
    shirtColor: pick(SHIRTS),
    hat: Math.random() < 0.3,
  };
}
