import { AvatarCustomization } from "./protocol";

// The ".bot" suffix is the "honestly labeled, not a real player" marker
// (client used to append " (bot)" separately — folded into the name
// itself instead, so it shows up identically in-arena and on the
// leaderboard with no special-casing needed).
const BOT_NAMES = ["sprout", "clover", "pip", "hazel", "fern", "basil", "poppy", "sage"];

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

export function randomBotName(): string {
  return `${pick(BOT_NAMES)}.bot`;
}

export function randomBotAvatar(): AvatarCustomization {
  return {
    skinTone: pick(SKINS),
    hairColor: pick(HAIRS),
    shirtColor: pick(SHIRTS),
    hat: Math.random() < 0.3,
  };
}
